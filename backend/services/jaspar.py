"""JASPAR REST client - fetches transcription factor PWMs (CORE vertebrates)."""
import requests
from typing import List, Dict, Any, Optional

JASPAR_BASE = "https://jaspar.genereg.net/api/v1"
TIMEOUT = 30


def list_human_core_matrices(page_size: int = 100, max_records: int = 60) -> List[Dict[str, Any]]:
    """List human CORE collection JASPAR matrices."""
    results: List[Dict[str, Any]] = []
    url = (
        f"{JASPAR_BASE}/matrix/?tax_id=9606&collection=CORE"
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
                }
            )
            if len(results) >= max_records:
                break
        url = data.get("next")
    return results


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
