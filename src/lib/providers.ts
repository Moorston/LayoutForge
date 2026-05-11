/**
 * AI provider and model definitions.
 * This file is safe to import on the frontend — it contains NO secrets.
 * API keys live server-side only (process.env / .env.local).
 */

export type ProviderID =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "qwen"
  | "zhipu"
  | "groq"
  | "mimo"
  | "custom";

/** All valid provider IDs as a readonly array — useful for validation */
export const VALID_PROVIDER_IDS: readonly ProviderID[] = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "qwen",
  "zhipu",
  "groq",
  "mimo",
  "custom",
] as const;

export interface AIModel {
  id: string;
  /** Display name */
  name: string;
  supportsVision: boolean;
  /** Approximate context window in tokens */
  contextWindow: number;
  /** Max output tokens */
  maxOutputTokens: number;
  isDefault?: boolean;
  isDefaultVision?: boolean;
  /** Rough cost tier for display */
  tier: "flagship" | "balanced" | "fast" | "free";
}

export interface AIProvider {
  id: ProviderID;
  name: string;
  /** Emoji icon for compact display */
  icon: string;
  /** API docs URL */
  docsUrl: string;
  /** Which env variable the server reads for the API key */
  envKeyName: string;
  models: AIModel[];
  /** Whether any model in this provider supports vision */
  supportsVision: boolean;
  /** Short note shown in settings */
  note?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Check if any model in the list supports vision */
function hasVisionModel(models: AIModel[]): boolean {
  return models.some((m) => m.supportsVision);
}

// ─── Provider Catalogue ───────────────────────────────────────────────────────
//
// Model lists should be kept roughly up-to-date.
// supportsVision at the provider level is computed automatically.

const openaiModels: AIModel[] = [
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    supportsVision: true,
    contextWindow: 1_048_576,
    maxOutputTokens: 32_768,
    tier: "flagship",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    supportsVision: true,
    contextWindow: 1_048_576,
    maxOutputTokens: 32_768,
    isDefault: true,
    isDefaultVision: true,
    tier: "fast",
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 nano",
    supportsVision: true,
    contextWindow: 1_048_576,
    maxOutputTokens: 32_768,
    tier: "fast",
  },
  {
    id: "o3",
    name: "o3",
    supportsVision: true,
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    tier: "flagship",
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    supportsVision: true,
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    tier: "balanced",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    supportsVision: true,
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    tier: "flagship",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    supportsVision: true,
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    tier: "fast",
  },
];

const anthropicModels: AIModel[] = [
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    supportsVision: true,
    contextWindow: 200_000,
    maxOutputTokens: 16_384,
    isDefault: true,
    isDefaultVision: true,
    tier: "flagship",
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    supportsVision: true,
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    tier: "flagship",
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    supportsVision: true,
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    tier: "fast",
  },
];

const googleModels: AIModel[] = [
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    supportsVision: true,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    isDefault: true,
    isDefaultVision: true,
    tier: "flagship",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    supportsVision: true,
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    tier: "fast",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    supportsVision: true,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    tier: "fast",
  },
];

const deepseekModels: AIModel[] = [
  {
    id: "deepseek-chat",
    name: "DeepSeek V3",
    supportsVision: false,
    contextWindow: 64_000,
    maxOutputTokens: 8_192,
    isDefault: true,
    tier: "balanced",
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek R1",
    supportsVision: false,
    contextWindow: 64_000,
    maxOutputTokens: 32_768,
    tier: "flagship",
  },
  {
    id: "deepseek-vision",
    name: "DeepSeek VL2",
    supportsVision: true,
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    isDefaultVision: true,
    tier: "balanced",
  },
];

const qwenModels: AIModel[] = [
  {
    id: "qwen-turbo-latest",
    name: "Qwen Turbo",
    supportsVision: false,
    contextWindow: 1_000_000,
    maxOutputTokens: 8_192,
    isDefault: true,
    tier: "fast",
  },
  {
    id: "qwen-plus-latest",
    name: "Qwen Plus",
    supportsVision: false,
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    tier: "balanced",
  },
  {
    id: "qwen-max-latest",
    name: "Qwen Max",
    supportsVision: false,
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    tier: "flagship",
  },
  {
    id: "qwen-vl-max-latest",
    name: "Qwen-VL Max",
    supportsVision: true,
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    isDefaultVision: true,
    tier: "flagship",
  },
  {
    id: "qwen-vl-plus-latest",
    name: "Qwen-VL Plus",
    supportsVision: true,
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    tier: "balanced",
  },
];

const zhipuModels: AIModel[] = [
  {
    id: "glm-4-flash",
    name: "GLM-4 Flash",
    supportsVision: false,
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    isDefault: true,
    tier: "free",
  },
  {
    id: "glm-4",
    name: "GLM-4",
    supportsVision: false,
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    tier: "flagship",
  },
  {
    id: "glm-4v-plus",
    name: "GLM-4V Plus",
    supportsVision: true,
    contextWindow: 8_192,
    maxOutputTokens: 1_024,
    isDefaultVision: true,
    tier: "flagship",
  },
  {
    id: "glm-4v-flash",
    name: "GLM-4V Flash",
    supportsVision: true,
    contextWindow: 8_192,
    maxOutputTokens: 1_024,
    tier: "free",
  },
];

const groqModels: AIModel[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    supportsVision: false,
    contextWindow: 128_000,
    maxOutputTokens: 32_768,
    isDefault: true,
    tier: "balanced",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    supportsVision: false,
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    tier: "fast",
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout",
    supportsVision: true,
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    isDefaultVision: true,
    tier: "balanced",
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    supportsVision: false,
    contextWindow: 32_768,
    maxOutputTokens: 32_768,
    tier: "fast",
  },
];

