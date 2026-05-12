/**
 * Design System Documentation Generator
 * Extracts design tokens from HTML/CSS and generates standalone documentation.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface DesignSystemData {
  colors: Array<{ name: string; hex: string; usage: string }>;
  typography: Array<{
    name: string;
    family: string;
    size: string;
    weight: string;
    lineHeight: string;
  }>;
  spacing: Array<{ name: string; value: string }>;
  borderRadius: Array<{ name: string; value: string }>;
  shadows: Array<{ name: string; value: string }>;
  components: Array<{ name: string; html: string; description: string }>;
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/**
 * Extracts a complete design system from generated HTML/CSS code.
 */
export function extractDesignSystem(
  html: string,
  css: string,
): DesignSystemData {
  return {
    colors: extractColors(html, css),
    typography: extractTypography(html, css),
    spacing: extractSpacing(css),
    borderRadius: extractBorderRadius(css),
    shadows: extractShadows(css),
    components: extractComponents(html),
  };
}

// ── Color Extraction ─────────────────────────────────────────────────────────

function extractColors(
  html: string,
  css: string,
): Array<{ name: string; hex: string; usage: string }> {
  const colors: Map<string, { name: string; hex: string; usage: string }> =
    new Map();
  const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g;
  const hslRegex =
    /hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%(?:\s*,\s*[\d.]+)?\s*\)/g;
  const cssVarRegex = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g;

  // Extract from CSS custom properties first
  let match: RegExpExecArray | null;
  while ((match = cssVarRegex.exec(css)) !== null) {
    const name = match[1];
    const value = normalizeColor(match[2]);
    if (value && !colors.has(value)) {
      colors.set(value, { name, hex: value, usage: `--${name}` });
    }
  }

  // Extract hex colors from CSS
  while ((match = hexRegex.exec(css)) !== null) {
    const hex = normalizeColor(match[0]);
    if (hex && !colors.has(hex)) {
      const name = `color-${colors.size + 1}`;
      colors.set(hex, { name, hex, usage: guessColorUsage(css, hex) });
    }
  }

  // Extract hex colors from HTML
  hexRegex.lastIndex = 0;
  while ((match = hexRegex.exec(html)) !== null) {
    const hex = normalizeColor(match[0]);
    if (hex && !colors.has(hex)) {
      const name = `color-${colors.size + 1}`;
      colors.set(hex, { name, hex, usage: "inline style" });
    }
  }

  // Extract rgb/rgba colors from CSS
  while ((match = rgbRegex.exec(css)) !== null) {
    const hex = rgbToHex(match[0]);
    if (hex && !colors.has(hex)) {
      const name = `color-${colors.size + 1}`;
      colors.set(hex, { name, hex, usage: guessColorUsage(css, match[0]) });
    }
  }

  // Extract hsl/hsla colors from CSS
  while ((match = hslRegex.exec(css)) !== null) {
    const hex = hslToHex(match[0]);
    if (hex && !colors.has(hex)) {
      const name = `color-${colors.size + 1}`;
      colors.set(hex, { name, hex, usage: guessColorUsage(css, match[0]) });
    }
  }

  return Array.from(colors.values()).slice(0, 50);
}

