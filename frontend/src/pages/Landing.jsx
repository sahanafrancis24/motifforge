import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Dna,
  Workflow,
  Network,
  GitBranch,
  PieChart,
  FlaskConical,
  Download,
  ChevronRight,
  Database,
  CircleDot,
  ArrowRight,
} from "lucide-react";
import { TIDS } from "@/constants/tids";

const STEPS = [
  { key: "Gene Input", desc: "Gene symbol or FASTA sequence", icon: Dna },
  { key: "Promoter Extraction", desc: "Ensembl REST · 1.5kb upstream window", icon: Workflow },
  { key: "Motif Discovery", desc: "JASPAR CORE PWMs · PSSM scanning", icon: Database },
  { key: "Graph Construction", desc: "Co-binding regulatory interactions", icon: Network },
  { key: "Architecture Characterization", desc: "Centrality · Communities · Topology", icon: GitBranch },
  { key: "Pattern Mining", desc: "Frequent triplets · Architecture signatures", icon: PieChart },
  { key: "Engineering", desc: "Spacing, GC, connectivity optimization", icon: FlaskConical },
  { key: "Scientific Report", desc: "PDF · GraphML · FASTA · CSV · JSON", icon: Download },
];

const DATABASES = [
  { name: "NCBI", note: "Gene records & taxonomy" },
  { name: "Ensembl REST", note: "Genome coordinates & sequence" },
  { name: "JASPAR", note: "Transcription factor PWMs" },
  { name: "UCSC PhyloP", note: "100-way conservation scoring" },
  { name: "EPD", note: "Eukaryotic Promoter Database" },
  { name: "ENCODE", note: "Functional element annotations" },
];

