/**
 * Figma Import Service
 * Fetches Figma files via REST API and converts them to HTML/CSS.
 */

import type { DesignTokens } from "@/services/types";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface FigmaFile {
  name: string;
  role: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
  components: Record<string, FigmaComponentMeta>;
  styles: Record<string, FigmaStyleMeta>;
  schemaVersion: number;
}

export interface FigmaComponentMeta {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks: Array<{ uri: string }>;
}

export interface FigmaStyleMeta {
  key: string;
  name: string;
  styleType: "FILL" | "TEXT" | "EFFECT" | "GRID";
  description: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;
  absoluteBoundingBox?: FigmaRect;
  constraints?: { vertical: string; horizontal: string };
  size?: { x: number; y: number };
  relativeTransform?: number[][];
  fills?: FigmaFill[];
  strokes?: FigmaFill[];
  strokeWeight?: number;
  strokeAlign?: string;
  effects?: FigmaEffect[];
  opacity?: number;
  blendMode?: string;
  clipsContent?: boolean;
  background?: FigmaFill[];
  backgroundColor?: FigmaColor;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  counterAxisSizingMode?: "FIXED" | "AUTO";
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  characters?: string;
  style?: FigmaTextStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<string, FigmaTextStyle>;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  children?: FigmaNode[];
}

export interface FigmaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaFill {
  type: string;
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  color?: FigmaColor;
  scaleMode?: string;
  imageRef?: string;
  gradientHandlePositions?: FigmaRect[];
  gradientStops?: Array<{ position: number; color: FigmaColor }>;
}

export interface FigmaEffect {
  type: "INNER_SHADOW" | "DROP_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  visible?: boolean;
  radius: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  spread?: number;
}

export interface FigmaTextStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  fontSize: number;
  fontWeight: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  letterSpacing?: number;
  textCase?: string;
  textDecoration?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
}

export interface FigmaAutoLayout {
  layoutMode: "HORIZONTAL" | "VERTICAL";
  primaryAxisAlignItems: string;
  counterAxisAlignItems: string;
  primaryAxisSizingMode: string;
  counterAxisSizingMode: string;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
}

export interface ParsedComponent {
  tag: string;
  className: string;
  style: string;
  children: ParsedComponent[];
  textContent?: string;
  nodeName: string;
  nodeId: string;
}

// ─── Color Helpers ───────────────────────────────────────────────────────────

function figmaColorToHex(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  if (color.a < 1) {
    const a = Math.round(color.a * 255);
    return `${hex}${a.toString(16).padStart(2, "0")}`;
  }
  return hex;
}

function figmaColorToRgba(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a Figma file via the REST API using a Personal Access Token.
 */
export async function fetchFigmaFile(
  fileKey: string,
  token: string,
): Promise<FigmaFile> {
  const url = `https://api.figma.com/v1/files/${fileKey}?geometry=paths`;
  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": token,
    },
  });

  if (!response.ok) {
    const statusText = response.statusText || "Unknown error";
    if (response.status === 403) {
      throw new Error(
        "Access denied. Please check that your Personal Access Token is valid and has access to this file.",
      );
    }
    if (response.status === 404) {
      throw new Error(
        "File not found. Please check the file key in the URL.",
      );
    }
    throw new Error(`Figma API error (${response.status}): ${statusText}`);
  }

  return response.json();
}

/**
 * Extracts the file key from a Figma URL.
 * Supports formats like:
 *   https://www.figma.com/file/XXXXX/Name
 *   https://www.figma.com/design/XXXXX/Name
 */
export function extractFileKeyFromUrl(url: string): string | null {
  const match = url.match(
    /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/,
  );
  return match ? match[1] : null;
}

// ─── Figma Auto Layout → Flexbox CSS ─────────────────────────────────────────

/**
 * Converts a Figma Auto Layout configuration into Flexbox CSS properties.
 */
