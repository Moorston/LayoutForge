// ─── Pixel Paint (mosaic renderer) ──────────────────────────────────────────

export interface PixelPaintOptions {
  /** Each logical pixel is drawn as block×block canvas pixels (nearest-neighbor upsample). */
  blockSize: number;
  /** Downsample longest side to this many cells before expanding (performance + style). */
  maxGridCells?: number;
  /** Draw faint grid lines between blocks. */
  showGrid?: boolean;
}

/**
 * Reconstruct the image from sampled pixels (mosaic / pixel-art style copy).
 * Works with same-origin or data: URLs (canvas-safe).
 */
export function renderImageAsPixelPaint(
  imageSource: string,
  options: PixelPaintOptions,
): Promise<string> {
  const maxCells = options.maxGridCells ?? 160;
  const block = Math.max(2, Math.round(options.blockSize));

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        reject(new Error("Invalid image dimensions."));
        return;
      }

      const scale = Math.min(1, maxCells / Math.max(w, h));
      const gw = Math.max(1, Math.floor(w * scale));
      const gh = Math.max(1, Math.floor(h * scale));

      const sample = document.createElement("canvas");
      sample.width = gw;
      sample.height = gh;
      const sctx = sample.getContext("2d", { willReadFrequently: true });
      if (!sctx) {
        reject(new Error("Canvas unsupported."));
        return;
      }
      sctx.imageSmoothingEnabled = true;
      sctx.drawImage(img, 0, 0, gw, gh);

      let imageData: ImageData;
      try {
        imageData = sctx.getImageData(0, 0, gw, gh);
      } catch {
        reject(
          new Error(
            "Cannot read image pixels (CORS). Use an uploaded file / data URL.",
          ),
        );
        return;
      }

      const outW = gw * block;
      const outH = gh * block;
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      const octx = out.getContext("2d");
      if (!octx) {
        reject(new Error("Canvas unsupported."));
        return;
      }

      const data = imageData.data;
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const i = (y * gw + x) * 4;
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2],
            a = data[i + 3] / 255;
          octx.fillStyle = `rgba(${r},${g},${b},${a})`;
          octx.fillRect(x * block, y * block, block, block);
          if (options.showGrid && block >= 4) {
            octx.strokeStyle = "rgba(15,23,42,0.06)";
            octx.lineWidth = 1;
            octx.strokeRect(
              x * block + 0.5,
              y * block + 0.5,
              block - 1,
              block - 1,
            );
          }
        }
      }

      try {
        resolve(out.toDataURL("image/png"));
      } catch {
        reject(new Error("Cannot export pixel image."));
      }
    };
    img.onerror = () =>
      reject(new Error("Failed to load image for pixel replica."));
    img.src = imageSource;
  });
}

// ─── Pixel Layout Analysis ───────────────────────────────────────────────────

export interface PixelBand {
  topPercent: number;
  heightPercent: number;
  avgColor: string;
  brightness: "dark" | "medium" | "light";
  /** How much visual variation exists within this band */
  contentDensity: "sparse" | "medium" | "dense";
  columnStructure:
    | "full-width"
    | "two-column"
    | "three-column"
    | "sidebar-left"
    | "sidebar-right";
  role: "header" | "hero" | "content" | "cta" | "footer" | "section";
}

export interface PixelLayoutAnalysis {
  imageWidth: number;
  imageHeight: number;
  aspectRatio: number;
  isDarkMode: boolean;
  bands: PixelBand[];
  /** Top dominant colors as CSS hex, ordered by frequency */
  palette: string[];
  /** Ready-to-inject description for AI prompt */
  description: string;
}

