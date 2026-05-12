/**
 * Dark mode generation utilities.
 * Analyzes existing CSS and produces dark-mode variants by inverting
 * lightness values, swapping background/text colors, and adjusting shadows.
 */

// ─── Color Conversion Helpers ────────────────────────────────────────────────

interface HSL {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): HSL {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s, l };
}

function hslToHex(hsl: HSL): string {
  const { h, s, l } = hsl;

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

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── Known Color Swaps ───────────────────────────────────────────────────────

/** Light → Dark background/text swaps */
const COLOR_SWAPS: Array<[string, string]> = [
  // White ↔ near-black
  ["#ffffff", "#0f172a"],
  ["#fff", "#0f172a"],
  // Very light grays ↔ dark grays
  ["#f8fafc", "#1e293b"],
  ["#f1f5f9", "#0f172a"],
  ["#f9fafb", "#111827"],
  ["#fafafa", "#18181b"],
  ["#f5f5f5", "#27272a"],
  ["#e5e7eb", "#374151"],
  ["#e2e8f0", "#334155"],
  // Slate shades
  ["#cbd5e1", "#475569"],
  ["#94a3b8", "#64748b"],
  // Near-black ↔ near-white
  ["#000000", "#f8fafc"],
  ["#000", "#f8fafc"],
  ["#0f172a", "#f8fafc"],
  ["#1e293b", "#f1f5f9"],
  ["#111827", "#f9fafb"],
  ["#18181b", "#fafafa"],
  ["#27272a", "#f5f5f5"],
  // Common text colors
  ["#374151", "#d1d5db"],
  ["#334155", "#cbd5e1"],
  ["#4b5563", "#9ca3af"],
  ["#6b7280", "#9ca3af"],
];

/** Map of light → dark and dark → light for quick lookup */
const SWAP_MAP = new Map<string, string>();
for (const [light, dark] of COLOR_SWAPS) {
  SWAP_MAP.set(light.toLowerCase(), dark.toLowerCase());
  SWAP_MAP.set(dark.toLowerCase(), light.toLowerCase());
}

// ─── Core Inversion Logic ────────────────────────────────────────────────────

/**
 * Normalize a hex color to lowercase 7-char format.
 */
function normalizeHex(hex: string): string {
  hex = hex.replace(/^#/, "").toLowerCase();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return `#${hex}`;
}

/**
 * Invert a single hex color for dark mode.
 * Uses HSL lightness inversion with known color swaps as overrides.
 */
function invertColor(hex: string): string {
  const normalized = normalizeHex(hex);

  // Check known swaps first
  const swapped = SWAP_MAP.get(normalized);
  if (swapped) return swapped;

  // Convert to HSL and invert lightness
  const hsl = hexToHsl(normalized);

  // Invert lightness
  const newLightness = 1 - hsl.l;

  // Keep hue, adjust saturation slightly for dark backgrounds
  // Desaturate very high-saturation colors slightly to avoid eye strain
  const adjustedSaturation =
    newLightness < 0.3
      ? Math.min(hsl.s * 1.1, 1) // boost saturation in dark mode
      : hsl.s * 0.95; // slightly reduce in light mode

  return hslToHex({ h: hsl.h, s: adjustedSaturation, l: newLightness });
}

/**
 * Invert an rgb(...) or rgba(...) color string.
 */
function invertRgbColor(rgbStr: string): string {
  const match = rgbStr.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/,
  );
  if (!match) return rgbStr;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

  const hex = rgbToHex(r, g, b);
  const invertedHex = invertColor(hex);

  if (a < 1) {
    const invR = parseInt(invertedHex.slice(1, 3), 16);
    const invG = parseInt(invertedHex.slice(3, 5), 16);
    const invB = parseInt(invertedHex.slice(5, 7), 16);
    return `rgba(${invR}, ${invG}, ${invB}, ${a})`;
  }

  return invertedHex;
}

/**
 * Invert box-shadow values (swap dark shadow colors for light glow variants).
 */
function invertShadow(shadow: string): string {
  // Replace color values within shadow declarations
  return shadow
    .replace(
      /rgba?\([^)]+\)/g,
      (match) => invertRgbColor(match),
    )
    .replace(/#[0-9a-fA-F]{3,8}\b/g, (match) => invertColor(match));
}

// ─── CSS Variable Extraction ─────────────────────────────────────────────────

/**
 * Extract CSS custom properties from `:root` or `html` blocks.
 * Returns a record mapping variable names (without `--`) to their values.
 */
export function extractCSSVariables(css: string): Record<string, string> {
  const variables: Record<string, string> = {};

  // Match :root { ... } or html { ... } blocks
  const rootBlockRegex = /(?::root|html)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = rootBlockRegex.exec(css)) !== null) {
    const block = match[1];
    // Match each --variable: value;
    const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
    let varMatch: RegExpExecArray | null;

    while ((varMatch = varRegex.exec(block)) !== null) {
      variables[varMatch[1]] = varMatch[2].trim();
    }
  }

  return variables;
}

