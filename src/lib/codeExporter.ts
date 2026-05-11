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

function exportAsReact(
  html: string,
  css: string,
  componentName = "MyComponent",
): ExportResult {
  const name = pascalCase(componentName) || "MyComponent";
  const jsx = htmlToJsx(html);

  const content = `import React from 'react';

${css.trim() ? `// Styles (copy to your CSS file or use a CSS-in-JS solution)\nconst styles = \`\n${css.trim()}\n\`;\n` : ""}
interface ${name}Props {
  // Add props here
}

export function ${name}({}: ${name}Props): React.JSX.Element {
  return (
    <>
${indentCode(jsx, 6)}
    </>
  );
}

export default ${name};
`;

  return {
    format: "react",
    filename: `${name}.tsx`,
    content,
    language: "tsx",
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

function exportAsNextjs(
  html: string,
  css: string,
  pageName = "page",
): ExportResult {
  const jsx = htmlToJsx(html);
  const routeName = pageName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "page";

  const content = `import type { Metadata } from 'next';
${css.trim() ? `import styles from './${routeName}.module.css';\n` : ""}
export const metadata: Metadata = {
  title: '${pascalCase(pageName)}',
};

export default function ${pascalCase(pageName)}Page() {
  return (
    <>
${indentCode(jsx, 6)}
    </>
  );
}
`;

  const cssResult = css.trim()
    ? `\n\n/* ${routeName}.module.css */\n${css.trim()}`
    : "";

  return {
    format: "nextjs",
    filename: `${routeName}/page.tsx`,
    content: content + cssResult,
    language: "tsx",
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
    case "react":
      return exportAsReact(html, css, name);
    case "react-tailwind":
      return exportAsReactTailwind(html, css, name);
    case "vue":
      return exportAsVue(html, css, name);
    case "nextjs":
      return exportAsNextjs(html, css, name);
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
    label: "HTML",
    icon: "🌐",
    desc: "Single-file HTML with Tailwind CDN",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  react: {
    label: "React",
    icon: "⚛️",
    desc: "TypeScript functional component (.tsx)",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  "react-tailwind": {
    label: "React + Tailwind",
    icon: "⚛️",
    desc: "React component with Tailwind CSS classes",
    color: "text-cyan-600 bg-cyan-50 border-cyan-200",
  },
  vue: {
    label: "Vue 3",
    icon: "💚",
    desc: "Single File Component with <script setup>",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  nextjs: {
    label: "Next.js",
    icon: "▲",
    desc: "App Router page component + CSS module",
    color: "text-slate-900 bg-slate-100 border-slate-300",
  },
};
