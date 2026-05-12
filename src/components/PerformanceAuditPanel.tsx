import React, { useState, useCallback, useMemo } from "react";
import {
  Play,
  Zap,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  runPerformanceAudit,
  autoFixAuditIssues,
  type AuditCheck,
  type PerformanceReport,
} from "@/lib/performanceAudit";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface PerformanceAuditPanelProps {
  html: string;
  css: string;
  onApplyFix: (html: string, css: string) => void;
}

// ─── Score Ring ──────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const RADIUS = (size - 16) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = Math.max(0, Math.min(1, score / 100)) * CIRC;
  const color =
    score >= 90 ? "#10b981" : score >= 70 ? "#3b82f6" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${CIRC}` }}
          animate={{ strokeDasharray: `${dash} ${CIRC}` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={score}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-extrabold text-slate-900"
        >
          {score}
        </motion.span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score</span>
      </div>
    </div>
  );
}

// ─── Category Card ───────────────────────────────────────────────────────────

function CategoryCard({
  label,
  score,
  icon,
  color,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-900">{score}</p>
      </div>
      <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: score >= 90 ? "#10b981" : score >= 70 ? "#3b82f6" : score >= 50 ? "#f59e0b" : "#ef4444" }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

// ─── Check Item ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: AuditCheck["status"] }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
}

function CheckItem({ check, expanded, onToggle }: { check: AuditCheck; expanded: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      "border rounded-xl overflow-hidden transition-colors",
      check.status === "pass" ? "border-emerald-100" : check.status === "warn" ? "border-amber-100" : "border-red-100",
    )}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
          check.status === "pass" ? "hover:bg-emerald-50/40" : check.status === "warn" ? "hover:bg-amber-50/40" : "hover:bg-red-50/40",
        )}
      >
        <StatusIcon status={check.status} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900">{check.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{check.description}</p>
        </div>
        {check.autoFixable && check.status !== "pass" && (
          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded uppercase">Auto-fix</span>
        )}
        <ChevronRight className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", expanded && "rotate-90")} />
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
              <p className="text-xs text-slate-600">{check.description}</p>
              {check.suggestion && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800">{check.suggestion}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score</span>
                <span className="text-xs font-bold text-slate-900">{check.score}/100</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type CategoryTab = "all" | "performance" | "accessibility" | "best-practices" | "seo";

const TAB_CONFIG: Array<{ id: CategoryTab; label: string; icon: React.ReactNode }> = [
  { id: "all", label: "All", icon: <Search className="w-3.5 h-3.5" /> },
  { id: "performance", label: "Performance", icon: <Zap className="w-3.5 h-3.5" /> },
  { id: "accessibility", label: "Accessibility", icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "best-practices", label: "Best Practices", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { id: "seo", label: "SEO", icon: <Search className="w-3.5 h-3.5" /> },
];

export function PerformanceAuditPanel({ html, css, onApplyFix }: PerformanceAuditPanelProps) {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixedCount, setFixedCount] = useState(0);

  const runAudit = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const result = runPerformanceAudit(html, css);
      setReport(result);
      setIsRunning(false);
    }, 600);
  }, [html, css]);

  const autoFixAll = useCallback(() => {
    if (!report) return;
    setIsFixing(true);
    setTimeout(() => {
      const fixable = report.checks.filter((c) => c.autoFixable && c.status !== "pass");
      const result = autoFixAuditIssues(html, css, fixable);
      setFixedCount(result.fixed.length);
      onApplyFix(result.html, result.css);
      // Re-run audit
      const newReport = runPerformanceAudit(result.html, result.css);
      setReport(newReport);
      setIsFixing(false);
    }, 800);
  }, [report, html, css, onApplyFix]);

  const filteredChecks = useMemo(() => {
    if (!report) return [];
    if (activeTab === "all") return report.checks;
    return report.checks.filter((c) => c.category === activeTab);
  }, [report, activeTab]);

  const fixableCount = report?.checks.filter((c) => c.autoFixable && c.status !== "pass").length ?? 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Audit</p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 shrink-0" />
            Performance Audit
          </h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={runAudit}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Play className={cn("w-3.5 h-3.5", isRunning && "animate-pulse")} />
          {isRunning ? "Running…" : "Run Audit"}
        </motion.button>
      </div>

      {/* Score overview */}
      {report && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="flex items-center gap-5">
            <ScoreRing score={report.overallScore} />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <CategoryCard label="Performance" score={report.summary.performance} icon={<Zap className="w-4 h-4 text-blue-600" />} color="bg-blue-50" />
              <CategoryCard label="Accessibility" score={report.summary.accessibility} icon={<Shield className="w-4 h-4 text-emerald-600" />} color="bg-emerald-50" />
              <CategoryCard label="Best Practices" score={report.summary.bestPractices} icon={<CheckCircle2 className="w-4 h-4 text-purple-600" />} color="bg-purple-50" />
              <CategoryCard label="SEO" score={report.summary.seo} icon={<Search className="w-4 h-4 text-amber-600" />} color="bg-amber-50" />
            </div>
          </div>

          {/* Auto-fix button */}
          {fixableCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={autoFixAll}
              disabled={isFixing}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Wrench className={cn("w-4 h-4", isFixing && "animate-spin")} />
              {isFixing ? "Applying fixes…" : `Auto-fix ${fixableCount} issue${fixableCount !== 1 ? "s" : ""}`}
            </motion.button>
          )}

          {fixedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-800">{fixedCount} issue{fixedCount !== 1 ? "s" : ""} fixed automatically</p>
            </motion.div>
          )}

          {/* Category tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700",
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Check list */}
          <div className="space-y-2">
            {filteredChecks.map((check) => (
              <CheckItem
                key={check.id}
                check={check}
                expanded={expandedId === check.id}
                onToggle={() => setExpandedId(expandedId === check.id ? null : check.id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!report && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Zap className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-900">Run an audit</p>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            Analyze your HTML/CSS for performance, accessibility, best practices, and SEO issues.
          </p>
        </div>
      )}
    </div>
  );
}
