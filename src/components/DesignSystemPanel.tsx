import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Palette,
  Type,
  Ruler,
  Circle,
  Layers,
  Download,
  FileText,
  Check,
  Copy,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  extractDesignSystem,
  generateDesignSystemHTML,
  generateDesignSystemMarkdown,
} from "@/lib/designSystem";
import type { DesignSystemData } from "@/lib/designSystem";

// ─── Props ───────────────────────────────────────────────────────────────────

interface DesignSystemPanelProps {
  html: string;
  css: string;
}

type ActiveCategory = "colors" | "typography" | "spacing" | "effects" | "components";

const CATEGORIES: Array<{ id: ActiveCategory; label: string; icon: React.ElementType }> = [
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "spacing", label: "Spacing", icon: Ruler },
  { id: "effects", label: "Effects", icon: Circle },
  { id: "components", label: "Components", icon: Layers },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ColorSwatch({ name, hex, usage }: { name: string; hex: string; usage: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleCopy}
      className="flex flex-col rounded-xl border border-slate-200 overflow-hidden bg-white hover:shadow-md transition-shadow text-left"
    >
      <div className="h-16 w-full" style={{ backgroundColor: hex }} />
      <div className="p-2.5">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono font-semibold text-slate-700">
            {hex}
          </span>
          {copied && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[9px] text-emerald-600 font-bold"
            >
              Copied!
            </motion.span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 truncate block">
          {usage}
        </span>
      </div>
    </motion.button>
  );
}

function TypeSpecimen({
  name,
  family,
  size,
  weight,
  lineHeight,
}: {
  name: string;
  family: string;
  size: string;
  weight: string;
  lineHeight: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p
        className="text-slate-900 mb-2 leading-relaxed"
        style={{
          fontFamily: `'${family}', sans-serif`,
          fontSize: size,
          fontWeight: parseInt(weight) || 400,
          lineHeight: lineHeight,
        }}
      >
        The quick brown fox jumps over the lazy dog
      </p>
      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100">
        <span className="text-[10px] font-bold text-slate-700">{name}</span>
        <span className="text-[10px] text-slate-400">·</span>
        <span className="text-[10px] font-mono text-slate-500">{family}</span>
        <span className="text-[10px] text-slate-400">·</span>
        <span className="text-[10px] font-mono text-slate-500">{size}</span>
        <span className="text-[10px] text-slate-400">·</span>
        <span className="text-[10px] font-mono text-slate-500">{weight}</span>
      </div>
    </div>
  );
}

function SpacingBar({ name, value }: { name: string; value: string }) {
  const numVal = parseFloat(value) || 0;
  const maxPx = 96;
  const pct = Math.min(100, (numVal / maxPx) * 100);

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono text-slate-500 w-16 shrink-0 text-right">
        {value}
      </span>
      <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full bg-indigo-400 rounded-md"
        />
      </div>
      <span className="text-[10px] text-slate-400 w-20 truncate">
        {name}
      </span>
    </div>
  );
}

function ShadowCard({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-20 h-20 bg-white rounded-xl"
        style={{ boxShadow: value }}
      />
      <span className="text-[10px] font-bold text-slate-600">{name}</span>
      <span className="text-[9px] font-mono text-slate-400 text-center max-w-[140px] break-all leading-relaxed">
        {value.length > 60 ? value.slice(0, 60) + "…" : value}
      </span>
    </div>
  );
}

