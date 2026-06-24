# MotifForge — PRD

## Original problem statement
MotifForge is a next-generation regulatory DNA architecture analysis platform that
unifies promoter extraction, motif discovery, regulatory graph construction,
architecture characterization, pattern mining, promoter engineering and scientific
reporting into one integrated research environment using **real biological data only**
(NCBI, JASPAR, Ensembl, UCSC PhyloP, EPD, ENCODE).

## User decisions (Feb 2026)
- **Stack**: FastAPI + MongoDB + React (JS) — production stack of the platform.
- **Data**: Live biological sources only. No mock datasets. 24h cache.
- **Auth**: None. Direct, no-login access.
- **Theme**: Dark scientific workstation (Benchling/SnapGene aesthetic).
- **Scope**: All 6 modules end-to-end.

## Architecture
- **Backend** (`/app/backend`)
  - `server.py` — FastAPI app with `/api/*` routes.
  - `services/ensembl.py` — Ensembl REST gene + promoter region.
  - `services/jaspar.py` — JASPAR REST CORE PWM library.
  - `services/motif_scan.py` — BioPython PSSM scanning + GC profile.
  - `services/conservation.py` — UCSC PhyloP 100-way.
  - `services/graph_analysis.py` — NetworkX centrality, communities, scores.
  - `services/mining.py` — Co-occurrence + frequent triplets + signature.
  - `services/engineering.py` — Diagnostics + suggestions + score prediction.
  - `services/export_service.py` — FASTA, CSV, JSON, GraphML, ReportLab PDF.
  - `services/cache.py` — MongoDB-backed 24h cache for live API records.

- **Frontend** (`/app/frontend/src`)
  - `App.js` — Routing (`/`, `/extract`, `/graph`, `/characterize`, `/mining`, `/engineer`, `/export`).
  - `pages/Landing.jsx` — Hero + workflow + databases + outputs.
  - `pages/ExtractionPage.jsx` (M1), `GraphStudioPage.jsx` (M2),
    `CharacterizationPage.jsx` (M3), `MiningPage.jsx` (M4),
    `EngineeringPage.jsx` (M5), `ExportPage.jsx` (M6).
  - `components/Layout.jsx`, `PurposeStrip.jsx`, `SequenceViewer.jsx`,
    `GraphCanvas.jsx` (Cytoscape.js + fcose), `Primitives.jsx`.
  - `store/useStore.js` — Zustand store with `persist` for cross-module state.
  - `lib/api.js` — Axios client → `${REACT_APP_BACKEND_URL}/api`.

## Implemented (2026-02-24)
- Landing page with brand, hero with animated network SVG, 8-step workflow, 6 live data sources, 11 outputs.
- M1 Extraction: gene symbol or FASTA input, parameters (upstream/downstream/PWMs/threshold), live Ensembl + JASPAR + UCSC pipeline, results (metrics, GC profile, motif density, colored sequence viewer, motif table, interpretation).
- M2 Graph Studio: Cytoscape.js canvas (fcose layout, drag/pan/zoom/select), community panel, statistics, legend.
- M3 Architecture Characterization: scores (architecture, complexity, topology, modularity), radar chart, hub motif ranking, centrality matrix, topology signature.
- M4 Architecture Mining: co-occurrence pairs (bar + heatmap), frequent triplets, architecture signature.
- M5 Promoter Engineering: GC/spacing/connectivity/redundancy/missing-core diagnostics, suggestion cards (priority-coded), before/after score chart.
- M6 Export Center: FASTA, CSV (motifs), JSON (project), GraphML, PDF (ReportLab scientific report).
- 24h MongoDB cache for all live retrievals.

## Testing
Testing agent iteration 1: 15/15 backend assertions passed, all frontend critical flows verified. No critical or minor issues.

## Backlog (future)
- P1: Allow custom JASPAR collection / species selection.
- P1: Add EPD direct query (currently relying on Ensembl).
- P2: User-editable graph (drag-and-drop synthetic node creation).
- P2: PNG/SVG export of Cytoscape canvas.
- P2: Multi-gene comparison view (overlay 2-3 promoter architectures).
- P2: Cached extractions browser (history page).
