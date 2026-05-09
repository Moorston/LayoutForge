import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Image as ImageIcon,
  Play,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { replicateLayout } from "@/services/mimoService";
import type { BatchItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BatchUploadProps {
  onBatchComplete: (items: BatchItem[]) => void;
  brandKitContext?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Read a File as a base64 data URL, return { base64, mimeType } */
async function fileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:<mimeType>;base64,<base64data>
      const comma = result.indexOf(",");
      const base64 = result.slice(comma + 1);
      resolve({ base64, mimeType: file.type || "image/png" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Read a File as a data URL preview string */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BatchItem["status"] }) {
  const map: Record<
    BatchItem["status"],
    { label: string; cls: string; icon: React.ReactNode }
  > = {
    pending: {
      label: "Pending",
      cls: "bg-slate-100 text-slate-500 border-slate-200",
      icon: null,
    },
    processing: {
      label: "Processing",
      cls: "bg-blue-50 text-blue-600 border-blue-100",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    done: {
      label: "Done",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: <Check className="w-3 h-3" />,
    },
    error: {
      label: "Error",
      cls: "bg-red-50 text-red-600 border-red-100",
      icon: <AlertCircle className="w-3 h-3" />,
    },
  };
  const { label, cls, icon } = map[status];
  return (
    <span
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
        cls,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

// ── Code viewer modal ─────────────────────────────────────────────────────────

function CodeModal({
  item,
  onClose,
}: {
  item: BatchItem;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"html" | "css">("html");
  const code =
    tab === "html" ? (item.result?.html ?? "") : (item.result?.css ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
              Result
            </p>
            <p className="text-sm font-bold text-slate-900 truncate max-w-[400px]">
              {item.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {(["html", "css"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                tab === t
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
              )}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <pre className="bg-slate-950 text-emerald-300 text-xs font-mono p-4 rounded-xl overflow-auto leading-relaxed whitespace-pre-wrap break-all">
            {code || "(empty)"}
          </pre>
        </div>

        {/* Explanation */}
        {item.result?.explanation && (
          <div className="px-5 pb-4">
            <p className="text-xs text-slate-500 leading-relaxed italic border-t border-slate-100 pt-3">
              {item.result.explanation}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── File card ─────────────────────────────────────────────────────────────────

function FileCard({
  item,
  onRemove,
  onViewCode,
}: {
  key?: React.Key;
  item: BatchItem;
  onRemove: () => void;
  onViewCode: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-slate-100 flex items-center justify-center overflow-hidden">
        {item.previewUrl ? (
          <img
            src={item.previewUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-slate-300" />
        )}

        {/* Processing overlay */}
        {item.status === "processing" && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        {/* Done overlay */}
        {item.status === "done" && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* Remove button (only pending) */}
        {item.status === "pending" && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center shadow hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all"
          >
            <X className="w-3 h-3 text-slate-500" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5">
        <p
          className="text-xs font-bold text-slate-900 truncate"
          title={item.name}
        >
          {item.name}
        </p>
        <p className="text-[10px] text-slate-400 font-medium">
          {formatBytes(item.file.size)}
        </p>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <StatusBadge status={item.status} />

          {item.status === "done" && (
            <button
              onClick={onViewCode}
              className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
            >
              View Code
            </button>
          )}
        </div>

        {/* Error message */}
        {item.status === "error" && item.error && (
          <p className="text-[10px] text-red-500 leading-snug mt-0.5 line-clamp-2">
            {item.error}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BatchUpload({
  onBatchComplete,
  brandKitContext,
}: BatchUploadProps) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [viewingItem, setViewingItem] = useState<BatchItem | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── File ingestion ─────────────────────────────────────────────────────────

  const ingestFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, Math.max(0, 10 - items.length)); // cap at 10 total

      if (imageFiles.length === 0) return;

      const newItems: BatchItem[] = await Promise.all(
        imageFiles.map(async (file) => {
          let previewUrl: string | undefined;
          try {
            previewUrl = await fileToDataUrl(file);
          } catch {
            previewUrl = undefined;
          }
          return {
            id: uid(),
            name: file.name,
            file,
            status: "pending" as const,
            previewUrl,
          };
        }),
      );

      setItems((prev) => [...prev, ...newItems]);
    },
    [items.length],
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    void ingestFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void ingestFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  // ── Processing ─────────────────────────────────────────────────────────────

  const processAll = async () => {
    const pending = items.filter((i) => i.status === "pending");
    if (pending.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProcessedCount(0);

    let doneCount = 0;

    for (const item of pending) {
      // Mark as processing
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "processing" } : i,
        ),
      );

      try {
        const { base64, mimeType } = await fileToBase64(item.file);
        const result = await replicateLayout(base64, mimeType, brandKitContext);

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "done",
                  result: {
                    html: result.html,
                    css: result.css,
                    explanation: result.explanation,
                  },
                }
              : i,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "error", error: message } : i,
          ),
        );
      }

      doneCount++;
      setProcessedCount(doneCount);

      // Throttle to avoid rate limits
      if (doneCount < pending.length) await sleep(600);
    }

    setIsProcessing(false);

    // Notify parent with final state
    setItems((final) => {
      onBatchComplete(final);
      return final;
    });
  };

  // ── Download all ───────────────────────────────────────────────────────────

  const downloadAll = async () => {
    const done = items.filter((i) => i.status === "done" && i.result);
    for (let idx = 0; idx < done.length; idx++) {
      const item = done[idx];
      if (!item.result) continue;

      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${item.name.replace(/\.[^.]+$/, "")}</title>
  <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
  <style>
${item.result.css}
  </style>
</head>
<body>
${item.result.html}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name.replace(/\.[^.]+$/, "") + ".html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Stagger downloads to avoid browser blocking
      if (idx < done.length - 1) await sleep(500);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const totalDone = items.filter(
    (i) => i.status === "done" || i.status === "error",
  ).length;
  const completedItems = items.filter((i) => i.status === "done");
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const allFinished =
    items.length > 0 &&
    items.every((i) => i.status === "done" || i.status === "error");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Batch
        </p>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 shrink-0" />
          Batch Processing
        </h2>
      </div>

      {/* ── Drop zone ──────────────────────────────────────── */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-2xl px-6 py-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300",
          dragActive
            ? "border-slate-900 bg-slate-50 scale-[1.01]"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60",
          items.length >= 10 && "opacity-50 pointer-events-none",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => items.length < 10 && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload images for batch processing"
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileInput}
        />

        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300",
            dragActive ? "bg-slate-900 scale-110" : "bg-slate-900",
          )}
        >
          <Upload className="w-5 h-5 text-white" />
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-slate-900">
            {items.length >= 10
              ? "Maximum 10 files reached"
              : "Drop images here or click to browse"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            JPG, PNG, WebP · Up to 10 files · {items.length}/10 queued
          </p>
        </div>
      </div>

      {/* ── File queue ─────────────────────────────────────── */}
      {items.length > 0 && (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={processAll}
                disabled={isProcessing || pendingCount === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-slate-900/10"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isProcessing ? `Processing ${processedCount}…` : "Process All"}
              </motion.button>

              <button
                onClick={() => {
                  setItems([]);
                  setProcessedCount(0);
                }}
                disabled={isProcessing}
                className="px-4 py-2.5 border border-slate-200 text-sm font-semibold text-slate-600 rounded-xl hover:border-slate-300 hover:text-slate-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>

            {/* Progress indicator */}
            {items.length > 0 && (
              <span className="text-xs font-bold text-slate-500 tabular-nums">
                {totalDone} / {items.length} processed
              </span>
            )}
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-slate-900 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${items.length > 0 ? (processedCount / items.filter((i) => i.status !== "pending" || isProcessing).length) * 100 : 0}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {/* Grid of cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AnimatePresence>
              {items.map((item) => (
                <FileCard
                  key={item.id}
                  item={item}
                  onRemove={() =>
                    setItems((prev) => prev.filter((i) => i.id !== item.id))
                  }
                  onViewCode={() => setViewingItem(item)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Download all button (shown when some done) */}
          {completedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2"
            >
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Results
                  </p>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {completedItems.length} file
                    {completedItems.length !== 1 ? "s" : ""} ready
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadAll}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  Download All ({completedItems.length}) as HTML Files
                </motion.button>

                {allFinished && (
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Files download individually with 500ms intervals to avoid
                    browser blocking.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <p className="text-xs text-slate-400">
            Add up to{" "}
            <span className="font-bold text-slate-600">10 screenshots</span> to
            replicate all layouts at once.
          </p>
        </div>
      )}

      {/* ── Code viewer modal ──────────────────────────────── */}
      <AnimatePresence>
        {viewingItem && (
          <CodeModal item={viewingItem} onClose={() => setViewingItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
