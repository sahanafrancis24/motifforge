import React, { useMemo } from "react";

/**
 * Sequence viewer with nucleotide colorization and motif highlighting.
 */
export default function SequenceViewer({
  sequence,
  highlights = [],
  perLine = 60,
  showRuler = true,
  testId,
}) {
  const lines = useMemo(() => {
    const out = [];
    const seq = sequence || "";
    for (let i = 0; i < seq.length; i += perLine) {
      out.push({ start: i, chars: seq.slice(i, i + perLine) });
    }
    return out;
  }, [sequence, perLine]);

  // Index highlights per position
  const highlightMap = useMemo(() => {
    const map = new Map();
    highlights.forEach((h) => {
      for (let i = h.start; i < h.end; i++) {
        if (!map.has(i)) map.set(i, []);
        map.get(i).push(h);
      }
    });
    return map;
  }, [highlights]);

  if (!sequence) {
    return (
      <div className="font-mono text-xs text-slate-500 p-6 border border-dashed border-slate-700 rounded-sm">
        No sequence loaded.
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      className="font-mono text-[12px] leading-[1.45] bg-[#04060F] border border-slate-800 rounded-sm p-3 overflow-x-auto max-h-[420px]"
    >
      {lines.map((ln) => (
        <div key={ln.start} className="flex gap-3 whitespace-pre">
          {showRuler && (
            <span className="text-slate-600 select-none w-14 text-right">
              {String(ln.start + 1).padStart(5, " ")}
            </span>
          )}
          <span>
            {ln.chars.split("").map((c, i) => {
              const pos = ln.start + i;
              const hits = highlightMap.get(pos);
              const cls = `nt-${c.toUpperCase()}`;
              if (hits && hits.length) {
                const title = hits.map((h) => `${h.name} ${h.strand}`).join(", ");
                return (
                  <span
                    key={i}
                    title={title}
                    className={`${cls} bg-blue-500/25 border-b border-blue-400`}
                  >
                    {c}
                  </span>
                );
              }
              return (
                <span key={i} className={cls}>
                  {c}
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
