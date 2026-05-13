self.onmessage = async (e: MessageEvent<{ imageDataUrl: string; numBands: number; sampleSize: number }>) => {
  const { imageDataUrl, numBands = 8, sampleSize = 80 } = e.data;

  const result = await analyzePixelLayoutInWorker(imageDataUrl, numBands, sampleSize);
  self.postMessage(result);
};

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0")).join("");
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
  let sR = 0, sG = 0, sB = 0, sL = 0, n = 0;
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
  const r = sR / n, g = sG / n, b = sB / n, lumMean = sL / n;
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

function detectColumns(data: Uint8ClampedArray, gw: number, y0: number, y1: number): string {
  const t = Math.floor(gw / 3);
  const L = sampleRegion(data, gw, 0, y0, t, y1);
  const M = sampleRegion(data, gw, t, y0, 2 * t, y1);
  const R = sampleRegion(data, gw, 2 * t, y0, gw, y1);
  const diff = (a: typeof L, b: typeof L) => Math.abs(a.lumMean - b.lumMean);
  const lm = diff(L, M), mr = diff(M, R), lr = diff(L, R);
  if (lm > 22 && mr > 22) return "three-column";
  if (lr > 28) return L.lumMean < R.lumMean ? "sidebar-left" : "sidebar-right";
  if (lm > 18 && mr > 18) return "two-column";
  return "full-width";
}

function guessRole(idx: number, total: number, brightness: string, density: string, cols: string): string {
  const pct = idx / total;
  if (pct < 0.13) return "header";
  if (pct > 0.87) return "footer";
  if (pct > 0.6 && pct < 0.86 && brightness !== "light" && density === "sparse") return "cta";
  if (pct < 0.38 && density !== "sparse") return "hero";
  if (cols !== "full-width") return "content";
  return "section";
}

function extractPalette(data: Uint8ClampedArray, topN = 6): string[] {
  const freq = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const key = toHex(Math.round(data[i] / 32) * 32, Math.round(data[i + 1] / 32) * 32, Math.round(data[i + 2] / 32) * 32);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([hex]) => hex);
}

async function analyzePixelLayoutInWorker(imageDataUrl: string, numBands = 8, sampleSize = 80) {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });

  const W = img.naturalWidth, H = img.naturalHeight;
  if (!W || !H) throw new Error("Invalid image dimensions");

  const scale = Math.min(1, sampleSize / Math.max(W, H));
  const gw = Math.max(1, Math.floor(W * scale));
  const gh = Math.max(1, Math.floor(H * scale));

  const cv = new OffscreenCanvas(gw, gh);
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, gw, gh);

  const imageData = ctx.getImageData(0, 0, gw, gh);
  const data = imageData.data;
  const palette = extractPalette(data, 6);

  const overall = sampleRegion(data, gw, 0, 0, gw, gh);
  const isDarkMode = overall.lumMean < 105;

  const bh = gh / numBands;
  const rawBands: any[] = [];
  for (let b = 0; b < numBands; b++) {
    const y0 = Math.floor(b * bh);
    const y1 = Math.min(gh, Math.floor((b + 1) * bh));
    const s = sampleRegion(data, gw, 0, y0, gw, y1);
    const brightness = s.lumMean < 85 ? "dark" : s.lumMean > 168 ? "light" : "medium";
    const contentDensity = s.lumStd < 14 ? "sparse" : s.lumStd < 38 ? "medium" : "dense";
    const columnStructure = detectColumns(data, gw, y0, y1);
    const role = guessRole(b, numBands, brightness, contentDensity, columnStructure);
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

  const bands: any[] = [];
  for (const band of rawBands) {
    const prev = bands[bands.length - 1];
    if (prev && prev.role === band.role && prev.columnStructure === band.columnStructure) {
      prev.heightPercent += band.heightPercent;
    } else {
      bands.push({ ...band });
    }
  }

  const ar = (W / H).toFixed(2);
  const orient = W > H ? "landscape" : W < H ? "portrait" : "square";

  const roleLabels: Record<string, string> = {
    header: "Header / Navigation",
    hero: "Hero / Banner",
    content: "Main Content",
    section: "Section",
    cta: "CTA / Call-to-Action",
    footer: "Footer",
  };
  const densityLabels: Record<string, string> = {
    sparse: "solid background (minimal elements)",
    medium: "moderate content density",
    dense: "high content density (text/images/cards)",
  };
  const colLabels: Record<string, string> = {
    "full-width": "full-width",
    "two-column": "2-column",
    "three-column": "3-column",
    "sidebar-left": "left-sidebar",
    "sidebar-right": "right-sidebar",
  };

  const lines: string[] = [
    `=== PIXEL LAYOUT ANALYSIS ===`,
    `Image: ${W}\u00d7${H}px | Aspect ratio: ${ar} (${orient}) | Mode: ${isDarkMode ? "Dark" : "Light"} background`,
    ``,
    `Section breakdown (top \u2192 bottom):`,
  ];
  bands.forEach((band, i) => {
    lines.push(
      `  ${i + 1}. [${band.topPercent}%\u2013${band.topPercent + band.heightPercent}%] ` +
      `${roleLabels[band.role] || band.role} | color: ${band.avgColor} | ${band.brightness} bg | ` +
      `${densityLabels[band.contentDensity] || band.contentDensity} | ${colLabels[band.columnStructure] || band.columnStructure}`,
    );
  });
  lines.push(``, `Dominant palette: ${palette.join("  ")}`);
  lines.push(`=== END PIXEL LAYOUT ANALYSIS ===`);

  return {
    imageWidth: W,
    imageHeight: H,
    aspectRatio: W / H,
    isDarkMode,
    bands,
    palette,
    description: lines.join("\n"),
  };
}
