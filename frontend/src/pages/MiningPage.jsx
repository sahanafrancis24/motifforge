import React, { useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Play, PieChart } from "lucide-react";
import PurposeStrip from "@/components/PurposeStrip";
import { MetricCard, PanelShell, EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";
import { useMotifStore } from "@/store/useStore";
import { TIDS } from "@/constants/tids";

export default function MiningPage() {
  const extraction = useMotifStore((s) => s.extraction);
  const mining = useMotifStore((s) => s.mining);
  const setMining = useMotifStore((s) => s.setMining);
  const window_ = useMotifStore((s) => s.coBindingWindow);

  const mutation = useMutation({
    mutationFn: api.mining,
    onSuccess: (data) => {
      setMining(data);
      toast.success(`Mined ${data.frequent_triplets.length} frequent triplet patterns`);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Mining failed"),
  });

  useEffect(() => {
    if (extraction && !mining) {
      mutation.mutate({ motif_hits: extraction.motif_hits, window: window_ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <PurposeStrip
        module="Module 04 · Architecture Mining"
        what="Discover recurring motif co-occurrence patterns, frequent triplets, and architectural signatures within the regulatory graph."
        why="Recurring patterns expose conserved regulatory grammar. Finding these motifs of motifs reveals reusable design principles."
        insight="Identifies the structural alphabet of the promoter — the small repeating substructures that drive transcriptional logic."
        algorithms={[
          "Pairwise spatial co-occurrence",
          "Frequent itemset mining (triplets)",
          "Triangle counting",
          "Architecture signature fingerprinting",
        ]}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 space-y-4">
        <div className="flex justify-end">
          <Button
            data-testid={TIDS.runMiningBtn}
            onClick={() =>
              extraction
                ? mutation.mutate({ motif_hits: extraction.motif_hits, window: window_ })
                : toast.error("Run Module 1 first")
            }
            disabled={mutation.isPending}
            className="bg-blue-600 hover:bg-blue-500 font-mono"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mining…
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Run Mining
              </>
            )}
          </Button>
        </div>

        {!mining ? (
          <EmptyState title="No mining results yet" body="Run extraction in Module 1 first." />
        ) : (
          <Results data={mining} />
        )}
      </div>
    </div>
  );
}

function Results({ data }) {
  const pairs = data.cooccurrence?.pairs || [];
  const triplets = data.frequent_triplets || [];
  const sig = data.signature || {};
  const communities = data.communities || [];

  const topPairs = pairs.slice(0, 20);
  const topTriplets = triplets.slice(0, 15);

  const tfs = useMemo(() => {
    const set = new Set();
    pairs.slice(0, 50).forEach((p) => {
      set.add(p.a);
      set.add(p.b);
    });
    return Array.from(set);
  }, [pairs]);

  const matrix = useMemo(() => {
    const m = {};
    pairs.forEach((p) => {
      m[`${p.a}__${p.b}`] = p.count;
      m[`${p.b}__${p.a}`] = p.count;
    });
    return m;
  }, [pairs]);

  const maxCount = Math.max(1, ...pairs.map((p) => p.count));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Pair co-occurrences" value={pairs.length} accent="text-blue-300" />
        <MetricCard label="Frequent triplets" value={triplets.length} accent="text-emerald-300" />
        <MetricCard label="Communities" value={communities.length} accent="text-amber-300" />
        <MetricCard label="Triangle count" value={sig.triangle_count ?? 0} accent="text-violet-300" hint="Triadic closure events" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PanelShell title="TOP 20 MOTIF CO-OCCURRENCES">
          <div style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topPairs.map((p) => ({ name: `${p.a} ⇄ ${p.b}`, count: p.count }))}
                layout="vertical"
                margin={{ left: 60 }}
              >
                <CartesianGrid stroke="#1E293B" strokeDasharray="2 4" />
                <XAxis type="number" stroke="#475569" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={10} width={150} />
                <RTooltip contentStyle={{ background: "#0A0F1D", border: "1px solid #1E293B", fontSize: 11 }} />
                <Bar dataKey="count" fill="#06B6D4" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelShell>

        <PanelShell title="CO-OCCURRENCE HEATMAP">
          {tfs.length === 0 ? (
            <div className="text-xs text-slate-500">Insufficient pairs for heatmap.</div>
          ) : (
            <div className="overflow-auto max-h-[360px]" data-testid={TIDS.cooccurrenceMatrix}>
              <table className="text-[9px] font-mono border-collapse">
                <thead>
                  <tr>
                    <th className="bg-[#04060F] sticky left-0"></th>
                    {tfs.map((t) => (
                      <th key={t} className="px-1 py-0.5 text-slate-500 font-normal" style={{ writingMode: "vertical-rl" }}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tfs.map((a) => (
                    <tr key={a}>
                      <th className="text-right pr-2 py-0.5 text-slate-500 font-normal bg-[#04060F] sticky left-0">
                        {a}
                      </th>
                      {tfs.map((b) => {
                        const val = a === b ? 0 : matrix[`${a}__${b}`] || 0;
                        const op = val / maxCount;
                        return (
                          <td
                            key={b}
                            className="w-5 h-5 border border-[#0A0F1D]"
                            title={`${a} × ${b} = ${val}`}
                            style={{
                              background: a === b ? "#1E293B" : `rgba(59, 130, 246, ${0.05 + op * 0.85})`,
                            }}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            Darker = higher co-occurrence within {data.cooccurrence.window}bp window.
          </div>
        </PanelShell>
      </div>

      <PanelShell title="FREQUENT TRIPLET PATTERNS" right={<PieChart className="w-3.5 h-3.5 text-slate-500" />}>
        {topTriplets.length === 0 ? (
          <div className="text-xs text-slate-500">No frequent triplets identified.</div>
        ) : (
          <div className="overflow-x-auto" data-testid={TIDS.tripletList}>
            <table className="w-full text-xs font-mono">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left py-2 pr-3">#</th>
                  <th className="text-left py-2 pr-3">Triplet</th>
                  <th className="text-right py-2 pr-3">Support</th>
                  <th className="text-left py-2">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {topTriplets.map((t, i) => (
                  <tr key={i} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 pr-3 text-slate-500">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <span className="text-blue-300">{t.motifs.join(" — ")}</span>
                    </td>
                    <td className="py-2 pr-3 text-right text-emerald-300">{t.support}</td>
                    <td className="py-2 text-slate-400">
                      {t.support > 3 ? "Strong recurring regulatory motif" : "Localized co-binding context"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelShell>

      <PanelShell title="ARCHITECTURE SIGNATURE">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <Stat label="Triangles" value={sig.triangle_count} />
          <Stat label="Transitivity" value={sig.transitivity} />
          <Stat label="Avg shortest path" value={sig.avg_shortest_path} />
          <Stat label="Diameter" value={sig.diameter} />
          <Stat label="Top degree seq." value={(sig.degree_sequence_top10 || []).join(",")} />
        </div>
      </PanelShell>

      <PanelShell title="INTERPRETATION">
        <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>
            Most frequent co-binding pair:{" "}
            {pairs[0] ? (
              <span className="text-blue-300">
                {pairs[0].a} ⇄ {pairs[0].b}
              </span>
            ) : (
              "n/a"
            )}{" "}
            with {pairs[0]?.count ?? 0} adjacent occurrences. This pair likely forms a recurring regulatory motif.
          </li>
          <li>
            <span className="text-blue-300">{triplets.length} frequent triplets</span> detected — these are candidate
            "design primitives" reusable in synthetic promoter engineering.
          </li>
          <li>
            Transitivity of <span className="text-blue-300">{sig.transitivity ?? 0}</span> reflects the closure of
            regulatory triangles — high values indicate combinatorial regulation hubs.
          </li>
        </ul>
      </PanelShell>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-slate-800 p-3 rounded-sm bg-[#04060F]/40">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-blue-300 font-mono mt-1 truncate" title={String(value)}>
        {value ?? "—"}
      </div>
    </div>
  );
}
