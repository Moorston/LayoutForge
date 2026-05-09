import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Variable,
  Wand2,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import {
  detectVariables,
  applyVariables,
  allFilled,
  keyToLabel,
  injectVariablePlaceholders,
} from "@/lib/templateVars";
import { TemplateVariable } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplateVarsPanelProps {
  html: string;
  onChange: (updatedHtml: string, vars: TemplateVariable[]) => void;
  onDetectWithAI: () => Promise<TemplateVariable[]>;
  isDetecting?: boolean;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Colour field (swatch + hex text) ────────────────────────────────────────

function ColorField({
  variable,
  onChange,
}: {
  variable: TemplateVariable;
  onChange: (v: string) => void;
}) {
  const colorRef = useRef<HTMLInputElement>(null);
  const safeVal = variable.value || "#ffffff";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Open colour picker"
        onClick={() => colorRef.current?.click()}
        className="w-8 h-8 rounded-lg border border-slate-200 shadow-sm flex-shrink-0 hover:scale-110 transition-transform"
        style={{ backgroundColor: safeVal }}
      />
      <input
        ref={colorRef}
        type="color"
        className="sr-only"
        value={safeVal}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className="flex-1 text-sm font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400"
        value={variable.value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        maxLength={7}
      />
    </div>
  );
}

// ─── Image field (URL + file upload + preview) ────────────────────────────────

function ImageField({
  variable,
  onChange,
}: {
  variable: TemplateVariable;
  onChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isDataUrl = variable.value.startsWith("data:");

  return (
    <div className="space-y-2">
      <input
        type="url"
        className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400"
        value={isDataUrl ? "" : variable.value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={variable.placeholder || "https://example.com/image.png"}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
      >
        Upload Image
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
      />
      {isDataUrl && (
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <img
            src={variable.value}
            alt="preview"
            className="max-h-24 w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

// ─── Collapsible variable card ────────────────────────────────────────────────

function VariableCard({
  variable,
  onChange,
}: {
  variable: TemplateVariable;
  onChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isFilled = variable.value.trim() !== "";
  // Use keyToLabel as a display fallback for safety
  const displayLabel = variable.label || keyToLabel(variable.key);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header (always visible) */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-slate-900 truncate">
            {displayLabel}
          </span>
          <span className="text-[11px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 flex-shrink-0">
            {`{{${variable.key}}}`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <AnimatePresence mode="wait">
            {isFilled ? (
              <motion.div
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-emerald-600" />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200"
              />
            )}
          </AnimatePresence>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Card body (collapsible) */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-100">
              {variable.type === "color" && (
                <ColorField variable={variable} onChange={onChange} />
              )}
              {variable.type === "image" && (
                <ImageField variable={variable} onChange={onChange} />
              )}
              {variable.type === "textarea" && (
                <textarea
                  rows={3}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400 resize-none"
                  value={variable.value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={variable.placeholder || ""}
                />
              )}
              {variable.type === "text" && (
                <input
                  type="text"
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400"
                  value={variable.value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={variable.placeholder || ""}
                />
              )}
              {variable.type === "url" && (
                <input
                  type="url"
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400"
                  value={variable.value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={variable.placeholder || "https://"}
                />
              )}
              {variable.type === "email" && (
                <input
                  type="email"
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400"
                  value={variable.value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={variable.placeholder || "hello@example.com"}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateVarsPanel({
  html,
  onChange,
  onDetectWithAI,
  isDetecting = false,
}: TemplateVarsPanelProps) {
  // The HTML we actually scan (may be injected version, distinct from raw prop)
  const [workingHtml, setWorkingHtml] = useState(html);
  const [vars, setVars] = useState<TemplateVariable[]>([]);

  // Re-scan whenever the html prop changes from outside
  useEffect(() => {
    setWorkingHtml(html);
    const detected = detectVariables(html);
    setVars((prev) => {
      const prevMap = new Map(prev.map((v) => [v.key, v.value]));
      // Preserve values that already existed
      return detected.map((d) => ({
        ...d,
        value: prevMap.get(d.key) ?? d.value,
      }));
    });
  }, [html]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const updateVar = (key: string, value: string) =>
    setVars((prev) => prev.map((v) => (v.key === key ? { ...v, value } : v)));

  const handleReset = () =>
    setVars((prev) => prev.map((v) => ({ ...v, value: "" })));

  const handleApply = () => {
    const result = applyVariables(workingHtml, vars);
    onChange(result, vars);
  };

  const handleInjectPlaceholders = () => {
    const injected = injectVariablePlaceholders(html);
    setWorkingHtml(injected);
    const detected = detectVariables(injected);
    setVars(detected);
  };

  const handleDetectWithAI = async () => {
    const aiVars = await onDetectWithAI();
    if (aiVars.length > 0) {
      setVars((prev) => {
        const prevMap = new Map(prev.map((v) => [v.key, v.value]));
        return aiVars.map((v) => ({
          ...v,
          value: prevMap.get(v.key) ?? v.value,
        }));
      });
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const totalCount = vars.length;
  const filledCount = vars.filter((v) => v.value.trim() !== "").length;
  const fillPercent =
    totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
  const everythingFilled = allFilled(vars); // used for colour theming
  const anyFilled = filledCount > 0;

  // Character count of the preview (vars applied, placeholders removed)
  const previewHtml = applyVariables(workingHtml, vars);
  const previewChars = previewHtml.replace(/\{\{[^}]+\}\}/g, "").length;

  // ── Empty state ───────────────────────────────────────────────────────────

  if (vars.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Variable className="w-6 h-6 text-slate-400" />
        </div>

        <h3 className="text-sm font-bold text-slate-900 mb-1">
          No Template Variables Found
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-xs mx-auto">
          Your HTML doesn't contain{" "}
          <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">
            {"{{variable}}"}
          </code>{" "}
          placeholders yet.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {/* AI detection */}
          <button
            type="button"
            onClick={handleDetectWithAI}
            disabled={isDetecting}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              isDetecting
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-700 shadow-sm",
            )}
          >
            {isDetecting ? (
              <>
                <Spinner className="w-3.5 h-3.5" />
                Detecting...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                Auto-detect with AI
              </>
            )}
          </button>

          {/* Heuristic injection */}
          <button
            type="button"
            onClick={handleInjectPlaceholders}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-400 transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Inject Placeholders
          </button>
        </div>
      </div>
    );
  }

  // ── Variable list ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ─ Progress header ─ */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Variable className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Template Variables
            </span>
          </div>
          <span
            className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full transition-colors",
              everythingFilled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {filledCount} / {totalCount} filled
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              everythingFilled ? "bg-emerald-500" : "bg-slate-900",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${fillPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {anyFilled && (
          <p className="text-[11px] text-slate-400 mt-2 text-right tabular-nums">
            ~{previewChars.toLocaleString()} chars with values applied
          </p>
        )}
      </div>

      {/* ─ Variable cards ─ */}
      <div className="space-y-3">
        {vars.map((variable) => (
          <React.Fragment key={variable.key}>
            <VariableCard
              variable={variable}
              onChange={(value) => updateVar(variable.key, value)}
            />
          </React.Fragment>
        ))}
      </div>

      {/* ─ Footer actions ─ */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {/* Detect more with AI */}
        <button
          type="button"
          onClick={handleDetectWithAI}
          disabled={isDetecting}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
            isDetecting
              ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-800",
          )}
        >
          {isDetecting ? (
            <Spinner className="w-3 h-3" />
          ) : (
            <Wand2 className="w-3 h-3" />
          )}
          Detect More with AI
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Reset All
        </button>

        <div className="flex-1" />

        {/* Apply */}
        <button
          type="button"
          onClick={handleApply}
          disabled={!anyFilled}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm",
            anyFilled
              ? "bg-slate-900 text-white hover:bg-slate-700"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
          )}
        >
          <Check className="w-3 h-3" />
          Apply All Variables
        </button>
      </div>
    </div>
  );
}
