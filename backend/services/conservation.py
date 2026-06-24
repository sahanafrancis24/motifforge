"""UCSC PhyloP conservation lookup."""
import requests
import statistics
from typing import Optional, Dict, Any

UCSC_API = "https://api.genome.ucsc.edu"
TIMEOUT = 30


def get_phylop_conservation(
    chromosome: str,
    start: int,
    end: int,
    genome: str = "hg38",
    track: str = "phyloP100way",
) -> Optional[Dict[str, Any]]:
    """Fetch PhyloP conservation scores for a region from UCSC."""
    chrom = chromosome if chromosome.startswith("chr") else f"chr{chromosome}"
    url = (
        f"{UCSC_API}/getData/track?genome={genome};track={track}"
        f";chrom={chrom};start={start};end={end}"
    )
    try:
        r = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException:
        return None
    if r.status_code != 200:
        return None
    data = r.json()
    track_data = data.get(track) or data.get("data") or []
    if not isinstance(track_data, list):
        return None
    scores = []
    for entry in track_data:
        v = entry.get("value")
        if v is not None:
            try:
                scores.append(float(v))
            except (TypeError, ValueError):
                continue
    if not scores:
        return None
    return {
        "track": track,
        "genome": genome,
        "chromosome": chrom,
        "start": start,
        "end": end,
        "n_points": len(scores),
        "mean": round(statistics.mean(scores), 4),
        "median": round(statistics.median(scores), 4),
        "min": round(min(scores), 4),
        "max": round(max(scores), 4),
        "stdev": round(statistics.pstdev(scores), 4) if len(scores) > 1 else 0.0,
        "conserved_fraction": round(
            sum(1 for s in scores if s > 2.0) / len(scores), 4
        ),
        "source": "UCSC PhyloP 100-way",
    }
