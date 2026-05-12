import React from "react";
import { motion } from "motion/react";
import { Globe, SplitSquareHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ImageSceneClassification,
  SceneCategory,
} from "@/services/mimoService";
import { DevicePreview } from "./DevicePreview";

const SCENE_BADGE: Record<SceneCategory, string> = {
  portrait: "bg-rose-50 text-rose-800 border-rose-100",
  scenery: "bg-emerald-50 text-emerald-900 border-emerald-100",
  animal: "bg-amber-50 text-amber-900 border-amber-100",
  object: "bg-slate-100 text-slate-800 border-slate-200",
  abstract: "bg-violet-50 text-violet-900 border-violet-100",
  other: "bg-slate-50 text-slate-600 border-slate-100",
};

interface PreviewTabProps {
  originalImage: string;
  sceneClassification?: ImageSceneClassification | null;
  showDiff: boolean;
  setShowDiff: (show: boolean) => void;
  diffSlider: number;
  setDiffSlider: (value: number) => void;
  iframeContent: string;
}

export function PreviewTab({
  originalImage,
  sceneClassification,
  showDiff,
  setShowDiff,
  diffSlider,
  setDiffSlider,
  iframeContent,
}: PreviewTabProps) {
  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 gap-12 mx-auto h-full lg:grid-cols-2 max-w-[1700px]"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
            Original Reference
          </h4>
          {sceneClassification && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                图像类型
              </span>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-bold border",
                  SCENE_BADGE[sceneClassification.category],
                )}
              >
                {sceneClassification.labelZh}
              </span>
              {sceneClassification.brief ? (
                <span className="text-[11px] text-slate-500 max-w-[220px] truncate">
                  {sceneClassification.brief}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 shadow-2xl bg-white overflow-hidden ring-1 ring-black/5">
          {originalImage.startsWith("data:") ? (
            <img src={originalImage} alt="Original" className="w-full h-auto" />
          ) : (
            <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center p-12 text-center">
              <Globe className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Replicated from URL
              </p>
              <p className="text-[10px] text-slate-300 mt-1 max-w-[200px]">
                This project was generated from a website structure rather than
                a visual screenshot.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Draft Production
          </h4>
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all",
              showDiff
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400",
            )}
          >
            <SplitSquareHorizontal className="w-3 h-3" />
            Diff
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 shadow-2xl overflow-hidden h-full min-h-[700px] flex flex-col ring-1 ring-black/5 relative group">
          <DevicePreview iframeContent={iframeContent} className="flex-1" />
          {showDiff && (
            <div className="absolute inset-0 pointer-events-none z-10 rounded-2xl overflow-hidden">
              {originalImage.startsWith("data:") && (
                <img
                  src={originalImage}
                  className="w-full h-full object-cover"
                  style={{ opacity: diffSlider / 100 }}
                  alt="diff overlay"
                />
              )}
              <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={diffSlider}
                  onChange={(e) => setDiffSlider(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
