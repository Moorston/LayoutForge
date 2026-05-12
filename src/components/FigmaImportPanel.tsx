import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Figma,
  Link,
  Key,
  ChevronRight,
  ChevronDown,
  Download,
  AlertCircle,
  Loader2,
  Eye,
  FileCode,
  Layers,
  Frame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchFigmaFile,
  extractFileKeyFromUrl,
  parseFigmaNode,
  parsedComponentToHTML,
  listPagesAndFrames,
  findNodeById,
} from "@/services/figmaService";
import type {
  FigmaFile,
  FigmaPageSummary,
} from "@/services/figmaService";

// ─── Props ───────────────────────────────────────────────────────────────────

interface FigmaImportPanelProps {
  onImport: (html: string, css: string) => void;
}

// ─── Tree Node ───────────────────────────────────────────────────────────────

function TreeNode({
  page,
  selectedFrameId,
  onSelect,
}: {
  page: FigmaPageSummary;
  selectedFrameId: string | null;
  onSelect: (frameId: string, frameName: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="ml-1">
      {/* Page */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span className="text-xs font-semibold text-slate-700 truncate">
          {page.name}
        </span>
        <span className="text-[10px] text-slate-400 ml-auto">
          {page.frames.length}
        </span>
      </button>

      {/* Frames */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="ml-4 border-l border-slate-200 pl-2">
              {page.frames.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => onSelect(frame.id, frame.name)}
                  className={cn(
                    "flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-lg transition-colors text-xs",
                    selectedFrameId === frame.id
                      ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <Frame className="w-3 h-3 shrink-0" />
                  <span className="truncate">{frame.name}</span>
                </button>
              ))}
              {page.frames.length === 0 && (
                <p className="text-[10px] text-slate-400 py-1.5 px-2">
                  No frames in this page
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FigmaImportPanel({ onImport }: FigmaImportPanelProps) {
  const [figmaUrl, setFigmaUrl] = useState("");
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem("figma-token") || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [figmaFile, setFigmaFile] = useState<FigmaFile | null>(null);
  const [pages, setPages] = useState<FigmaPageSummary[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedFrameName, setSelectedFrameName] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewCss, setPreviewCss] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const handleTokenChange = useCallback((value: string) => {
    setToken(value);
    try {
      sessionStorage.setItem("figma-token", value);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleImport = useCallback(async () => {
    setError(null);
    setFigmaFile(null);
    setPages([]);
    setSelectedFrameId(null);
    setPreviewHtml(null);
    setPreviewCss(null);

    const fileKey = extractFileKeyFromUrl(figmaUrl);
    if (!fileKey) {
      setError("Invalid Figma URL. Please use a URL like https://www.figma.com/file/XXXXX/Name");
      return;
    }

    if (!token.trim()) {
      setError("Please enter your Figma Personal Access Token.");
      return;
    }

    setLoading(true);
    try {
      const file = await fetchFigmaFile(fileKey, token.trim());
      setFigmaFile(file);
      const pageSummary = listPagesAndFrames(file);
      setPages(pageSummary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch Figma file.",
      );
    } finally {
      setLoading(false);
    }
  }, [figmaUrl, token]);

  const handleSelectFrame = useCallback(
    (frameId: string, frameName: string) => {
      setSelectedFrameId(frameId);
      setSelectedFrameName(frameName);
      setPreviewHtml(null);
      setPreviewCss(null);
    },
    [],
  );

  const handlePreview = useCallback(() => {
    if (!figmaFile || !selectedFrameId) return;

    setParsing(true);
    try {
      const node = findNodeById(figmaFile.document, selectedFrameId);
      if (!node) {
        setError("Could not find the selected frame.");
        return;
      }

      const parsed = parseFigmaNode(node);
      const { html, css } = parsedComponentToHTML(parsed);
      setPreviewHtml(html);
      setPreviewCss(css);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse frame.",
      );
    } finally {
      setParsing(false);
    }
  }, [figmaFile, selectedFrameId]);

  const handleApplyImport = useCallback(() => {
    if (previewHtml && previewCss) {
      onImport(previewHtml, previewCss);
    }
  }, [previewHtml, previewCss, onImport]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Import
        </p>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Figma className="w-5 h-5 shrink-0 text-indigo-500" />
          Figma Import
        </h2>
      </div>

      {/* ── File URL ────────────────────────────────────────── */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Figma File URL
        </label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="url"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            placeholder="https://www.figma.com/file/XXXXX/Design-Name"
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition"
          />
        </div>
      </div>

      {/* ── Token ───────────────────────────────────────────── */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Personal Access Token
        </label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="password"
            value={token}
            onChange={(e) => handleTokenChange(e.target.value)}
            placeholder="figd_XXXXXXXXXXXXXXXX"
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-mono placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
          Generate a token at{" "}
          <span className="font-semibold text-slate-500">figma.com → Settings → Personal Access Tokens</span>.
          Your token is stored in sessionStorage only and never sent to our servers.
        </p>
      </div>

      {/* ── Import Button ───────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleImport}
        disabled={loading}
        className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/15 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Fetching file…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Fetch Figma File
          </>
        )}
      </motion.button>

      {/* ── Error ───────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── File Info ───────────────────────────────────────── */}
      <AnimatePresence>
        {figmaFile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            {/* File name */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-slate-900">{figmaFile.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Last modified:{" "}
                {new Date(figmaFile.lastModified).toLocaleDateString()} · v
                {figmaFile.version}
              </p>
            </div>

            {/* Tree view */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Pages & Frames
              </p>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-white">
                {pages.map((page) => (
                  <TreeNode
                    key={page.id}
                    page={page}
                    selectedFrameId={selectedFrameId}
                    onSelect={handleSelectFrame}
                  />
                ))}
              </div>
            </div>

            {/* Selected frame + actions */}
            {selectedFrameId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
                  <Frame className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-xs font-semibold text-indigo-700 truncate">
                    {selectedFrameName}
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePreview}
                  disabled={parsing}
                  className="w-full bg-slate-900 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing…
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Preview Import
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* Preview */}
            {previewHtml && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Preview
                </p>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;padding:16px;font-family:system-ui;}{${previewCss || ""}}</style></head><body>${previewHtml || ""}</body></html>`}
                    className="w-full h-64 bg-white"
                    sandbox="allow-same-origin"
                    title="Figma Import Preview"
                  />
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <FileCode className="w-3 h-3" />
                  <span>
                    {(previewHtml?.length || 0) + (previewCss?.length || 0)}{" "}
                    characters generated
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApplyImport}
                  className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/15"
                >
                  <Download className="w-4 h-4" />
                  Import Selected Frame
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
