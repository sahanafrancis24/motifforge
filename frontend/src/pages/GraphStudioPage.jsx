import React, { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Network, Play } from "lucide-react";
import PurposeStrip from "@/components/PurposeStrip";
import GraphCanvas from "@/components/GraphCanvas";
import { MetricCard, PanelShell, EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useMotifStore } from "@/store/useStore";
import { TIDS } from "@/constants/tids";

export default function GraphStudioPage() {
  const extraction = useMotifStore((s) => s.extraction);
  const graph = useMotifStore((s) => s.graph);
  const setGraph = useMotifStore((s) => s.setGraph);
  const window_ = useMotifStore((s) => s.coBindingWindow);
  const setWindow = useMotifStore((s) => s.setCoBindingWindow);

  const buildMutation = useMutation({
    mutationFn: api.buildGraph,
    onSuccess: (data) => {
      setGraph(data);
      toast.success(`Graph built · ${data.stats.node_count} nodes / ${data.stats.edge_count} edges`);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Graph build failed"),
  });

  useEffect(() => {
    if (extraction && !graph) {
      buildMutation.mutate({ motif_hits: extraction.motif_hits, window: window_ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rebuild = () => {
    if (!extraction) return toast.error("Run Module 1 extraction first");
    buildMutation.mutate({ motif_hits: extraction.motif_hits, window: window_ });
  };

  return (
    <div className="min-h-screen">
      <PurposeStrip
        module="Module 02 · Motif Grammar Graph Studio"
        what="Convert motif occurrences into an interactive regulatory graph where TFs are nodes and proximity-based co-binding events are edges."
        why="DNA regulatory logic is combinatorial. Two TFs binding within ~100 bp may cooperate, compete, or recruit the same complex."
        insight="Reveals the topological neighborhood of each TF and identifies architectural backbones of the promoter."
        algorithms={["Spatial co-occurrence", "Inverse-distance weighting", "FCoSE layout"]}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <PanelShell title="GRAPH PARAMETERS">
            <div>
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Co-binding window
                </Label>
                <span className="text-sm font-mono text-blue-300">{window_} bp</span>
              </div>
              <Slider
                data-testid={TIDS.windowSlider}
                min={30}
                max={300}
                step={10}
                value={[window_]}
                onValueChange={(v) => setWindow(v[0])}
                className="mt-2"
              />
              <div className="text-[10px] text-slate-500 mt-1">
                Edges link motifs whose binding sites are within this distance.
              </div>
            </div>
            <Button
              data-testid={TIDS.buildGraphBtn}
              onClick={rebuild}
              disabled={!extraction || buildMutation.isPending}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-500 font-mono"
            >
              {buildMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Rebuild Graph
                </>
              )}
            </Button>
            {!extraction && (
              <div className="mt-3 text-[11px] text-amber-300">
                Run Module 1 (Extraction) first to populate motif hits.
              </div>
            )}
          </PanelShell>

          {graph && (
            <PanelShell title="STATISTICS" right={<Network className="w-3.5 h-3.5 text-slate-500" />}>
              <div className="grid grid-cols-2 gap-3" data-testid={TIDS.graphStats}>
                <MetricCard label="Nodes" value={graph.stats.node_count} />
                <MetricCard label="Edges" value={graph.stats.edge_count} />
                <MetricCard label="Density" value={graph.stats.density.toFixed(4)} accent="text-emerald-300" />
                <MetricCard label="Avg degree" value={graph.stats.average_degree} accent="text-amber-300" />
                <MetricCard label="Components" value={graph.stats.connected_components} />
                <MetricCard label="Communities" value={graph.stats.community_count} accent="text-blue-300" />
              </div>
            </PanelShell>
          )}

          <PanelShell title="LEGEND">
            <div className="space-y-2 text-[11px] font-mono">
              <LegendItem color="#3B82F6" label="Generic TF" />
              <LegendItem color="#10B981" label="Zinc-coordinating" />
              <LegendItem color="#F59E0B" label="bHLH" />
              <LegendItem color="#A855F7" label="bZIP" />
              <div className="mt-2 pt-2 border-t border-slate-800 text-slate-500">
                Node size ∝ binding count<br />Edge width ∝ co-binding frequency
              </div>
            </div>
          </PanelShell>
        </div>

        <div className="xl:col-span-9 space-y-4">
          <PanelShell
            title={`REGULATORY GRAPH · ${graph?.stats.node_count || 0} TFs`}
            right={
              <span className="text-slate-400">
                Drag · Pan · Zoom · Click for details
              </span>
            }
          >
            {graph ? (
              <GraphCanvas testId={TIDS.graphCanvas} elements={graph.cytoscape} height={620} />
            ) : (
              <EmptyState
                title="No graph yet"
                body="Run Module 1 to extract motifs, then return here to build the regulatory graph."
              />
            )}
          </PanelShell>

          {graph?.stats.communities?.length > 0 && (
            <PanelShell title={`COMMUNITIES · ${graph.stats.community_count} modules`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {graph.stats.communities.map((c, i) => (
                  <div key={i} className="border border-slate-800 p-3 rounded-sm bg-[#04060F]/60">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length] }}
                      />
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        Module {i + 1} · {c.length} TFs
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 font-mono flex flex-wrap gap-1">
                      {c.map((n) => (
                        <span key={n} className="bg-slate-800/60 border border-slate-700 px-1.5 py-0.5 rounded-sm">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PanelShell>
          )}

          <PanelShell title="INTERPRETATION">
            {graph ? (
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>
                  Density of <span className="text-blue-300">{graph.stats.density.toFixed(4)}</span> indicates{" "}
                  {graph.stats.density > 0.2 ? "a tightly co-bound regulatory neighborhood." : "a sparse regulatory landscape with localized interactions."}
                </li>
                <li>
                  <span className="text-blue-300">{graph.stats.community_count}</span> communities suggest{" "}
                  modular regulatory submodules — proceed to Module 3 for centrality-driven characterization.
                </li>
                <li>
                  Continue to <Link to="/characterize" className="text-blue-400 underline">Architecture Characterization</Link> for hub identification and quality scoring.
                </li>
              </ul>
            ) : (
              <div className="text-xs text-slate-500">Build a graph to view interpretation.</div>
            )}
          </PanelShell>
        </div>
      </div>
    </div>
  );
}

const COMMUNITY_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#A855F7", "#06B6D4", "#EF4444", "#22D3EE", "#84CC16"];

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
