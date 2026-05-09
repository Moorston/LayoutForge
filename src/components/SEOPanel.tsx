import React, { useState, useRef } from "react";
import {
  Search,
  Wand2,
  Check,
  Globe,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "motion/react";
import { generateSEOData } from "@/services/mimoService";
import type { SEOData } from "@/lib/types";
import { DEFAULT_SEO_DATA } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SEOPanelProps {
  html: string;
  brandKit?: { companyName?: string };
  onApply: (seoHtml: string) => void;
}

// ── Character-count helpers ───────────────────────────────────────────────────

function CharCount({
  value,
  min,
  max,
}: {
  value: string;
  min: number;
  max: number;
}) {
  const len = value.length;
  const color =
    len === 0
      ? "text-slate-300"
      : len < min
        ? "text-amber-500"
        : len <= max
          ? "text-emerald-500"
          : "text-red-500";
  return (
    <span className={cn("text-[11px] font-semibold tabular-nums", color)}>
      {len}/{max}
    </span>
  );
}

// ── Keyword pill ──────────────────────────────────────────────────────────────

function KeywordPill({
  keyword,
  onRemove,
}: {
  key?: React.Key;
  keyword: string;
  onRemove: () => void;
}) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
      {keyword}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-slate-400 hover:text-slate-700 transition-colors leading-none"
        aria-label={`Remove keyword ${keyword}`}
      >
        ×
      </button>
    </span>
  );
}

// ── Meta tag generator ────────────────────────────────────────────────────────

