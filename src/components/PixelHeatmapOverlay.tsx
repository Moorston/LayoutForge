/**
 * Pixel Heatmap Overlay
 * Compares an original image with rendered iframe content using Canvas API,
 * generating a color-coded heatmap showing pixel deviation.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye,
  EyeOff,
  Layers,
  Grid3x3,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface PixelHeatmapOverlayProps {
  originalImage: string;
  iframeContent: string;
  className?: string;
}

type ViewMode = "heatmap" | "difference" | "highlight";

// ─── Color utilities ─────────────────────────────────────────────────────────

function deviationToHeatColor(deviation: number, maxDev: number): [number, number, number] {
  const normalized = Math.min(deviation / maxDev, 1);
  if (normalized < 0.33) {
    // Green → Yellow
    const t = normalized / 0.33;
    return [Math.round(34 + t * (255 - 34)), Math.round(197 - t * (197 - 214)), 94];
  } else if (normalized < 0.66) {
    // Yellow → Orange
    const t = (normalized - 0.33) / 0.33;
    return [255, Math.round(214 - t * (214 - 120)), Math.round(94 - t * 94)];
  } else {
    // Orange → Red
    const t = (normalized - 0.66) / 0.34;
    return [255, Math.round(120 - t * 120), Math.round(t * 60)];
  }
}

function pixelDiff(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return (Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)) / 3;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PixelHeatmapOverlay({
  originalImage,
  iframeContent,
  className,
}: PixelHeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderedCanvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [opacity, setOpacity] = useState(0.6);
  const [viewMode, setViewMode] = useState<ViewMode>("heatmap");
  const [threshold, setThreshold] = useState(30);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(100);
  const [iframeReady, setIframeReady] = useState(false);
  const [renderMethod, setRenderMethod] = useState<"iframe" | "placeholder">("placeholder");

  // Load original image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = Math.min(img.width, 1200);
      const h = Math.round((img.height / img.width) * w);
      setCanvasSize({ width: w, height: h });

      const canvas = originalCanvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
        }
      }
    };
    img.src = originalImage;
  }, [originalImage]);

  // Render iframe content to canvas when ready
  const renderIframeToCanvas = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeReady) return;

    try {
      // Try to capture iframe content
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      const canvas = renderedCanvasRef.current;
      if (!canvas) return;

      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw a white background first
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Use foreignObject SVG to render HTML to canvas
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize.width}" height="${canvasSize.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${iframeContent}</div>
        </foreignObject>
      </svg>`;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setRenderMethod("iframe");
      };
      img.onerror = () => {
        setRenderMethod("placeholder");
      };

      const blob = new Blob([svg], { type: "image/svg+xml" });
      img.src = URL.createObjectURL(blob);
    } catch {
      setRenderMethod("placeholder");
    }
  }, [iframeContent, iframeReady, canvasSize]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIframeReady(true);
  }, []);

  // Attempt render when iframe is ready
  useEffect(() => {
    if (iframeReady) {
      // Small delay to let iframe fully render
      const timer = setTimeout(renderIframeToCanvas, 500);
      return () => clearTimeout(timer);
    }
  }, [iframeReady, renderIframeToCanvas]);

  // Generate simulated rendered canvas when iframe approach doesn't work
  useEffect(() => {
    if (renderMethod !== "placeholder") return;

    const canvas = renderedCanvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate a simulated version with slight variations
    const origCanvas = originalCanvasRef.current;
    if (!origCanvas) return;

    const origCtx = origCanvas.getContext("2d");
    if (!origCtx) return;

    const origData = origCtx.getImageData(0, 0, canvasSize.width, canvasSize.height);
    const newData = ctx.createImageData(canvasSize.width, canvasSize.height);

    for (let i = 0; i < origData.data.length; i += 4) {
      // Add slight random variations to simulate rendering differences
      const noise = () => Math.round((Math.random() - 0.5) * 20);
      newData.data[i] = Math.max(0, Math.min(255, origData.data[i] + noise()));
      newData.data[i + 1] = Math.max(0, Math.min(255, origData.data[i + 1] + noise()));
      newData.data[i + 2] = Math.max(0, Math.min(255, origData.data[i + 2] + noise()));
      newData.data[i + 3] = origData.data[i + 3];
    }

    ctx.putImageData(newData, 0, 0);
  }, [renderMethod, canvasSize]);

  // Run comparison
  const runComparison = useCallback(() => {
    const origCanvas = originalCanvasRef.current;
    const rendCanvas = renderedCanvasRef.current;
    const heatCanvas = canvasRef.current;
    if (!origCanvas || !rendCanvas || !heatCanvas) return;

    setIsComparing(true);

    // Use requestAnimationFrame for smooth UI
    requestAnimationFrame(() => {
      const w = canvasSize.width;
      const h = canvasSize.height;

      heatCanvas.width = w;
      heatCanvas.height = h;

      const origCtx = origCanvas.getContext("2d");
      const rendCtx = rendCanvas.getContext("2d");
      const heatCtx = heatCanvas.getContext("2d");
      if (!origCtx || !rendCtx || !heatCtx) {
        setIsComparing(false);
        return;
      }

      const origData = origCtx.getImageData(0, 0, w, h);
      const rendData = rendCtx.getImageData(0, 0, w, h);
      const heatData = heatCtx.createImageData(w, h);

      let totalPixels = 0;
      let matchingPixels = 0;
      let totalDeviation = 0;

      for (let i = 0; i < origData.data.length; i += 4) {
        const r1 = origData.data[i];
        const g1 = origData.data[i + 1];
        const b1 = origData.data[i + 2];
        const r2 = rendData.data[i];
        const g2 = rendData.data[i + 1];
        const b2 = rendData.data[i + 2];

        const dev = pixelDiff(r1, g1, b1, r2, g2, b2);
        totalDeviation += dev;
        totalPixels++;

        if (dev <= threshold) {
          matchingPixels++;
        }

        let outR: number, outG: number, outB: number;

        if (viewMode === "heatmap") {
          if (dev <= threshold) {
            // Good match — green tint
            outR = Math.round(r1 * 0.7 + 34 * 0.3);
            outG = Math.round(g1 * 0.7 + 197 * 0.3);
            outB = Math.round(b1 * 0.7 + 94 * 0.3);
          } else {
            const [hr, hg, hb] = deviationToHeatColor(dev, 128);
            outR = hr;
            outG = hg;
            outB = hb;
          }
        } else if (viewMode === "difference") {
          // Absolute difference, amplified
          const diffVal = Math.min(255, dev * 3);
          outR = diffVal;
          outG = diffVal;
          outB = diffVal;
        } else {
          // highlight — original pixels with red overlay on differences
          if (dev > threshold) {
            outR = 255;
            outG = Math.round(g1 * 0.3);
            outB = Math.round(b1 * 0.3);
          } else {
            outR = r1;
            outG = g1;
            outB = b1;
          }
        }

        heatData.data[i] = outR;
        heatData.data[i + 1] = outG;
        heatData.data[i + 2] = outB;
        heatData.data[i + 3] = 255;
      }

      heatCtx.putImageData(heatData, 0, 0);

      const score = totalPixels > 0 ? (matchingPixels / totalPixels) * 100 : 0;
      setMatchScore(Math.round(score * 10) / 10);
      setIsComparing(false);
    });
  }, [canvasSize, threshold, viewMode]);

  const scaleFactor = zoom / 100;

  const modeButtons: Array<{ mode: ViewMode; label: string; icon: React.ReactNode }> = [
    { mode: "heatmap", label: "Heatmap", icon: <Grid3x3 className="w-3.5 h-3.5" /> },
    { mode: "difference", label: "Difference", icon: <Layers className="w-3.5 h-3.5" /> },
    { mode: "highlight", label: "Highlight", icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={cn("bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col", className)}>
      {/* Hidden canvases for image data */}
      <canvas ref={originalCanvasRef} className="hidden" />
      <canvas ref={renderedCanvasRef} className="hidden" />

      {/* Hidden iframe to capture rendered content */}
      <iframe
        ref={iframeRef}
        srcDoc={iframeContent}
        onLoad={handleIframeLoad}
        className="hidden"
        style={{ width: canvasSize.width, height: canvasSize.height }}
        title="Rendered content capture"
      />

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white flex-wrap shrink-0">
        {/* Toggle heatmap */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowHeatmap((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
            showHeatmap
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
          )}
        >
          {showHeatmap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>Heatmap</span>
        </motion.button>

        {/* View mode selector */}
        <div className="flex gap-1 rounded-xl p-1 bg-slate-100">
          {modeButtons.map((btn) => (
            <motion.button
              key={btn.mode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode(btn.mode)}
              className={cn(
                "flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === btn.mode
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-700",
              )}
            >
              {btn.icon}
              <span className="hidden sm:inline">{btn.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Opacity slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="w-20 h-1.5 accent-slate-900"
          />
          <span className="text-[10px] text-slate-500 font-mono w-8">{Math.round(opacity * 100)}%</span>
        </div>

        {/* Threshold slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Threshold</span>
          <input
            type="range"
            min={5}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-20 h-1.5 accent-slate-900"
          />
          <span className="text-[10px] text-slate-500 font-mono w-6">{threshold}</span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 rounded-xl p-1 bg-slate-100 ml-auto">
          <button
            onClick={() => setZoom((z) => Math.max(25, z - 10))}
            disabled={zoom <= 25}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <span className="text-xs font-bold tabular-nums w-10 text-center text-slate-700">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            disabled={zoom >= 200}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Score bar */}
      <AnimatePresence>
        {matchScore !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50"
          >
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Match Score</span>
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${matchScore}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-colors",
                  matchScore >= 90
                    ? "bg-emerald-500"
                    : matchScore >= 70
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
              />
            </div>
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                matchScore >= 90
                  ? "text-emerald-600"
                  : matchScore >= 70
                    ? "text-amber-600"
                    : "text-red-600",
              )}
            >
              {matchScore}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas area */}
      <div className="overflow-auto bg-[#F3F4F6] relative" style={{ maxHeight: "60vh" }}>
        <div
          className="flex justify-center py-6 relative"
          style={{ minWidth: canvasSize.width * scaleFactor + 48 }}
        >
          <div
            className="relative"
            style={{
              transform: `scale(${scaleFactor})`,
              transformOrigin: "top center",
              width: canvasSize.width,
              marginBottom: canvasSize.height * (scaleFactor - 1),
            }}
          >
            {/* Original image canvas */}
            <canvas
              ref={originalCanvasRef}
              className="rounded-lg shadow-lg"
              style={{ display: "block" }}
            />

            {/* Heatmap overlay */}
            {showHeatmap && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 rounded-lg"
                style={{ opacity, mixBlendMode: viewMode === "difference" ? "multiply" : "normal" }}
              />
            )}
          </div>
        </div>

        {/* Render method notice */}
        {renderMethod === "placeholder" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
            <Info className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[10px] text-amber-700 font-medium">
              Simulated comparison — actual pixel comparison requires rendered output
            </span>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 bg-white">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={runComparison}
          disabled={isComparing}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isComparing ? (
            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Grid3x3 className="w-3.5 h-3.5" />
          )}
          <span>{isComparing ? "Comparing..." : "Run Comparison"}</span>
        </motion.button>

        <button
          onClick={() => {
            setZoom(100);
            setThreshold(30);
            setOpacity(0.6);
            setShowHeatmap(true);
            setViewMode("heatmap");
            setMatchScore(null);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}
