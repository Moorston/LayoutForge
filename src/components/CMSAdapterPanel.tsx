import React, { useState, useCallback } from "react";
import {
  Globe,
  ShoppingBag,
  Layers,
  FileText,
  Download,
  ChevronRight,
  Copy,
  CheckCircle2,
  FolderTree,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  adaptToWordPress,
  adaptToShopify,
  adaptToStrapi,
  type CMSOutput,
} from "@/lib/cmsAdapter";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface CMSAdapterPanelProps {
  html: string;
  css: string;
}

// ─── Platform Config ─────────────────────────────────────────────────────────

interface PlatformOption {
  id: "wordpress" | "shopify" | "strapi";
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const PLATFORMS: PlatformOption[] = [
  {
    id: "wordpress",
    name: "WordPress",
    description: "Classic CMS with PHP themes, template tags, and the WordPress loop.",
    icon: <Globe className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "E-commerce platform with Liquid templates and theme sections.",
    icon: <ShoppingBag className="w-5 h-5" />,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
  },
  {
    id: "strapi",
    name: "Strapi",
    description: "Headless CMS with REST API, dynamic zones, and React frontend.",
    icon: <Layers className="w-5 h-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
  },
];

// ─── File Tree ───────────────────────────────────────────────────────────────

function FileTree({ files, activeFile, onSelect }: { files: CMSOutput["files"]; activeFile: string | null; onSelect: (path: string) => void }) {
  return (
    <div className="space-y-0.5">
      {files.map((file) => (
        <button
          key={file.path}
          onClick={() => onSelect(file.path)}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
            activeFile === file.path ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-700",
          )}
        >
          <FileText className={cn("w-3.5 h-3.5 shrink-0", activeFile === file.path ? "text-slate-400" : "text-slate-400")} />
          <span className="text-[11px] font-mono truncate">{file.path}</span>
          <span className={cn("ml-auto text-[9px] font-bold uppercase px-1 py-0.5 rounded", activeFile === file.path ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-400")}>
            {file.language}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CMSAdapterPanel({ html, css }: CMSAdapterPanelProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<"wordpress" | "shopify" | "strapi" | null>(null);
  const [output, setOutput] = useState<CMSOutput | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const convert = useCallback(
    (platform: "wordpress" | "shopify" | "strapi") => {
      setIsConverting(true);
      setSelectedPlatform(platform);
      setTimeout(() => {
        let result: CMSOutput;
        const name = "My Theme";
        switch (platform) {
          case "wordpress":
            result = adaptToWordPress(html, css, name);
            break;
          case "shopify":
            result = adaptToShopify(html, css, name);
            break;
          case "strapi":
            result = adaptToStrapi(html, css, name);
            break;
        }
        setOutput(result);
        setActiveFile(result.files[0]?.path ?? null);
        setIsConverting(false);
      }, 600);
    },
    [html, css],
  );

  const activeFileContent = output?.files.find((f) => f.path === activeFile)?.content ?? "";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(activeFileContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [activeFileContent]);

  const handleDownloadAll = useCallback(() => {
    if (!output) return;
    // Download each file individually (in a real app you'd use JSZip)
    for (const file of output.files) {
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
  }, [output]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Integration</p>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-5 h-5 shrink-0" />
          CMS Adapter
        </h2>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 gap-3">
        {PLATFORMS.map((platform) => (
          <motion.button
            key={platform.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => convert(platform.id)}
            className={cn(
              "flex items-start gap-4 p-4 rounded-xl border text-left transition-all",
              selectedPlatform === platform.id
                ? `${platform.bgColor} ring-2 ring-offset-1`
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", platform.bgColor, platform.color)}>
              {platform.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{platform.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{platform.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          </motion.button>
        ))}
      </div>

      {/* Loading */}
      {isConverting && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 py-4">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Generating {selectedPlatform} files…</p>
        </motion.div>
      )}

      {/* Output */}
      {output && !isConverting && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
          {/* Stats */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">
              {output.files.length} files generated
            </span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase">
              {output.platform}
            </span>
          </div>

          {/* File tree + preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex">
              {/* Sidebar */}
              <div className="w-48 shrink-0 border-r border-slate-200 bg-slate-50 p-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-1">
                  <FolderTree className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Files</span>
                </div>
                <FileTree files={output.files} activeFile={activeFile} onSelect={setActiveFile} />
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
                <pre className="bg-slate-950 text-slate-300 text-[10px] font-mono p-4 overflow-x-auto max-h-[260px] overflow-y-auto leading-relaxed">
                  {activeFileContent}
                </pre>
              </div>
            </div>
          </div>

          {/* Download all */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadAll}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download All Files
          </motion.button>

          {/* Instructions toggle */}
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {showInstructions ? "Hide" : "Show"} setup instructions
          </button>

          <AnimatePresence>
            {showInstructions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <pre className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {output.instructions}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty state */}
      {!output && !isConverting && (
        <p className="text-xs text-slate-400 text-center">
          Select a CMS platform to generate template files.
        </p>
      )}
    </div>
  );
}
