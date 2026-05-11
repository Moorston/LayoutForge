import { AI_RETRY_DELAY_MS } from "@/lib/constants";

/**
 * AI HTTP client functions for communicating with AI providers.
 * This module contains all HTTP-related functionality for AI API calls.
 *
 * All base URLs are resolved from environment variables — no hardcoded endpoints.
 * Configure via .env.local:
 *   AI_API_BASE_URL  — generic override for any provider
 *   MIMO_API_BASE_URL — MiMo-specific override
 */

/** Active AI provider — read from env (set by vite.config.ts at build time) */
export const ACTIVE_PROVIDER: string =
  (process.env.AI_PROVIDER ?? "mimo").trim() || "mimo";

// Kept as empty strings for backward-compat exports — real values come from getMimoConfig()
export const DEFAULT_BASE = "";
export const ALT_PUBLIC_MIMO_BASE = "";

export function extractUpstreamErrorDetail(rawBody: string): string {
  const t = rawBody.trim();
  if (!t) {
    return "(empty body — wrong gateway or model route; set AI_API_BASE_URL in .env.local or check the provider console)";
  }
  try {
    const j = JSON.parse(t) as {
      error?: string | { message?: string; code?: string; type?: string };
      message?: string;
    };
    if (typeof j.error === "string" && j.error.length) return j.error;
    if (j.error && typeof j.error === "object") {
      const parts = [j.error.message, j.error.code, j.error.type].filter(
        (x): x is string => typeof x === "string" && x.length > 0,
      );
      if (parts.length) return parts.join(" · ");
    }
    if (typeof j.message === "string" && j.message.length) return j.message;
    return t.slice(0, 600);
  } catch {
    return t.slice(0, 600);
  }
}

/**
 * Fallback MiMo base URL — used ONLY when no env var is configured.
 * Matches the default in server/providers.ts.
 */
const MIMO_FALLBACK_BASE = "https://token-plan-sgp.xiaomimimo.com/v1";

export function getMimoConfig() {
  const baseUrl = (
    (process.env.AI_API_BASE_URL ?? "").trim() ||
    (process.env.MIMO_API_BASE_URL ?? "").trim() ||
    MIMO_FALLBACK_BASE
  ).replace(/\/$/, "");

  // Vision base URL: use explicit override, or same as text base
  const explicitVisionBase = (process.env.MIMO_VISION_BASE_URL ?? "").trim();
  const visionBaseUrl = (explicitVisionBase || baseUrl).replace(/\/$/, "");

  const modelText =
    (process.env.AI_MODEL_TEXT ?? "").trim() ||
    (process.env.MIMO_MODEL_TEXT ?? "").trim() ||
    "mimo-v2.5";
  const modelVision =
    (process.env.AI_MODEL_VISION ?? "").trim() ||
    (process.env.MIMO_MODEL_VISION ?? "").trim() ||
    "mimo-v2.5";
  return { baseUrl, visionBaseUrl, modelText, modelVision };
}

/** Static default models per provider (avoids circular import) */
export const PROVIDER_DEFAULTS: Record<
  string,
  { text: string; vision: string }
> = {
  openai: { text: "gpt-4.1-mini", vision: "gpt-4.1-mini" },
  anthropic: {
    text: "claude-sonnet-4-20250514",
    vision: "claude-sonnet-4-20250514",
  },
  google: { text: "gemini-2.5-pro", vision: "gemini-2.5-pro" },
  deepseek: { text: "deepseek-chat", vision: "deepseek-vision" },
  qwen: { text: "qwen-turbo-latest", vision: "qwen-vl-max-latest" },
  zhipu: { text: "glm-4-flash", vision: "glm-4v-plus" },
  groq: {
    text: "llama-3.3-70b-versatile",
    vision: "meta-llama/llama-4-scout-17b-16e-instruct",
  },
  mimo: { text: "mimo-v2.5", vision: "mimo-v2.5" },
  custom: { text: "custom-model", vision: "custom-model" },
};

