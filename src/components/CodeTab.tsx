import React from "react";
import { motion } from "motion/react";
import type { ReplicationResult } from "@/services/mimoService";
import { CodeEditor } from "./CodeEditor";
import { AssetGallery } from "./AssetGallery";
import { ChartPreview } from "./ChartPreview";
import { DesignTokenView } from "./DesignTokenView";
import { AIInsights } from "./AIInsights";

interface Asset {
  description: string;
  dataUrl: string;
  originalDataUrl?: string;
  cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

interface CodeTabProps {
  result: ReplicationResult;
  processedHtml: string;
  setProcessedHtml: (html: string) => void;
  processedCss: string;
  setProcessedCss: (css: string) => void;
  processedAssets: Asset[];
  setProcessedAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  processedCharts: ReplicationResult["detectedCharts"];
  onInsertAsset: (asset: { description: string; dataUrl: string }) => void;
  onInsertNewImage: (asset: { description: string; dataUrl: string }) => void;
  onStartEditing: (index: number) => void;
  onDeleteAsset: (index: number) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReplaceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  replacingAssetIndex: number | null;
  setReplacingAssetIndex: (index: number | null) => void;
  downloadChartCSV: (chart: { title: string; data: Record<string, unknown>[] }) => void;
  insertChartToCode: (chart: NonNullable<ReplicationResult["detectedCharts"]>[0]) => void;
}

export function CodeTab(props: CodeTabProps) {
  const { result, processedHtml, setProcessedHtml, processedCss, setProcessedCss, processedAssets, processedCharts } = props;

  return (
    <motion.div
      key="code"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <CodeEditor html={processedHtml} css={processedCss} onHtmlChange={setProcessedHtml} onCssChange={setProcessedCss} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AIInsights explanation={result.explanation} />
        <AssetGallery
          assets={processedAssets}
          onInsertAsset={props.onInsertAsset}
          onInsertNewImage={props.onInsertNewImage}
          onStartEditing={props.onStartEditing}
          onDeleteAsset={props.onDeleteAsset}
          onFileUpload={props.onFileUpload}
          onReplaceUpload={props.onReplaceUpload}
          setReplacingAssetIndex={props.setReplacingAssetIndex}
          replacingAssetIndex={props.replacingAssetIndex}
        />
      </div>

      <ChartPreview
        charts={processedCharts || []}
        onInsertChart={props.insertChartToCode}
        onDownloadCSV={props.downloadChartCSV}
      />

      {result.isTemplate && <DesignTokenView designTokens={result.designTokens} />}
    </motion.div>
  );
}
