import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Play, FileCode2, AlertTriangle } from "lucide-react";
import PurposeStrip from "@/components/PurposeStrip";
import SequenceViewer from "@/components/SequenceViewer";
import { MetricCard, PanelShell, SectionLabel, EmptyState } from "@/components/Primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";
import { useMotifStore } from "@/store/useStore";
import { TIDS } from "@/constants/tids";

const EXAMPLES = [
  { sym: "TP53", desc: "Tumor suppressor", tid: TIDS.exampleTp53 },
  { sym: "BRCA1", desc: "DNA repair", tid: TIDS.exampleBrca1 },
  { sym: "EGFR", desc: "Growth factor receptor", tid: TIDS.exampleEgfr },
  { sym: "MYC", desc: "Proto-oncogene", tid: TIDS.exampleMyc },
  { sym: "APOE", desc: "Apolipoprotein E", tid: TIDS.exampleApoe },
];

export default function ExtractionPage() {
  const [params] = useSearchParams();
  const [gene, setGene] = useState("");
  const [fasta, setFasta] = useState("");
  const [mode, setMode] = useState("gene");
  const { upstream, setUpstream, downstream, setDownstream, matrixLimit, setMatrixLimit, threshold, setThreshold } =
    useMotifStore();
  const extraction = useMotifStore((s) => s.extraction);
  const setExtraction = useMotifStore((s) => s.setExtraction);

  const mutation = useMutation({
    mutationFn: api.extract,
    onSuccess: (data) => {
      setExtraction(data);
      toast.success(`Extracted ${data.motif_count} motif occurrences from ${data.unique_tfs} TFs`);
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || err.message || "Extraction failed";
      toast.error(msg);
    },
  });

  useEffect(() => {
    const example = params.get("example");
    if (example) {
      setGene(example);
      setMode("gene");
    }
  }, [params]);

  const submit = () => {
    if (mode === "gene") {
      if (!gene.trim()) return toast.error("Enter a gene symbol");
      mutation.mutate({
        gene_symbol: gene.trim().toUpperCase(),
        upstream,
        downstream,
        matrix_limit: matrixLimit,
        threshold,
      });
    } else {
      if (!fasta.trim()) return toast.error("Paste a FASTA sequence");
      mutation.mutate({ fasta, matrix_limit: matrixLimit, threshold });
    }
  };

  return (
    <div className="min-h-screen">
      <PurposeStrip
        module="Module 01 · Live Promoter Extraction"
        what="Fetch the promoter region (upstream regulatory window) of a gene and scan it for transcription factor binding sites."
        why="Promoters host the regulatory grammar that drives transcription. Their architecture is the entry point of every downstream analysis."
        insight="Identifies which TFs are biophysically capable of binding upstream of the gene, with quantitative position weight scores."
        algorithms={[
          "Ensembl REST coordinate lookup",
          "JASPAR PWM library",
          "BioPython PSSM scanning",
          "UCSC PhyloP conservation",
        ]}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Input Panel */}
        <div className="xl:col-span-4 space-y-4">
          <PanelShell title="INPUT · Gene or FASTA">
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="bg-slate-900/60 border border-slate-800 grid grid-cols-2 w-full">
                <TabsTrigger value="gene" className="font-mono text-xs">
                  Gene Symbol
                </TabsTrigger>
                <TabsTrigger value="fasta" className="font-mono text-xs">
                  FASTA Sequence
                </TabsTrigger>
              </TabsList>
              <TabsContent value="gene" className="mt-4 space-y-3">
                <Label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Gene symbol (HGNC)
                </Label>
                <Input
                  data-testid={TIDS.geneInput}
                  value={gene}
                  onChange={(e) => setGene(e.target.value)}
                  placeholder="TP53"
                  className="font-mono bg-[#04060F] border-slate-800 text-slate-100"
                />
                <div className="grid grid-cols-2 gap-2">
                  {EXAMPLES.map((e) => (
                    <button
                      key={e.sym}
                      data-testid={e.tid}
                      onClick={() => setGene(e.sym)}
                      className="text-left p-2 border border-slate-800 hover:border-blue-600/50 hover:bg-blue-500/5 rounded-sm transition-colors"
                    >
                      <div className="font-mono text-sm text-blue-300">{e.sym}</div>
                      <div className="text-[10px] text-slate-500">{e.desc}</div>
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="fasta" className="mt-4 space-y-3">
                <Label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  FASTA sequence
                </Label>
                <Textarea
                  data-testid={TIDS.fastaInput}
                  value={fasta}
                  onChange={(e) => setFasta(e.target.value)}
                  rows={10}
                  placeholder=">my_promoter
ACGTACGT..."
                  className="font-mono text-xs bg-[#04060F] border-slate-800 text-slate-100"
                />
              </TabsContent>
            </Tabs>
          </PanelShell>

          <PanelShell title="PARAMETERS">
            <div className="space-y-4">
              <SliderControl
                label="Upstream window (bp)"
                value={upstream}
                onChange={setUpstream}
                min={250}
                max={3000}
                step={50}
                testId={TIDS.upstreamInput}
              />
              <SliderControl
                label="Downstream window (bp)"
                value={downstream}
                onChange={setDownstream}
                min={0}
                max={1500}
                step={50}
                testId={TIDS.downstreamInput}
              />
              <SliderControl
                label="JASPAR matrices"
                value={matrixLimit}
                onChange={setMatrixLimit}
                min={10}
                max={60}
                step={5}
                testId={TIDS.matrixLimitInput}
                hint="Top N CORE human PWMs to scan"
              />
              <SliderControl
                label="Score threshold"
                value={threshold}
                onChange={setThreshold}
                min={0.7}
                max={0.99}
                step={0.01}
                testId={TIDS.thresholdInput}
                hint="Fraction of motif max log-odds score"
                format={(v) => v.toFixed(2)}
              />
            </div>
          </PanelShell>

          <Button
            data-testid={TIDS.runExtractBtn}
            disabled={mutation.isPending}
            onClick={submit}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono rounded-sm h-11"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting from live APIs…
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Run Extraction Pipeline
              </>
            )}
          </Button>

          <div className="text-[10px] font-mono text-slate-500 leading-relaxed px-2">
            First run fetches the full JASPAR CORE library (cached 24h). Subsequent
            extractions are significantly faster.
          </div>
        </div>

        {/* Result Panel */}
        <div className="xl:col-span-8 space-y-4" data-testid={TIDS.extractionResult}>
          {!extraction ? (
            <EmptyState
              title="No extraction yet"
              body="Enter a gene symbol (e.g. TP53) or paste a FASTA sequence, then run the pipeline. The extraction will fetch real genomic coordinates from Ensembl and scan the promoter against JASPAR PWMs."
            />
          ) : (
            <ExtractionResults result={extraction} />
          )}
        </div>
      </div>
    </div>
  );
}

