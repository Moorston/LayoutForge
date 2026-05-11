/**
 * Pure image utility functions extracted from ResultView.tsx.
 * These functions perform canvas operations and generate SVG strings
 * without any React state dependencies.
 */

import type { ExportFormat } from "./types";

// ─── JSX → HTML normalization for preview ────────────────────────────────────

/**
 * Normalize AI-generated HTML for iframe preview.
 *
 * Problem: When using React+Tailwind/Vue stacks, the AI often generates
 * full component code (import statements, const declarations, return keywords)
 * instead of just the markup. The preview iframe is plain HTML and cannot
 * execute JSX or JavaScript module syntax.
 *
 * Solution: Extract the JSX return body and convert JSX attributes to HTML.
 */
export function normalizeHtmlForPreview(
  html: string,
  stack?: ExportFormat,
): string {
  if (!html) return html;

  let result = html;

  // Auto-detect code type if stack not provided
  if (!stack) {
    if (/<template>/i.test(result)) stack = "vue";
    else if (
      /^\s*import\s+/m.test(result) ||
      /(?:const|function|var)\s+\w+\s*(?::\s*React\.FC)?\s*=\s*(?:\(|function)/m.test(
        result,
      )
    )
      stack = "react-tailwind";
    else stack = "html";
  }

  // Only apply JSX normalization for React-based stacks
  const isReactStack = stack === "react-tailwind";

  if (isReactStack) {
    // Step 1: If the AI returned a full React component, extract the JSX body
    // Detect patterns like: import React ... const Foo = () => { return (...) }
    const hasImport = /^\s*import\s+/m.test(result);
    const hasConstComponent =
      /(?:export\s+(?:default\s+)?)?(?:const|function|var)\s+\w+\s*(?::\s*React\.FC)?\s*(?:=\s*(?:\([^)]*\)\s*=>|function)\s*[{(])/m.test(
        result,
      );

    if (hasImport || hasConstComponent) {
      // Extract content inside the outermost return (...)
      // Handle both `return ( ... )` and `return <div>...</div>` patterns
      const returnMatch = result.match(
        /return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*}\s*$/,
      );
      if (returnMatch) {
        result = returnMatch[1];
      } else {
        // Try return without parens: return <div>...</div>
        const returnNoParens = result.match(/return\s+([\s\S]*?)\s*;?\s*}\s*$/);
        if (returnNoParens) {
          result = returnNoParens[1];
        }
      }
    }

    // Step 2: Convert JSX attributes to HTML attributes
    // className → class
    result = result.replace(/\bclassName\s*=/g, "class=");
    // htmlFor → for
    result = result.replace(/\bhtmlFor\s*=/g, "for=");
    // tabIndex → tabindex
    result = result.replace(/\btabIndex\s*=/g, "tabindex=");
    // autoComplete → autocomplete
    result = result.replace(/\bautoComplete\s*=/g, "autocomplete=");
    // onClick, onChange, etc. → remove (not needed for static preview)
    result = result.replace(/\bon\w+\s*=\s*"[^"]*"/g, "");
    result = result.replace(/\bon\w+\s*=\s*{[^}]*}/g, "");
    // dangerouslySetInnerHTML → remove
    result = result.replace(/dangerouslySetInnerHTML\s*=\s*{[^}]*}/g, "");
    // Self-closing tags: <Component /> → <div /> (handled by browser)
    // JSX expressions in attributes: {variable} → remove
    result = result.replace(/=\s*{[^}]*}/g, "");
    // Remove remaining {expressions} in body (keep as empty)
    // But be careful not to remove CSS-in-JS objects
    // Remove import statements that might have leaked through
    result = result.replace(/^\s*import\s+[^;]*;\s*$/gm, "");
    // Remove export statements
    result = result.replace(
      /^\s*export\s+(?:default\s+)?(?:const|function|var|let)\s+[\s\S]*?$/gm,
      "",
    );
    // Clean up leftover const/function declarations
    result = result.replace(
      /^\s*(?:const|function|var|let)\s+\w+\s*(?::\s*[^=]+)?\s*=\s*[\s\S]*?(?=\s*<)/m,
      "",
    );
  }

  // For Vue stacks, handle <template> extraction
  if (stack === "vue") {
    const templateMatch = result.match(/<template>([\s\S]*?)<\/template>/);
    if (templateMatch) {
      result = templateMatch[1];
    }
    // Remove <script> and <style> blocks (preview only needs template)
    result = result.replace(/<script[\s\S]*?<\/script>/gi, "");
    result = result.replace(/<style[\s\S]*?<\/style>/gi, "");
  }

  // General cleanup
  // Remove empty lines at start/end
  result = result.trim();
  // Remove trailing semicolons that might have been left
  result = result.replace(/;\s*$/, "");

  return result;
}

// ─── Vision-optimized image preprocessing ─────────────────────────────────────

/**
 * Prepare an image for Vision LLM processing.
 * Resizes to an optimal resolution and converts to high-quality JPEG
 * for best text readability and detail recognition.
 *
 * Vision LLMs work best with images that are:
 * - Large enough to read text (at least 1024px wide)
 * - Not excessively large (under 2048px to avoid internal downscaling)
 * - High quality JPEG (0.92 quality balances detail vs. payload size)
 */
