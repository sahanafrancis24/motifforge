import React from "react";

/**
 * PurposeStrip - the mandatory header strip describing
 * What is happening, Why, and What biological insight is generated.
 */
export default function PurposeStrip({ module, what, why, insight, algorithms }) {
  return (
    <div className="border-b border-slate-800 bg-gradient-to-r from-[#0A0F1D] to-[#060913]">
      <div className="px-6 lg:px-10 py-5 max-w-[1600px] mx-auto">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400 mb-1">
              {module}
            </div>
            <div className="text-xs font-mono text-slate-500">PURPOSE BRIEF</div>
          </div>
          <div className="flex-1 min-w-[280px] grid md:grid-cols-3 gap-6">
            <Block label="What" body={what} accent="text-emerald-300" />
            <Block label="Why" body={why} accent="text-amber-300" />
            <Block label="Biological Insight" body={insight} accent="text-blue-300" />
          </div>
        </div>
        {algorithms?.length ? (
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Algorithms
            </span>
            {algorithms.map((a) => (
              <span
                key={a}
                className="text-[11px] font-mono text-slate-300 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded-sm"
              >
                {a}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Block({ label, body, accent }) {
  return (
    <div>
      <div className={`text-[10px] font-mono uppercase tracking-widest ${accent}`}>{label}</div>
      <div className="text-sm text-slate-300 mt-1 leading-relaxed">{body}</div>
    </div>
  );
}
