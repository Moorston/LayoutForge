import React, { useRef, useState } from "react";
import { ImageIcon, Plus, X, Settings2 } from "lucide-react";

interface Asset {
  description: string;
  dataUrl: string;
  originalDataUrl?: string;
  cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

interface AssetGalleryProps {
  assets: Asset[];
  onInsertAsset: (asset: { description: string; dataUrl: string }) => void;
  onInsertNewImage: (asset: { description: string; dataUrl: string }) => void;
  onStartEditing: (index: number) => void;
  onDeleteAsset: (index: number) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReplaceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setReplacingAssetIndex: (index: number | null) => void;
  replacingAssetIndex: number | null;
}

export function AssetGallery({
  assets,
  onInsertAsset,
  onInsertNewImage,
  onStartEditing,
  onDeleteAsset,
  onFileUpload,
  onReplaceUpload,
  setReplacingAssetIndex,
  replacingAssetIndex,
}: AssetGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  if (assets.length === 0 && !showAssetPicker) return null;

  return (
    <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-lg">
      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Image Assets ({assets.length})
        </div>
        <div className="flex items-center gap-2">
          {assets.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowAssetPicker(!showAssetPicker)}
                className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-all uppercase tracking-tight"
                aria-label="Link asset to code"
              >
                <Plus className="w-3 h-3" />
                Link Asset
              </button>
              {showAssetPicker && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-2 max-h-80 overflow-auto">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest p-2 border-b border-slate-100 mb-2">
                    Select Asset to Link
                  </p>
                  {assets.map((asset, i) => (
                    <button
                      key={i}
                      onClick={() => { onInsertAsset(asset); setShowAssetPicker(false); }}
                      className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex-shrink-0 overflow-hidden">
                        <img src={asset.dataUrl} className="w-full h-full object-cover" alt={asset.description} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-700 truncate">{asset.description}</p>
                        <p className="text-[9px] text-slate-400 uppercase">Click to Link</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-all uppercase tracking-tight"
            aria-label="Upload new image asset"
          >
            <Plus className="w-3 h-3" />
            Upload
          </button>
        </div>
      </h5>
      <input type="file" ref={fileInputRef} onChange={onFileUpload} className="hidden" accept="image/*" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {assets.map((asset, i) => {
          const aspectRatio = asset.cropCoords
            ? (asset.cropCoords.xmax - asset.cropCoords.xmin) / (asset.cropCoords.ymax - asset.cropCoords.ymin)
            : 16 / 9;
          return (
            <div key={i} className="p-4 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col gap-4 group/asset relative overflow-hidden hover:shadow-md transition-all">
              <div
                className="w-full rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center relative cursor-pointer"
                style={{ aspectRatio: `${aspectRatio}` }}
                onClick={() => { setReplacingAssetIndex(i); replaceInputRef.current?.click(); }}
                aria-label={`Click to replace ${asset.description}`}
              >
                <img src={asset.dataUrl} alt={asset.description} className="max-w-full max-h-full object-contain" />
                <div className="absolute inset-0 bg-black/0 group-hover/asset:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover/asset:opacity-100 transition-opacity bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow-xl flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-900" />
                    <span className="text-[10px] font-bold text-slate-900 uppercase">Click to Replace</span>
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/asset:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onStartEditing(i); }}
                    className="p-2 bg-white text-slate-900 rounded-full shadow-xl hover:bg-slate-100 border border-slate-100"
                    aria-label={`Edit ${asset.description}`}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteAsset(i); }}
                    className="p-2 bg-white text-red-500 rounded-full shadow-xl hover:bg-red-50 border border-red-50"
                    aria-label={`Delete ${asset.description}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onInsertAsset(asset); }}
                  className="absolute bottom-3 left-3 right-3 py-2 bg-blue-600 text-[10px] font-bold text-white rounded-xl shadow-lg opacity-0 group-hover/asset:opacity-100 transition-all hover:bg-blue-700"
                >
                  Sync to HTML Placeholder
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight truncate" title={asset.description}>{asset.description}</span>
                  <button onClick={() => onInsertNewImage(asset)} className="text-[9px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-tight">
                    Insert New
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-[9px] font-bold text-blue-600 uppercase tracking-tighter">{aspectRatio.toFixed(2)}:1 Ratio</span>
                  {asset.cropCoords && <span className="px-2 py-0.5 rounded bg-emerald-50 text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Clipped</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <input type="file" ref={replaceInputRef} onChange={onReplaceUpload} className="hidden" accept="image/*" />
    </div>
  );
}
