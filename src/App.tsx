import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Layout,
  Wand2,
  Github,
  AlertCircle,
  History,
  Trash2,
  ArrowRight,
  Globe,
  Palette,
  Layers,
  Cpu,
} from "lucide-react";
import { UploadZone } from "./components/UploadZone";
import {
  ProcessingState,
  type PipelineStep,
} from "./components/ProcessingState";
import { BrandKitPanel } from "./components/BrandKitPanel";
import { useAppState } from "./hooks/useAppState";
import { useProjects, type SavedProject } from "./hooks/useProjects";
import { usePreferences } from "./hooks/usePreferences";
import { usePanels } from "./hooks/usePanels";
import {
  replicateLayoutWithStack,
  replicateFromSkeleton,
  refineLayout,
  classifyImageScene,
  setAIConfigOverride,
} from "./services/mimoService";
import { analyzePixelLayout } from "@/lib/pixelPaint";
import { prepareImageForVision } from "@/lib/imageUtils";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { cn } from "./lib/utils";

// Lazy-load heavy components to reduce initial bundle size
const ResultView = lazy(() =>
  import("./components/ResultView").then((m) => ({ default: m.ResultView })),
);
const BatchUpload = lazy(() =>
  import("./components/BatchUpload").then((m) => ({ default: m.BatchUpload })),
);
const ModelSelectorPanel = lazy(() =>
  import("./components/ModelSelectorPanel").then((m) => ({
    default: m.ModelSelectorPanel,
  })),
);

// ── Initialize AI config from server ──────────────────────────────────────────
async function initAIConfig() {
  try {
    const res = await fetch("/api/ai/config");
    if (res.ok) {
      const data = (await res.json()) as {
        activeProvider: string;
        textModel: string | null;
        visionModel: string | null;
      };
      if (data.activeProvider) {
        setAIConfigOverride({
          provider: data.activeProvider,
          modelText: data.textModel || "",
          modelVision: data.visionModel || "",
        });
      }
    }
  } catch {
    // server not ready yet — will use env defaults
  }
}

