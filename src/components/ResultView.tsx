import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  Check,
  Eye,
  Code,
  Layers,
  Download,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Maximize,
  Sun,
  Contrast,
  X,
  Save,
  Settings2,
  Undo2,
  Redo2,
  Crop,
  Palette,
  BarChart as ChartIcon,
  Globe,
  FlipHorizontal,
  FlipVertical,
  MessageSquare,
  Variable,
  ShieldCheck,
  PackageOpen,
  SplitSquareHorizontal,
  Search,
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
  Legend,
  ResponsiveContainer,
  Cell,
  Sector,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  ReplicationResult,
  ImageSceneClassification,
  SceneCategory,
} from "@/services/mimoService";
import { PixelReplicaPanel } from "./PixelReplicaPanel";
import { ChatPanel } from "./ChatPanel";
import { TemplateVarsPanel } from "./TemplateVarsPanel";
import { DevicePreview } from "./DevicePreview";
import { ExportPanel } from "./ExportPanel";
import { AccessibilityPanel } from "./AccessibilityPanel";
import { SEOPanel } from "./SEOPanel";
import { detectTemplateVariablesWithAI } from "@/services/mimoService";
import { TemplateVariable, BrandKit } from "@/lib/types";
import { applyVariables } from "@/lib/templateVars";

const SCENE_BADGE: Record<SceneCategory, string> = {
  portrait: "bg-rose-50 text-rose-800 border-rose-100",
  scenery: "bg-emerald-50 text-emerald-900 border-emerald-100",
  animal: "bg-amber-50 text-amber-900 border-amber-100",
  object: "bg-slate-100 text-slate-800 border-slate-200",
  abstract: "bg-violet-50 text-violet-900 border-violet-100",
  other: "bg-slate-50 text-slate-600 border-slate-100",
};

interface ResultViewProps {
  originalImage: string;
  result: ReplicationResult;
  sceneClassification?: ImageSceneClassification | null;
  onReset: () => void;
  onSave?: (name: string, html: string, css: string) => void;
  brandKit?: BrandKit;
}

