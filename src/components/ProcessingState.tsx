import { motion } from "motion/react";
import { Loader2, Zap, Layout, FileText, Code, XCircle } from "lucide-react";

const steps = [
  { icon: Layout, label: "Analyzing layout structure…" },
  { icon: FileText, label: "Extracting text and content…" },
  { icon: Zap, label: "Generating Tailwind code…" },
  { icon: Code, label: "Polishing replicated template…" },
];

interface ProcessingStateProps {
  onCancel?: () => void;
}

export function ProcessingState({ onCancel }: ProcessingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      {/* Spinner */}
      <div className="relative mb-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="w-40 h-40 rounded-full border-4 border-slate-200 border-t-slate-900 shadow-xl"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-slate-900 animate-spin" />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-8 w-full max-w-md">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 1.5 }}
            className="flex items-center gap-6 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center group-last:bg-slate-900 group-last:border-slate-900 transition-colors duration-500">
              <step.icon className="w-5 h-5 text-slate-500 group-last:text-white" />
            </div>
            <div className="flex-1 flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-last:text-slate-900">
                Step {i + 1}
              </span>
              <span className="text-sm font-bold text-slate-600 group-last:text-slate-900">
                {step.label}
              </span>
            </div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 1.5 + 1.2 }}
              className="w-2 h-2 rounded-full bg-slate-300 group-last:bg-emerald-500 transition-colors duration-500"
            />
          </motion.div>
        ))}
      </div>

      {/* Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 6 }}
        className="mt-16 flex flex-col items-center gap-4"
      >
        <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Processing…
        </div>
        <p className="text-slate-400 text-xs font-medium italic">
          This usually takes about 10–30 seconds
        </p>

        {/* Cancel button */}
        {onCancel && (
          <motion.button
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 8 }}
            onClick={onCancel}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-bold hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
          >
            <XCircle className="w-4 h-4" />
            Cancel Request
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
