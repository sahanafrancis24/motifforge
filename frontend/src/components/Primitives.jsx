import React from "react";

export function MetricCard({ label, value, unit, hint, accent = "text-blue-300", testId }) {
  return (
    <div data-testid={testId} className="panel p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${accent} font-mono`}>
        {value}
        {unit && <span className="text-xs text-slate-500 ml-1">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-slate-500 leading-tight">{hint}</div>}
    </div>
  );
}

export function SectionLabel({ children, hint }) {
  return (
    <div className="flex items-baseline gap-4 mb-3">
      <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-300">
        {children}
      </h3>
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </div>
  );
}

export function PanelShell({ title, right, children, className = "" }) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <span>{title}</span>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function EmptyState({ title, body }) {
  return (
    <div className="border border-dashed border-slate-800 rounded-sm py-10 px-6 text-center bg-[#04060F]/40">
      <div className="text-sm text-slate-300 font-mono">{title}</div>
      {body && <div className="text-xs text-slate-500 mt-2 max-w-md mx-auto">{body}</div>}
    </div>
  );
}