function normalizeColor(color: string): string {
  if (!color) return "";
  let c = color.trim().toLowerCase();

  // Expand 3-char hex
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    c = `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }

  // Strip alpha from 8-char hex for display
  if (/^#[0-9a-f]{8}$/i.test(c)) {
    c = c.slice(0, 7);
  }

  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  return "";
}

function rgbToHex(rgb: string): string {
  const nums = rgb.match(/\d+/g);
  if (!nums || nums.length < 3) return "";
  const r = parseInt(nums[0], 10);
  const g = parseInt(nums[1], 10);
  const b = parseInt(nums[2], 10);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hslToHex(hsl: string): string {
  const nums = hsl.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return "";
  const h = parseFloat(nums[0]) / 360;
  const s = parseFloat(nums[1]) / 100;
  const l = parseFloat(nums[2]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function guessColorUsage(css: string, color: string): string {
  const escapedColor = color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bgRegex = new RegExp(
    `background(?:-color)?\\s*:\\s*[^;]*${escapedColor}`,
    "i",
  );
  const textRegex = new RegExp(`color\\s*:\\s*[^;]*${escapedColor}`, "i");
  const borderRegex = new RegExp(`border[^:]*:\\s*[^;]*${escapedColor}`, "i");

  if (bgRegex.test(css)) return "background";
  if (textRegex.test(css)) return "text";
  if (borderRegex.test(css)) return "border";
  return "other";
}

// ── Typography Extraction ────────────────────────────────────────────────────

function extractTypography(
  html: string,
  css: string,
): Array<{
  name: string;
  family: string;
  size: string;
  weight: string;
  lineHeight: string;
}> {
  const typography: Map<
    string,
    {
      name: string;
      family: string;
      size: string;
      weight: string;
      lineHeight: string;
    }
  > = new Map();

  // Extract font-family declarations
  const fontFamilyRegex = /font-family\s*:\s*([^;]+)/gi;
  const fontSizeRegex = /font-size\s*:\s*([^;]+)/gi;
  const fontWeightRegex = /font-weight\s*:\s*([^;]+)/gi;
  const lineHeightRegex = /line-height\s*:\s*([^;]+)/gi;

  // Parse each rule block
  const ruleBlocks = css.match(/\{[^}]+\}/g) || [];
  const selectorBlocks = css.match(/([^{]+)\{[^}]+\}/g) || [];

  for (const block of selectorBlocks) {
    const selectorMatch = block.match(/^([^{]+)\{/);
    const bodyMatch = block.match(/\{([^}]+)\}/);
    if (!selectorMatch || !bodyMatch) continue;

    const selector = selectorMatch[1].trim();
    const body = bodyMatch[1];

    const familyMatch = body.match(/font-family\s*:\s*([^;]+)/i);
    const sizeMatch = body.match(/font-size\s*:\s*([^;]+)/i);
    const weightMatch = body.match(/font-weight\s*:\s*([^;]+)/i);
    const lineHeightMatch = body.match(/line-height\s*:\s*([^;]+)/i);

    if (familyMatch || sizeMatch) {
      const family = familyMatch
        ? familyMatch[1].trim().replace(/['"]/g, "").split(",")[0].trim()
        : "inherit";
      const size = sizeMatch ? sizeMatch[1].trim() : "inherit";
      const weight = weightMatch ? weightMatch[1].trim() : "400";
      const lineHeight = lineHeightMatch ? lineHeightMatch[1].trim() : "normal";

      const key = `${family}-${size}-${weight}`;
      if (!typography.has(key)) {
        const name =
          selector
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .trim()
            .slice(0, 40) || `Type ${typography.size + 1}`;
        typography.set(key, { name, family, size, weight, lineHeight });
      }
    }
  }

  // If no typography found, try to infer from HTML structure
  if (typography.size === 0) {
    const headingRegex = /<h([1-6])[^>]*>/gi;
    let hMatch: RegExpExecArray | null;
    while ((hMatch = headingRegex.exec(html)) !== null) {
      const level = parseInt(hMatch[1], 10);
      const size = `${Math.max(12, 36 - level * 4)}px`;
      const key = `heading-${level}`;
      if (!typography.has(key)) {
        typography.set(key, {
          name: `Heading ${level}`,
          family: "system-ui",
          size,
          weight: level <= 2 ? "700" : "600",
          lineHeight: "1.3",
        });
      }
    }

    if (/<p[\s>]/i.test(html)) {
      typography.set("body-text", {
        name: "Body",
        family: "system-ui",
        size: "16px",
        weight: "400",
        lineHeight: "1.6",
      });
    }
  }

  return Array.from(typography.values()).slice(0, 20);
}

// ── Spacing Extraction ───────────────────────────────────────────────────────

function extractSpacing(css: string): Array<{ name: string; value: string }> {
  const spacingMap: Map<string, string> = new Map();
  const spacingRegex =
    /(?:padding|margin|gap)\s*(?::\s*|-(?:top|right|bottom|left)\s*:\s*)([^;]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = spacingRegex.exec(css)) !== null) {
    const values = match[1].trim().split(/\s+/);
    for (const val of values) {
      const pxMatch = val.match(/^(\d+(?:\.\d+)?)px$/);
      if (pxMatch) {
        const num = parseFloat(pxMatch[1]);
        if (num > 0 && num <= 200) {
          const key = `${num}px`;
          if (!spacingMap.has(key)) {
            const name =
              num <= 4
                ? `${num}px`
                : num <= 8
                  ? `xs-${num}`
                  : num <= 16
                    ? `sm-${num}`
                    : num <= 32
                      ? `md-${num}`
                      : num <= 64
                        ? `lg-${num}`
                        : `xl-${num}`;
            spacingMap.set(key, `${num}px`);
          }
        }
      }
    }
  }

  // Also extract CSS custom property spacing tokens
  const cssVarSpacingRegex =
    /--([\w-]*(?:space|gap|pad|margin|sp)[\w-]*)\s*:\s*([^;]+)/gi;
  while ((match = cssVarSpacingRegex.exec(css)) !== null) {
    const name = match[1];
    const value = match[2].trim();
    if (!spacingMap.has(value)) {
      spacingMap.set(value, value);
    }
  }

  // Add default spacing scale if nothing found
  if (spacingMap.size === 0) {
    const defaults = [4, 8, 12, 16, 24, 32, 48, 64, 96];
    for (const px of defaults) {
      spacingMap.set(`${px}px`, `${px}px`);
    }
  }

  return Array.from(spacingMap.entries())
    .map(([value, _]) => ({
      name: `space-${value.replace("px", "")}`,
      value,
    }))
    .sort((a, b) => parseFloat(a.value) - parseFloat(b.value))
    .slice(0, 20);
}

// ── Border Radius Extraction ─────────────────────────────────────────────────

function extractBorderRadius(
  css: string,
): Array<{ name: string; value: string }> {
  const radiusMap: Map<string, string> = new Map();
  const radiusRegex = /border-radius\s*:\s*([^;]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = radiusRegex.exec(css)) !== null) {
    const values = match[1].trim().split(/\s+/);
    for (const val of values) {
      const pxMatch = val.match(/^(\d+(?:\.\d+)?)(px|rem|em|%)$/);
      if (pxMatch) {
        const normalized = `${pxMatch[1]}${pxMatch[2]}`;
        if (!radiusMap.has(normalized)) {
          const num = parseFloat(pxMatch[1]);
          const name =
            pxMatch[2] === "%"
              ? "full"
              : num === 0
                ? "none"
                : num <= 4
                  ? "sm"
                  : num <= 8
                    ? "md"
                    : num <= 12
                      ? "lg"
                      : num <= 16
                        ? "xl"
                        : "2xl";
          radiusMap.set(normalized, name);
        }
      }
    }
  }

  if (radiusMap.size === 0) {
    const defaults = [
      { name: "none", value: "0px" },
      { name: "sm", value: "4px" },
      { name: "md", value: "8px" },
      { name: "lg", value: "12px" },
      { name: "xl", value: "16px" },
      { name: "full", value: "9999px" },
    ];
    for (const d of defaults) {
      radiusMap.set(d.value, d.name);
    }
  }

  return Array.from(radiusMap.entries()).map(([value, name]) => ({
    name,
    value,
  }));
}

// ── Shadows Extraction ───────────────────────────────────────────────────────

function extractShadows(css: string): Array<{ name: string; value: string }> {
  const shadows: Map<string, string> = new Map();
  const shadowRegex = /box-shadow\s*:\s*([^;]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = shadowRegex.exec(css)) !== null) {
    const value = match[1].trim();
    if (!shadows.has(value)) {
      const name =
        shadows.size < 4
          ? ["sm", "md", "lg", "xl"][shadows.size]
          : `shadow-${shadows.size + 1}`;
      shadows.set(value, name);
    }
  }

  // Extract text-shadow too
  const textShadowRegex = /text-shadow\s*:\s*([^;]+)/gi;
  while ((match = textShadowRegex.exec(css)) !== null) {
    const value = match[1].trim();
    if (!shadows.has(value)) {
      shadows.set(value, `text-${shadows.size + 1}`);
    }
  }

  // CSS custom property shadows
  const cssVarShadowRegex =
    /--([\w-]*(?:shadow|elevation)[\w-]*)\s*:\s*([^;]+)/gi;
  while ((match = cssVarShadowRegex.exec(css)) !== null) {
    const value = match[2].trim();
    if (!shadows.has(value)) {
      shadows.set(value, match[1]);
    }
  }

  if (shadows.size === 0) {
    const defaults: [string, string][] = [
      ["0 1px 2px 0 rgba(0,0,0,0.05)", "sm"],
      ["0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)", "md"],
      ["0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)", "lg"],
    ];
    for (const [value, name] of defaults) {
      shadows.set(value, name);
    }
  }

  return Array.from(shadows.entries()).map(([value, name]) => ({
    name,
    value,
  }));
}

// ── Component Extraction ─────────────────────────────────────────────────────

function extractComponents(
  html: string,
): Array<{ name: string; html: string; description: string }> {
  const components: Array<{ name: string; html: string; description: string }> =
    [];

  // Look for semantic elements and common component patterns
  const sectionRegex =
    /<(section|article|nav|header|footer|main|aside)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(html)) !== null) {
    const tag = match[1];
    const attrs = match[2];
    const content = match[2] + match[3];
    const classMatch = attrs.match(/class="([^"]+)"/);
    const className = classMatch ? classMatch[1] : "";

    const name = inferComponentName(tag, className, content);
    components.push({
      name,
      html: match[0].slice(0, 500),
      description: `A ${tag} component${className ? ` with class \`${className.split(" ")[0]}\`` : ""}`,
    });
  }

  // Also extract divs with specific class patterns
  const divRegex =
    /<div[^>]*class="([^"]*(?:card|button|btn|hero|modal|form|input|nav|header|footer|sidebar|container|grid|flex)[^"]*)"[^>]*>([\s\S]*?)<\/div>/gi;
  while ((match = divRegex.exec(html)) !== null) {
    const className = match[1];
    const name = inferComponentName("div", className, match[2]);
    if (!components.some((c) => c.name === name)) {
      components.push({
        name,
        html: match[0].slice(0, 500),
        description: `A styled \`.${className.split(" ")[0]}\` component`,
      });
    }
  }

  return components.slice(0, 20);
}

