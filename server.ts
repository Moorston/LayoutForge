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
import { captureScreenshot } from "./server/screenshotService";
import {
  getPublicConfig,
  saveProviderConfig,
  setActiveProvider,
  deleteProviderConfig,
  getActiveProvider,
  DEFAULT_MODELS,
} from "./server/runtimeConfig";
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  SERVER_PORT,
  MAX_BODY_SIZE,
  AI_REQUEST_TIMEOUT_MS,
  URL_FETCH_TIMEOUT_MS,
  MAX_URL_CONTENT_LENGTH,
} from "@/lib/constants";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

// ── Error message sanitization for production ─────────────────────────────────

/**
 * Sanitize error messages for production to avoid leaking internal details.
 * In development, returns the original message for debugging.
 * In production, returns a generic message.
 */
function sanitizeError(error: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return "An internal error occurred. Please try again later.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An internal error occurred.";
}

// ── Rate limiter: max 20 req / 60 s / IP ─────────────────────────────────────

const aiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many requests — please wait a moment and try again.",
    });
  },
});

const mimoRateLimiter = aiRateLimiter; // backward compat alias

// ── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = SERVER_PORT;

  app.use(express.json({ limit: MAX_BODY_SIZE }));

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
        error: sanitizeError(
          `Unknown or unconfigured provider: "${reqProvider || process.env.AI_PROVIDER || "mimo"}". Check AI_PROVIDER in .env.local.`,
        ),
      });
      return;
    }
    let { def, apiKey, baseUrl } = resolved;

    if (reqProvider === "mimo" && mimoBaseUrlOverride) {
      baseUrl = mimoBaseUrlOverride;
    }

    if (!apiKey) {
      res.status(500).json({
        error: sanitizeError(
          `API key not set. Add ${def.envKey}=<your-key> to .env.local and restart.`,
        ),
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
      const timeout = setTimeout(
        () => controller.abort(),
        AI_REQUEST_TIMEOUT_MS,
      );
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
        error: sanitizeError(error),
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
        error: sanitizeError(
          `Unknown or unconfigured provider: "${reqProvider || process.env.AI_PROVIDER || "mimo"}".`,
        ),
      });
      return;
    }
    let { def, apiKey, baseUrl } = resolved;

    if (reqProvider === "mimo" && mimoBaseUrlOverride) {
      baseUrl = mimoBaseUrlOverride;
    }
    if (!apiKey) {
      res.status(500).json({
        error: sanitizeError(
          `API key not set. Add ${def.envKey}=<your-key> to .env.local.`,
        ),
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
      const timeout = setTimeout(
        () => controller.abort(),
        AI_REQUEST_TIMEOUT_MS,
      );
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
          error: sanitizeError(error),
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

  // ── Config endpoint (enhanced with runtime config) ────────────────────
  app.get("/api/ai/config", (_req, res) => {
    const publicConfig = getPublicConfig();

    // Also merge env-based configured providers for display
    const envConfiguredProviders = Object.entries(PROVIDER_DEFS)
      .filter(([id, def]) => {
        if (id === "custom")
          return !!(
            process.env.AI_CUSTOM_BASE_URL?.trim() &&
            process.env.AI_CUSTOM_API_KEY?.trim()
          );
        return !!process.env[def.envKey]?.trim();
      })
      .map(([id]) => id);

    // Merge: runtime-configured providers + env-configured providers
    const allConfigured = new Set([
      ...Object.keys(publicConfig.providers),
      ...envConfiguredProviders,
    ]);

    // Use provider-specific defaults (not env AI_MODEL_TEXT which may be for a different provider)
    const activeId = publicConfig.activeProvider;
    const providerDefaults = DEFAULT_MODELS[activeId] ?? DEFAULT_MODELS.mimo;

    res.json({
      activeProvider: publicConfig.activeProvider,
      configuredProviders: [...allConfigured],
      runtimeProviders: publicConfig.providers,
      textModel:
        publicConfig.providers[activeId]?.textModel ||
        providerDefaults.text ||
        null,
      visionModel:
        publicConfig.providers[activeId]?.visionModel ||
        providerDefaults.vision ||
        null,
      updatedAt: publicConfig.updatedAt,
    });
  });

  // ── Save provider config ─────────────────────────────────────────────
  app.post("/api/ai/config", (req, res) => {
    const { provider, apiKey, baseUrl, textModel, visionModel, setActive } =
      req.body as {
        provider?: string;
        apiKey?: string;
        baseUrl?: string;
        textModel?: string;
        visionModel?: string;
        setActive?: boolean;
      };

    if (!provider || typeof provider !== "string") {
      return res.status(400).json({ error: "provider is required" });
    }

    const validProviders = [
      "openai",
      "anthropic",
      "google",
      "deepseek",
      "qwen",
      "zhipu",
      "groq",
      "mimo",
      "custom",
    ];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: "Invalid provider ID" });
    }

    try {
      saveProviderConfig({
        provider,
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
        textModel: textModel || undefined,
        visionModel: visionModel || undefined,
      });

      if (setActive !== false) {
        setActiveProvider(provider);
      }

      res.json({ ok: true, activeProvider: getActiveProvider() });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // ── Delete provider config ───────────────────────────────────────────
  app.delete("/api/ai/config/:provider", (req, res) => {
    const { provider } = req.params;
    try {
      deleteProviderConfig(provider);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // ── Test connection ──────────────────────────────────────────────────
  app.post("/api/ai/test", aiRateLimiter, async (req, res) => {
    const { provider } = req.body as { provider?: string };
    const id = (provider || getActiveProvider()).toLowerCase().trim();

    const resolved = resolveProvider(id);
    if (!resolved) {
      return res.status(400).json({
        ok: false,
        error: `Provider "${id}" is not configured. Add an API key first.`,
      });
    }

    const { def, apiKey, baseUrl } = resolved;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const endpoint = def.isAnthropic
        ? `${baseUrl}/messages`
        : `${baseUrl}/chat/completions`;

      const testModel = def.isAnthropic
        ? "claude-3-5-haiku-20241022"
        : (DEFAULT_MODELS[id]?.text ?? "gpt-4o-mini");

      const testPayload = def.isAnthropic
        ? {
            model: testModel,
            max_tokens: 10,
            messages: [{ role: "user", content: "Say OK" }],
          }
        : {
            model: testModel,
            max_tokens: 10,
            messages: [{ role: "user", content: "Say OK" }],
            stream: false,
          };

      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: buildAuthHeaders(def, apiKey),
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        const text = await upstream.text();
        return res.json({
          ok: false,
          error: `API returned ${upstream.status}: ${text.slice(0, 200)}`,
        });
      }

      res.json({ ok: true, message: "Connection successful" });
    } catch (error) {
      res.json({
        ok: false,
        error: error instanceof Error ? error.message : "Connection failed",
      });
    }
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
      const timeoutId = setTimeout(
        () => controller.abort(),
        URL_FETCH_TIMEOUT_MS,
      );

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
        content: text.substring(0, MAX_URL_CONTENT_LENGTH),
        skeleton,
      });
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({
        error: sanitizeError(error),
      });
    }
  });

  // ── URL Screenshot endpoint ─────────────────────────────────────────────
  app.get("/api/screenshot-url", aiRateLimiter, async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    let fetchUrl: string;
    try {
      fetchUrl = resolveRemoteUrl(url);
    } catch (e) {
      return res.status(400).json({
        error: sanitizeError(e),
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        URL_FETCH_TIMEOUT_MS * 2, // Screenshots take longer
      );

      const result = await captureScreenshot(fetchUrl, controller.signal);
      clearTimeout(timeoutId);

      res.json({
        base64: result.base64,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height,
        sourceUrl: result.sourceUrl,
      });
    } catch (error) {
      console.error("Screenshot Error:", error);
      res.status(500).json({
        error: sanitizeError(error),
      });
    }
  });

  // ── Pipeline: URL → Screenshot → AI Generate → AI Refine ───────────────
  app.post("/api/pipeline/url-to-code", aiRateLimiter, async (req, res) => {
    const { url, stack, brandKit, refine } = req.body as {
      url?: string;
      stack?: string;
      brandKit?: string;
      refine?: boolean;
    };

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    let fetchUrl: string;
    try {
      fetchUrl = resolveRemoteUrl(url);
    } catch (e) {
      return res.status(400).json({ error: sanitizeError(e) });
    }

    try {
      // Step 1: Capture screenshot
      const screenshotController = new AbortController();
      const screenshotTimeout = setTimeout(
        () => screenshotController.abort(),
        URL_FETCH_TIMEOUT_MS * 2,
      );

      let screenshotResult;
      try {
        screenshotResult = await captureScreenshot(
          fetchUrl,
          screenshotController.signal,
        );
      } catch {
        // Fallback: use skeleton-based approach
        screenshotResult = null;
      }
      clearTimeout(screenshotTimeout);

      // Step 2: Also fetch HTML skeleton for additional context
      let skeleton = "";
      try {
        const htmlController = new AbortController();
        const htmlTimeout = setTimeout(
          () => htmlController.abort(),
          URL_FETCH_TIMEOUT_MS,
        );
        const htmlRes = await fetch(fetchUrl, {
          signal: htmlController.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html",
          },
        });
        clearTimeout(htmlTimeout);
        if (htmlRes.ok) {
          const htmlText = await htmlRes.text();
          const cleaned = htmlText
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<svg[\s\S]*?<\/svg>/gi, "")
            .replace(/<img[^>]*>/gi, "")
            .replace(/\s\s+/g, " ")
            .trim();
          skeleton = extractLayoutSkeleton(cleaned);
        }
      } catch {
        // Skeleton extraction failure is non-fatal
      }

      res.json({
        screenshot: screenshotResult
          ? {
              base64: screenshotResult.base64,
              mimeType: screenshotResult.mimeType,
              width: screenshotResult.width,
              height: screenshotResult.height,
            }
          : null,
        skeleton,
        sourceUrl: fetchUrl,
      });
    } catch (error) {
      console.error("Pipeline Error:", error);
      res.status(500).json({ error: sanitizeError(error) });
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
