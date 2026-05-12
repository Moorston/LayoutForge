/**
 * Dark Mode Panel — generates dark theme CSS from the current styles.
 *
 * Supports two modes:
 *  - Media query: `@media (prefers-color-scheme: dark)` — automatic system-based
 *  - Class toggle: `.dark` class — for manual JS toggle
 */

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Moon, Sun, Copy, Check, Code2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateDarkModeCSS,
  generateDarkModeMediaQuery,
  generateDarkModeToggle,
  extractCSSVariables,
} from "@/lib/darkMode";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DarkModePanelProps {
  css: string;
  onApply: (newCss: string) => void;
}

type Mode = "media" | "toggle";

// ─── Component ────────────────────────────────────────────────────────────────

export function DarkModePanel({ css, onApply }: DarkModePanelProps) {
  const [mode, setMode] = useState<Mode>("media");
  const [copied, setCopied] = useState(false);

  // Extract existing variables for preview
  const existingVars = useMemo(() => extractCSSVariables(css), [css]);

  // Generate dark CSS
  const darkCss = useMemo(() => generateDarkModeCSS(css), [css]);
  const wrappedCss = useMemo(
    () =>
      mode === "media"
        ? generateDarkModeMediaQuery(darkCss)
        : generateDarkModeToggle(darkCss),
    [darkCss, mode],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wrappedCss);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
    }
  };

  const handleApply = () => {
    onApply(css + "\n\n/* ── Dark Mode ── */\n" + wrappedCss);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Dark Mode Generator
            </h2>
            <p className="text-[11px] text-slate-500">
              Auto-generate a dark theme from your existing CSS variables
            </p>
          </div>
        </div>
      </div>

      {/* Detected variables count */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl">
          <Code2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">
            {Object.keys(existingVars).length} CSS variables detected
          </span>
        </div>
      </div>

      {/* Mode selector */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Generation Mode
        </p>
        <div className="grid grid-cols-2 gap-3">
          {([
            {
              key: "media" as const,
              icon: Layers,
              label: "Media Query",
              desc: "@media (prefers-color-scheme: dark) — automatic system detection",
            },
            {
              key: "toggle" as const,
              icon: Sun,
              label: "Class Toggle",
              desc: ".dark class — manual JS-controlled toggle",
            },
          ]).map(({ key, icon: Icon, label, desc }) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode(key)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all",
                mode === key
                  ? "ring-2 ring-indigo-500 bg-indigo-50 border-indigo-300"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <Icon className="w-4 h-4 text-slate-700" />
              <span className="text-sm font-bold text-slate-900">{label}</span>
              <span className="text-[10px] text-slate-500 leading-snug">
                {desc}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Generated CSS Preview
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-900 overflow-hidden">
          <pre className="p-4 text-[11px] leading-relaxed text-emerald-300 font-mono overflow-auto max-h-80">
            {wrappedCss}
          </pre>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Moon className="w-4 h-4" />
          Apply Dark Theme
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopy}
          className={cn(
            "flex items-center justify-center gap-2 px-5 rounded-xl py-3 text-sm font-bold border transition-all",
            copied
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
          )}
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied!" : "Copy CSS"}
        </motion.button>
      </div>
    </div>
  );
}