/** Runtime config override — set from UI at runtime, no restart needed */
interface AIConfigOverride {
  provider: string;
  modelText: string;
  modelVision: string;
}

let _configOverride: AIConfigOverride | null = null;

/**
 * Override the AI config at runtime (called from ModelSelectorPanel UI).
 * This takes priority over env-based config.
 */
export function setAIConfigOverride(override: AIConfigOverride | null): void {
  _configOverride = override;
  console.log("[aiClient] Config override:", override);
}

/** Get the current runtime override (if any) */
export function getAIConfigOverride(): AIConfigOverride | null {
  return _configOverride;
}

/**
 * Get active provider + model names.
 *
 * Priority:
 * 1. Runtime override (from UI)
 * 2. Environment variables (build-time)
 * 3. Provider defaults
 */
export function getAIConfig() {
  // Priority 1: Runtime override from UI
  if (_configOverride) {
    return {
      provider: _configOverride.provider,
      modelText: _configOverride.modelText,
      modelVision: _configOverride.modelVision,
    };
  }

  // Priority 2: Environment variables (only used for the build-time provider)
  const provider = ACTIVE_PROVIDER;
  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.mimo;

  // For the build-time provider, env vars can override defaults.
  // For other providers (after runtime switch), always use provider-specific defaults.
  return {
    provider,
    modelText: (process.env.AI_MODEL_TEXT ?? "").trim() || defaults.text,
    modelVision: (process.env.AI_MODEL_VISION ?? "").trim() || defaults.vision,
  };
}

export function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

export function isVisionRoutingFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("image input") ||
    m.includes("no endpoints found") ||
    (m.includes("404") && m.includes("mimo api"))
  );
}

export function isRetryableAiError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    isVisionRoutingFailure(m) ||
    m.includes("empty response") ||
    m.includes("empty streaming") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("overloaded")
  );
}

export async function chatCompletion(params: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  /** Override provider (defaults to runtime AI config). */
  provider?: string;
  /** Kept for backward-compat — ignored when provider is not 'mimo'. */
  baseUrl?: string;
  maxCompletionTokens?: number;
}): Promise<string> {
  const provider = params.provider ?? getAIConfig().provider;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("/api/ai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _provider: provider,
        ...(provider === "mimo" && params.baseUrl
          ? { _mimoBaseUrl: params.baseUrl }
          : {}),
        model: params.model,
        messages: params.messages,
        max_completion_tokens: params.maxCompletionTokens ?? 8192,
        temperature: 0.7,
        top_p: 0.95,
        stream: false,
      }),
    });

    const rawBody = await res.text();

    if (!res.ok) {
      const detail = extractUpstreamErrorDetail(rawBody);
      if (res.status === 401 || res.status === 403) {
        const err = new Error(`AI API ${res.status}: ${detail}`);
        (err as Error & { authFailure?: boolean }).authFailure = true;
        throw err;
      }
      throw new Error(`AI API ${res.status}: ${detail}`);
    }

    let data: { choices?: Array<{ message?: { content?: unknown } }> };
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error("AI returned invalid JSON.");
    }

    const text = messageContentToString(data.choices?.[0]?.message?.content);
    if (!text.trim()) {
      const model = (data as Record<string, unknown>).model ?? params.model;
      const choice = data.choices?.[0] as Record<string, unknown> | undefined;
      const finishReason = choice?.finish_reason ?? "unknown";
      if (attempt === 0) {
        console.warn(
          `[chatCompletion] Empty response (model=${model}, finish_reason=${finishReason}), retrying in 2s...`,
        );
        await new Promise((r) => setTimeout(r, AI_RETRY_DELAY_MS));
        continue;
      }
      throw new Error(
        `AI returned an empty response (model=${model}, finish_reason=${finishReason}). ` +
          `Check that your API key has access to this model and the base URL is correct.`,
      );
    }
    return text;
  }
  throw new Error("AI returned empty responses on all retry attempts.");
}