/**
 * Invert a CSS variable value.
 * Handles hex, rgb, rgba, and falls through for non-color values.
 */
function invertVariableValue(value: string): string {
  const trimmed = value.trim();

  // Hex color
  if (/^#([0-9a-fA-F]{3,8})$/.test(trimmed)) {
    return invertColor(trimmed);
  }

  // rgb / rgba
  if (/^rgba?\(/.test(trimmed)) {
    return invertRgbColor(trimmed);
  }

  // hsl / hsla — extract and invert
  const hslMatch = trimmed.match(
    /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const a = hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1;
    const newL = 1 - l;
    const hex = hslToHex({ h, s, l: newL });
    if (a < 1) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return hex;
  }

  // Not a color value — return as-is (e.g., spacing, font-size)
  return trimmed;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a dark-mode CSS variant from existing CSS.
 *
 * 1. Extracts `:root` / `html` CSS custom properties
 * 2. Inverts their lightness values
 * 3. Swaps known background / text color pairs
 * 4. Inverts box-shadows to light glow variants
 */
export function generateDarkModeCSS(css: string): string {
  const variables = extractCSSVariables(css);
  const varNames = Object.keys(variables);

  if (varNames.length === 0) {
    // No custom properties found — generate a generic dark override
    return generateGenericDarkCSS(css);
  }

  // Build dark-mode custom properties block
  const darkVars = varNames
    .map((name) => {
      const original = variables[name];
      const inverted = invertVariableValue(original);
      return `    --${name}: ${inverted};`;
    })
    .join("\n");

  const darkBlock = `:root {\n${darkVars}\n  }`;

  // Also inline-invert common color declarations throughout the CSS
  const invertedBody = invertCSSDeclarations(css);

  return `${darkBlock}\n\n${invertedBody}`;
}

/**
 * Generate dark CSS as a `@media (prefers-color-scheme: dark)` wrapper.
 */
export function generateDarkModeMediaQuery(darkCss: string): string {
  return `@media (prefers-color-scheme: dark) {\n${indentBlock(darkCss, 2)}\n}`;
}

/**
 * Generate dark CSS using a `.dark` class-based toggle approach.
 */
export function generateDarkModeToggle(darkCss: string): string {
  return `.dark {\n${indentBlock(darkCss, 2)}\n}`;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Invert hex and rgb color values found inside CSS property declarations
 * (not inside custom property blocks, which are handled separately).
 */
function invertCSSDeclarations(css: string): string {
  // Replace hex colors outside of :root/html blocks
  return css
    .replace(/#[0-9a-fA-F]{3,8}\b/g, (match) => {
      // Skip very short non-color hex (e.g. #000 shorthand inside vars)
      if (match.length < 4) return match;
      return invertColor(match);
    })
    .replace(/rgba?\([^)]+\)/g, (match) => invertRgbColor(match))
    .replace(
      /box-shadow\s*:\s*([^;]+);/gi,
      (_match, shadowValue: string) => {
        return `box-shadow: ${invertShadow(shadowValue)};`;
      },
    );
}

/**
 * Generate a generic dark CSS block when no CSS custom properties exist.
 * Wraps common property overrides.
 */
function generateGenericDarkCSS(css: string): string {
  const overrides: string[] = [];

  // If the CSS contains body/html background rules, invert them
  if (/background(?:-color)?\s*:/i.test(css)) {
    overrides.push("  background-color: #0f172a;");
    overrides.push("  color: #f8fafc;");
  }

  // Invert all hex and rgb values in the CSS
  const inverted = invertCSSDeclarations(css);

  // Combine generic dark root with inverted declarations
  const rootBlock = `:root {\n${overrides.join("\n")}\n  }`;

  return `${rootBlock}\n\n${inverted}`;
}

/**
 * Indent every line of a block by the given number of spaces.
 */
function indentBlock(block: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return block
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}