export function ResultView({
  originalImage,
  result,
  sceneClassification,
  onReset,
  onSave,
  brandKit,
}: ResultViewProps) {
  const [activeTab, setActiveTab] = useState<
    "preview" | "code" | "variables" | "seo" | "accessibility" | "export"
  >("preview");
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [projectName, setProjectName] = useState("My Replicated Layout");
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [processedHtml, setProcessedHtml] = useState(result.html);
  const [processedCss, setProcessedCss] = useState(result.css);
  const [codeTab, setCodeTab] = useState<"html" | "css">("html");
  const [processedAssets, setProcessedAssets] = useState<
    Array<{
      description: string;
      dataUrl: string;
      originalDataUrl?: string;
      cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
    }>
  >([]);
  const [processedCharts, setProcessedCharts] = useState<
    ReplicationResult["detectedCharts"]
  >([]);
  const [pieActiveIndices, setPieActiveIndices] = useState<
    Record<number, number | null>
  >({});
  const [editingAssetIndex, setEditingAssetIndex] = useState<number | null>(
    null,
  );
  const [replacingAssetIndex, setReplacingAssetIndex] = useState<number | null>(
    null,
  );
  const [editMode, setEditMode] = useState<"filters" | "crop">("filters");
  const [editParams, setEditParams] = useState({
    rotation: 0,
    scale: 1,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    flipX: false,
    flipY: false,
  });
  const [cropBox, setCropBox] = useState({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  }); // Percentage of original image
  const [editHistory, setEditHistory] = useState<
    Array<{ params: typeof editParams; crop: typeof cropBox }>
  >([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeSectionRef = useRef<HTMLDivElement>(null);
  const [showChat, setShowChat] = useState(false);
  const [isDetectingVars, setIsDetectingVars] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [diffSlider, setDiffSlider] = useState(50);

  const highQualityDraw = (
    img: HTMLImageElement | HTMLCanvasElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    targetW: number,
    targetH: number,
  ): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d", { alpha: true })!;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (targetW >= sw * 0.7) {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      return canvas;
    }

    let offscreen = document.createElement("canvas");
    offscreen.width = sw;
    offscreen.height = sh;
    const octx = offscreen.getContext("2d", { alpha: true })!;
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    let curW = sw;
    let curH = sh;

    while (curW > targetW * 2) {
      const nextW = Math.floor(curW * 0.5);
      const nextH = Math.floor(curH * 0.5);
      const temp = document.createElement("canvas");
      temp.width = nextW;
      temp.height = nextH;
      const tctx = temp.getContext("2d", { alpha: true })!;
      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = "high";
      tctx.drawImage(offscreen, 0, 0, curW, curH, 0, 0, nextW, nextH);
      offscreen = temp;
      curW = nextW;
      curH = nextH;
    }

    ctx.drawImage(offscreen, 0, 0, curW, curH, 0, 0, targetW, targetH);
    return canvas;
  };

  useEffect(() => {
    // Process images and charts if there are any detected
    if (
      (result.detectedImages && result.detectedImages.length > 0) ||
      (result.detectedCharts && result.detectedCharts.length > 0)
    ) {
      processAssets();
    }
  }, [result]);

  useEffect(() => {
    if (activeTab === "code" && codeSectionRef.current) {
      codeSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTab]);

  const compressImage = (
    dataUrl: string,
    maxWidth = 1200,
    quality = 0.8,
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = dataUrl;
    });
  };

  const processAssets = async () => {
    try {
      const img = new Image();
      img.src = originalImage;
      img.crossOrigin = "anonymous";
      await img.decode();

      let newHtml = result.html;
      const assets: Array<{
        description: string;
        dataUrl: string;
        originalDataUrl?: string;
        cropCoords?: { ymin: number; xmin: number; ymax: number; xmax: number };
      }> = [];

      // Process Images
      if (result.detectedImages) {
        for (const detected of result.detectedImages) {
          if (detected.coordinates) {
            const { ymin, xmin, ymax, xmax } = detected.coordinates;
            const x = Math.floor((xmin / 1000) * img.width);
            const y = Math.floor((ymin / 1000) * img.height);
            const width = Math.ceil(((xmax - xmin) / 1000) * img.width);
            const height = Math.ceil(((ymax - ymin) / 1000) * img.height);

            if (width <= 0 || height <= 0) continue;

            const highResCanvas = highQualityDraw(
              img,
              x,
              y,
              width,
              height,
              width,
              height,
            );
            const croppedDataUrl = highResCanvas.toDataURL("image/jpeg", 0.85);

            assets.push({
              description: detected.description,
              dataUrl: croppedDataUrl,
              originalDataUrl: croppedDataUrl,
              cropCoords: { ymin, xmin, ymax, xmax },
            });

            const escapedDesc = detected.description.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&",
            );
            const descRegex = new RegExp(
              `(<img[^>]*alt=["']${escapedDesc}["'][^>]*>)`,
              "gi",
            );

            if (newHtml.match(descRegex)) {
              newHtml = newHtml.replace(descRegex, (match) => {
                if (match.match(/src=["'][^"']*["']/)) {
                  return match.replace(
                    /src=["'][^"']*["']/,
                    `src="${croppedDataUrl}"`,
                  );
                } else {
                  return match.replace("<img", `<img src="${croppedDataUrl}"`);
                }
              });
            }
          }
        }
      }

      // Process Charts
      if (result.detectedCharts) {
        setProcessedCharts(result.detectedCharts);
        for (const chart of result.detectedCharts) {
          const escapedTitle = chart.title.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          // Look for div with aria-label matching the title
          const chartRegex = new RegExp(
            `(<div[^>]*aria-label=["']${escapedTitle}["'][^>]*>)(<\\/div>)?`,
            "gi",
          );

          if (newHtml.match(chartRegex)) {
            const chartBadge = `<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full h-full min-h-[300px] flex flex-col">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-sm font-bold text-slate-800">${chart.title}</h3>
    <div class="flex gap-1">
       ${["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((c, i) => `<div class="w-1.5 h-1.5 rounded-full" style="background-color: ${c}"></div>`).join("")}
    </div>
  </div>
  <div class="flex-1 w-full flex items-center justify-center bg-slate-50/50 rounded-xl overflow-hidden relative group/chart-container">
    ${generateSVGChart(chart)}
  </div>
</div>`;
            newHtml = newHtml.replace(chartRegex, chartBadge);
          }
        }
      }

      setProcessedHtml(newHtml);
      setProcessedAssets(assets);
    } catch (error) {
      console.error("Error processing assets:", error);
    }
  };

  const applyEdits = async () => {
    if (editingAssetIndex === null) return;
    const asset = processedAssets[editingAssetIndex];
    if (!asset.originalDataUrl) return;

    const img = new Image();
    // If in crop mode, we crop from the FULL original reference image
    img.src = editMode === "crop" ? originalImage : asset.originalDataUrl;
    await img.decode();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    let finalDataUrl = "";
    let newCropCoords = asset.cropCoords;

    if (editMode === "crop") {
      // Perform high quality crop from original image
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
      // Apply filters and high quality rotate/scale
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

      // Use highQualityDraw for the scaled version too
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

    const newAssets = [...processedAssets];
    const oldDataUrl = newAssets[editingAssetIndex].dataUrl;
    newAssets[editingAssetIndex] = {
      ...asset,
      dataUrl: finalDataUrl,
      originalDataUrl:
        editMode === "crop" ? finalDataUrl : asset.originalDataUrl,
      cropCoords: newCropCoords,
    };
    setProcessedAssets(newAssets);

    // Automatically update HTML if this asset was already used
    if (processedHtml.includes(oldDataUrl)) {
      setProcessedHtml(processedHtml.replaceAll(oldDataUrl, finalDataUrl));
    }

    setEditingAssetIndex(null);
  };

  const generateSVGChart = (
    chart: NonNullable<ReplicationResult["detectedCharts"]>[0],
  ) => {
    const width = 400;
    const height = 240;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

    if (chart.type === "pie") {
      const total = chart.data.reduce(
        (sum, d) =>
          sum +
          ((Object.values(d).find((v) => typeof v === "number") as number) ||
            0),
        0,
      );
      let currentAngle = 0;
      const radius = 70;
      const cx = width / 2;
      const cy = height / 2;

      return `
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-full max-h-56">
          <style>
            .pie-slice { transition: all 0.3s ease; cursor: pointer; }
            .pie-slice:hover { filter: brightness(1.1); transform: scale(1.02); transform-origin: center; }
            .pie-slice.active { transform: scale(1.1); filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); }
          </style>
          ${chart.data
            .map((d, i) => {
              const val =
                (Object.values(d).find(
                  (v) => typeof v === "number",
                ) as number) || 0;
              const percentage = val / total;
              const angle = percentage * 360;

              const x1 = cx + radius * Math.cos((Math.PI * currentAngle) / 180);
              const y1 = cy + radius * Math.sin((Math.PI * currentAngle) / 180);
              const x2 =
                cx +
                radius * Math.cos((Math.PI * (currentAngle + angle)) / 180);
              const y2 =
                cy +
                radius * Math.sin((Math.PI * (currentAngle + angle)) / 180);

              const largeArcFlag = angle > 180 ? 1 : 0;
              const dPath = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

              const midAngle = currentAngle + angle / 2;
              const labelDist = radius + 25;
              const lx = cx + labelDist * Math.cos((Math.PI * midAngle) / 180);
              const ly = cy + labelDist * Math.sin((Math.PI * midAngle) / 180);

              const path = `
              <g class="pie-slice-group" onclick="this.querySelector('.pie-slice').classList.toggle('active')">
                <path d="${dPath}" fill="${colors[i % colors.length]}" class="pie-slice">
                  <title>${Object.values(d)[0]}: ${val}</title>
                </path>
                ${percentage > 0.05 ? `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" font-weight="bold" fill="#64748b">${Math.round(percentage * 100)}%</text>` : ""}
              </g>`;
              currentAngle += angle;
              return path;
            })
            .join("")}
        </svg>`;
    }

    const maxValue = Math.max(
      ...chart.data.map(
        (d) =>
          (Object.values(d).find((v) => typeof v === "number") as number) || 0,
      ),
      1,
    );
    const stepX =
      chartWidth / (chart.data.length > 1 ? chart.data.length - 1 : 1);

    if (chart.type === "bar") {
      const barPadding = 10;
      const barWidth = chartWidth / chart.data.length - barPadding;
      return `
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-full max-h-56">
          <style>
             .bar { transition: all 0.3s ease; cursor: pointer; }
             .bar:hover { fill-opacity: 0.8; transform: translate(0, -2px); }
          </style>
          <g transform="translate(${padding}, ${padding})">
            ${chart.data
              .map((d, i) => {
                const val =
                  (Object.values(d).find(
                    (v) => typeof v === "number",
                  ) as number) || 0;
                const h = (val / maxValue) * chartHeight;
                return `
                <rect
                  x="${i * (barWidth + barPadding)}"
                  y="${chartHeight - h}"
                  width="${barWidth}"
                  height="${h}"
                  fill="${colors[0]}"
                  rx="6"
                  class="bar"
                >
                  <title>${Object.values(d)[0]}: ${val}</title>
                </rect>`;
              })
              .join("")}
          </g>
        </svg>`;
    }

    if (chart.type === "line" || chart.type === "area") {
      const points = chart.data.map((d, i) => {
        const val =
          (Object.values(d).find((v) => typeof v === "number") as number) || 0;
        const x = padding + i * stepX;
        const y = padding + chartHeight - (val / maxValue) * chartHeight;
        return { x, y, name: Object.values(d)[0], value: val };
      });

      const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
      const areaPoints = `${points[0].x},${padding + chartHeight} ${polylinePoints} ${points[points.length - 1].x},${padding + chartHeight}`;

      return `
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-full max-h-56">
          <style>
            .chart-point { transition: all 0.2s ease; cursor: pointer; }
            .chart-point:hover { r: 8; stroke-width: 3; }
          </style>
          ${
            chart.type === "area"
              ? `
            <defs>
              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stop-color="${colors[0]}" stop-opacity="0.3"/>
                <stop offset="95%" stop-color="${colors[0]}" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <polygon points="${areaPoints}" fill="url(#chart-area-grad)" />
          `
              : ""
          }
          <polyline points="${polylinePoints}" fill="none" stroke="${colors[0]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          ${points
            .map(
              (p) => `
            <circle cx="${p.x}" cy="${p.y}" r="5" fill="${colors[0]}" stroke="white" stroke-width="2" class="chart-point">
              <title>${p.name}: ${p.value}</title>
            </circle>
          `,
            )
            .join("")}
        </svg>`;
    }

    return `<div class="p-8 text-center text-slate-400 font-medium">Simplified ${chart.type} chart representation</div>`;
  };

  const downloadCode = () => {
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Replicated Design</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/font/lucide.min.css">
    <style>
      ${processedCss}
      body { margin: 0; }
    </style>
</head>
<body>
    ${processedHtml}
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
  };

  const downloadChartCSV = (
    chart: NonNullable<ReplicationResult["detectedCharts"]>[0],
  ) => {
    if (!chart.data || chart.data.length === 0) return;

    // Get headers from first row
    const headers = Object.keys(chart.data[0]);
    const csvContent = [
      headers.join(","),
      ...chart.data.map((row) =>
        headers
          .map((header) => {
            const val = row[header];
            // Handle strings with commas
            return typeof val === "string" && val.includes(",")
              ? `"${val}"`
              : val;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${chart.title.toLowerCase().replace(/\s+/g, "-")}-data.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    if (codeTab === "html") {
      setProcessedHtml(value);
    } else {
      setProcessedCss(value);
    }
  };

  const cancelEdit = () => {
    setEditingAssetIndex(null);
  };

  const deleteAsset = (index: number) => {
    const asset = processedAssets[index];
    const newAssets = processedAssets.filter((_, i) => i !== index);
    setProcessedAssets(newAssets);

    // Optionally remove from HTML if the user confirms?
    // Or just let them clean up the code. Let's stick to cleaning list.
  };

  const handlePieClick = (chartIndex: number, sliceIndex: number) => {
    setPieActiveIndices((prev) => ({
      ...prev,
      [chartIndex]: prev[chartIndex] === sliceIndex ? null : sliceIndex,
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
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
  };

  const renderActiveShape = (props: any) => {
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
  };

  const handleReplaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingAssetIndex === null) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      let dataUrl = event.target?.result as string;

      // Compress if it's an image
      if (file.type.startsWith("image/")) {
        dataUrl = await compressImage(dataUrl);
      }

      const oldAsset = processedAssets[replacingAssetIndex];
      const newAssets = [...processedAssets];

      newAssets[replacingAssetIndex] = {
        ...oldAsset,
        dataUrl: dataUrl,
        originalDataUrl: dataUrl,
      };

      // Update HTML if the old image was used
      if (processedHtml.includes(oldAsset.dataUrl)) {
        setProcessedHtml((prev) => prev.replaceAll(oldAsset.dataUrl, dataUrl));
      }

      setProcessedAssets((prev) => {
        const newAssets = [...prev];
        newAssets[replacingAssetIndex] = {
          ...oldAsset,
          dataUrl: dataUrl,
          originalDataUrl: dataUrl,
        };
        return newAssets;
      });
      setReplacingAssetIndex(null);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      let dataUrl = event.target?.result as string;

      // Compress if it's an image
      if (file.type.startsWith("image/")) {
        dataUrl = await compressImage(dataUrl);
      }

      const newAsset = {
        description: file.name.split(".")[0],
        dataUrl: dataUrl,
        originalDataUrl: dataUrl,
      };
      setProcessedAssets((prev) => [...prev, newAsset]);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  const insertNewImageToCode = (asset: {
    description: string;
    dataUrl: string;
  }) => {
    const imgTag = `<img src="${asset.dataUrl}" alt="${asset.description}" class="w-full h-auto rounded-lg" />`;
    // Find a good place to insert - maybe at the end of the first container or just at the end of body
    if (processedHtml.includes("</div>")) {
      const lastDiv = processedHtml.lastIndexOf("</div>");
      const newHtml =
        processedHtml.slice(0, lastDiv) +
        "\n  " +
        imgTag +
        "\n" +
        processedHtml.slice(lastDiv);
      setProcessedHtml(newHtml);
    } else {
      setProcessedHtml(processedHtml + "\n" + imgTag);
    }
    setActiveTab("preview");
  };

  const insertChartToCode = (
    chart: NonNullable<ReplicationResult["detectedCharts"]>[0],
  ) => {
    const chartHtml = `
<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-sm font-bold text-slate-800">${chart.title}</h3>
    <div class="flex gap-1">
       ${["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((c) => `<div class="w-1.5 h-1.5 rounded-full" style="background-color: ${c}"></div>`).join("")}
    </div>
  </div>
  <div class="flex-1 w-full flex items-center justify-center bg-slate-50/50 rounded-xl overflow-hidden relative group/chart-container min-h-[300px]">
    ${generateSVGChart(chart)}
  </div>
</div>`;

    if (processedHtml.includes("</div>")) {
      const lastDiv = processedHtml.lastIndexOf("</div>");
      const newHtml =
        processedHtml.slice(0, lastDiv) +
        "\n  " +
        chartHtml +
        "\n" +
        processedHtml.slice(lastDiv);
      setProcessedHtml(newHtml);
    } else {
      setProcessedHtml(processedHtml + "\n" + chartHtml);
    }
    setActiveTab("preview");
  };

  const startEditing = (index: number) => {
    setEditingAssetIndex(index);
    // Only allow crop mode if we have a real original image to crop from
    setEditMode("filters");
    const asset = processedAssets[index];

    if (asset?.cropCoords) {
      setCropBox({
        x: asset.cropCoords.xmin / 10,
        y: asset.cropCoords.ymin / 10,
        width: (asset.cropCoords.xmax - asset.cropCoords.xmin) / 10,
        height: (asset.cropCoords.ymax - asset.cropCoords.ymin) / 10,
      });
    } else {
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    }

    const initialParams = {
      rotation: 0,
      scale: 1,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      flipX: false,
      flipY: false,
    };
    const initialCrop = asset?.cropCoords
      ? {
          x: asset.cropCoords.xmin / 10,
          y: asset.cropCoords.ymin / 10,
          width: (asset.cropCoords.xmax - asset.cropCoords.xmin) / 10,
          height: (asset.cropCoords.ymax - asset.cropCoords.ymin) / 10,
        }
      : { x: 10, y: 10, width: 80, height: 80 };

    setEditParams(initialParams);
    setCropBox(initialCrop);
    setEditHistory([{ params: initialParams, crop: initialCrop }]);
    setHistoryIndex(0);
  };

  const addToHistory = (params: typeof editParams, crop: typeof cropBox) => {
    const last = editHistory[historyIndex];
    if (
      last &&
      JSON.stringify(last.params) === JSON.stringify(params) &&
      JSON.stringify(last.crop) === JSON.stringify(crop)
    )
      return;

    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push({ params, crop });
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = editHistory[historyIndex - 1];
      setEditParams(prevState.params);
      setCropBox(prevState.crop);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < editHistory.length - 1) {
      const nextState = editHistory[historyIndex + 1];
      setEditParams(nextState.params);
      setCropBox(nextState.crop);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const insertAsset = (asset: { description: string; dataUrl: string }) => {
    const escapedDesc = asset.description.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const descRegex = new RegExp(
      `(<img[^>]*alt=["']${escapedDesc}["'][^>]*>)`,
      "gi",
    );

    if (processedHtml.match(descRegex)) {
      const newHtml = processedHtml.replace(descRegex, (match) => {
        if (match.match(/src=["'][^"']*["']/)) {
          return match.replace(/src=["'][^"']*["']/, `src="${asset.dataUrl}"`);
        } else {
          return match.replace("<img", `<img src="${asset.dataUrl}"`);
        }
      });
      setProcessedHtml(newHtml);
    } else {
      // Fallback: look for generic image placeholders or just alert
      const genericRegex = /<img[^>]*src=["']placeholder["'][^>]*>/gi;
      if (processedHtml.match(genericRegex)) {
        const newHtml = processedHtml.replace(genericRegex, (match) => {
          return match.replace(
            /src=["']placeholder["']/,
            `src="${asset.dataUrl}"`,
          );
        });
        setProcessedHtml(newHtml);
      } else {
        alert(
          `Could not find a specific placeholder for "${asset.description}". Make sure an <img> tag with alt="${asset.description}" exists in the source code.`,
        );
      }
    }
  };

  const copyToClipboard = async () => {
    if (!processedHtml) return;
    try {
      await navigator.clipboard.writeText(processedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback to document.execCommand if available
      const textArea = document.createElement("textarea");
      textArea.value = processedHtml;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error("Clipboard fallback failed:", fallbackError);
        // Show user feedback about clipboard access
        alert("Failed to copy to clipboard. Please copy manually.");
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handleSave = () => {
    if (onSave) {
      setIsSaving(true);
      onSave(projectName, processedHtml, processedCss);
      setTimeout(() => {
        setIsSaving(false);
        setShowSaveDialog(false);
      }, 500);
    }
  };

  const iframeContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script>
        // Guard window.fetch in the iframe environment
        try {
          const originalFetch = window.fetch;
          if (originalFetch) {
            Object.defineProperty(window, 'fetch', {
              configurable: true,
              enumerable: true,
              get: () => originalFetch,
              set: (v) => { console.warn('Iframe: Attempted to overwrite window.fetch ignored:', v); }
            });
          }
        } catch (e) {}
      </script>
      <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
      <style>
        /* ── Base reset ── */
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; padding: 0; min-height: 100vh; background: white; overflow-x: hidden; }

        /* ── SVG diagrams: always scale to container width ── */
        svg { max-width: 100%; height: auto; }

        /* ── Flowchart / diagram containers ── */
        [data-diagram], .diagram-container, .flowchart {
          width: 100%;
          overflow-x: auto;
        }

        /* ── Prevent absolutely-positioned items from escaping their parent ── */
        .relative { position: relative; }
        [class*="absolute"] { max-width: 100%; }

        /* ── User CSS ── */
        ${processedCss || ""}
      </style>
    </head>
    <body>
      ${processedHtml}
    </body>
    </html>
  `;

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6]">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onReset}
            className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            ← New Capture
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto gap-0.5">
            {(
              [
                { id: "preview", icon: Eye, label: "Canvas" },
                { id: "code", icon: Code, label: "Source Code" },
                { id: "variables", icon: Variable, label: "Variables" },
                { id: "seo", icon: Search, label: "SEO" },
                { id: "accessibility", icon: ShieldCheck, label: "A11y" },
                { id: "export", icon: PackageOpen, label: "Export" },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold rounded-md transition-all whitespace-nowrap uppercase tracking-tight",
                  activeTab === id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold text-slate-300 mr-2 hidden sm:block uppercase tracking-widest">
            Xiaomi MiMo
          </p>
          <div className="relative">
            <button
              onClick={() => setShowSaveDialog(!showSaveDialog)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <AnimatePresence>
              {showSaveDialog && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-6 flex flex-col gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                      Save Project
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight">
                      Persist this design to your local library.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project Name..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="flex-1 px-3 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-[11px] font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Confirm Save"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-lg hover:opacity-90 shadow-lg transition-all active:scale-95"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Export Template"}
          </button>
          <button
            onClick={downloadCode}
            className="p-2.5 text-slate-500 hover:text-slate-900 transition-colors border border-slate-200 rounded-lg bg-white shadow-sm"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={cn(
              "p-2.5 transition-colors border rounded-lg shadow-sm",
              showChat
                ? "bg-indigo-600 text-white border-indigo-600"
                : "text-slate-500 hover:text-slate-900 border-slate-200 bg-white",
            )}
            title="AI Chat Refinement"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 lg:p-12">
        <AnimatePresence mode="wait">
          {activeTab === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "grid grid-cols-1 gap-12 mx-auto h-full",
                originalImage.startsWith("data:")
                  ? "lg:grid-cols-3 max-w-[2100px]"
                  : "lg:grid-cols-2 max-w-[1700px]",
              )}
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
                    <img
                      src={originalImage}
                      alt="Original"
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center p-12 text-center">
                      <Globe className="w-12 h-12 text-slate-200 mb-4" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Replicated from URL
                      </p>
                      <p className="text-[10px] text-slate-300 mt-1 max-w-[200px]">
                        This project was generated from a website structure
                        rather than a visual screenshot.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {originalImage.startsWith("data:") && (
                <div className="flex flex-col gap-6">
                  <PixelReplicaPanel
                    originalImage={originalImage}
                    scene={sceneClassification ?? undefined}
                  />
                </div>
              )}

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
                  <DevicePreview
                    iframeContent={iframeContent}
                    className="flex-1"
                  />
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
                          onChange={(e) =>
                            setDiffSlider(Number(e.target.value))
                          }
                          className="w-full accent-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "code" && (
            <motion.div
              key="code"
              ref={codeSectionRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-8"
            >
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
                                  insertAsset(asset);
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
                      onClick={downloadCode}
                      className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 hover:text-white transition-all uppercase tracking-tighter"
                    >
                      <Download className="w-3 h-3" />
                      Download .html
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
                      scrollbar: {
                        vertical: "hidden",
                        horizontal: "hidden",
                      },
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        onChange={handleFileUpload}
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
                                    startEditing(i);
                                  }}
                                  className="p-2 bg-white text-slate-900 rounded-full shadow-xl hover:bg-slate-100 active:scale-90 border border-slate-100"
                                  title="Edit Filters/Crop"
                                >
                                  <Settings2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteAsset(i);
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
                                  insertAsset(asset);
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
                                  onClick={() => insertNewImageToCode(asset)}
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
                      onChange={handleReplaceUpload}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                )}

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
                                  margin={{
                                    top: 5,
                                    right: 5,
                                    bottom: 5,
                                    left: 5,
                                  }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#f1f5f9"
                                  />
                                  <XAxis
                                    dataKey={Object.keys(chart.data[0])[0]}
                                    hide
                                  />
                                  <YAxis hide />
                                  <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{
                                      fill: "rgba(59, 130, 246, 0.05)",
                                    }}
                                  />
                                  <Bar
                                    dataKey={
                                      Object.keys(chart.data[0]).find(
                                        (k) =>
                                          k !== Object.keys(chart.data[0])[0],
                                      ) || ""
                                    }
                                    fill="#3b82f6"
                                    radius={[6, 6, 0, 0]}
                                  />
                                </BarChart>
                              ) : chart.type === "line" ? (
                                <LineChart
                                  data={chart.data}
                                  margin={{
                                    top: 5,
                                    right: 5,
                                    bottom: 5,
                                    left: 5,
                                  }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#f1f5f9"
                                  />
                                  <XAxis
                                    dataKey={Object.keys(chart.data[0])[0]}
                                    hide
                                  />
                                  <YAxis hide />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Line
                                    type="monotone"
                                    dataKey={
                                      Object.keys(chart.data[0]).find(
                                        (k) =>
                                          k !== Object.keys(chart.data[0])[0],
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
                                  margin={{
                                    top: 5,
                                    right: 5,
                                    bottom: 5,
                                    left: 5,
                                  }}
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
                                  <XAxis
                                    dataKey={Object.keys(chart.data[0])[0]}
                                    hide
                                  />
                                  <YAxis hide />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Area
                                    type="monotone"
                                    dataKey={
                                      Object.keys(chart.data[0]).find(
                                        (k) =>
                                          k !== Object.keys(chart.data[0])[0],
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
                                    activeIndex={pieActiveIndices[i] ?? -1}
                                    activeShape={renderActiveShape}
                                    data={chart.data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={65}
                                    paddingAngle={5}
                                    dataKey={
                                      Object.keys(chart.data[0]).find(
                                        (k) =>
                                          typeof chart.data[0][k] === "number",
                                      ) || ""
                                    }
                                    onClick={(_, index) =>
                                      handlePieClick(i, index)
                                    }
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
                                  <Tooltip content={<CustomTooltip />} />
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
              </div>
            </motion.div>
          )}

          {activeTab === "variables" && (
            <motion.div
              key="variables"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <TemplateVarsPanel
                html={processedHtml}
                onChange={(updatedHtml: string, _vars: TemplateVariable[]) => {
                  setProcessedHtml(updatedHtml);
                }}
                onDetectWithAI={async () => {
                  setIsDetectingVars(true);
                  try {
                    const vars =
                      await detectTemplateVariablesWithAI(processedHtml);
                    let newHtml = processedHtml;
                    vars.forEach((v) => {
                      if (v.value) {
                        const escaped = v.value.replace(
                          /[.*+?^${}()|[\]\\]/g,
                          "\\$&",
                        );
                        newHtml = newHtml.replace(
                          new RegExp(escaped, "g"),
                          `{{${v.key}}}`,
                        );
                      }
                    });
                    setProcessedHtml(newHtml);
                    return vars as TemplateVariable[];
                  } finally {
                    setIsDetectingVars(false);
                  }
                }}
                isDetecting={isDetectingVars}
              />
            </motion.div>
          )}

          {activeTab === "seo" && (
            <motion.div
              key="seo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <SEOPanel
                html={processedHtml}
                brandKit={brandKit}
                onApply={(newHtml: string) => setProcessedHtml(newHtml)}
              />
            </motion.div>
          )}

          {activeTab === "accessibility" && (
            <motion.div
              key="accessibility"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <AccessibilityPanel
                html={processedHtml}
                onFixWithAI={(_issue: any) => {
                  setShowChat(true);
                }}
              />
            </motion.div>
          )}

          {activeTab === "export" && (
            <motion.div
              key="export"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <ExportPanel
                html={processedHtml}
                css={processedCss}
                projectName={undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingAssetIndex !== null && (
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
                                    const rect =
                                      e.currentTarget.parentElement?.getBoundingClientRect();
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
                              src={processedAssets[editingAssetIndex]?.dataUrl}
                              className="max-w-full max-h-[45vh] object-contain rounded-lg"
                              alt="Asset preview"
                            />
                          </motion.div>
                        )}
                      </div>

                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-4 text-slate-600">
                        <Settings2 className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">
                          {processedAssets[editingAssetIndex].description}
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
                            onClick={() => {
                              const resetCrop = {
                                x: 10,
                                y: 10,
                                width: 80,
                                height: 80,
                              };
                              setCropBox(resetCrop);
                              addToHistory(editParams, resetCrop);
                            }}
                            className="w-full py-4 text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest border border-slate-100 rounded-2xl hover:bg-slate-50"
                          >
                            Reset Focus Box
                          </button>
                        </div>
                      )}

                      <div className="mt-auto space-y-4 pt-10 border-t border-slate-50">
                        <button
                          onClick={applyEdits}
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
          )}
        </AnimatePresence>
      </div>

      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        currentHtml={processedHtml}
        currentCss={processedCss}
        onUpdate={(html: string, css: string, _explanation: string) => {
          setProcessedHtml(html);
          setProcessedCss(css);
        }}
      />
    </div>
  );
}