export function figmaAutoLayoutToFlexbox(layout: FigmaAutoLayout): string {
  const declarations: string[] = [];

  declarations.push(
    `display: flex`,
    `flex-direction: ${layout.layoutMode === "HORIZONTAL" ? "row" : "column"}`,
  );

  // Main axis alignment
  switch (layout.primaryAxisAlignItems) {
    case "MIN":
      declarations.push(`justify-content: flex-start`);
      break;
    case "CENTER":
      declarations.push(`justify-content: center`);
      break;
    case "MAX":
      declarations.push(`justify-content: flex-end`);
      break;
    case "SPACE_BETWEEN":
      declarations.push(`justify-content: space-between`);
      break;
  }

  // Cross axis alignment
  switch (layout.counterAxisAlignItems) {
    case "MIN":
      declarations.push(`align-items: flex-start`);
      break;
    case "CENTER":
      declarations.push(`align-items: center`);
      break;
    case "MAX":
      declarations.push(`align-items: flex-end`);
      break;
    case "SPACE_BETWEEN":
      declarations.push(`align-items: space-between`);
      break;
  }

  // Gap
  if (layout.itemSpacing > 0) {
    declarations.push(`gap: ${layout.itemSpacing}px`);
  }

  // Padding
  if (
    layout.paddingTop > 0 ||
    layout.paddingRight > 0 ||
    layout.paddingBottom > 0 ||
    layout.paddingLeft > 0
  ) {
    declarations.push(
      `padding: ${layout.paddingTop}px ${layout.paddingRight}px ${layout.paddingBottom}px ${layout.paddingLeft}px`,
    );
  }

  return declarations.join(";\n  ") + ";";
}

// ─── Parse Figma Node → ParsedComponent ──────────────────────────────────────

/**
 * Recursively converts a Figma node tree into a ParsedComponent tree
 * that can be rendered as HTML/CSS.
 */
