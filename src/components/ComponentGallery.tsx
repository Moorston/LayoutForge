/**
 * Component Gallery
 * Displays extracted UI components as cards with mini previews,
 * copy buttons, and a full-size preview modal.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers,
  Copy,
  Check,
  Eye,
  X,
  Wand2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedComponent } from "@/lib/types";
import { extractComponents } from "@/services/componentExtractor";

// ─── Props ───────────────────────────────────────────────────────────────────

interface ComponentGalleryProps {
  html: string;
  css: string;
}

// ─── Badge colors ────────────────────────────────────────────────────────────

const BADGE_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];

function getBadgeColor(index: number): string {
  return BADGE_COLORS[index % BADGE_COLORS.length];
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
      {/* Preview skeleton */}
      <div className="h-32 bg-slate-100" />
      {/* Content skeleton */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-slate-200" />
          <div className="w-24 h-3 rounded bg-slate-200" />
        </div>
        <div className="w-full h-3 rounded bg-slate-100 mb-1" />
        <div className="w-3/4 h-3 rounded bg-slate-100 mb-3" />
        <div className="flex gap-2">
          <div className="w-16 h-7 rounded-lg bg-slate-100" />
          <div className="w-16 h-7 rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Component Card ──────────────────────────────────────────────────────────

function ComponentCard({
  component,
  index,
  css,
  onPreview,
}: {
  component: ExtractedComponent;
  index: number;
  css: string;
  onPreview: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewHeight, setPreviewHeight] = useState(128);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(component.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [component.html]);

  const handleIframeLoad = useCallback(
    (e: React.SyntheticEvent<HTMLIFrameElement>) => {
      try {
        const iframe = e.currentTarget;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const h = Math.max(doc.body?.scrollHeight || 0, 128);
          setPreviewHeight(Math.min(h, 300));
        }
      } catch {
        // access error
      }
    },
    [],
  );

  // Wrap component HTML in a full document with the project CSS
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>${css.slice(0, 5000)}</style>
  <style>body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }</style>
</head>
<body>${component.html}</body>
</html>`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
    >
      {/* Mini preview */}
      <div className="relative h-32 overflow-hidden bg-white border-b border-slate-100">
        <iframe
          ref={iframeRef}
          srcDoc={fullHtml}
          onLoad={handleIframeLoad}
          title={`Preview: ${component.name}`}
          sandbox="allow-same-origin"
          className="w-full border-none pointer-events-none"
          style={{
            height: `${previewHeight}px`,
            transform: "scale(0.5)",
            transformOrigin: "top left",
            width: "200%",
          }}
        />
        {/* Gradient fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 pointer-events-none" />

        {/* Quick preview button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onPreview}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          title="Full preview"
        >
          <Eye className="w-3.5 h-3.5 text-slate-600" />
        </motion.button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name with badge */}
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              getBadgeColor(index),
            )}
          />
          <h3 className="text-sm font-bold text-slate-800 truncate">
            {component.name}
          </h3>
        </div>

        {/* Description */}
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-3">
          {component.description || "Extracted UI component"}
        </p>

        {/* Tailwind classes preview */}
        {component.classes && component.classes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {component.classes.slice(0, 3).map((cls) => (
              <span
                key={cls}
                className="px-1.5 py-0.5 text-[9px] font-mono text-slate-500 bg-slate-100 rounded"
              >
                {cls}
              </span>
            ))}
            {component.classes.length > 3 && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                +{component.classes.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border",
              copied
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "Copied" : "Copy HTML"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onPreview}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Preview
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Preview Modal ───────────────────────────────────────────────────────────

function PreviewModal({
  component,
  css,
  onClose,
}: {
  component: ExtractedComponent;
  css: string;
  onClose: () => void;
}) {
  const [iframeHeight, setIframeHeight] = useState(600);

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>${css.slice(0, 10000)}</style>
  <style>body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }</style>
</head>
<body>${component.html}</body>
</html>`;

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLIFrameElement>) => {
      try {
        const iframe = e.currentTarget;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const h = Math.max(doc.body?.scrollHeight || 0, 600);
          setIframeHeight(Math.min(h, 5000));
        }
      } catch {
        // access error
      }
    },
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
          <span className={cn("w-3 h-3 rounded-full", getBadgeColor(0))} />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              {component.name}
            </h2>
            <p className="text-[10px] text-slate-400 truncate">
              {component.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-auto bg-[#F3F4F6]">
          <iframe
            srcDoc={fullHtml}
            onLoad={handleLoad}
            title={`Full preview: ${component.name}`}
            sandbox="allow-same-origin"
            className="w-full border-none bg-white"
            style={{ height: `${iframeHeight}px` }}
          />
        </div>

        {/* Modal footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-white">
          <button
            onClick={() => {
              navigator.clipboard.writeText(component.html);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy HTML
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `<!-- Component: ${component.name} -->\n${component.html}`,
              );
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy with comment
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ComponentGallery({ html, css }: ComponentGalleryProps) {
  const [components, setComponents] = useState<ExtractedComponent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewComponent, setPreviewComponent] =
    useState<ExtractedComponent | null>(null);

  const handleExtract = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setComponents([]);

    try {
      const extracted = await extractComponents(html, css);
      setComponents(extracted.map((c) => ({ ...c, classes: [] })));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract components",
      );
    } finally {
      setIsLoading(false);
    }
  }, [html, css]);

  // ESC to close modal
  useEffect(() => {
    if (!previewComponent) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewComponent(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewComponent]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = previewComponent ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewComponent]);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
            Component Gallery
          </span>
          {components.length > 0 && (
            <span className="text-[10px] text-slate-400 font-mono">
              {components.length} components
            </span>
          )}

          {/* Extract button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExtract}
            disabled={isLoading}
            className={cn(
              "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            {isLoading ? "Extracting..." : "Extract Components"}
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-auto">
          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Component grid */}
          {!isLoading && components.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {components.map((comp, i) => (
                  <ComponentCard
                    key={`${comp.name}-${i}`}
                    component={comp}
                    index={i}
                    css={css}
                    onPreview={() => setPreviewComponent(comp)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && components.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Layers className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-xs font-bold mb-1">
                No components extracted yet
              </p>
              <p className="text-[10px] text-slate-400 max-w-xs text-center">
                Click "Extract Components" to analyze your HTML and split it
                into reusable UI components like Navbar, Hero, Features, etc.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            {components.length > 0
              ? `${components.length} components found`
              : "AI-powered component extraction"}
          </span>
          {components.length > 0 && (
            <button
              onClick={handleExtract}
              className="text-[10px] text-slate-500 hover:text-slate-900 font-bold transition-colors"
            >
              Re-extract
            </button>
          )}
        </div>
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewComponent && (
          <PreviewModal
            component={previewComponent}
            css={css}
            onClose={() => setPreviewComponent(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
