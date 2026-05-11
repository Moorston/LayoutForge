/**
 * Code editor tab for ResultView.
 *
 * Displays the Monaco code editor, asset management grid,
 * detected charts, and AI design insights.
 */

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  Check,
  Code,
  Layers,
  Download,
  Image as ImageIcon,
  Plus,
  X,
  Settings2,
  BarChart as ChartIcon,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Sector,
} from "recharts";
import { cn } from "@/lib/utils";
import type { ReplicationResult } from "@/services/mimoService";
import { sanitizeForIframe } from "@/lib/sanitize";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Asset {
  description: string;
  dataUrl: string;
  originalDataUrl?: string;
  cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

export interface CodeTabProps {
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
  downloadChartCSV: (chart: {
    title: string;
    data: Record<string, unknown>[];
  }) => void;
  insertChartToCode: (
    chart: NonNullable<ReplicationResult["detectedCharts"]>[0],
  ) => void;
}

// ─── Recharts Tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-200 rounded-xl shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
        <p className="text-[10px] font-bold text-slate-800 mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: p.color || p.fill }}
                />
                <span className="text-[10px] text-slate-500 font-medium">
                  {p.name}:
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-900">
                {p.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// ─── Pie Chart Active Shape ───────────────────────────────────────────────────

function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-300 ease-out"
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        fillOpacity={0.3}
      />
    </g>
  );
}

// ─── Download Helpers ─────────────────────────────────────────────────────────

