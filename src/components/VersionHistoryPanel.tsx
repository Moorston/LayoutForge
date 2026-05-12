import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  History,
  RotateCcw,
  GitCompare,
  Clock,
  Tag,
  Eye,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Minus,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VersionEntry, DiffResult } from "@/lib/versionHistory";

// ─── Props ───────────────────────────────────────────────────────────────────

interface VersionHistoryPanelProps {
  versions: VersionEntry[];
  onRollback: (html: string, css: string) => void;
  onCompare?: (id1: string, id2: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SOURCE_COLORS: Record<string, string> = {
  "AI Generation": "bg-violet-100 text-violet-700 border-violet-200",
  "Manual Edit": "bg-blue-100 text-blue-700 border-blue-200",
  Refinement: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Import: "bg-amber-100 text-amber-700 border-amber-200",
  Rollback: "bg-red-100 text-red-700 border-red-200",
  default: "bg-slate-100 text-slate-600 border-slate-200",
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] || SOURCE_COLORS.default;
}

// ─── Diff Viewer ─────────────────────────────────────────────────────────────

function DiffViewer({ diff }: { diff: DiffResult }) {
  const allLines: Array<{ type: "add" | "del" | "change" | "context"; content: string; lineNum?: number }> = [];

  for (const d of diff.deletions) {
    allLines.push({ type: "del", content: d.replace(/^- /, "") });
  }
  for (const a of diff.additions) {
    allLines.push({ type: "add", content: a.replace(/^\+ /, "") });
  }
  for (const c of diff.changes) {
    allLines.push({ type: "del", content: c.old, lineNum: c.line });
    allLines.push({ type: "add", content: c.new, lineNum: c.line });
  }

  if (allLines.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-xs text-slate-400">No differences found</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden text-[11px] font-mono">
      <div className="px-4 py-2 bg-slate-800 flex items-center gap-3 text-[10px] font-bold">
        <span className="text-red-400">
          <Minus className="w-3 h-3 inline" /> {diff.deletions.length + diff.changes.length} removed
        </span>
        <span className="text-emerald-400">
          <Plus className="w-3 h-3 inline" /> {diff.additions.length + diff.changes.length} added
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {allLines.map((line, idx) => (
          <div
            key={idx}
            className={cn(
              "px-4 py-0.5 border-l-2",
              line.type === "del"
                ? "bg-red-950/40 border-red-500 text-red-300"
                : line.type === "add"
                  ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                  : "border-transparent text-slate-400",
            )}
          >
            <span className="text-slate-600 select-none mr-3 inline-block w-6 text-right">
              {line.lineNum ?? ""}
            </span>
            <span className="mr-2 select-none">
              {line.type === "del" ? "-" : line.type === "add" ? "+" : " "}
            </span>
            {line.content.length > 120 ? line.content.slice(0, 120) + "…" : line.content}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Version Entry Card ──────────────────────────────────────────────────────

function VersionEntryCard({
  entry,
  isLatest,
  isSelected,
  isComparing,
  onSelect,
  onPreview,
  onRollback,
  onToggleCompare,
}: {
  entry: VersionEntry;
  isLatest: boolean;
  isSelected: boolean;
  isComparing: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onRollback: () => void;
  onToggleCompare: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "border rounded-xl overflow-hidden transition-all",
        isSelected
          ? "border-indigo-300 shadow-sm ring-1 ring-indigo-200"
          : isComparing
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-slate-200 hover:border-slate-300",
      )}
    >
      <button
        onClick={onSelect}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        {/* Timeline dot */}
        <div className="flex flex-col items-center pt-0.5">
          <div
            className={cn(
              "w-3 h-3 rounded-full shrink-0 border-2",
              isLatest
                ? "bg-indigo-500 border-indigo-300"
                : "bg-slate-300 border-slate-200",
            )}
          />
          <div className="w-px flex-1 bg-slate-200 mt-1" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-slate-900 truncate">
              {entry.label}
            </span>
            {isLatest && (
              <span className="text-[9px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                Latest
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="w-3 h-3" />
              {formatTimestamp(entry.timestamp)}
            </span>
            <span
              className={cn(
                "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
                getSourceColor(entry.source),
              )}
            >
              {entry.source}
            </span>
          </div>
        </div>

        {/* Compare checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare();
          }}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
            isComparing
              ? "bg-emerald-500 border-emerald-400"
              : "border-slate-300 hover:border-slate-400",
          )}
        >
          {isComparing && <Check className="w-3 h-3 text-white" />}
        </button>
      </button>

      {/* Actions bar */}
      <div className="flex items-center gap-2 px-3 pb-3 ml-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPreview}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors"
        >
          <Eye className="w-3 h-3" />
          Preview
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRollback}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-colors border border-amber-200"
        >
          <RotateCcw className="w-3 h-3" />
          Rollback
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function VersionHistoryPanel({
  versions,
  onRollback,
  onCompare,
}: VersionHistoryPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [previewEntry, setPreviewEntry] = useState<VersionEntry | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  const handleToggleCompare = useCallback(
    (id: string) => {
      setCompareIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (next.size < 2) {
          next.add(id);
        } else {
          // Replace the oldest selection
          const first = next.values().next().value;
          if (first !== undefined) next.delete(first);
          next.add(id);
        }
        return next;
      });
    },
    [],
  );

  const handleRunCompare = useCallback(() => {
    if (compareIds.size !== 2) return;
    const [id1, id2] = Array.from(compareIds);
    if (onCompare) {
      onCompare(id1, id2);
    }
    // Also compute diff internally
    const v1 = versions.find((v) => v.id === id1);
    const v2 = versions.find((v) => v.id === id2);
    if (v1 && v2) {
      const lines1 = `${v1.html}\n/* --- CSS --- */\n${v1.css}`.split("\n");
      const lines2 = `${v2.html}\n/* --- CSS --- */\n${v2.css}`.split("\n");
      const additions: string[] = [];
      const deletions: string[] = [];
      const changes: Array<{ old: string; new: string; line: number }> = [];
      const maxLen = Math.max(lines1.length, lines2.length);
      for (let i = 0; i < maxLen; i++) {
        const old = i < lines1.length ? lines1[i] : "";
        const cur = i < lines2.length ? lines2[i] : "";
        if (old !== cur) {
          if (old && !cur) deletions.push(`- ${old}`);
          else if (!old && cur) additions.push(`+ ${cur}`);
          else changes.push({ old, new: cur, line: i + 1 });
        }
      }
      setDiffResult({ additions, deletions, changes });
      setCompareMode(true);
    }
  }, [compareIds, versions, onCompare]);

  const handleRollback = useCallback(
    (entry: VersionEntry) => {
      onRollback(entry.html, entry.css);
    },
    [onRollback],
  );

  if (versions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center gap-3 py-16">
        <History className="w-8 h-8 text-slate-300" />
        <p className="text-sm font-semibold text-slate-400">
          No version history yet
        </p>
        <p className="text-xs text-slate-300">
          Versions are saved automatically as you work
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
            History
          </p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 shrink-0" />
            Version History
          </h2>
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {versions.length} version{versions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Compare bar ────────────────────────────────────── */}
      {compareIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5"
        >
          <span className="text-xs font-semibold text-emerald-700">
            {compareIds.size}/2 versions selected for comparison
          </span>
          <div className="flex items-center gap-2">
            {compareIds.size === 2 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRunCompare}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-colors"
              >
                <GitCompare className="w-3 h-3" />
                Compare
              </motion.button>
            )}
            <button
              onClick={() => {
                setCompareIds(new Set());
                setCompareMode(false);
                setDiffResult(null);
              }}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Diff result ────────────────────────────────────── */}
      <AnimatePresence>
        {diffResult && compareMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Diff
              </p>
              <DiffViewer diff={diffResult} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Timeline ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {[...versions].reverse().map((entry, idx) => (
          <VersionEntryCard
            key={entry.id}
            entry={entry}
            isLatest={idx === 0}
            isSelected={selectedId === entry.id}
            isComparing={compareIds.has(entry.id)}
            onSelect={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
            onPreview={() => setPreviewEntry(entry)}
            onRollback={() => handleRollback(entry)}
            onToggleCompare={() => handleToggleCompare(entry.id)}
          />
        ))}
      </div>

      {/* ── Preview modal ───────────────────────────────────── */}
      <AnimatePresence>
        {previewEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setPreviewEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {previewEntry.label}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {formatTimestamp(previewEntry.timestamp)} · {previewEntry.source}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewEntry(null)}
                  className="text-slate-400 hover:text-slate-700 transition-colors text-lg font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui}{${previewEntry.css}}</style></head><body>${previewEntry.html}</body></html>`}
                  className="w-full h-full min-h-[400px] bg-white"
                  sandbox="allow-same-origin"
                  title="Version Preview"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
