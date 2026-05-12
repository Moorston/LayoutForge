/**
 * Palette Editor
 * Extracts colors from HTML/CSS, displays as swatches, and allows
 * real-time color replacement with a native color picker.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Palette,
  RefreshCw,
  Pipette,
  Copy,
  Check,
  ChevronDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  extractColorsFromCSS,
  extractColorsFromHTML,
  replaceColorInCode,
  categorizeColor,
  hexToRgb,
  rgbToHex,
  type ExtractedColor,
} from "@/lib/colorExtractor";

// ─── Props ───────────────────────────────────────────────────────────────────

interface PaletteEditorProps {
  html: string;
  css: string;
  onHtmlChange: (html: string) => void;
  onCssChange: (css: string) => void;
}

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Primary: "bg-blue-500",
  Secondary: "bg-violet-500",
  Accent: "bg-amber-500",
  Neutral: "bg-slate-500",
  Semantic: "bg-emerald-500",
};

const CATEGORY_ORDER = ["Primary", "Secondary", "Accent", "Neutral", "Semantic"];

// ─── Color Swatch ────────────────────────────────────────────────────────────

function ColorSwatch({
  color,
  onSelect,
  isSelected,
}: {
  color: ExtractedColor;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const category = categorizeColor(color.hex);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(color.hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [color.hex],
  );

  // Determine if the color is light (for text contrast)
  const { r, g, b } = hexToRgb(color.hex);
  const isLight = r * 0.299 + g * 0.587 + b * 0.114 > 150;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col rounded-xl overflow-hidden border-2 transition-all shadow-sm",
        isSelected
          ? "border-slate-900 shadow-md ring-2 ring-slate-900/20"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md",
      )}
    >
      {/* Color preview */}
      <div
        className="relative h-20 flex items-center justify-center"
        style={{ backgroundColor: color.hex }}
      >
        {/* Category badge */}
        <span
          className={cn(
            "absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest",
            CATEGORY_COLORS[category] ?? "bg-slate-500",
            "text-white",
          )}
        >
          {category}
        </span>

        {/* Copy button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleCopy}
          className={cn(
            "absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center transition-all",
            "opacity-0 group-hover:opacity-100",
            isLight
              ? "bg-black/10 text-black/60 hover:bg-black/20"
              : "bg-white/20 text-white/80 hover:bg-white/30",
          )}
          title="Copy hex"
        >
          {copied ? (
            <Check className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </motion.button>

        {/* Eyedropper icon on hover */}
        <div
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isLight ? "text-black/30" : "text-white/30",
          )}
        >
          <Pipette className="w-8 h-8" />
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2 bg-white">
        <p className="text-[11px] font-bold text-slate-800 font-mono uppercase truncate">
          {color.hex}
        </p>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">
          {color.name} · {color.usage[0]}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Color Picker Modal ──────────────────────────────────────────────────────