export function parseFigmaNode(node: FigmaNode): ParsedComponent {
  const result: ParsedComponent = {
    tag: "div",
    className: "",
    style: "",
    children: [],
    nodeName: node.name,
    nodeId: node.id,
  };

  const styleParts: string[] = [];

  // Skip invisible nodes
  if (node.visible === false) {
    result.tag = "span";
    result.style = "display: none;";
    return result;
  }

  // TEXT node
  if (node.type === "TEXT" && node.characters) {
    result.tag = "p";
    result.textContent = node.characters;

    if (node.style) {
      const ts = node.style;
      if (ts.fontFamily) styleParts.push(`font-family: '${ts.fontFamily}', sans-serif`);
      if (ts.fontSize) styleParts.push(`font-size: ${ts.fontSize}px`);
      if (ts.fontWeight) styleParts.push(`font-weight: ${ts.fontWeight}`);
      if (ts.lineHeightPx) styleParts.push(`line-height: ${ts.lineHeightPx}px`);
      else if (ts.lineHeightPercent)
        styleParts.push(`line-height: ${(ts.lineHeightPercent / 100).toFixed(2)}`);
      if (ts.letterSpacing) styleParts.push(`letter-spacing: ${ts.letterSpacing}px`);
      if (ts.textDecoration === "UNDERLINE") styleParts.push(`text-decoration: underline`);
      if (ts.textDecoration === "STRIKETHROUGH") styleParts.push(`text-decoration: line-through`);
      if (ts.textCase === "UPPER") styleParts.push(`text-transform: uppercase`);
      if (ts.textCase === "LOWER") styleParts.push(`text-transform: lowercase`);
      if (ts.textAlignHorizontal) {
        const alignMap: Record<string, string> = {
          LEFT: "left",
          CENTER: "center",
          RIGHT: "right",
          JUSTIFIED: "justify",
        };
        styleParts.push(`text-align: ${alignMap[ts.textAlignHorizontal] || "left"}`);
      }
    }
  }

  // Fills → background-color / background
  if (node.fills && node.fills.length > 0) {
    const visibleFills = node.fills.filter((f) => f.visible !== false);
    if (visibleFills.length > 0) {
      const fill = visibleFills[0];
      if (fill.type === "SOLID" && fill.color) {
        const opacity = fill.opacity ?? 1;
        const color: FigmaColor = { ...fill.color, a: fill.color.a * opacity };
        if (node.type === "TEXT") {
          styleParts.push(`color: ${figmaColorToRgba(color)}`);
        } else {
          styleParts.push(`background-color: ${figmaColorToRgba(color)}`);
        }
      } else if (fill.type === "GRADIENT_LINEAR" && fill.gradientStops) {
        const stops = fill.gradientStops
          .map((s) => `${figmaColorToHex(s.color)} ${(s.position * 100).toFixed(0)}%`)
          .join(", ");
        styleParts.push(`background: linear-gradient(${stops})`);
      }
    }
  }

  // Strokes → border
  if (node.strokes && node.strokes.length > 0) {
    const visibleStrokes = node.strokes.filter((s) => s.visible !== false);
    if (visibleStrokes.length > 0) {
      const stroke = visibleStrokes[0];
      if (stroke.type === "SOLID" && stroke.color) {
        const weight = node.strokeWeight ?? 1;
        const opacity = stroke.opacity ?? 1;
        const color: FigmaColor = { ...stroke.color, a: stroke.color.a * opacity };
        styleParts.push(
          `border: ${weight}px solid ${figmaColorToRgba(color)}`,
        );
      }
    }
  }

  // Effects → box-shadow / filter
  if (node.effects && node.effects.length > 0) {
    const shadows: string[] = [];
    let blurFilter = "";

    for (const effect of node.effects) {
      if (effect.visible === false) continue;

      if (effect.type === "DROP_SHADOW" && effect.color) {
        const ox = effect.offset?.x ?? 0;
        const oy = effect.offset?.y ?? 0;
        const r = effect.radius ?? 0;
        const s = effect.spread ?? 0;
        shadows.push(
          `${ox}px ${oy}px ${r}px ${s}px ${figmaColorToRgba(effect.color)}`,
        );
      }
      if (effect.type === "INNER_SHADOW" && effect.color) {
        const ox = effect.offset?.x ?? 0;
        const oy = effect.offset?.y ?? 0;
        const r = effect.radius ?? 0;
        const s = effect.spread ?? 0;
        shadows.push(
          `inset ${ox}px ${oy}px ${r}px ${s}px ${figmaColorToRgba(effect.color)}`,
        );
      }
      if (effect.type === "LAYER_BLUR") {
        blurFilter = `blur(${effect.radius}px)`;
      }
    }

    if (shadows.length > 0) {
      styleParts.push(`box-shadow: ${shadows.join(", ")}`);
    }
    if (blurFilter) {
      styleParts.push(`filter: ${blurFilter}`);
    }
  }

  // Opacity
  if (node.opacity !== undefined && node.opacity < 1) {
    styleParts.push(`opacity: ${node.opacity}`);
  }

  // Corner radius
  if (node.cornerRadius && node.cornerRadius > 0) {
    styleParts.push(`border-radius: ${node.cornerRadius}px`);
  } else if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    styleParts.push(`border-radius: ${tl}px ${tr}px ${br}px ${bl}px`);
  }

  // Auto Layout → Flexbox
  if (node.layoutMode && node.layoutMode !== "NONE") {
    const autoLayout: FigmaAutoLayout = {
      layoutMode: node.layoutMode,
      primaryAxisAlignItems: node.primaryAxisAlignItems ?? "MIN",
      counterAxisAlignItems: node.counterAxisAlignItems ?? "MIN",
      primaryAxisSizingMode: node.primaryAxisSizingMode ?? "AUTO",
      counterAxisSizingMode: node.counterAxisSizingMode ?? "AUTO",
      paddingLeft: node.paddingLeft ?? 0,
      paddingRight: node.paddingRight ?? 0,
      paddingTop: node.paddingTop ?? 0,
      paddingBottom: node.paddingBottom ?? 0,
      itemSpacing: node.itemSpacing ?? 0,
    };
    styleParts.push(figmaAutoLayoutToFlexbox(autoLayout));
  }

  // Size
  if (node.absoluteBoundingBox) {
    const { width, height } = node.absoluteBoundingBox;
    if (node.layoutMode !== "HORIZONTAL" && node.layoutMode !== "VERTICAL") {
      styleParts.push(`width: ${width}px`);
    }
    styleParts.push(`height: ${height}px`);
  }

  // Clips content
  if (node.clipsContent) {
    styleParts.push(`overflow: hidden`);
  }

  result.style = styleParts.join(";\n  ") + (styleParts.length > 0 ? ";" : "");

  // Recurse children
  if (node.children) {
    for (const child of node.children) {
      if (child.visible !== false) {
        result.children.push(parseFigmaNode(child));
      }
    }
  }

  return result;
}

// ─── ParsedComponent → HTML/CSS ──────────────────────────────────────────────

let _classCounter = 0;

function nodeToClassName(node: ParsedComponent): string {
  const safe = node.nodeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `figma-${safe || "node"}-${_classCounter++}`;
}

/**
 * Converts a ParsedComponent tree into HTML + CSS strings.
 */
export function parsedComponentToHTML(
  component: ParsedComponent,
): { html: string; css: string } {
  _classCounter = 0;
  const cssRules: string[] = [];
  const html = renderNode(component, cssRules);
  return {
    html,
    css: cssRules.join("\n\n"),
  };
}

