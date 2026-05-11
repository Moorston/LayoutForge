/**
 * AI provider definitions and resolution logic.
 *
 * Resolution order:
 * 1. Runtime config (from UI — persisted to .runtime-config.json)
 * 2. Environment variables (.env.local)
 * 3. Hardcoded defaults
 */

import { resolveEffectiveConfig, getActiveProvider } from "./runtimeConfig";

type AuthStyle = "bearer" | "api-key" | "x-api-key";

export interface ProviderDef {
  baseUrl: string;
  authStyle: AuthStyle;
  envKey: string;
  extraHeaders?: Record<string, string>;
  isAnthropic?: boolean;
}

export const PROVIDER_DEFS: Record<string, ProviderDef> = {
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
    baseUrl: "https://token-plan-cn.xiaomimimo.com/v1", // Resolved at runtime via MIMO_API_BASE_URL or AI_API_BASE_URL
    authStyle: "bearer",
    envKey: "MIMO_API_KEY",
  },
  custom: { baseUrl: "", authStyle: "bearer", envKey: "AI_CUSTOM_API_KEY" },
};

export interface ResolvedProvider {
  def: ProviderDef;
  apiKey: string;
  baseUrl: string;
}

export function resolveProvider(reqProvider: string): ResolvedProvider | null {
  const id = (reqProvider || getActiveProvider()).toLowerCase().trim();
  const def = PROVIDER_DEFS[id];
  if (!def) return null;

  // Priority 1: Runtime config (from UI — .runtime-config.json)
  const runtimeCfg = resolveEffectiveConfig(id);
  if (runtimeCfg) {
    return {
      def,
      apiKey: runtimeCfg.apiKey,
      baseUrl: runtimeCfg.baseUrl || "https://token-plan-sgp.xiaomimimo.com/v1",
    };
  }

  // Priority 2: Environment variables (.env.local)
  const genericBaseOverride = (process.env.AI_API_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

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
      "https://token-plan-sgp.xiaomimimo.com/v1";
  } else {
    effectiveBaseUrl = genericBaseOverride || def.baseUrl;
  }

  if (!effectiveBaseUrl) return null;

  const apiKey = (process.env[def.envKey] ?? "").trim();
  if (!apiKey) return null;

  return { def, apiKey, baseUrl: effectiveBaseUrl };
}

export function buildAuthHeaders(
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