function ColorPickerPopover({
  color,
  onColorChange,
  onClose,
}: {
  color: ExtractedColor;
  onColorChange: (newColor: string) => void;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState(color.hex);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      // Only apply if valid hex
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        onColorChange(val);
      }
    },
    [onColorChange],
  );

  const handleNativeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      onColorChange(val);
    },
    [onColorChange],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      className="absolute z-50 top-full left-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-2xl p-4 w-64"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg border border-slate-200 shadow-inner"
          style={{ backgroundColor: inputValue }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800">{color.name}</p>
          <p className="text-[10px] text-slate-400">{color.hex}</p>
        </div>
      </div>

      {/* Native color picker */}
      <div className="mb-3">
        <input
          type="color"
          value={inputValue}
          onChange={handleNativeChange}
          className="w-full h-32 rounded-lg cursor-pointer border-0"
        />
      </div>

      {/* Hex input */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Hex</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className="flex-1 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          placeholder="#000000"
        />
      </div>

      {/* Quick presets */}
      <div className="flex gap-1 mt-3">
        {["#0f172a", "#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#06b6d4", "#ffffff"].map(
          (preset) => (
            <button
              key={preset}
              onClick={() => {
                setInputValue(preset);
                onColorChange(preset);
              }}
              className="w-7 h-7 rounded-md border border-slate-200 hover:scale-110 transition-transform"
              style={{ backgroundColor: preset }}
              title={preset}
            />
          ),
        )}
      </div>

      <button
        onClick={onClose}
        className="mt-3 w-full py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        Close
      </button>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PaletteEditor({
  html,
  css,
  onHtmlChange,
  onCssChange,
}: PaletteEditorProps) {
  const [selectedColor, setSelectedColor] = useState<ExtractedColor | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract colors from both HTML and CSS
  const allColors = useMemo(() => {
    const htmlColors = extractColorsFromHTML(html);
    const cssColors = extractColorsFromCSS(css);

    // Merge by hex
    const merged = new Map<string, ExtractedColor>();
    for (const c of [...htmlColors, ...cssColors]) {
      const existing = merged.get(c.hex);
      if (existing) {
        existing.usage.push(...c.usage);
      } else {
        merged.set(c.hex, { ...c });
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.usage.length - a.usage.length);
  }, [html, css]);

  // Group by category
  const groupedColors = useMemo(() => {
    const groups: Record<string, ExtractedColor[]> = {};
    for (const color of allColors) {
      const cat = categorizeColor(color.hex);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(color);
    }
    return groups;
  }, [allColors]);

  // Filter by search
  const filteredColors = useMemo(() => {
    if (!searchQuery.trim()) return allColors;
    const q = searchQuery.toLowerCase();
    return allColors.filter(
      (c) =>
        c.hex.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.usage.some((u) => u.toLowerCase().includes(q)),
    );
  }, [allColors, searchQuery]);

  // Handle color change
  const handleColorChange = useCallback(
    (newColor: string) => {
      if (!selectedColor) return;
      const { html: newHtml, css: newCss } = replaceColorInCode(
        html,
        css,
        selectedColor.hex,
        newColor,
      );
      onHtmlChange(newHtml);
      onCssChange(newCss);
    },
    [selectedColor, html, css, onHtmlChange, onCssChange],
  );

  // Refresh palette
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSelectedColor(null);
    // Simulate brief refresh animation
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <Palette className="w-4 h-4 text-slate-400" />
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
          Palette Editor
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {allColors.length} colors
        </span>

        {/* Refresh button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
          />
          Extract from code
        </motion.button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search colors..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Color grid by category */}
      <div className="max-h-[50vh] overflow-auto">
        {searchQuery.trim() ? (
          // Flat filtered results
          <div className="p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <AnimatePresence>
                {filteredColors.map((color) => (
                  <div key={color.hex} className="relative">
                    <ColorSwatch
                      color={color}
                      onSelect={() =>
                        setSelectedColor(
                          selectedColor?.hex === color.hex ? null : color,
                        )
                      }
                      isSelected={selectedColor?.hex === color.hex}
                    />
                    {selectedColor?.hex === color.hex && (
                      <ColorPickerPopover
                        color={color}
                        onColorChange={handleColorChange}
                        onClose={() => setSelectedColor(null)}
                      />
                    )}
                  </div>
                ))}
              </AnimatePresence>
            </div>
            {filteredColors.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">
                No colors match your search.
              </p>
            )}
          </div>
        ) : (
          // Grouped by category
          <div className="divide-y divide-slate-100">
            {CATEGORY_ORDER.map((category) => {
              const colors = groupedColors[category];
              if (!colors || colors.length === 0) return null;
              const isExpanded = expandedCategory === null || expandedCategory === category;

              return (
                <div key={category}>
                  <button
                    onClick={() =>
                      setExpandedCategory(
                        expandedCategory === category ? null : category,
                      )
                    }
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        CATEGORY_COLORS[category] ?? "bg-slate-400",
                      )}
                    />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                      {category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {colors.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-slate-400 ml-auto transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {colors.map((color) => (
                            <div key={color.hex} className="relative">
                              <ColorSwatch
                                color={color}
                                onSelect={() =>
                                  setSelectedColor(
                                    selectedColor?.hex === color.hex
                                      ? null
                                      : color,
                                  )
                                }
                                isSelected={selectedColor?.hex === color.hex}
                              />
                              {selectedColor?.hex === color.hex && (
                                <ColorPickerPopover
                                  color={color}
                                  onColorChange={handleColorChange}
                                  onClose={() => setSelectedColor(null)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {allColors.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Palette className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">
                  No colors found. Click "Extract from code" to scan your HTML and CSS.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
          {allColors.length} unique colors extracted
        </span>
        {selectedColor && (
          <span className="text-[10px] text-indigo-600 font-bold">
            Editing: {selectedColor.hex} → pick a new color
          </span>
        )}
      </div>
    </div>
  );
}
