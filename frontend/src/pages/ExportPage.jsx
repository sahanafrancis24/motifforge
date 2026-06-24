import React, { useState } from "react";
import { Download, FileText, FileCode2, FileJson, Network, Image as ImageIcon, FileCog, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PurposeStrip from "@/components/PurposeStrip";
import { PanelShell, EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { api, downloadBlob } from "@/lib/api";
import { useMotifStore } from "@/store/useStore";
import { TIDS } from "@/constants/tids";

export default function ExportPage() {
  const extraction = useMotifStore((s) => s.extraction);
  const graph = useMotifStore((s) => s.graph);
  const characterization = useMotifStore((s) => s.characterization);
  const engineering = useMotifStore((s) => s.engineering);
  const window_ = useMotifStore((s) => s.coBindingWindow);
  const [busy, setBusy] = useState(null);

  const symbol = extraction?.promoter?.gene_symbol || "MotifForge";

  const run = async (key, fn, filename) => {
    setBusy(key);
    try {
      const blob = await fn();
      downloadBlob(blob, filename);
      toast.success(`${filename} downloaded`);
    } catch (e) {
      toast.error("Export failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusy(null);
    }
  };

  const projectPayload = () => ({
    gene_symbol: symbol,
    generated_at: new Date().toISOString(),
    promoter: extraction?.promoter,
    stats: extraction?.sequence_stats,
    motifs: extraction?.motif_hits,
    conservation: extraction?.conservation,
    graph_stats: graph?.stats || characterization?.stats,
    scores: characterization?.scores || engineering?.scores,
    suggestions: engineering?.suggestions,
  });

  const cards = [
    {
      key: "fasta",
      icon: FileText,
      title: "FASTA",
      desc: "Promoter sequence in standard FASTA format with header annotated by gene symbol.",
      tid: TIDS.exportFasta,
      enabled: !!extraction,
      fn: () =>
        api.exportFasta({
          header: `${symbol}_promoter`,
          sequence: extraction.promoter.sequence,
        }),
      filename: `${symbol}_promoter.fasta`,
    },
    {
      key: "csv",
      icon: FileCode2,
      title: "CSV · Motif Table",
      desc: "All detected motif occurrences with position, strand, score, and consensus.",
      tid: TIDS.exportCsv,
      enabled: !!extraction,
      fn: () => api.exportCsv({ motif_hits: extraction.motif_hits }),
      filename: `${symbol}_motifs.csv`,
    },
    {
      key: "json",
      icon: FileJson,
      title: "JSON · Project",
      desc: "Full project state — sequence, motifs, graph stats, scores, and suggestions.",
      tid: TIDS.exportJson,
      enabled: !!extraction,
      fn: () => api.exportJson(projectPayload()),
      filename: `${symbol}_project.json`,
    },
    {
      key: "graphml",
      icon: Network,
      title: "GraphML",
      desc: "Regulatory graph in Cytoscape/Gephi-compatible GraphML format.",
      tid: TIDS.exportGraphml,
      enabled: !!extraction,
      fn: () =>
        api.exportGraphml({
          motif_hits: extraction.motif_hits,
          window: window_,
        }),
      filename: `${symbol}_graph.graphml`,
    },
    {
      key: "pdf",
      icon: FileCog,
      title: "PDF · Scientific Report",
      desc: "Publication-grade report with promoter info, motif table, topology, scores, and references.",
      tid: TIDS.exportPdf,
      enabled: !!extraction,
      fn: () => api.exportPdf(projectPayload()),
      filename: `${symbol}_motifforge_report.pdf`,
    },
  ];

  return (
    <div className="min-h-screen">
      <PurposeStrip
        module="Module 06 · Export Center"
        what="Package every artifact of the analysis pipeline as publication-ready files: sequences, motif tables, graphs, and PDF reports."
        why="Reproducibility, peer review, and downstream tooling require standardized exports that can be loaded into Cytoscape, R, Python, or word processors."
        insight="Provides traceable scientific artifacts whose every record originated from live JASPAR/Ensembl/UCSC retrievals."
        algorithms={["FASTA serialization", "GraphML XML", "ReportLab PDF generation", "CSV tabular export"]}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 space-y-6">
        {!extraction ? (
          <EmptyState
            title="No project to export"
            body="Run Module 1 (Extraction) to generate the data, then return to download publication-ready files."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((c) => (
              <ExportCard
                key={c.key}
                {...c}
                busy={busy === c.key}
                onClick={() => run(c.key, c.fn, c.filename)}
              />
            ))}
          </div>
        )}

        <PanelShell title="EXPORT PROVENANCE">
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <li>
              <span className="text-blue-300">Promoter sequence:</span> Ensembl REST · live region retrieval.
            </li>
            <li>
              <span className="text-blue-300">Motif matrices:</span> JASPAR 2024 CORE collection (taxonomy 9606).
            </li>
            <li>
              <span className="text-blue-300">Conservation:</span> UCSC PhyloP 100-way (hg38).
            </li>
            <li>
              <span className="text-blue-300">Graph algorithms:</span> NetworkX 3.x centralities, modularity, community detection.
            </li>
            <li>
              <span className="text-blue-300">Cache:</span> 24-hour TTL on all live retrievals, MongoDB-backed.
            </li>
          </ul>
        </PanelShell>
      </div>
    </div>
  );
}

function ExportCard({ icon: Icon, title, desc, busy, onClick, enabled, tid }) {
  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 border border-blue-500/30 bg-blue-500/5 rounded-sm flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-100">{title}</div>
          <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{desc}</div>
        </div>
      </div>
      <Button
        data-testid={tid}
        disabled={!enabled || busy}
        onClick={onClick}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono rounded-sm"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" /> Download
          </>
        )}
      </Button>
    </div>
  );
}