export async function prepareImageForVision(
  dataUrl: string,
  options?: {
    maxWidth?: number;
    quality?: number;
  },
): Promise<{
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}> {
  const maxWidth = options?.maxWidth ?? 2048;
  const quality = options?.quality ?? 0.92;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      // Resize if larger than max width, preserving aspect ratio
      if (width > maxWidth) {
        height = Math.round((maxWidth / width) * height);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG for efficient API transmission
      const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = jpegDataUrl.split(",")[1];

      resolve({ base64, mimeType: "image/jpeg", width, height });
    };
    img.onerror = () =>
      reject(new Error("Failed to load image for vision preprocessing."));
    img.src = dataUrl;
  });
}

// ─── High-quality canvas downscaling ─────────────────────────────────────────

/**
 * Draw a sub-region of an image onto a canvas using multi-pass downscaling
 * for better quality when the target size is much smaller than the source.
 */
export function highQualityDraw(
  img: HTMLImageElement | HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetW: number,
  targetH: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { alpha: true })!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // If the target is close enough to source, just draw directly
  if (targetW >= sw * 0.7) {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
    return canvas;
  }

  // Multi-pass: halve the source repeatedly until close to target
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
}

// ─── Image compression ───────────────────────────────────────────────────────

/**
 * Compress a data-URL image to JPEG with max width constraint.
 */
export function compressImage(
  dataUrl: string,
  maxWidth = 1200,
  quality = 0.8,
): Promise<string> {
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
}

// ─── SVG chart generation ────────────────────────────────────────────────────

interface ChartData {
  type: string;
  title: string;
  description: string;
  data: Record<string, unknown>[];
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

/**
 * Generate a static SVG string for a detected chart.
 */
export function generateSVGChart(chart: ChartData): string {
  const width = 400;
  const height = 240;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  if (chart.type === "pie") {
    const total = chart.data.reduce(
      (sum, d) =>
        sum +
        ((Object.values(d).find((v) => typeof v === "number") as number) || 0),
      0,
    );
    let currentAngle = 0;
    const radius = 70;
    const cx = width / 2;
    const cy = height / 2;

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-height:14rem;" class="w-full h-full max-h-56">
        <style>
          .pie-slice { transition: all 0.3s ease; cursor: pointer; }
          .pie-slice:hover { filter: brightness(1.1); transform: scale(1.02); transform-origin: center; }
          .pie-slice.active { transform: scale(1.1); filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); }
        </style>
        ${chart.data
          .map((d, i) => {
            const val =
              (Object.values(d).find((v) => typeof v === "number") as number) ||
              0;
            const percentage = val / total;
            const angle = percentage * 360;

            const x1 = cx + radius * Math.cos((Math.PI * currentAngle) / 180);
            const y1 = cy + radius * Math.sin((Math.PI * currentAngle) / 180);
            const x2 =
              cx + radius * Math.cos((Math.PI * (currentAngle + angle)) / 180);
            const y2 =
              cy + radius * Math.sin((Math.PI * (currentAngle + angle)) / 180);

            const largeArcFlag = angle > 180 ? 1 : 0;
            const dPath = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            const midAngle = currentAngle + angle / 2;
            const labelDist = radius + 25;
            const lx = cx + labelDist * Math.cos((Math.PI * midAngle) / 180);
            const ly = cy + labelDist * Math.sin((Math.PI * midAngle) / 180);

            const path = `
            <g class="pie-slice-group" onclick="this.querySelector('.pie-slice').classList.toggle('active')">
              <path d="${dPath}" fill="${CHART_COLORS[i % CHART_COLORS.length]}" class="pie-slice">
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
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-height:14rem;" class="w-full h-full max-h-56">
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
                fill="${CHART_COLORS[0]}"
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
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-height:14rem;" class="w-full h-full max-h-56">
        <style>
          .chart-point { transition: all 0.2s ease; cursor: pointer; }
          .chart-point:hover { r: 8; stroke-width: 3; }
        </style>
        ${
          chart.type === "area"
            ? `
          <defs>
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stop-color="${CHART_COLORS[0]}" stop-opacity="0.3"/>
              <stop offset="95%" stop-color="${CHART_COLORS[0]}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <polygon points="${areaPoints}" fill="url(#chart-area-grad)" />
        `
            : ""
        }
        <polyline points="${polylinePoints}" fill="none" stroke="${CHART_COLORS[0]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${points
          .map(
            (p) => `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="${CHART_COLORS[0]}" stroke="white" stroke-width="2" class="chart-point">
            <title>${p.name}: ${p.value}</title>
          </circle>
        `,
          )
          .join("")}
      </svg>`;
  }

  return `<div class="p-8 text-center text-slate-400 font-medium">Simplified ${chart.type} chart representation</div>`;
}

// ─── CSV export ──────────────────────────────────────────────────────────────

/**
 * Export chart data as CSV and trigger a download.
 */
export function downloadChartCSV(chart: {
  title: string;
  data: Record<string, unknown>[];
}): void {
  if (!chart.data || chart.data.length === 0) return;

  const headers = Object.keys(chart.data[0]);
  const csvContent = [
    headers.join(","),
    ...chart.data.map((row) =>
      headers
        .map((header) => {
          const val = row[header];
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
}
