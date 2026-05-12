/**
 * Performance Audit — Lighthouse-style checks for generated HTML/CSS.
 * Runs structural analysis and returns actionable findings.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditCheck {
  id: string;
  name: string;
  category: "performance" | "accessibility" | "best-practices" | "seo";
  status: "pass" | "warn" | "fail";
  score: number; // 0-100
  description: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface PerformanceReport {
  overallScore: number;
  checks: AuditCheck[];
  summary: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseHtml(html: string): Document {
  const full = html.includes("<html") ? html : `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
  const parser = new DOMParser();
  return parser.parseFromString(full, "text/html");
}

function parseCssRules(css: string): string[] {
  // Rough extraction of selectors from CSS
  const selectorRegex = /([^{}]+)\{/g;
  const selectors: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = selectorRegex.exec(css)) !== null) {
    const sel = m[1].trim();
    if (sel && !sel.startsWith("@") && !sel.startsWith("/*")) {
      selectors.push(sel);
    }
  }
  return selectors;
}

function extractClassesFromHtml(html: string): Set<string> {
  const classRegex = /class(?:Name)?="([^"]*)"/g;
  const classes = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = classRegex.exec(html)) !== null) {
    m[1].split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
  }
  return classes;
}

function getElementDepth(el: Element): number {
  let depth = 0;
  let node: Element | null = el;
  while (node.parentElement) {
    depth++;
    node = node.parentElement;
  }
  return depth;
}

function getMaxDepth(el: Element): number {
  let max = getElementDepth(el);
  for (const child of Array.from(el.children)) {
    max = Math.max(max, getMaxDepth(child));
  }
  return max;
}

// ─── Luminance & Contrast ────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length >= 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  return null;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return 21; // Assume OK if can't parse
  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Individual Checks ───────────────────────────────────────────────────────

function checkImagesLazyLoading(doc: Document): AuditCheck {
  const images = Array.from(doc.querySelectorAll("img"));
  const nonLazy = images.filter((img) => !img.hasAttribute("loading") || img.getAttribute("loading") !== "lazy");
  const belowFold = nonLazy.filter((img, i) => i > 0); // First image is likely above fold

  if (images.length === 0) {
    return {
      id: "images-lazy-loading",
      name: "Image Lazy Loading",
      category: "performance",
      status: "pass",
      score: 100,
      description: "No images found or all images use lazy loading.",
      autoFixable: true,
    };
  }

  if (belowFold.length === 0) {
    return {
      id: "images-lazy-loading",
      name: "Image Lazy Loading",
      category: "performance",
      status: "pass",
      score: 100,
      description: `${images.length} image(s) properly use lazy loading.`,
      autoFixable: true,
    };
  }

  return {
    id: "images-lazy-loading",
    name: "Image Lazy Loading",
    category: "performance",
    status: belowFold.length > 2 ? "fail" : "warn",
    score: Math.max(0, 100 - belowFold.length * 20),
    description: `${belowFold.length} below-fold image(s) missing loading="lazy".`,
    suggestion: 'Add loading="lazy" to images that are not visible on initial viewport.',
    autoFixable: true,
  };
}

function checkImagesDimensions(doc: Document): AuditCheck {
  const images = Array.from(doc.querySelectorAll("img"));
  const noDims = images.filter(
    (img) => !img.hasAttribute("width") || !img.hasAttribute("height"),
  );

  if (images.length === 0) {
    return {
      id: "images-dimensions",
      name: "Image Dimensions",
      category: "performance",
      status: "pass",
      score: 100,
      description: "No images found.",
      autoFixable: true,
    };
  }

  if (noDims.length === 0) {
    return {
      id: "images-dimensions",
      name: "Image Dimensions",
      category: "performance",
      status: "pass",
      score: 100,
      description: "All images have explicit width and height attributes.",
      autoFixable: true,
    };
  }

  return {
    id: "images-dimensions",
    name: "Image Dimensions",
    category: "performance",
    status: "warn",
    score: Math.max(0, 100 - noDims.length * 15),
    description: `${noDims.length} image(s) missing width/height attributes.`,
    suggestion: "Set explicit width and height to prevent Cumulative Layout Shift (CLS).",
    autoFixable: true,
  };
}

function checkMetaViewport(doc: Document): AuditCheck {
  const viewport = doc.querySelector('meta[name="viewport"]');
  if (!viewport) {
    return {
      id: "meta-viewport",
      name: "Meta Viewport",
      category: "seo",
      status: "fail",
      score: 0,
      description: "Missing <meta name='viewport'> tag.",
      suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to <head>.',
      autoFixable: true,
    };
  }

  const content = viewport.getAttribute("content") ?? "";
  if (content.includes("user-scalable=no") || content.includes("maximum-scale=1")) {
    return {
      id: "meta-viewport",
      name: "Meta Viewport",
      category: "seo",
      status: "warn",
      score: 60,
      description: "Viewport meta prevents user zooming.",
      suggestion: "Remove user-scalable=no and maximum-scale restrictions.",
      autoFixable: true,
    };
  }

  return {
    id: "meta-viewport",
    name: "Meta Viewport",
    category: "seo",
    status: "pass",
    score: 100,
    description: "Viewport meta tag is correctly configured.",
    autoFixable: true,
  };
}

function checkLangAttribute(doc: Document): AuditCheck {
  const html = doc.documentElement;
  const lang = html.getAttribute("lang");
  if (!lang) {
    return {
      id: "lang-attribute",
      name: "Language Attribute",
      category: "accessibility",
      status: "fail",
      score: 0,
      description: "The <html> element is missing a lang attribute.",
      suggestion: 'Add lang="en" (or appropriate language) to <html>.',
      autoFixable: true,
    };
  }
  return {
    id: "lang-attribute",
    name: "Language Attribute",
    category: "accessibility",
    status: "pass",
    score: 100,
    description: `Language is set to "${lang}".`,
    autoFixable: true,
  };
}

function checkInlineStyles(html: string): AuditCheck {
  const styleAttrRegex = /style="([^"]*)"/g;
  let totalLength = 0;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = styleAttrRegex.exec(html)) !== null) {
    totalLength += m[1].length;
    count++;
  }

  if (count === 0) {
    return {
      id: "inline-styles",
      name: "Inline Styles",
      category: "best-practices",
      status: "pass",
      score: 100,
      description: "No inline styles detected.",
      autoFixable: false,
    };
  }

  if (totalLength > 500) {
    return {
      id: "inline-styles",
      name: "Inline Styles",
      category: "best-practices",
      status: "warn",
      score: Math.max(30, 100 - Math.floor(totalLength / 100)),
      description: `${count} inline style(s) totaling ${totalLength} characters.`,
      suggestion: "Move inline styles to CSS classes for better maintainability and caching.",
      autoFixable: false,
    };
  }

  return {
    id: "inline-styles",
    name: "Inline Styles",
    category: "best-practices",
    status: "pass",
    score: 90,
    description: `${count} small inline style(s) found (${totalLength} chars).`,
    autoFixable: false,
  };
}

function checkRenderBlocking(doc: Document, css: string): AuditCheck {
  const linkTags = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  const hasStyles = css.trim().length > 0;
  const blockingCount = linkTags.filter(
    (l) => !l.hasAttribute("media") || l.getAttribute("media") === "all",
  ).length;

  if (blockingCount === 0 && !hasStyles) {
    return {
      id: "render-blocking",
      name: "Render-Blocking Resources",
      category: "performance",
      status: "pass",
      score: 100,
      description: "No render-blocking resources detected.",
      autoFixable: false,
    };
  }

  if (blockingCount > 3) {
    return {
      id: "render-blocking",
      name: "Render-Blocking Resources",
      category: "performance",
      status: "warn",
      score: Math.max(40, 100 - blockingCount * 10),
      description: `${blockingCount} render-blocking stylesheet(s) found.`,
      suggestion: "Use media attributes or preload for non-critical stylesheets.",
      autoFixable: false,
    };
  }

  return {
    id: "render-blocking",
    name: "Render-Blocking Resources",
    category: "performance",
    status: "pass",
    score: 85,
    description: `${blockingCount} stylesheet(s) loaded. Acceptable count.`,
    autoFixable: false,
  };
}

function checkImageAlt(doc: Document): AuditCheck {
  const images = Array.from(doc.querySelectorAll("img"));
  const noAlt = images.filter((img) => !img.hasAttribute("alt"));
  const emptyAlt = images.filter((img) => img.getAttribute("alt") === "");

  if (images.length === 0) {
    return {
      id: "image-alt",
      name: "Image Alt Text",
      category: "accessibility",
      status: "pass",
      score: 100,
      description: "No images found.",
      autoFixable: true,
    };
  }

  if (noAlt.length === 0) {
    return {
      id: "image-alt",
      name: "Image Alt Text",
      category: "accessibility",
      status: "pass",
      score: 100,
      description: "All images have alt attributes.",
      autoFixable: true,
    };
  }

  return {
    id: "image-alt",
    name: "Image Alt Text",
    category: "accessibility",
    status: "fail",
    score: Math.max(0, 100 - noAlt.length * 25),
    description: `${noAlt.length} image(s) missing alt text.`,
    suggestion: 'Add descriptive alt text or alt="" for decorative images.',
    autoFixable: true,
  };
}

function checkColorContrast(doc: Document): AuditCheck {
  const lowContrastPairs: [string, string][] = [
    ["text-gray-300", "bg-white"],
    ["text-gray-400", "bg-white"],
    ["text-slate-300", "bg-white"],
    ["text-yellow-200", "bg-white"],
    ["text-white", "bg-yellow-300"],
    ["text-white", "bg-green-300"],
  ];

  const bodyHtml = doc.body?.innerHTML ?? "";
  const issues: string[] = [];

  lowContrastPairs.forEach(([textClass, bgClass]) => {
    if (bodyHtml.includes(textClass) && bodyHtml.includes(bgClass)) {
      issues.push(`${textClass} on ${bgClass}`);
    }
  });

  if (issues.length === 0) {
    return {
      id: "color-contrast",
      name: "Color Contrast",
      category: "accessibility",
      status: "pass",
      score: 100,
      description: "No obvious low-contrast combinations detected.",
      autoFixable: true,
    };
  }

  return {
    id: "color-contrast",
    name: "Color Contrast",
    category: "accessibility",
    status: "warn",
    score: Math.max(40, 100 - issues.length * 20),
    description: `Possible low-contrast pairs: ${issues.join("; ")}`,
    suggestion: "Ensure text meets WCAG AA 4.5:1 contrast ratio.",
    autoFixable: true,
  };
}

function checkAriaLabels(doc: Document): AuditCheck {
  const interactive = Array.from(
    doc.querySelectorAll("button, a[href], [role='button'], [onclick]"),
  );
  const noLabel = interactive.filter((el) => {
    const hasText = el.textContent?.trim();
    const hasAria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
    const hasTitle = el.getAttribute("title");
    return !hasText && !hasAria && !hasTitle;
  });

  if (interactive.length === 0) {
    return {
      id: "aria-labels",
      name: "ARIA Labels",
      category: "accessibility",
      status: "pass",
      score: 100,
      description: "No interactive elements found.",
      autoFixable: true,
    };
  }

  if (noLabel.length === 0) {
    return {
      id: "aria-labels",
      name: "ARIA Labels",
      category: "accessibility",
      status: "pass",
      score: 100,
      description: `All ${interactive.length} interactive element(s) have accessible names.`,
      autoFixable: true,
    };
  }

  return {
    id: "aria-labels",
    name: "ARIA Labels",
    category: "accessibility",
    status: "fail",
    score: Math.max(0, 100 - noLabel.length * 20),
    description: `${noLabel.length} interactive element(s) missing accessible names.`,
    suggestion: "Add aria-label or visible text to buttons and links.",
    autoFixable: true,
  };
}

function checkUnusedCss(html: string, css: string): AuditCheck {
  if (!css.trim()) {
    return {
      id: "unused-css",
      name: "Unused CSS",
      category: "performance",
      status: "pass",
      score: 100,
      description: "No custom CSS to analyze.",
      autoFixable: false,
    };
  }

  const selectors = parseCssRules(css);
  const htmlClasses = extractClassesFromHtml(html);
  const htmlIds = new Set<string>();
  const idRegex = /id="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = idRegex.exec(html)) !== null) {
    htmlIds.add(m[1]);
  }

  let unusedCount = 0;
  for (const selector of selectors) {
    // Simple heuristic: check if class/id selectors match
    const classMatch = selector.match(/\.([a-zA-Z_-][\w-]*)/);
    const idMatch = selector.match(/#([a-zA-Z_-][\w-]*)/);
    const tagMatch = selector.match(/^([a-zA-Z]+)/);

    let used = false;
    if (classMatch && htmlClasses.has(classMatch[1])) used = true;
    if (idMatch && htmlIds.has(idMatch[1])) used = true;
    if (tagMatch && ["html", "body", "head", "main", "nav", "header", "footer", "section", "article", "div", "span", "p", "a", "img", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "li", "form", "input", "button", "table", "tr", "td", "th"].includes(tagMatch[1].toLowerCase())) used = true;
    if (!classMatch && !idMatch && !tagMatch) used = true; // Complex selector, assume used

    if (!used) unusedCount++;
  }

  const pct = selectors.length > 0 ? Math.round((unusedCount / selectors.length) * 100) : 0;

  if (pct > 50) {
    return {
      id: "unused-css",
      name: "Unused CSS",
      category: "performance",
      status: "warn",
      score: Math.max(30, 100 - pct),
      description: `Estimated ${pct}% of CSS selectors may be unused (${unusedCount}/${selectors.length}).`,
      suggestion: "Remove unused CSS rules to reduce file size.",
      autoFixable: false,
    };
  }

  return {
    id: "unused-css",
    name: "Unused CSS",
    category: "performance",
    status: "pass",
    score: Math.max(60, 100 - pct),
    description: `Estimated ${pct}% unused CSS. Within acceptable range.`,
    autoFixable: false,
  };
}

function checkFontLoading(doc: Document): AuditCheck {
  const fontLinks = Array.from(doc.querySelectorAll('link[href*="fonts"]'));
  const styleContent = Array.from(doc.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("");
  const hasFontFace = /@font-face/.test(styleContent) || /@font-face/.test(doc.body?.innerHTML ?? "");

  const hasPreload = fontLinks.some((l) => l.getAttribute("rel") === "preload");
  const hasDisplaySwap = styleContent.includes("font-display: swap") || styleContent.includes("font-display:swap");

  if (fontLinks.length === 0 && !hasFontFace) {
    return {
      id: "font-loading",
      name: "Font Loading Strategy",
      category: "performance",
      status: "pass",
      score: 90,
      description: "No custom fonts detected. System fonts are fast.",
      autoFixable: false,
    };
  }

  const issues: string[] = [];
  if (!hasPreload && fontLinks.length > 0) issues.push("no preload");
  if (!hasDisplaySwap) issues.push("no font-display: swap");

  if (issues.length === 0) {
    return {
      id: "font-loading",
      name: "Font Loading Strategy",
      category: "performance",
      status: "pass",
      score: 100,
      description: "Fonts are preloaded and use font-display: swap.",
      autoFixable: false,
    };
  }

  return {
    id: "font-loading",
    name: "Font Loading Strategy",
    category: "performance",
    status: "warn",
    score: issues.length > 1 ? 50 : 75,
    description: `Font loading issues: ${issues.join(", ")}.`,
    suggestion: "Use <link rel='preload'> and font-display: swap for web fonts.",
    autoFixable: false,
  };
}

function checkClsIndicators(doc: Document, css: string): AuditCheck {
  const images = Array.from(doc.querySelectorAll("img"));
  const noDims = images.filter((img) => !img.hasAttribute("width") || !img.hasAttribute("height"));
  const hasAspectRatio = css.includes("aspect-ratio");
  const hasObjectFit = css.includes("object-fit");

  const issues: string[] = [];
  if (noDims.length > 0) issues.push(`${noDims.length} image(s) without dimensions`);
  if (!hasAspectRatio && images.length > 0) issues.push("no aspect-ratio usage");

  if (issues.length === 0) {
    return {
      id: "cls-indicators",
      name: "CLS Indicators",
      category: "performance",
      status: "pass",
      score: 100,
      description: "No obvious CLS risk factors detected.",
      autoFixable: true,
    };
  }

  return {
    id: "cls-indicators",
    name: "CLS Indicators",
    category: "performance",
    status: "warn",
    score: Math.max(40, 100 - issues.length * 20),
    description: `Potential CLS issues: ${issues.join("; ")}`,
    suggestion: "Set explicit dimensions on images and use aspect-ratio for fluid containers.",
    autoFixable: true,
  };
}

function checkHttpsLinks(doc: Document): AuditCheck {
  const links = Array.from(doc.querySelectorAll("a[href]"));
  const httpLinks = links.filter(
    (a) => a.getAttribute("href")?.startsWith("http://"),
  );

  if (links.length === 0) {
    return {
      id: "https-links",
      name: "HTTPS Links",
      category: "best-practices",
      status: "pass",
      score: 100,
      description: "No external links found.",
      autoFixable: true,
    };
  }

  if (httpLinks.length === 0) {
    return {
      id: "https-links",
      name: "HTTPS Links",
      category: "best-practices",
      status: "pass",
      score: 100,
      description: "All links use HTTPS.",
      autoFixable: true,
    };
  }

  return {
    id: "https-links",
    name: "HTTPS Links",
    category: "best-practices",
    status: "fail",
    score: Math.max(0, 100 - httpLinks.length * 25),
    description: `${httpLinks.length} link(s) use insecure HTTP.`,
    suggestion: "Use HTTPS for all external links.",
    autoFixable: true,
  };
}

function checkStructuredData(doc: Document): AuditCheck {
  const ldJson = doc.querySelector('script[type="application/ld+json"]');
  const microdata = doc.querySelectorAll("[itemscope]");

  if (ldJson || microdata.length > 0) {
    return {
      id: "structured-data",
      name: "Structured Data",
      category: "seo",
      status: "pass",
      score: 100,
      description: "Structured data detected.",
      autoFixable: false,
    };
  }

  return {
    id: "structured-data",
    name: "Structured Data",
    category: "seo",
    status: "warn",
    score: 60,
    description: "No structured data (JSON-LD or microdata) found.",
    suggestion: "Add JSON-LD structured data for better search engine understanding.",
    autoFixable: false,
  };
}

function checkDomDepth(doc: Document): AuditCheck {
  const body = doc.body;
  if (!body) {
    return {
      id: "dom-depth",
      name: "DOM Depth",
      category: "performance",
      status: "pass",
      score: 100,
      description: "No body element found.",
      autoFixable: false,
    };
  }

  const maxDepth = getMaxDepth(body);
  if (maxDepth <= 15) {
    return {
      id: "dom-depth",
      name: "DOM Depth",
      category: "performance",
      status: "pass",
      score: 100,
      description: `Maximum DOM depth is ${maxDepth}. Within limits.`,
      autoFixable: false,
    };
  }

  return {
    id: "dom-depth",
    name: "DOM Depth",
    category: "performance",
    status: maxDepth > 32 ? "fail" : "warn",
    score: Math.max(20, 100 - (maxDepth - 15) * 5),
    description: `DOM depth of ${maxDepth} exceeds recommended 32 levels.`,
    suggestion: "Flatten DOM structure where possible for better rendering performance.",
    autoFixable: false,
  };
}

// ─── Main Audit Function ─────────────────────────────────────────────────────

export function runPerformanceAudit(html: string, css: string): PerformanceReport {
  const doc = parseHtml(html);

  const checks: AuditCheck[] = [
    checkImagesLazyLoading(doc),
    checkImagesDimensions(doc),
    checkMetaViewport(doc),
    checkLangAttribute(doc),
    checkInlineStyles(html),
    checkRenderBlocking(doc, css),
    checkImageAlt(doc),
    checkColorContrast(doc),
    checkAriaLabels(doc),
    checkUnusedCss(html, css),
    checkFontLoading(doc),
    checkClsIndicators(doc, css),
    checkHttpsLinks(doc),
    checkStructuredData(doc),
    checkDomDepth(doc),
  ];

  const categoryScores: Record<string, number[]> = {
    performance: [],
    accessibility: [],
    "best-practices": [],
    seo: [],
  };

  for (const check of checks) {
    categoryScores[check.category].push(check.score);
  }

  const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 100);

  const summary = {
    performance: avg(categoryScores.performance),
    accessibility: avg(categoryScores.accessibility),
    bestPractices: avg(categoryScores["best-practices"]),
    seo: avg(categoryScores.seo),
  };

  const overallScore = Math.round(
    summary.performance * 0.35 +
    summary.accessibility * 0.25 +
    summary.bestPractices * 0.2 +
    summary.seo * 0.2,
  );

  return { overallScore, checks, summary };
}

// ─── Auto-Fix ────────────────────────────────────────────────────────────────

export function autoFixAuditIssues(
  html: string,
  css: string,
  checks: AuditCheck[],
): { html: string; css: string; fixed: string[] } {
  let fixedHtml = html;
  let fixedCss = css;
  const fixed: string[] = [];

  const fixable = checks.filter((c) => c.autoFixable && c.status !== "pass");

  for (const check of fixable) {
    switch (check.id) {
      case "images-lazy-loading": {
        fixedHtml = fixedHtml.replace(/<img([^>]*?)>/g, (match, attrs) => {
          if (/loading=/.test(attrs)) return match;
          return `<img${attrs} loading="lazy">`;
        });
        fixed.push("Added loading='lazy' to images");
        break;
      }

      case "images-dimensions": {
        fixedHtml = fixedHtml.replace(/<img([^>]*?)>/g, (match, attrs) => {
          if (/width=/.test(attrs) && /height=/.test(attrs)) return match;
          let newAttrs = attrs;
          if (!/width=/.test(newAttrs)) newAttrs += ' width="800"';
          if (!/height=/.test(newAttrs)) newAttrs += ' height="600"';
          return `<img${newAttrs}>`;
        });
        fixed.push("Added default width/height to images");
        break;
      }

      case "meta-viewport": {
        if (!/<meta\s[^>]*viewport/i.test(fixedHtml)) {
          fixedHtml = fixedHtml.replace(/<head([^>]*)>/i, (match) => {
            return `${match}\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`;
          });
          fixed.push("Added viewport meta tag");
        } else {
          fixedHtml = fixedHtml.replace(
            /(<meta\s[^>]*viewport[^>]*content=")([^"]*)(")/i,
            (_, pre, content, post) => {
              const cleaned = content
                .replace(/user-scalable=no;?/gi, "")
                .replace(/maximum-scale=\d+(\.\d+)?;?/gi, "")
                .replace(/;+/g, ";")
                .replace(/^;|;$/g, "");
              return `${pre}${cleaned}${post}`;
            },
          );
          fixed.push("Fixed viewport meta tag");
        }
        break;
      }

      case "lang-attribute": {
        if (!/<html[^>]*lang=/i.test(fixedHtml)) {
          fixedHtml = fixedHtml.replace(/<html([^>]*)>/i, (match, attrs) => {
            return `<html lang="en"${attrs}>`;
          });
          fixed.push('Added lang="en" to <html>');
        }
        break;
      }

      case "image-alt": {
        fixedHtml = fixedHtml.replace(/<img([^>]*?)>/g, (match, attrs) => {
          if (/alt=/.test(attrs)) return match;
          const srcMatch = attrs.match(/src="([^"]*)"/);
          const altText = srcMatch ? `Image: ${srcMatch[1].split("/").pop()?.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") ?? "image"}` : "Image";
          return `<img${attrs} alt="${altText}">`;
        });
        fixed.push("Added descriptive alt text to images");
        break;
      }

      case "color-contrast": {
        // Replace low-contrast Tailwind classes
        const replacements: [RegExp, string][] = [
          [/\btext-gray-300\b/g, "text-gray-600"],
          [/\btext-slate-300\b/g, "text-slate-600"],
          [/\btext-yellow-200\b/g, "text-yellow-700"],
        ];
        for (const [regex, replacement] of replacements) {
          fixedHtml = fixedHtml.replace(regex, replacement);
        }
        fixed.push("Improved color contrast by darkening text colors");
        break;
      }

      case "aria-labels": {
        fixedHtml = fixedHtml.replace(/<button((?:\s[^>]*)?)>(\s*)<\/button>/g, (match, attrs, space) => {
          if (/aria-label=/.test(attrs)) return match;
          return `<button${attrs} aria-label="Button">${space}</button>`;
        });
        fixed.push("Added aria-label to empty buttons");
        break;
      }

      case "cls-indicators": {
        fixedHtml = fixedHtml.replace(/<img([^>]*?)>/g, (match, attrs) => {
          let newAttrs = attrs;
          if (!/width=/.test(newAttrs)) newAttrs += ' width="800"';
          if (!/height=/.test(newAttrs)) newAttrs += ' height="600"';
          return `<img${newAttrs}>`;
        });
        fixed.push("Added dimension attributes to prevent CLS");
        break;
      }

      case "https-links": {
        fixedHtml = fixedHtml.replace(/href="http:\/\//g, 'href="https://');
        fixed.push("Converted HTTP links to HTTPS");
        break;
      }
    }
  }

  return { html: fixedHtml, css: fixedCss, fixed };
}
