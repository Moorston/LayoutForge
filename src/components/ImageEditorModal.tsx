import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sun,
  Crop,
  Undo2,
  Redo2,
  X,
  Settings2,
  RotateCcw,
  Maximize,
  Contrast,
  Palette,
  FlipHorizontal,
  FlipVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  EditParams,
  CropBox,
  EditSnapshot,
} from "@/hooks/useImageEditor";

interface ProcessedAsset {
  description: string;
  dataUrl: string;
  originalDataUrl?: string;
  cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

interface ImageEditorModalProps {
  // Asset data
  asset: ProcessedAsset;
  originalImage: string;

  // Edit state from useImageEditor
  editMode: 'filters' | 'crop';
  setEditMode: (mode: 'filters' | 'crop') => void;
  editParams: EditParams;
  setEditParams: React.Dispatch<React.SetStateAction<EditParams>>;
  cropBox: CropBox;
  setCropBox: React.Dispatch<React.SetStateAction<CropBox>>;
  editHistory: EditSnapshot[];
  historyIndex: number;
  addToHistory: (params: EditParams, crop: CropBox) => void;
  cancelEdit: () => void;
  undo: () => void;
  redo: () => void;
  resetCrop: () => void;

  // Apply edits callback
  onApply: () => void;
}

export function ImageEditorModal({
  asset,
  originalImage,
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
  resetCrop,
  onApply,
}: ImageEditorModalProps) {
  return (
    <AnimatePresence>
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

            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              {/* Preview Area */}
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

                              const dx =
                                (info.delta.x / rect.width) * 100;
                              const dy =
                                (info.delta.y / rect.height) * 100;

                              setCropBox((prev) => ({
                                ...prev,
                                x: Math.max(
                                  0,
                                  Math.min(100 - prev.width, prev.x + dx),
                                ),
                                y: Math.max(
                                  0,
                                  Math.min(
                                    100 - prev.height,
                                    prev.y + dy,
                                  ),
                                ),
                              }));
                            }}
                            onDragEnd={() =>
                              addToHistory(editParams, cropBox)
                            }
                            style={{
                              left: `${cropBox.x}%`,
                              top: `${cropBox.y}%`,
                              width: `${cropBox.width}%`,
                              height: `${cropBox.height}%`,
                            }}
                            className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(255,255,255,0.7)] pointer-events-auto cursor-move group/crop"
                          >
                            {/* Grid Lines */}
                            <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-difference">
                              <div className="absolute top-1/3 w-full h-px bg-white" />
                              <div className="absolute top-2/3 w-full h-px bg-white" />
                              <div className="absolute left-1/3 h-full w-px bg-white" />
                              <div className="absolute left-2/3 h-full w-px bg-white" />
                            </div>

                            <div className="absolute inset-0 border border-white/50 pointer-events-none" />

                            {/* Resize Handles */}
                            <div className="absolute -inset-1 pointer-events-none">
                              <motion.div
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                onDrag={(e, info) => {
                                  const rect = (e.target as HTMLElement)
                                    .closest(".relative.w-full.h-full")
                                    ?.getBoundingClientRect();
                                  if (!rect) return;
                                  const dx =
                                    (info.delta.x / rect.width) * 100;
                                  const dy =
                                    (info.delta.y / rect.height) * 100;
                                  setCropBox((prev) => ({
                                    x: Math.max(
                                      0,
                                      Math.min(
                                        prev.x + prev.width - 1,
                                        prev.x + dx,
                                      ),
                                    ),
                                    y: Math.max(
                                      0,
                                      Math.min(
                                        prev.y + prev.height - 1,
                                        prev.y + dy,
                                      ),
                                    ),
                                    width: Math.max(1, prev.width - dx),
                                    height: Math.max(1, prev.height - dy),
                                  }));
                                }}
                                onDragEnd={() =>
                                  addToHistory(editParams, cropBox)
                                }
                                className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto cursor-nw-resize shadow-md"
                              />
                              <motion.div
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                onDrag={(e, info) => {
                                  const rect = (e.target as HTMLElement)
                                    .closest(".relative.w-full.h-full")
                                    ?.getBoundingClientRect();
                                  if (!rect) return;
                                  const dx =
                                    (info.delta.x / rect.width) * 100;
                                  const dy =
                                    (info.delta.y / rect.height) * 100;
                                  setCropBox((prev) => ({
                                    ...prev,
                                    y: Math.max(
                                      0,
                                      Math.min(
                                        prev.y + prev.height - 1,
                                        prev.y + dy,
                                      ),
                                    ),
                                    width: Math.max(1, prev.width + dx),
                                    height: Math.max(1, prev.height - dy),
                                  }));
                                }}
                                onDragEnd={() =>
                                  addToHistory(editParams, cropBox)
                                }
                                className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto cursor-ne-resize shadow-md"
                              />
                              <motion.div
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                onDrag={(e, info) => {
                                  const rect = (e.target as HTMLElement)
                                    .closest(".relative.w-full.h-full")
                                    ?.getBoundingClientRect();
                                  if (!rect) return;
                                  const dx =
                                    (info.delta.x / rect.width) * 100;
                                  const dy =
                                    (info.delta.y / rect.height) * 100;
                                  setCropBox((prev) => ({
                                    ...prev,
                                    x: Math.max(
                                      0,
                                      Math.min(
                                        prev.x + prev.width - 1,
                                        prev.x + dx,
                                      ),
                                    ),
                                    width: Math.max(1, prev.width - dx),
                                    height: Math.max(1, prev.height + dy),
                                  }));
                                }}
                                onDragEnd={() =>
                                  addToHistory(editParams, cropBox)
                                }
                                className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto cursor-sw-resize shadow-md"
                              />
                              <motion.div
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                onDrag={(e, info) => {
                                  const rect = (e.target as HTMLElement)
                                    .closest(".relative.w-full.h-full")
                                    ?.getBoundingClientRect();
                                  if (!rect) return;
                                  const dx =
                                    (info.delta.x / rect.width) * 100;
                                  const dy =
                                    (info.delta.y / rect.height) * 100;
                                  setCropBox((prev) => ({
                                    ...prev,
                                    width: Math.max(1, prev.width + dx),
                                    height: Math.max(1, prev.height + dy),
                                  }));
                                }}
                                onDragEnd={() =>
                                  addToHistory(editParams, cropBox)
                                }
                                className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto cursor-se-resize shadow-md"
                              />
                            </div>

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
                  ) : (
                    <motion.div
                      layoutId={`asset-preview`}
                      className="bg-white p-8 rounded-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.2)] border border-slate-100 flex items-center justify-center transition-all duration-300"
                      style={{
                        transform: `rotate(${editParams.rotation}deg) scale(${editParams.scale * (editParams.flipX ? -1 : 1)}, ${editParams.scale * (editParams.flipY ? -1 : 1)})`,
                        filter: `brightness(${editParams.brightness}%) contrast(${editParams.contrast}%) saturate(${editParams.saturation}%)`,
                        transition:
                          "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.3s ease",
                      }}
                    >
                      <img
                        src={asset.dataUrl}
                        className="max-w-full max-h-[45vh] object-contain rounded-lg"
                        alt="Asset preview"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-4 text-slate-600">
                  <Settings2 className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">
                    {asset.description}
                  </span>
                </div>
              </div>

              {/* Controls Area */}
              <div className="w-full md:w-[400px] bg-white p-10 flex flex-col gap-10 border-l border-slate-50 overflow-y-auto">
                {editMode === "filters" ? (
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Rotation
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg ring-1 ring-slate-200/50">
                          {editParams.rotation}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={editParams.rotation}
                        onChange={(e) =>
                          setEditParams((prev) => ({
                            ...prev,
                            rotation: parseInt(e.target.value),
                          }))
                        }
                        onPointerUp={() =>
                          addToHistory(editParams, cropBox)
                        }
                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            const newParams = {
                              ...editParams,
                              flipX: !editParams.flipX,
                            };
                            setEditParams(newParams);
                            addToHistory(newParams, cropBox);
                          }}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest",
                            editParams.flipX
                              ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                              : "bg-white text-slate-500 border-slate-100 hover:border-slate-200",
                          )}
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" />
                          Flip X
                        </button>
                        <button
                          onClick={() => {
                            const newParams = {
                              ...editParams,
                              flipY: !editParams.flipY,
                            };
                            setEditParams(newParams);
                            addToHistory(newParams, cropBox);
                          }}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest",
                            editParams.flipY
                              ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                              : "bg-white text-slate-500 border-slate-100 hover:border-slate-200",
                          )}
                        >
                          <FlipVertical className="w-3.5 h-3.5" />
                          Flip Y
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2.5">
                          <Maximize className="w-3.5 h-3.5" />
                          Scale
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg ring-1 ring-slate-200/50">
                          {editParams.scale.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={editParams.scale}
                        onChange={(e) =>
                          setEditParams((prev) => ({
                            ...prev,
                            scale: parseFloat(e.target.value),
                          }))
                        }
                        onPointerUp={() =>
                          addToHistory(editParams, cropBox)
                        }
                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900"
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2.5">
                          <Sun className="w-3.5 h-3.5" />
                          Brightness
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg ring-1 ring-slate-200/50">
                          {editParams.brightness}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        step="1"
                        value={editParams.brightness}
                        onChange={(e) =>
                          setEditParams((prev) => ({
                            ...prev,
                            brightness: parseInt(e.target.value),
                          }))
                        }
                        onPointerUp={() =>
                          addToHistory(editParams, cropBox)
                        }
                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900"
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2.5">
                          <Contrast className="w-3.5 h-3.5" />
                          Contrast
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg ring-1 ring-slate-200/50">
                          {editParams.contrast}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        step="1"
                        value={editParams.contrast}
                        onChange={(e) =>
                          setEditParams((prev) => ({
                            ...prev,
                            contrast: parseInt(e.target.value),
                          }))
                        }
                        onPointerUp={() =>
                          addToHistory(editParams, cropBox)
                        }
                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900"
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2.5">
                          <Palette className="w-3.5 h-3.5" />
                          Saturation
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg ring-1 ring-slate-200/50">
                          {editParams.saturation}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="1"
                        value={editParams.saturation}
                        onChange={(e) =>
                          setEditParams((prev) => ({
                            ...prev,
                            saturation: parseInt(e.target.value),
                          }))
                        }
                        onPointerUp={() =>
                          addToHistory(editParams, cropBox)
                        }
                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10">
                    <div className="p-8 bg-blue-50/50 border border-blue-100/50 rounded-3xl space-y-3">
                      <div className="flex items-center gap-3 text-blue-600">
                        <Crop className="w-4 h-4" />
                        <h4 className="text-[11px] font-bold uppercase tracking-widest">
                          Manual Cropping
                        </h4>
                      </div>
                      <p className="text-xs text-blue-700/70 font-medium leading-relaxed">
                        Drag the focus box to select a new area from the
                        original reference image.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          X (%)
                        </label>
                        <input
                          type="number"
                          value={Math.round(cropBox.x)}
                          onChange={(e) =>
                            setCropBox((prev) => ({
                              ...prev,
                              x: Math.max(
                                0,
                                Math.min(
                                  100 - prev.width,
                                  parseInt(e.target.value) || 0,
                                ),
                              ),
                            }))
                          }
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Y (%)
                        </label>
                        <input
                          type="number"
                          value={Math.round(cropBox.y)}
                          onChange={(e) =>
                            setCropBox((prev) => ({
                              ...prev,
                              y: Math.max(
                                0,
                                Math.min(
                                  100 - prev.height,
                                  parseInt(e.target.value) || 0,
                                ),
                              ),
                            }))
                          }
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Width (%)
                        </label>
                        <input
                          type="number"
                          value={Math.round(cropBox.width)}
                          onChange={(e) =>
                            setCropBox((prev) => ({
                              ...prev,
                              width: Math.max(
                                1,
                                Math.min(
                                  100 - prev.x,
                                  parseInt(e.target.value) || 1,
                                ),
                              ),
                            }))
                          }
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Height (%)
                        </label>
                        <input
                          type="number"
                          value={Math.round(cropBox.height)}
                          onChange={(e) =>
                            setCropBox((prev) => ({
                              ...prev,
                              height: Math.max(
                                1,
                                Math.min(
                                  100 - prev.y,
                                  parseInt(e.target.value) || 1,
                                ),
                              ),
                            }))
                          }
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      onClick={resetCrop}
                      className="w-full py-4 text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest border border-slate-100 rounded-2xl hover:bg-slate-50"
                    >
                      Reset Focus Box
                    </button>
                  </div>
                )}

                <div className="mt-auto space-y-4 pt-10 border-t border-slate-50">
                  <button
                    onClick={onApply}
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
    </AnimatePresence>
  );
}