const OUTPUTS = [
  "Live promoter sequence (FASTA)",
  "Genomic coordinates & assembly",
  "Position-weighted motif occurrences",
  "Sequence statistics (GC, motif density)",
  "Phylogenetic conservation (PhyloP)",
  "Regulatory interaction graph (GraphML)",
  "Centrality & community metrics",
  "Architecture signature & complexity",
  "Frequent motif co-occurrence triplets",
  "Engineering suggestions & predicted score",
  "Publication-grade PDF report",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#060913]">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-[#0A0F1D]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-3 flex items-center justify-between">
          <Link to="/" data-testid={TIDS.brandLogo} className="flex items-center gap-3">
            <div className="w-8 h-8 border border-blue-500/40 bg-blue-500/10 rounded-sm flex items-center justify-center">
              <Dna className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold text-slate-100 tracking-tight">
                MotifForge
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Regulatory DNA Architecture Platform
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <CircleDot className="w-3 h-3 text-emerald-500" /> Live biological APIs · 24h cache
            </div>
            <Link
              to="/extract"
              data-testid={TIDS.ctaStart}
              className="text-xs font-mono uppercase tracking-wider px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-sm"
            >
              Open Lab
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] -translate-y-1/3 translate-x-1/4 bg-blue-600/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-10 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 border border-blue-500/30 bg-blue-500/10 rounded-sm text-[10px] font-mono uppercase tracking-widest text-blue-300"
            >
              <CircleDot className="w-3 h-3" /> Production · Live Bio APIs · NetworkX · BioPython
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-6 text-5xl lg:text-7xl font-bold tracking-tight text-slate-100 leading-[1.02]"
            >
              MotifForge
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-3 text-lg lg:text-xl text-slate-300 font-mono"
            >
              Regulatory DNA Architecture Analysis Platform
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 text-base text-slate-400 max-w-2xl leading-relaxed"
            >
              Extract promoter regions from real genomic coordinates, discover transcription
              factor binding sites with JASPAR position weight matrices, construct co-binding
              regulatory graphs, characterize topology with NetworkX, mine recurring
              architectures, engineer improved promoter designs, and export
              publication-ready scientific reports — all in one integrated bench.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                to="/extract"
                data-testid={TIDS.ctaStart}
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm rounded-sm transition-colors"
              >
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/extract?example=TP53"
                data-testid={TIDS.ctaExample}
                className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-sm rounded-sm transition-colors"
              >
                Load Example Dataset
              </Link>
              <a
                href="#workflow"
                data-testid={TIDS.ctaWorkflow}
                className="inline-flex items-center gap-2 px-5 py-3 text-slate-400 hover:text-slate-200 font-mono text-sm rounded-sm transition-colors"
              >
                Watch Workflow <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <HeroVisualization />
          </div>
        </div>
      </section>

      {/* Problem + Why */}
      <section className="border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-3 gap-6">
          <Card title="The Problem">
            Bioinformaticians fragment their workflow across NCBI, JASPAR, ENCODE, EPD,
            Cytoscape and ad-hoc NetworkX scripts. Each step loses context, references
            and reproducibility.
          </Card>
          <Card title="The Solution">
            MotifForge unifies promoter extraction, motif discovery, regulatory graph
            construction, topology characterization, architecture mining, and engineering
            into a single research bench backed by live biological APIs.
          </Card>
          <Card title="The Outcome">
            Every analysis produces a reproducible scientific report with sequence,
            motifs, graph topology, conservation metrics, and engineering
            recommendations — exportable as FASTA, GraphML, CSV, JSON or PDF.
          </Card>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-16">
          <SectionHeader
            label="01 · Workflow"
            title="From gene symbol to scientific report"
            subtitle="An eight-step pipeline grounded in real biological data."
          />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="panel p-4 relative"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 border border-blue-500/30 bg-blue-500/5 rounded-sm flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    Step {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
                <div className="mt-3 text-sm font-medium text-slate-100">{s.key}</div>
                <div className="mt-1 text-xs text-slate-500 leading-relaxed">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Databases */}
      <section className="border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-16">
          <SectionHeader
            label="02 · Data Sources"
            title="Live biological repositories"
            subtitle="No mock datasets. No fabricated motifs. Every record sourced from public live APIs with 24-hour cache."
          />
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {DATABASES.map((d) => (
              <div key={d.name} className="panel p-4">
                <div className="text-sm font-mono text-blue-300">{d.name}</div>
                <div className="text-[11px] text-slate-500 mt-1">{d.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Outputs */}
      <section className="border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-16">
          <SectionHeader
            label="03 · Outputs"
            title="What you receive"
            subtitle="Every export is reproducible and traceable to its source API."
          />
          <div className="mt-8 grid md:grid-cols-2 gap-3">
            {OUTPUTS.map((o) => (
              <div
                key={o}
                className="flex items-center gap-3 px-4 py-3 panel"
              >
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                <span className="text-sm text-slate-300">{o}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-100 tracking-tight">
            Open the lab. Begin the analysis.
          </h2>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto">
            Six integrated modules. Live regulatory data. Publication-ready exports.
          </p>
          <Link
            to="/extract"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm rounded-sm"
          >
            Launch MotifForge <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div>MotifForge · Built for genomics research benches</div>
          <div>NetworkX · BioPython · Cytoscape.js · FastAPI · MongoDB</div>
        </div>
      </footer>
    </div>
  );
}

function HeroVisualization() {
  return (
    <div className="relative panel overflow-hidden h-[420px]">
      <div className="panel-header">
        <span>NETWORK · TP53 PROMOTER</span>
        <span className="text-emerald-400">LIVE</span>
      </div>
      <div className="relative h-full bg-grid-fine">
        <svg
          className="w-full h-full"
          viewBox="0 0 400 360"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lg" x1="0" x2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {EDGES.map((e, i) => (
            <line
              key={i}
              x1={NODES[e[0]].x}
              y1={NODES[e[0]].y}
              x2={NODES[e[1]].x}
              y2={NODES[e[1]].y}
              stroke="url(#lg)"
              strokeWidth="1"
              opacity="0.5"
            >
              <animate
                attributeName="opacity"
                values="0.2;0.7;0.2"
                dur={`${3 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </line>
          ))}
          {NODES.map((n, i) => (
            <g key={i}>
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={n.color}
                stroke="#0A0F1D"
                strokeWidth="1.5"
              />
              <text
                x={n.x}
                y={n.y + 3}
                textAnchor="middle"
                fontFamily="IBM Plex Mono"
                fontSize="8"
                fill="#E2E8F0"
              >
                {n.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-500">
          <div className="bg-[#04060F]/80 border border-slate-800 p-2">
            <div className="text-slate-500">NODES</div>
            <div className="text-blue-300 text-sm">{NODES.length}</div>
          </div>
          <div className="bg-[#04060F]/80 border border-slate-800 p-2">
            <div className="text-slate-500">EDGES</div>
            <div className="text-blue-300 text-sm">{EDGES.length}</div>
          </div>
          <div className="bg-[#04060F]/80 border border-slate-800 p-2">
            <div className="text-slate-500">DENSITY</div>
            <div className="text-blue-300 text-sm">0.42</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const NODES = [
  { x: 200, y: 110, r: 22, color: "#3B82F6", label: "SP1" },
  { x: 100, y: 180, r: 18, color: "#10B981", label: "TP53" },
  { x: 300, y: 180, r: 16, color: "#F59E0B", label: "MYC" },
  { x: 150, y: 260, r: 14, color: "#A855F7", label: "E2F" },
  { x: 250, y: 270, r: 14, color: "#3B82F6", label: "NFKB" },
  { x: 80, y: 100, r: 12, color: "#06B6D4", label: "AP1" },
  { x: 320, y: 100, r: 12, color: "#10B981", label: "CREB" },
  { x: 200, y: 220, r: 16, color: "#EF4444", label: "JUN" },
];

const EDGES = [
  [0, 1], [0, 2], [0, 7], [1, 7], [2, 7], [1, 3], [2, 4], [3, 4],
  [5, 0], [6, 0], [5, 1], [6, 2], [3, 7], [4, 7],
];

function Card({ title, children }) {
  return (
    <div className="panel p-6">
      <div className="text-[10px] font-mono uppercase tracking-widest text-blue-400">
        {title}
      </div>
      <p className="mt-3 text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}

function SectionHeader({ label, title, subtitle }) {
  return (
    <div className="max-w-3xl">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400">
        {label}
      </div>
      <h2 className="mt-2 text-3xl md:text-4xl font-semibold text-slate-100 tracking-tight">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-slate-400">{subtitle}</p>}
    </div>
  );
}
