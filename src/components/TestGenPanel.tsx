import React, { useState, useCallback } from "react";
import {
  FlaskConical,
  Play,
  Copy,
  Download,
  CheckCircle2,
  Eye,
  Layers,
  MousePointer,
  Accessibility,
  FileCode,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { generateTests, type TestResult } from "@/lib/testGenerator";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface TestGenPanelProps {
  html: string;
  css: string;
  stack: string;
  componentName?: string;
}

// ─── Category icons ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  rendering: { icon: <Eye className="w-3.5 h-3.5" />, label: "Rendering", color: "bg-blue-50 text-blue-600" },
  content: { icon: <FileCode className="w-3.5 h-3.5" />, label: "Content", color: "bg-emerald-50 text-emerald-600" },
  structure: { icon: <Layers className="w-3.5 h-3.5" />, label: "Structure", color: "bg-purple-50 text-purple-600" },
  interaction: { icon: <MousePointer className="w-3.5 h-3.5" />, label: "Interaction", color: "bg-amber-50 text-amber-600" },
  accessibility: { icon: <Accessibility className="w-3.5 h-3.5" />, label: "Accessibility", color: "bg-rose-50 text-rose-600" },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function TestGenPanel({ html, css, stack, componentName = "MyComponent" }: TestGenPanelProps) {
  const [result, setResult] = useState<TestResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const detectedStack = stack.toLowerCase().includes("vue") ? "vue" : "react";

  const generate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const res = generateTests(componentName, html, stack);
      setResult(res);
      setIsGenerating(false);
      setShowCode(true);
    }, 600);
  }, [componentName, html, stack]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const ext = result.framework === "react" ? "test.tsx" : "test.ts";
    const blob = new Blob([result.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.componentName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Testing</p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 shrink-0" />
            Unit Test Generator
          </h2>
        </div>
        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase">
          {detectedStack === "vue" ? "Vue" : "React"}
        </span>
      </div>

      {/* Generate button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={generate}
        disabled={isGenerating}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        <Play className={cn("w-4 h-4", isGenerating && "animate-pulse")} />
        {isGenerating ? "Generating tests…" : "Generate Tests"}
      </motion.button>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          {/* Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-900">{result.testCount}</p>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Tests</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
              <FlaskConical className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="text-sm font-bold text-indigo-900">{Object.keys(result.categories).length}</p>
                <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Categories</p>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="space-y-1.5">
            {Object.entries(result.categories).map(([key, count]) => {
              const meta = CATEGORY_META[key];
              if (!meta || count === 0) return null;
              return (
                <div key={key} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", meta.color)}>
                    {meta.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 flex-1">{meta.label}</span>
                  <span className="text-xs font-bold text-slate-900">{count} test{count !== 1 ? "s" : ""}</span>
                </div>
              );
            })}
          </div>

          {/* Code preview */}
          {showCode && (
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-t-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {result.componentName}.{result.framework === "react" ? "test.tsx" : "test.ts"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
              <pre className="bg-slate-950 text-slate-300 text-[10px] font-mono p-4 rounded-b-xl overflow-x-auto max-h-[300px] overflow-y-auto leading-relaxed">
                {result.code}
              </pre>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!result && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <FlaskConical className="w-8 h-8 text-slate-300" />
          <p className="text-xs text-slate-400 text-center">
            Generate ready-to-run tests for your {detectedStack === "vue" ? "Vue" : "React"} component.
          </p>
        </div>
      )}
    </div>
  );
}
