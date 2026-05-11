/**
 * Runtime AI configuration store.
 *
 * Allows users to change provider, API key, base URL, and models
 * at runtime via the UI — without restarting the server or editing .env files.
 *
 * Config is persisted to `.runtime-config.json` (gitignored) and loaded on startup.
 * Runtime config takes priority over environment variables.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CONFIG_FILE = path.join(process.cwd(), ".runtime-config.json");

export interface RuntimeProviderConfig {
  /** Provider ID (openai, anthropic, google, etc.) */
  provider: string;
  /** API key — stored server-side only, never sent to frontend */
  apiKey?: string;
  /** Custom base URL override */
  baseUrl?: string;
  /** Text model name override */
  textModel?: string;
  /** Vision model name override */
  visionModel?: string;
}

export interface RuntimeConfig {
  /** Currently active provider */
  activeProvider: string;
  /** Per-provider configurations */
  providers: Record<string, RuntimeProviderConfig>;
  /** When the config was last updated */
  updatedAt: string;
}

let runtimeConfig: RuntimeConfig = loadConfig();

function loadConfig(): RuntimeConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw) as RuntimeConfig;
      console.log("[runtimeConfig] Loaded config from", CONFIG_FILE);
      return parsed;
    }
  } catch (e) {
    console.warn("[runtimeConfig] Failed to load config file:", e);
  }
  return {
    activeProvider: "",
    providers: {},
    updatedAt: new Date().toISOString(),
  };
}

function saveConfig(): void {
  try {
    runtimeConfig.updatedAt = new Date().toISOString();
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(runtimeConfig, null, 2),
      "utf-8",
    );
    console.log("[runtimeConfig] Saved config to", CONFIG_FILE);
  } catch (e) {
    console.error("[runtimeConfig] Failed to save config:", e);
  }
}

/**
 * Get the effective active provider ID.
 * Runtime config > env AI_PROVIDER > "mimo"
 */
export function getActiveProvider(): string {
  return (
    runtimeConfig.activeProvider ||
    (process.env.AI_PROVIDER ?? "mimo").trim() ||
    "mimo"
  );
}

/**
 * Get runtime config for a specific provider.
 * Returns undefined if no runtime config exists for that provider.
 */
export function getProviderConfig(
  providerId: string,
): RuntimeProviderConfig | undefined {
  return runtimeConfig.providers[providerId];
}

/**
 * Get the full runtime config (safe — no API keys).
 * This is returned to the frontend.
 */
export function getPublicConfig(): {
  activeProvider: string;
  providers: Record<
    string,
    {
      provider: string;
      baseUrl?: string;
      textModel?: string;
      visionModel?: string;
      hasApiKey: boolean;
    }
  >;
  updatedAt: string;
} {
  const safeProviders: Record<
    string,
    {
      provider: string;
      baseUrl?: string;
      textModel?: string;
      visionModel?: string;
      hasApiKey: boolean;
    }
  > = {};
  for (const [id, cfg] of Object.entries(runtimeConfig.providers)) {
    safeProviders[id] = {
      provider: cfg.provider,
      baseUrl: cfg.baseUrl,
      textModel: cfg.textModel,
      visionModel: cfg.visionModel,
      hasApiKey: !!cfg.apiKey,
    };
  }
  return {
    activeProvider: getActiveProvider(),
    providers: safeProviders,
    updatedAt: runtimeConfig.updatedAt,
  };
}

/**
 * Save a provider's configuration.
 * Only updates fields that are provided — leaves others unchanged.
 */
export function saveProviderConfig(config: RuntimeProviderConfig): void {
  const existing = runtimeConfig.providers[config.provider] || {
    provider: config.provider,
  };

  runtimeConfig.providers[config.provider] = {
    ...existing,
    ...config,
    // Only overwrite apiKey if a new one is provided
    apiKey: config.apiKey || existing.apiKey,
  };

  // If this is being set as active, update activeProvider
  runtimeConfig.activeProvider = config.provider;

  saveConfig();
}

/**
 * Set the active provider.
 */
export function setActiveProvider(providerId: string): void {
  runtimeConfig.activeProvider = providerId;
  saveConfig();
}

/**
 * Delete a provider's runtime config.
 */
export function deleteProviderConfig(providerId: string): void {
  delete runtimeConfig.providers[providerId];
  if (runtimeConfig.activeProvider === providerId) {
    runtimeConfig.activeProvider = "";
  }
  saveConfig();
}

/**
 * Resolve the effective configuration for a provider.
 * Checks runtime config first, then falls back to env vars.
 *
 * Returns: { apiKey, baseUrl, textModel, visionModel } or null if unresolvable.
 */
/** Default models per provider — exported so GET /api/ai/config can use provider-specific fallbacks. */
export const DEFAULT_MODELS: Record<string, { text: string; vision: string }> =
  {
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

export function resolveEffectiveConfig(providerId: string): {
  apiKey: string;
  baseUrl: string;
  textModel: string;
  visionModel: string;
} | null {
  const runtime = runtimeConfig.providers[providerId];

  // Resolve API key: runtime > env
  const ENV_KEY_MAP: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_AI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    qwen: "QWEN_API_KEY",
    zhipu: "ZHIPU_API_KEY",
    groq: "GROQ_API_KEY",
    mimo: "MIMO_API_KEY",
    custom: "AI_CUSTOM_API_KEY",
  };

  const envKey = ENV_KEY_MAP[providerId] ?? "";
  const apiKey = runtime?.apiKey || (process.env[envKey] ?? "").trim();
  if (!apiKey) return null;

  // Resolve base URL: runtime > env > provider defaults
  const DEFAULT_BASES: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    anthropic: "https://api.anthropic.com/v1",
    google: "https://generativelanguage.googleapis.com/v1beta/openai",
    deepseek: "https://api.deepseek.com/v1",
    qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    zhipu: "https://open.bigmodel.cn/api/paas/v4",
    groq: "https://api.groq.com/openai/v1",
    mimo: "https://token-plan-sgp.xiaomimimo.com/v1",
    custom: "",
  };

  const baseUrl = (
    runtime?.baseUrl ||
    (process.env.AI_API_BASE_URL ?? "").trim() ||
    (providerId === "mimo"
      ? (process.env.MIMO_API_BASE_URL ?? "").trim()
      : "") ||
    (providerId === "custom"
      ? (process.env.AI_CUSTOM_BASE_URL ?? "").trim()
      : "") ||
    DEFAULT_BASES[providerId] ||
    ""
  ).replace(/\/+$/, "");

  // Resolve models: runtime > env > provider-specific defaults
  const defaults = DEFAULT_MODELS[providerId] ?? DEFAULT_MODELS.mimo;

  const textModel =
    runtime?.textModel ||
    (process.env.AI_MODEL_TEXT ?? "").trim() ||
    defaults.text;

  const visionModel =
    runtime?.visionModel ||
    (process.env.AI_MODEL_VISION ?? "").trim() ||
    defaults.vision;

  return { apiKey, baseUrl, textModel, visionModel };
}
