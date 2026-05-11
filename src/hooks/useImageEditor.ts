/**
 * Custom hook for image editing state and logic.
 * Manages crop, filters, rotation, undo/redo history.
 */
import { useState, useRef, useCallback } from "react";
import { highQualityDraw } from "@/lib/imageUtils";
import { DEFAULT_CROP, EDITOR_MAX_HISTORY } from "@/lib/constants";

export interface EditParams {
  rotation: number;
  scale: number;
  brightness: number;
  contrast: number;
  saturation: number;
  flipX: boolean;
  flipY: boolean;
}

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditSnapshot {
  params: EditParams;
  crop: CropBox;
}

interface ProcessedAsset {
  description: string;
  dataUrl: string;
  originalDataUrl?: string;
  cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

const DEFAULT_PARAMS: EditParams = {
  rotation: 0,
  scale: 1,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  flipX: false,
  flipY: false,
};

export function useImageEditor() {
  const [editingAssetIndex, setEditingAssetIndex] = useState<number | null>(
    null,
  );
  const [editMode, setEditMode] = useState<"filters" | "crop">("filters");
  const [editParams, setEditParams] = useState<EditParams>({
    ...DEFAULT_PARAMS,
  });
  const [cropBox, setCropBox] = useState<CropBox>({ ...DEFAULT_CROP });
  const [editHistory, setEditHistory] = useState<EditSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ── History management ────────────────────────────────────────────────────

  const addToHistory = useCallback(
    (params: EditParams, crop: CropBox) => {
      const newHistory = editHistory.slice(0, historyIndex + 1);
      newHistory.push({ params: { ...params }, crop: { ...crop } });
      // Keep max history entries
      if (newHistory.length > EDITOR_MAX_HISTORY) newHistory.shift();
      setEditHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [editHistory, historyIndex],
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevState = editHistory[historyIndex - 1];
    setEditParams({ ...prevState.params });
    setCropBox({ ...prevState.crop });
    setHistoryIndex(historyIndex - 1);
  }, [editHistory, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= editHistory.length - 1) return;
    const nextState = editHistory[historyIndex + 1];
    setEditParams({ ...nextState.params });
    setCropBox({ ...nextState.crop });
    setHistoryIndex(historyIndex + 1);
  }, [editHistory, historyIndex]);

  // ── Start editing an asset ────────────────────────────────────────────────

  const startEditing = useCallback(
    (index: number, assets: ProcessedAsset[], originalImage: string) => {
      const asset = assets[index];
      if (!asset) return;

      setEditingAssetIndex(index);

      // Initialize crop from existing crop coordinates (if any)
      if (asset.cropCoords) {
        const { xmin, ymin, xmax, ymax } = asset.cropCoords;
        setCropBox({
          x: xmin / 10,
          y: ymin / 10,
          width: (xmax - xmin) / 10,
          height: (ymax - ymin) / 10,
        });
      } else {
        // Default crop covers full image
        const img = new Image();
        img.src = originalImage;
        setCropBox({ ...DEFAULT_CROP });
      }

      const initialParams: EditParams = { ...DEFAULT_PARAMS };
      const initialCrop = asset.cropCoords
        ? {
            x: asset.cropCoords.xmin / 10,
            y: asset.cropCoords.ymin / 10,
            width: (asset.cropCoords.xmax - asset.cropCoords.xmin) / 10,
            height: (asset.cropCoords.ymax - asset.cropCoords.ymin) / 10,
          }
        : { ...DEFAULT_CROP };

      setEditParams(initialParams);
      setEditMode("filters");
      setEditHistory([{ params: initialParams, crop: initialCrop }]);
      setHistoryIndex(0);
    },
    [],
  );

  const cancelEdit = useCallback(() => {
    setEditingAssetIndex(null);
  }, []);

  const resetCrop = useCallback(() => {
    setCropBox({ ...DEFAULT_CROP });
  }, []);

  // ── Apply edits to an asset ───────────────────────────────────────────────

  const applyEdits = useCallback(
    async (
      assets: ProcessedAsset[],
      originalImage: string,
    ): Promise<{
      updatedAssets: ProcessedAsset[];
      editingIndex: number;
      oldDataUrl: string;
      newDataUrl: string;
    } | null> => {
      if (editingAssetIndex === null) return null;
      const asset = assets[editingAssetIndex];
      if (!asset?.originalDataUrl) return null;

      const img = new Image();
      img.src = editMode === "crop" ? originalImage : asset.originalDataUrl;
      await img.decode();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      let finalDataUrl = "";
      let newCropCoords = asset.cropCoords;

      if (editMode === "crop") {
        const x = Math.floor((cropBox.x / 100) * img.width);
        const y = Math.floor((cropBox.y / 100) * img.height);
        const w = Math.ceil((cropBox.width / 100) * img.width);
        const h = Math.ceil((cropBox.height / 100) * img.height);

        const highResCanvas = highQualityDraw(img, x, y, w, h, w, h);
        finalDataUrl = highResCanvas.toDataURL("image/jpeg", 0.85);
        newCropCoords = {
          xmin: cropBox.x * 10,
          ymin: cropBox.y * 10,
          xmax: (cropBox.x + cropBox.width) * 10,
          ymax: (cropBox.y + cropBox.height) * 10,
        };
      } else {
        const angle = (editParams.rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(angle));
        const cos = Math.abs(Math.cos(angle));

        const baseW = img.width * editParams.scale;
        const baseH = img.height * editParams.scale;

        canvas.width = baseW * cos + baseH * sin;
        canvas.height = baseH * cos + baseW * sin;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        ctx.scale(editParams.flipX ? -1 : 1, editParams.flipY ? -1 : 1);
        ctx.filter = `brightness(${editParams.brightness}%) contrast(${editParams.contrast}%) saturate(${editParams.saturation}%)`;

        const tempCanvas = highQualityDraw(
          img,
          0,
          0,
          img.width,
          img.height,
          baseW,
          baseH,
        );
        ctx.drawImage(tempCanvas, -baseW / 2, -baseH / 2);
        finalDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      }

      const updatedAssets = [...assets];
      const oldDataUrl = updatedAssets[editingAssetIndex].dataUrl;
      updatedAssets[editingAssetIndex] = {
        ...asset,
        dataUrl: finalDataUrl,
        originalDataUrl:
          editMode === "crop" ? finalDataUrl : asset.originalDataUrl,
        cropCoords: newCropCoords,
      };

      setEditingAssetIndex(null);
      return {
        updatedAssets,
        editingIndex: editingAssetIndex,
        oldDataUrl,
        newDataUrl: finalDataUrl,
      };
    },
    [editingAssetIndex, editMode, editParams, cropBox],
  );

  return {
    editingAssetIndex,
    setEditingAssetIndex,
    editMode,
    setEditMode,
    editParams,
    setEditParams,
    cropBox,
    setCropBox,
    editHistory,
    historyIndex,
    startEditing,
    cancelEdit,
    resetCrop,
    applyEdits,
    addToHistory,
    undo,
    redo,
  };
}

export type ImageEditorState = ReturnType<typeof useImageEditor>;
