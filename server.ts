import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import {
  hasImageUrlInBody,
  getCacheKey,
  getCachedResponse,
  setCachedResponse,
} from "./server/cache";
import {
  resolveProvider,
  buildAuthHeaders,
  PROVIDER_DEFS,
} from "./server/providers";
import { openAIToAnthropic, anthropicToOpenAI } from "./server/formatAdapter";
import { resolveRemoteUrl } from "./server/ssrfGuard";
import {
  extractBySelector,
  extractLayoutSkeleton,
} from "./server/skeletonExtractor";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

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

const mimoRateLimiter = aiRateLimiter; // backward compat alias

// ── MiMo-specific base URL validation ────────────────────────────────────────

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
          ? "mimo"
          : "";

    const payload = { ...body };
    const mimoBaseUrlOverride =
      typeof body._mimoBaseUrl === "string"
        ? (body._mimoBaseUrl as string).trim().replace(/\/+$/, "")
        : "";
    delete payload._provider;
    delete payload._mimoBaseUrl;

    const resolved = resolveProvider(reqProvider);
    if (!resolved) {
      res.status(400).json({
        error: `Unknown or unconfigured provider: "${reqProvider || process.env.AI_PROVIDER || "mimo"}". Check AI_PROVIDER in .env.local.`,
      });
      return;
    }
    let { def, apiKey, baseUrl } = resolved;

    if (reqProvider === "mimo" && mimoBaseUrlOverride) {
      baseUrl = mimoBaseUrlOverride;
    }

    if (!apiKey) {
      res.status(500).json({
        error: `API key not set. Add ${def.envKey}=<your-key> to .env.local and restart.`,
      });
      return;
    }

    // Cache lookup (text-only, skip images)
    const skipCache = hasImageUrlInBody(payload);
    const cacheKey = skipCache ? "" : getCacheKey(payload);
    if (!skipCache && cacheKey) {
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        console.log("[AI cache] HIT", cacheKey.slice(0, 12));
        res
          .status(200)
          .setHeader("Content-Type", "application/json; charset=utf-8")
          .setHeader("X-Cache", "HIT")
          .send(cached);
        return;
      }
    }

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
      } else {
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
          if (!text.trim()) {
            console.warn(`[AI proxy] ${endpoint} returned 200 but empty body.`);
          }
        }
      }

      if (def.isAnthropic && upstream.ok) text = anthropicToOpenAI(text);

      if (upstream.ok && !skipCache && cacheKey) {
        setCachedResponse(cacheKey, text);
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
    payload.stream = true;

    const resolved = resolveProvider(reqProvider);
    if (!resolved) {
      res.status(400).json({
        error: `Unknown or unconfigured provider: "${reqProvider || process.env.AI_PROVIDER || "mimo"}".`,
      });
      return;
    }
    let { def, apiKey, baseUrl } = resolved;

    if (reqProvider === "mimo" && mimoBaseUrlOverride) {
      baseUrl = mimoBaseUrlOverride;
    }
    if (!apiKey) {
      res.status(500).json({
        error: `API key not set. Add ${def.envKey}=<your-key> to .env.local.`,
      });
      return;
    }

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

  // ── Universal routes (/api/ai/) ─────────────────────────────────────────
  app.post("/api/ai/chat/completions", aiRateLimiter, (req, res) =>
    handleAICompletion(req, res),
  );
  app.post("/api/ai/chat/completions/stream", aiRateLimiter, (req, res) =>
    handleAIStream(req, res),
  );

  // ── Config endpoint ────────────────────────────────────────────────────
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

  // ── Legacy /api/mimo/* aliases (backward compat) ───────────────────────
  app.post("/api/mimo/chat/completions", mimoRateLimiter, (req, res) =>
    handleAICompletion(req, res),
  );
  app.post("/api/mimo/chat/completions/stream", mimoRateLimiter, (req, res) =>
    handleAIStream(req, res),
  );

  // ── HTML fetch proxy ──────────────────────────────────────────────────
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

      text = text.replace(/<!--[\s\S]*?-->/g, "");
      text = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<link\b[^>]*>/gi, "")
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "[SVG ICON]")
        .replace(/<img\b[^>]*>/gi, "[IMAGE ASSET]")
        .replace(/\s\s+/g, " ")
        .trim();

      if (typeof selector === "string" && selector.trim()) {
        text = extractBySelector(text, selector);
      }

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
