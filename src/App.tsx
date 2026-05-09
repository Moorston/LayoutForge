import React, { useState, useEffect, useRef } from "react";
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
import { ProcessingState } from "./components/ProcessingState";
import { ResultView } from "./components/ResultView";
import { BrandKitPanel } from "./components/BrandKitPanel";
import { BatchUpload } from "./components/BatchUpload";
import { ModelSelectorPanel } from "./components/ModelSelectorPanel";
import {
  replicateLayout,
  replicateFromText,
  replicateFromSkeleton,
  classifyImageScene,
  ReplicationResult,
  ImageSceneClassification,
} from "./services/mimoService";
import { analyzePixelLayout } from "@/lib/pixelPaint";
import {
  loadBrandKit,
  saveBrandKit,
  buildBrandKitPromptContext,
} from "@/lib/brandKit";
import { BrandKit } from "@/lib/types";
import { cn } from "./lib/utils";

type AppState = "idle" | "processing" | "result" | "error" | "library";

interface SavedProject {
  id: string;
  name: string;
  timestamp: number;
  html: string;
  css: string;
  originalImage: string;
  explanation: string;
}

const STORAGE_KEY = "layout_forge_saved_projects";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [result, setResult] = useState<ReplicationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [sceneClassification, setSceneClassification] =
    useState<ImageSceneClassification | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit>(() => loadBrandKit());
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== "undefined") {
      try {
        setSavedProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load library", e);
      }
    }
  }, []);

  useEffect(() => {
    saveBrandKit(brandKit);
  }, [brandKit]);

  // Derived brand kit context (only built when company name has been customised)
  const brandKitContext =
    brandKit.companyName !== "My Company"
      ? buildBrandKitPromptContext(brandKit)
      : undefined;

  const handleLoadProject = (project: SavedProject) => {
    setOriginalImage(project.originalImage);
    setResult({
      html: project.html,
      css: project.css,
      explanation: project.explanation,
      detectedImages: [],
    });
    setState("result");
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newProjects = savedProjects.filter((p) => p.id !== id);
    setSavedProjects(newProjects);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setState("idle");
  };

  const handleUpload = async (file: File) => {
    setState("processing");
    setError(null);
    setSceneClassification(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const dataUrl = reader.result as string;
      setOriginalImage(dataUrl);

      try {
        // Run pixel layout analysis in parallel with scene classification
        // The analysis injects quantitative proportions into the AI prompt
        const [replicationResult, scene] = await Promise.all([
          analyzePixelLayout(dataUrl)
            .then((analysis) =>
              replicateLayout(
                base64,
                file.type,
                brandKitContext,
                analysis.description,
              ),
            )
            .catch(() =>
              // Fallback: run without pixel analysis if canvas fails
              replicateLayout(base64, file.type, brandKitContext),
            ),
          classifyImageScene(base64, file.type).catch((e) => {
            console.warn("Image scene classification skipped:", e);
            return null;
          }),
        ]);

        if (controller.signal.aborted) return;
        setResult(replicationResult);
        setSceneClassification(scene);
        setState("result");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
        setState("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlReplicate = async () => {
    if (!urlInput) return;
    setState("processing");
    setError(null);
    setOriginalImage(
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop",
    );

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        `/api/fetch-url?url=${encodeURIComponent(urlInput)}`,
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Use skeleton-based replication: creates a fresh template
      // inspired by the site's layout structure, not an exact copy.
      // Falls back to text-based if skeleton is unavailable.
      const replicationResult = data.skeleton
        ? await replicateFromSkeleton(data.skeleton, brandKitContext)
        : await replicateFromText(data.content, brandKitContext);

      if (controller.signal.aborted) return;
      setResult(replicationResult);
      setState("result");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to replicate from URL",
      );
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setOriginalImage(null);
    setResult(null);
    setError(null);
    setSceneClassification(null);
  };

  const handleSaveProject = (name: string, html: string, css: string) => {
    if (!result || !originalImage) return;

    const newProject: SavedProject = {
      id: crypto.randomUUID(),
      name,
      timestamp: Date.now(),
      html,
      css,
      originalImage,
      explanation: result.explanation,
    };

    const newProjects = [newProject, ...savedProjects];
    setSavedProjects(newProjects);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans selection:bg-slate-200">
      <div className="flex flex-col min-h-screen">
        {/* Hero header — only in idle + non-batch mode */}
        {state === "idle" && !showBatch && (
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
              Design with Precision.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed"
            >
              Every pixel accounted for. Replicate CSS variables, font-families,
              and image assets instantly from any visual source or URL.
            </motion.p>

            {/* Brand Kit + Batch Mode pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-3 justify-center mt-6"
            >
              <button
                onClick={() => setShowBrandKit(true)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2"
              >
                <Palette className="w-3.5 h-3.5" />
                Brand Kit
              </button>
              <button
                onClick={() => setShowBatch(true)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2"
              >
                <Layers className="w-3.5 h-3.5" />
                Batch Mode
              </button>
              <button
                onClick={() => setShowModelSelector(true)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-slate-400 transition-all flex items-center gap-2"
              >
                <Cpu className="w-3.5 h-3.5" />
                AI Model
              </button>
            </motion.div>

            {/* URL input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-xl mx-auto mt-10 px-6"
            >
              <div className="flex gap-2 p-2 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-slate-900/5 transition-all">
                <div className="flex-1 flex items-center px-4 gap-3 border-r border-slate-100">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Paste website URL (e.g. apple.com)..."
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
                  Imitate
                </button>
              </div>
            </motion.div>
          </header>
        )}

        <main className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {/* ── Batch processing mode ── */}
            {state === "idle" && showBatch ? (
              <motion.div
                key="batch"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-4xl mx-auto px-6 py-12">
                  <div className="flex items-center gap-4 mb-8">
                    <button
                      onClick={() => setShowBatch(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest"
                    >
                      ← Back
                    </button>
                    <h2 className="text-lg font-extrabold text-slate-900 tracking-tighter">
                      Batch Processing
                    </h2>
                  </div>
                  <BatchUpload
                    onBatchComplete={(_items) => {
                      setShowBatch(false);
                    }}
                    brandKitContext={brandKitContext}
                  />
                </div>
              </motion.div>
            ) : state === "idle" ? (
              /* ── Normal idle view ── */
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <UploadZone onUpload={handleUpload} />

                {savedProjects.length > 0 && (
                  <div className="max-w-4xl mx-auto mt-16 px-6">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                          <History className="w-4 h-4 text-slate-900" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                          Recent Projects
                        </h2>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200/50 px-2.5 py-1 rounded-full">
                        {savedProjects.length} Saved
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {savedProjects.map((project) => (
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
                        Layout Aware
                      </h4>
                      <p className="text-sm text-slate-500 leading-normal">
                        Understands complex grids, flexbox, and absolute
                        positioning.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        <Github className="w-5 h-5 text-slate-900" />
                      </div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Clean Code
                      </h4>
                      <p className="text-sm text-slate-500 leading-normal">
                        Generates semantic HTML with standard Tailwind utility
                        classes.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-slate-900" />
                      </div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Asset Extraction
                      </h4>
                      <p className="text-sm text-slate-500 leading-normal">
                        Automatically crops images and detects icons in your
                        screenshots.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* ── Processing ── */}
            {state === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1"
              >
                <ProcessingState onCancel={handleCancel} />
              </motion.div>
            )}

            {/* ── Result ── */}
            {state === "result" && result && originalImage && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 h-full"
              >
                <ResultView
                  originalImage={originalImage}
                  result={result}
                  sceneClassification={sceneClassification}
                  onReset={handleReset}
                  onSave={handleSaveProject}
                  brandKit={brandKit}
                />
              </motion.div>
            )}

            {/* ── Error ── */}
            {state === "error" && (
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
                  Replication Failed
                </h2>
                <p className="text-slate-500 max-w-sm mb-10 font-medium leading-relaxed">
                  {error}
                </p>
                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 text-sm"
                >
                  Try Another Image
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer
          className={cn(
            "py-12 px-6 text-center border-t border-slate-200 mt-auto bg-white",
            state === "result" && "hidden md:block",
          )}
        >
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            &copy; 2026 LayoutForge • FreeBytes
          </p>
        </footer>
      </div>

      {/* ── Brand Kit panel ── */}
      <BrandKitPanel
        isOpen={showBrandKit}
        brandKit={brandKit}
        onChange={(kit) => {
          setBrandKit(kit);
          saveBrandKit(kit);
        }}
        onClose={() => setShowBrandKit(false)}
      />

      {/* ── Model Selector panel ── */}
      <ModelSelectorPanel
        isOpen={showModelSelector}
        onClose={() => setShowModelSelector(false)}
      />
    </div>
  );
}