function inferComponentName(
  tag: string,
  className: string,
  content: string,
): string {
  const lc = className.toLowerCase();
  if (/hero/i.test(lc)) return "Hero Section";
  if (/nav/i.test(lc) || tag === "nav") return "Navigation";
  if (/header/i.test(lc) || tag === "header") return "Header";
  if (/footer/i.test(lc) || tag === "footer") return "Footer";
  if (/card/i.test(lc)) return "Card";
  if (/btn|button/i.test(lc)) return "Button";
  if (/modal|dialog/i.test(lc)) return "Modal";
  if (/form/i.test(lc)) return "Form";
  if (/input/i.test(lc)) return "Input";
  if (/sidebar/i.test(lc)) return "Sidebar";
  if (/grid/i.test(lc)) return "Grid Layout";
  if (/container/i.test(lc)) return "Container";
  if (tag === "section") return "Section";
  if (tag === "article") return "Article";
  if (tag === "aside") return "Aside";
  return `${tag.charAt(0).toUpperCase() + tag.slice(1)} Component`;
}

// ─── HTML Generation ─────────────────────────────────────────────────────────

/**
 * Generates a beautiful, self-contained design system HTML page.
 */
export function generateDesignSystemHTML(system: DesignSystemData): string {
  const colorSwatches = system.colors
    .map(
      (c) => `
      <div class="swatch">
        <div class="swatch-color" style="background-color: ${c.hex}"></div>
        <div class="swatch-info">
          <span class="swatch-name">${c.name}</span>
          <span class="swatch-hex">${c.hex}</span>
          <span class="swatch-usage">${c.usage}</span>
        </div>
      </div>`,
    )
    .join("\n");

  const typeSpecimens = system.typography
    .map(
      (t) => `
      <div class="type-specimen">
        <div class="type-sample" style="font-family: '${t.family}', sans-serif; font-size: ${t.size}; font-weight: ${t.weight}; line-height: ${t.lineHeight}">
          The quick brown fox jumps over the lazy dog
        </div>
        <div class="type-meta">
          <strong>${t.name}</strong>
          <span>${t.family} · ${t.size} · ${t.weight} · ${t.lineHeight}</span>
        </div>
      </div>`,
    )
    .join("\n");

  const spacingBars = system.spacing
    .map(
      (s) => `
      <div class="spacing-item">
        <div class="spacing-bar" style="width: ${s.value}"></div>
        <span class="spacing-label">${s.name}: ${s.value}</span>
      </div>`,
    )
    .join("\n");

  const radiusSwatches = system.borderRadius
    .map(
      (r) => `
      <div class="radius-item">
        <div class="radius-box" style="border-radius: ${r.value}"></div>
        <span class="radius-label">${r.name}: ${r.value}</span>
      </div>`,
    )
    .join("\n");

  const shadowCards = system.shadows
    .map(
      (s) => `
      <div class="shadow-item">
        <div class="shadow-box" style="box-shadow: ${s.value}"></div>
        <span class="shadow-label">${s.name}</span>
        <code class="shadow-value">${s.value}</code>
      </div>`,
    )
    .join("\n");

  const componentCards = system.components
    .map(
      (c) => `
      <div class="component-card">
        <h3>${c.name}</h3>
        <p>${c.description}</p>
        <details>
          <summary>View HTML</summary>
          <pre><code>${escapeHTMLForCode(c.html)}</code></pre>
        </details>
      </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design System Documentation</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --accent: #6366f1;
      --accent-light: #eef2ff;
      --radius: 12px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 40px 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--border);
    }
    .subtitle { color: var(--text-muted); margin-bottom: 48px; font-size: 1.1rem; }
    section { margin-bottom: 56px; }

    /* Colors */
    .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .swatch {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .swatch:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .swatch-color { height: 80px; }
    .swatch-info { padding: 12px; display: flex; flex-direction: column; gap: 2px; }
    .swatch-name { font-weight: 600; font-size: 0.85rem; }
    .swatch-hex { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted); }
    .swatch-usage { font-size: 0.7rem; color: var(--text-muted); opacity: 0.7; }

    /* Typography */
    .type-list { display: flex; flex-direction: column; gap: 20px; }
    .type-specimen {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
    }
    .type-sample { margin-bottom: 12px; color: var(--text); }
    .type-meta { display: flex; gap: 12px; align-items: baseline; font-size: 0.8rem; color: var(--text-muted); }
    .type-meta strong { color: var(--text); }

    /* Spacing */
    .spacing-list { display: flex; flex-direction: column; gap: 12px; }
    .spacing-item { display: flex; align-items: center; gap: 16px; }
    .spacing-bar { height: 24px; background: var(--accent); border-radius: 6px; min-width: 4px; opacity: 0.7; }
    .spacing-label { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-muted); }

    /* Border Radius */
    .radius-grid { display: flex; flex-wrap: wrap; gap: 20px; }
    .radius-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .radius-box { width: 64px; height: 64px; background: var(--accent); opacity: 0.7; border: 3px solid var(--accent); background: var(--accent-light); }
    .radius-label { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted); text-align: center; }

    /* Shadows */
    .shadow-grid { display: flex; flex-wrap: wrap; gap: 20px; }
    .shadow-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .shadow-box { width: 80px; height: 80px; background: var(--card); border-radius: 12px; }
    .shadow-label { font-weight: 600; font-size: 0.85rem; }
    .shadow-value { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); max-width: 200px; text-align: center; word-break: break-all; }

    /* Components */
    .component-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .component-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }
    .component-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
    .component-card p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; }
    .component-card details { font-size: 0.8rem; }
    .component-card summary { cursor: pointer; color: var(--accent); font-weight: 600; }
    .component-card pre {
      margin-top: 8px;
      background: #1e293b;
      color: #e2e8f0;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.7rem;
      line-height: 1.5;
      max-height: 200px;
    }

    .timestamp {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.75rem;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <h1>Design System</h1>
  <p class="subtitle">Auto-generated design documentation from LayoutForge</p>

  ${
    system.colors.length > 0
      ? `<section>
    <h2>Colors</h2>
    <div class="color-grid">${colorSwatches}</div>
  </section>`
      : ""
  }

  ${
    system.typography.length > 0
      ? `<section>
    <h2>Typography</h2>
    <div class="type-list">${typeSpecimens}</div>
  </section>`
      : ""
  }

  ${
    system.spacing.length > 0
      ? `<section>
    <h2>Spacing</h2>
    <div class="spacing-list">${spacingBars}</div>
  </section>`
      : ""
  }

  ${
    system.borderRadius.length > 0
      ? `<section>
    <h2>Border Radius</h2>
    <div class="radius-grid">${radiusSwatches}</div>
  </section>`
      : ""
  }

  ${
    system.shadows.length > 0
      ? `<section>
    <h2>Shadows & Effects</h2>
    <div class="shadow-grid">${shadowCards}</div>
  </section>`
      : ""
  }

  ${
    system.components.length > 0
      ? `<section>
    <h2>Components</h2>
    <div class="component-grid">${componentCards}</div>
  </section>`
      : ""
  }

  <p class="timestamp">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} by LayoutForge</p>
</body>
</html>`;
}

function escapeHTMLForCode(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Markdown Generation ─────────────────────────────────────────────────────

/**
 * Generates Markdown documentation of the design system.
 */
export function generateDesignSystemMarkdown(system: DesignSystemData): string {
  const lines: string[] = [];

  lines.push("# Design System");
  lines.push("");
  lines.push(
    `> Auto-generated design documentation from LayoutForge · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
  );
  lines.push("");

  // Colors
  if (system.colors.length > 0) {
    lines.push("## Colors");
    lines.push("");
    lines.push("| Name | Hex | Usage |");
    lines.push("|------|-----|-------|");
    for (const c of system.colors) {
      lines.push(`| ${c.name} | \`${c.hex}\` | ${c.usage} |`);
    }
    lines.push("");
  }

  // Typography
  if (system.typography.length > 0) {
    lines.push("## Typography");
    lines.push("");
    lines.push("| Name | Family | Size | Weight | Line Height |");
    lines.push("|------|--------|------|--------|-------------|");
    for (const t of system.typography) {
      lines.push(
        `| ${t.name} | ${t.family} | ${t.size} | ${t.weight} | ${t.lineHeight} |`,
      );
    }
    lines.push("");
  }

  // Spacing
  if (system.spacing.length > 0) {
    lines.push("## Spacing");
    lines.push("");
    lines.push("| Token | Value |");
    lines.push("|-------|-------|");
    for (const s of system.spacing) {
      lines.push(`| ${s.name} | \`${s.value}\` |`);
    }
    lines.push("");
  }

  // Border Radius
  if (system.borderRadius.length > 0) {
    lines.push("## Border Radius");
    lines.push("");
    lines.push("| Token | Value |");
    lines.push("|-------|-------|");
    for (const r of system.borderRadius) {
      lines.push(`| ${r.name} | \`${r.value}\` |`);
    }
    lines.push("");
  }

  // Shadows
  if (system.shadows.length > 0) {
    lines.push("## Shadows & Effects");
    lines.push("");
    lines.push("| Name | Value |");
    lines.push("|------|-------|");
    for (const s of system.shadows) {
      lines.push(`| ${s.name} | \`${s.value}\` |`);
    }
    lines.push("");
  }

  // Components
  if (system.components.length > 0) {
    lines.push("## Components");
    lines.push("");
    for (const c of system.components) {
      lines.push(`### ${c.name}`);
      lines.push("");
      lines.push(c.description);
      lines.push("");
      lines.push("```html");
      lines.push(c.html.slice(0, 300));
      lines.push("```");
      lines.push("");
    }
  }

  return lines.join("\n");
}
