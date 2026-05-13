import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wand2, AlertCircle, History, Trash2, ArrowRight, Globe, Palette, Layers, Cpu, Settings } from "lucide-react";
import { UploadZone } from "./components/UploadZone";
import { ProcessingState } from "./components/ProcessingState";
import { BrandKitPanel } from "./components/BrandKitPanel";
import { useProjects, type SavedProject } from "./hooks/useProjects";
import { usePanels } from "./hooks/usePanels";
import { useReplication } from "./hooks/useReplication";
import { useAppStore } from "./stores/appStore";
import { setAIConfigOverride } from "./services/mimoService";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { cn } from "./lib/utils";
import { SettingsPanel } from "./components/SettingsPanel";

const ResultView = lazy(() => import("./components/ResultView").then((m) => ({ default: m.ResultView })));
const BatchUpload = lazy(() => import("./components/BatchUpload").then((m) => ({ default: m.BatchUpload })));
const ModelSelectorPanel = lazy(() => import("./components/ModelSelectorPanel").then((m) => ({ default: m.ModelSelectorPanel })));

function App() {
  const { t } = useTranslation();
  const { state, dispatch, initAIConfig, handleUpload, handleUrlReplicate, handleCancel, handleReset } = useReplication();
  const projects = useProjects();
  const panels = usePanels();
  const store = useAppStore();
  const [urlInput, setUrlInput] = useState("");

  useEffect(() => { initAIConfig(); }, [initAIConfig]);

  const handleLoadProject = (project: SavedProject) => {
    dispatch({ type: "SET_ORIGINAL_IMAGE", image: project.originalImage });
    dispatch({ type: "SET_RESULT", result: { html: project.html, css: project.css, explanation: project.explanation, detectedImages: [] } });
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    projects.deleteProject(id);
  };

  const handleSaveProject = (name: string, html: string, css: string) => {
    if (!state.result || !state.originalImage) return;
    projects.saveProject(name, html, css, state.originalImage, state.result);
  };

  const onUrlReplicate = () => {
    store.addToUrlHistory(urlInput);
    handleUrlReplicate(urlInput);
  };

  const { phase } = state;

  return (
    <div className={`min-h-screen font-sans selection:bg-slate-200 ${store.theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-[#F3F4F6] text-slate-900"}`}>
      <div className="flex flex-col min-h-screen">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg" tabIndex={1}>
          Skip to content
        </a>

        {phase === "idle" && !panels.showBatch && (
          <header className="pt-24 pb-16 px-6 text-center" role="banner">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-8">
              <Wand2 className="w-3.5 h-3.5 text-slate-900" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">LayoutForge <span className="text-slate-300 font-normal">v2.0</span></span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl sm:text-7xl font-extrabold tracking-tighter mb-6">{t("app.tagline")}</motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg max-w-lg mx-auto leading-relaxed">{t("app.description")}</motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex items-center gap-3 justify-center mt-6" role="navigation" aria-label="Quick actions">
              <button onClick={() => panels.setShowBrandKit(true)} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2">
                <Palette className="w-3.5 h-3.5" /> {t("nav.brandKit")}
              </button>
              <button onClick={() => panels.setShowBatch(true)} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> {t("nav.batchMode")}
              </button>
              <button onClick={() => panels.setShowModelSelector(true)} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" /> {t("nav.aiModel")}
              </button>
              <button onClick={() => store.setShowSettings(true)} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2" aria-label="Open preferences">
                <Settings className="w-3.5 h-3.5" /> Preferences
              </button>
              <LanguageSwitcher />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-2xl mx-auto mt-10 px-6">
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">{t("url.output")}</span>
                {([{ key: "html" as const, label: t("stack.html"), icon: "\ud83c\udf10" },
                   { key: "react-tailwind" as const, label: t("stack.reactTailwind"), icon: "\u269b\ufe0f" },
                   { key: "vue" as const, label: t("stack.vue"), icon: "\ud83d\udc9a" },
                   { key: "html-css" as const, label: t("stack.htmlCss"), icon: "\ud83d\udcbb" },
                   { key: "bootstrap" as const, label: t("stack.bootstrap"), icon: "\ud83d\udfe2" },
                   { key: "ionic-tailwind" as const, label: t("stack.ionicTailwind"), icon: "\ud83d\udcf1" },
                   { key: "svg" as const, label: t("stack.svg"), icon: "\ud83c\udfa8" }]).map((s) => (
                  <button key={s.key} onClick={() => store.setSelectedStack(s.key)}
                    className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all", store.selectedStack === s.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400")}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 p-2 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-slate-900/5 transition-all">
                <div className="flex-1 flex items-center px-4 gap-3 border-r border-slate-100">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <input type="text" placeholder={t("url.placeholder")} value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onUrlReplicate()} className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-300" list="url-history" aria-label="Website URL" />
                  <datalist id="url-history">
                    {store.urlHistory.map((u, i) => <option key={i} value={u} />)}
                  </datalist>
                </div>
                <button onClick={onUrlReplicate} disabled={!urlInput} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Clone website">
                  <Wand2 className="w-4 h-4" /> {t("url.clone")}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={store.enableRefinement} onChange={(e) => store.setEnableRefinement(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                  <span className="text-[11px] font-bold text-slate-400">{t("url.refinementPass")}</span>
                </label>
                <span className="text-[10px] text-slate-300">{t("url.refinementHint")}</span>
                <span className="text-slate-300">|</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode:</span>
                <button onClick={() => store.setGenerationMode(store.generationMode === "replicate" ? "template" : "replicate")}
                  className={cn("px-3 py-1 rounded-lg text-[11px] font-bold border transition-all", store.generationMode === "template" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400")}
                  title={store.generationMode === "template" ? "Template mode" : "Replicate mode"}
                >
                  {store.generationMode === "template" ? "\ud83c\udfa8 Style Template" : "\ud83d\udcd0 Pixel Replicate"}
                </button>
              </div>
            </motion.div>
          </header>
        )}

        <main id="main-content" className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {phase === "idle" && panels.showBatch ? (
              <motion.div key="batch" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="max-w-4xl mx-auto px-6 py-12">
                  <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => panels.setShowBatch(false)} className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest">{t("batch.back")}</button>
                    <h2 className="text-lg font-extrabold text-slate-900 tracking-tighter">{t("batch.title")}</h2>
                  </div>
                  <BatchUpload onBatchComplete={() => panels.setShowBatch(false)} brandKitContext={store.brandKitContext} />
                </div>
              </motion.div>
            ) : phase === "idle" ? (
              <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <UploadZone onUpload={handleUpload} />
                {projects.savedProjects.length > 0 && (
                  <div className="max-w-4xl mx-auto mt-16 px-6">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200"><History className="w-4 h-4 text-slate-900" /></div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{t("projects.recentProjects")}</h2>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200/50 px-2.5 py-1 rounded-full">{projects.savedProjects.length} {t("projects.saved")}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Saved projects">
                      {projects.savedProjects.map((project) => (
                        <motion.button key={project.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleLoadProject(project)} role="listitem"
                          className="group relative bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-left flex flex-col gap-4 hover:border-slate-400 transition-all"
                        >
                          <div className="aspect-video rounded-xl overflow-hidden bg-slate-50 relative border border-slate-100">
                            <img src={project.originalImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={project.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            <div className="absolute top-2 right-2 flex gap-2">
                              <button onClick={(e) => handleDeleteProject(project.id, e)} className="p-2 bg-white/90 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50" aria-label={`Delete ${project.name}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-slate-900 truncate">{project.name}</h3>
                              <p className="text-[10px] text-slate-400 font-medium">{new Date(project.timestamp).toLocaleDateString()}</p>
                            </div>
                            <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-900 transition-colors shrink-0" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}

            {phase === "processing" && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                <ProcessingState currentStep={state.processingStep} steps={state.pipelineSteps} sourceUrl={state.pipelineSourceUrl} enableRefinement={store.enableRefinement} onCancel={handleCancel} />
              </motion.div>
            )}

            {phase === "result" && state.result && state.originalImage && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 h-full">
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" /></div>}>
                  <ResultView originalImage={state.originalImage} result={state.result} sceneClassification={state.sceneClassification} onReset={handleReset} onSave={handleSaveProject} brandKit={store.brandKit} />
                </Suspense>
              </motion.div>
            )}

            {phase === "error" && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-8 shadow-sm"><AlertCircle className="w-8 h-8 text-red-500" /></div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tighter">{t("processing.replicationFailed")}</h2>
                <p className="text-slate-500 max-w-sm mb-10 font-medium leading-relaxed">{state.error}</p>
                <button onClick={handleReset} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 text-sm">{t("processing.tryAnotherImage")}</button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <BrandKitPanel isOpen={panels.showBrandKit} brandKit={store.brandKit} onChange={(kit) => store.setBrandKit(kit)} onClose={() => panels.setShowBrandKit(false)} />
      <ModelSelectorPanel isOpen={panels.showModelSelector} onClose={() => panels.setShowModelSelector(false)} onConfigChange={async () => {
        try { const res = await fetch("/api/ai/config"); if (res.ok) { const data = await res.json(); setAIConfigOverride({ provider: data.activeProvider, modelText: data.textModel || "", modelVision: data.visionModel || "" }); } } catch {}
      }} />
      <SettingsPanel />
    </div>
  );
}

export default App;