function downloadHtmlFile(html: string, css: string) {
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Replicated Design</title>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/font/lucide.min.css">
    <style>
      ${css}
      body { margin: 0; }
    </style>
</head>
<body>
    ${sanitizeForIframe(html)}
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CodeTab({
  result,
  processedHtml,
  setProcessedHtml,
  processedCss,
  setProcessedCss,
  processedAssets,
  setProcessedAssets,
  processedCharts,
  onInsertAsset,
  onInsertNewImage,
  onStartEditing,
  onDeleteAsset,
  onFileUpload,
  onReplaceUpload,
  replacingAssetIndex,
  setReplacingAssetIndex,
  downloadChartCSV,
  insertChartToCode,
}: CodeTabProps) {
  const [codeTab, setCodeTab] = useState<"html" | "css">("html");
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pieActiveIndices, setPieActiveIndices] = useState<
    Record<number, number | null>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const codeSectionRef = useRef<HTMLDivElement>(null);

  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    if (codeTab === "html") {
      setProcessedHtml(value);
    } else {
      setProcessedCss(value);
    }
  };

  const copyToClipboard = async () => {
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
  };

  const handlePieClick = (chartIndex: number, sliceIndex: number) => {
    setPieActiveIndices((prev) => ({
      ...prev,
      [chartIndex]: prev[chartIndex] === sliceIndex ? null : sliceIndex,
    }));
  };

  return (
    <motion.div
      key="code"
      ref={codeSectionRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* ── Code Editor ── */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-950 shadow-2xl ring-1 ring-black/10">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-slate-400" />
            <div className="flex bg-slate-800 rounded-lg p-0.5 ml-2">
              <button
                onClick={() => setCodeTab("html")}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest",
                  codeTab === "html"
                    ? "bg-slate-700 text-white"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                Index.html
              </button>
              <button
                onClick={() => setCodeTab("css")}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest",
                  codeTab === "css"
                    ? "bg-slate-700 text-white"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                Styles.css
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {processedAssets.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowAssetPicker(!showAssetPicker)}
                  className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-blue-400 border border-blue-900/30 rounded-md hover:bg-blue-900/20 transition-all uppercase tracking-tighter"
                >
                  <Plus className="w-3 h-3" />
                  Link Asset
                </button>
                {showAssetPicker && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 max-h-80 overflow-auto">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest p-2 border-b border-slate-800 mb-2">
                      Select Asset to Link
                    </p>
                    {processedAssets.map((asset, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onInsertAsset(asset);
                          setShowAssetPicker(false);
                        }}
                        className="w-full text-left p-2 hover:bg-slate-800 rounded-lg flex items-center gap-3 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded border border-slate-700 bg-slate-950 flex-shrink-0 overflow-hidden">
                          <img
                            src={asset.dataUrl}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-300 truncate">
                            {asset.description}
                          </p>
                          <p className="text-[9px] text-slate-500 uppercase">
                            Click to Link
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => downloadHtmlFile(processedHtml, processedCss)}
              className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 hover:text-white transition-all uppercase tracking-tighter"
            >
              <Download className="w-3 h-3" />
              Download .html
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 hover:text-white transition-all uppercase tracking-tighter"
            >
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            </div>
          </div>
        </div>
        <div className="h-[75vh]">
          <Editor
            height="100%"
            language={codeTab === "html" ? "html" : "css"}
            theme="vs-dark"
            value={codeTab === "html" ? processedHtml : processedCss}
            onChange={handleCodeChange}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineHeight: 20,
              fontFamily: "JetBrains Mono, monospace",
              padding: { top: 24, bottom: 24 },
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              scrollbar: { vertical: "hidden", horizontal: "hidden" },
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ── AI Insights ── */}
        {result.explanation && (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-lg">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              AI Design Insights
            </h5>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {result.explanation}
            </p>
          </div>
        )}

        {/* ── Image Assets ── */}
        {processedAssets.length > 0 && (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-lg">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Image Assets ({processedAssets.length})
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-all uppercase tracking-tight"
              >
                <Plus className="w-3 h-3" />
                Upload
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUpload}
                className="hidden"
                accept="image/*"
              />
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {processedAssets.map((asset, i) => {
                const aspectRatio = asset.cropCoords
                  ? (asset.cropCoords.xmax - asset.cropCoords.xmin) /
                    (asset.cropCoords.ymax - asset.cropCoords.ymin)
                  : 16 / 9;

                return (
                  <div
                    key={i}
                    className="p-4 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col gap-4 group/asset relative overflow-hidden hover:shadow-md transition-all"
                  >
                    <div
                      className="w-full h-full rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center relative cursor-pointer"
                      style={{ aspectRatio: `${aspectRatio}` }}
                      onClick={() => {
                        setReplacingAssetIndex(i);
                        replaceInputRef.current?.click();
                      }}
                    >
                      <img
                        src={asset.dataUrl}
                        alt={asset.description}
                        className="max-w-full max-h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/asset:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover/asset:opacity-100 transition-opacity bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow-xl flex items-center gap-2 scale-90 group-hover/asset:scale-100 transition-all">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-900" />
                          <span className="text-[10px] font-bold text-slate-900 uppercase">
                            Click to Replace
                          </span>
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/asset:opacity-100 transition-opacity translate-y-[-4px] group-hover/asset:translate-y-0 duration-300">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartEditing(i);
                          }}
                          className="p-2 bg-white text-slate-900 rounded-full shadow-xl hover:bg-slate-100 active:scale-90 border border-slate-100"
                          title="Edit Filters/Crop"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAsset(i);
                          }}
                          className="p-2 bg-white text-red-500 rounded-full shadow-xl hover:bg-red-50 active:scale-90 border border-red-50"
                          title="Delete Asset"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInsertAsset(asset);
                        }}
                        className="absolute bottom-3 left-3 right-3 py-2 bg-blue-600 text-[10px] font-bold text-white rounded-xl shadow-lg opacity-0 group-hover/asset:opacity-100 transition-all translate-y-[4px] group-hover/asset:translate-y-0 hover:bg-blue-700"
                      >
                        Sync to HTML Placeholder
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 px-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[11px] font-bold text-slate-900 uppercase tracking-tight truncate flex-1"
                          title={asset.description}
                        >
                          {asset.description}
                        </span>
                        <button
                          onClick={() => onInsertNewImage(asset)}
                          className="text-[9px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-tight"
                        >
                          Insert New
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[9px] font-bold text-blue-600 uppercase tracking-tighter">
                          {aspectRatio.toFixed(2)}:1 Ratio
                        </span>
                        {asset.cropCoords && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                            Clipped
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <input
              type="file"
              ref={replaceInputRef}
              onChange={onReplaceUpload}
              className="hidden"
              accept="image/*"
            />
          </div>
        )}
      </div>

      {/* ── Detected Charts ── */}
      {processedCharts && processedCharts.length > 0 && (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-lg">
          <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <ChartIcon className="w-4 h-4" />
            Detected Charts ({processedCharts.length})
          </h5>
          <div className="space-y-6">
            {processedCharts.map((chart, i) => (
              <div
                key={i}
                className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col gap-4 group/chart relative overflow-hidden hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">
                      {chart.title}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {chart.type} Chart
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadChartCSV(chart)}
                      title="Export Data as CSV"
                      className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg bg-white shadow-sm transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertChartToCode(chart)}
                      className="px-3 py-1.5 bg-blue-600 text-[10px] font-bold text-white rounded-lg shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3" />
                      Insert into HTML
                    </button>
                  </div>
                </div>

                <div className="h-48 bg-white rounded-xl border border-slate-200 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.type === "bar" ? (
                      <BarChart
                        data={chart.data}
                        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis dataKey={Object.keys(chart.data[0])[0]} hide />
                        <YAxis hide />
                        <Tooltip
                          content={<ChartTooltip />}
                          cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                        />
                        <Bar
                          dataKey={
                            Object.keys(chart.data[0]).find(
                              (k) => k !== Object.keys(chart.data[0])[0],
                            ) || ""
                          }
                          fill="#3b82f6"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    ) : chart.type === "line" ? (
                      <LineChart
                        data={chart.data}
                        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis dataKey={Object.keys(chart.data[0])[0]} hide />
                        <YAxis hide />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                          type="monotone"
                          dataKey={
                            Object.keys(chart.data[0]).find(
                              (k) => k !== Object.keys(chart.data[0])[0],
                            ) || ""
                          }
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            fill: "#3b82f6",
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    ) : chart.type === "area" ? (
                      <AreaChart
                        data={chart.data}
                        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id={`gradient-${i}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis dataKey={Object.keys(chart.data[0])[0]} hide />
                        <YAxis hide />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey={
                            Object.keys(chart.data[0]).find(
                              (k) => k !== Object.keys(chart.data[0])[0],
                            ) || ""
                          }
                          stroke="#3b82f6"
                          fill={`url(#gradient-${i})`}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    ) : (
                      <PieChart>
                        <Pie
                          {...({
                            activeIndex: pieActiveIndices[i] ?? -1,
                            activeShape: renderActiveShape,
                          } as any)}
                          data={chart.data}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={5}
                          dataKey={
                            Object.keys(chart.data[0]).find(
                              (k) => typeof chart.data[0][k] === "number",
                            ) || ""
                          }
                          onClick={(_, index) => handlePieClick(i, index)}
                          stroke="none"
                        >
                          {chart.data.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                [
                                  "#3b82f6",
                                  "#10b981",
                                  "#f59e0b",
                                  "#ef4444",
                                  "#8b5cf6",
                                ][index % 5]
                              }
                              className="outline-none"
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  {chart.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ── Design Tokens (Template Mode) ── */}
      {result.isTemplate && result.designTokens && (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-lg">
          <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Design Tokens
          </h5>
          <div className="space-y-6">
            {/* Colors */}
            {result.designTokens.colors &&
              Object.keys(result.designTokens.colors).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Colors
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(result.designTokens.colors).map(
                      ([name, value]) => (
                        <div
                          key={name}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div
                            className="w-5 h-5 rounded-md border border-slate-200 shadow-sm"
                            style={{ backgroundColor: value }}
                          />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">
                              {name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-900">
                              {value}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            {/* Typography */}
            {result.designTokens.typography &&
              Object.keys(result.designTokens.typography).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Typography
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(result.designTokens.typography).map(
                      ([name, value]) => (
                        <div
                          key={name}
                          className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <span className="text-[9px] font-bold text-slate-500 uppercase">
                            {name}
                          </span>
                          <p
                            className="text-[12px] text-slate-900 font-medium mt-0.5"
                            style={
                              name.toLowerCase().includes("font")
                                ? { fontFamily: value }
                                : undefined
                            }
                          >
                            {value}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            {/* Spacing */}
            {result.designTokens.spacing && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Spacing
                </p>
                <div className="flex flex-wrap gap-3">
                  {result.designTokens.spacing.unit && (
                    <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">
                        Unit
                      </span>
                      <p className="text-[12px] text-slate-900 font-medium mt-0.5">
                        {result.designTokens.spacing.unit}
                      </p>
                    </div>
                  )}
                  {result.designTokens.spacing.scale?.map((s, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div
                        className="h-2 rounded-full bg-indigo-400 mb-1"
                        style={{ width: `${Math.min((i + 1) * 16, 80)}px` }}
                      />
                      <span className="text-[10px] font-mono font-bold text-slate-900">
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Effects */}
            {result.designTokens.effects &&
              Object.keys(result.designTokens.effects).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Effects
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(result.designTokens.effects).map(
                      ([name, value]) => (
                        <div
                          key={name}
                          className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <span className="text-[9px] font-bold text-slate-500 uppercase">
                            {name}
                          </span>
                          <p className="text-[10px] font-mono text-slate-900 mt-0.5">
                            {value}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
