import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, CheckCircle2, Circle, ExternalLink, Loader2, RefreshCw, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROVIDER_LIST,
  PROVIDERS,
  TIER_STYLES,
  type ProviderID,
  type AIModel,
} from '@/lib/providers';

interface AIConfig {
  activeProvider: ProviderID;
  configuredProviders: string[];
  textModel: string | null;
  visionModel: string | null;
}

interface ModelSelectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModelSelectorPanel({ isOpen, onClose }: ModelSelectorPanelProps) {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderID | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/config');
      if (res.ok) {
        const data = await res.json() as AIConfig;
        setConfig(data);
        setSelectedProvider(data.activeProvider as ProviderID);
      }
    } catch {
      // server not running yet or config unavailable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchConfig();
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const activeProvider = selectedProvider
    ? PROVIDERS[selectedProvider]
    : null;

  const isConfigured = (id: string) =>
    config?.configuredProviders.includes(id) ?? false;

  const getModels = (pid: ProviderID): AIModel[] =>
    PROVIDERS[pid]?.models ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            className="fixed right-0 top-0 h-screen w-[520px] max-w-full bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <Cpu className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">AI Model Settings</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Configure provider and model</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchConfig}
                  disabled={loading}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                  title="Refresh config"
                >
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
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
                <div className="p-6 space-y-8">

                  {/* Active provider banner */}
                  {config && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                      <div className="text-2xl">{PROVIDERS[config.activeProvider as ProviderID]?.icon ?? '🤖'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Currently Active</p>
                        <p className="text-sm font-bold text-slate-900">
                          {PROVIDERS[config.activeProvider as ProviderID]?.name ?? config.activeProvider}
                        </p>
                        {(config.textModel || config.visionModel) && (
                          <p className="text-[11px] text-slate-500 truncate">
                            {config.textModel && `Text: ${config.textModel}`}
                            {config.textModel && config.visionModel && '  ·  '}
                            {config.visionModel && `Vision: ${config.visionModel}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wide">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </div>
                    </div>
                  )}

                  {/* Provider grid */}
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Available Providers
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {PROVIDER_LIST.map((provider) => {
                        const configured = isConfigured(provider.id);
                        const isActive = config?.activeProvider === provider.id;
                        const isSelected = selectedProvider === provider.id;

                        return (
                          <motion.button
                            key={provider.id}
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                            onClick={() => setSelectedProvider(provider.id)}
                            className={cn(
                              'w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4',
                              isSelected
                                ? 'border-slate-900 bg-slate-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300',
                              !configured && 'opacity-60',
                            )}
                          >
                            <span className="text-xl shrink-0">{provider.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-900">{provider.name}</span>
                                {isActive && (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wide rounded-full">
                                    Active
                                  </span>
                                )}
                                {!configured && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wide rounded-full">
                                    No key
                                  </span>
                                )}
                                {configured && !isActive && (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wide rounded-full">
                                    Ready
                                  </span>
                                )}
                              </div>
                              {provider.note && (
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{provider.note}</p>
                              )}
                            </div>
                            <div className="shrink-0">
                              {isSelected
                                ? <CheckCircle2 className="w-4 h-4 text-slate-900" />
                                : <Circle className="w-4 h-4 text-slate-200" />}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected provider models */}
                  {selectedProvider && activeProvider && (
                    <div>
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        {activeProvider.name} — Available Models
                      </h3>
                      <div className="space-y-2">
                        {getModels(selectedProvider).map((model: AIModel) => (
                          <div
                            key={model.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">{model.name}</span>
                                <span className={cn('px-1.5 py-0.5 text-[9px] font-bold border rounded-full uppercase tracking-wide', TIER_STYLES[model.tier])}>
                                  {model.tier}
                                </span>
                                {model.supportsVision && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200 rounded-full uppercase tracking-wide">
                                    Vision
                                  </span>
                                )}
                                {model.isDefault && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full uppercase tracking-wide">
                                    Default Text
                                  </span>
                                )}
                                {model.isDefaultVision && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full uppercase tracking-wide">
                                    Default Vision
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{model.id}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] text-slate-400">{(model.contextWindow / 1000).toFixed(0)}K ctx</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* How to configure */}
                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                    <h3 className="text-[11px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5" />
                      How to Switch Provider
                    </h3>
                    <div className="text-xs text-amber-800 space-y-2 leading-relaxed">
                      <p>Edit <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">.env.local</code> in the project root:</p>
                      <pre className="bg-amber-100 p-3 rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre">{`# Set your active provider
AI_PROVIDER=openai        # or: anthropic | google | deepseek
                          #     qwen | zhipu | groq | mimo | custom

# Add the API key for that provider
OPENAI_API_KEY=sk-...

# Optional: override default models
AI_MODEL_TEXT=gpt-4o
AI_MODEL_VISION=gpt-4o`}</pre>
                      <p className="text-amber-700">Then restart the dev server: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">npm run dev</code></p>
                    </div>
                  </div>

                  {/* Links */}
                  {selectedProvider && activeProvider?.docsUrl && (
                    <a
                      href={activeProvider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {activeProvider.name} API Docs
                    </a>
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
