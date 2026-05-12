/**
 * Color extraction and replacement utilities.
 * Parses CSS/HTML for colors, categorizes them, and supports in-place replacement.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtractedColor {
  hex: string;
  name: string;
  usage: string[];
}

// ─── Tailwind Color Name Map ─────────────────────────────────────────────────

const TAILWIND_COLORS: Record<string, string> = {
  // Slate
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",
  "slate-950": "#020617",
  // Gray
  "gray-50": "#f9fafb",
  "gray-100": "#f3f4f6",
  "gray-200": "#e5e7eb",
  "gray-300": "#d1d5db",
  "gray-400": "#9ca3af",
  "gray-500": "#6b7280",
  "gray-600": "#4b5563",
  "gray-700": "#374151",
  "gray-800": "#1f2937",
  "gray-900": "#111827",
  "gray-950": "#030712",
  // Red
  "red-50": "#fef2f2",
  "red-100": "#fee2e2",
  "red-200": "#fecaca",
  "red-300": "#fca5a5",
  "red-400": "#f87171",
  "red-500": "#ef4444",
  "red-600": "#dc2626",
  "red-700": "#b91c1c",
  "red-800": "#991b1b",
  "red-900": "#7f1d1d",
  // Orange
  "orange-400": "#fb923c",
  "orange-500": "#f97316",
  "orange-600": "#ea580c",
  // Amber
  "amber-400": "#fbbf24",
  "amber-500": "#f59e0b",
  "amber-600": "#d97706",
  // Yellow
  "yellow-400": "#facc15",
  "yellow-500": "#eab308",
  // Green
  "green-400": "#4ade80",
  "green-500": "#22c55e",
  "green-600": "#16a34a",
  "green-700": "#15803d",
  // Emerald
  "emerald-400": "#34d399",
  "emerald-500": "#10b981",
  "emerald-600": "#059669",
  // Teal
  "teal-400": "#2dd4bf",
  "teal-500": "#14b8a6",
  // Cyan
  "cyan-400": "#22d3ee",
  "cyan-500": "#06b6d4",
  "cyan-600": "#0891b2",
  // Blue
  "blue-400": "#60a5fa",
  "blue-500": "#3b82f6",
  "blue-600": "#2563eb",
  "blue-700": "#1d4ed8",
  // Indigo
  "indigo-400": "#818cf8",
  "indigo-500": "#6366f1",
  "indigo-600": "#4f46e5",
  "indigo-700": "#4338ca",
  // Violet
  "violet-400": "#a78bfa",
  "violet-500": "#8b5cf6",
  "violet-600": "#7c3aed",
  // Purple
  "purple-400": "#c084fc",
  "purple-500": "#a855f7",
  "purple-600": "#9333ea",
  // Pink
  "pink-400": "#f472b6",
  "pink-500": "#ec4899",
  "pink-600": "#db2777",
  // Rose
  "rose-400": "#fb7185",
  "rose-500": "#f43f5e",
  "rose-600": "#e11d48",
  // White/Black
  white: "#ffffff",
  black: "#000000",
  transparent: "#00000000",
};

/** Reverse map: hex → tailwind name */
const HEX_TO_TAILWIND = new Map<string, string>();
for (const [name, hex] of Object.entries(TAILWIND_COLORS)) {
  HEX_TO_TAILWIND.set(hex.toLowerCase(), name);
}

// ─── Color Conversion ────────────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function normalizeHex(hex: string): string {
  hex = hex.replace(/^#/, "").toLowerCase();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return `#${hex}`;
}

/**
 * Convert an rgb() / rgba() string to hex.
 */
function rgbStringToHex(rgbStr: string): string | null {
  const match = rgbStr.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/,
  );
  if (!match) return null;
  return rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
}

/**
 * Map a hex to its nearest Tailwind color name (or return "custom").
 */
function getColorName(hex: string): string {
  const normalized = normalizeHex(hex);

  // Exact match
  const tailwindName = HEX_TO_TAILWIND.get(normalized);
  if (tailwindName) return tailwindName;

  // Check if it's a known background/text/accent
  const rgb = hexToRgb(normalized);
  const { r, g, b } = rgb;

  // Is it white/near-white?
  if (r > 245 && g > 245 && b > 245) return "white";
  // Is it black/near-black?
  if (r < 15 && g < 15 && b < 15) return "black";
  // Is it grayish?
  const avg = (r + g + b) / 3;
  const variance = Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
  if (variance < 20) {
    if (avg > 200) return "light gray";
    if (avg > 128) return "gray";
    if (avg > 64) return "dark gray";
    return "very dark gray";
  }

  // Find closest named color
  const tailwindName2 = HEX_TO_TAILWIND.get(normalized);
  return tailwindName2 ?? "custom";
}

