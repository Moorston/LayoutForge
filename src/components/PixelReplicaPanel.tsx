import React, { useEffect, useState } from "react";
import { Download, Grid3x3, Loader2 } from "lucide-react";
import { renderImageAsPixelPaint } from "@/lib/pixelPaint";
import { cn } from "@/lib/utils";
import type { ImageSceneClassification } from "@/services/mimoService";

interface PixelReplicaPanelProps {
  originalImage: string;
  scene?: ImageSceneClassification | null;
}

export function PixelReplicaPanel({
  originalImage,
  scene,
}: PixelReplicaPanelProps) {
  const [blockSize, setBlockSize] = useState(8);
  const [showGrid, setShowGrid] = useState(false);
  const [pixelUrl, setPixelUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isDataUrl = originalImage.startsWith("data:");

  useEffect(() => {
    if (!isDataUrl) {
      setPixelUrl(null);
      setErr(null);
      return;
    }

    let cancelled = false;
    setBusy(true);
    setErr(null);

    renderImageAsPixelPaint(originalImage, {
      blockSize,
      showGrid,
      maxGridCells: 160,
    })
      .then((url) => {
        if (!cancelled) setPixelUrl(url);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setPixelUrl(null);
          setErr(e instanceof Error ? e.message : "像素绘制失败");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [originalImage, blockSize, showGrid, isDataUrl]);

  const download = () => {
    if (!pixelUrl) return;
    const a = document.createElement("a");
    a.href = pixelUrl;
    a.download = "pixel-replica.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isDataUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
        <Grid3x3 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          像素复制需上传本地图片
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 shadow-xl bg-white overflow-hidden ring-1 ring-black/5">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/50">
        <Grid3x3 className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
          像素绘画复制
        </span>
        {scene && (
          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
            依据采样像素块重建 · {scene.labelZh}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
            块大小 {blockSize}px
            <input
              type="range"
              min={3}
              max={16}
              step={1}
              value={blockSize}
              onChange={(e) => setBlockSize(Number(e.target.value))}
              className="w-28 accent-slate-900"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded border-slate-300"
            />
            网格线
          </label>
          <button
            type="button"
            onClick={download}
            disabled={!pixelUrl || busy}
            className={cn(
              "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
              pixelUrl && !busy
                ? "bg-slate-900 text-white hover:opacity-90"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <Download className="w-3.5 h-3.5" />
            PNG
          </button>
        </div>

        <div className="relative rounded-xl border border-slate-100 bg-[length:16px_16px] bg-[linear-gradient(to_right,rgb(248_250_252)_1px,transparent_1px),linear-gradient(to_bottom,rgb(248_250_252)_1px,transparent_1px)] overflow-auto max-h-[min(70vh,520px)] flex items-center justify-center p-3">
          {busy && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          )}
          {err ? (
            <p className="text-xs text-red-500 font-medium px-4 py-8 text-center">
              {err}
            </p>
          ) : pixelUrl ? (
            <img
              src={pixelUrl}
              alt="Pixel replica"
              className="max-w-full h-auto"
              style={{ imageRendering: "pixelated" }}
            />
          ) : null}
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          先将图像缩小为最多 160×160
          采样格，再按块大小用纯色矩形绘制，得到像素风复制品（非矢量布局）。
        </p>
      </div>
    </div>
  );
}
