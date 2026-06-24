import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Play, X, GitCompare, Plus } from "lucide-react";
import PurposeStrip from "@/components/PurposeStrip";
import { PanelShell, EmptyState, MetricCard } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RTooltip,
  Legend,
} from "recharts";
import { api } from "@/lib/api";
import { useMotifStore } from "@/store/useStore";
import { TIDS } from "@/constants/tids";

const PRESETS = [
  ["TP53", "BRCA1", "EGFR", "APOE"],
  ["TP53", "MYC"],
  ["BRCA1", "BRCA2", "ATM"],
];

const POLY_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#A855F7", "#06B6D4", "#EF4444"];

export default function ComparePage() {
  const [genes, setGenes] = useState(["TP53", "BRCA1", "EGFR", "APOE"]);
  const [draft, setDraft] = useState("");
  const { taxId, setSpecies, collection, setCollection, threshold, matrixLimit } = useMotifStore();
  const [result, setResult] = useState(null);

  const meta = useQuery({ queryKey: ["jaspar-meta"], queryFn: api.metadata, staleTime: 5 * 60 * 1000 });

  const mutation = useMutation({
    mutationFn: api.compare,
    onSuccess: (data) => {
      setResult(data);
      const ok = data.comparison.filter((c) => c.available).length;
      toast.success(`Comparison complete · ${ok}/${data.comparison.length} genes resolved`);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Comparison failed"),
  });

  const addGene = () => {
    const g = draft.trim().toUpperCase();
    if (!g) return;
    if (genes.includes(g)) return toast.error("Already in list");
    if (genes.length >= 6) return toast.error("Maximum 6 genes");
    setGenes([...genes, g]);
    setDraft("");
  };

  const removeGene = (g) => setGenes(genes.filter((x) => x !== g));

  const run = () => {
    if (genes.length < 2) return toast.error("Add at least 2 genes");
    mutation.mutate({
      gene_symbols: genes,
      tax_id: taxId,
      species: (meta.data?.species || []).find((s) => s.tax_id === taxId)?.ensembl || "homo_sapiens",
      collection,
      matrix_limit: matrixLimit,
      threshold,
      upstream: 1500,
      downstream: 500,
    });
  };

  return (
    <div className="min-h-screen">
      <PurposeStrip
        module="Module ★ · Multi-Gene Comparison"
        what="Run the full MotifForge pipeline on multiple genes in parallel and compare their regulatory architectures side-by-side."
        why="Comparing promoter architectures reveals conserved regulatory logic, lineage-specific TF preferences, and quantifies how one promoter differs from another."
        insight="Identifies which TFs are shared regulators across genes, and ranks promoters by complexity, density, and conservation."
        algorithms={["Parallel async extraction", "Cross-gene metric normalization", "Shared TF set analysis"]}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <PanelShell title="GENE PANEL · 2-6 genes">
            <div className="space-y-2" data-testid={TIDS.compareGenesInput}>
              {genes.map((g, i) => (
                <div
                  key={g}
                  className="flex items-center justify-between bg-slate-800/40 border border-slate-700 px-3 py-2 rounded-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: POLY_COLORS[i % POLY_COLORS.length] }}
                    />
                    <span className="text-sm font-mono text-slate-200">{g}</span>
                  </div>
                  <button
                    onClick={() => removeGene(g)}
                    className="text-slate-500 hover:text-rose-400"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && addGene()}
                placeholder="Add gene symbol"
                className="font-mono bg-[#04060F] border-slate-800 text-xs h-9"
              />
              <Button
                onClick={addGene}
                variant="outline"
                className="bg-slate-800/60 border-slate-700 hover:bg-slate-700 h-9 px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-3">
              <Label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Quick presets
              </Label>
              <div className="mt-1 space-y-1">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setGenes(p)}
                    className="block w-full text-left text-xs font-mono px-2 py-1.5 bg-slate-800/30 hover:bg-blue-500/10 border border-slate-800 hover:border-blue-500/40 rounded-sm text-slate-300"
                  >
                    {p.join(" · ")}
                  </button>
                ))}
              </div>
            </div>
          </PanelShell>

          <PanelShell title="ANALYSIS SETTINGS">
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Species
                </Label>
                <Select
                  value={String(taxId)}
                  onValueChange={(v) => {
                    const sp = (meta.data?.species || []).find((x) => String(x.tax_id) === v);
                    if (sp) setSpecies(sp.ensembl, sp.tax_id);
                  }}
                >
                  <SelectTrigger className="mt-1 bg-[#04060F] border-slate-800 font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0F1D] border-slate-800">
                    {(meta.data?.species || []).map((sp) => (
                      <SelectItem key={sp.tax_id} value={String(sp.tax_id)} className="font-mono text-xs">
                        {sp.common} · {sp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  JASPAR collection
                </Label>
                <Select value={collection} onValueChange={setCollection}>
                  <SelectTrigger className="mt-1 bg-[#04060F] border-slate-800 font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0F1D] border-slate-800">
                    {(meta.data?.collections || []).map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PanelShell>

          <Button
            data-testid={TIDS.runCompareBtn}
            onClick={run}
            disabled={mutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-500 font-mono h-11"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running parallel pipelines…
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Run Comparison
              </>
            )}
          </Button>
          <div className="text-[10px] font-mono text-slate-500 leading-relaxed px-1">
            Runs M1 extraction and M2 graph analysis for every gene in parallel. First run may take 30-90s if cache is cold.
          </div>
        </div>

        <div className="xl:col-span-9 space-y-4">
          {!result ? (
            <EmptyState
              title="Run a comparison"
              body="Pick 2-6 genes (use a preset or type your own), then run the comparison. Every gene is processed through M1 + M2 in parallel and visualized side-by-side."
            />
          ) : (
            <CompareResults result={result} />
          )}
        </div>
      </div>
    </div>
  );
}

function CompareResults({ result }) {
  const available = result.comparison.filter((c) => c.available);
  const unavailable = result.comparison.filter((c) => !c.available);

  // Normalize metrics for radar
  const radarMetrics = [
    { key: "complexity", label: "Complexity", max: 100 },
    { key: "topology", label: "Topology", max: 100 },
    { key: "architecture", label: "Architecture", max: 100 },
    { key: "density", label: "Density", max: null },
    { key: "modularity", label: "Modularity", max: 1 },
    { key: "gc_content", label: "GC", max: 1 },
  ];

  const radarData = useMemo(() => {
    // Compute scaling per metric so the highest gene maps to 100
    const maxima = {};
    radarMetrics.forEach((m) => {
      maxima[m.key] =
        m.max ?? Math.max(0.0001, ...available.map((c) => c.metrics[m.key] || 0));
    });
    return radarMetrics.map((m) => {
      const row = { metric: m.label };
      available.forEach((c) => {
        const val = c.metrics[m.key] || 0;
        row[c.gene_symbol] = Math.round((val / maxima[m.key]) * 100);
      });
      return row;
    });
  }, [available]);

  // TF presence heatmap
  const tfRows = useMemo(() => {
    const counts = {};
    available.forEach((c) => {
      c.tfs.forEach((tf) => {
        counts[tf] = (counts[tf] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([tf]) => tf);
  }, [available]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Genes compared" value={available.length} accent="text-blue-300" />
        <MetricCard
          label="Total motif hits"
          value={available.reduce((s, c) => s + (c.metrics.motif_count || 0), 0)}
          accent="text-emerald-300"
        />
        <MetricCard
          label="Unique TFs across panel"
          value={result.all_tfs.length}
          accent="text-amber-300"
        />
        <MetricCard
          label="Shared TFs (in ≥2 genes)"
          value={tfRows.filter((tf) =>
            available.filter((c) => c.tfs.includes(tf)).length >= 2
          ).length}
          accent="text-violet-300"
        />
      </div>

      {unavailable.length > 0 && (
        <PanelShell title="UNAVAILABLE GENES">
          <div className="text-xs text-rose-300 font-mono">
            {unavailable.map((u) => u.gene_symbol).join(", ")} — Data unavailable from live sources.
          </div>
        </PanelShell>
      )}

      <PanelShell title="ARCHITECTURE RADAR · normalized to panel maximum">
        <div style={{ height: 380 }} data-testid={TIDS.compareRadar}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1E293B" />
              <PolarAngleAxis dataKey="metric" stroke="#94A3B8" fontSize={11} />
              <PolarRadiusAxis stroke="#475569" fontSize={9} angle={90} domain={[0, 100]} />
              {available.map((c, i) => (
                <Radar
                  key={c.gene_symbol}
                  name={c.gene_symbol}
                  dataKey={c.gene_symbol}
                  stroke={POLY_COLORS[i % POLY_COLORS.length]}
                  fill={POLY_COLORS[i % POLY_COLORS.length]}
                  fillOpacity={0.18}
                  strokeWidth={1.5}
                />
              ))}
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
                iconType="circle"
              />
              <RTooltip
                contentStyle={{
                  background: "#0A0F1D",
                  border: "1px solid #1E293B",
                  fontSize: 11,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-[10px] font-mono text-slate-500 mt-1">
          Each axis is normalized (highest = 100). Compare polygon shapes to spot architecture differences.
        </div>
      </PanelShell>

      <PanelShell title="SIDE-BY-SIDE METRICS">
        <div className="overflow-x-auto" data-testid={TIDS.compareTable}>
          <table className="w-full text-xs font-mono">
            <thead className="text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left py-2 pr-3">Metric</th>
                {available.map((c, i) => (
                  <th key={c.gene_symbol} className="text-right py-2 pr-3">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ background: POLY_COLORS[i % POLY_COLORS.length] }}
                    />
                    {c.gene_symbol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Promoter length (bp)", "promoter.length"],
                ["GC content", "metrics.gc_content"],
                ["Motif occurrences", "metrics.motif_count"],
                ["Unique TFs", "metrics.unique_tfs"],
                ["Graph nodes", "metrics.node_count"],
                ["Graph edges", "metrics.edge_count"],
                ["Density", "metrics.density"],
                ["Avg degree", "metrics.avg_degree"],
                ["Communities", "metrics.community_count"],
                ["Modularity", "metrics.modularity"],
                ["Complexity score", "metrics.complexity"],
                ["Topology score", "metrics.topology"],
                ["Architecture score", "metrics.architecture"],
                ["Conservation (PhyloP)", "metrics.conservation_mean"],
              ].map(([label, path]) => (
                <tr key={path} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-1.5 pr-3 text-slate-400">{label}</td>
                  {available.map((c) => {
                    const v = path.split(".").reduce((o, k) => (o ? o[k] : undefined), c);
                    return (
                      <td key={c.gene_symbol} className="py-1.5 pr-3 text-right text-slate-200">
                        {v === null || v === undefined
                          ? "—"
                          : typeof v === "number"
                            ? v.toFixed(v % 1 === 0 ? 0 : 4)
                            : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelShell>

      <PanelShell title={`TF PRESENCE HEATMAP · top ${tfRows.length} TFs`}>
        {tfRows.length === 0 ? (
          <div className="text-xs text-slate-500">No TFs detected.</div>
        ) : (
          <div className="overflow-x-auto" data-testid={TIDS.compareHeatmap}>
            <table className="text-[10px] font-mono border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-[#0A0F1D] pr-3 text-left text-slate-500 font-normal">TF</th>
                  {available.map((c, i) => (
                    <th
                      key={c.gene_symbol}
                      className="px-2 py-1 text-slate-300 text-center"
                      style={{ borderBottom: `2px solid ${POLY_COLORS[i % POLY_COLORS.length]}` }}
                    >
                      {c.gene_symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tfRows.map((tf) => (
                  <tr key={tf}>
                    <th className="sticky left-0 bg-[#0A0F1D] text-right pr-3 py-0.5 text-blue-300 font-normal">
                      {tf}
                    </th>
                    {available.map((c) => {
                      const present = c.tfs.includes(tf);
                      const centrality = c.centrality_top?.[tf] || 0;
                      const intensity = Math.min(1, centrality * 3);
                      return (
                        <td
                          key={c.gene_symbol}
                          className="px-2 py-1 text-center"
                          title={`${tf} in ${c.gene_symbol}: centrality ${centrality}`}
                        >
                          {present ? (
                            <div
                              className="w-6 h-4 mx-auto rounded-sm"
                              style={{
                                background: `rgba(59, 130, 246, ${0.25 + intensity * 0.7})`,
                                border: "1px solid rgba(59, 130, 246, 0.4)",
                              }}
                            />
                          ) : (
                            <div className="w-6 h-4 mx-auto rounded-sm border border-slate-800 bg-slate-900/40" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-[10px] font-mono text-slate-500 mt-2">
          Filled cell = TF detected in that gene's promoter. Saturation ∝ centrality (importance in the regulatory graph).
        </div>
      </PanelShell>

      <PanelShell title="INTERPRETATION">
        <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>
            <GitCompare className="w-3 h-3 inline mr-1 text-blue-400" />
            Promoter with highest architecture score:{" "}
            {(() => {
              const top = [...available].sort(
                (a, b) => b.metrics.architecture - a.metrics.architecture
              )[0];
              return top ? (
                <span className="text-blue-300">
                  {top.gene_symbol} ({top.metrics.architecture})
                </span>
              ) : "—";
            })()}
          </li>
          <li>
            Promoter with highest GC content:{" "}
            {(() => {
              const top = [...available].sort(
                (a, b) => b.metrics.gc_content - a.metrics.gc_content
              )[0];
              return top ? (
                <span className="text-blue-300">
                  {top.gene_symbol} ({(top.metrics.gc_content * 100).toFixed(1)}%)
                </span>
              ) : "—";
            })()}
          </li>
          <li>
            Most TF-rich promoter:{" "}
            {(() => {
              const top = [...available].sort(
                (a, b) => b.metrics.unique_tfs - a.metrics.unique_tfs
              )[0];
              return top ? (
                <span className="text-blue-300">
                  {top.gene_symbol} ({top.metrics.unique_tfs} unique TFs)
                </span>
              ) : "—";
            })()}
          </li>
        </ul>
      </PanelShell>
    </div>
  );
}
