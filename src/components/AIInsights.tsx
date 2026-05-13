import React from "react";
import { Layers } from "lucide-react";

interface AIInsightsProps {
  explanation?: string;
}

export function AIInsights({ explanation }: AIInsightsProps) {
  if (!explanation) return null;

  return (
    <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-lg">
      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <Layers className="w-4 h-4" />
        AI Design Insights
      </h5>
      <p className="text-sm text-slate-600 leading-relaxed font-medium">
        {explanation}
      </p>
    </div>
  );
}
