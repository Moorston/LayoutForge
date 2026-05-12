import React, { useState, useCallback } from "react";
import {
  Smartphone,
  Tablet,
  Copy,
  Download,
  CheckCircle2,
  ChevronRight,
  Code2,
  Apple,
  MonitorSmartphone,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  exportToReactNative,
  exportToFlutter,
  type ExportResult,
} from "@/lib/nativeExporter";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface OutputFormatPanelProps {
  html: string;
  css: string;
}

// ─── Format Config ───────────────────────────────────────────────────────────

interface FormatOption {
  id: "react-native" | "flutter";
  name: string;
  description: string;
  icon: React.ReactNode;
  platforms: string[];
  color: string;
  bgColor: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: "react-native",
    name: "React Native",
    description: "Cross-platform mobile apps with JavaScript and native components.",
    icon: <Smartphone className="w-5 h-5" />,
    platforms: ["iOS", "Android"],
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    id: "flutter",
    name: "Flutter",
    description: "Beautiful native apps with Dart and Material Design widgets.",
    icon: <MonitorSmartphone className="w-5 h-5" />,
    platforms: ["iOS", "Android", "Web", "Desktop"],
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 border-cyan-200",
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function OutputFormatPanel({ html, css }: OutputFormatPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<"react-native" | "flutter" | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);

  const convert = useCallback(
    (format: "react-native" | "flutter") => {
      setIsConverting(true);
      setSelectedFormat(format);
      setTimeout(() => {
        const name = "MyComponent";
        const res =
          format === "react-native"
            ? exportToReactNative(html, css, name)
            : exportToFlutter(html, css, name);
        setResult(res);
        setIsConverting(false);
      }, 500);
    },
    [html, css],
  );

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const ext = result.platform === "react-native" ? "tsx" : "dart";
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
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Export</p>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Code2 className="w-5 h-5 shrink-0" />
          Native Output
        </h2>
      </div>

      {/* Format cards */}
      <div className="grid grid-cols-1 gap-3">
        {FORMAT_OPTIONS.map((format) => (
          <motion.button
            key={format.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => convert(format.id)}
            className={cn(
              "flex items-start gap-4 p-4 rounded-xl border text-left transition-all",
              selectedFormat === format.id
                ? `${format.bgColor} ring-2 ring-offset-1`
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", format.bgColor, format.color)}>
              {format.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{format.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{format.description}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {format.platforms.map((p) => (
                  <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          </motion.button>
        ))}
      </div>

      {/* Loading state */}
      {isConverting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 py-4"
        >
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Converting to {selectedFormat}…</p>
        </motion.div>
      )}

      {/* Result */}
      {result && !isConverting && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          {/* Info bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-800">
              Generated {result.platform === "react-native" ? "React Native" : "Flutter"} component
            </p>
          </div>

          {/* Notes */}
          {result.notes.length > 0 && (
            <div className="space-y-1.5">
              {result.notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-slate-500">
                  <AlertCircle className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                  {note}
                </div>
              ))}
            </div>
          )}

          {/* Code preview */}
          <div className="relative">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-t-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {result.componentName}.{result.platform === "react-native" ? "tsx" : "dart"}
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
              {result.code.slice(0, 2000)}
              {result.code.length > 2000 && "\n\n// ... (truncated for preview)"}
            </pre>
          </div>

          {/* Dependencies */}
          {result.dependencies.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Dependencies</p>
              <div className="flex flex-wrap gap-1.5">
                {result.dependencies.map((dep) => (
                  <span key={dep} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono rounded">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!result && !isConverting && (
        <p className="text-xs text-slate-400 text-center">
          Select a target platform to convert your layout.
        </p>
      )}
    </div>
  );
}
