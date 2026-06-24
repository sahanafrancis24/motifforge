"""MotifForge: tests for NEW features added on top of MVP.

Covers:
- GET /api/jaspar/metadata (collections, species, sources)
- GET /api/jaspar/matrices?tax_id=10090&collection=CORE (mouse CORE)
- GET /api/jaspar/matrices?collection=INVALID -> 400
- POST /api/extract with EPD source (TP53 / homo_sapiens)
- POST /api/extract with Ensembl mouse (mus_musculus, tax_id=10090) - may 503
- POST /api/compare with 4 genes
- POST /api/compare with 1 gene -> 400
- POST /api/compare with 7 genes -> 400
- GET /api/extract/{id} share link, 404 path
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- JASPAR metadata ----------

def test_jaspar_metadata(client):
    r = client.get(f"{API}/jaspar/metadata", timeout=30)
    assert r.status_code == 200, r.text[:200]
    data = r.json()
    assert "collections" in data and "species" in data and "sources" in data
    expected_cols = {"CORE", "CNE", "PHYLOFACTS", "POLII", "SPLICE", "FAM", "UNVALIDATED"}
    assert expected_cols.issubset(set(data["collections"])), f"got {data['collections']}"
    assert len(data["species"]) >= 8
    for sp in data["species"]:
        assert "tax_id" in sp and "ensembl" in sp and "common" in sp
    src_ids = {s["id"] for s in data["sources"]}
    assert "ensembl" in src_ids and "epd" in src_ids


def test_jaspar_mouse_core_5(client):
    r = client.get(
        f"{API}/jaspar/matrices",
        params={"limit": 5, "tax_id": 10090, "collection": "CORE"},
        timeout=240,
    )
    assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
    data = r.json()
    assert data["tax_id"] == 10090
    assert data["collection"] == "CORE"
    assert data["count"] == 5
    assert len(data["matrices"]) == 5
    for m in data["matrices"]:
        for k in ("matrix_id", "name", "length", "consensus"):
            assert k in m


def test_jaspar_invalid_collection(client):
    r = client.get(
        f"{API}/jaspar/matrices",
        params={"collection": "INVALID", "limit": 5},
        timeout=30,
    )
    assert r.status_code == 400, f"{r.status_code}: {r.text[:200]}"
    detail = r.json().get("detail", "")
    assert "CORE" in detail or "collection" in detail.lower()


# ---------- EPD source ----------

def test_extract_epd_tp53(client):
    payload = {
        "gene_symbol": "TP53",
        "source": "epd",
        "species": "homo_sapiens",
        "matrix_limit": 10,
        "threshold": 0.85,
    }
    t0 = time.time()
    r = client.post(f"{API}/extract", json=payload, timeout=300)
    print(f"EPD /extract took {time.time()-t0:.1f}s, status={r.status_code}")
    assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
    data = r.json()
    prom = data["promoter"]
    assert "EPDnew" in (prom.get("source") or ""), f"source={prom.get('source')}"
    assert prom.get("epd_record")  # e.g. TP53_1
    assert prom.get("epd_window") == "-499..+100"
    assert prom.get("length") == 600, f"length={prom.get('length')}"
    assert data["params"]["source"] == "epd"


# ---------- Mouse Ensembl extraction (may 503) ----------

def test_extract_mouse_tp53(client):
    payload = {
        "gene_symbol": "TP53",
        "source": "ensembl",
        "species": "mus_musculus",
        "tax_id": 10090,
        "collection": "CORE",
        "matrix_limit": 10,
        "threshold": 0.85,
    }
    r = client.post(f"{API}/extract", json=payload, timeout=300)
    # Mouse uses 'Trp53' as symbol so 'TP53' lookup is expected to 503
    assert r.status_code in (200, 503), f"got {r.status_code}: {r.text[:200]}"
    if r.status_code == 200:
        data = r.json()
        assert data["promoter"].get("species") == "mus_musculus" or data["params"]["species"] == "mus_musculus"


# ---------- Compare ----------

_compare_state = {"extraction_id": None}


def test_compare_four_genes(client):
    payload = {
        "gene_symbols": ["TP53", "BRCA1", "EGFR", "APOE"],
        "matrix_limit": 15,
        "threshold": 0.85,
    }
    t0 = time.time()
    r = client.post(f"{API}/compare", json=payload, timeout=420)
    print(f"/compare took {time.time()-t0:.1f}s, status={r.status_code}")
    assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
    data = r.json()
    assert "comparison" in data and "all_tfs" in data and "params" in data
    assert len(data["comparison"]) == 4
    syms = {c["gene_symbol"] for c in data["comparison"]}
    assert syms == {"TP53", "BRCA1", "EGFR", "APOE"}
    avail = [c for c in data["comparison"] if c.get("available")]
    assert len(avail) >= 2, f"only {len(avail)} genes available"
    for c in avail:
        for k in ("metrics", "tfs", "centrality_top"):
            assert k in c
        m = c["metrics"]
        for k in ("motif_count", "unique_tfs", "gc_content", "complexity", "topology",
                 "architecture", "density", "modularity"):
            assert k in m, f"missing metric {k} for {c['gene_symbol']}"
        if c.get("extraction_id"):
            _compare_state["extraction_id"] = c["extraction_id"]


def test_compare_one_gene_400(client):
    r = client.post(f"{API}/compare", json={"gene_symbols": ["TP53"]}, timeout=30)
    assert r.status_code == 400, f"{r.status_code}: {r.text[:200]}"


def test_compare_seven_genes_400(client):
    r = client.post(
        f"{API}/compare",
        json={"gene_symbols": ["A", "B", "C", "D", "E", "F", "G"]},
        timeout=30,
    )
    assert r.status_code == 400, f"{r.status_code}: {r.text[:200]}"


# ---------- Share link ----------

def test_get_extraction_share_link(client):
    # Create a fresh extraction (or reuse from compare)
    eid = _compare_state.get("extraction_id")
    if not eid:
        r = client.post(
            f"{API}/extract",
            json={"gene_symbol": "TP53", "matrix_limit": 5, "threshold": 0.85},
            timeout=300,
        )
        assert r.status_code == 200, r.text[:200]
        eid = r.json()["id"]
    r = client.get(f"{API}/extract/{eid}", timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
    data = r.json()
    assert data.get("id") == eid
    assert "promoter" in data and "motif_hits" in data
    assert "_id" not in data, "MongoDB _id leaked in response"


def test_get_extraction_404(client):
    r = client.get(f"{API}/extract/nonexistent-id-zzz-12345", timeout=30)
    assert r.status_code == 404
