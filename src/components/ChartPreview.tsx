import React, { useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Sector } from "recharts";
import { Download, Plus, BarChart as ChartIcon } from "lucide-react";

interface ChartData {
  title: string;
  type: "bar" | "line" | "area" | "pie";
  data: Record<string, unknown>[];
  description?: string;
}

interface ChartPreviewProps {
  charts: ChartData[];
  onInsertChart: (chart: ChartData) => void;
  onDownloadCSV: (chart: ChartData) => void;
}

function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-200 rounded-xl shadow-2xl ring-1 ring-black/5">
        <p className="text-[10px] font-bold text-slate-800 mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                <span className="text-[10px] text-slate-500 font-medium">{p.name}:</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-900">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 15} startAngle={startAngle} endAngle={endAngle} fill={fill} fillOpacity={0.3} />
    </g>
  );
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function ChartPreview({ charts, onInsertChart, onDownloadCSV }: ChartPreviewProps) {
  const [pieActiveIndices, setPieActiveIndices] = useState<Record<number, number | null>>({});

  if (!charts || charts.length === 0) return null;

  const handlePieClick = (chartIndex: number, sliceIndex: number) => {
    setPieActiveIndices((prev) => ({ ...prev, [chartIndex]: prev[chartIndex] === sliceIndex ? null : sliceIndex }));
  };

  return (
    <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-lg">
      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <ChartIcon className="w-4 h-4" />
        Detected Charts ({charts.length})
      </h5>
      <div className="space-y-6">
        {charts.map((chart, i) => (
          <div key={i} className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col gap-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">{chart.title}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{chart.type} Chart</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onDownloadCSV(chart)} className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg bg-white shadow-sm transition-colors" aria-label={`Export ${chart.title} data as CSV`}>
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onInsertChart(chart)} className="px-3 py-1.5 bg-blue-600 text-[10px] font-bold text-white rounded-lg shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1.5">
                  <Plus className="w-3 h-3" />
                  Insert into HTML
                </button>
              </div>
            </div>
            <div className="h-48 bg-white rounded-xl border border-slate-200 p-4">
              <ResponsiveContainer width="100%" height="100%">
                {chart.type === "bar" ? (
                  <BarChart data={chart.data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={Object.keys(chart.data[0])[0]} hide />
                    <YAxis hide />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.05)" }} />
                    <Bar dataKey={Object.keys(chart.data[0]).find((k) => k !== Object.keys(chart.data[0])[0]) || ""} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : chart.type === "line" ? (
                  <LineChart data={chart.data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={Object.keys(chart.data[0])[0]} hide />
                    <YAxis hide />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey={Object.keys(chart.data[0]).find((k) => k !== Object.keys(chart.data[0])[0]) || ""} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                ) : chart.type === "area" ? (
                  <AreaChart data={chart.data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <defs>
                      <linearGradient id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={Object.keys(chart.data[0])[0]} hide />
                    <YAxis hide />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey={Object.keys(chart.data[0]).find((k) => k !== Object.keys(chart.data[0])[0]) || ""} stroke="#3b82f6" fill={`url(#gradient-${i})`} strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie {...({ activeIndex: pieActiveIndices[i] ?? -1, activeShape: renderActiveShape } as any)} data={chart.data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5}
                      dataKey={Object.keys(chart.data[0]).find((k) => typeof chart.data[0][k] === "number") || ""}
                      onClick={(_, index) => handlePieClick(i, index)} stroke="none"
                    >
                      {chart.data.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % 5]} className="outline-none" />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
            {chart.description && <p className="text-[10px] text-slate-500 leading-tight">{chart.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
