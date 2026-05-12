import React, { useState, useCallback } from "react";
import {
  BookOpen,
  Play,
  Copy,
  Download,
  CheckCircle2,
  FileText,
  FolderTree,
  Eye,
  Settings,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { generateStorybookStories, type StorybookOutput } from "@/lib/storybookExporter";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface StorybookPanelProps {
  html: string;
  css: string;
  componentName?: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function StorybookPanel({ html, css, componentName = "MyComponent" }: StorybookPanelProps) {
  const [output, setOutput] = useState<StorybookOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const result = generateStorybookStories(html, css, componentName);
      setOutput(result);
      setActiveFile(result.stories[0]?.filename ?? null);
      setIsGenerating(false);
    }, 600);
  }, [html, css, componentName]);

  const allFiles = output
    ? [
        ...output.stories.map((s) => ({ path: `src/stories/${s.filename}`, content: s.content, type: "story" as const })),
        { path: ".storybook/main.ts", content: output.config, type: "config" as const },
        { path: ".storybook/preview.ts", content: output.preview, type: "config" as const },
      ]
    : [];

  const activeContent = allFiles.find((f) => f.path === activeFile)?.content ?? "";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(activeContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [activeContent]);

  const handleDownloadAll = useCallback(() => {
    if (!output) return;
    for (const file of allFiles) {
      const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.path.split("/").pop() ?? "file.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [output, allFiles]);

  const totalStories = output?.stories.length ?? 0;
  const totalControls = output?.stories.reduce((sum, s) => {
    const controls = (s.content.match(/control:/g) || []).length;
    return sum + controls;
  }, 0) ?? 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Documentation</p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 shrink-0" />
            Storybook Export
          </h2>
        </div>
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
        {isGenerating ? "Generating stories…" : "Generate Storybook"}
      </motion.button>

      {/* Result */}
      {output && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-lg font-extrabold text-blue-600">{totalStories}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-500">Stories</p>
            </div>
            <div className="flex flex-col items-center px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-lg font-extrabold text-purple-600">{totalControls}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-purple-500">Controls</p>
            </div>
            <div className="flex flex-col items-center px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-lg font-extrabold text-emerald-600">{allFiles.length}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Files</p>
            </div>
          </div>

          {/* File tree + preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex">
              {/* Sidebar */}
              <div className="w-52 shrink-0 border-r border-slate-200 bg-slate-50 p-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-1">
                  <FolderTree className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Files</span>
                </div>
                <div className="space-y-0.5">
                  {allFiles.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setActiveFile(file.path)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
                        activeFile === file.path ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-700",
                      )}
                    >
                      {file.type === "story" ? (
                        <Eye className={cn("w-3.5 h-3.5 shrink-0", activeFile === file.path ? "text-slate-400" : "text-slate-400")} />
                      ) : (
                        <Settings className={cn("w-3.5 h-3.5 shrink-0", activeFile === file.path ? "text-slate-400" : "text-slate-400")} />
                      )}
                      <span className="text-[11px] font-mono truncate">{file.path}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-900">
                  <span className="text-[10px] font-mono text-slate-400 truncate">{activeFile}</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="bg-slate-950 text-slate-300 text-[10px] font-mono p-4 overflow-x-auto max-h-[280px] overflow-y-auto leading-relaxed">
                  {activeContent}
                </pre>
              </div>
            </div>
          </div>

          {/* Download all */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadAll}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Storybook Package
          </motion.button>

          {/* Setup instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <p className="text-xs font-bold text-slate-900">Quick Setup</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-600 font-mono">npx storybook@latest init</p>
              <p className="text-[11px] text-slate-600 font-mono">cp -r src/stories/* &lt;your-project&gt;/src/stories/</p>
              <p className="text-[11px] text-slate-600 font-mono">cp .storybook/* &lt;your-project&gt;/.storybook/</p>
              <p className="text-[11px] text-slate-600 font-mono">npm run storybook</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!output && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <BookOpen className="w-8 h-8 text-slate-300" />
          <p className="text-xs text-slate-400 text-center">
            Generate Storybook stories with controls, variants, and configuration files.
          </p>
        </div>
      )}
    </div>
  );
}
