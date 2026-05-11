import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Smartphone,
  Tablet,
  Monitor,
  Tv,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DEVICE_PRESETS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DevicePreviewProps {
  iframeContent: string;
  className?: string;
}

type Orientation = "portrait" | "landscape";

const DEVICE_ICONS = [
  <Smartphone key="sm" className="w-4 h-4" />,
  <Tablet key="tab" className="w-4 h-4" />,
  <Monitor key="mon" className="w-4 h-4" />,
  <Tv key="tv" className="w-4 h-4" />,
];

// ── Browser chrome mockup ─────────────────────────────────────────────────────

function BrowserChrome({
  url,
  onFullscreen,
  isFullscreen,
}: {
  url: string;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
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
      {onFullscreen && (
        <button
          onClick={onFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="shrink-0 p-1 rounded hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-900"
        >
          {isFullscreen ? (
            <X className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

// ── Phone frame outline ───────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-block">
      <div className="absolute -inset-3 rounded-[2.5rem] border-4 border-slate-300 pointer-events-none z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 bg-slate-300 rounded-b-xl z-20" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-slate-300 rounded-full z-20" />
      {children}
    </div>
  );
}

// ── Controls bar (shared between normal & fullscreen) ─────────────────────────

interface ControlsBarProps {
  activeDevice: number;
  zoom: number;
  orientation: Orientation;
  isMobile: boolean;
  frameW: number;
  frameH: number;
  isFullscreen: boolean;
  onDeviceChange: (i: number) => void;
  onZoom: (delta: number) => void;
  onOrientationToggle: () => void;
  onFullscreen: () => void;
}

function ControlsBar({
  activeDevice,
  zoom,
  orientation,
  isMobile,
  frameW,
  frameH,
  isFullscreen,
  onDeviceChange,
  onZoom,
  onOrientationToggle,
  onFullscreen,
}: ControlsBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-wrap shrink-0",
        isFullscreen ? "bg-slate-900" : "bg-white",
      )}
    >
      {/* Device selector */}
      <div
        className={cn(
          "flex gap-1 rounded-xl p-1 flex-1 min-w-0",
          isFullscreen ? "bg-slate-800" : "bg-slate-100",
        )}
      >
        {DEVICE_PRESETS.map((d, i) => (
          <motion.button
            key={d.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDeviceChange(i)}
            title={`${d.label} (${d.width}px)`}
            className={cn(
              "flex items-center justify-center gap-1.5 flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all duration-200",
              activeDevice === i
                ? "bg-slate-900 text-white shadow-sm"
                : isFullscreen
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-400 hover:text-slate-700",
            )}
          >
            {DEVICE_ICONS[i]}
            <span className="hidden sm:inline">{d.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Orientation toggle */}
      {isMobile && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOrientationToggle}
          title={`Switch to ${orientation === "portrait" ? "landscape" : "portrait"}`}
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold transition-all",
            orientation === "landscape"
              ? "bg-slate-900 text-white border-slate-900"
              : isFullscreen
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline capitalize">{orientation}</span>
        </motion.button>
      )}

      {/* Zoom controls */}
      <div
        className={cn(
          "flex items-center gap-1 rounded-xl p-1",
          isFullscreen ? "bg-slate-800" : "bg-slate-100",
        )}
      >
        <button
          onClick={() => onZoom(-10)}
          disabled={zoom <= 25}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ZoomOut
            className={cn(
              "w-3.5 h-3.5",
              isFullscreen ? "text-slate-300" : "text-slate-600",
            )}
          />
        </button>
        <span
          className={cn(
            "text-xs font-bold tabular-nums w-10 text-center",
            isFullscreen ? "text-slate-200" : "text-slate-700",
          )}
        >
          {zoom}%
        </span>
        <button
          onClick={() => onZoom(10)}
          disabled={zoom >= 200}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ZoomIn
            className={cn(
              "w-3.5 h-3.5",
              isFullscreen ? "text-slate-300" : "text-slate-600",
            )}
          />
        </button>
      </div>

      {/* Dimension badge */}
      <span
        className={cn(
          "text-[10px] font-mono font-semibold rounded-md px-2 py-1 border hidden md:block",
          isFullscreen
            ? "text-slate-400 bg-slate-800 border-slate-700"
            : "text-slate-500 bg-white border-slate-200",
        )}
      >
        {frameW} × {frameH}
      </span>

      {/* Fullscreen toggle */}
      <button
        onClick={onFullscreen}
        title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen preview"}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
          isFullscreen
            ? "bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900",
        )}
      >
        {isFullscreen ? (
          <X className="w-3.5 h-3.5" />
        ) : (
          <Maximize2 className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {isFullscreen ? "Exit" : "Fullscreen"}
        </span>
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DevicePreview({
  iframeContent,
  className,
}: DevicePreviewProps) {
  const [activeDevice, setActiveDevice] = useState<number>(2);
  const [zoom, setZoom] = useState<number>(100);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(800);

  const preset = DEVICE_PRESETS[activeDevice];
  const isMobile = preset.width <= 768;

  const rawW = preset.width;
  const rawH = preset.height ?? 800;
  const frameW = orientation === "landscape" && isMobile ? rawH : rawW;
  const frameH = orientation === "landscape" && isMobile ? rawW : rawH;

  const scaleFactor = zoom / 100;

  const changeZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(200, Math.max(25, z + delta)));
  }, []);

  const toggleOrientation = useCallback(() => {
    setOrientation((o) => (o === "portrait" ? "landscape" : "portrait"));
  }, []);

  const handleDeviceChange = useCallback((i: number) => {
    setActiveDevice(i);
    setOrientation("portrait");
    // Reset zoom to a sensible default for each device
    if (i === 0)
      setZoom(100); // mobile – 1:1
    else if (i === 1)
      setZoom(80); // tablet
    else setZoom(100); // desktop / wide
  }, []);

  // ESC to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // Reset content height when iframe content or device changes
  useEffect(() => {
    setContentHeight(rawH);
  }, [iframeContent, rawH, activeDevice, orientation]);

  // Auto-resize iframe height to fit content
  const handleIframeLoad = useCallback(
    (e: React.SyntheticEvent<HTMLIFrameElement>) => {
      try {
        const iframe = e.currentTarget;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const bodyH = doc.body?.scrollHeight || 0;
          const docH = doc.documentElement?.scrollHeight || 0;
          const h = Math.max(bodyH, docH, rawH);
          setContentHeight(Math.min(h, 8000));
        }
      } catch {
        // access error — keep default height
      }
    },
    [rawH],
  );

  const effectiveH = Math.max(contentHeight, frameH);

  const iframeEl = (
    <iframe
      title="Preview"
      srcDoc={iframeContent}
      scrolling="yes"
      onLoad={handleIframeLoad}
      style={{
        width: `${frameW}px`,
        height: `${effectiveH}px`,
        border: "none",
        display: "block",
        background: "#fff",
      }}
    />
  );

  const previewFrame = isMobile ? (
    <PhoneFrame>
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xl">
        <BrowserChrome
          url="replicated-layout.html"
          onFullscreen={() => setIsFullscreen((v) => !v)}
          isFullscreen={isFullscreen}
        />
        {iframeEl}
      </div>
    </PhoneFrame>
  ) : (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xl">
      <BrowserChrome
        url="replicated-layout.html"
        onFullscreen={() => setIsFullscreen((v) => !v)}
        isFullscreen={isFullscreen}
      />
      {iframeEl}
    </div>
  );

  const controlsProps: ControlsBarProps = {
    activeDevice,
    zoom,
    orientation,
    isMobile,
    frameW,
    frameH,
    isFullscreen,
    onDeviceChange: handleDeviceChange,
    onZoom: changeZoom,
    onOrientationToggle: toggleOrientation,
    onFullscreen: () => setIsFullscreen((v) => !v),
  };

  return (
    <>
      {/* ── Normal (embedded) preview ──────────────────────────── */}
      <div
        className={cn(
          "bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col",
          className,
        )}
      >
        <ControlsBar {...controlsProps} />

        {/* Preview scroll area */}
        <div
          ref={containerRef}
          className="overflow-auto bg-[#F3F4F6]"
          style={{ maxHeight: "78vh" }}
        >
          <div
            className="flex justify-center py-8"
            style={{ minWidth: frameW * scaleFactor + 64 }}
          >
            <div
              style={{
                transform: `scale(${scaleFactor})`,
                transformOrigin: "top center",
                width: frameW,
                marginBottom: frameH * (scaleFactor - 1),
              }}
            >
              {previewFrame}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fullscreen overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            key="fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col"
          >
            {/* Fullscreen controls */}
            <ControlsBar {...controlsProps} />

            {/* Fullscreen preview area */}
            <div className="flex-1 overflow-auto bg-[#111]">
              <div
                className="flex justify-center py-8 min-h-full"
                style={{ minWidth: frameW * scaleFactor + 64 }}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                  style={{
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: "top center",
                    width: frameW,
                    marginBottom: frameH * (scaleFactor - 1),
                  }}
                >
                  {previewFrame}
                </motion.div>
              </div>
            </div>

            {/* ESC hint */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-[11px] font-bold text-white/60 uppercase tracking-widest pointer-events-none"
            >
              Press ESC to exit fullscreen
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
