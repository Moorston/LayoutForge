import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeftRight,
  Trophy,
  Clock,
  Cpu,
  BarChart3,
  ThumbsUp,
  Loader2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ABCompareResult {
  modelName: string;
  html: string;
  css: string;
  generationTime?: number;
  score?: number;
}

interface ABComparePanelProps {
  results: ABCompareResult[];
  originalImage?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSrcDoc(html: string, css: string): string {
  return `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif}{${css}}</style></head><body>${html}</body></html>`;
}

/**
 * Simple auto-scorer that compares structural and visual similarity.
 * Returns a 0-100 score.
 */
function autoScore(result: ABCompareResult): number {
  let score = 50; // baseline

  // Reward HTML structure richness
  const tagCount = (result.html.match(/<\w+/g) || []).length;
  score += Math.min(15, tagCount * 0.5);

  // Reward CSS complexity
  const cssRules = (result.css.match(/\{/g) || []).length;
  score += Math.min(15, cssRules * 1.5);

  // Reward color variety
  const colors = new Set(result.css.match(/#[0-9a-fA-F]{3,8}/g) || []);
  score += Math.min(10, colors.size * 2);

  // Reward use of modern CSS
  if (/flex|grid/i.test(result.css)) score += 5;
  if (/gradient/i.test(result.css)) score += 3;
  if (/shadow/i.test(result.css)) score += 3;
  if (/border-radius/i.test(result.css)) score += 2;

  // Penalize very short outputs
  if (result.html.length < 50) score -= 20;
  if (result.css.length < 20) score -= 10;

  // Reward generation time (faster = better, if available)
  if (result.generationTime && result.generationTime < 3000) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Draggable Divider ───────────────────────────────────────────────────────

function DraggableDivider({
  position,
  onChange,
}: {
  position: number;
  onChange: (pos: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        onChange(Math.max(20, Math.min(80, pct)));
      };

      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 pointer-events-none">
      <div
        className="absolute top-0 bottom-0 pointer-events-auto cursor-col-resize flex items-center justify-center"
        style={{ left: `${position}%`, transform: "translateX(-50%)", width: 24 }}
        onMouseDown={handleMouseDown}
      >
        <div className="w-1 h-full bg-slate-400/60 rounded-full relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-10 bg-slate-700 rounded-lg flex items-center justify-center shadow-md">
            <GripVertical className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Iframe ──────────────────────────────────────────────────────────

function PreviewFrame({
  html,
  css,
  style,
}: {
  html: string;
  css: string;
  style?: React.CSSProperties;
}) {
  return (
    <iframe
      srcDoc={buildSrcDoc(html, css)}
      className="w-full h-full bg-white border-0"
      sandbox="allow-same-origin"
      style={style}
      title="Preview"
    />
  );
}

// ─── Result Card Header ──────────────────────────────────────────────────────

function ResultHeader({
  result,
  rank,
  isWinner,
  onVote,
  voted,
}: {
  result: ABCompareResult;
  rank: number;
  isWinner: boolean;
  onVote: () => void;
  voted: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b",
        isWinner
          ? "bg-amber-50 border-amber-200"
          : "bg-slate-50 border-slate-200",
      )}
    >
      {/* Rank */}
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
          isWinner
            ? "bg-amber-400 text-amber-900"
            : "bg-slate-200 text-slate-600",
        )}
      >
        {rank === 1 ? (
          <Trophy className="w-3.5 h-3.5" />
        ) : (
          String.fromCharCode(64 + rank)
        )}
      </div>

      {/* Model info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 truncate">
          {result.modelName}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {result.generationTime !== undefined && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="w-3 h-3" />
              {(result.generationTime / 1000).toFixed(1)}s
            </span>
          )}
          {result.score !== undefined && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <BarChart3 className="w-3 h-3" />
              {result.score}/100
            </span>
          )}
        </div>
      </div>

      {/* Vote button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onVote}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors",
          voted
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
            : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300",
        )}
      >
        <ThumbsUp className={cn("w-3 h-3", voted && "fill-current")} />
        {voted ? "Voted!" : `Prefer ${String.fromCharCode(64 + rank)}`}
      </motion.button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ABComparePanel({
  results,
  originalImage,
}: ABComparePanelProps) {
  const [viewMode, setViewMode] = useState<"split" | "stacked">("split");
  const [dividerPos, setDividerPos] = useState(50);
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoring, setScoring] = useState(false);

  // Auto-score on mount
  const computedScores = useMemo(() => {
    const map: Record<string, number> = {};
    results.forEach((r, i) => {
      const key = r.modelName || `result-${i}`;
      map[key] = r.score ?? autoScore(r);
    });
    return map;
  }, [results]);

  const handleAutoScore = useCallback(() => {
    setScoring(true);
    setTimeout(() => {
      const newScores: Record<string, number> = {};
      results.forEach((r, i) => {
        const key = r.modelName || `result-${i}`;
        newScores[key] = autoScore(r);
      });
      setScores(newScores);
      setScoring(false);
    }, 800);
  }, [results]);

  const handleVote = useCallback((key: string) => {
    setVotes((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Sort by score for ranking
  const rankedResults = useMemo(() => {
    return [...results]
      .map((r, i) => ({
        ...r,
        key: r.modelName || `result-${i}`,
        displayScore:
          scores[r.modelName || `result-${i}`] ??
          computedScores[r.modelName || `result-${i}`] ??
          r.score ??
          0,
      }))
      .sort((a, b) => b.displayScore - a.displayScore);
  }, [results, scores, computedScores]);

  if (results.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center gap-3 py-16">
        <ArrowLeftRight className="w-8 h-8 text-slate-300" />
        <p className="text-sm font-semibold text-slate-400">
          No comparison results yet
        </p>
        <p className="text-xs text-slate-300">
          Generate outputs from multiple models to compare
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Compare
          </p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 shrink-0" />
            A/B Comparison
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("split")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                viewMode === "split"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400",
              )}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode("stacked")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                viewMode === "stacked"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400",
              )}
            >
              Stacked
            </button>
          </div>

          {/* Auto-score */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAutoScore}
            disabled={scoring}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {scoring ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Cpu className="w-3 h-3" />
            )}
            Auto-Score
          </motion.button>
        </div>
      </div>

      {/* ── Original image ─────────────────────────────────── */}
      {originalImage && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Original
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden h-32">
            <img
              src={originalImage}
              alt="Original design"
              className="w-full h-full object-contain bg-slate-50"
            />
          </div>
        </div>
      )}

      {/* ── Comparison Views ────────────────────────────────── */}
      {viewMode === "split" && results.length >= 2 ? (
        /* Split view with draggable divider */
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Side-by-Side
          </p>
          <div className="relative rounded-xl border border-slate-200 overflow-hidden h-80">
            {/* Left result */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - dividerPos}% 0 0)` }}
            >
              <PreviewFrame
                html={rankedResults[0].html}
                css={rankedResults[0].css}
              />
            </div>
            {/* Right result */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${dividerPos}%)` }}
            >
              <PreviewFrame
                html={rankedResults[1].html}
                css={rankedResults[1].css}
              />
            </div>
            <DraggableDivider position={dividerPos} onChange={setDividerPos} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-semibold text-slate-500">
            <span>{rankedResults[0].modelName}</span>
            <span>{rankedResults[1].modelName}</span>
          </div>
        </div>
      ) : null}

      {/* ── Stacked view with individual cards ──────────────── */}
      <div
        className={cn(
          "grid gap-3",
          viewMode === "stacked"
            ? "grid-cols-1"
            : results.length > 2
              ? "grid-cols-2"
              : "grid-cols-1",
        )}
      >
        {rankedResults.map((result, idx) => {
          const isWinner = idx === 0 && rankedResults.length > 1;
          return (
            <motion.div
              key={result.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "rounded-xl border overflow-hidden",
                isWinner
                  ? "border-amber-300 shadow-md"
                  : "border-slate-200",
              )}
            >
              <ResultHeader
                result={result}
                rank={idx + 1}
                isWinner={isWinner}
                onVote={() => handleVote(result.key)}
                voted={!!votes[result.key]}
              />
              <div
                className={cn(
                  "bg-white",
                  viewMode === "stacked" ? "h-48" : "h-40",
                )}
              >
                <PreviewFrame html={result.html} css={result.css} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Score summary ───────────────────────────────────── */}
      {Object.keys(scores).length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            Score Summary
          </p>
          <div className="flex flex-col gap-2">
            {rankedResults.map((r) => (
              <div key={r.key} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-600 w-24 truncate">
                  {r.modelName}
                </span>
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.displayScore}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      r.displayScore >= 80
                        ? "bg-emerald-500"
                        : r.displayScore >= 60
                          ? "bg-blue-500"
                          : r.displayScore >= 40
                            ? "bg-amber-500"
                            : "bg-red-500",
                    )}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-700 w-8 text-right">
                  {r.displayScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
