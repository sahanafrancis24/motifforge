import React, { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Play, FlaskConical, ArrowUpRight } from "lucide-react";
import PurposeStrip from "@/components/PurposeStrip";
import { MetricCard, PanelShell, EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { api } from "@/lib/api";
import { useMotifStore } from "@/store/useStore";
import { TIDS } from "@/constants/tids";

const PRIORITY_COLORS = {
  high: "border-rose-500/40 bg-rose-500/5 text-rose-200",
  moderate: "border-amber-500/40 bg-amber-500/5 text-amber-200",
  low: "border-slate-700 bg-slate-800/30 text-slate-300",
};

export default function EngineeringPage() {
  const extraction = useMotifStore((s) => s.extraction);
  const engineering = useMotifStore((s) => s.engineering);
  const setEngineering = useMotifStore((s) => s.setEngineering);
  const window_ = useMotifStore((s) => s.coBindingWindow);

  const mutation = useMutation({
    mutationFn: api.engineering,
    onSuccess: (data) => {
      setEngineering(data);
      toast.success(`Generated ${data.suggestions.length} engineering suggestions`);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Engineering analysis failed"),
  });

  useEffect(() => {
    if (extraction && !engineering) {
      mutation.mutate({
        motif_hits: extraction.motif_hits,
        gc_content: extraction.sequence_stats?.gc_content || 0.5,
        window: window_,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <PurposeStrip
        module="Module 05 · Promoter Engineering"
        what="Identify architectural deficiencies (GC imbalance, missing core elements, motif redundancy, spacing violations, connectivity gaps) and propose targeted improvements."
        why="Promoters can be engineered for higher activity, stronger inducibility, or designed synthetic regulation. Diagnostics guide rational design."
        insight="Translates topology metrics into actionable design recommendations and a predicted post-modification architecture score."
        algorithms={["GC balance scoring", "Spacing violation detection", "Connectivity gap analysis", "Redundancy detection", "Core element compliance"]}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 space-y-4">
        <div className="flex justify-end">
          <Button
            data-testid={TIDS.runEngineeringBtn}
            onClick={() =>
              extraction
                ? mutation.mutate({
                    motif_hits: extraction.motif_hits,
                    gc_content: extraction.sequence_stats?.gc_content || 0.5,
                    window: window_,
                  })
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
                <Play className="w-4 h-4 mr-2" /> Run Engineering Analysis
              </>
            )}
          </Button>
        </div>

        {!engineering ? (
          <EmptyState title="No engineering analysis yet" body="Run extraction in Module 1 first." />
        ) : (
          <Results data={engineering} />
        )}
      </div>
    </div>
  );
}

function Results({ data }) {
  const gc = data.gc_balance || {};
  const spacing = data.spacing || {};
  const connectivity = data.connectivity_gaps || {};
  const redundancy = data.redundancy || {};
  const missing = data.missing_core_elements || {};
  const suggestions = data.suggestions || [];

  const improvement = (data.predicted_score || 0) - (data.current_score || 0);
  const chartData = [
    { label: "Current", value: data.current_score },
    { label: "Predicted", value: data.predicted_score },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Current score"
          value={data.current_score}
          unit="/100"
          accent="text-slate-300"
        />
        <MetricCard
          label="Predicted score"
          value={data.predicted_score}
          unit="/100"
          accent="text-emerald-300"
          hint={improvement > 0 ? `+${improvement.toFixed(1)} after redesign` : "No improvement projected"}
        />
        <MetricCard
          label="Suggestions"
          value={suggestions.length}
          accent="text-blue-300"
        />
        <MetricCard
          label="Critical issues"
          value={suggestions.filter((s) => s.priority === "high").length}
          accent="text-rose-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PanelShell title="BEFORE vs AFTER · ARCHITECTURE SCORE">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="2 4" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} />
                <RTooltip contentStyle={{ background: "#0A0F1D", border: "1px solid #1E293B", fontSize: 11 }} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]} fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">
            Projected gain assumes high-priority suggestions are implemented.
          </div>
        </PanelShell>

        <PanelShell title="DIAGNOSTICS PANEL">
          <div className="space-y-3 text-xs">
            <Diagnostic
              ok={gc.in_range}
              label={`GC content ${(gc.value * 100).toFixed(1)}%`}
              note={gc.comment}
            />
            <Diagnostic
              ok={spacing.count === 0}
              label={`${spacing.count || 0} spacing violations`}
              note={`Minimum spacing ${spacing.min_spacing}bp`}
            />
            <Diagnostic
              ok={(connectivity.isolated_count || 0) === 0}
              label={`${connectivity.isolated_count || 0} isolated motifs`}
              note={`${connectivity.weak_count || 0} weakly connected`}
            />
            <Diagnostic
              ok={(redundancy.redundant_motifs || []).length === 0}
              label={`${(redundancy.redundant_motifs || []).length} redundant motifs`}
              note={`Threshold ≥ ${redundancy.threshold} occurrences`}
            />
            <Diagnostic
              ok={(missing.missing || []).length === 0}
              label={`${(missing.missing || []).length} missing core elements`}
              note={`Checked: ${(missing.checked || []).join(", ")}`}
            />
          </div>
        </PanelShell>
      </div>

      <PanelShell title={`SUGGESTIONS · ${suggestions.length} actions`}>
        {suggestions.length === 0 ? (
          <div className="text-xs text-slate-500">No recommendations — promoter is well-architected.</div>
        ) : (
          <div className="space-y-2" data-testid={TIDS.suggestions}>
            {suggestions.map((s, i) => (
              <div
                key={i}
                className={`border ${PRIORITY_COLORS[s.priority] || PRIORITY_COLORS.low} p-3 rounded-sm flex gap-3 items-start`}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest shrink-0 mt-0.5">
                  [{s.priority}]
                </div>
                <div className="flex-1">
                  <div className="text-xs font-mono uppercase tracking-wider mb-1">
                    {s.action.replace(/_/g, " ")}
                  </div>
                  <div className="text-sm text-slate-200">{s.description}</div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 shrink-0">{s.category}</div>
              </div>
            ))}
          </div>
        )}
      </PanelShell>

      <PanelShell title="DETAILED SPACING VIOLATIONS">
        {(spacing.violations || []).length === 0 ? (
          <div className="text-xs text-slate-500">No spacing violations detected.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left py-2">A</th>
                  <th className="text-left py-2">B</th>
                  <th className="text-right py-2">A pos</th>
                  <th className="text-right py-2">B pos</th>
                  <th className="text-right py-2">Gap (bp)</th>
                  <th className="text-left py-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {spacing.violations.map((v, i) => (
                  <tr key={i} className="border-t border-slate-800/50">
                    <td className="py-1.5 text-blue-300">{v.a}</td>
                    <td className="py-1.5 text-blue-300">{v.b}</td>
                    <td className="py-1.5 text-right">{v.a_position}</td>
                    <td className="py-1.5 text-right">{v.b_position}</td>
                    <td className="py-1.5 text-right text-amber-300">{v.gap}</td>
                    <td className="py-1.5">
                      <span
                        className={
                          v.severity === "high"
                            ? "text-rose-300"
                            : "text-amber-300"
                        }
                      >
                        {v.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelShell>

      <PanelShell title="INTERPRETATION">
        <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li>
            <FlaskConical className="w-3 h-3 inline mr-1 text-blue-400" />
            Applying high-priority suggestions could lift the architecture score from{" "}
            <span className="text-blue-300">{data.current_score}</span> to{" "}
            <span className="text-emerald-300">{data.predicted_score}</span>.
          </li>
          <li>
            {(missing.missing || []).length > 0
              ? `Add missing core elements (${missing.missing.join(", ")}) to restore canonical core promoter architecture.`
              : "All canonical core promoter elements are present."}
          </li>
          <li>
            {(connectivity.isolated_count || 0) > 0
              ? `Isolated motifs (${connectivity.isolated_nodes.join(", ")}) lack regulatory context — consider co-locating with cooperative TFs.`
              : "All TFs are integrated into the regulatory neighborhood."}
          </li>
        </ul>
      </PanelShell>
    </div>
  );
}

function Diagnostic({ ok, label, note }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
      />
      <div className="flex-1">
        <div className="text-slate-200 font-mono">{label}</div>
        <div className="text-[11px] text-slate-500">{note}</div>
      </div>
    </div>
  );
}
