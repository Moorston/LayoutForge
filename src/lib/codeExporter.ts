import { ExportFormat, ExportResult } from "./types";

// ─── HTML → JSX conversion helpers ────────────────────────────────────────────

function htmlToJsx(html: string): string {
  return (
    html
      // Attributes
      .replace(/\bclass=/g, "className=")
      .replace(/\bfor=/g, "htmlFor=")
      .replace(/\btabindex=/g, "tabIndex=")
      .replace(/\bautofocus\b/g, "autoFocus")
      .replace(/\bautocomplete=/g, "autoComplete=")
      .replace(/\bnovalidate\b/g, "noValidate")
      .replace(/\breadonly\b/g, "readOnly")
      .replace(/\bmaxlength=/g, "maxLength=")
      .replace(/\bminlength=/g, "minLength=")
      .replace(/\bcellpadding=/g, "cellPadding=")
      .replace(/\bcellspacing=/g, "cellSpacing=")
      .replace(/\bcolspan=/g, "colSpan=")
      .replace(/\browspan=/g, "rowSpan=")
      .replace(/\bcrossorigin=/g, "crossOrigin=")
      // Inline event handlers
      .replace(/\bonclick=/g, "onClick=")
      .replace(/\bonchange=/g, "onChange=")
      .replace(/\bonsubmit=/g, "onSubmit=")
      .replace(/\bonkeydown=/g, "onKeyDown=")
      .replace(/\bonkeyup=/g, "onKeyUp=")
      .replace(/\bonmouseover=/g, "onMouseOver=")
      .replace(/\bonmouseout=/g, "onMouseOut=")
      .replace(/\bonfocus=/g, "onFocus=")
      .replace(/\bonblur=/g, "onBlur=")
      // Self-closing void elements
      .replace(
        /<(img|input|br|hr|meta|link|area|base|col|embed|param|source|track|wbr)((\s[^>]*)?)\s*\/?>/gi,
        (_, tag, attrs = "") => `<${tag}${attrs} />`,
      )
      // HTML comments → JSX comments
      .replace(/<!--([\s\S]*?)-->/g, "{/*$1*/}")
  );
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-z0-9]/gi, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function indentCode(code: string, spaces = 2): string {
  return code
    .split("\n")
    .map((line) => (line.trim() ? " ".repeat(spaces) + line : line))
    .join("\n");
}

// ─── Exporters ────────────────────────────────────────────────────────────────

function exportAsHtml(
  html: string,
  css: string,
  pageName = "index",
): ExportResult {
  const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageName}</title>
  <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
  <style>
${indentCode(css, 4)}
  </style>
</head>
<body>
${indentCode(html, 2)}
</body>
</html>`;

  return {
    format: "html",
    filename: `${pageName}.html`,
    content,
    language: "html",
  };
}

function exportAsHtmlCss(
  html: string,
  css: string,
  pageName = "index",
): ExportResult {
  const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageName}</title>
  <style>
${indentCode(css, 4)}
  </style>
</head>
<body>
${indentCode(html, 2)}
</body>
</html>`;

  return {
    format: "html-css",
    filename: `${pageName}.html`,
    content,
    language: "html",
  };
}

function exportAsBootstrap(
  html: string,
  css: string,
  pageName = "index",
): ExportResult {
  const content = `<!DOCTYPE html>
<html lang="en" data-bs-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageName}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"
    integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YcnS/1lK2JQp3vQ5JoZvl8/0RE6E3O5o9rV" crossorigin="anonymous" />
  <style>
${indentCode(css, 4)}
  </style>
</head>
<body>
${indentCode(html, 2)}
</body>
</html>`;

  return {
    format: "bootstrap",
    filename: `${pageName}.html`,
    content,
    language: "html",
  };
}

function exportAsIonicTailwind(
  html: string,
  css: string,
  pageName = "index",
): ExportResult {
  const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageName}</title>
  <script type="module" src="https://cdn.jsdelivr.net/npm/@ionic/core@8/dist/ionic/ionic.esm.js"></script>
  <script nomodule src="https://cdn.jsdelivr.net/npm/@ionic/core@8/dist/ionic/ionic.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ionic/core@8/css/ionic.bundle.css" />
  <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
  <style>
${indentCode(css, 4)}
  </style>
</head>
<body>
${indentCode(html, 2)}
</body>
</html>`;

  return {
    format: "ionic-tailwind",
    filename: `${pageName}.html`,
    content,
    language: "html",
  };
}

function exportAsSvg(
  html: string,
  _css: string,
  pageName = "index",
): ExportResult {
  // SVG output: the html field should contain the <svg> element
  const svgContent = html.trim().startsWith("<svg")
    ? html
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="100%" height="100%">\n${indentCode(html, 2)}\n</svg>`;

  return {
    format: "svg",
    filename: `${pageName}.svg`,
    content: svgContent,
    language: "html",
  };
}

