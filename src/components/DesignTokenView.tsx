import React from "react";
import { Settings2 } from "lucide-react";
import type { DesignTokens } from "@/services/types";

interface DesignTokenViewProps {
  designTokens?: DesignTokens;
}

export function DesignTokenView({ designTokens }: DesignTokenViewProps) {
  if (!designTokens) return null;

  const hasColors = designTokens.colors && Object.keys(designTokens.colors).length > 0;
  const hasTypography = designTokens.typography && Object.keys(designTokens.typography).length > 0;
  const hasSpacing = designTokens.spacing;
  const hasEffects = designTokens.effects && Object.keys(designTokens.effects).length > 0;

  if (!hasColors && !hasTypography && !hasSpacing && !hasEffects) return null;

  return (
    <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-lg">
      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        Design Tokens
      </h5>
      <div className="space-y-6">
        {hasColors && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Colors</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(designTokens.colors!).map(([name, value]) => (
                <div key={name} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-5 h-5 rounded-md border border-slate-200 shadow-sm" style={{ backgroundColor: value }} />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{name}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-900">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {hasTypography && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Typography</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(designTokens.typography!).map(([name, value]) => (
                <div key={name} className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{name}</span>
                  <p className="text-[12px] text-slate-900 font-medium mt-0.5" style={name.toLowerCase().includes("font") ? { fontFamily: value as string } : undefined}>{value as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {hasSpacing && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Spacing</p>
            <div className="flex flex-wrap gap-3">
              {designTokens.spacing!.unit && (
                <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Unit</span>
                  <p className="text-[12px] text-slate-900 font-medium mt-0.5">{designTokens.spacing!.unit}</p>
                </div>
              )}
              {designTokens.spacing!.scale?.map((s, i) => (
                <div key={i} className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="h-2 rounded-full bg-indigo-400 mb-1" style={{ width: `${Math.min((i + 1) * 16, 80)}px` }} />
                  <span className="text-[10px] font-mono font-bold text-slate-900">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {hasEffects && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Effects</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(designTokens.effects!).map(([name, value]) => (
                <div key={name} className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{name}</span>
                  <p className="text-[10px] font-mono text-slate-900 mt-0.5">{value as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
