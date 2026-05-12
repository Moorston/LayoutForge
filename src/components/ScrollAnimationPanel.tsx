import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Play,
  Check,
  Sliders,
  Eye,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SCROLL_PRESETS,
  generateScrollAnimationCSS,
  generateScrollObserverJS,
  injectScrollAnimations,
} from "@/lib/scrollAnimations";
import type { ScrollPreset } from "@/lib/scrollAnimations";

// ─── Props ───────────────────────────────────────────────────────────────────

interface ScrollAnimationPanelProps {
  html: string;
  css: string;
  onApply: (html: string, css: string, js: string) => void;
}

// ─── Preset Card ─────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  selected,
  onToggle,
}: {
  preset: ScrollPreset;
  selected: boolean;
  onToggle: () => void;
}) {
  const [animating, setAnimating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const triggerPreview = useCallback(() => {
    if (boxRef.current) {
      setAnimating(true);
      // Reset
      boxRef.current.style.animation = "none";
      boxRef.current.offsetHeight; // Force reflow
      boxRef.current.style.animation = "";

      // Apply animation directly
      const keyframeName = preset.css.match(/@keyframes\s+(\w+)/)?.[1];
      if (keyframeName) {
        boxRef.current.style.animation = `${keyframeName} 0.6s ease-out forwards`;
      }

      setTimeout(() => setAnimating(false), 700);
    }
  }, [preset]);

  // Extract keyframe name from CSS
  const keyframeName = useMemo(
    () => preset.css.match(/@keyframes\s+(\w+)/)?.[1] || "",
    [preset],
  );

  // Generate minimal CSS for preview (just the keyframe, not the selector)
  const previewCSS = useMemo(() => {
    const keyframeMatch = preset.css.match(
      /(@keyframes[^{]+\{[\s\S]*?\n\})/,
    );
    return keyframeMatch?.[1] || "";
  }, [preset]);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onToggle}
      className={cn(
        "relative flex flex-col rounded-xl border-2 p-4 text-left transition-all duration-200",
        selected
          ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-200"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      {/* Check indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Mini preview */}
      <div className="h-16 bg-slate-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
        {/* Inject keyframe CSS for preview */}
        <style>{previewCSS}</style>
        <div
          ref={boxRef}
          className="w-10 h-10 bg-indigo-400 rounded-lg"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerPreview();
          }}
          className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
          title="Preview animation"
        >
          <Play className="w-3 h-3 text-slate-600" />
        </button>
      </div>

      {/* Info */}
      <span className="text-xs font-bold text-slate-900">{preset.name}</span>
      <span className="text-[10px] text-slate-400">{preset.nameZh}</span>
    </motion.button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ScrollAnimationPanel({
  html,
  css,
  onApply,
}: ScrollAnimationPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState("0.6");
  const [delay, setDelay] = useState("0");
  const [easing, setEasing] = useState("ease-out");
  const [showControls, setShowControls] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleTogglePreset = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === SCROLL_PRESETS.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(SCROLL_PRESETS.map((p) => p.id)));
    }
  }, [selectedIds]);

  const selectedPresets = useMemo(
    () => SCROLL_PRESETS.filter((p) => selectedIds.has(p.id)),
    [selectedIds],
  );

  const generatedCSS = useMemo(() => {
    if (selectedPresets.length === 0) return "";
    return generateScrollAnimationCSS(selectedPresets, {
      duration: `${duration}s`,
      delay: `${delay}s`,
      easing,
    });
  }, [selectedPresets, duration, delay, easing]);

  const generatedJS = useMemo(() => generateScrollObserverJS(), []);

  const handleApply = useCallback(() => {
    if (selectedIds.size === 0) return;

    const presetIds = Array.from(selectedIds);
    const modifiedHtml = injectScrollAnimations(html, presetIds);
    const combinedCss = `${css}\n\n/* Scroll Animations */\n${generatedCSS}`;

    onApply(modifiedHtml, combinedCss, generatedJS);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }, [html, css, selectedIds, generatedCSS, generatedJS, onApply]);

  const handlePreview = useCallback(() => {
    if (selectedIds.size === 0) return;

    const presetIds = Array.from(selectedIds);
    const modifiedHtml = injectScrollAnimations(html, presetIds);
    const combinedCss = `${css}\n\n/* Scroll Animations */\n${generatedCSS}`;

    // Open preview in new window
    const previewContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scroll Animation Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    ${combinedCss}
  </style>
</head>
<body>
${modifiedHtml}
<script>${generatedJS}</script>
</body>
</html>`;

    const blob = new Blob([previewContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [html, css, selectedIds, generatedCSS, generatedJS]);

  const easingOptions = [
    "ease",
    "ease-in",
    "ease-out",
    "ease-in-out",
    "linear",
    "cubic-bezier(0.16, 1, 0.3, 1)",
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Animations
          </p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 shrink-0 text-amber-500" />
            Scroll Animations
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors px-2 py-1"
          >
            {selectedIds.size === SCROLL_PRESETS.length
              ? "Deselect All"
              : "Select All"}
          </button>
          <button
            onClick={() => setShowControls((v) => !v)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors",
              showControls
                ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
            )}
          >
            <Sliders className="w-3 h-3" />
            Controls
          </button>
        </div>
      </div>

      {/* ── Controls ────────────────────────────────────────── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
              {/* Duration */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Duration: {duration}s
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                  <span>0.1s</span>
                  <span>2s</span>
                </div>
              </div>

              {/* Delay */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Delay: {delay}s
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value)}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                  <span>0s</span>
                  <span>1s</span>
                </div>
              </div>

              {/* Easing */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Easing
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {easingOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setEasing(opt)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors",
                        easing === opt
                          ? "bg-indigo-500 text-white"
                          : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Preset grid ─────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Presets ({selectedIds.size} selected)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SCROLL_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              selected={selectedIds.has(preset.id)}
              onToggle={() => handleTogglePreset(preset.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePreview}
          disabled={selectedIds.size === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-700 hover:border-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4" />
          Preview
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleApply}
          disabled={selectedIds.size === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {applied ? (
            <>
              <Check className="w-4 h-4" />
              Applied!
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Apply to Page
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