function ComponentCard({
  name,
  description,
  html: compHtml,
}: {
  name: string;
  description: string;
  html: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
      >
        <Box className="w-4 h-4 text-indigo-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900">{name}</p>
          <p className="text-[10px] text-slate-400 truncate">{description}</p>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <pre className="px-3 pb-3 bg-slate-900 text-emerald-300 text-[10px] font-mono p-3 rounded-b-lg overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-48">
              {compHtml}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DesignSystemPanel({ html, css }: DesignSystemPanelProps) {
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("colors");
  const [exported, setExported] = useState<string | null>(null);

  const system: DesignSystemData = useMemo(
    () => extractDesignSystem(html, css),
    [html, css],
  );

  const handleExportHTML = useCallback(() => {
    const content = generateDesignSystemHTML(system);
    downloadFile("design-system.html", content, "text/html");
    setExported("html");
    setTimeout(() => setExported(null), 2000);
  }, [system]);

  const handleExportMarkdown = useCallback(() => {
    const content = generateDesignSystemMarkdown(system);
    downloadFile("design-system.md", content, "text/markdown");
    setExported("md");
    setTimeout(() => setExported(null), 2000);
  }, [system]);

  const totalTokens =
    system.colors.length +
    system.typography.length +
    system.spacing.length +
    system.borderRadius.length +
    system.shadows.length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Documentation
          </p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Palette className="w-5 h-5 shrink-0" />
            Design System
          </h2>
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {totalTokens} tokens
        </span>
      </div>

      {/* ── Category tabs ──────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = getCategoryCount(system, cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all duration-200",
                activeCategory === cat.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {cat.label}
              </span>
              {count > 0 && (
                <span className="text-[8px] font-bold opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Category Content ────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeCategory === "colors" && (
            <div className="grid grid-cols-3 gap-2">
              {system.colors.length > 0 ? (
                system.colors.map((c) => (
                  <ColorSwatch
                    key={c.hex}
                    name={c.name}
                    hex={c.hex}
                    usage={c.usage}
                  />
                ))
              ) : (
                <EmptyState message="No colors detected in the current code." />
              )}
            </div>
          )}

          {activeCategory === "typography" && (
            <div className="flex flex-col gap-2">
              {system.typography.length > 0 ? (
                system.typography.map((t, i) => (
                  <TypeSpecimen key={`${t.family}-${t.size}-${i}`} {...t} />
                ))
              ) : (
                <EmptyState message="No typography tokens found." />
              )}
            </div>
          )}

          {activeCategory === "spacing" && (
            <div className="flex flex-col gap-2">
              {system.spacing.length > 0 ? (
                system.spacing.map((s) => (
                  <SpacingBar key={s.name} name={s.name} value={s.value} />
                ))
              ) : (
                <EmptyState message="No spacing tokens detected." />
              )}

              {system.borderRadius.length > 0 && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-4 mb-1">
                    Border Radius
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {system.borderRadius.map((r) => (
                      <div
                        key={r.name}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div
                          className="w-12 h-12 bg-indigo-100 border-2 border-indigo-300"
                          style={{ borderRadius: r.value }}
                        />
                        <span className="text-[9px] font-mono text-slate-500">
                          {r.name}: {r.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeCategory === "effects" && (
            <div className="flex flex-wrap gap-4">
              {system.shadows.length > 0 ? (
                system.shadows.map((s) => (
                  <ShadowCard key={s.name} name={s.name} value={s.value} />
                ))
              ) : (
                <EmptyState message="No shadow/effect tokens found." />
              )}
            </div>
          )}

          {activeCategory === "components" && (
            <div className="flex flex-col gap-2">
              {system.components.length > 0 ? (
                system.components.map((c, i) => (
                  <ComponentCard key={`${c.name}-${i}`} {...c} />
                ))
              ) : (
                <EmptyState message="No components detected." />
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Export Buttons ──────────────────────────────────── */}
      <div className="flex gap-2 mt-2 pt-4 border-t border-slate-100">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExportHTML}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          {exported === "html" ? (
            <Check className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exported === "html" ? "Exported!" : "Export HTML"}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExportMarkdown}
          className={cn(
            "flex items-center justify-center gap-2 px-5 rounded-xl py-2.5 text-sm font-bold border transition-all duration-200",
            exported === "md"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
          )}
        >
          {exported === "md" ? (
            <Check className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {exported === "md" ? "Exported!" : "Export MD"}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-xs text-slate-400">{message}</p>
    </div>
  );
}

function getCategoryCount(system: DesignSystemData, cat: ActiveCategory): number {
  switch (cat) {
    case "colors":
      return system.colors.length;
    case "typography":
      return system.typography.length;
    case "spacing":
      return system.spacing.length + system.borderRadius.length;
    case "effects":
      return system.shadows.length;
    case "components":
      return system.components.length;
  }
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