function buildMetaTags(seo: SEOData): string {
  const lines: string[] = [];
  if (seo.title) {
    const escapedTitle = seo.title.replace(
      /["&<>]/g,
      (c) =>
        ({
          '"': "&quot;",
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
        })[c] || c,
    );
    lines.push(`  <title>${escapedTitle}</title>`);
  }
  if (seo.description) {
    const escapedDesc = seo.description.replace(
      /["&<>]/g,
      (c) =>
        ({
          '"': "&quot;",
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
        })[c] || c,
    );
    lines.push(`  <meta name="description" content="${escapedDesc}" />`);
  }
  if (seo.keywords.length) {
    const escapedKeywords = seo.keywords
      .join(", ")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    lines.push(`  <meta name="keywords" content="${escapedKeywords}" />`);
  }
  if (seo.author)
    lines.push(`  <meta name="author" content="${seo.author}" />`);
  if (seo.robots)
    lines.push(`  <meta name="robots" content="${seo.robots}" />`);
  if (seo.canonicalUrl)
    lines.push(`  <link rel="canonical" href="${seo.canonicalUrl}" />`);

  // Open Graph
  lines.push(`  <meta property="og:type" content="website" />`);
  if (seo.ogTitle)
    lines.push(`  <meta property="og:title" content="${seo.ogTitle}" />`);
  if (seo.ogDescription)
    lines.push(
      `  <meta property="og:description" content="${seo.ogDescription}" />`,
    );
  if (seo.ogImage)
    lines.push(`  <meta property="og:image" content="${seo.ogImage}" />`);

  // Twitter
  lines.push(`  <meta name="twitter:card" content="${seo.twitterCard}" />`);
  if (seo.ogTitle)
    lines.push(`  <meta name="twitter:title" content="${seo.ogTitle}" />`);
  if (seo.ogDescription)
    lines.push(
      `  <meta name="twitter:description" content="${seo.ogDescription}" />`,
    );

  return lines.join("\n");
}

function injectMetaIntoHtml(html: string, metaTags: string): string {
  // Remove any previously injected meta tags to avoid duplicates
  const cleanedHtml = html.replace(/<meta[^>]*>/gi, "");

  // Replace or insert <head> section
  if (/<head[^>]*>/i.test(cleanedHtml)) {
    return cleanedHtml.replace(/(<head[^>]*>)/i, `$1\n${metaTags}`);
  }
  // Wrap bare HTML
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n${metaTags}\n</head>\n<body>\n${cleanedHtml}\n</body>\n</html>`;
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function FieldLabel({
  htmlFor,
  label,
  hint,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-bold uppercase tracking-widest text-slate-400"
      >
        {label}
      </label>
      {hint && (
        <span className="text-[10px] text-slate-400 font-medium">{hint}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SEOPanel({ html, brandKit, onApply }: SEOPanelProps) {
  const [seo, setSeo] = useState<SEOData>({ ...DEFAULT_SEO_DATA });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [keywordInput, setKeywordInput] = useState<string>("");

  const keywordInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof SEOData>(key: K, value: SEOData[K]) =>
    setSeo((prev) => ({ ...prev, [key]: value }));

  // ── AI generate ─────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateSEOData(html, brandKit?.companyName);
      setSeo((prev) => ({
        ...prev,
        title: result.title || prev.title,
        description: result.description || prev.description,
        keywords: result.keywords.length ? result.keywords : prev.keywords,
        ogTitle: result.ogTitle || result.title || prev.ogTitle,
        ogDescription:
          result.ogDescription || result.description || prev.ogDescription,
        twitterCard: result.twitterCard || prev.twitterCard,
        author: result.author || prev.author,
        robots: result.robots || prev.robots,
      }));
    } catch {
      // silently ignore; user can retry
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Keywords ─────────────────────────────────────────────────────────────────

  const addKeyword = (raw: string) => {
    const kws = raw
      .split(",")
      .map((k) => k.trim())
      .filter(
        (k) =>
          k.length > 0 &&
          !seo.keywords.some(
            (existing) => existing.toLowerCase() === k.toLowerCase(),
          ),
      );
    if (kws.length) update("keywords", [...seo.keywords, ...kws]);
    setKeywordInput("");
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(keywordInput);
    } else if (
      e.key === "Backspace" &&
      keywordInput === "" &&
      seo.keywords.length
    ) {
      update("keywords", seo.keywords.slice(0, -1));
    }
  };

  // ── Apply & copy ──────────────────────────────────────────────────────────────

  const metaTagsSnippet = buildMetaTags(seo);

  const handleApply = () => {
    const updated = injectMetaIntoHtml(html, metaTagsSnippet);
    onApply(updated);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(metaTagsSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      //
    }
  };

  const inputCls =
    "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Metadata
          </p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 shrink-0" />
            SEO Editor
          </h2>
        </div>

        {/* AI generate button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-0.5 shadow-md shadow-slate-900/10"
        >
          {isGenerating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          {isGenerating ? "Generating…" : "Generate with AI"}
        </motion.button>
      </div>

      {/* ── Form ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel
              htmlFor="seo-title"
              label="Title"
              hint="50–60 chars ideal"
            />
            <CharCount value={seo.title} min={50} max={60} />
          </div>
          <input
            id="seo-title"
            type="text"
            value={seo.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Page title for search engines"
            className={inputCls}
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel
              htmlFor="seo-desc"
              label="Description"
              hint="150–160 chars ideal"
            />
            <CharCount value={seo.description} min={150} max={160} />
          </div>
          <textarea
            id="seo-desc"
            value={seo.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="A concise summary of the page content…"
            rows={3}
            className={cn(inputCls, "resize-none")}
          />
        </div>

        {/* Keywords */}
        <div>
          <FieldLabel
            htmlFor="seo-keywords"
            label="Keywords"
            hint="Enter or comma to add"
          />
          <div
            className="flex flex-wrap gap-1.5 border border-slate-200 rounded-xl p-2.5 min-h-[44px] cursor-text bg-white"
            onClick={() => keywordInputRef.current?.focus()}
          >
            {seo.keywords.map((kw) => (
              <KeywordPill
                key={kw}
                keyword={kw}
                onRemove={() =>
                  update(
                    "keywords",
                    seo.keywords.filter((k) => k !== kw),
                  )
                }
              />
            ))}
            <input
              ref={keywordInputRef}
              id="seo-keywords"
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              onBlur={() => keywordInput && addKeyword(keywordInput)}
              placeholder={
                seo.keywords.length === 0
                  ? "seo, keywords, comma-separated…"
                  : ""
              }
              className="flex-1 min-w-[120px] text-sm text-slate-900 placeholder:text-slate-300 outline-none bg-transparent font-medium"
            />
          </div>
        </div>

        {/* OG Title */}
        <div>
          <FieldLabel
            htmlFor="seo-og-title"
            label="OG Title"
            hint="Open Graph"
          />
          <input
            id="seo-og-title"
            type="text"
            value={seo.ogTitle}
            onChange={(e) => update("ogTitle", e.target.value)}
            placeholder={seo.title || "Open Graph title…"}
            className={inputCls}
          />
        </div>

        {/* OG Description */}
        <div>
          <FieldLabel
            htmlFor="seo-og-desc"
            label="OG Description"
            hint="Open Graph"
          />
          <input
            id="seo-og-desc"
            type="text"
            value={seo.ogDescription}
            onChange={(e) => update("ogDescription", e.target.value)}
            placeholder={seo.description || "Open Graph description…"}
            className={inputCls}
          />
        </div>

        {/* Twitter Card */}
        <div>
          <FieldLabel htmlFor="seo-twitter" label="Twitter Card" />
          <div className="flex gap-2" id="seo-twitter">
            {(["summary", "summary_large_image"] as const).map((card) => (
              <button
                key={card}
                type="button"
                onClick={() => update("twitterCard", card)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all",
                  seo.twitterCard === card
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300",
                )}
              >
                {card === "summary" ? "Summary" : "Summary Large Image"}
              </button>
            ))}
          </div>
        </div>

        {/* Author + Canonical in 2-col */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="seo-author" label="Author" />
            <input
              id="seo-author"
              type="text"
              value={seo.author ?? ""}
              onChange={(e) => update("author", e.target.value)}
              placeholder="Jane Doe"
              className={inputCls}
            />
          </div>
          <div>
            <FieldLabel htmlFor="seo-canonical" label="Canonical URL" />
            <input
              id="seo-canonical"
              type="url"
              value={seo.canonicalUrl ?? ""}
              onChange={(e) => update("canonicalUrl", e.target.value)}
              placeholder="https://example.com/page"
              className={inputCls}
            />
          </div>
        </div>

        {/* Robots */}
        <div>
          <FieldLabel htmlFor="seo-robots" label="Robots" />
          <select
            id="seo-robots"
            value={seo.robots ?? "index, follow"}
            onChange={(e) => update("robots", e.target.value)}
            className={cn(inputCls, "cursor-pointer")}
          >
            <option value="index, follow">index, follow</option>
            <option value="noindex, nofollow">noindex, nofollow</option>
            <option value="noindex, follow">noindex, follow</option>
            <option value="index, nofollow">index, nofollow</option>
          </select>
        </div>
      </div>

      {/* ── Google Search Preview ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Search Preview
          </p>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors font-semibold"
          >
            {showPreview ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            {showPreview ? "Hide" : "Show"}
          </button>
        </div>

        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-slate-200 rounded-xl p-4 bg-white"
          >
            {/* URL bar (faux) */}
            <p className="text-xs text-emerald-700 font-medium truncate mb-0.5">
              {seo.canonicalUrl || "https://your-domain.com/page"}
            </p>
            {/* Title */}
            <p className="text-base font-semibold text-blue-700 hover:underline cursor-pointer truncate">
              {seo.title || "Your page title will appear here"}
            </p>
            {/* Description */}
            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
              {seo.description ||
                "Your meta description will appear here. Write 150–160 characters to fill this snippet."}
            </p>
          </motion.div>
        )}
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          <Check className="w-4 h-4" />
          Insert into HTML
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleCopy}
          className={cn(
            "flex items-center justify-center gap-2 px-4 rounded-xl py-3 text-sm font-bold border transition-all duration-200",
            copied
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900",
          )}
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied!" : "Copy Tags"}
        </motion.button>
      </div>
    </div>
  );
}