// ─── Extraction from CSS ─────────────────────────────────────────────────────

/**
 * Extract all colors from CSS text.
 * Handles hex (#xxx, #xxxxxx), rgb(), rgba(), hsl(), hsla(), and Tailwind class references.
 */
export function extractColorsFromCSS(
  css: string,
): ExtractedColor[] {
  const colorMap = new Map<string, { count: number; contexts: Set<string> }>();

  // Helper to record a color
  const record = (hex: string, context: string) => {
    const normalized = normalizeHex(hex);
    if (!colorMap.has(normalized)) {
      colorMap.set(normalized, { count: 0, contexts: new Set() });
    }
    const entry = colorMap.get(normalized)!;
    entry.count++;
    entry.contexts.add(context);
  };

  // Extract hex colors
  const hexRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
  let match: RegExpExecArray | null;
  while ((match = hexRegex.exec(css)) !== null) {
    record(match[0], `css:${match.index}`);
  }

  // Extract rgb/rgba
  const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\)/g;
  while ((match = rgbRegex.exec(css)) !== null) {
    const hex = rgbStringToHex(match[0]);
    if (hex) record(hex, `css:${match.index}`);
  }

  // Extract hsl/hsla (convert to hex)
  const hslRegex =
    /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*[\d.]+)?\s*\)/g;
  while ((match = hslRegex.exec(css)) !== null) {
    const h = parseFloat(match[1]);
    const s = parseFloat(match[2]) / 100;
    const l = parseFloat(match[3]) / 100;
    const hex = hslToHex(h, s, l);
    if (hex) record(hex, `css:${match.index}`);
  }

  // Build result
  return Array.from(colorMap.entries()).map(([hex, { count, contexts }]) => ({
    hex,
    name: getColorName(hex),
    usage: [`CSS (${count}×)`, ...Array.from(contexts).slice(0, 2)],
  }));
}

// ─── Extraction from HTML ────────────────────────────────────────────────────

/**
 * Extract all colors from HTML (inline styles + Tailwind classes).
 */
export function extractColorsFromHTML(
  html: string,
): ExtractedColor[] {
  const colorMap = new Map<string, { count: number; contexts: Set<string> }>();

  const record = (hex: string, context: string) => {
    const normalized = normalizeHex(hex);
    if (!colorMap.has(normalized)) {
      colorMap.set(normalized, { count: 0, contexts: new Set() });
    }
    const entry = colorMap.get(normalized)!;
    entry.count++;
    entry.contexts.add(context);
  };

  // 1. Extract from inline style="..." attributes
  const inlineStyleRegex = /style="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = inlineStyleRegex.exec(html)) !== null) {
    const styleContent = match[1];

    // Hex colors
    const hexMatch = styleContent.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g);
    if (hexMatch) {
      hexMatch.forEach((h) => record(h, "inline-style"));
    }

    // rgb/rgba
    const rgbMatch = styleContent.match(
      /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\)/g,
    );
    if (rgbMatch) {
      rgbMatch.forEach((r) => {
        const hex = rgbStringToHex(r);
        if (hex) record(hex, "inline-style");
      });
    }
  }

  // 2. Extract from Tailwind color classes
  // Pattern: text-{color}, bg-{color}, border-{color}, ring-{color}, etc.
  const twColorRegex =
    /(?:text|bg|border|ring|outline|shadow|from|via|to|accent|fill|stroke|caret|decoration|divide|placeholder)-(?:\[([^\]]+)\]|(\w+)-(\d+)(?:\/(\d+))?)/g;

  while ((match = twColorRegex.exec(html)) !== null) {
    if (match[1]) {
      // Arbitrary value: bg-[#ff0000]
      const arbitrary = match[1];
      const hexMatch = arbitrary.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/);
      if (hexMatch) {
        record(hexMatch[0], `tw:${match[0]}`);
      } else if (arbitrary.startsWith("rgb")) {
        const hex = rgbStringToHex(arbitrary);
        if (hex) record(hex, `tw:${match[0]}`);
      }
    } else if (match[2] && match[3]) {
      // Named: bg-slate-500, text-red-600
      const colorName = `${match[2]}-${match[3]}`;
      const hex = TAILWIND_COLORS[colorName];
      if (hex) {
        record(hex, `tw:${match[0]}`);
      }
    }
  }

  // Build result
  return Array.from(colorMap.entries()).map(([hex, { count, contexts }]) => ({
    hex,
    name: getColorName(hex),
    usage: [`HTML (${count}×)`, ...Array.from(contexts).slice(0, 3)],
  }));
}