// ── internal helpers ──────────────────────────────────────────────────────────

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.min(255, Math.max(0, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function sampleRegion(
  data: Uint8ClampedArray,
  stride: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { r: number; g: number; b: number; lumMean: number; lumStd: number } {
  let sR = 0,
    sG = 0,
    sB = 0,
    sL = 0,
    n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * stride + x) * 4;
      sR += data[i];
      sG += data[i + 1];
      sB += data[i + 2];
      sL += luma(data[i], data[i + 1], data[i + 2]);
      n++;
    }
  }
  if (n === 0) return { r: 128, g: 128, b: 128, lumMean: 128, lumStd: 0 };
  const r = sR / n,
    g = sG / n,
    b = sB / n,
    lumMean = sL / n;
  let sq = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * stride + x) * 4;
      const d = luma(data[i], data[i + 1], data[i + 2]) - lumMean;
      sq += d * d;
    }
  }
  return { r, g, b, lumMean, lumStd: Math.sqrt(sq / n) };
}

function detectColumns(
  data: Uint8ClampedArray,
  gw: number,
  y0: number,
  y1: number,
): PixelBand["columnStructure"] {
  const t = Math.floor(gw / 3);
  const L = sampleRegion(data, gw, 0, y0, t, y1);
  const M = sampleRegion(data, gw, t, y0, 2 * t, y1);
  const R = sampleRegion(data, gw, 2 * t, y0, gw, y1);
  const diff = (a: typeof L, b: typeof L) => Math.abs(a.lumMean - b.lumMean);
  const lm = diff(L, M),
    mr = diff(M, R),
    lr = diff(L, R);
  if (lm > 22 && mr > 22) return "three-column";
  if (lr > 28) return L.lumMean < R.lumMean ? "sidebar-left" : "sidebar-right";
  if (lm > 18 && mr > 18) return "two-column";
  return "full-width";
}

function guessRole(
  idx: number,
  total: number,
  brightness: PixelBand["brightness"],
  density: PixelBand["contentDensity"],
  cols: PixelBand["columnStructure"],
): PixelBand["role"] {
  const pct = idx / total;
  if (pct < 0.13) return "header";
  if (pct > 0.87) return "footer";
  if (pct > 0.6 && pct < 0.86 && brightness !== "light" && density === "sparse")
    return "cta";
  if (pct < 0.38 && density !== "sparse") return "hero";
  if (cols !== "full-width") return "content";
  return "section";
}

function extractPalette(data: Uint8ClampedArray, topN = 6): string[] {
  const freq = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    // quantise each channel to nearest 32 to cluster similar colors
    const key = toHex(
      Math.round(data[i] / 32) * 32,
      Math.round(data[i + 1] / 32) * 32,
      Math.round(data[i + 2] / 32) * 32,
    );
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([hex]) => hex);
}

const ROLE_LBL: Record<PixelBand["role"], string> = {
  header: "Header / Navigation",
  hero: "Hero / Banner",
  content: "Main Content",
  section: "Section",
  cta: "CTA / Call-to-Action",
  footer: "Footer",
};
const DENSITY_LBL: Record<PixelBand["contentDensity"], string> = {
  sparse: "solid background (minimal elements)",
  medium: "moderate content density",
  dense: "high content density (text/images/cards)",
};
const COL_LBL: Record<PixelBand["columnStructure"], string> = {
  "full-width": "full-width",
  "two-column": "2-column",
  "three-column": "3-column",
  "sidebar-left": "left-sidebar",
  "sidebar-right": "right-sidebar",
};

// ── Public export ─────────────────────────────────────────────────────────────

/**
 * Analyse the layout structure of an uploaded image via pixel sampling.
 * Returns quantitative proportions + palette for injection into the AI prompt,
 * enabling the AI to replicate the exact visual weight of each section.
 *
 * Only works with data: URLs or same-origin URLs (browser canvas policy).
 */
