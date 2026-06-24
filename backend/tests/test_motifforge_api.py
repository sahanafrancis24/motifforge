"""MotifForge backend API regression tests.

Covers: health, JASPAR matrix listing, /extract pipeline (TP53), invalid gene 503,
graph/build, characterize, mining, engineering, and all export formats (fasta/csv/json/graphml/pdf).

NOTE: Live external APIs (Ensembl/JASPAR/UCSC). First /extract call may take 60-180s.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://biomotif-lab.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Shared state across tests (motif_hits + gc from extraction reused by downstream modules)
_state = {"extraction": None}


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------

def test_health_ok(client):
    r = client.get(f"{API}/health", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    assert "ts" in data


def test_root_metadata(client):
    r = client.get(f"{API}/", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data.get("service") == "MotifForge API"
    assert "data_sources" in data


# ---------- JASPAR ----------

def test_jaspar_matrices_returns_5(client):
    # Live JASPAR call - first call may take 60-90s
    r = client.get(f"{API}/jaspar/matrices", params={"limit": 5}, timeout=240)
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert data["count"] == 5
    assert len(data["matrices"]) == 5
    m0 = data["matrices"][0]
    for k in ("matrix_id", "name", "length", "consensus"):
        assert k in m0


# ---------- Extraction ----------

def test_extract_tp53_pipeline(client):
    payload = {
        "gene_symbol": "TP53",
        "upstream": 1000,
        "downstream": 300,
        "matrix_limit": 15,
        "threshold": 0.85,
    }
    t0 = time.time()
    r = client.post(f"{API}/extract", json=payload, timeout=300)
    elapsed = time.time() - t0
    print(f"/extract took {elapsed:.1f}s, status={r.status_code}")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:400]}"
    data = r.json()

    # Promoter
    assert "promoter" in data
    promoter = data["promoter"]
    assert len(promoter["sequence"]) > 1000
    assert promoter.get("chromosome")
    assert promoter.get("ensembl_id")

    # Motif hits
    assert isinstance(data["motif_hits"], list)
    assert isinstance(data["motif_count"], int)
    assert isinstance(data["unique_tfs"], int)

    # Stats
    gc = data["sequence_stats"]["gc_content"]
    assert 0.3 <= gc <= 0.7, f"gc_content={gc} out of expected human range"

    # Conservation may be null
    assert "conservation" in data

    _state["extraction"] = data


def test_extract_invalid_gene_returns_503(client):
    r = client.post(
        f"{API}/extract",
        json={"gene_symbol": "NOT_A_REAL_GENE_XYZ_QQQ", "upstream": 500, "downstream": 200, "matrix_limit": 3},
        timeout=120,
    )
    assert r.status_code == 503, f"expected 503, got {r.status_code}: {r.text[:200]}"


def test_extract_missing_input_returns_400(client):
    r = client.post(f"{API}/extract", json={"upstream": 500}, timeout=30)
    assert r.status_code == 400


# ---------- Graph ----------

def _require_extraction():
    if not _state["extraction"]:
        pytest.skip("extraction did not succeed; downstream tests skipped")
    hits = _state["extraction"]["motif_hits"]
    if not hits:
        pytest.skip("no motif hits available")
    return _state["extraction"]


def test_graph_build(client):
    ext = _require_extraction()
    r = client.post(
        f"{API}/graph/build",
        json={"motif_hits": ext["motif_hits"], "window": 100},
        timeout=60,
    )
    assert r.status_code == 200, r.text[:200]
    data = r.json()
    assert "cytoscape" in data and "nodes" in data["cytoscape"] and "edges" in data["cytoscape"]
    stats = data["stats"]
    for k in ("node_count", "edge_count", "density", "communities"):
        assert k in stats


def test_characterize(client):
    ext = _require_extraction()
    r = client.post(
        f"{API}/characterize",
        json={"motif_hits": ext["motif_hits"], "window": 100},
        timeout=60,
    )
    assert r.status_code == 200, r.text[:200]
    data = r.json()
    assert "scores" in data
    scores = data["scores"]
    for k in ("architecture", "complexity", "topology"):
        assert k in scores
    centrality = data["centrality"]
    for k in ("degree", "betweenness", "closeness", "eigenvector"):
        assert k in centrality
    assert "hub_motifs" in data
    assert "signature" in data


def test_mining(client):
    ext = _require_extraction()
    r = client.post(
        f"{API}/mining",
        json={"motif_hits": ext["motif_hits"], "window": 150},
        timeout=60,
    )
    assert r.status_code == 200, r.text[:200]
    data = r.json()
    assert "cooccurrence" in data
    assert "pairs" in data["cooccurrence"]
    assert "frequent_triplets" in data
    assert "signature" in data
    assert "communities" in data


def test_engineering(client):
    ext = _require_extraction()
    gc = ext["sequence_stats"]["gc_content"]
    r = client.post(
        f"{API}/engineering",
        json={"motif_hits": ext["motif_hits"], "gc_content": gc, "window": 100},
        timeout=60,
    )
    assert r.status_code == 200, r.text[:200]
    data = r.json()
    for k in ("current_score", "predicted_score", "suggestions", "gc_balance",
              "spacing", "connectivity_gaps", "redundancy"):
        assert k in data, f"missing key {k}"
    assert isinstance(data["suggestions"], list)


# ---------- Export ----------

def test_export_fasta(client):
    ext = _require_extraction()
    r = client.post(
        f"{API}/export/fasta",
        json={"sequence": ext["promoter"]["sequence"], "header": "TEST_TP53"},
        timeout=30,
    )
    assert r.status_code == 200
    assert "text/plain" in r.headers.get("content-type", "")
    assert r.text.startswith(">")


def test_export_csv(client):
    ext = _require_extraction()
    r = client.post(f"{API}/export/csv", json={"motif_hits": ext["motif_hits"]}, timeout=30)
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")


def test_export_json(client):
    ext = _require_extraction()
    r = client.post(f"{API}/export/json", json={"extraction": ext}, timeout=30)
    assert r.status_code == 200
    assert "application/json" in r.headers.get("content-type", "")


def test_export_graphml(client):
    ext = _require_extraction()
    r = client.post(
        f"{API}/export/graphml",
        json={"motif_hits": ext["motif_hits"], "window": 100},
        timeout=60,
    )
    assert r.status_code == 200
    assert "application/xml" in r.headers.get("content-type", "")
    assert "graphml" in r.text.lower()


def test_export_pdf(client):
    ext = _require_extraction()
    r = client.post(
        f"{API}/export/pdf",
        json={
            "extraction": ext,
            "gene_symbol": ext["promoter"].get("gene_symbol", "TP53"),
        },
        timeout=60,
    )
    assert r.status_code == 200, r.text[:200]
    assert "application/pdf" in r.headers.get("content-type", "")
    assert r.content[:4] == b"%PDF"
