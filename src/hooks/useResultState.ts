import { useState, useEffect, useCallback } from "react";
import type {
  ReplicationResult,
  ImageSceneClassification,
} from "@/services/mimoService";
import { sanitizeForIframe } from "@/lib/sanitize";
import { normalizeHtmlForPreview } from "@/lib/imageUtils";
import type { BrandKit } from "@/lib/types";

interface Asset {
  description: string;
  dataUrl: string;
  originalDataUrl?: string;
  cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

export type TabID =
  | "preview"
  | "code"
  | "variables"
  | "seo"
  | "accessibility"
  | "export"
  | "tools";

export function useResultState(
  result: ReplicationResult,
  originalImage: string,
) {
  const [activeTab, setActiveTab] = useState<TabID>("preview");
  const [processedHtml, setProcessedHtml] = useState(result.html);
  const [processedCss, setProcessedCss] = useState(result.css);
  const [processedAssets, setProcessedAssets] = useState<Asset[]>([]);
  const [processedCharts, setProcessedCharts] = useState<
    ReplicationResult["detectedCharts"]
  >([]);

  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [projectName, setProjectName] = useState("My Replicated Layout");
  const [showChat, setShowChat] = useState(false);
  const [isDetectingVars, setIsDetectingVars] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [diffSlider, setDiffSlider] = useState(50);
  const [replacingAssetIndex, setReplacingAssetIndex] = useState<number | null>(
    null,
  );

  const [iframeContent, setIframeContent] = useState("");

  const copyToClipboard = useCallback(async () => {
    if (!processedHtml) return;
    try {
      await navigator.clipboard.writeText(processedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = processedHtml;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }, [processedHtml]);

  const downloadCode = useCallback(() => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Replicated Design</title>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/font/lucide.min.css">
    <style>
      ${processedCss}
      body { margin: 0; }
    </style>
</head>
<body>
    ${sanitizeForIframe(normalizeHtmlForPreview(processedHtml))}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "replicated-design.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [processedHtml, processedCss]);

  const handleSave = useCallback(
    (onSave?: (name: string, html: string, css: string) => void) => {
      if (!onSave) return;
      setIsSaving(true);
      onSave(projectName, processedHtml, processedCss);
      setTimeout(() => {
        setIsSaving(false);
        setShowSaveDialog(false);
      }, 500);
    },
    [projectName, processedHtml, processedCss],
  );

  return {
    activeTab,
    setActiveTab,
    processedHtml,
    setProcessedHtml,
    processedCss,
    setProcessedCss,
    processedAssets,
    setProcessedAssets,
    processedCharts,
    setProcessedCharts,
    copied,
    isSaving,
    showSaveDialog,
    setShowSaveDialog,
    projectName,
    setProjectName,
    showChat,
    setShowChat,
    isDetectingVars,
    setIsDetectingVars,
    showDiff,
    setShowDiff,
    diffSlider,
    setDiffSlider,
    replacingAssetIndex,
    setReplacingAssetIndex,
    iframeContent,
    setIframeContent,
    copyToClipboard,
    downloadCode,
    handleSave,
  };
}