export function analyzePixelLayout(
  imageDataUrl: string,
  numBands = 8,
  sampleSize = 80,
): Promise<PixelLayoutAnalysis> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const W = img.naturalWidth,
        H = img.naturalHeight;
      if (!W || !H) {
        reject(new Error("Invalid image dimensions"));
        return;
      }

      const scale = Math.min(1, sampleSize / Math.max(W, H));
      const gw = Math.max(1, Math.floor(W * scale));
      const gh = Math.max(1, Math.floor(H * scale));

      const cv = document.createElement("canvas");
      cv.width = gw;
      cv.height = gh;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Canvas unsupported"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, gw, gh);

      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, gw, gh);
      } catch {
        reject(new Error("Cannot read pixels (CORS)"));
        return;
      }

      const data = imageData.data;
      const palette = extractPalette(data, 6);

      const overall = sampleRegion(data, gw, 0, 0, gw, gh);
      const isDarkMode = overall.lumMean < 105;

      // ── Per-band analysis ─────────────────────────────────────────────
      const bh = gh / numBands;
      const rawBands: PixelBand[] = [];
      for (let b = 0; b < numBands; b++) {
        const y0 = Math.floor(b * bh);
        const y1 = Math.min(gh, Math.floor((b + 1) * bh));
        const s = sampleRegion(data, gw, 0, y0, gw, y1);

        const brightness: PixelBand["brightness"] =
          s.lumMean < 85 ? "dark" : s.lumMean > 168 ? "light" : "medium";
        const contentDensity: PixelBand["contentDensity"] =
          s.lumStd < 14 ? "sparse" : s.lumStd < 38 ? "medium" : "dense";
        const columnStructure = detectColumns(data, gw, y0, y1);
        const role = guessRole(
          b,
          numBands,
          brightness,
          contentDensity,
          columnStructure,
        );

        rawBands.push({
          topPercent: Math.round((b / numBands) * 100),
          heightPercent: Math.round(100 / numBands),
          avgColor: toHex(s.r, s.g, s.b),
          brightness,
          contentDensity,
          columnStructure,
          role,
        });
      }

      // ── Merge consecutive same-role bands ─────────────────────────────
      const bands: PixelBand[] = [];
      for (const band of rawBands) {
        const prev = bands[bands.length - 1];
        if (
          prev &&
          prev.role === band.role &&
          prev.columnStructure === band.columnStructure
        ) {
          prev.heightPercent += band.heightPercent;
        } else {
          bands.push({ ...band });
        }
      }

      // ── Build AI-ready description ────────────────────────────────────
      const ar = (W / H).toFixed(2);
      const orient = W > H ? "landscape" : W < H ? "portrait" : "square";

      const lines: string[] = [
        `=== PIXEL LAYOUT ANALYSIS (use to match proportions exactly) ===`,
        `Image: ${W}×${H}px | Aspect ratio: ${ar} (${orient}) | Mode: ${isDarkMode ? "Dark" : "Light"} background`,
        ``,
        `Section breakdown (top → bottom) — REPLICATE THESE VERTICAL PROPORTIONS:`,
      ];

      bands.forEach((band, i) => {
        lines.push(
          `  ${i + 1}. [${band.topPercent}%–${band.topPercent + band.heightPercent}%] ` +
            `${ROLE_LBL[band.role]} | color: ${band.avgColor} | ${band.brightness} bg | ` +
            `${DENSITY_LBL[band.contentDensity]} | ${COL_LBL[band.columnStructure]}`,
        );
      });

      lines.push(
        ``,
        `Dominant palette (use these colors, not random ones): ${palette.join("  ")}`,
        ``,
        `KEY RULES derived from this analysis:`,
        `- Each section's height % in the HTML must approximately match the % ranges above.`,
        `- Use Tailwind arbitrary bg-[#rrggbb] values to match the exact section colors.`,
        `- Column layouts per section: follow the detected structure (2-column, 3-column, etc.).`,
        `- Overall page background: ${isDarkMode ? "dark (use dark bg classes like bg-slate-900)" : "light (use bg-white or bg-slate-50)"}.`,
        `=== END PIXEL LAYOUT ANALYSIS ===`,
      );

      resolve({
        imageWidth: W,
        imageHeight: H,
        aspectRatio: W / H,
        isDarkMode,
        bands,
        palette,
        description: lines.join("\n"),
      });
    };
    img.onerror = () => reject(new Error("Failed to load image for analysis."));
    img.src = imageDataUrl;
  });
}