/**
 * Streaming variant: calls `/api/ai/chat/completions/stream`, reads the SSE
 * response chunk-by-chunk, extracts `delta.content` from each event, and
 * returns the fully accumulated text. Calls `onChunk` for every incremental piece.
 */
export async function streamChatCompletion(params: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  provider?: string;
  /** Backward compat: custom mimo base URL */
  baseUrl?: string;
  maxCompletionTokens?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
}): Promise<string> {
  const provider = params.provider ?? getAIConfig().provider;

  const res = await fetch("/api/ai/chat/completions/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      _provider: provider,
      ...(provider === "mimo" && params.baseUrl
        ? { _mimoBaseUrl: params.baseUrl }
        : {}),
      model: params.model,
      messages: params.messages,
      max_completion_tokens: params.maxCompletionTokens ?? 8192,
      temperature: 0.7,
      top_p: 0.95,
      stream: true, // Required for OpenAI-compatible streaming endpoints
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    const rawBody = await res.text();
    const detail = extractUpstreamErrorDetail(rawBody);
    const err = new Error(`AI API ${res.status}: ${detail}`);
    if (res.status === 401 || res.status === 403) {
      (err as Error & { authFailure?: boolean }).authFailure = true;
    }
    throw err;
  }

  if (!res.body) {
    throw new Error("No response body from streaming endpoint.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = parsed.choices?.[0]?.delta?.content ?? "";
          if (content) {
            accumulated += content;
            params.onChunk?.(content);
          }
        } catch {
          // Ignore malformed SSE chunks
        }
      }
    }

    // Process any remaining content in buffer after loop
    if (buffer.trim().startsWith("data:")) {
      const data = buffer.trim().slice(5).trim();
      if (data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = parsed.choices?.[0]?.delta?.content ?? "";
          if (content) {
            accumulated += content;
            params.onChunk?.(content);
          }
        } catch {
          // Ignore malformed SSE chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!accumulated.trim()) {
    throw new Error("AI returned an empty streaming response.");
  }
  return accumulated;
}

/** Helper to deduplicate vision retry attempts by base URL and model. */
export function uniqueVisionAttempts(
  pairs: Array<[string, string]>,
): Array<[string, string]> {
  const seen = new Set<string>();
  return pairs.filter(([b, m]) => {
    const k = `${b}|${m}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Vision-only chat with retry logic.
 *
 * All URLs come from environment configuration — no hardcoded fallbacks.
 * For MiMo: tries visionBaseUrl then baseUrl (they may differ if
 * MIMO_VISION_BASE_URL is set). For other providers: single attempt.
 */
export async function visionChatWithRetries(
  messages: Array<{ role: string; content: unknown }>,
  options?: { maxCompletionTokens?: number },
): Promise<string> {
  const { provider: activeProvider, modelVision } = getAIConfig();

  // For MiMo: try configured vision URL, then main URL (they may differ).
  // For all other providers: single attempt.
  if (activeProvider === "mimo") {
    const { visionBaseUrl, baseUrl, modelText } = getMimoConfig();
    const attempts = uniqueVisionAttempts([
      [visionBaseUrl, modelVision],
      [baseUrl, modelVision],
      [visionBaseUrl, modelText],
      [baseUrl, modelText],
    ]);
    let lastError: unknown;
    for (const [tryBase, tryModel] of attempts) {
      try {
        return await chatCompletion({
          model: tryModel,
          messages,
          baseUrl: tryBase,
          maxCompletionTokens: options?.maxCompletionTokens ?? 8192,
        });
      } catch (e) {
        lastError = e;
        if ((e as Error & { authFailure?: boolean }).authFailure) throw e;
        if (!isRetryableAiError(e instanceof Error ? e.message : String(e)))
          throw e;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Vision request failed.");
  }

  // Non-MiMo providers: single call, trust the provider supports vision.
  return chatCompletion({
    model: modelVision,
    messages,
    maxCompletionTokens: options?.maxCompletionTokens ?? 8192,
  });
}
