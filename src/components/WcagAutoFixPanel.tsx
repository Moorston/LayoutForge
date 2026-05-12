import React, { useState, useCallback } from "react";
import {
  Shield,
  Play,
  Wrench,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  runAccessibilityCheck,
  autoFixAccessibility,
  calculateAccessibilityScore,
} from "@/lib/wcagAutoFix";
import type { AccessibilityIssue } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface WcagAutoFixPanelProps {
  html: string;
  css: string;
  onApplyFix: (html: string, css: string) => void;
}

// ─── Severity Icon ───────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: AccessibilityIssue["severity"] }) {
  if (severity === "error") return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
}

function severityBorder(severity: AccessibilityIssue["severity"]): string {
  if (severity === "error") return "border-l-red-500";
  if (severity === "warning") return "border-l-amber-400";
  return "border-l-blue-400";
}

// ─── Score Ring ──────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const RADIUS = 32;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = Math.max(0, Math.min(1, score / 100)) * CIRC;
  const color = score >= 90 ? "#10b981" : score >= 70 ? "#3b82f6" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <motion.circle
          cx="40" cy="40" r={RADIUS}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${CIRC}` }}
          animate={{ strokeDasharray: `${dash} ${CIRC}` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={score}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-lg font-extrabold text-slate-900"
        >
          {score}
        </motion.span>
      </div>
    </div>
  );
}

// ─── Issue Card ──────────────────────────────────────────────────────────────

function IssueCard({
  issue,
  expanded,
  onToggle,
  onFix,
}: {
  issue: AccessibilityIssue;
  expanded: boolean;
  onToggle: () => void;
  onFix?: () => void;
}) {
  return (
    <div className={cn("border border-l-4 border-slate-200 rounded-xl overflow-hidden", severityBorder(issue.severity))}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <SeverityIcon severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 font-mono">{issue.rule}</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{issue.description}</p>
        </div>
        {onFix && (
          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded uppercase shrink-0">Fix</span>
        )}
        <ChevronRight className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 transition-transform", expanded && "rotate-90")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 border-t border-slate-100 space-y-2 pt-3">
              <p className="text-xs text-slate-600">{issue.description}</p>
              {issue.element && (
                <pre className="bg-slate-900 text-emerald-300 text-[10px] font-mono p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                  {issue.element}
                </pre>
              )}
              {issue.fix && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <Wand2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800">{issue.fix}</p>
                </div>
              )}
              {onFix && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); onFix(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Wrench className="w-3 h-3" />
                  Auto-fix this issue
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WcagAutoFixPanel({ html, css, onApplyFix }: WcagAutoFixPanelProps) {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [score, setScore] = useState(100);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixedList, setFixedList] = useState<string[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const runCheck = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const found = runAccessibilityCheck(html);
      setIssues(found);
      setScore(calculateAccessibilityScore(found));
      setHasRun(true);
      setFixedList([]);
      setExpandedIdx(null);
      setIsRunning(false);
    }, 500);
  }, [html]);

  const fixAll = useCallback(() => {
    setIsFixing(true);
    setTimeout(() => {
      const result = autoFixAccessibility(html, css, issues);
      setFixedList(result.fixedIssues);
      onApplyFix(result.html, result.css);
      // Re-check
      const newIssues = runAccessibilityCheck(result.html);
      setIssues(newIssues);
      setScore(calculateAccessibilityScore(newIssues));
      setIsFixing(false);
    }, 700);
  }, [html, css, issues, onApplyFix]);

  const fixSingle = useCallback(
    (issue: AccessibilityIssue) => {
      setIsFixing(true);
      setTimeout(() => {
        const result = autoFixAccessibility(html, css, [issue]);
        setFixedList(result.fixedIssues);
        onApplyFix(result.html, result.css);
        const newIssues = runAccessibilityCheck(result.html);
        setIssues(newIssues);
        setScore(calculateAccessibilityScore(newIssues));
        setIsFixing(false);
      }, 400);
    },
    [html, css, onApplyFix],
  );

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Accessibility</p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 shrink-0" />
            WCAG Auto-fix
          </h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={runCheck}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Play className={cn("w-3.5 h-3.5", isRunning && "animate-pulse")} />
          {isRunning ? "Scanning…" : "Run Check"}
        </motion.button>
      </div>

      {/* Score & stats */}
      {hasRun && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={score} />
            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">WCAG 2.1 AA Score</p>
              <div className="flex flex-wrap gap-2">
                {errorCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold border border-red-100 rounded-full">
                    {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100 rounded-full">
                    {warnCount} warning{warnCount !== 1 ? "s" : ""}
                  </span>
                )}
                {infoCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 rounded-full">
                    {infoCount} info
                  </span>
                )}
                {issues.length === 0 && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100 rounded-full">
                    No issues
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Auto-fix all button */}
          {issues.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={fixAll}
              disabled={isFixing}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Wrench className={cn("w-4 h-4", isFixing && "animate-spin")} />
              {isFixing ? "Applying fixes…" : `Auto-fix All (${issues.length} issue${issues.length !== 1 ? "s" : ""})`}
            </motion.button>
          )}

          {/* Fixed list */}
          {fixedList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-1.5"
            >
              {fixedList.map((fix, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <p className="text-[11px] font-semibold text-emerald-800">{fix}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Issues grouped by severity */}
          {issues.length > 0 && (
            <div className="space-y-2">
              {issues.map((issue, idx) => (
                <IssueCard
                  key={`${issue.rule}-${idx}`}
                  issue={issue}
                  expanded={expandedIdx === idx}
                  onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  onFix={() => fixSingle(issue)}
                />
              ))}
            </div>
          )}

          {/* All clear */}
          {hasRun && issues.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center"
              >
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </motion.div>
              <p className="text-sm font-bold text-slate-900">No WCAG issues found!</p>
              <p className="text-xs text-slate-400">Your markup passes all accessibility checks.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!hasRun && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Shield className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-900">Check WCAG compliance</p>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            Scan for WCAG 2.1 AA violations and automatically fix accessibility issues.
          </p>
        </div>
      )}
    </div>
  );
}
