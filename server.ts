import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { createHash } from "node:crypto";
import rateLimit from "express-rate-limit";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

// ── In-memory response cache for non-streaming /api/mimo/chat/completions ───

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_MAX_SIZE = 50;

interface CacheEntry {
  body: string;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();

function hasImageUrlInBody(body: Record<string, unknown>): boolean {
  return JSON.stringify(body).includes('"image_url"');
}

function getCacheKey(body: Record<string, unknown>): string {
  const keyObj = { model: body.model, messages: body.messages };
  return createHash("sha256").update(JSON.stringify(keyObj)).digest("hex");
}

function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  }
  // LRU-like: delete the oldest entries if still over the size limit
  while (responseCache.size > CACHE_MAX_SIZE) {
    const firstKey = responseCache.keys().next().value as string | undefined;
    if (firstKey === undefined) break;
    responseCache.delete(firstKey);
  }
}

// ── Rate limiter: max 20 req / 60 s / IP ─────────────────────────────────────

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many requests — please wait a moment and try again.",
    });
  },
});

// Keep old name as alias for backward compat
const mimoRateLimiter = aiRateLimiter;

// ── Universal AI provider table ───────────────────────────────────────────────

type AuthStyle = "bearer" | "api-key" | "x-api-key";

interface ProviderDef {
  baseUrl: string;
  authStyle: AuthStyle;
  envKey: string;
  /** Extra headers always sent (e.g. anthropic-version) */
  extraHeaders?: Record<string, string>;
  /** True = request/response needs format translation */
  isAnthropic?: boolean;
}

const PROVIDER_DEFS: Record<string, ProviderDef> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    authStyle: "bearer",
    envKey: "OPENAI_API_KEY",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    authStyle: "x-api-key",
    envKey: "ANTHROPIC_API_KEY",
    extraHeaders: { "anthropic-version": "2023-06-01" },
    isAnthropic: true,
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    authStyle: "bearer",
    envKey: "GOOGLE_AI_API_KEY",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    authStyle: "bearer",
    envKey: "DEEPSEEK_API_KEY",
  },
  qwen: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authStyle: "bearer",
    envKey: "QWEN_API_KEY",
  },
  zhipu: {
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    authStyle: "bearer",
    envKey: "ZHIPU_API_KEY",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    authStyle: "bearer",
    envKey: "GROQ_API_KEY",
  },
  mimo: {
    baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
    authStyle: "bearer",
    envKey: "MIMO_API_KEY",
  },
  // Custom: resolved at request time from env
  custom: { baseUrl: "", authStyle: "bearer", envKey: "AI_CUSTOM_API_KEY" },
};