function App() {
  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { t } = useTranslation();
  const { state, dispatch, abortControllerRef } = useAppState();
  const projects = useProjects();
  const prefs = usePreferences();
  const panels = usePanels();
  const [urlInput, setUrlInput] = useState("");

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    initAIConfig();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLoadProject = (project: SavedProject) => {
    dispatch({ type: "SET_ORIGINAL_IMAGE", image: project.originalImage });
    dispatch({
      type: "SET_RESULT",
      result: {
        html: project.html,
        css: project.css,
        explanation: project.explanation,
        detectedImages: [],
      },
    });
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    projects.deleteProject(id);
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    dispatch({ type: "RESET" });
  };

  const handleUpload = async (file: File) => {
    dispatch({ type: "START_IMAGE_PROCESSING" });
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      dispatch({ type: "SET_ORIGINAL_IMAGE", image: dataUrl });

      try {
        // Step 1: Optimize image for Vision LLM
        dispatch({ type: "SET_PROCESSING_STEP", step: "preparing-image" });
        const prepared = await prepareImageForVision(dataUrl).catch(() => ({
          base64: dataUrl.split(",")[1],
          mimeType: file.type,
          width: 0,
          height: 0,
        }));

        if (controller.signal.aborted) return;

        // Step 2: Run pixel layout analysis and scene classification in parallel
        dispatch({ type: "SET_PROCESSING_STEP", step: "analyzing-layout" });
        const [pixelAnalysis, scene] = await Promise.allSettled([
          analyzePixelLayout(dataUrl),
          classifyImageScene(prepared.base64, prepared.mimeType),
        ]);

        const pixelLayoutContext =
          pixelAnalysis.status === "fulfilled"
            ? pixelAnalysis.value.description
            : undefined;

        // Step 3: Multi-pass vision pipeline (analysis → generation)
        const replicationResult = await replicateLayoutWithStack(
          prepared.base64,
          prepared.mimeType,
          prefs.selectedStack,
          prefs.brandKitContext,
          pixelLayoutContext,
          undefined,
          {
            enableRefinement: prefs.enableRefinement,
            generationMode: prefs.generationMode,
            signal: controller.signal,
            onProgress: (step) => {
              dispatch({
                type: "SET_PROCESSING_STEP",
                step: step as PipelineStep,
              });
            },
          },
        );

        if (controller.signal.aborted) return;

        if (!replicationResult.html || !replicationResult.html.trim()) {
          throw new Error(
            "AI returned empty HTML. Try again or switch to a different model.",
          );
        }

        dispatch({
          type: "SET_RESULT",
          result: replicationResult,
          scene: scene.status === "fulfilled" ? scene.value : null,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        dispatch({
          type: "SET_ERROR",
          error:
            err instanceof Error ? err.message : "An unexpected error occurred",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlReplicate = async () => {
    if (!urlInput) return;
    dispatch({ type: "START_URL_PROCESSING", url: urlInput });
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const pipelineRes = await fetch("/api/pipeline/url-to-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput,
          stack: prefs.selectedStack,
          brandKit: prefs.brandKitContext,
          refine: prefs.enableRefinement,
        }),
      });
      const pipelineData = await pipelineRes.json();
      if (pipelineData.error) throw new Error(pipelineData.error);

      if (pipelineData.screenshot?.base64) {
        dispatch({
          type: "SET_ORIGINAL_IMAGE",
          image: `data:${pipelineData.screenshot.mimeType};base64,${pipelineData.screenshot.base64}`,
        });
      }

      if (controller.signal.aborted) return;

      let result;
      if (pipelineData.screenshot?.base64) {
        const { base64, mimeType } = pipelineData.screenshot;
        const skeletonContext = pipelineData.skeleton
          ? `\n=== SITE STRUCTURE ANALYSIS ===\nThe following structural skeleton was extracted:\n${pipelineData.skeleton}\n=== END STRUCTURE ===\nUse this to supplement your visual analysis.`
          : "";

        result = await replicateLayoutWithStack(
          base64,
          mimeType,
          prefs.selectedStack,
          prefs.brandKitContext,
          undefined,
          skeletonContext,
          {
            enableRefinement: prefs.enableRefinement,
            generationMode: prefs.generationMode,
            signal: controller.signal,
            onProgress: (step) => {
              dispatch({
                type: "SET_PROCESSING_STEP",
                step: step as PipelineStep,
              });
            },
          },
        );
      } else if (pipelineData.skeleton) {
        dispatch({ type: "SET_PROCESSING_STEP", step: "generating-code" });
        result = await replicateFromSkeleton(
          pipelineData.skeleton,
          prefs.brandKitContext,
          prefs.selectedStack,
        );
      } else {
        throw new Error(
          "Could not capture screenshot or extract page structure from the URL.",
        );
      }

      if (controller.signal.aborted) return;

      // Validate that we got actual HTML content
      if (!result.html || !result.html.trim()) {
        throw new Error(
          "AI returned empty HTML. The URL may be too complex or the model may be overloaded. Try again or switch to a different model.",
        );
      }

      dispatch({ type: "SET_RESULT", result });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error(err);
      dispatch({
        type: "SET_ERROR",
        error:
          err instanceof Error ? err.message : "Failed to replicate from URL",
      });
    }
  };

  const handleReset = () => dispatch({ type: "RESET" });

  const handleSaveProject = (name: string, html: string, css: string) => {
    if (!state.result || !state.originalImage) return;
    projects.saveProject(name, html, css, state.originalImage, state.result);
  };

  const { phase } = state;

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans selection:bg-slate-200">
      <div className="flex flex-col min-h-screen">
        {/* Hero header — only in idle + non-batch mode */}
        {phase === "idle" && !panels.showBatch && (
          <header className="pt-24 pb-16 px-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-8"
            >
              <Wand2 className="w-3.5 h-3.5 text-slate-900" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                LayoutForge{" "}
                <span className="text-slate-300 font-normal">v2.0</span>
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-7xl font-extrabold tracking-tighter text-slate-900 mb-6"
            >
              {t("app.tagline")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed"
            >
              {t("app.description")}
            </motion.p>

            {/* Brand Kit + Batch Mode pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-3 justify-center mt-6"
            >
              <button
                onClick={() => panels.setShowBrandKit(true)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2"
              >
                <Palette className="w-3.5 h-3.5" />
                {t("nav.brandKit")}
              </button>
              <button
                onClick={() => panels.setShowBatch(true)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2"
              >
                <Layers className="w-3.5 h-3.5" />
                {t("nav.batchMode")}
              </button>
              <button
                onClick={() => panels.setShowModelSelector(true)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2"
              >
                <Cpu className="w-3.5 h-3.5" />
                {t("nav.aiModel")}
              </button>
              <LanguageSwitcher />
            </motion.div>

            {/* URL input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-2xl mx-auto mt-10 px-6"
            >
              {/* Tech stack selector */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">
                  {t("url.output")}
                </span>
                {(
                  [
                    {
                      key: "react-tailwind",
                      label: "React + Tailwind",
                      icon: "⚛️",
                    },
                    { key: "html", label: "HTML + Tailwind", icon: "🌐" },
                    { key: "vue", label: "Vue 3", icon: "💚" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => prefs.setSelectedStack(s.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all",
                      prefs.selectedStack === s.key
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-400",
                    )}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>

              {/* URL input bar */}
              <div className="flex gap-2 p-2 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-slate-900/5 transition-all">
                <div className="flex-1 flex items-center px-4 gap-3 border-r border-slate-100">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t("url.placeholder")}
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlReplicate()}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-300"
                  />
                </div>
                <button
                  onClick={handleUrlReplicate}
                  disabled={!urlInput}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wand2 className="w-4 h-4" />
                  {t("url.clone")}
                </button>
              </div>

              {/* Refinement toggle + Generation mode */}
              <div className="flex items-center justify-center gap-4 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.enableRefinement}
                    onChange={(e) =>
                      prefs.setEnableRefinement(e.target.checked)
                    }
                    className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-[11px] font-bold text-slate-400">
                    {t("url.refinementPass")}
                  </span>
                </label>
                <span className="text-[10px] text-slate-300">
                  {t("url.refinementHint")}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mode:
                </span>
                <button
                  onClick={() =>
                    prefs.setGenerationMode(
                      prefs.generationMode === "replicate"
                        ? "template"
                        : "replicate",
                    )
                  }
                  className={cn(
                    "px-3 py-1 rounded-lg text-[11px] font-bold border transition-all",
                    prefs.generationMode === "template"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400",
                  )}
                  title={
                    prefs.generationMode === "template"
                      ? "Template mode: extracts design language as editable CSS custom properties"
                      : "Replicate mode: pixel-perfect reproduction of the image"
                  }
                >
                  {prefs.generationMode === "template"
                    ? "🎨 Style Template"
                    : "📐 Pixel Replicate"}
                </button>
              </div>
            </motion.div>
          </header>
        )}

        <main className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {/* ── Batch processing mode ── */}
            {phase === "idle" && panels.showBatch ? (
              <motion.div
                key="batch"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-4xl mx-auto px-6 py-12">
                  <div className="flex items-center gap-4 mb-8">
                    <button
                      onClick={() => panels.setShowBatch(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest"
                    >
                      {t("batch.back")}
                    </button>
                    <h2 className="text-lg font-extrabold text-slate-900 tracking-tighter">
                      {t("batch.title")}
                    </h2>
                  </div>
                  <BatchUpload
                    onBatchComplete={() => panels.setShowBatch(false)}
                    brandKitContext={prefs.brandKitContext}
                  />
                </div>
              </motion.div>
            ) : phase === "idle" ? (
              /* ── Normal idle view ── */
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <UploadZone onUpload={handleUpload} />

                {projects.savedProjects.length > 0 && (
                  <div className="max-w-4xl mx-auto mt-16 px-6">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                          <History className="w-4 h-4 text-slate-900" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                          {t("projects.recentProjects")}
                        </h2>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200/50 px-2.5 py-1 rounded-full">
                        {projects.savedProjects.length} {t("projects.saved")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projects.savedProjects.map((project) => (
                        <motion.button
                          key={project.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleLoadProject(project)}
                          className="group relative bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-left flex flex-col gap-4 hover:border-slate-400 transition-all"
                        >
                          <div className="aspect-video rounded-xl overflow-hidden bg-slate-50 relative border border-slate-100">
                            <img
                              src={project.originalImage}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                              alt={project.name}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            <div className="absolute top-2 right-2 flex gap-2">
                              <button
                                onClick={(e) =>
                                  handleDeleteProject(project.id, e)
                                }
                                className="p-2 bg-white/90 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-slate-900 truncate">
                                {project.name}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {new Date(
                                  project.timestamp,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-900 transition-colors shrink-0" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="max-w-4xl mx-auto mt-24 px-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        <Layout className="w-5 h-5 text-slate-900" />
                      </div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("features.layoutAware")}
                      </h4>
                      <p className="text-sm text-slate-500 leading-normal">
                        {t("features.layoutAwareDesc")}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        <Github className="w-5 h-5 text-slate-900" />
                      </div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("features.cleanCode")}
                      </h4>
                      <p className="text-sm text-slate-500 leading-normal">
                        {t("features.cleanCodeDesc")}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-slate-900" />
                      </div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("features.assetExtraction")}
                      </h4>
                      <p className="text-sm text-slate-500 leading-normal">
                        {t("features.assetExtractionDesc")}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* ── Processing ── */}
            {phase === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1"
              >
                <ProcessingState
                  currentStep={state.processingStep}
                  steps={state.pipelineSteps}
                  sourceUrl={state.pipelineSourceUrl}
                  enableRefinement={prefs.enableRefinement}
                  onCancel={handleCancel}
                />
              </motion.div>
            )}

            {/* ── Result ── */}
            {phase === "result" && state.result && state.originalImage && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 h-full"
              >
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                    </div>
                  }
                >
                  <ResultView
                    originalImage={state.originalImage}
                    result={state.result}
                    sceneClassification={state.sceneClassification}
                    onReset={handleReset}
                    onSave={handleSaveProject}
                    brandKit={prefs.brandKit}
                  />
                </Suspense>
              </motion.div>
            )}

            {/* ── Error ── */}
            {phase === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center px-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-8 shadow-sm">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tighter">
                  {t("processing.replicationFailed")}
                </h2>
                <p className="text-slate-500 max-w-sm mb-10 font-medium leading-relaxed">
                  {state.error}
                </p>
                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 text-sm"
                >
                  {t("processing.tryAnotherImage")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer
          className={cn(
            "py-12 px-6 text-center border-t border-slate-200 mt-auto bg-white",
            phase === "result" && "hidden md:block",
          )}
        >
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {t("app.copyright")}
          </p>
        </footer>
      </div>

      {/* ── Brand Kit panel ── */}
      <BrandKitPanel
        isOpen={panels.showBrandKit}
        brandKit={prefs.brandKit}
        onChange={(kit) => prefs.setBrandKit(kit)}
        onClose={() => panels.setShowBrandKit(false)}
      />

      {/* ── Model Selector panel ── */}
      <ModelSelectorPanel
        isOpen={panels.showModelSelector}
        onClose={() => panels.setShowModelSelector(false)}
        onConfigChange={async () => {
          try {
            const res = await fetch("/api/ai/config");
            if (res.ok) {
              const data = (await res.json()) as {
                activeProvider: string;
                textModel: string | null;
                visionModel: string | null;
              };
              setAIConfigOverride({
                provider: data.activeProvider,
                modelText: data.textModel || "",
                modelVision: data.visionModel || "",
              });
            }
          } catch {
            // ignore
          }
        }}
      />
    </div>
  );
}

export default App;