// ─── Color Replacement ───────────────────────────────────────────────────────

/**
 * Replace all instances of a color in HTML and CSS.
 * Handles hex (all lengths), rgb/rgba, and Tailwind class references.
 */
export function replaceColorInCode(
  html: string,
  css: string,
  oldColor: string,
  newColor: string,
): { html: string; css: string } {
  const normalizedOld = normalizeHex(oldColor);
  const normalizedNew = normalizeHex(newColor);
  const oldRgb = hexToRgb(normalizedOld);
  const oldShort =
    normalizedOld.length === 7 &&
    normalizedOld[1] === normalizedOld[2] &&
    normalizedOld[3] === normalizedOld[4] &&
    normalizedOld[5] === normalizedOld[6]
      ? `#${normalizedOld[1]}${normalizedOld[3]}${normalizedOld[5]}`
      : null;

  let newHtml = html;
  let newCss = css;

  // Replace hex in both
  const hexReplacementRegex = new RegExp(
    escapeRegex(normalizedOld) +
      (oldShort ? `|${escapeRegex(oldShort)}` : ""),
    "gi",
  );

  newHtml = newHtml.replace(hexReplacementRegex, normalizedNew);
  newCss = newCss.replace(hexReplacementRegex, normalizedNew);

  // Replace rgb/rgba variants
  const rgbPatterns = [
    `rgb\\(${oldRgb.r},\\s*${oldRgb.g},\\s*${oldRgb.b}\\)`,
    `rgba\\(${oldRgb.r},\\s*${oldRgb.g},\\s*${oldRgb.b},\\s*([\\d.]+)\\)`,
  ];

  const newRgb = hexToRgb(normalizedNew);

  for (const pattern of rgbPatterns) {
    const regex = new RegExp(pattern, "gi");
    newHtml = newHtml.replace(regex, (fullMatch, alpha?: string) => {
      if (alpha !== undefined) {
        return `rgba(${newRgb.r}, ${newRgb.g}, ${newRgb.b}, ${alpha})`;
      }
      return `rgb(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`;
    });
    newCss = newCss.replace(regex, (fullMatch, alpha?: string) => {
      if (alpha !== undefined) {
        return `rgba(${newRgb.r}, ${newRgb.g}, ${newRgb.b}, ${alpha})`;
      }
      return `rgb(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`;
    });
  }

  // Replace Tailwind arbitrary color values
  const twArbitraryRegex = new RegExp(
    `(\\[)${escapeRegex(normalizedOld)}(\\])`,
    "gi",
  );
  newHtml = newHtml.replace(twArbitraryRegex, `$1${normalizedNew}$2`);

  return { html: newHtml, css: newCss };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hslToHex(h: number, s: number, l: number): string {
  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${v.toString(16).padStart(2, "0").repeat(3)}`;
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h / 360) * 255);
  const b = Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Categorize a color for display purposes.
 */
export function categorizeColor(hex: string): string {
  const { r, g, b } = hexToRgb(normalizeHex(hex));
  const avg = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  // Neutral
  if (saturation < 0.1) return "Neutral";
  // Very light or very dark
  if (avg > 230 || avg < 25) return "Neutral";

  // Semantic colors
  if (r > 200 && g < 100 && b < 100) return "Semantic"; // red-ish
  if (r < 100 && g > 150 && b < 100) return "Semantic"; // green-ish
  if (r < 100 && g < 100 && b > 180) return "Primary"; // blue-ish
  if (r > 200 && g > 180 && b < 100) return "Semantic"; // yellow-ish

  // By position in the palette
  if (saturation > 0.5) {
    if (avg > 150) return "Accent";
    return "Primary";
  }

  return "Secondary";
}