function resolveProvider(
  reqProvider: string,
): { def: ProviderDef; apiKey: string; baseUrl: string } | null {
  const id = (reqProvider || process.env.AI_PROVIDER || "mimo")
    .toLowerCase()
    .trim();
  const def = PROVIDER_DEFS[id];
  if (!def) return null;

  // Read generic base URL override
  const genericBaseOverride = (process.env.AI_API_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  // Determine effective base URL: provider-specific > generic > default
  let effectiveBaseUrl: string;

  if (id === "custom") {
    effectiveBaseUrl =
      (process.env.AI_CUSTOM_BASE_URL ?? "").trim().replace(/\/+$/, "") ||
      genericBaseOverride ||
      def.baseUrl;
  } else if (id === "mimo") {
    effectiveBaseUrl =
      (process.env.MIMO_API_BASE_URL ?? "").trim().replace(/\/+$/, "") ||
      genericBaseOverride ||
      def.baseUrl;
  } else {
    effectiveBaseUrl = genericBaseOverride || def.baseUrl;
  }

  if (!effectiveBaseUrl) return null; // custom with no URL set

  const apiKey = (process.env[def.envKey] ?? "").trim();
  return { def, apiKey, baseUrl: effectiveBaseUrl };
}

function buildAuthHeaders(
  def: ProviderDef,
  apiKey: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (def.authStyle === "bearer") headers["Authorization"] = `Bearer ${apiKey}`;
  if (def.authStyle === "api-key") headers["api-key"] = apiKey;
  if (def.authStyle === "x-api-key") headers["x-api-key"] = apiKey;
  if (def.extraHeaders) Object.assign(headers, def.extraHeaders);
  return headers;
}

// ── Anthropic format adapters ─────────────────────────────────────────────────

type OAIMessage = { role: string; content: unknown };

function openAIToAnthropic(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const msgs = (body.messages as OAIMessage[] | undefined) ?? [];
  let system: string | undefined;
  const filtered: OAIMessage[] = [];

  for (const m of msgs) {
    if (m.role === "system") {
      system =
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? (m.content as Array<{ type: string; text?: string }>)
                .filter((p) => p.type === "text")
                .map((p) => p.text ?? "")
                .join("")
            : "";
    } else {
      filtered.push(m);
    }
  }

  // Convert image_url → Anthropic source format
  const anthropicMsgs = filtered.map((m) => {
    if (!Array.isArray(m.content)) return m;
    const content = (
      m.content as Array<{
        type: string;
        text?: string;
        image_url?: { url: string };
      }>
    ).map((part) => {
      if (part.type === "text") return { type: "text", text: part.text };
      if (part.type === "image_url" && part.image_url) {
        const url = part.image_url.url;
        if (url.startsWith("data:")) {
          const [hdr, data] = url.split(",");
          const mediaType = hdr.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
          return {
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          };
        }
        return { type: "image", source: { type: "url", url } };
      }
      return part;
    });
    return { ...m, content };
  });

  return {
    model: body.model,
    max_tokens: body.max_completion_tokens ?? body.max_tokens ?? 8192,
    ...(system ? { system } : {}),
    messages: anthropicMsgs,
    ...(body.temperature !== undefined
      ? { temperature: body.temperature }
      : {}),
    ...(body.stream ? { stream: true } : {}),
  };
}

function anthropicToOpenAI(anthropicBody: string): string {
  try {
    const a = JSON.parse(anthropicBody) as Record<string, unknown>;
    if (!a.content) return anthropicBody; // passthrough if not a message
    const content =
      (a.content as Array<{ type: string; text?: string }> | undefined) ?? [];
    const text = content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
    const oai = {
      id: a.id,
      object: "chat.completion",
      model: a.model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: a.stop_reason === "end_turn" ? "stop" : a.stop_reason,
        },
      ],
      usage: a.usage,
    };
    return JSON.stringify(oai);
  } catch {
    return anthropicBody;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Only MiMo OpenAI-compatible bases (SSRF-safe). */
function normalizeMimoApiBase(input: string): string | null {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  let u: URL;
  try {
    u = new URL(trimmed.includes("/v1") ? trimmed : `${trimmed}/v1`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  const hostOk =
    host === "api.mimo-v2.com" ||
    host.endsWith(".mimo-v2.com") ||
    host.endsWith("xiaomimimo.com");
  if (!hostOk) return null;
  const p = u.pathname.replace(/\/$/, "") || "/";
  if (!p.endsWith("/v1")) return null;
  return `${u.origin}/v1`;
}

/** Accepts "apple.com", "//cdn.example.com/foo", etc. so fetch() is never given a relative URL. */
function resolveRemoteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("URL is required");
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : trimmed.startsWith("//")
      ? `https:${trimmed}`
      : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  return parsed.href;
}

/**
 * Extract the outerHTML of the first element matching a simple tag-name selector.
 * Falls back to returning the full HTML for anything that isn't a bare tag name.
 * Handles nesting correctly (e.g. nested <section> inside <section>).
 */
function extractBySelector(html: string, selector: string): string {
  const sel = selector.trim();
  // Only support bare element names such as "main", "article", "header", etc.
  if (!/^[a-z][a-z0-9]*$/i.test(sel)) return html;
  const tag = sel.toLowerCase();

  const openPattern = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "i");
  const firstMatch = openPattern.exec(html);
  if (!firstMatch) return html;

  const startIdx = firstMatch.index;
  let pos = startIdx + firstMatch[0].length;
  let depth = 1;
  const closeTag = `</${tag}>`;

  while (depth > 0 && pos < html.length) {
    const nextOpenIdx = html.indexOf(`<${tag}`, pos);
    const nextCloseIdx = html.indexOf(closeTag, pos);

    if (nextCloseIdx === -1) break; // Malformed HTML

    if (nextOpenIdx !== -1 && nextOpenIdx < nextCloseIdx) {
      // Verify it is a real opening tag (char after tag name must be >, space, or newline)
      const charAfterTag = html[nextOpenIdx + 1 + tag.length];
      if (
        charAfterTag === ">" ||
        charAfterTag === " " ||
        charAfterTag === "\n" ||
        charAfterTag === "\t" ||
        charAfterTag === "\r"
      ) {
        depth++;
        pos = nextOpenIdx + 1 + tag.length;
      } else {
        pos = nextOpenIdx + 1;
      }
    } else {
      depth--;
      pos = nextCloseIdx + closeTag.length;
    }
  }

  return depth !== 0 ? html : html.slice(startIdx, pos);
}

// ── Shared helper: resolve target base URL ──────────────────────────────────

function resolveMimoTarget(forwardRaw: string): string | null {
  const explicit = normalizeMimoApiBase(forwardRaw);
  if (forwardRaw && !explicit) return null;
  return (
    explicit ||
    normalizeMimoApiBase(process.env.AI_API_BASE_URL ?? "") ||
    normalizeMimoApiBase(process.env.MIMO_API_BASE_URL ?? "") ||
    "https://api.mimo-v2.com/v1"
  );
}

// ── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // ── Shared AI proxy handler (non-streaming) ────────────────────────────────
  async function handleAICompletion(
    req: import("express").Request,
    res: import("express").Response,
  ): Promise<void> {
    const body = req.body as Record<string, unknown>;
    const reqProvider =
      typeof body._provider === "string"
        ? body._provider
        : typeof body._mimoBaseUrl === "string"
          ? "mimo" // legacy compat
          : "";

    const payload = { ...body };
    const mimoBaseUrlOverride =
      typeof body._mimoBaseUrl === "string"
        ? (body._mimoBaseUrl as string).trim().replace(/\/+$/, "")
        : "";
    delete payload._provider;
    delete payload._mimoBaseUrl; // remove legacy field

    const resolved = resolveProvider(reqProvider);
    if (!resolved) {
      res.status(400).json({
        error: `Unknown or unconfigured provider: "${reqProvider || process.env.AI_PROVIDER || "mimo"}". Check AI_PROVIDER in .env.local.`,
      });
      return;
    }
    let { def, apiKey, baseUrl } = resolved;

    // Honor client-side _mimoBaseUrl override for MiMo provider
    if (reqProvider === "mimo" && mimoBaseUrlOverride) {
      baseUrl = mimoBaseUrlOverride;
    }

    if (!apiKey) {
      res.status(500).json({
        error: `API key not set. Add ${def.envKey}=<your-key> to .env.local and restart.`,
      });
      return;
    }

    // ── Cache lookup (text-only, skip images) ────────────────────────────
    const skipCache = hasImageUrlInBody(payload);
    const cacheKey = skipCache ? "" : getCacheKey(payload);
    if (!skipCache && cacheKey) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log("[AI cache] HIT", cacheKey.slice(0, 12));
        res
          .status(200)
          .setHeader("Content-Type", "application/json; charset=utf-8")
          .setHeader("X-Cache", "HIT")
          .send(cached.body);
        return;
      }
    }

    // ── Anthropic: translate OpenAI format → Anthropic format ───────────────
    const upstreamPayload = def.isAnthropic
      ? openAIToAnthropic(payload)
      : payload;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);
      const endpoint = def.isAnthropic
        ? `${baseUrl}/messages`
        : `${baseUrl}/chat/completions`;

      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: buildAuthHeaders(def, apiKey),
        body: JSON.stringify(upstreamPayload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      let text = await upstream.text();
      if (!upstream.ok) {
        console.warn(
          `[AI proxy] ${endpoint}`,
          upstream.status,
          text.slice(0, 240),
        );
      } else if (upstream.ok) {
        // Log successful but potentially empty responses for debugging
        try {
          const parsed = JSON.parse(text);
          const content = parsed?.choices?.[0]?.message?.content;
          if (!content || (typeof content === "string" && !content.trim())) {
            console.warn(
              `[AI proxy] ${endpoint} returned 200 but empty content. Body:`,
              text.slice(0, 500),
            );
          }
        } catch {
          // Not JSON or unparseable — log anyway if short
          if (!text.trim()) {
            console.warn(`[AI proxy] ${endpoint} returned 200 but empty body.`);
          }
        }
      }

      // ── Anthropic: translate response back to OpenAI format ────────────
      if (def.isAnthropic && upstream.ok) text = anthropicToOpenAI(text);

      if (upstream.ok && !skipCache && cacheKey) {
        pruneCache();
        responseCache.set(cacheKey, { body: text, timestamp: Date.now() });
      }

      res
        .status(upstream.status)
        .setHeader("Content-Type", "application/json; charset=utf-8")
        .send(text);
    } catch (error) {
      console.error("AI proxy error:", error);
      res.status(502).json({
        error:
          error instanceof Error ? error.message : "Upstream AI request failed",
      });
    }
  }

  // ── Shared AI proxy handler (streaming) ──────────────────────────────────
  async function handleAIStream(
    req: import("express").Request,
    res: import("express").Response,
  ): Promise<void> {
    const body = req.body as Record<string, unknown>;
    const reqProvider =
      typeof body._provider === "string"
        ? body._provider
        : typeof body._mimoBaseUrl === "string"
          ? "mimo"
          : "";

    const payload = { ...body };
    const mimoBaseUrlOverride =
      typeof body._mimoBaseUrl === "string"
        ? (body._mimoBaseUrl as string).trim().replace(/\/+$/, "")
        : "";
    delete payload._provider;
    delete payload._mimoBaseUrl;
    payload.stream = true; // force streaming

    const resolved = resolveProvider(reqProvider);
    if (!resolved) {
      res.status(400).json({
        error: `Unknown or unconfigured provider: "${reqProvider || process.env.AI_PROVIDER || "mimo"}".`,
      });
      return;
    }
    let { def, apiKey, baseUrl } = resolved;

    // Honor client-side _mimoBaseUrl override for MiMo provider
    if (reqProvider === "mimo" && mimoBaseUrlOverride) {
      baseUrl = mimoBaseUrlOverride;
    }
    if (!apiKey) {
      res.status(500).json({
        error: `API key not set. Add ${def.envKey}=<your-key> to .env.local.`,
      });
      return;
    }

    // Note: Anthropic streaming uses the same messages endpoint with stream:true
    const upstreamPayload = def.isAnthropic
      ? openAIToAnthropic(payload)
      : payload;
    const endpoint = def.isAnthropic
      ? `${baseUrl}/messages`
      : `${baseUrl}/chat/completions`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: buildAuthHeaders(def, apiKey),
        body: JSON.stringify(upstreamPayload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        const text = await upstream.text();
        console.warn(
          `[AI stream proxy] ${endpoint}`,
          upstream.status,
          text.slice(0, 240),
        );
        res
          .status(upstream.status)
          .setHeader("Content-Type", "application/json; charset=utf-8")
          .send(text);
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      if (!upstream.body) {
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      const reader = (
        upstream.body as unknown as ReadableStream<Uint8Array>
      ).getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
      res.end();
    } catch (error) {
      console.error("AI stream proxy error:", error);
      if (!res.headersSent) {
        res.status(502).json({
          error:
            error instanceof Error
              ? error.message
              : "Upstream streaming failed",
        });
      } else {
        res.end();
      }
    }
  }

  // ── New universal routes (/api/ai/) ─────────────────────────────────────────
  app.post("/api/ai/chat/completions", aiRateLimiter, (req, res) =>
    handleAICompletion(req, res),
  );
  app.post("/api/ai/chat/completions/stream", aiRateLimiter, (req, res) =>
    handleAIStream(req, res),
  );

  // ── Config endpoint: tell the UI which providers are available ───────────────
  app.get("/api/ai/config", (_req, res) => {
    const activeProvider = (process.env.AI_PROVIDER || "mimo")
      .toLowerCase()
      .trim();
    const configuredProviders = Object.entries(PROVIDER_DEFS)
      .filter(([id, def]) => {
        if (id === "custom")
          return !!(
            process.env.AI_CUSTOM_BASE_URL?.trim() &&
            process.env.AI_CUSTOM_API_KEY?.trim()
          );
        return !!process.env[def.envKey]?.trim();
      })
      .map(([id]) => id);

    res.json({
      activeProvider,
      configuredProviders,
      textModel: (process.env.AI_MODEL_TEXT || "").trim() || null,
      visionModel: (process.env.AI_MODEL_VISION || "").trim() || null,
    });
  });

  // ── Legacy /api/mimo/* aliases (backward compat) ─────────────────────────────
  app.post("/api/mimo/chat/completions", mimoRateLimiter, (req, res) =>
    handleAICompletion(req, res),
  );
  app.post("/api/mimo/chat/completions/stream", mimoRateLimiter, (req, res) =>
    handleAIStream(req, res),
  );

  // ── Layout skeleton extractor ──────────────────────────────────────────────
  /**
   * Analyse stripped HTML and return a structured layout skeleton description
   * that the AI can use to create a fresh, structurally-similar template.
   */
  function extractLayoutSkeleton(html: string): string {
    const h = html.toLowerCase();
    const lines: string[] = [];

    // ── Navigation ────────────────────────────────────────────────────────────
    const hasTopNav = /<nav|role=["']navigation|class=["'][^"']*navbar/.test(h);
    const hasSidebar = /sidebar|side-nav|side_nav|aside/.test(h);
    if (hasTopNav)
      lines.push(
        "- Top navigation bar (logo left + links right, likely sticky)",
      );
    if (hasSidebar) lines.push("- Left sidebar navigation panel");

    // ── Hero / Banner ─────────────────────────────────────────────────────────
    const hasHero = /hero|banner|jumbotron|masthead|splash/.test(h);
    if (hasHero) {
      const hasVideo = /video|background-video|autoplay/.test(h);
      const hasCTA = /btn|button|cta|get.started|sign.up|try.free/.test(h);
      lines.push(
        `- Hero section: full-width${hasVideo ? " video background" : ""}, large heading, subtext${hasCTA ? ", 1-2 CTA buttons" : ""}`,
      );
    }

    // ── Feature cards ─────────────────────────────────────────────────────────
    const cardMatches =
      html.match(/<(?:div|article|li)[^>]*(?:card|feature|item|col)[^>]*>/gi) ??
      [];
    if (cardMatches.length >= 3) {
      const is3col =
        /grid-cols-3|lg:grid-cols-3|col-md-4|three|3-col|col-4/.test(h);
      const is4col = /grid-cols-4|lg:grid-cols-4|col-md-3|four|4-col/.test(h);
      const cols = is4col ? 4 : is3col ? 3 : 2;
      lines.push(
        `- Feature / service card grid: ${cols}-column layout, ${Math.min(cardMatches.length, 8)} cards with icon + title + description`,
      );
    }

    // ── Pricing ───────────────────────────────────────────────────────────────
    const hasPricing =
      /pric|plan|tier|monthly|annually|per.month|subscribe/.test(h);
    if (hasPricing) {
      const pricingCols =
        /three|3.plan|starter.+pro.+enterprise|basic.+standard.+premium/.test(h)
          ? 3
          : 2;
      lines.push(
        `- Pricing section: ${pricingCols}-column pricing table with plan names, price, and feature list`,
      );
    }

    // ── Testimonials ──────────────────────────────────────────────────────────
    const hasTestimonials =
      /testimonial|review|quote|client.say|what.people|feedback/.test(h);
    if (hasTestimonials) {
      lines.push(
        "- Testimonials section: quote cards (2-3 column) with avatar, name, role, and review text",
      );
    }

    // ── Team / About ──────────────────────────────────────────────────────────
    const hasTeam = /team|staff|founder|our.people|meet.the/.test(h);
    if (hasTeam) {
      lines.push(
        "- Team section: profile cards with photo, name, job title, and social links",
      );
    }

    // ── FAQ ───────────────────────────────────────────────────────────────────
    const hasFAQ = /faq|frequently.asked|accordion|question/.test(h);
    if (hasFAQ) lines.push("- FAQ section: accordion-style Q&A list");

    // ── Statistics / counters ─────────────────────────────────────────────────
    const hasStats =
      /\d+[k+m%]?\+?[\s\S]{0,20}(?:user|client|customer|download|project|year)/.test(
        h,
      );
    if (hasStats)
      lines.push(
        "- Statistics / metrics row: 3-4 large numbered highlights with labels",
      );

    // ── CTA section ───────────────────────────────────────────────────────────
    const hasCTASection =
      /get.started|sign.up.now|try.for.free|start.today|join.us/.test(h);
    if (hasCTASection)
      lines.push(
        "- Full-width CTA section: compelling heading, subtext, primary button",
      );

    // ── Gallery / Portfolio ───────────────────────────────────────────────────
    const hasGallery = /gallery|portfolio|work|project|masonry/.test(h);
    if (hasGallery)
      lines.push("- Gallery / portfolio grid: image grid with hover overlay");

    // ── Contact / Form ────────────────────────────────────────────────────────
    const hasForm = /<form|contact.form|contact.us|send.message/.test(h);
    if (hasForm)
      lines.push(
        "- Contact section: form with name / email / message fields, submit button, and contact info aside",
      );

    // ── Newsletter ────────────────────────────────────────────────────────────
    const hasNewsletter = /newsletter|subscribe|email.list/.test(h);
    if (hasNewsletter)
      lines.push(
        "- Newsletter signup: email input + subscribe button (inline or section)",
      );

    // ── Blog / News ───────────────────────────────────────────────────────────
    const hasBlog = /blog|news|article|post|latest.update/.test(h);
    if (hasBlog)
      lines.push(
        "- Blog / news section: 3-column card grid with image, date, title, excerpt, read-more link",
      );

    // ── Logo cloud / Clients ──────────────────────────────────────────────────
    const hasLogos = /partner|client.logo|trust|sponsor|as.seen/.test(h);
    if (hasLogos)
      lines.push(
        "- Logo cloud: row of partner / client logos with grayscale filter",
      );

    // ── Footer ────────────────────────────────────────────────────────────────
    const hasFooter = /<footer/.test(html);
    if (hasFooter) {
      const footerCols = /grid-cols-4|col-md-3|four.column/.test(h)
        ? 4
        : /grid-cols-3|col-md-4|three.column/.test(h)
          ? 3
          : 2;
      lines.push(
        `- Footer: ${footerCols}-column layout (links, about, contact, social) + copyright bar`,
      );
    }

    // ── Overall page style hints ──────────────────────────────────────────────
    const isDarkTheme =
      /bg-gray-9|bg-slate-9|bg-black|dark.mode|theme-dark/.test(h);
    const hasAnimations = /animate|transition|motion|aos|gsap|scroll/.test(h);
    const hasBackground = /gradient|radial|linear-gradient|bg-gradient/.test(h);

    const hints: string[] = [];
    if (isDarkTheme) hints.push("dark color scheme");
    if (hasAnimations) hints.push("scroll animations");
    if (hasBackground) hints.push("gradient backgrounds");
    if (hints.length) lines.push(`\nStyle hints: ${hints.join(", ")}`);

    if (lines.length === 0) {
      lines.push("- Standard marketing website layout");
      lines.push("- Header with navigation");
      lines.push("- Hero section with CTA");
      lines.push("- 3-column feature section");
      lines.push("- Footer with links");
    }

    return lines.join("\n");
  }

  // ── HTML fetch proxy ──────────────────────────────────────────────────────
  app.get("/api/fetch-url", async (req, res) => {
    const { url, selector } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }
    let fetchUrl: string;
    try {
      fetchUrl = resolveRemoteUrl(url);
    } catch (e) {
      return res.status(400).json({
        error: e instanceof Error ? e.message : "Invalid URL",
      });
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12_000);

      const response = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Target returned ${response.status}: ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        throw new Error("Endpoint did not return HTML content");
      }

      let text = await response.text();

      // Strip HTML comments
      text = text.replace(/<!--[\s\S]*?-->/g, "");

      // Remove scripts, styles, and non-structural elements to save context
      text = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<link\b[^>]*>/gi, "")
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "[SVG ICON]")
        .replace(/<img\b[^>]*>/gi, "[IMAGE ASSET]")
        .replace(/\s\s+/g, " ")
        .trim();

      // Optional: narrow to a specific CSS selector (simple tag names only)
      if (typeof selector === "string" && selector.trim()) {
        text = extractBySelector(text, selector);
      }

      // Extract layout skeleton for the skeleton-based replication mode
      const skeleton = extractLayoutSkeleton(text);

      res.json({
        content: text.substring(0, 15000),
        skeleton,
      });
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch website structure",
      });
    }
  });

  // ── Vite middleware / static files ────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
