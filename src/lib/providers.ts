/**
 * AI provider and model definitions.
 * This file is safe to import on the frontend — it contains NO secrets.
 * API keys live server-side only (process.env / .env.local).
 */

export type ProviderID =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'qwen'
  | 'zhipu'
  | 'groq'
  | 'mimo'
  | 'custom';

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
  tier: 'flagship' | 'balanced' | 'fast' | 'free';
}

export interface AIProvider {
  id: ProviderID;
  name: string;
  /** Emoji icon for compact display */
  icon: string;
  /** Brand color (hex) */
  color: string;
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

// ─── Provider Catalogue ───────────────────────────────────────────────────────

export const PROVIDERS: Record<ProviderID, AIProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    color: '#10a37f',
    docsUrl: 'https://platform.openai.com/docs',
    envKeyName: 'OPENAI_API_KEY',
    supportsVision: true,
    models: [
      { id: 'gpt-4o',           name: 'GPT-4o',          supportsVision: true,  contextWindow: 128_000, maxOutputTokens: 16_384, isDefault: true, isDefaultVision: true, tier: 'flagship' },
      { id: 'gpt-4o-mini',      name: 'GPT-4o mini',     supportsVision: true,  contextWindow: 128_000, maxOutputTokens: 16_384, tier: 'fast' },
      { id: 'gpt-4-turbo',      name: 'GPT-4 Turbo',     supportsVision: true,  contextWindow: 128_000, maxOutputTokens: 4_096,  tier: 'flagship' },
      { id: 'o1',               name: 'o1',               supportsVision: false, contextWindow: 200_000, maxOutputTokens: 100_000, tier: 'flagship' },
      { id: 'o1-mini',          name: 'o1-mini',          supportsVision: false, contextWindow: 128_000, maxOutputTokens: 65_536, tier: 'balanced' },
    ],
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    color: '#d97706',
    docsUrl: 'https://docs.anthropic.com',
    envKeyName: 'ANTHROPIC_API_KEY',
    supportsVision: true,
    note: 'Uses Anthropic Messages API (auto-translated from OpenAI format)',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet',  supportsVision: true, contextWindow: 200_000, maxOutputTokens: 8_192, isDefault: true, isDefaultVision: true, tier: 'flagship' },
      { id: 'claude-3-5-haiku-20241022',  name: 'Claude 3.5 Haiku',   supportsVision: true, contextWindow: 200_000, maxOutputTokens: 8_192, tier: 'fast' },
      { id: 'claude-3-opus-20240229',     name: 'Claude 3 Opus',      supportsVision: true, contextWindow: 200_000, maxOutputTokens: 4_096, tier: 'flagship' },
    ],
  },

  google: {
    id: 'google',
    name: 'Google Gemini',
    icon: '✨',
    color: '#4285f4',
    docsUrl: 'https://ai.google.dev/docs',
    envKeyName: 'GOOGLE_AI_API_KEY',
    supportsVision: true,
    note: 'Uses Gemini OpenAI-compatible endpoint',
    models: [
      { id: 'gemini-2.0-flash',         name: 'Gemini 2.0 Flash',      supportsVision: true, contextWindow: 1_000_000, maxOutputTokens: 8_192, isDefault: true, isDefaultVision: true, tier: 'fast' },
      { id: 'gemini-1.5-pro',           name: 'Gemini 1.5 Pro',        supportsVision: true, contextWindow: 2_000_000, maxOutputTokens: 8_192, tier: 'flagship' },
      { id: 'gemini-1.5-flash',         name: 'Gemini 1.5 Flash',      supportsVision: true, contextWindow: 1_000_000, maxOutputTokens: 8_192, tier: 'fast' },
      { id: 'gemini-2.5-pro-preview',   name: 'Gemini 2.5 Pro (Preview)', supportsVision: true, contextWindow: 1_048_576, maxOutputTokens: 65_536, tier: 'flagship' },
    ],
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🐋',
    color: '#1677ff',
    docsUrl: 'https://platform.deepseek.com/docs',
    envKeyName: 'DEEPSEEK_API_KEY',
    supportsVision: true,
    models: [
      { id: 'deepseek-chat',     name: 'DeepSeek V3',     supportsVision: false, contextWindow: 64_000,  maxOutputTokens: 8_192, isDefault: true,  tier: 'balanced' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1',     supportsVision: false, contextWindow: 64_000,  maxOutputTokens: 32_768, tier: 'flagship' },
      { id: 'deepseek-vision',   name: 'DeepSeek VL2',    supportsVision: true,  contextWindow: 128_000, maxOutputTokens: 8_192, isDefaultVision: true, tier: 'balanced' },
    ],
  },

  qwen: {
    id: 'qwen',
    name: '通义千问 (Qwen)',
    icon: '🌐',
    color: '#ff6a00',
    docsUrl: 'https://help.aliyun.com/zh/model-studio',
    envKeyName: 'QWEN_API_KEY',
    supportsVision: true,
    note: '阿里云 DashScope — 需要开通 API 权限',
    models: [
      { id: 'qwen-turbo-latest',    name: 'Qwen Turbo',      supportsVision: false, contextWindow: 1_000_000, maxOutputTokens: 8_192, isDefault: true,  tier: 'fast' },
      { id: 'qwen-plus-latest',     name: 'Qwen Plus',       supportsVision: false, contextWindow: 131_072,   maxOutputTokens: 8_192, tier: 'balanced' },
      { id: 'qwen-max-latest',      name: 'Qwen Max',        supportsVision: false, contextWindow: 32_768,    maxOutputTokens: 8_192, tier: 'flagship' },
      { id: 'qwen-vl-max-latest',   name: 'Qwen-VL Max',     supportsVision: true,  contextWindow: 32_768,    maxOutputTokens: 8_192, isDefaultVision: true, tier: 'flagship' },
      { id: 'qwen-vl-plus-latest',  name: 'Qwen-VL Plus',    supportsVision: true,  contextWindow: 128_000,   maxOutputTokens: 8_192, tier: 'balanced' },
    ],
  },

  zhipu: {
    id: 'zhipu',
    name: '智谱 GLM',
    icon: '🧬',
    color: '#6c3fff',
    docsUrl: 'https://open.bigmodel.cn/dev/api',
    envKeyName: 'ZHIPU_API_KEY',
    supportsVision: true,
    note: '智谱 AI 开放平台',
    models: [
      { id: 'glm-4-flash',      name: 'GLM-4 Flash',      supportsVision: false, contextWindow: 128_000, maxOutputTokens: 4_096, isDefault: true,  tier: 'free' },
      { id: 'glm-4',            name: 'GLM-4',             supportsVision: false, contextWindow: 128_000, maxOutputTokens: 4_096, tier: 'flagship' },
      { id: 'glm-4v-plus',      name: 'GLM-4V Plus',       supportsVision: true,  contextWindow: 8_192,   maxOutputTokens: 1_024, isDefaultVision: true, tier: 'flagship' },
      { id: 'glm-4v-flash',     name: 'GLM-4V Flash',      supportsVision: true,  contextWindow: 8_192,   maxOutputTokens: 1_024, tier: 'free' },
    ],
  },

  groq: {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    color: '#f55036',
    docsUrl: 'https://console.groq.com/docs',
    envKeyName: 'GROQ_API_KEY',
    supportsVision: true,
    note: '超快推理速度 — 免费层可用',
    models: [
      { id: 'llama-3.3-70b-versatile',      name: 'Llama 3.3 70B',     supportsVision: false, contextWindow: 128_000, maxOutputTokens: 32_768, isDefault: true, tier: 'balanced' },
      { id: 'llama-3.1-8b-instant',         name: 'Llama 3.1 8B',      supportsVision: false, contextWindow: 128_000, maxOutputTokens: 8_192,  tier: 'fast' },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', supportsVision: true, contextWindow: 128_000, maxOutputTokens: 8_192, tier: 'balanced' },
      { id: 'mixtral-8x7b-32768',           name: 'Mixtral 8x7B',      supportsVision: false, contextWindow: 32_768,  maxOutputTokens: 32_768, tier: 'fast' },
    ],
  },

  mimo: {
    id: 'mimo',
    name: 'Xiaomi MiMo',
    icon: '🤖',
    color: '#ff6900',
    docsUrl: 'https://mimo-v2.com',
    envKeyName: 'MIMO_API_KEY',
    supportsVision: true,
    models: [
      { id: 'mimo-v2.5',     name: 'MiMo v2.5',     supportsVision: true, contextWindow: 32_768, maxOutputTokens: 8_192, isDefault: true, isDefaultVision: true, tier: 'balanced' },
      { id: 'mimo-v2.5-pro', name: 'MiMo v2.5 Pro', supportsVision: true, contextWindow: 32_768, maxOutputTokens: 8_192, tier: 'flagship' },
      { id: 'mimo-v2-omni',  name: 'MiMo v2 Omni',  supportsVision: true, contextWindow: 32_768, maxOutputTokens: 8_192, tier: 'balanced' },
    ],
  },

  custom: {
    id: 'custom',
    name: '自定义 / Custom',
    icon: '🔧',
    color: '#64748b',
    docsUrl: '',
    envKeyName: 'AI_CUSTOM_API_KEY',
    supportsVision: true,
    note: '任何 OpenAI 兼容接口 (set AI_CUSTOM_BASE_URL in .env.local)',
    models: [
      { id: 'custom-model', name: 'Custom Model', supportsVision: true, contextWindow: 128_000, maxOutputTokens: 8_192, isDefault: true, isDefaultVision: true, tier: 'balanced' },
    ],
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

/** Get default text model id for a provider */
export function getDefaultTextModel(providerId: ProviderID): string {
  const p = PROVIDERS[providerId];
  return p.models.find(m => m.isDefault)?.id ?? p.models[0]?.id ?? '';
}

/** Get default vision model id for a provider */
export function getDefaultVisionModel(providerId: ProviderID): string {
  const p = PROVIDERS[providerId];
  return p.models.find(m => m.isDefaultVision)?.id
    ?? p.models.find(m => m.supportsVision)?.id
    ?? getDefaultTextModel(providerId);
}

/** Tier badge styles */
export const TIER_STYLES: Record<AIModel['tier'], string> = {
  flagship: 'bg-violet-50 text-violet-700 border-violet-200',
  balanced: 'bg-blue-50 text-blue-700 border-blue-200',
  fast:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  free:     'bg-slate-100 text-slate-600 border-slate-200',
};