function SliderControl({ label, value, onChange, min, max, step, hint, format, testId }) {
  return (
    <div data-testid={testId}>
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
          {label}
        </Label>
        <span className="text-sm font-mono text-blue-300">
          {format ? format(value) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
        className="mt-2"
      />
      {hint && <div className="mt-1 text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
}

function ExtractionResults({ result }) {
  const promoter = result.promoter || {};
  const stats = result.sequence_stats || {};
  const hits = result.motif_hits || [];
  const cons = result.conservation;

  const densityData = useMemo(() => {
    const d = result.motif_density;
    if (!d) return [];
    return d.centers.map((c, i) => ({ pos: c, count: d.counts[i] }));
  }, [result.motif_density]);

  const gcProfile = useMemo(
    () => (stats.gc_profile || []).map((p) => ({ pos: p.position, gc: p.gc * 100 })),
    [stats.gc_profile]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Sequence length"
          value={promoter.length || 0}
          unit="bp"
          hint={promoter.assembly}
        />
        <MetricCard
          label="GC content"
          value={`${((stats.gc_content || 0) * 100).toFixed(1)}`}
          unit="%"
          accent="text-emerald-300"
          hint={stats.gc_content >= 0.4 && stats.gc_content <= 0.65 ? "Optimal range" : "Outside 40-65% optimum"}
        />
        <MetricCard
          label="Motif occurrences"
          value={result.motif_count}
          accent="text-amber-300"
          hint={`${result.unique_tfs} unique TFs detected`}
        />
        <MetricCard
          label="Conservation (PhyloP)"
          value={cons ? cons.mean.toFixed(2) : "—"}
          accent="text-blue-300"
          hint={cons ? `${(cons.conserved_fraction * 100).toFixed(1)}% conserved bases` : "Data unavailable from UCSC"}
        />
      </div>

      {/* Gene info */}
      {promoter.gene_symbol && (
        <PanelShell title={`GENE · ${promoter.gene_symbol}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 text-xs font-mono">
            <KV label="Ensembl ID" value={promoter.ensembl_id} />
            <KV label="Chromosome" value={promoter.chromosome} />
            <KV label="Strand" value={promoter.strand === 1 ? "+" : "−"} />
            <KV label="Biotype" value={promoter.biotype} />
            <KV label="Coords" value={`${promoter.start} – ${promoter.end}`} />
            <KV label="TSS" value={promoter.tss} />
            <KV label="Source" value={promoter.source} />
            <KV label="PWM library" value={`${result.pwm_library_size} matrices`} />
          </div>
          {promoter.description && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
              {promoter.description}
            </div>
          )}
        </PanelShell>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PanelShell title="GC PROFILE · 50bp sliding window">
          <div style={{ height: 200 }}>
            {gcProfile.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gcProfile}>
                  <CartesianGrid stroke="#1E293B" strokeDasharray="2 4" />
                  <XAxis dataKey="pos" stroke="#475569" fontSize={10} />
                  <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} />
                  <RTooltip
                    contentStyle={{
                      background: "#0A0F1D",
                      border: "1px solid #1E293B",
                      fontSize: 11,
                    }}
                  />
                  <Line type="monotone" dataKey="gc" stroke="#10B981" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">Insufficient sequence length for profile.</div>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">
            Higher GC = stronger promoter affinity for SP1/KLF/EGR families.
          </div>
        </PanelShell>

        <PanelShell title="MOTIF DENSITY · 20 positional bins">
          <div style={{ height: 200 }}>
            {densityData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={densityData}>
                  <CartesianGrid stroke="#1E293B" strokeDasharray="2 4" />
                  <XAxis dataKey="pos" stroke="#475569" fontSize={10} />
                  <YAxis stroke="#475569" fontSize={10} />
                  <RTooltip
                    contentStyle={{
                      background: "#0A0F1D",
                      border: "1px solid #1E293B",
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No motif hits to plot.</div>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">
            Spatial clustering reveals regulatory hotspots vs sparse regions.
          </div>
        </PanelShell>
      </div>

      {/* Sequence */}
      <PanelShell title={`PROMOTER SEQUENCE · ${promoter.length || 0} bp`} right={<span className="text-emerald-400">Nucleotide colorization</span>}>
        <SequenceViewer
          testId={TIDS.sequenceViewer}
          sequence={promoter.sequence || ""}
          highlights={hits.slice(0, 200)}
          perLine={70}
        />
        <Legend />
      </PanelShell>

      {/* Motif table */}
      <PanelShell title={`DETECTED MOTIFS · ${hits.length}`}>
        {hits.length === 0 ? (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> No motifs above threshold.
            Lower the threshold and re-run.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[400px]" data-testid={TIDS.motifTable}>
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-[#0A0F1D] text-slate-500 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="text-left py-2 pr-3">Name</th>
                  <th className="text-left py-2 pr-3">Class</th>
                  <th className="text-right py-2 pr-3">Start</th>
                  <th className="text-right py-2 pr-3">End</th>
                  <th className="text-center py-2 pr-3">Strand</th>
                  <th className="text-right py-2 pr-3">Score</th>
                  <th className="text-right py-2 pr-3">Rel</th>
                  <th className="text-left py-2">Consensus</th>
                </tr>
              </thead>
              <tbody>
                {hits.slice(0, 200).map((h, i) => (
                  <tr key={i} className="border-t border-slate-800/50 text-slate-300 hover:bg-slate-800/30">
                    <td className="py-1.5 pr-3 text-blue-300">{h.name}</td>
                    <td className="py-1.5 pr-3 text-slate-500 truncate max-w-[140px]" title={h.tf_class}>
                      {h.tf_class || "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-right">{h.start}</td>
                    <td className="py-1.5 pr-3 text-right">{h.end}</td>
                    <td className="py-1.5 pr-3 text-center">
                      <span className={h.strand === "+" ? "text-emerald-400" : "text-rose-400"}>
                        {h.strand}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-right">{h.score.toFixed(2)}</td>
                    <td className="py-1.5 pr-3 text-right">{h.rel_score.toFixed(3)}</td>
                    <td className="py-1.5 text-slate-400">{h.consensus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hits.length > 200 && (
              <div className="text-[10px] text-slate-500 mt-2">Showing first 200 of {hits.length} hits.</div>
            )}
          </div>
        )}
      </PanelShell>

      {/* Interpretation */}
      <PanelShell title="INTERPRETATION">
        <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <li>
            <span className="text-blue-300">GC content</span> of{" "}
            {(stats.gc_content * 100).toFixed(1)}% places this promoter
            {stats.gc_content >= 0.4 && stats.gc_content <= 0.65 ? " in the canonical mammalian promoter range." : " outside the canonical mammalian range (40–65%), suggesting atypical regulatory chemistry."}
          </li>
          <li>
            <span className="text-blue-300">{result.unique_tfs} distinct TFs</span> have predicted binding sites,
            indicating {result.unique_tfs > 20 ? "a complex multi-factor regulatory environment." : "a focused regulatory profile dominated by a few factors."}
          </li>
          {cons && (
            <li>
              <span className="text-blue-300">Conservation</span> mean PhyloP {cons.mean.toFixed(2)} with{" "}
              {(cons.conserved_fraction * 100).toFixed(1)}% sites scoring &gt; 2.0 — {cons.mean > 1 ? "strong evolutionary constraint, suggesting functional importance." : "modest constraint, consistent with regulatory flexibility."}
            </li>
          )}
          <li>
            Proceed to <span className="text-blue-300">Module 2 · Graph Studio</span> to build the regulatory co-binding graph from these motif hits.
          </li>
        </ul>
      </PanelShell>
    </motion.div>
  );
}

function KV({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-slate-200">{value ?? "—"}</div>
    </div>
  );
}

function Legend() {
  const items = [
    { c: "nt-A", l: "A · Adenine" },
    { c: "nt-T", l: "T · Thymine" },
    { c: "nt-G", l: "G · Guanine" },
    { c: "nt-C", l: "C · Cytosine" },
    { c: "", l: "Motif binding (highlighted)" },
  ];
  return (
    <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-4 text-[10px] font-mono text-slate-500">
      {items.map((i) => (
        <div key={i.l} className="flex items-center gap-2">
          <span className={`font-mono text-sm ${i.c}`}>{i.c ? "N" : "▮"}</span>
          {i.l}
        </div>
      ))}
    </div>
  );
}
