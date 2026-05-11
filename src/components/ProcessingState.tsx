import { motion } from "motion/react";
import {
  Camera,
  ScanSearch,
  Sparkles,
  Paintbrush,
  Check,
  Loader2,
  XCircle,
  Globe,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Pipeline step definitions ────────────────────────────────────────────────

export type PipelineStep =
  | "capturing-screenshot"
  | "preparing-image"
  | "analyzing-layout"
  | "visual-analysis"
  | "generating-code"
  | "refining"
  | "done";

export interface PipelineStepDef {
  key: PipelineStep;
  icon: typeof Camera;
  label: string;
  description: string;
}

/** Steps for URL-to-Code pipeline */
export const URL_PIPELINE_STEPS: PipelineStepDef[] = [
  {
    key: "capturing-screenshot",
    icon: Camera,
    label: "Capturing Screenshot",
    description: "Taking a snapshot of the target website",
  },
  {
    key: "analyzing-layout",
    icon: ScanSearch,
    label: "Analyzing Layout",
    description: "Extracting page structure and content",
  },
  {
    key: "generating-code",
    icon: Sparkles,
    label: "Generating Code",
    description: "AI is recreating the layout with Tailwind CSS",
  },
  {
    key: "refining",
    icon: Paintbrush,
    label: "Refining Output",
    description: "Polishing for pixel-perfect quality",
  },
];

/** Steps for Screenshot-to-Code pipeline */
export const IMAGE_PIPELINE_STEPS: PipelineStepDef[] = [
  {
    key: "preparing-image",
    icon: Camera,
    label: "Preparing Image",
    description: "Optimizing image resolution and quality for AI analysis",
  },
  {
    key: "visual-analysis",
    icon: Eye,
    label: "Visual Analysis",
    description: "AI is examining every element, color, and spacing in detail",
  },
  {
    key: "generating-code",
    icon: Sparkles,
    label: "Generating Code",
    description: "Recreating the layout with pixel-perfect Tailwind CSS",
  },
  {
    key: "refining",
    icon: Paintbrush,
    label: "Refining Output",
    description: "Polishing for production-grade quality",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ProcessingStateProps {
  /** Current active step in the pipeline */
  currentStep: PipelineStep;
  /** Which pipeline steps to display */
  steps: PipelineStepDef[];
  /** Source URL being processed (shown in URL mode) */
  sourceUrl?: string;
  /** Whether the refinement step is enabled */
  enableRefinement?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
}

function getStepStatus(
  stepKey: PipelineStep,
  currentStep: PipelineStep,
): "pending" | "active" | "completed" {
  const stepOrder: PipelineStep[] = [
    "capturing-screenshot",
    "preparing-image",
    "analyzing-layout",
    "visual-analysis",
    "generating-code",
    "refining",
    "done",
  ];
  const currentIdx = stepOrder.indexOf(currentStep);
  const stepIdx = stepOrder.indexOf(stepKey);

  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

export function ProcessingState({
  currentStep,
  steps,
  sourceUrl,
  enableRefinement = true,
  onCancel,
}: ProcessingStateProps) {
  // Filter out refinement step if disabled
  const visibleSteps = enableRefinement
    ? steps
    : steps.filter((s) => s.key !== "refining");

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          {sourceUrl ? "Cloning Website" : "Replicating Layout"}
        </h2>
        {sourceUrl && (
          <div className="flex items-center gap-2 justify-center text-sm text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <span className="font-medium truncate max-w-[300px]">
              {sourceUrl}
            </span>
          </div>
        )}
      </motion.div>

      {/* Step list */}
      <div className="w-full max-w-md space-y-1">
        {visibleSteps.map((step, i) => {
          const status = getStepStatus(step.key, currentStep);
          const Icon = step.icon;
          const isLast = i === visibleSteps.length - 1;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="relative"
            >
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[19px] top-[44px] w-[2px] h-[calc(100%-20px)] transition-colors duration-500",
                    status === "completed" ? "bg-emerald-300" : "bg-slate-200",
                  )}
                />
              )}

              <div
                className={cn(
                  "relative flex items-start gap-4 p-3 rounded-xl transition-all duration-300",
                  status === "active" && "bg-slate-50",
                )}
              >
                {/* Step icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 border",
                    status === "completed"
                      ? "bg-emerald-500 border-emerald-500"
                      : status === "active"
                        ? "bg-slate-900 border-slate-900"
                        : "bg-white border-slate-200",
                  )}
                >
                  {status === "completed" ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : status === "active" ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5 text-slate-300" />
                  )}
                </div>

                {/* Step text */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p
                    className={cn(
                      "text-sm font-bold transition-colors duration-300",
                      status === "completed"
                        ? "text-emerald-700"
                        : status === "active"
                          ? "text-slate-900"
                          : "text-slate-400",
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      "text-xs transition-colors duration-300 mt-0.5",
                      status === "active" ? "text-slate-500" : "text-slate-300",
                    )}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="shrink-0 pt-1">
                  {status === "active" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2.5 h-2.5 rounded-full bg-slate-900"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-full h-full rounded-full bg-slate-900"
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md mt-10"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Progress
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {Math.round(getProgressPercent(currentStep, enableRefinement))}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-slate-900 rounded-full"
            initial={{ width: "0%" }}
            animate={{
              width: `${getProgressPercent(currentStep, enableRefinement)}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Cancel button */}
      {onCancel && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          onClick={onCancel}
          className="mt-10 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-bold hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
        >
          <XCircle className="w-4 h-4" />
          Cancel
        </motion.button>
      )}

      {/* Time estimate */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 text-[11px] text-slate-400 font-medium"
      >
        This usually takes 15–45 seconds
      </motion.p>
    </div>
  );
}

function getProgressPercent(
  step: PipelineStep,
  enableRefinement: boolean,
): number {
  const steps: PipelineStep[] = enableRefinement
    ? [
        "capturing-screenshot",
        "preparing-image",
        "analyzing-layout",
        "visual-analysis",
        "generating-code",
        "refining",
        "done",
      ]
    : [
        "capturing-screenshot",
        "preparing-image",
        "analyzing-layout",
        "visual-analysis",
        "generating-code",
        "done",
      ];
  const idx = steps.indexOf(step);
  if (idx === -1) return 0;
  return Math.round((idx / (steps.length - 1)) * 100);
}
