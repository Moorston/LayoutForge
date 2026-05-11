/**
 * Result view — displays the replicated layout with editing tools.
 *
 * After refactoring, this component acts as an orchestrator:
 * - Manages shared content state (processedHtml, processedCss, assets)
 * - Delegates tab content to specialized sub-components
 * - Handles the save dialog, header actions, and overlays
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  Check,
  Eye,
  Code,
  Download,
  Save,
  MessageSquare,
  Variable,
  ShieldCheck,
  PackageOpen,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ReplicationResult,
  ImageSceneClassification,
} from "@/services/mimoService";
import { detectTemplateVariablesWithAI } from "@/services/mimoService";
import { sanitizeForIframe } from "@/lib/sanitize";
import { TemplateVariable, BrandKit } from "@/lib/types";
import { useImageEditor } from "@/hooks/useImageEditor";
import {
  highQualityDraw,
  compressImage,
  generateSVGChart,
  downloadChartCSV,
  normalizeHtmlForPreview,
} from "@/lib/imageUtils";
import {
  IMAGE_COMPRESS_MAX_WIDTH,
  IMAGE_COMPRESS_QUALITY,
  IMAGE_CROP_QUALITY,
} from "@/lib/constants";
import { PreviewTab } from "./PreviewTab";
import { CodeTab } from "./CodeTab";
import { ChatPanel } from "./ChatPanel";
import { TemplateVarsPanel } from "./TemplateVarsPanel";
import { ExportPanel } from "./ExportPanel";
import { AccessibilityPanel } from "./AccessibilityPanel";
import { SEOPanel } from "./SEOPanel";
import { ImageEditorModal } from "./ImageEditorModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabID =
  | "preview"
  | "code"
  | "variables"
  | "seo"
  | "accessibility"
  | "export";

interface Asset {
  description: string;
  dataUrl: string;
  originalDataUrl?: string;
  cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

interface ResultViewProps {
  originalImage: string;
  result: ReplicationResult;
  sceneClassification?: ImageSceneClassification | null;
  onReset: () => void;
  onSave?: (name: string, html: string, css: string) => void;
  brandKit?: BrandKit;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResultView({
  originalImage,
  result,
  sceneClassification,
  onReset,
  onSave,
  brandKit,
}: ResultViewProps) {
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<TabID>("preview");

  // ── Content state ──
  const [processedHtml, setProcessedHtml] = useState(result.html);
  const [processedCss, setProcessedCss] = useState(result.css);
  const [processedAssets, setProcessedAssets] = useState<Asset[]>([]);
  const [processedCharts, setProcessedCharts] = useState<
    ReplicationResult["detectedCharts"]
  >([]);

  // ── UI state ──
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [projectName, setProjectName] = useState("My Replicated Layout");
  const [showChat, setShowChat] = useState(false);
  const [isDetectingVars, setIsDetectingVars] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [diffSlider, setDiffSlider] = useState(50);
  const [replacingAssetIndex, setReplacingAssetIndex] = useState<number | null>(
    null,
  );

  // ── Refs ──
  const [iframeContent, setIframeContent] = useState("");

  // ── Image editor ──
  const imageEditor = useImageEditor();
  const {
    editingAssetIndex,
    editMode,
    setEditMode,
    editParams,
    setEditParams,
    cropBox,
    setCropBox,
    editHistory,
    historyIndex,
    addToHistory,
    cancelEdit,
    undo,
    redo,
    startEditing: hookStartEditing,
  } = imageEditor;

  // ── Build iframe content whenever processed content changes ──
  useEffect(() => {
    const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; overflow-x: hidden; }
    svg { display: block; width: 100%; max-width: 100%; height: auto; overflow: visible; }
    svg text { font-family: system-ui, -apple-system, sans-serif; }
    svg path, svg rect, svg circle, svg polygon, svg polyline, svg line, svg ellipse { vector-effect: non-scaling-stroke; }
    [data-diagram], .diagram-container, .flowchart { width: 100%; overflow-x: auto; }
    .relative { position: relative; }
    [class*="absolute"] { max-width: 100%; }
    ${processedCss || ""}
  </style>
</head>
<body>
  ${sanitizeForIframe(normalizeHtmlForPreview(processedHtml))}
</body>
</html>`;
    setIframeContent(content);
  }, [processedHtml, processedCss]);

  // ── Process assets on mount (skip in template mode — no images to crop) ──
  useEffect(() => {
    if (
      !result.isTemplate &&
      ((result.detectedImages && result.detectedImages.length > 0) ||
        (result.detectedCharts && result.detectedCharts.length > 0))
    ) {
      processAssets();
    }
  }, [result]);

  // ── Asset processing ──
  const processAssets = async () => {
    let newHtml = result.html;
    const assets: Asset[] = [];

    const hasImage = originalImage && originalImage.startsWith("data:");
    let img: HTMLImageElement | null = null;

    if (hasImage) {
      try {
        img = new Image();
        img.src = originalImage;
        img.crossOrigin = "anonymous";
        await img.decode();
      } catch (imgErr) {
        console.warn("[processAssets] Failed to load original image:", imgErr);
        img = null;
      }
    }

    if (img && result.detectedImages) {
      for (const detected of result.detectedImages) {
        if (!detected.coordinates) continue;
        try {
          const { ymin, xmin, ymax, xmax } = detected.coordinates;
          const x = Math.floor((xmin / 1000) * img.width);
          const y = Math.floor((ymin / 1000) * img.height);
          const width = Math.ceil(((xmax - xmin) / 1000) * img.width);
          const height = Math.ceil(((ymax - ymin) / 1000) * img.height);

          if (width <= 0 || height <= 0) continue;

          const highResCanvas = highQualityDraw(
            img,
            x,
            y,
            width,
            height,
            width,
            height,
          );
          const croppedDataUrl = highResCanvas.toDataURL(
            "image/jpeg",
            IMAGE_CROP_QUALITY,
          );

          assets.push({
            description: detected.description,
            dataUrl: croppedDataUrl,
            originalDataUrl: croppedDataUrl,
            cropCoords: { ymin, xmin, ymax, xmax },
          });

          const escapedDesc = detected.description.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          const descRegex = new RegExp(
            `(<img[^>]*alt=["']${escapedDesc}["'][^>]*>)`,
            "gi",
          );

          if (newHtml.match(descRegex)) {
            newHtml = newHtml.replace(descRegex, (match) => {
              if (match.match(/src=["'][^"']*["']/)) {
                return match.replace(
                  /src=["'][^"']*["']/,
                  `src="${croppedDataUrl}"`,
                );
              }
              return match.replace("<img", `<img src="${croppedDataUrl}"`);
            });
          }
        } catch (cropErr) {
          console.warn(
            "[processAssets] Failed to crop:",
            detected.description,
            cropErr,
          );
        }
      }
    } else if (!hasImage && result.detectedImages?.length) {
      for (const detected of result.detectedImages) {
        assets.push({
          description: detected.description,
          dataUrl: "",
          originalDataUrl: "",
        });
      }
    }

    if (result.detectedCharts) {
      setProcessedCharts(result.detectedCharts);
      for (const chart of result.detectedCharts) {
        try {
          const escapedTitle = chart.title.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          const chartRegex = new RegExp(
            `(<div[^>]*aria-label=["']${escapedTitle}["'][^>]*>)(<\\/div>)?`,
            "gi",
          );
          if (newHtml.match(chartRegex)) {
            const chartBadge = `<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full h-full min-h-[300px] flex flex-col">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-sm font-bold text-slate-800">${chart.title}</h3>
    <div class="flex gap-1">
       ${["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((c, i) => `<div class="w-1.5 h-1.5 rounded-full" style="background-color: ${c}"></div>`).join("")}
    </div>
  </div>
  <div class="flex-1 w-full flex items-center justify-center bg-slate-50/50 rounded-xl overflow-hidden relative group/chart-container">
    ${generateSVGChart(chart)}
  </div>
</div>`;
            newHtml = newHtml.replace(chartRegex, chartBadge);
          }
        } catch (chartErr) {
          console.warn(
            "[processAssets] Failed to process chart:",
            chart.title,
            chartErr,
          );
        }
      }
    }

    setProcessedHtml(newHtml);
    setProcessedAssets(assets);
  };

  // ── Asset mutation handlers ──
  const insertAsset = (asset: { description: string; dataUrl: string }) => {
    const escapedDesc = asset.description.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const descRegex = new RegExp(
      `(<img[^>]*alt=["']${escapedDesc}["'][^>]*>)`,
      "gi",
    );

    if (processedHtml.match(descRegex)) {
      const newHtml = processedHtml.replace(descRegex, (match) => {
        if (match.match(/src=["'][^"']*["']/)) {
          return match.replace(/src=["'][^"']*["']/, `src="${asset.dataUrl}"`);
        }
        return match.replace("<img", `<img src="${asset.dataUrl}"`);
      });
      setProcessedHtml(newHtml);
    } else {
      const genericRegex = /<img[^>]*src=["']placeholder["'][^>]*>/gi;
      if (processedHtml.match(genericRegex)) {
        const newHtml = processedHtml.replace(genericRegex, (match) => {
          return match.replace(
            /src=["']placeholder["']/,
            `src="${asset.dataUrl}"`,
          );
        });
        setProcessedHtml(newHtml);
      } else {
        alert(
          `Could not find a specific placeholder for "${asset.description}".`,
        );
      }
    }
  };

  const insertNewImageToCode = (asset: {
    description: string;
    dataUrl: string;
  }) => {
    const imgTag = `<img src="${asset.dataUrl}" alt="${asset.description}" class="w-full h-auto rounded-lg" />`;
    if (processedHtml.includes("</div>")) {
      const lastDiv = processedHtml.lastIndexOf("</div>");
      setProcessedHtml(
        processedHtml.slice(0, lastDiv) +
          "\n  " +
          imgTag +
          "\n" +
          processedHtml.slice(lastDiv),
      );
    } else {
      setProcessedHtml(processedHtml + "\n" + imgTag);
    }
    setActiveTab("preview");
  };

  const insertChartToCode = (
    chart: NonNullable<ReplicationResult["detectedCharts"]>[0],
  ) => {
    const chartHtml = `
<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-sm font-bold text-slate-800">${chart.title}</h3>
    <div class="flex gap-1">
       ${["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((c) => `<div class="w-1.5 h-1.5 rounded-full" style="background-color: ${c}"></div>`).join("")}
    </div>
  </div>
  <div class="flex-1 w-full flex items-center justify-center bg-slate-50/50 rounded-xl overflow-hidden relative group/chart-container min-h-[300px]">
    ${generateSVGChart(chart)}
  </div>
</div>`;

    if (processedHtml.includes("</div>")) {
      const lastDiv = processedHtml.lastIndexOf("</div>");
      setProcessedHtml(
        processedHtml.slice(0, lastDiv) +
          "\n  " +
          chartHtml +
          "\n" +
          processedHtml.slice(lastDiv),
      );
    } else {
      setProcessedHtml(processedHtml + "\n" + chartHtml);
    }
    setActiveTab("preview");
  };

  const deleteAsset = (index: number) => {
    setProcessedAssets((prev) => prev.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    hookStartEditing(index, processedAssets, originalImage);
  };

  // ── File upload handlers ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      let dataUrl = event.target?.result as string;
      if (file.type.startsWith("image/")) {
        dataUrl = await compressImage(dataUrl);
      }
      setProcessedAssets((prev) => [
        ...prev,
        {
          description: file.name.split(".")[0],
          dataUrl,
          originalDataUrl: dataUrl,
        },
      ]);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  const handleReplaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingAssetIndex === null) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      let dataUrl = event.target?.result as string;
      if (file.type.startsWith("image/")) {
        dataUrl = await compressImage(dataUrl);
      }
      const oldAsset = processedAssets[replacingAssetIndex];
      if (processedHtml.includes(oldAsset.dataUrl)) {
        setProcessedHtml((prev) => prev.replaceAll(oldAsset.dataUrl, dataUrl));
      }
      setProcessedAssets((prev) => {
        const newAssets = [...prev];
        newAssets[replacingAssetIndex] = {
          ...oldAsset,
          dataUrl,
          originalDataUrl: dataUrl,
        };
        return newAssets;
      });
      setReplacingAssetIndex(null);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  // ── Image editor apply ──
  const applyEdits = async () => {
    const editResult = await imageEditor.applyEdits(
      processedAssets,
      originalImage,
    );
    if (!editResult) return;
    setProcessedAssets(editResult.updatedAssets);
    if (processedHtml.includes(editResult.oldDataUrl)) {
      setProcessedHtml(
        processedHtml.replaceAll(editResult.oldDataUrl, editResult.newDataUrl),
      );
    }
  };

  // ── Header actions ──
  const copyToClipboard = async () => {
    if (!processedHtml) return;
    try {
      await navigator.clipboard.writeText(processedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = processedHtml;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const downloadCode = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Replicated Design</title>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/font/lucide.min.css">
    <style>
      ${processedCss}
      body { margin: 0; }
    </style>
</head>
<body>
    ${sanitizeForIframe(normalizeHtmlForPreview(processedHtml))}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "replicated-design.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (!onSave) return;
    setIsSaving(true);
    onSave(projectName, processedHtml, processedCss);
    setTimeout(() => {
      setIsSaving(false);
      setShowSaveDialog(false);
    }, 500);
  };

  // ── Tab definitions ──
  const TABS = [
    { id: "preview" as const, icon: Eye, label: "Canvas" },
    { id: "code" as const, icon: Code, label: "Source Code" },
    { id: "variables" as const, icon: Variable, label: "Variables" },
    { id: "seo" as const, icon: Search, label: "SEO" },
    { id: "accessibility" as const, icon: ShieldCheck, label: "A11y" },
    { id: "export" as const, icon: PackageOpen, label: "Export" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onReset}
            className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            ← New Capture
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto gap-0.5">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold rounded-md transition-all whitespace-nowrap uppercase tracking-tight",
                  activeTab === id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold text-slate-300 mr-2 hidden sm:block uppercase tracking-widest">
            Xiaomi MiMo
          </p>

          {/* Save dialog */}
          <div className="relative">
            <button
              onClick={() => setShowSaveDialog(!showSaveDialog)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <AnimatePresence>
              {showSaveDialog && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-6 flex flex-col gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                      Save Project
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight">
                      Persist this design to your local library.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project Name..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="flex-1 px-3 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-[11px] font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Confirm Save"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-lg hover:opacity-90 shadow-lg transition-all active:scale-95"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Export Template"}
          </button>
          <button
            onClick={downloadCode}
            className="p-2.5 text-slate-500 hover:text-slate-900 transition-colors border border-slate-200 rounded-lg bg-white shadow-sm"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={cn(
              "p-2.5 transition-colors border rounded-lg shadow-sm",
              showChat
                ? "bg-indigo-600 text-white border-indigo-600"
                : "text-slate-500 hover:text-slate-900 border-slate-200 bg-white",
            )}
            title="AI Chat Refinement"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto p-8 lg:p-12">
        <AnimatePresence mode="wait">
          {activeTab === "preview" && (
            <PreviewTab
              originalImage={originalImage}
              sceneClassification={sceneClassification}
              showDiff={showDiff}
              setShowDiff={setShowDiff}
              diffSlider={diffSlider}
              setDiffSlider={setDiffSlider}
              iframeContent={iframeContent}
            />
          )}

          {activeTab === "code" && (
            <CodeTab
              result={result}
              processedHtml={processedHtml}
              setProcessedHtml={setProcessedHtml}
              processedCss={processedCss}
              setProcessedCss={setProcessedCss}
              processedAssets={processedAssets}
              setProcessedAssets={setProcessedAssets}
              processedCharts={processedCharts}
              onInsertAsset={insertAsset}
              onInsertNewImage={insertNewImageToCode}
              onStartEditing={startEditing}
              onDeleteAsset={deleteAsset}
              onFileUpload={handleFileUpload}
              onReplaceUpload={handleReplaceUpload}
              replacingAssetIndex={replacingAssetIndex}
              setReplacingAssetIndex={setReplacingAssetIndex}
              downloadChartCSV={downloadChartCSV}
              insertChartToCode={insertChartToCode}
            />
          )}

          {activeTab === "variables" && (
            <motion.div
              key="variables"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <TemplateVarsPanel
                html={processedHtml}
                onChange={(updatedHtml: string) =>
                  setProcessedHtml(updatedHtml)
                }
                onDetectWithAI={async () => {
                  setIsDetectingVars(true);
                  try {
                    const vars =
                      await detectTemplateVariablesWithAI(processedHtml);
                    let newHtml = processedHtml;
                    vars.forEach((v) => {
                      if (v.value) {
                        const escaped = v.value.replace(
                          /[.*+?^${}()|[\]\\]/g,
                          "\\$&",
                        );
                        newHtml = newHtml.replace(
                          new RegExp(escaped, "g"),
                          `{{${v.key}}}`,
                        );
                      }
                    });
                    setProcessedHtml(newHtml);
                    return vars as TemplateVariable[];
                  } finally {
                    setIsDetectingVars(false);
                  }
                }}
                isDetecting={isDetectingVars}
              />
            </motion.div>
          )}

          {activeTab === "seo" && (
            <motion.div
              key="seo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <SEOPanel
                html={processedHtml}
                brandKit={brandKit}
                onApply={(newHtml: string) => setProcessedHtml(newHtml)}
              />
            </motion.div>
          )}

          {activeTab === "accessibility" && (
            <motion.div
              key="accessibility"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <AccessibilityPanel
                html={processedHtml}
                onFixWithAI={() => setShowChat(true)}
              />
            </motion.div>
          )}

          {activeTab === "export" && (
            <motion.div
              key="export"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <ExportPanel
                html={processedHtml}
                css={processedCss}
                projectName={undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Image editor modal ── */}
        {editingAssetIndex !== null && (
          <ImageEditorModal
            asset={processedAssets[editingAssetIndex]}
            originalImage={originalImage}
            editMode={editMode}
            setEditMode={setEditMode}
            editParams={editParams}
            setEditParams={setEditParams}
            cropBox={cropBox}
            setCropBox={setCropBox}
            editHistory={editHistory}
            historyIndex={historyIndex}
            addToHistory={addToHistory}
            cancelEdit={cancelEdit}
            undo={undo}
            redo={redo}
            resetCrop={() => {
              const resetCropBox = { x: 10, y: 10, width: 80, height: 80 };
              setCropBox(resetCropBox);
              addToHistory(editParams, resetCropBox);
            }}
            onApply={applyEdits}
          />
        )}
      </div>

      {/* ── Chat panel ── */}
      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        currentHtml={processedHtml}
        currentCss={processedCss}
        onUpdate={(html: string, css: string) => {
          setProcessedHtml(html);
          setProcessedCss(css);
        }}
      />
    </div>
  );
}
