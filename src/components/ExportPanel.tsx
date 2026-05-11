import React, { useState } from "react";
import { Download, Copy, Check, Code2, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import Editor from "@monaco-editor/react";
import {
  exportCode,
  downloadExportResult,
  FORMAT_META,
} from "@/lib/codeExporter";
import type { ExportFormat, ExportResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ExportPanelProps {
  html: string;
  css: string;
  projectName?: string;
}

const INSTALL_NOTES: Record<ExportFormat, string> = {
  html: "Open directly in any browser. Tailwind CSS is loaded via CDN — zero build step required.",
  "react-tailwind":
    "Install: npm install react react-dom tailwindcss postcss autoprefixer && npx tailwindcss init -p. Then place the component in src/.",
  vue: "Use with Vite + plugin-vue: npm create vite@latest my-app -- --template vue-ts, then copy this SFC.",
};

const ACCENT_BORDER: Record<ExportFormat, string> = {
  html: "border-l-orange-400",
  "react-tailwind": "border-l-cyan-400",
  vue: "border-l-emerald-400",
};

const FORMATS: ExportFormat[] = ["html", "react-tailwind", "vue"];

export function ExportPanel({ html, css, projectName }: ExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("html");
  const [componentName, setComponentName] = useState<string>(
    projectName ?? "MyLayout",
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [result, setResult] = useState<ExportResult | null>(null);

  const handleGenerate = () => {
    const r = exportCode(selectedFormat, html, css, componentName);
    setResult(r);
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments where clipboard API is unavailable
      const textArea = document.createElement("textarea");
      textArea.value = result.content;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        alert("Failed to copy to clipboard. Please copy manually.");
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const editorLanguage =
    result?.language === "tsx" || result?.language === "ts"
      ? "typescript"
      : result?.language === "vue"
        ? "html"
        : (result?.language ?? "html");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Export
        </p>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Code2 className="w-5 h-5 shrink-0" />
          Export Code
        </h2>
      </div>

      {/* ── Format grid ────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Format
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FORMATS.map((fmt) => {
            const meta = FORMAT_META[fmt];
            const isSelected = selectedFormat === fmt;
            return (
              <motion.button
                key={fmt}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedFormat(fmt)}
                className={cn(
                  "relative flex flex-col items-start gap-1 rounded-xl border-2 border-l-4 p-4 text-left transition-all duration-200",
                  isSelected
                    ? cn(
                        "ring-2 ring-slate-900 bg-slate-50",
                        ACCENT_BORDER[fmt],
                      )
                    : "border-slate-200 border-l-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60",
                )}
              >
                <span className="text-2xl leading-none">{meta.icon}</span>
                <span className="text-sm font-bold text-slate-900 mt-1">
                  {meta.label}
                </span>
                <span className="text-[11px] text-slate-500 leading-snug">
                  {meta.desc}
                </span>
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-slate-900" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Component name ─────────────────────────────────── */}
      <div>
        <label
          htmlFor="export-name"
          className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2"
        >
          Component / Page Name
        </label>
        <input
          id="export-name"
          type="text"
          value={componentName}
          onChange={(e) => setComponentName(e.target.value)}
          placeholder="MyLayout"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
        />
      </div>

      {/* ── Generate button ─────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleGenerate}
        className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
      >
        <Code2 className="w-4 h-4" />
        Generate {FORMAT_META[selectedFormat].label} Code
      </motion.button>

      {/* ── Result area ────────────────────────────────────── */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          {/* Preview toggle header */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Preview
            </p>
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors font-semibold"
            >
              {showPreview ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Hide
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Show
                </>
              )}
            </button>
          </div>

          {/* Monaco editor */}
          {showPreview && (
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <Editor
                height="300px"
                language={editorLanguage}
                value={result.content}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineHeight: 1.65,
                  fontFamily: "JetBrains Mono, Fira Code, Consolas, monospace",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  scrollbar: { vertical: "auto", horizontal: "auto" },
                }}
              />
            </div>
          )}

          {/* Filename badge */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Code2 className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono font-semibold">{result.filename}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => downloadExportResult(result)}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCopy}
              className={cn(
                "flex items-center justify-center gap-2 px-5 rounded-xl py-2.5 text-sm font-bold border transition-all duration-200",
                copied
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy
                </>
              )}
            </motion.button>
          </div>

          {/* Format-specific tip */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Quick Start
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {INSTALL_NOTES[selectedFormat]}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
