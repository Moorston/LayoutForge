/**
 * WCAG Auto-Fix — Detects WCAG 2.1 AA violations and automatically fixes them.
 * Reuses the AccessibilityIssue interface from @/lib/types.
 */

import type { AccessibilityIssue } from "./types";

// ─── Checker ─────────────────────────────────────────────────────────────────

function parseHtml(html: string): Document {
  const full = html.includes("<html")
    ? html
    : `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
  const parser = new DOMParser();
  return parser.parseFromString(full, "text/html");
}

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
  if (!c1 || !c2) return 21;
  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const tailwindColorMap: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
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
  "red-100": "#fee2e2",
  "red-200": "#fecaca",
  "red-300": "#fca5a5",
  "red-400": "#f87171",
  "red-500": "#ef4444",
  "red-600": "#dc2626",
  "red-700": "#b91c1c",
  "red-800": "#991b1b",
  "red-900": "#7f1d1d",
  "blue-100": "#dbeafe",
  "blue-200": "#bfdbfe",
  "blue-300": "#93c5fd",
  "blue-400": "#60a5fa",
  "blue-500": "#3b82f6",
  "blue-600": "#2563eb",
  "blue-700": "#1d4ed8",
  "blue-800": "#1e40af",
  "blue-900": "#1e3a8a",
  "green-100": "#dcfce7",
  "green-200": "#bbf7d0",
  "green-300": "#86efac",
  "green-400": "#4ade80",
  "green-500": "#22c55e",
  "green-600": "#16a34a",
  "green-700": "#15803d",
  "green-800": "#166534",
  "green-900": "#14532d",
  "yellow-100": "#fef9c3",
  "yellow-200": "#fef08a",
  "yellow-300": "#fde047",
  "yellow-400": "#facc15",
  "yellow-500": "#eab308",
  "yellow-600": "#ca8a04",
  "yellow-700": "#a16207",
  "yellow-800": "#854d0e",
  "yellow-900": "#713f12",
  "indigo-100": "#e0e7ff",
  "indigo-200": "#c7d2fe",
  "indigo-300": "#a5b4fc",
  "indigo-400": "#818cf8",
  "indigo-500": "#6366f1",
  "indigo-600": "#4f46e5",
  "indigo-700": "#4338ca",
  "indigo-800": "#3730a3",
  "indigo-900": "#312e81",
  "purple-100": "#f3e8ff",
  "purple-200": "#e9d5ff",
  "purple-300": "#d8b4fe",
  "purple-400": "#c084fc",
  "purple-500": "#a855f7",
  "purple-600": "#9333ea",
  "purple-700": "#7e22ce",
  "purple-800": "#6b21a8",
  "purple-900": "#581c87",
  "emerald-100": "#d1fae5",
  "emerald-200": "#a7f3d0",
  "emerald-300": "#6ee7b7",
  "emerald-400": "#34d399",
  "emerald-500": "#10b981",
  "emerald-600": "#059669",
  "emerald-700": "#047857",
  "emerald-800": "#065f46",
  "emerald-900": "#064e3b",
  "amber-100": "#fef3c7",
  "amber-200": "#fde68a",
  "amber-300": "#fcd34d",
  "amber-400": "#fbbf24",
  "amber-500": "#f59e0b",
  "amber-600": "#d97706",
  "amber-700": "#b45309",
  "amber-800": "#92400e",
  "amber-900": "#78350f",
  "rose-100": "#ffe4e6",
  "rose-200": "#fecdd3",
  "rose-300": "#fda4af",
  "rose-400": "#fb7185",
  "rose-500": "#f43f5e",
  "rose-600": "#e11d48",
  "rose-700": "#be123c",
  "rose-800": "#9f1239",
  "rose-900": "#881337",
};

function getColorFromClass(className: string): string | null {
  return tailwindColorMap[className] ?? null;
}

function findDarkVariant(colorName: string): string | null {
  // For low contrast, we need a darker variant of the same color family
  const darkVariants: Record<string, string> = {
    "gray-300": "gray-700",
    "gray-400": "gray-700",
    "slate-300": "slate-700",
    "slate-400": "slate-700",
    "red-300": "red-800",
    "red-200": "red-800",
    "blue-300": "blue-800",
    "blue-200": "blue-800",
    "green-300": "green-800",
    "green-200": "green-800",
    "yellow-200": "yellow-800",
    "yellow-300": "yellow-800",
    "indigo-300": "indigo-800",
    "indigo-200": "indigo-800",
    "purple-300": "purple-800",
    "purple-200": "purple-800",
    "emerald-300": "emerald-800",
    "emerald-200": "emerald-800",
    "amber-300": "amber-800",
    "amber-200": "amber-800",
    "rose-300": "rose-800",
    "rose-200": "rose-800",
  };
  return darkVariants[colorName] ?? null;
}

// ─── Run Accessibility Check ─────────────────────────────────────────────────

export function runAccessibilityCheck(html: string): AccessibilityIssue[] {
  const doc = parseHtml(html);
  const issues: AccessibilityIssue[] = [];

  // 1. Missing alt text
  doc.querySelectorAll("img").forEach((img) => {
    if (!img.hasAttribute("alt")) {
      issues.push({
        severity: "error",
        rule: "img-alt",
        description:
          "Image is missing alt attribute. Screen readers cannot describe this image.",
        element: img.outerHTML.slice(0, 120),
        fix: 'Add descriptive alt text or alt="" for decorative images.',
      });
    }
  });

  // 2. Missing form labels
  doc
    .querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select',
    )
    .forEach((el) => {
      const id = el.getAttribute("id");
      const hasLabel = id && doc.querySelector(`label[for="${id}"]`);
      const hasAriaLabel =
        el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
      const hasTitle = el.getAttribute("title");
      if (!hasLabel && !hasAriaLabel && !hasTitle) {
        issues.push({
          severity: "error",
          rule: "form-label",
          description: "Form field is missing an accessible label.",
          element: el.outerHTML.slice(0, 120),
          fix: 'Add a <label for="id"> or aria-label attribute.',
        });
      }
    });

  // 3. Missing button text
  doc.querySelectorAll("button, [role='button']").forEach((btn) => {
    const hasText = btn.textContent?.trim();
    const hasLabel =
      btn.getAttribute("aria-label") || btn.getAttribute("aria-labelledby");
    if (!hasText && !hasLabel) {
      issues.push({
        severity: "error",
        rule: "button-name",
        description: "Button has no accessible name.",
        element: btn.outerHTML.slice(0, 120),
        fix: 'Add visible text or aria-label="description".',
      });
    }
  });

  // 4. Low color contrast (heuristic)
  const lowContrastPairs: [string, string][] = [
    ["text-gray-300", "bg-white"],
    ["text-gray-400", "bg-white"],
    ["text-slate-300", "bg-white"],
    ["text-slate-400", "bg-white"],
    ["text-yellow-200", "bg-white"],
    ["text-yellow-300", "bg-white"],
    ["text-white", "bg-yellow-300"],
    ["text-white", "bg-green-300"],
    ["text-white", "bg-emerald-300"],
    ["text-white", "bg-lime-300"],
  ];
  const bodyHtml = doc.body?.innerHTML ?? "";
  lowContrastPairs.forEach(([textClass, bgClass]) => {
    if (bodyHtml.includes(textClass) && bodyHtml.includes(bgClass)) {
      const colorName = textClass.replace("text-", "");
      issues.push({
        severity: "error",
        rule: "color-contrast",
        description: `"${textClass}" on "${bgClass}" likely fails WCAG AA 4.5:1 contrast ratio.`,
        fix: `Replace ${textClass} with a darker variant (e.g. ${textClass.replace(/-\d+$/, "-700")}).`,
      });
    }
  });

  // 5. Missing lang attribute
  const htmlEl = doc.documentElement;
  if (!htmlEl.getAttribute("lang")) {
    issues.push({
      severity: "error",
      rule: "html-lang",
      description: "The <html> element is missing a lang attribute.",
      element: "<html>",
      fix: 'Add lang="en" to <html>.',
    });
  }

  // 6. Missing skip navigation link
  const hasSkipLink =
    bodyHtml.includes("skip") &&
    (bodyHtml.includes("#main") ||
      bodyHtml.includes("#content") ||
      bodyHtml.includes("skip-to"));
  const hasMain = !!doc.querySelector("main, [role='main']");
  if (hasMain && !hasSkipLink) {
    issues.push({
      severity: "warning",
      rule: "skip-navigation",
      description:
        "No skip-to-content link found. Keyboard users must tab through all navigation.",
      fix: 'Add a "Skip to content" link as the first focusable element.',
    });
  }

  // 7. Heading hierarchy
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  let prevLevel = 0;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1]);
    if (prevLevel > 0 && level > prevLevel + 1) {
      issues.push({
        severity: "warning",
        rule: "heading-order",
        description: `Heading level skipped: <h${prevLevel}> → <h${level}>. Breaks document outline.`,
        element: h.outerHTML.slice(0, 120),
        fix: `Use <h${prevLevel + 1}> instead.`,
      });
    }
    prevLevel = level;
  });

  // 8. Missing focus styles
  const hasFocusStyle =
    bodyHtml.includes("focus:") ||
    bodyHtml.includes("focus-visible") ||
    bodyHtml.includes(":focus");
  if (!hasFocusStyle) {
    issues.push({
      severity: "warning",
      rule: "focus-visible",
      description:
        "No focus-visible styles detected. Interactive elements may not show keyboard focus indicators.",
      fix: "Add focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 to interactive elements.",
    });
  }

  // 9. Interactive elements without keyboard support
  doc
    .querySelectorAll(
      "[onclick]:not(button):not(a):not(input):not(select):not(textarea)",
    )
    .forEach((el) => {
      const hasTabindex = el.hasAttribute("tabindex");
      const hasKeyHandler =
        el.outerHTML.includes("onkeydown") ||
        el.outerHTML.includes("onkeypress") ||
        el.outerHTML.includes("onkeyup");
      if (!hasTabindex || !hasKeyHandler) {
        issues.push({
          severity: "warning",
          rule: "keyboard-access",
          description: `Non-interactive <${el.tagName.toLowerCase()}> has onclick but lacks keyboard support.`,
          element: el.outerHTML.slice(0, 120),
          fix: 'Add tabIndex="0" and onKeyDown handler, or use a <button> instead.',
        });
      }
    });

  // 10. Missing ARIA landmarks
  const landmarkChecks: Array<{ tag: string; role: string }> = [
    { tag: "nav", role: "navigation" },
    { tag: "main", role: "main" },
    { tag: "header", role: "banner" },
    { tag: "footer", role: "contentinfo" },
  ];
  for (const { tag, role } of landmarkChecks) {
    const el = doc.querySelector(tag);
    if (el && !el.getAttribute("role")) {
      // This is actually fine for HTML5 landmark elements, but check for multiple navs without labels
      if (tag === "nav") {
        const navs = doc.querySelectorAll("nav");
        if (navs.length > 1) {
          let unlabeled = false;
          navs.forEach((n) => {
            if (
              !n.getAttribute("aria-label") &&
              !n.getAttribute("aria-labelledby")
            ) {
              unlabeled = true;
            }
          });
          if (unlabeled) {
            issues.push({
              severity: "warning",
              rule: "landmark-unique",
              description:
                "Multiple <nav> elements found without distinguishing aria-labels.",
              fix: 'Add aria-label="Main navigation" or aria-label="Footer navigation" to each <nav>.',
            });
          }
        }
      }
    }
  }

  return issues;
}

// ─── Auto-Fix ────────────────────────────────────────────────────────────────

export function autoFixAccessibility(
  html: string,
  css: string,
  issues: AccessibilityIssue[],
): { html: string; css: string; fixedIssues: string[] } {
  let fixedHtml = html;
  let fixedCss = css;
  const fixedIssues: string[] = [];

  for (const issue of issues) {
    switch (issue.rule) {
      case "img-alt": {
        fixedHtml = fixedHtml.replace(
          /<img((?:\s[^>]*?))?>/g,
          (match, attrs) => {
            if (/alt=/.test(attrs)) return match;
            const srcMatch = attrs.match(/src="([^"]*)"/);
            const altText = srcMatch
              ? `Image: ${
                  srcMatch[1]
                    .split("/")
                    .pop()
                    ?.replace(/\.[^.]+$/, "")
                    .replace(/[-_]/g, " ") ?? "image"
                }`
              : "Image";
            return `<img${attrs} alt="${altText}">`;
          },
        );
        fixedIssues.push("Added descriptive alt text to images");
        break;
      }

      case "form-label": {
        fixedHtml = fixedHtml.replace(
          /<input((?:\s[^>]*?))?>/g,
          (match, attrs) => {
            if (/aria-label=/.test(attrs) || /aria-labelledby=/.test(attrs))
              return match;
            const placeholder = attrs.match(/placeholder="([^"]*)"/);
            const id = attrs.match(/id="([^"]*)"/);
            const label = placeholder
              ? placeholder[1]
              : id
                ? `${id[1]} field`
                : "Form field";
            if (id) {
              // Check if label already exists for this id
              const labelRegex = new RegExp(
                `<label[^>]*for=["']${id[1]}["'][^>]*>`,
                "i",
              );
              if (labelRegex.test(fixedHtml)) return match;
            }
            return `<input${attrs} aria-label="${label}">`;
          },
        );
        fixedHtml = fixedHtml.replace(
          /<textarea((?:\s[^>]*?))?>/g,
          (match, attrs) => {
            if (/aria-label=/.test(attrs) || /aria-labelledby=/.test(attrs))
              return match;
            const placeholder = attrs.match(/placeholder="([^"]*)"/);
            const label = placeholder ? placeholder[1] : "Text area";
            return `<textarea${attrs} aria-label="${label}">`;
          },
        );
        fixedHtml = fixedHtml.replace(
          /<select((?:\s[^>]*?))?>/g,
          (match, attrs) => {
            if (/aria-label=/.test(attrs) || /aria-labelledby=/.test(attrs))
              return match;
            return `<select${attrs} aria-label="Select option">`;
          },
        );
        fixedIssues.push("Added aria-label to unlabeled form fields");
        break;
      }

      case "button-name": {
        fixedHtml = fixedHtml.replace(
          /<button((?:\s[^>]*?)?)>(\s*)<\/button>/g,
          (match, attrs, space) => {
            if (/aria-label=/.test(attrs)) return match;
            return `<button${attrs} aria-label="Button">${space}</button>`;
          },
        );
        fixedIssues.push("Added aria-label to empty buttons");
        break;
      }

      case "color-contrast": {
        // Replace low-contrast text colors with darker alternatives
        const contrastReplacements: [RegExp, string][] = [
          [/\btext-gray-300\b/g, "text-gray-700"],
          [/\btext-gray-400\b/g, "text-gray-700"],
          [/\btext-slate-300\b/g, "text-slate-700"],
          [/\btext-slate-400\b/g, "text-slate-700"],
          [/\btext-yellow-200\b/g, "text-yellow-800"],
          [/\btext-yellow-300\b/g, "text-yellow-800"],
          [/\btext-red-300\b/g, "text-red-800"],
          [/\btext-blue-300\b/g, "text-blue-800"],
          [/\btext-green-300\b/g, "text-green-800"],
          [/\btext-emerald-300\b/g, "text-emerald-800"],
          [/\btext-purple-300\b/g, "text-purple-800"],
          [/\btext-indigo-300\b/g, "text-indigo-800"],
          [/\btext-amber-300\b/g, "text-amber-800"],
          [/\btext-rose-300\b/g, "text-rose-800"],
        ];
        for (const [regex, replacement] of contrastReplacements) {
          fixedHtml = fixedHtml.replace(regex, replacement);
        }
        fixedIssues.push("Improved color contrast by using darker text colors");
        break;
      }

      case "html-lang": {
        if (!/<html[^>]*lang=/i.test(fixedHtml)) {
          fixedHtml = fixedHtml.replace(/<html([^>]*)>/i, (match, attrs) => {
            return `<html lang="en"${attrs}>`;
          });
          fixedIssues.push('Added lang="en" to <html>');
        }
        break;
      }

      case "skip-navigation": {
        // Add skip-to-content link before the first nav or header
        const skipLink = `<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg">Skip to content</a>\n`;
        if (/<nav|<header/i.test(fixedHtml)) {
          fixedHtml = fixedHtml.replace(/(<nav|<header)/i, `${skipLink}$1`);
          // Ensure main content has the target id
          if (!fixedHtml.includes('id="main-content"')) {
            fixedHtml = fixedHtml.replace(/<main([^>]*)>/i, (match, attrs) => {
              if (/id=/.test(attrs)) return match;
              return `<main id="main-content"${attrs}>`;
            });
          }
          fixedIssues.push("Added skip-to-content navigation link");
        }
        break;
      }

      case "heading-order": {
        // Fix heading levels by adjusting skipped headings (open + close tags)
        const headingPairRegex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h[1-6]>/g;
        let lastLevel = 0;
        fixedHtml = fixedHtml.replace(
          headingPairRegex,
          (match, level, attrs, content) => {
            const numLevel = parseInt(level);
            if (lastLevel > 0 && numLevel > lastLevel + 1) {
              const fixedLevel = lastLevel + 1;
              lastLevel = fixedLevel;
              return `<h${fixedLevel}${attrs}>${content}</h${fixedLevel}>`;
            }
            lastLevel = numLevel;
            return match;
          },
        );
        fixedIssues.push("Fixed heading hierarchy (removed skipped levels)");
        break;
      }

      case "focus-visible": {
        // Add focus-visible styles to CSS
        const focusStyles = `
/* WCAG: Focus-visible styles */
*:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
  border-radius: 4px;
}
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}`;
        fixedCss = fixedCss + focusStyles;
        fixedIssues.push("Added focus-visible outline styles");
        break;
      }

      case "keyboard-access": {
        fixedHtml = fixedHtml.replace(
          /<(\w+)([^>]*)>/g,
          (match, tag, attrs) => {
            if (
              tag === "button" ||
              tag === "a" ||
              tag === "input" ||
              tag === "select" ||
              tag === "textarea"
            )
              return match;
            if (!/onclick=/.test(attrs)) return match;
            let newAttrs = attrs;
            if (!/tabindex=/.test(newAttrs)) {
              newAttrs += ' tabindex="0"';
            }
            if (!/onkeydown=/.test(newAttrs)) {
              newAttrs += " onkeydown=\"if(event.key==='Enter')this.click()\"";
            }
            return `<${tag}${newAttrs}>`;
          },
        );
        fixedIssues.push("Added keyboard support to interactive elements");
        break;
      }

      case "landmark-unique": {
        let navCount = 0;
        fixedHtml = fixedHtml.replace(
          /<nav((?:\s[^>]*?)?)>/g,
          (match, attrs) => {
            navCount++;
            if (/aria-label=/.test(attrs)) return match;
            const label =
              navCount === 1 ? "Main navigation" : "Footer navigation";
            return `<nav${attrs} aria-label="${label}">`;
          },
        );
        fixedIssues.push(
          "Added distinguishing aria-labels to multiple nav elements",
        );
        break;
      }
    }
  }

  return { html: fixedHtml, css: fixedCss, fixedIssues };
}

// ─── Score Calculator ────────────────────────────────────────────────────────

export function calculateAccessibilityScore(
  issues: AccessibilityIssue[],
): number {
  const deductions = issues.reduce((sum, issue) => {
    if (issue.severity === "error") return sum + 15;
    if (issue.severity === "warning") return sum + 7;
    return sum + 2;
  }, 0);
  return Math.max(0, Math.min(100, 100 - deductions));
}
