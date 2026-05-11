import React from "react";
import { motion } from "motion/react";
import {
  X,
  RotateCcw,
  Sun,
  Contrast,
  Maximize,
  Palette,
  Crop,
  Settings2,
  Undo2,
  Redo2,
  FlipHorizontal,
  FlipVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageEditorState } from "@/hooks/useImageEditor";

interface ProcessedAsset {
  description: string;
  dataUrl: string;
  originalDataUrl?: string;
  cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

interface ImageEditorOverlayProps {
  editor: ImageEditorState;
  originalImage: string;
  processedAssets: ProcessedAsset[];
  onApplyEdits: () => void;
}

/**
 * Full-screen overlay for editing image assets.
 * Supports two modes: filters (brightness, contrast, saturation, rotation, scale, flip)
 * and manual cropping (from the original reference image).
 */
export function ImageEditorOverlay({
  editor,
  originalImage,
  processedAssets,
  onApplyEdits,
}: ImageEditorOverlayProps) {
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
  } = editor;

  if (editingAssetIndex === null) return null;

  const currentAsset = processedAssets[editingAssetIndex];
  if (!currentAsset) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        className="bg-white rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] flex flex-col h-[90vh]"
      >
        <div className="flex flex-col h-full">
          {/* ── Header ── */}
          <div className="flex items-center justify-between p-8 border-b border-slate-50 shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex bg-slate-100 rounded-2xl p-1.5 ring-1 ring-slate-200/50">
                <button
                  onClick={() => setEditMode("filters")}
                  className={cn(
                    "px-6 py-2.5 text-[11px] font-bold rounded-xl transition-all flex items-center gap-2.5",
                    editMode === "filters"
                      ? "bg-white shadow-xl text-slate-900 ring-1 ring-black/5"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  <Sun className="w-3.5 h-3.5" />
                  FILTERS
                </button>
                {originalImage.startsWith("data:") && (
                  <button
                    onClick={() => setEditMode("crop")}
                    className={cn(
                      "px-6 py-2.5 text-[11px] font-bold rounded-xl transition-all flex items-center gap-2.5",
                      editMode === "crop"
                        ? "bg-white shadow-xl text-slate-900 ring-1 ring-black/5"
                        : "text-slate-400 hover:text-slate-600",
                    )}
                  >
                    <Crop className="w-3.5 h-3.5" />
                    MANUAL CROP
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 mr-4">
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="p-2.5 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-20 hover:bg-slate-50 rounded-xl"
                  title="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= editHistory.length - 1}
                  className="p-2.5 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-20 hover:bg-slate-50 rounded-xl"
                  title="Redo"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={cancelEdit}
                className="p-3 text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 hover:bg-slate-100 rounded-2xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Body: Preview + Controls ── */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* ── Preview Area ── */}
            <div className="flex-1 bg-slate-50 p-8 lg:p-12 flex items-center justify-center relative overflow-hidden group">
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(#cbd5e1 1.5px, transparent 0)",
                  backgroundSize: "32px 32px",
                }}
              />

              <div className="w-full h-full max-w-2xl max-h-[60vh] relative flex items-center justify-center">
                {editMode === "crop" ? (
                  <CropPreview
                    originalImage={originalImage}
                    cropBox={cropBox}
                    setCropBox={setCropBox}
                    editParams={editParams}
                    addToHistory={addToHistory}
                  />
                ) : (
                  <motion.div
                    layoutId={`asset-${editingAssetIndex}`}
                    className="bg-white p-8 rounded-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.2)] border border-slate-100 flex items-center justify-center transition-all duration-300"
                    style={{
                      transform: `rotate(${editParams.rotation}deg) scale(${editParams.scale * (editParams.flipX ? -1 : 1)}, ${editParams.scale * (editParams.flipY ? -1 : 1)})`,
                      filter: `brightness(${editParams.brightness}%) contrast(${editParams.contrast}%) saturate(${editParams.saturation}%)`,
                      transition:
                        "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.3s ease",
                    }}
                  >
                    <img
                      src={currentAsset.dataUrl}
                      className="max-w-full max-h-[45vh] object-contain rounded-lg"
                      alt="Asset preview"
                    />
                  </motion.div>
                )}
              </div>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-4 text-slate-600">
                <Settings2 className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  {currentAsset.description}
                </span>
              </div>
            </div>

            {/* ── Controls Area ── */}
            <div className="w-full md:w-[400px] bg-white p-10 flex flex-col gap-10 border-l border-slate-50 overflow-y-auto">
              {editMode === "filters" ? (
                <FilterControls
                  editParams={editParams}
                  setEditParams={setEditParams}
                  cropBox={cropBox}
                  setCropBox={setCropBox}
                  addToHistory={addToHistory}
                />
              ) : (
                <CropControls
                  cropBox={cropBox}
                  setCropBox={setCropBox}
                  editParams={editParams}
                  setEditParams={setEditParams}
                  addToHistory={addToHistory}
                />
              )}

              <div className="mt-auto space-y-4 pt-10 border-t border-slate-50">
                <button
                  onClick={onApplyEdits}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-bold shadow-2xl hover:opacity-90 transition-all active:scale-[0.98] uppercase tracking-widest"
                >
                  {editMode === "crop"
                    ? "Apply New Crop Region"
                    : "Save Filter Changes"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="w-full py-4 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                >
                  Discard Edits
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface CropPreviewProps {
  originalImage: string;
  cropBox: { x: number; y: number; width: number; height: number };
  setCropBox: React.Dispatch<
    React.SetStateAction<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  >;
  editParams: {
    rotation: number;
    scale: number;
    brightness: number;
    contrast: number;
    saturation: number;
    flipX: boolean;
    flipY: boolean;
  };
  addToHistory: (
    params: CropPreviewProps["editParams"],
    crop: CropPreviewProps["cropBox"],
  ) => void;
}

function CropPreview({
  originalImage,
  cropBox,
  setCropBox,
  editParams,
  addToHistory,
}: CropPreviewProps) {
  return (
    <div className="relative w-full h-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 overflow-hidden">
      <div className="relative w-full h-full">
        <img
          src={originalImage}
          className="w-full h-full object-contain pointer-events-none select-none grayscale opacity-30"
          alt="Original to crop"
        />
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            onDrag={(e, info) => {
              const rect = (
                e.currentTarget as HTMLElement
              ).parentElement?.getBoundingClientRect();
              if (!rect) return;
              const dx = (info.delta.x / rect.width) * 100;
              const dy = (info.delta.y / rect.height) * 100;
              setCropBox((prev) => ({
                ...prev,
                x: Math.max(0, Math.min(100 - prev.width, prev.x + dx)),
                y: Math.max(0, Math.min(100 - prev.height, prev.y + dy)),
              }));
            }}
            onDragEnd={() => addToHistory(editParams, cropBox)}
            style={{
              left: `${cropBox.x}%`,
              top: `${cropBox.y}%`,
              width: `${cropBox.width}%`,
              height: `${cropBox.height}%`,
            }}
            className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(255,255,255,0.7)] pointer-events-auto cursor-move group/crop"
          >
            {/* Grid lines (rule of thirds) */}
            <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-difference">
              <div className="absolute top-1/3 w-full h-px bg-white" />
              <div className="absolute top-2/3 w-full h-px bg-white" />
              <div className="absolute left-1/3 h-full w-px bg-white" />
              <div className="absolute left-2/3 h-full w-px bg-white" />
            </div>
            <div className="absolute inset-0 border border-white/50 pointer-events-none" />

            {/* Resize handles — NW, NE, SW, SE */}
            <div className="absolute -inset-1 pointer-events-none">
              {(
                [
                  {
                    className: "-top-1 -left-1 cursor-nw-resize",
                    resize: (
                      dx: number,
                      dy: number,
                      prev: CropPreviewProps["cropBox"],
                    ) => ({
                      x: Math.max(
                        0,
                        Math.min(prev.x + prev.width - 1, prev.x + dx),
                      ),
                      y: Math.max(
                        0,
                        Math.min(prev.y + prev.height - 1, prev.y + dy),
                      ),
                      width: Math.max(1, prev.width - dx),
                      height: Math.max(1, prev.height - dy),
                    }),
                  },
                  {
                    className: "-top-1 -right-1 cursor-ne-resize",
                    resize: (
                      dx: number,
                      dy: number,
                      prev: CropPreviewProps["cropBox"],
                    ) => ({
                      ...prev,
                      y: Math.max(
                        0,
                        Math.min(prev.y + prev.height - 1, prev.y + dy),
                      ),
                      width: Math.max(1, prev.width + dx),
                      height: Math.max(1, prev.height - dy),
                    }),
                  },
                  {
                    className: "-bottom-1 -left-1 cursor-sw-resize",
                    resize: (
                      dx: number,
                      dy: number,
                      prev: CropPreviewProps["cropBox"],
                    ) => ({
                      ...prev,
                      x: Math.max(
                        0,
                        Math.min(prev.x + prev.width - 1, prev.x + dx),
                      ),
                      width: Math.max(1, prev.width - dx),
                      height: Math.max(1, prev.height + dy),
                    }),
                  },
                  {
                    className: "-bottom-1 -right-1 cursor-se-resize",
                    resize: (
                      dx: number,
                      dy: number,
                      prev: CropPreviewProps["cropBox"],
                    ) => ({
                      ...prev,
                      width: Math.max(1, prev.width + dx),
                      height: Math.max(1, prev.height + dy),
                    }),
                  },
                ] as const
              ).map((handle, idx) => (
                <motion.div
                  key={idx}
                  drag
                  dragMomentum={false}
                  dragElastic={0}
                  onDrag={(e, info) => {
                    const rect = (e.target as HTMLElement)
                      .closest(".relative.w-full.h-full")
                      ?.getBoundingClientRect();
                    if (!rect) return;
                    const dx = (info.delta.x / rect.width) * 100;
                    const dy = (info.delta.y / rect.height) * 100;
                    setCropBox((prev) => handle.resize(dx, dy, prev));
                  }}
                  onDragEnd={() => addToHistory(editParams, cropBox)}
                  className={`absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto shadow-md ${handle.className}`}
                />
              ))}
            </div>

            {/* Cropped preview of the original image */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={originalImage}
                style={{
                  position: "absolute",
                  width: `${10000 / cropBox.width}%`,
                  height: `${10000 / cropBox.height}%`,
                  left: `${-cropBox.x * (100 / cropBox.width)}%`,
                  top: `${-cropBox.y * (100 / cropBox.height)}%`,
                  maxWidth: "none",
                  maxHeight: "none",
                }}
                className="object-contain"
                alt="Crop visual"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Controls ────────────────────────────────────────────────────────

interface ControlProps {
  editParams: {
    rotation: number;
    scale: number;
    brightness: number;
    contrast: number;
    saturation: number;
    flipX: boolean;
    flipY: boolean;
  };
  setEditParams: React.Dispatch<
    React.SetStateAction<{
      rotation: number;
      scale: number;
      brightness: number;
      contrast: number;
      saturation: number;
      flipX: boolean;
      flipY: boolean;
    }>
  >;
  cropBox: { x: number; y: number; width: number; height: number };
  setCropBox: React.Dispatch<
    React.SetStateAction<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  >;
  addToHistory: (
    params: ControlProps["editParams"],
    crop: ControlProps["cropBox"],
  ) => void;
}

function FilterControls({
  editParams,
  setEditParams,
  cropBox,
  addToHistory,
}: ControlProps) {
  const sliderCls =
    "w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900";

  const sliderControls = [
    {
      icon: RotateCcw,
      label: "Rotation",
      value: `${editParams.rotation}°`,
      min: 0,
      max: 360,
      step: 1,
      current: editParams.rotation,
      key: "rotation" as const,
    },
    {
      icon: Maximize,
      label: "Scale",
      value: `${editParams.scale.toFixed(1)}x`,
      min: 0.5,
      max: 2,
      step: 0.1,
      current: editParams.scale,
      key: "scale" as const,
    },
    {
      icon: Sun,
      label: "Brightness",
      value: `${editParams.brightness}%`,
      min: 50,
      max: 150,
      step: 1,
      current: editParams.brightness,
      key: "brightness" as const,
    },
    {
      icon: Contrast,
      label: "Contrast",
      value: `${editParams.contrast}%`,
      min: 50,
      max: 150,
      step: 1,
      current: editParams.contrast,
      key: "contrast" as const,
    },
    {
      icon: Palette,
      label: "Saturation",
      value: `${editParams.saturation}%`,
      min: 0,
      max: 200,
      step: 1,
      current: editParams.saturation,
      key: "saturation" as const,
    },
  ];

  return (
    <div className="space-y-10">
      {sliderControls.map(
        ({ icon: Icon, label, value, min, max, step, current, key }) => (
          <div key={key} className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </label>
              <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg ring-1 ring-slate-200/50">
                {value}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={current}
              onChange={(e) =>
                setEditParams((prev) => ({
                  ...prev,
                  [key]:
                    step < 1
                      ? parseFloat(e.target.value)
                      : parseInt(e.target.value),
                }))
              }
              onPointerUp={() => addToHistory(editParams, cropBox)}
              className={sliderCls}
            />
          </div>
        ),
      )}

      {/* Flip buttons */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "flipX" as const, icon: FlipHorizontal, label: "Flip X" },
          { key: "flipY" as const, icon: FlipVertical, label: "Flip Y" },
        ].map(({ key, icon: FlipIcon, label }) => (
          <button
            key={key}
            onClick={() => {
              const newParams = { ...editParams, [key]: !editParams[key] };
              setEditParams(newParams);
              addToHistory(newParams, cropBox);
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest",
              editParams[key]
                ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                : "bg-white text-slate-500 border-slate-100 hover:border-slate-200",
            )}
          >
            <FlipIcon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Crop Controls ──────────────────────────────────────────────────────────

function CropControls({
  cropBox,
  setCropBox,
  editParams,
  addToHistory,
}: ControlProps) {
  return (
    <div className="space-y-10">
      <div className="p-8 bg-blue-50/50 border border-blue-100/50 rounded-3xl space-y-3">
        <div className="flex items-center gap-3 text-blue-600">
          <Crop className="w-4 h-4" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest">
            Manual Cropping
          </h4>
        </div>
        <p className="text-xs text-blue-700/70 font-medium leading-relaxed">
          Drag the focus box to select a new area from the original reference
          image.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "X (%)", key: "x" as const, max: () => 100 - cropBox.width },
          {
            label: "Y (%)",
            key: "y" as const,
            max: () => 100 - cropBox.height,
          },
          {
            label: "Width (%)",
            key: "width" as const,
            max: () => 100 - cropBox.x,
          },
          {
            label: "Height (%)",
            key: "height" as const,
            max: () => 100 - cropBox.y,
          },
        ].map(({ label, key, max }) => (
          <div key={key} className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {label}
            </label>
            <input
              type="number"
              value={Math.round(cropBox[key])}
              onChange={(e) =>
                setCropBox((prev) => ({
                  ...prev,
                  [key]: Math.max(
                    key === "width" || key === "height" ? 1 : 0,
                    Math.min(max(), parseInt(e.target.value) || 0),
                  ),
                }))
              }
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          const resetCrop = { x: 10, y: 10, width: 80, height: 80 };
          setCropBox(resetCrop);
          addToHistory(editParams, resetCrop);
        }}
        className="w-full py-4 text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest border border-slate-100 rounded-2xl hover:bg-slate-50"
      >
        Reset Focus Box
      </button>
    </div>
  );
}
