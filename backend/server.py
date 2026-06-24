"""MotifForge - FastAPI backend.

Production-grade bioinformatics platform for regulatory DNA architecture analysis.
All biological data is sourced live from NCBI, JASPAR, Ensembl, UCSC.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Body
from fastapi.responses import Response, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone

from services.cache import BioCache
from services import ensembl, jaspar, motif_scan, conservation, graph_analysis, mining, engineering, export_service


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
bio_cache = BioCache(db)

app = FastAPI(title="MotifForge API", version="1.0.0")
api_router = APIRouter(prefix="/api")


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("motifforge")


# ---------- Pydantic models ----------

class ExtractRequest(BaseModel):
    gene_symbol: Optional[str] = None
    fasta: Optional[str] = None
    upstream: int = 1500
    downstream: int = 500
    matrix_limit: int = 30
    threshold: float = 0.85


class GraphAnalyzeRequest(BaseModel):
    motif_hits: List[Dict[str, Any]]
    window: int = 100


class MiningRequest(BaseModel):
    motif_hits: List[Dict[str, Any]]
    window: int = 150


class EngineeringRequest(BaseModel):
    motif_hits: List[Dict[str, Any]]
    gc_content: float
    window: int = 100


class ExportRequest(BaseModel):
    project: Dict[str, Any]
    format: str  # fasta | csv | json | graphml | pdf


# ---------- Helpers ----------

def _data_unavailable(detail: str = "Data unavailable") -> HTTPException:
    return HTTPException(status_code=503, detail=detail)


def _parse_fasta(fasta_text: str) -> Dict[str, str]:
    lines = [ln.strip() for ln in fasta_text.strip().splitlines() if ln.strip()]
    header = ""
    seq_lines: List[str] = []
    for ln in lines:
        if ln.startswith(">"):
            header = ln[1:]
        else:
            seq_lines.append(ln)
    sequence = "".join(seq_lines).upper()
    sequence = "".join(c for c in sequence if c in "ACGTN")
    return {"header": header or "user_sequence", "sequence": sequence}


async def _get_pfms(limit: int) -> List[Dict[str, Any]]:
    cached = await bio_cache.get("jaspar_matrix_list", {"limit": limit})
    if cached:
        matrices = cached
    else:
        matrices = await asyncio.to_thread(jaspar.list_human_core_matrices, 100, limit)
        if matrices:
            await bio_cache.set("jaspar_matrix_list", {"limit": limit}, matrices)
    if not matrices:
        return []

    pfms = []
    for m in matrices[:limit]:
        mid = m["matrix_id"]
        cached_pfm = await bio_cache.get("jaspar_pfm", mid)
        if cached_pfm:
            pfms.append(cached_pfm)
            continue
        pfm = await asyncio.to_thread(jaspar.get_matrix_pfm, mid)
        if pfm:
            await bio_cache.set("jaspar_pfm", mid, pfm)
            pfms.append(pfm)
    return pfms


# ---------- Health ----------

@api_router.get("/")
async def root():
    return {
        "service": "MotifForge API",
        "version": "1.0.0",
        "status": "operational",
        "data_sources": ["NCBI", "JASPAR", "Ensembl", "UCSC PhyloP", "EPD", "ENCODE"],
    }


@api_router.get("/health")
async def health():
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}


# ---------- Module 1: Promoter Extraction ----------

@api_router.post("/extract")
async def extract_promoter(req: ExtractRequest):
    """End-to-end pipeline: gene -> promoter sequence -> motif scan -> stats -> conservation."""
    if not req.gene_symbol and not req.fasta:
        raise HTTPException(status_code=400, detail="Provide gene_symbol or fasta")

    if req.gene_symbol:
        cache_key = {
            "symbol": req.gene_symbol.upper(),
            "u": req.upstream,
            "d": req.downstream,
        }
        cached = await bio_cache.get("ensembl_promoter", cache_key)
        if cached:
            promoter = cached
        else:
            promoter = await asyncio.to_thread(
                ensembl.extract_promoter_by_symbol,
                req.gene_symbol.upper(),
                req.upstream,
                req.downstream,
            )
            if not promoter or not promoter.get("sequence"):
                raise _data_unavailable(
                    f"Ensembl REST: gene '{req.gene_symbol}' not found or sequence unavailable."
                )
            await bio_cache.set("ensembl_promoter", cache_key, promoter)
    else:
        parsed = _parse_fasta(req.fasta)
        if not parsed["sequence"]:
            raise HTTPException(status_code=400, detail="Invalid FASTA sequence")
        promoter = {
            "sequence": parsed["sequence"],
            "length": len(parsed["sequence"]),
            "gene_symbol": parsed["header"],
            "source": "user_fasta",
        }

    sequence = promoter["sequence"]

    # Fetch JASPAR PWMs and scan
    pfms = await _get_pfms(req.matrix_limit)
    if not pfms:
        raise _data_unavailable("JASPAR REST: no PWMs available.")
    hits = await asyncio.to_thread(motif_scan.scan_sequence, sequence, pfms, req.threshold, 30)
    stats = motif_scan.compute_gc_content(sequence)
    density = motif_scan.motif_density(hits, len(sequence))

    # Conservation (only if from Ensembl with chromosome info)
    conservation_data: Optional[Dict[str, Any]] = None
    if promoter.get("chromosome") and promoter.get("start"):
        cons_key = {
            "chrom": promoter["chromosome"],
            "start": promoter["start"],
            "end": promoter["end"],
        }
        cons_cached = await bio_cache.get("ucsc_phylop", cons_key)
        if cons_cached:
            conservation_data = cons_cached
        else:
            cons = await asyncio.to_thread(
                conservation.get_phylop_conservation,
                promoter["chromosome"],
                promoter["start"],
                promoter["end"],
            )
            if cons:
                await bio_cache.set("ucsc_phylop", cons_key, cons)
                conservation_data = cons

    extraction_result = {
        "id": str(uuid.uuid4()),
        "promoter": promoter,
        "sequence_stats": stats,
        "motif_hits": hits,
        "motif_count": len(hits),
        "unique_tfs": len({h["name"] for h in hits}),
        "motif_density": density,
        "conservation": conservation_data,
        "pwm_library_size": len(pfms),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Persist (without re-using on next call - this is per-extraction)
    await db.extractions.insert_one({**extraction_result, "_id": extraction_result["id"]})
    return extraction_result


@api_router.get("/extract/{extract_id}")
async def get_extraction(extract_id: str):
    doc = await db.extractions.find_one({"_id": extract_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Extraction not found")
    return doc


@api_router.get("/jaspar/matrices")
async def list_matrices(limit: int = 30):
    """Return the JASPAR PWM library (loads from cache once fetched)."""
    pfms = await _get_pfms(limit)
    if not pfms:
        raise _data_unavailable("JASPAR REST unavailable")
    return {
        "count": len(pfms),
        "matrices": [
            {
                "matrix_id": p["matrix_id"],
                "name": p["name"],
                "tf_class": p.get("tf_class"),
                "tf_family": p.get("tf_family"),
                "length": p["length"],
                "consensus": p["consensus"],
            }
            for p in pfms
        ],
    }


# ---------- Module 2: Graph Studio ----------

@api_router.post("/graph/build")
async def build_graph(req: GraphAnalyzeRequest):
    if not req.motif_hits:
        raise HTTPException(status_code=400, detail="motif_hits required")
    G = graph_analysis.build_regulatory_graph(req.motif_hits, req.window)
    return {
        "cytoscape": graph_analysis.graph_to_cytoscape(G),
        "stats": graph_analysis.graph_statistics(G),
        "window": req.window,
    }


@api_router.post("/graph/analyze")
async def analyze_graph(req: GraphAnalyzeRequest):
    G = graph_analysis.build_regulatory_graph(req.motif_hits, req.window)
    centrality = graph_analysis.centrality_metrics(G)
    scores = graph_analysis.architecture_scores(G, centrality)
    hubs = graph_analysis.hub_motifs(centrality, top_n=10)
    stats = graph_analysis.graph_statistics(G)
    return {
        "cytoscape": graph_analysis.graph_to_cytoscape(G),
        "stats": stats,
        "centrality": centrality,
        "scores": scores,
        "hub_motifs": hubs,
    }


# ---------- Module 3 (centrality is part of analyze) ----------

@api_router.post("/characterize")
async def characterize(req: GraphAnalyzeRequest):
    """Returns full topology characterization including signature."""
    G = graph_analysis.build_regulatory_graph(req.motif_hits, req.window)
    centrality = graph_analysis.centrality_metrics(G)
    scores = graph_analysis.architecture_scores(G, centrality)
    hubs = graph_analysis.hub_motifs(centrality)
    stats = graph_analysis.graph_statistics(G)
    signature = mining.architecture_signature(G)
    return {
        "stats": stats,
        "centrality": centrality,
        "scores": scores,
        "hub_motifs": hubs,
        "signature": signature,
    }


# ---------- Module 4: Architecture Mining ----------

@api_router.post("/mining")
async def mining_endpoint(req: MiningRequest):
    cooc = mining.motif_cooccurrence(req.motif_hits, req.window)
    triplets = mining.frequent_triplets(req.motif_hits, req.window)
    G = graph_analysis.build_regulatory_graph(req.motif_hits, req.window)
    signature = mining.architecture_signature(G)
    stats = graph_analysis.graph_statistics(G)
    return {
        "cooccurrence": cooc,
        "frequent_triplets": triplets,
        "signature": signature,
        "communities": stats["communities"],
    }


# ---------- Module 5: Promoter Engineering ----------

@api_router.post("/engineering")
async def engineering_endpoint(req: EngineeringRequest):
    G = graph_analysis.build_regulatory_graph(req.motif_hits, req.window)
    centrality = graph_analysis.centrality_metrics(G)
    scores = graph_analysis.architecture_scores(G, centrality)

    gc = engineering.analyze_gc_balance(req.gc_content)
    spacing = engineering.analyze_spacing(req.motif_hits)
    connectivity = engineering.analyze_connectivity_gaps(G)
    redundancy = engineering.analyze_redundancy(req.motif_hits)
    missing = engineering.analyze_missing_core_elements(req.motif_hits)
    suggestions = engineering.generate_suggestions(gc, spacing, connectivity, redundancy, missing)
    predicted = engineering.predict_score_improvement(scores["architecture"], suggestions)

    return {
        "current_score": scores["architecture"],
        "predicted_score": predicted,
        "gc_balance": gc,
        "spacing": spacing,
        "connectivity_gaps": connectivity,
        "redundancy": redundancy,
        "missing_core_elements": missing,
        "suggestions": suggestions,
        "scores": scores,
    }


# ---------- Module 6: Export Center ----------

@api_router.post("/export/fasta")
async def export_fasta(payload: Dict[str, Any] = Body(...)):
    seq = payload.get("sequence", "")
    header = payload.get("header", "MotifForge_sequence")
    if not seq:
        raise HTTPException(status_code=400, detail="sequence required")
    content = export_service.to_fasta(header, seq)
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={header}.fasta"},
    )


@api_router.post("/export/csv")
async def export_csv(payload: Dict[str, Any] = Body(...)):
    motifs = payload.get("motif_hits", [])
    content = export_service.motifs_to_csv(motifs)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=motifs.csv"},
    )


@api_router.post("/export/json")
async def export_json(payload: Dict[str, Any] = Body(...)):
    content = export_service.export_json_payload(payload)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=motifforge_project.json"},
    )


@api_router.post("/export/graphml")
async def export_graphml(payload: Dict[str, Any] = Body(...)):
    motif_hits = payload.get("motif_hits", [])
    window = payload.get("window", 100)
    G = graph_analysis.build_regulatory_graph(motif_hits, window)
    content = export_service.graph_to_graphml(G)
    return Response(
        content=content,
        media_type="application/xml",
        headers={"Content-Disposition": "attachment; filename=motifforge_graph.graphml"},
    )


@api_router.post("/export/pdf")
async def export_pdf(payload: Dict[str, Any] = Body(...)):
    pdf_bytes = export_service.build_pdf_report(payload)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=motifforge_report.pdf"},
    )


# ---------- Mount router & CORS ----------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