const mimoModels: AIModel[] = [
  {
    id: "mimo-v2.5",
    name: "MiMo v2.5",
    supportsVision: true,
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    isDefault: true,
    isDefaultVision: true,
    tier: "balanced",
  },
  {
    id: "mimo-v2.5-pro",
    name: "MiMo v2.5 Pro",
    supportsVision: true,
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    tier: "flagship",
  },
  {
    id: "mimo-v2-omni",
    name: "MiMo v2 Omni",
    supportsVision: true,
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    tier: "balanced",
  },
];

const customModels: AIModel[] = [
  {
    id: "custom-model",
    name: "Custom Model",
    supportsVision: true,
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    isDefault: true,
    isDefaultVision: true,
    tier: "balanced",
  },
];

export const PROVIDERS: Record<ProviderID, AIProvider> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    icon: "🟢",
    docsUrl: "https://platform.openai.com/docs",
    envKeyName: "OPENAI_API_KEY",
    models: openaiModels,
    supportsVision: hasVisionModel(openaiModels),
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    icon: "🧠",
    docsUrl: "https://docs.anthropic.com",
    envKeyName: "ANTHROPIC_API_KEY",
    models: anthropicModels,
    supportsVision: hasVisionModel(anthropicModels),
    note: "Uses Anthropic Messages API (auto-translated from OpenAI format)",
  },
  google: {
    id: "google",
    name: "Google Gemini",
    icon: "✨",
    docsUrl: "https://ai.google.dev/docs",
    envKeyName: "GOOGLE_AI_API_KEY",
    models: googleModels,
    supportsVision: hasVisionModel(googleModels),
    note: "Uses Gemini OpenAI-compatible endpoint",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    icon: "🐋",
    docsUrl: "https://platform.deepseek.com/docs",
    envKeyName: "DEEPSEEK_API_KEY",
    models: deepseekModels,
    supportsVision: hasVisionModel(deepseekModels),
  },
  qwen: {
    id: "qwen",
    name: "通义千问 (Qwen)",
    icon: "🌐",
    docsUrl: "https://help.aliyun.com/zh/model-studio",
    envKeyName: "QWEN_API_KEY",
    models: qwenModels,
    supportsVision: hasVisionModel(qwenModels),
    note: "阿里云 DashScope — 需要开通 API 权限",
  },
  zhipu: {
    id: "zhipu",
    name: "智谱 GLM",
    icon: "🧬",
    docsUrl: "https://open.bigmodel.cn/dev/api",
    envKeyName: "ZHIPU_API_KEY",
    models: zhipuModels,
    supportsVision: hasVisionModel(zhipuModels),
    note: "智谱 AI 开放平台",
  },
  groq: {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    docsUrl: "https://console.groq.com/docs",
    envKeyName: "GROQ_API_KEY",
    models: groqModels,
    supportsVision: hasVisionModel(groqModels),
    note: "超快推理速度 — 免费层可用",
  },
  mimo: {
    id: "mimo",
    name: "Xiaomi MiMo",
    icon: "🦊",
    docsUrl: "https://mimo-v2.com",
    envKeyName: "MIMO_API_KEY",
    models: mimoModels,
    supportsVision: hasVisionModel(mimoModels),
  },
  custom: {
    id: "custom",
    name: "自定义 / Custom",
    icon: "🔧",
    docsUrl: "",
    envKeyName: "AI_CUSTOM_API_KEY",
    models: customModels,
    supportsVision: hasVisionModel(customModels),
    note: "任何 OpenAI 兼容接口 (set AI_CUSTOM_BASE_URL in .env.local)",
  },
};

// ─── Derived Collections ─────────────────────────────────────────────────────

export const PROVIDER_LIST = Object.values(PROVIDERS);

// ─── Safe Lookup Helpers ─────────────────────────────────────────────────────

/** Get provider by ID — returns undefined for unknown IDs (never throws) */
export function getProvider(providerId: string): AIProvider | undefined {
  return PROVIDERS[providerId as ProviderID];
}

/** Get a specific model within a provider — returns undefined if not found */
export function getModel(
  providerId: string,
  modelId: string,
): AIModel | undefined {
  return getProvider(providerId)?.models.find((m) => m.id === modelId);
}

/** Get default text model id for a provider — safe fallback to first model */
export function getDefaultTextModel(providerId: ProviderID): string {
  const p = PROVIDERS[providerId];
  if (!p) return "";
  return p.models.find((m) => m.isDefault)?.id ?? p.models[0]?.id ?? "";
}

/** Get default vision model id for a provider — safe fallback chain */
export function getDefaultVisionModel(providerId: ProviderID): string {
  const p = PROVIDERS[providerId];
  if (!p) return "";
  return (
    p.models.find((m) => m.isDefaultVision)?.id ??
    p.models.find((m) => m.supportsVision)?.id ??
    getDefaultTextModel(providerId)
  );
}

/** Check if a string is a valid ProviderID */
export function isValidProviderId(id: string): id is ProviderID {
  return id in PROVIDERS;
}

// ─── Display Constants ───────────────────────────────────────────────────────

/** Tier badge styles for UI display */
export const TIER_STYLES: Record<AIModel["tier"], string> = {
  flagship: "bg-violet-50 text-violet-700 border-violet-200",
  balanced: "bg-blue-50 text-blue-700 border-blue-200",
  fast: "bg-emerald-50 text-emerald-700 border-emerald-200",
  free: "bg-slate-100 text-slate-600 border-slate-200",
};