function renderNode(node: ParsedComponent, cssRules: string[]): string {
  const className = nodeToClassName(node);

  if (node.style) {
    cssRules.push(`.${className} {\n  ${node.style}\n}`);
  }

  if (node.textContent) {
    return `<${node.tag} class="${className}">${escapeHTML(node.textContent)}</${node.tag}>`;
  }

  const childrenHTML = node.children.map((c) => renderNode(c, cssRules)).join("\n");
  return `<${node.tag} class="${className}">\n${childrenHTML}\n</${node.tag}>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Extract Design Tokens ───────────────────────────────────────────────────

/**
 * Extracts colors, typography, spacing from Figma file styles.
 */
export function extractFigmaStyles(file: FigmaFile): DesignTokens {
  const colors: Record<string, string> = {};
  const typography: Record<string, string> = {};
  const effects: Record<string, string> = {};
  const spacingValues = new Set<number>();

  // Walk all nodes to collect fills, typography, and spacing
  walkNode(file.document, (node) => {
    // Colors from fills
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.type === "SOLID" && fill.color && fill.visible !== false) {
          const hex = figmaColorToHex(fill.color);
          const name = sanitizeTokenName(node.name);
          if (!colors[name]) {
            colors[name] = hex;
          }
        }
      }
    }

    // Typography from text nodes
    if (node.type === "TEXT" && node.style) {
      const ts = node.style;
      const key = `${ts.fontFamily}-${ts.fontSize}-${ts.fontWeight}`;
      if (!typography[key]) {
        typography[key] = `${ts.fontFamily} ${ts.fontSize}px / ${ts.lineHeightPx || "auto"} weight:${ts.fontWeight}`;
      }
    }

    // Spacing from padding and gaps
    if (node.paddingTop) spacingValues.add(node.paddingTop);
    if (node.paddingRight) spacingValues.add(node.paddingRight);
    if (node.paddingBottom) spacingValues.add(node.paddingBottom);
    if (node.paddingLeft) spacingValues.add(node.paddingLeft);
    if (node.itemSpacing) spacingValues.add(node.itemSpacing);

    // Effects
    if (node.effects) {
      for (const effect of node.effects) {
        if (effect.visible === false) continue;
        if (effect.type === "DROP_SHADOW" && effect.color) {
          const name = sanitizeTokenName(node.name);
          const ox = effect.offset?.x ?? 0;
          const oy = effect.offset?.y ?? 0;
          effects[`${name}-shadow`] = `${ox}px ${oy}px ${effect.radius}px ${figmaColorToRgba(effect.color)}`;
        }
        if (effect.type === "LAYER_BLUR") {
          const name = sanitizeTokenName(node.name);
          effects[`${name}-blur`] = `blur(${effect.radius}px)`;
        }
      }
    }
  });

  // Also collect from styles metadata
  for (const [_key, style] of Object.entries(file.styles)) {
    if (style.styleType === "FILL") {
      // Color style
      const name = sanitizeTokenName(style.name);
      if (!colors[name]) {
        colors[name] = "#000000"; // Placeholder; actual value comes from node walk
      }
    }
  }

  const spacing: { unit?: string; scale?: string[] } = {};
  if (spacingValues.size > 0) {
    const sorted = Array.from(spacingValues).sort((a, b) => a - b);
    spacing.unit = "px";
    spacing.scale = sorted.map((v) => `${v}px`);
  }

  return { colors, typography, spacing, effects };
}

function sanitizeTokenName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function walkNode(node: FigmaNode, visitor: (node: FigmaNode) => void): void {
  visitor(node);
  if (node.children) {
    for (const child of node.children) {
      walkNode(child, visitor);
    }
  }
}

// ─── Utility: Get pages and frames from FigmaFile ────────────────────────────

export interface FigmaPageSummary {
  id: string;
  name: string;
  frames: Array<{ id: string; name: string }>;
}

/**
 * Lists all pages and top-level frames in a Figma file.
 */
export function listPagesAndFrames(file: FigmaFile): FigmaPageSummary[] {
  const pages: FigmaPageSummary[] = [];

  if (file.document.children) {
    for (const page of file.document.children) {
      if (page.type === "CANVAS") {
        const frames = (page.children || [])
          .filter((c) => c.visible !== false)
          .map((c) => ({ id: c.id, name: c.name }));
        pages.push({
          id: page.id,
          name: page.name,
          frames,
        });
      }
    }
  }

  return pages;
}

/**
 * Finds a specific node by ID in the Figma file tree.
 */
export function findNodeById(
  root: FigmaNode,
  targetId: string,
): FigmaNode | null {
  if (root.id === targetId) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, targetId);
      if (found) return found;
    }
  }
  return null;
}
