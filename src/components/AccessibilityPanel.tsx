import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Wand2,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { checkAccessibility, getScoreLabel } from "@/lib/accessibilityChecker";
import type { AccessibilityIssue } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AccessibilityPanelProps {
  html: string;
  onFixWithAI?: (issue: AccessibilityIssue) => void;
}

type ActiveTab = "issues" | "passed";

// ── Helpers ──────────────────────────────────────────────────────────────────

function SeverityIcon({
  severity,
}: {
  severity: AccessibilityIssue["severity"];
}) {
  if (severity === "error")
    return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (severity === "warning")
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
}

function severityBorder(severity: AccessibilityIssue["severity"]): string {
  if (severity === "error") return "border-l-red-500";
  if (severity === "warning") return "border-l-amber-400";
  return "border-l-blue-400";
}

function severityBg(severity: AccessibilityIssue["severity"]): string {
  if (severity === "error") return "hover:bg-red-50/40";
  if (severity === "warning") return "hover:bg-amber-50/40";
  return "hover:bg-blue-50/40";
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const RADIUS = 36;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = Math.max(0, Math.min(1, score / 100)) * CIRC;

  const strokeColor =
    score >= 90
      ? "#10b981"
      : score >= 70
        ? "#3b82f6"
        : score >= 50
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={RADIUS}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          style={{ transition: "stroke-dasharray 0.7s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-extrabold", color)}>{score}</span>
      </div>
    </div>
  );
}

// ── Issue card ────────────────────────────────────────────────────────────────

function IssueCard({
  issue,
  expanded,
  onToggle,
  onFixWithAI,
}: {
  key?: React.Key;
  issue: AccessibilityIssue;
  expanded: boolean;
  onToggle: () => void;
  onFixWithAI?: (i: AccessibilityIssue) => void;
}) {
  return (
    <div
      className={cn(
        "border border-l-4 border-slate-200 rounded-xl overflow-hidden",
        severityBorder(issue.severity),
      )}
    >
      {/* Accordion header */}
      <button
        className={cn(
          "w-full flex items-start gap-3 p-3 text-left transition-colors",
          severityBg(issue.severity),
        )}
        onClick={onToggle}
      >
        <SeverityIcon severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 font-mono leading-snug">
            {issue.rule}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {issue.description}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        )}
      </button>

      {/* Accordion body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
              {/* Full description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                {issue.description}
              </p>

              {/* Element snippet */}
              {issue.element && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    Element
                  </p>
                  <pre className="bg-slate-900 text-emerald-300 text-[10px] font-mono p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {issue.element}
                  </pre>
                </div>
              )}

              {/* Fix suggestion */}
              {issue.fix && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {issue.fix}
                  </p>
                </div>
              )}

              {/* Fix with AI */}
              {onFixWithAI && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onFixWithAI(issue)}
                  className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Fix with AI
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AccessibilityPanel({
  html,
  onFixWithAI,
}: AccessibilityPanelProps) {
  const [report, setReport] = useState(() => checkAccessibility(html));
  const [activeTab, setActiveTab] = useState<ActiveTab>("issues");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  useEffect(() => {
    setReport(checkAccessibility(html));
    setExpandedIdx(null);
  }, [html]);

  const rescan = () => {
    setIsScanning(true);
    setExpandedIdx(null);
    setTimeout(() => {
      setReport(checkAccessibility(html));
      setIsScanning(false);
    }, 700);
  };

  const { score, issues, passedRules } = report;
  const { label, color } = getScoreLabel(score);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Audit
          </p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 shrink-0" />
            Accessibility
          </h2>
        </div>

        <button
          onClick={rescan}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isScanning && "animate-spin")}
          />
          {isScanning ? "Scanning…" : "Re-scan"}
        </button>
      </div>

      {/* ── Score row ──────────────────────────────────────── */}
      <div className="flex items-center gap-5 py-1">
        <ScoreRing score={score} color={color} />

        <div className="flex flex-col gap-1.5">
          <p className={cn("text-lg font-extrabold leading-none", color)}>
            {label}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Accessibility Score
          </p>
          <div className="flex flex-wrap gap-2 mt-0.5">
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100">
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
              {warnCount} warn{warnCount !== 1 ? "s" : ""}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
              {passedRules.length} passed
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(["issues", "passed"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all duration-200",
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-700",
            )}
          >
            {tab === "issues"
              ? `Issues (${issues.length})`
              : `Passed (${passedRules.length})`}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "issues" ? (
          <motion.div
            key="issues"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            {issues.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </motion.div>
                <p className="text-sm font-bold text-slate-900">
                  No issues found!
                </p>
                <p className="text-xs text-slate-400">Your HTML looks great.</p>
              </div>
            ) : (
              issues.map((issue, idx) => (
                <IssueCard
                  key={`${issue.rule}-${idx}`}
                  issue={issue}
                  expanded={expandedIdx === idx}
                  onToggle={() =>
                    setExpandedIdx(expandedIdx === idx ? null : idx)
                  }
                  onFixWithAI={onFixWithAI}
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="passed"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1.5"
          >
            {passedRules.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                No rules passed yet — try running a scan.
              </p>
            ) : (
              passedRules.map((rule) => (
                <motion.div
                  key={rule}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-mono font-semibold text-emerald-800">
                    {rule}
                  </span>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
