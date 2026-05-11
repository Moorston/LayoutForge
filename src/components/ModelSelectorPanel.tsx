import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Cpu,
  Eye,
  EyeOff,
  Zap,
  Save,
  TestTube2,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PROVIDER_LIST,
  PROVIDERS,
  TIER_STYLES,
  getDefaultTextModel,
  getDefaultVisionModel,
  type ProviderID,
  type AIModel,
} from "@/lib/providers";
import { setAIConfigOverride } from "@/services/mimoService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RuntimeProviderInfo {
  provider: string;
  baseUrl?: string;
  textModel?: string;
  visionModel?: string;
  hasApiKey: boolean;
}

interface AIConfigResponse {
  activeProvider: string;
  configuredProviders: string[];
  runtimeProviders: Record<string, RuntimeProviderInfo>;
  textModel: string | null;
  visionModel: string | null;
  updatedAt: string;
}

interface ModelSelectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ModelSelectorPanel({
  isOpen,
  onClose,
  onConfigChange,
}: ModelSelectorPanelProps) {
  const [config, setConfig] = useState<AIConfigResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderID>("mimo");

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [textModel, setTextModel] = useState("");
  const [visionModel, setVisionModel] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Action state
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/config");
      if (res.ok) {
        const data = (await res.json()) as AIConfigResponse;
        setConfig(data);
        const activeId = data.activeProvider as ProviderID;
        if (PROVIDERS[activeId]) {
          setSelectedProvider(activeId);
          populateForm(activeId, data);
        }
      }
    } catch {
      // server not ready
    } finally {
      setLoading(false);
    }
  }, []);

  const populateForm = (providerId: ProviderID, cfg: AIConfigResponse) => {
    const runtimeInfo = cfg.runtimeProviders?.[providerId];
    if (runtimeInfo) {
      setBaseUrl(runtimeInfo.baseUrl || "");
      setTextModel(runtimeInfo.textModel || getDefaultTextModel(providerId));
      setVisionModel(
        runtimeInfo.visionModel || getDefaultVisionModel(providerId),
      );
      setApiKey("");
    } else {
      setBaseUrl("");
      setTextModel(getDefaultTextModel(providerId));
      setVisionModel(getDefaultVisionModel(providerId));
      setApiKey("");
    }
    setShowApiKey(false);
    setTestResult(null);
    setSaveResult(null);
  };

  useEffect(() => {
    if (isOpen) fetchConfig();
  }, [isOpen, fetchConfig]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleProviderSelect = (id: ProviderID) => {
    setSelectedProvider(id);
    if (config) populateForm(id, config);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // Save current form state first so server can test it
    try {
      await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || undefined,
          textModel: textModel || undefined,
          visionModel: visionModel || undefined,
          setActive: false,
        }),
      });
    } catch {
      /* ignore */
    }

    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        message?: string;
      };
      setTestResult({
        ok: data.ok,
        message: data.ok
          ? "Connection successful ✓"
          : data.error || "Connection failed",
      });
    } catch (e) {
      setTestResult({
        ok: false,
        message: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);

    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || undefined,
          textModel: textModel || undefined,
          visionModel: visionModel || undefined,
          setActive: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveResult(data.error || "Failed to save");
        return;
      }

      // Update client-side config so all AI calls use the new models
      setAIConfigOverride({
        provider: selectedProvider,
        modelText: textModel || getDefaultTextModel(selectedProvider),
        modelVision: visionModel || getDefaultVisionModel(selectedProvider),
      });

      setSaveResult("Configuration saved and applied ✓");
      await fetchConfig();
      onConfigChange?.();
    } catch (e) {
      setSaveResult(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    try {
      await fetch(`/api/ai/config/${providerId}`, {
        method: "DELETE",
      });
      setAIConfigOverride(null);
      await fetchConfig();
    } catch {
      /* ignore */
    }
  };

  const activeProvider = PROVIDERS[selectedProvider];
  const isConfigured = (id: string) =>
    config?.configuredProviders.includes(id) ?? false;
  const hasRuntimeConfig = (id: string) =>
    !!config?.runtimeProviders?.[id]?.hasApiKey;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            className="fixed right-0 top-0 h-screen w-[560px] max-w-full bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <Cpu className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    AI Model Configuration
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Configure provider, API key, and models at runtime
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchConfig}
                  disabled={loading}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <RefreshCw
                    className={cn("w-4 h-4", loading && "animate-spin")}
                  />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading && !config ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Provider grid */}
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Provider
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {PROVIDER_LIST.map((provider) => {
                        const isActive = config?.activeProvider === provider.id;
                        const isSelected = selectedProvider === provider.id;

                        return (
                          <motion.button
                            key={provider.id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleProviderSelect(provider.id)}
                            className={cn(
                              "relative text-left p-3 rounded-xl border transition-all flex flex-col items-center gap-1.5",
                              isSelected
                                ? "border-slate-900 bg-slate-50 shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-300",
                            )}
                          >
                            <span className="text-lg">{provider.icon}</span>
                            <span className="text-[11px] font-bold text-slate-900 truncate w-full text-center">
                              {provider.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              )}
                              {hasRuntimeConfig(provider.id) && !isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              )}
                              {isConfigured(provider.id) &&
                                !hasRuntimeConfig(provider.id) &&
                                !isActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-2 px-1">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                        Active
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{" "}
                        Runtime
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />{" "}
                        Env
                      </span>
                    </div>
                  </div>

                  {/* Configuration form */}
                  {activeProvider && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-xl">{activeProvider.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            {activeProvider.name}
                          </p>
                          {activeProvider.note && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {activeProvider.note}
                            </p>
                          )}
                        </div>
                        {config?.runtimeProviders?.[selectedProvider]
                          ?.hasApiKey && (
                          <button
                            onClick={() =>
                              handleDeleteProvider(selectedProvider)
                            }
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                            title="Remove runtime config"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* API Key */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          API Key
                          {config?.runtimeProviders?.[selectedProvider]
                            ?.hasApiKey &&
                            !apiKey && (
                              <span className="ml-2 text-emerald-600 normal-case tracking-normal">
                                (configured — leave blank to keep)
                              </span>
                            )}
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={
                              isConfigured(selectedProvider)
                                ? "••••••••••••"
                                : `Enter ${activeProvider.name} API key`
                            }
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                          >
                            {showApiKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Base URL */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Base URL
                          <span className="ml-2 text-slate-300 normal-case tracking-normal">
                            (optional)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder={getDefaultBaseUrl(selectedProvider)}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
                        />
                      </div>

                      {/* Text Model */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Text Model
                        </label>
                        <ModelSelector
                          models={activeProvider.models}
                          value={textModel}
                          onChange={setTextModel}
                          placeholder={getDefaultTextModel(selectedProvider)}
                        />
                      </div>

                      {/* Vision Model */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Vision Model
                          <span className="ml-2 text-slate-300 normal-case tracking-normal">
                            (screenshot analysis)
                          </span>
                        </label>
                        <ModelSelector
                          models={activeProvider.models.filter(
                            (m) => m.supportsVision,
                          )}
                          value={visionModel}
                          onChange={setVisionModel}
                          placeholder={getDefaultVisionModel(selectedProvider)}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleTestConnection}
                          disabled={testing || !isConfigured(selectedProvider)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {testing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <TestTube2 className="w-4 h-4" />
                          )}
                          Test
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save & Apply
                        </motion.button>
                      </div>

                      {/* Status messages */}
                      <AnimatePresence>
                        {testResult && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold border",
                              testResult.ok
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200",
                            )}
                          >
                            {testResult.ok ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : (
                              <X className="w-4 h-4 shrink-0" />
                            )}
                            <span className="truncate">
                              {testResult.message}
                            </span>
                          </motion.div>
                        )}
                        {saveResult && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold border",
                              saveResult.includes("✓")
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200",
                            )}
                          >
                            {saveResult.includes("✓") ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : (
                              <X className="w-4 h-4 shrink-0" />
                            )}
                            <span className="truncate">{saveResult}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Docs link */}
                      {activeProvider.docsUrl && (
                        <a
                          href={activeProvider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          {activeProvider.name} API Docs →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Model Selector Dropdown ──────────────────────────────────────────────────

function ModelSelector({
  models,
  value,
  onChange,
  placeholder,
}: {
  models: AIModel[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const selectedModel = models.find((m) => m.id === value);
  const isCustom = value && !models.find((m) => m.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between border rounded-xl px-4 py-2.5 text-sm text-left transition-all",
          open
            ? "border-slate-900 ring-2 ring-slate-900"
            : "border-slate-200 hover:border-slate-300",
        )}
      >
        <span
          className={cn(
            "font-mono truncate",
            value ? "text-slate-900 font-medium" : "text-slate-300",
          )}
        >
          {isCustom
            ? value
            : selectedModel
              ? `${selectedModel.name} (${selectedModel.id})`
              : value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform shrink-0 ml-2",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-[240px] overflow-y-auto py-1">
              {models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onChange(model.id);
                    setOpen(false);
                    setCustomMode(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-3",
                    value === model.id && "bg-slate-50",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {model.name}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[9px] font-bold border rounded-full uppercase",
                          TIER_STYLES[model.tier],
                        )}
                      >
                        {model.tier}
                      </span>
                      {model.supportsVision && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200 rounded-full">
                          Vision
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {model.id}
                    </p>
                  </div>
                  {value === model.id && (
                    <CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" />
                  )}
                </button>
              ))}

              {/* Custom model entry */}
              <div className="border-t border-slate-100 mt-1 pt-1">
                {!customMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMode(true);
                      setCustomValue(value || "");
                    }}
                    className="w-full text-left px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    + Enter custom model ID
                  </button>
                ) : (
                  <div className="px-3 py-2 flex gap-2">
                    <input
                      type="text"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      placeholder="e.g. gpt-4o-2024-08-06"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onChange(customValue);
                          setOpen(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onChange(customValue);
                        setOpen(false);
                      }}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
                    >
                      Set
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultBaseUrl(providerId: ProviderID): string {
  const defaults: Record<string, string> = {
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
  return defaults[providerId] || "";
}
