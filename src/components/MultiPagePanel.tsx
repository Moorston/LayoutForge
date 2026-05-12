import React, { useState, useCallback, useMemo } from "react";
import {
  Globe,
  FileText,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Download,
  Eye,
  ChevronRight,
  Home,
  Users,
  Briefcase,
  MessageSquare,
  BookOpen,
  Camera,
  HelpCircle,
  DollarSign,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  generateSiteMap,
  generatePage,
  type PageType,
  type SiteMap,
  type GeneratedPage,
} from "@/lib/multiPageGenerator";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface MultiPagePanelProps {
  homeHtml: string;
  homeCss: string;
  onPagesGenerated?: (pages: Array<{ type: string; html: string; css: string }>) => void;
}

// ─── Page type config ────────────────────────────────────────────────────────

const PAGE_ICONS: Record<PageType, React.ReactNode> = {
  home: <Home className="w-4 h-4" />,
  about: <Users className="w-4 h-4" />,
  services: <Briefcase className="w-4 h-4" />,
  contact: <MessageSquare className="w-4 h-4" />,
  blog: <BookOpen className="w-4 h-4" />,
  portfolio: <Camera className="w-4 h-4" />,
  faq: <HelpCircle className="w-4 h-4" />,
  pricing: <DollarSign className="w-4 h-4" />,
};

const PAGE_COLORS: Record<PageType, string> = {
  home: "bg-blue-50 text-blue-600 border-blue-200",
  about: "bg-emerald-50 text-emerald-600 border-emerald-200",
  services: "bg-purple-50 text-purple-600 border-purple-200",
  contact: "bg-amber-50 text-amber-600 border-amber-200",
  blog: "bg-rose-50 text-rose-600 border-rose-200",
  portfolio: "bg-cyan-50 text-cyan-600 border-cyan-200",
  faq: "bg-orange-50 text-orange-600 border-orange-200",
  pricing: "bg-indigo-50 text-indigo-600 border-indigo-200",
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function MultiPagePanel({ homeHtml, homeCss, onPagesGenerated }: MultiPagePanelProps) {
  const [siteMap, setSiteMap] = useState<SiteMap | null>(null);
  const [pages, setPages] = useState<Map<string, GeneratedPage>>(new Map());
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [previewPage, setPreviewPage] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Auto-detect site structure
  const detectStructure = useCallback(() => {
    const map = generateSiteMap(homeHtml, homeCss);
    setSiteMap(map);
    // Mark home as generated
    const initialPages = new Map<string, GeneratedPage>();
    initialPages.set("home", { type: "home", html: homeHtml, css: homeCss });
    setPages(initialPages);
  }, [homeHtml, homeCss]);

  // Generate a single page
  const generateSinglePage = useCallback(
    (pageType: PageType) => {
      if (!siteMap) return;
      setGenerating((prev) => new Set(prev).add(pageType));
      setTimeout(() => {
        const result = generatePage(homeHtml, homeCss, pageType, siteMap);
        setPages((prev) => {
          const next = new Map(prev);
          next.set(pageType, result);
          return next;
        });
        setGenerating((prev) => {
          const next = new Set(prev);
          next.delete(pageType);
          return next;
        });
      }, 400);
    },
    [siteMap, homeHtml, homeCss],
  );

  // Generate all pages
  const generateAllPages = useCallback(() => {
    if (!siteMap) return;
    setIsGeneratingAll(true);

    let delay = 0;
    const pending = siteMap.pages.filter((p) => !pages.has(p.type));

    pending.forEach((page, idx) => {
      delay += 300;
      setTimeout(() => {
        const result = generatePage(homeHtml, homeCss, page.type, siteMap);
        setPages((prev) => {
          const next = new Map(prev);
          next.set(page.type, result);
          return next;
        });
        if (idx === pending.length - 1) {
          setIsGeneratingAll(false);
          if (onPagesGenerated) {
            const allPages: Array<{ type: string; html: string; css: string }> = [];
            // Use a fresh Map read after all updates
            setPages((prev) => {
              prev.forEach((p, key) => {
                allPages.push({ type: key, html: p.html, css: p.css });
              });
              return prev;
            });
            onPagesGenerated(allPages);
          }
        }
      }, delay);
    });
  }, [siteMap, pages, homeHtml, homeCss, onPagesGenerated]);

  const generatedCount = pages.size;
  const totalCount = siteMap?.pages.length ?? 0;

  // Show detect button if no siteMap
  if (!siteMap) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Generator</p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 shrink-0" />
            Multi-page Site
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Globe className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-900">Generate a multi-page site</p>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            Analyze your homepage to detect navigation and generate consistent sub-pages.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={detectStructure}
            className="mt-2 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Globe className="w-4 h-4" />
            Detect Site Structure
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Generator</p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 shrink-0" />
            Multi-page Site
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">
            {generatedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Nav links preview */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Navigation</p>
        <div className="flex flex-wrap gap-2">
          {siteMap.navLinks.map((link) => (
            <span key={link.href} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
              {link.label}
            </span>
          ))}
        </div>
      </div>

      {/* Generate all button */}
      {generatedCount < totalCount && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateAllPages}
          disabled={isGeneratingAll}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isGeneratingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating pages…
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate All Pages ({totalCount - generatedCount} remaining)
            </>
          )}
        </motion.button>
      )}

      {/* Page list */}
      <div className="space-y-2">
        {siteMap.pages.map((page) => {
          const isGenerated = pages.has(page.type);
          const isGen = generating.has(page.type);
          const previewData = pages.get(page.type);

          return (
            <motion.div
              key={page.type}
              layout
              className={cn(
                "border rounded-xl overflow-hidden",
                isGenerated ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200",
              )}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", PAGE_COLORS[page.type])}>
                  {PAGE_ICONS[page.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900">{page.title}</p>
                  <p className="text-[10px] text-slate-500">{page.slug}</p>
                </div>
                {isGen ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                ) : isGenerated ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewPage(previewPage === page.type ? null : page.type)}
                      className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => generateSinglePage(page.type)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Generate
                  </motion.button>
                )}
              </div>

              {/* Preview iframe */}
              <AnimatePresence>
                {previewPage === page.type && previewData && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 320, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t border-slate-200"
                  >
                    <div className="h-8 bg-slate-100 flex items-center px-3 gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="ml-2 text-[10px] text-slate-500 font-medium">{page.slug}</span>
                    </div>
                    <iframe
                      srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://unpkg.com/@tailwindcss/browser@4"></script><style>${previewData.css}</style></head><body>${previewData.html}</body></html>`}
                      className="w-full h-[280px] bg-white"
                      sandbox="allow-same-origin"
                      title={`Preview: ${page.title}`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* All generated info */}
      {generatedCount === totalCount && generatedCount > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-800">All {totalCount} pages generated successfully!</p>
        </motion.div>
      )}
    </div>
  );
}