function exportAsVue(
  html: string,
  css: string,
  componentName = "MyComponent",
): ExportResult {
  const name = pascalCase(componentName) || "MyComponent";

  const content = `<template>
${indentCode(html, 2)}
</template>

<script setup lang="ts">
// Add component logic here
defineOptions({ name: '${name}' });
</script>

${css.trim() ? `<style scoped>\n${css.trim()}\n</style>` : ""}
`;

  return {
    format: "vue",
    filename: `${name}.vue`,
    content,
    language: "vue",
  };
}

// ─── React + Tailwind Export ──────────────────────────────────────────────────

function exportAsReactTailwind(
  html: string,
  css: string,
  componentName = "MyComponent",
): ExportResult {
  const name = pascalCase(componentName) || "MyComponent";
  const jsx = htmlToJsx(html);

  // Clean up JSX: remove empty lines, normalize indentation
  const cleanJsx = jsx
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, i, arr) => {
      // Remove consecutive empty lines
      if (!line.trim() && i > 0 && !arr[i - 1]?.trim()) return false;
      return true;
    })
    .join("\n");

  // Detect if the HTML contains complex components that might need imports
  const needsRecharts = /recharts|BarChart|LineChart|PieChart|AreaChart/.test(
    html,
  );
  const needsMotion = /motion|animate|transition/.test(css + html);

  const imports = [`import React from 'react';`];
  if (needsRecharts) {
    imports.push(
      `import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';`,
    );
  }

  const content = `${imports.join("\n")}

/**
 * ${name} — Production-ready React + Tailwind CSS component.
 * Generated by LayoutForge
 *
 * Usage:
 *   import { ${name} } from './${name}';
 *   <${name} />
 *
 * Tailwind CSS must be configured in your project.
 * Install: npm install tailwindcss @tailwindcss/postcss postcss autoprefixer
 */

interface ${name}Props {
  /** Additional CSS classes to apply */
  className?: string;
  /** Children elements */
  children?: React.ReactNode;
}

export function ${name}({ className = '', children }: ${name}Props): React.JSX.Element {
  return (
    <div className={\`min-h-screen bg-white \${className}\`.trim()}>
${indentCode(cleanJsx, 6)}
      {children}
    </div>
  );
}

export default ${name};
`;

  // Generate Tailwind CSS config recommendation
  const tailwindNote = css.trim()
    ? `\n/* Custom CSS (add to your global styles or CSS module) */\n${css.trim()}\n`
    : "";

  return {
    format: "react-tailwind",
    filename: `${name}.tsx`,
    content: content + tailwindNote,
    language: "tsx",
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function exportCode(
  format: ExportFormat,
  html: string,
  css: string,
  name = "MyLayout",
): ExportResult {
  switch (format) {
    case "html":
      return exportAsHtml(html, css, name);
    case "html-css":
      return exportAsHtmlCss(html, css, name);
    case "react-tailwind":
      return exportAsReactTailwind(html, css, name);
    case "vue":
      return exportAsVue(html, css, name);
    case "bootstrap":
      return exportAsBootstrap(html, css, name);
    case "ionic-tailwind":
      return exportAsIonicTailwind(html, css, name);
    case "svg":
      return exportAsSvg(html, css, name);
    default:
      return exportAsHtml(html, css, name);
  }
}

export function downloadExportResult(result: ExportResult): void {
  const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const FORMAT_META: Record<
  ExportFormat,
  { label: string; icon: string; desc: string; color: string }
> = {
  html: {
    label: "HTML + Tailwind",
    icon: "\ud83c\udf10",
    desc: "Single-file HTML with Tailwind CSS v4",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  "html-css": {
    label: "HTML + CSS",
    icon: "\ud83d\udcbb",
    desc: "Plain HTML and CSS, no framework",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  "react-tailwind": {
    label: "React + Tailwind",
    icon: "\u269b\ufe0f",
    desc: "React component with Tailwind CSS classes",
    color: "text-cyan-600 bg-cyan-50 border-cyan-200",
  },
  vue: {
    label: "Vue + Tailwind",
    icon: "\ud83d\udc9a",
    desc: "Vue 3 SFC with <script setup> and Tailwind",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  bootstrap: {
    label: "Bootstrap",
    icon: "\ud83d\udfe2",
    desc: "HTML with Bootstrap 5 framework",
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
  "ionic-tailwind": {
    label: "Ionic + Tailwind",
    icon: "\ud83d\udcf1",
    desc: "Ionic web components with Tailwind CSS",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  svg: {
    label: "SVG",
    icon: "\ud83c\udfa8",
    desc: "Scalable Vector Graphics output",
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
};
