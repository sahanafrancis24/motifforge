import React, { useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, GitBranch, Play, Star } from "lucide-react";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { api } from "@/lib/api";
import { useMotifStore } from "@/store/useStore";
import { TIDS } from "@/constants/tids";

export default function CharacterizationPage() {
  const extraction = useMotifStore((s) => s.extraction);
  const characterization = useMotifStore((s) => s.characterization);
  const setCharacterization = useMotifStore((s) => s.setCharacterization);
  const window_ = useMotifStore((s) => s.coBindingWindow);

  const mutation = useMutation({
    mutationFn: api.characterize,
    onSuccess: (data) => {
      setCharacterization(data);
      toast.success(`Architecture score: ${data.scores.architecture}`);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Characterization failed"),
  });

  useEffect(() => {
    if (extraction && !characterization) {
      mutation.mutate({ motif_hits: extraction.motif_hits, window: window_ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <PurposeStrip
        module="Module 03 · Architecture Characterization"
        what="Compute graph-theoretic centrality and topology metrics to identify regulatory hubs and quantify architecture complexity."
        why="Hub TFs disproportionately influence transcription. Quantitative topology metrics predict regulatory robustness and noise tolerance."
        insight="Reveals which TFs are master regulators vs peripheral, and how modular/integrated the promoter architecture is."
        algorithms={[
          "Degree centrality",
          "Betweenness centrality",
          "Closeness centrality",
          "Eigenvector centrality",
          "Greedy modularity community detection",
          "Composite architecture scoring",
        ]}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 space-y-4">
        <div className="flex items-center justify-end gap-3">
          <Button
            data-testid={TIDS.runCharacterizeBtn}
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
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing…
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Run Characterization
              </>
            )}
          </Button>
        </div>

        {!characterization ? (
          <EmptyState title="No characterization yet" body="Run Module 1 first, then trigger characterization." />
        ) : (
          <Results data={characterization} />
        )}
      </div>
    </div>
  );
}

function Results({ data }) {
  const scores = data.scores || {};
  const stats = data.stats || {};
  const hubs = data.hub_motifs || [];
  const centrality = data.centrality || {};
  const sig = data.signature || {};

  const hubData = useMemo(
    () =>
      hubs.map((h) => ({
        name: h.name,
        degree: h.degree,
        betweenness: h.betweenness,
        eigenvector: h.eigenvector,
        hub_score: h.hub_score,
      })),
    [hubs]
  );

  const radarData = useMemo(
    () => [
      { metric: "Complexity", value: scores.complexity },
      { metric: "Topology", value: scores.topology },
      { metric: "Influence Spread", value: scores.influence_spread },
      { metric: "Modularity", value: Math.max(0, scores.modularity || 0) * 100 },
      { metric: "Clustering", value: (scores.clustering_coefficient || 0) * 100 },
    ],
    [scores]
  );

  const centralityKeys = ["degree", "betweenness", "closeness", "eigenvector"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Architecture Score"
          value={scores.architecture}
          unit="/100"
          accent="text-blue-300"
          hint={`Quality: ${scores.quality}`}
          testId="score-architecture"
        />
        <MetricCard label="Complexity" value={scores.complexity} unit="/100" accent="text-emerald-300" />
        <MetricCard label="Topology" value={scores.topology} unit="/100" accent="text-amber-300" />
        <MetricCard label="Modularity (Q)" value={scores.modularity} accent="text-violet-300" hint="Newman-Girvan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PanelShell title="ARCHITECTURE RADAR">
          <div style={{ height: 290 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1E293B" />
                <PolarAngleAxis dataKey="metric" stroke="#94A3B8" fontSize={11} />
                <PolarRadiusAxis stroke="#475569" fontSize={9} angle={90} domain={[0, 100]} />
                <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.35} />
                <RTooltip contentStyle={{ background: "#0A0F1D", border: "1px solid #1E293B", fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">
            Composite quality footprint across five topology dimensions.
          </div>
        </PanelShell>

        <PanelShell title="TOPOLOGY SIGNATURE">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Stat label="Triangles" value={sig.triangle_count} />
            <Stat label="Transitivity" value={sig.transitivity} />
            <Stat label="Avg shortest path" value={sig.avg_shortest_path} />
            <Stat label="Diameter" value={sig.diameter} />
            <Stat label="Components" value={stats.connected_components} />
            <Stat label="Largest comp." value={stats.largest_component_size} />
            <Stat label="Avg degree" value={stats.average_degree} />
            <Stat label="Density" value={stats.density} />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            Higher transitivity = more triadic closure = stronger combinatorial regulation.
          </div>
        </PanelShell>
      </div>

      <PanelShell title="HUB MOTIFS · TOP REGULATORY DRIVERS">
        <div data-testid={TIDS.hubMotifs}>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hubData} layout="vertical">
                <CartesianGrid stroke="#1E293B" strokeDasharray="2 4" />
                <XAxis type="number" stroke="#475569" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                <RTooltip contentStyle={{ background: "#0A0F1D", border: "1px solid #1E293B", fontSize: 11 }} />
                <Bar dataKey="hub_score" fill="#3B82F6" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 mt-2">
          Hub score = 0.4·degree + 0.3·betweenness + 0.3·eigenvector. Higher = more architecturally influential.
        </div>
      </PanelShell>

      <PanelShell title="CENTRALITY MATRIX">
        <div className="overflow-x-auto max-h-[400px]" data-testid={TIDS.centralityTable}>
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-[#0A0F1D] text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left py-2 pr-3">TF</th>
                {centralityKeys.map((k) => (
                  <th key={k} className="text-right py-2 pr-3">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(centrality.degree || {})
                .sort((a, b) => (centrality.degree[b] || 0) - (centrality.degree[a] || 0))
                .map((tf) => (
                  <tr key={tf} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-1.5 pr-3 text-blue-300">{tf}</td>
                    {centralityKeys.map((k) => (
                      <td key={k} className="py-1.5 pr-3 text-right text-slate-300">
                        {(centrality[k]?.[tf] ?? 0).toFixed(4)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </PanelShell>

      <PanelShell title="INTERPRETATION">
        <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>
            Architecture score <span className="text-blue-300">{scores.architecture}/100</span> ({scores.quality}) — combines edge density, clustering, and influence distribution.
          </li>
          {hubs[0] && (
            <li>
              Top hub <span className="text-blue-300">{hubs[0].name}</span> dominates the regulatory neighborhood
              (hub score {hubs[0].hub_score}). It is a candidate master regulator.
            </li>
          )}
          <li>
            Modularity Q = <span className="text-blue-300">{scores.modularity}</span> indicates{" "}
            {scores.modularity > 0.3 ? "well-defined regulatory submodules suitable for community-targeted engineering." : "weak modular separation — TFs operate as a tightly integrated unit."}
          </li>
        </ul>
      </PanelShell>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-slate-800 p-2 rounded-sm bg-[#04060F]/40">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-blue-300 font-mono">{value ?? "—"}</div>
    </div>
  );
}
