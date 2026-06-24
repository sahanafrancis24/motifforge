"""JASPAR REST client - fetches transcription factor PWMs.

Supports custom collections (CORE, CNE, PHYLOFACTS, POLII, SPLICE, FAM, UNVALIDATED)
and species via tax_id (9606=human, 10090=mouse, 10116=rat, 7227=fly, 4932=yeast).
"""
import requests
from typing import List, Dict, Any, Optional

JASPAR_BASE = "https://jaspar.genereg.net/api/v1"
TIMEOUT = 30

COLLECTIONS = ["CORE", "CNE", "PHYLOFACTS", "POLII", "SPLICE", "FAM", "UNVALIDATED"]

SPECIES = [
    {"tax_id": 9606, "label": "Homo sapiens", "common": "Human", "ensembl": "homo_sapiens", "assembly": "hg38"},
    {"tax_id": 10090, "label": "Mus musculus", "common": "Mouse", "ensembl": "mus_musculus", "assembly": "mm39"},
    {"tax_id": 10116, "label": "Rattus norvegicus", "common": "Rat", "ensembl": "rattus_norvegicus", "assembly": "rn7"},
    {"tax_id": 7955, "label": "Danio rerio", "common": "Zebrafish", "ensembl": "danio_rerio", "assembly": "danRer11"},
    {"tax_id": 7227, "label": "Drosophila melanogaster", "common": "Fruit fly", "ensembl": "drosophila_melanogaster", "assembly": "dm6"},
    {"tax_id": 6239, "label": "Caenorhabditis elegans", "common": "Worm", "ensembl": "caenorhabditis_elegans", "assembly": "ce11"},
    {"tax_id": 4932, "label": "Saccharomyces cerevisiae", "common": "Yeast", "ensembl": "saccharomyces_cerevisiae", "assembly": "sacCer3"},
    {"tax_id": 3702, "label": "Arabidopsis thaliana", "common": "Thale cress", "ensembl": "arabidopsis_thaliana", "assembly": "araTha1"},
]


def list_matrices(
    page_size: int = 100,
    max_records: int = 60,
    tax_id: int = 9606,
    collection: str = "CORE",
) -> List[Dict[str, Any]]:
    """List JASPAR matrices filtered by species and collection."""
    results: List[Dict[str, Any]] = []
    url = (
        f"{JASPAR_BASE}/matrix/?tax_id={tax_id}&collection={collection}"
        f"&page_size={page_size}&format=json"
    )
    while url and len(results) < max_records:
        try:
            r = requests.get(url, timeout=TIMEOUT)
        except requests.RequestException:
            break
        if r.status_code != 200:
            break
        data = r.json()
        for item in data.get("results", []):
            results.append(
                {
                    "matrix_id": item.get("matrix_id"),
                    "name": item.get("name"),
                    "tf_class": item.get("class"),
                    "tf_family": item.get("family"),
                    "tax_group": item.get("tax_group"),
                    "species": item.get("species"),
                    "collection": collection,
                }
            )
            if len(results) >= max_records:
                break
        url = data.get("next")
    return results


# Backwards-compat
def list_human_core_matrices(page_size: int = 100, max_records: int = 60) -> List[Dict[str, Any]]:
    return list_matrices(page_size, max_records, 9606, "CORE")


def get_matrix_pfm(matrix_id: str) -> Optional[Dict[str, Any]]:
    """Get a single PFM (counts matrix) by JASPAR matrix_id."""
    url = f"{JASPAR_BASE}/matrix/{matrix_id}/?format=json"
    try:
        r = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException:
        return None
    if r.status_code != 200:
        return None
    data = r.json()
    pfm = data.get("pfm")
    if not pfm:
        return None
    return {
        "matrix_id": data.get("matrix_id"),
        "name": data.get("name"),
        "tf_class": data.get("class"),
        "tf_family": data.get("family"),
        "pfm": pfm,
        "length": len(pfm.get("A", [])),
        "consensus": _consensus_from_pfm(pfm),
    }


def _consensus_from_pfm(pfm: Dict[str, List[float]]) -> str:
    """Build IUPAC consensus from PFM."""
    if not pfm or "A" not in pfm:
        return ""
    length = len(pfm["A"])
    out = []
    for i in range(length):
        counts = {b: pfm[b][i] for b in "ACGT"}
        total = sum(counts.values()) or 1
        top = max(counts, key=counts.get)
        if counts[top] / total > 0.6:
            out.append(top)
        else:
            out.append("N")
    return "".join(out)
