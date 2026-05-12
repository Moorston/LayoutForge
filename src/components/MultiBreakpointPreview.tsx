/**
 * Multi-Breakpoint Preview
 * Shows 3 iframes side by side — Mobile (375px), Tablet (768px), Desktop (1280px)
 * with browser chrome mockup headers and shared zoom controls.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  Tablet,
  Monitor,
  ZoomIn,
  ZoomOut,
  Columns3,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface MultiBreakpointPreviewProps {
  iframeContent: string;
  className?: string;
}

// ─── Breakpoint definitions ──────────────────────────────────────────────────

interface Breakpoint {
  label: string;
  icon: React.ReactNode;
  width: number;
  height: number;
}

const BREAKPOINTS: Breakpoint[] = [
  { label: "Mobile", icon: <Smartphone className="w-3.5 h-3.5" />, width: 375, height: 812 },
  { label: "Tablet", icon: <Tablet className="w-3.5 h-3.5" />, width: 768, height: 1024 },
  { label: "Desktop", icon: <Monitor className="w-3.5 h-3.5" />, width: 1280, height: 800 },
];

// ─── Browser Chrome Mockup ───────────────────────────────────────────────────

function BrowserChrome({
  label,
  width,
  url,
}: {
  label: string;
  width: number;
  url: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 h-9 bg-slate-100 border-b border-slate-200 shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-amber-400" />
        <span className="w-3 h-3 rounded-full bg-emerald-400" />
      </div>
      <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-md px-2 h-5 min-w-0">
        <span className="text-[10px] text-slate-400 truncate font-mono">
          {url}
        </span>
      </div>
      <span className="text-[10px] font-mono text-slate-400 shrink-0 hidden sm:block">
        {width}px
      </span>
    </div>
  );
}

// ─── Single Breakpoint Preview ───────────────────────────────────────────────

function BreakpointPreview({
  breakpoint,
  iframeContent,
  zoom,
}: {
  breakpoint: Breakpoint;
  iframeContent: string;
  zoom: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentHeight, setContentHeight] = useState(breakpoint.height);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLIFrameElement>) => {
      try {
        const iframe = e.currentTarget;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const bodyH = doc.body?.scrollHeight || 0;
          const docH = doc.documentElement?.scrollHeight || 0;
          setContentHeight(Math.max(bodyH, docH, breakpoint.height));
        }
      } catch {
        // access error — keep default
      }
    },
    [breakpoint.height],
  );

  const scaleFactor = zoom / 100;

  return (
    <div className="flex flex-col min-w-0">
      {/* Device label */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-100">
        {breakpoint.icon}
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
          {breakpoint.label}
        </span>
      </div>

      {/* Frame container */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex justify-center py-4"
          style={{ minWidth: breakpoint.width * scaleFactor + 32 }}
        >
          <div
            style={{
              transform: `scale(${scaleFactor})`,
              transformOrigin: "top center",
              width: breakpoint.width,
              marginBottom: contentHeight * (scaleFactor - 1),
            }}
          >
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg">
              <BrowserChrome
                label={breakpoint.label}
                width={breakpoint.width}
                url="preview.html"
              />
              <iframe
                ref={iframeRef}
                title={`${breakpoint.label} preview`}
                srcDoc={iframeContent}
                onLoad={handleLoad}
                scrolling="yes"
                style={{
                  width: `${breakpoint.width}px`,
                  height: `${contentHeight}px`,
                  border: "none",
                  display: "block",
                  background: "#fff",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MultiBreakpointPreview({
  iframeContent,
  className,
}: MultiBreakpointPreviewProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [zoom, setZoom] = useState(60);

  const changeZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(150, Math.max(25, z + delta)));
  }, []);

  // ESC to hide
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) setIsVisible(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible]);

  return (
    <>
      {/* Toggle button */}
      {!isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsVisible(true)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200",
            "bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300",
            "text-xs font-bold transition-all shadow-sm",
          )}
        >
          <Columns3 className="w-3.5 h-3.5" />
          Multi-breakpoint
        </motion.button>
      )}

      {/* Main panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col",
              className,
            )}
          >
            {/* Controls bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white shrink-0">
              <Columns3 className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                Multi-breakpoint Preview
              </span>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 rounded-xl p-1 bg-slate-100 ml-auto">
                <button
                  onClick={() => changeZoom(-10)}
                  disabled={zoom <= 25}
                  className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <span className="text-xs font-bold tabular-nums w-10 text-center text-slate-700">
                  {zoom}%
                </span>
                <button
                  onClick={() => changeZoom(10)}
                  disabled={zoom >= 150}
                  className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsVisible(false)}
                title="Hide multi-breakpoint view"
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Iframes container */}
            <div className="overflow-auto bg-[#F3F4F6]">
              <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {BREAKPOINTS.map((bp) => (
                  <BreakpointPreview
                    key={bp.label}
                    breakpoint={bp}
                    iframeContent={iframeContent}
                    zoom={zoom}
                  />
                ))}
              </div>
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-center px-4 py-2 border-t border-slate-100 bg-slate-50">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                Press ESC to hide · {BREAKPOINTS.map((b) => `${b.label} ${b.width}px`).join(" · ")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
