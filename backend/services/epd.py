"""EPDnew (Eukaryotic Promoter Database) integration.

Queries the EPDnew track via UCSC's API to obtain experimentally-defined promoter
coordinates, then fetches sequence from Ensembl using the EPD-standard window
(-499 to +100 around TSS).
"""
import requests
from typing import Optional, Dict, Any, List
from services import ensembl

UCSC_API = "https://api.genome.ucsc.edu"
TIMEOUT = 30

# EPDnew tracks per species
EPD_TRACKS = {
    "homo_sapiens": ("hg38", "epdNewPromoter"),
    "mus_musculus": ("mm39", "epdNewPromoter"),
    "drosophila_melanogaster": ("dm6", "epdNewPromoter"),
    "danio_rerio": ("danRer11", "epdNewPromoter"),
    "saccharomyces_cerevisiae": ("sacCer3", "epdNewPromoter"),
    "caenorhabditis_elegans": ("ce11", "epdNewPromoter"),
    "arabidopsis_thaliana": ("araTha1", "epdNewPromoter"),
}

# EPDnew standard window
EPD_UPSTREAM = 499
EPD_DOWNSTREAM = 100


def _fetch_epd_track(genome: str, track: str, chrom: str, start: int, end: int) -> List[Dict[str, Any]]:
    chrom = chrom if chrom.startswith("chr") else f"chr{chrom}"
    url = (
        f"{UCSC_API}/getData/track?genome={genome};track={track}"
        f";chrom={chrom};start={start};end={end}"
    )
    try:
        r = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException:
        return []
    if r.status_code != 200:
        return []
    data = r.json()
    entries = data.get(track) or data.get("data") or []
    if not isinstance(entries, list):
        return []
    return entries


def lookup_epd_promoter(symbol: str, species: str = "homo_sapiens") -> Optional[Dict[str, Any]]:
    """Locate an EPDnew promoter record for a gene symbol.

    Returns the closest EPD promoter to the gene's annotated TSS along with its
    EPD-window sequence.
    """
    track_info = EPD_TRACKS.get(species)
    if not track_info:
        return None
    genome, track = track_info

    # Get gene location from Ensembl
    info = ensembl.lookup_gene(symbol, species)
    if not info:
        return None
    chromosome = info.get("seq_region_name")
    if not chromosome:
        return None
    gene_start = info.get("start")
    gene_end = info.get("end")
    strand = info.get("strand", 1)
    tss = gene_start if strand == 1 else gene_end

    # Query EPDnew track around gene region (+/- 5kb)
    region_start = max(1, min(gene_start, gene_end) - 5000)
    region_end = max(gene_start, gene_end) + 5000
    entries = _fetch_epd_track(genome, track, chromosome, region_start, region_end)
    if not entries:
        return None

    # Pick entry whose record (name) starts with gene symbol or is closest to TSS
    sym_upper = symbol.upper()

    def matches_symbol(e):
        nm = (e.get("name") or "").upper()
        return nm.startswith(sym_upper + "_") or nm == sym_upper

    candidates = [e for e in entries if matches_symbol(e)]
    if not candidates:
        candidates = entries

    def distance(e):
        try:
            return abs(int(e.get("chromStart", 0)) - tss)
        except (TypeError, ValueError):
            return 10**9

    candidates.sort(key=distance)
    best = candidates[0]
    epd_strand = best.get("strand", "+")
    strand_int = 1 if epd_strand == "+" else -1
    chrom_start = int(best.get("chromStart", gene_start))
    chrom_end = int(best.get("chromEnd", gene_end))

    # EPDnew records are 600bp wide (-499..+100). Compute the TSS from coordinates.
    if strand_int == 1:
        epd_tss = chrom_start + EPD_UPSTREAM
    else:
        epd_tss = chrom_end - EPD_UPSTREAM

    seq_info = ensembl.get_promoter_sequence(
        chromosome, epd_tss, strand_int, EPD_UPSTREAM, EPD_DOWNSTREAM, _ensembl_species_short(species)
    )
    if not seq_info or not seq_info.get("sequence"):
        return None

    seq_info.update(
        {
            "gene_symbol": symbol,
            "ensembl_id": info.get("id"),
            "biotype": info.get("biotype"),
            "description": info.get("description"),
            "gene_start": gene_start,
            "gene_end": gene_end,
            "source": f"EPDnew via UCSC {genome}",
            "epd_record": best.get("name"),
            "epd_window": f"-{EPD_UPSTREAM}..+{EPD_DOWNSTREAM}",
        }
    )
    return seq_info


def _ensembl_species_short(species: str) -> str:
    """Map ensembl species name -> ensembl region species code."""
    mapping = {
        "homo_sapiens": "human",
        "mus_musculus": "mouse",
        "rattus_norvegicus": "rat",
        "drosophila_melanogaster": "drosophila_melanogaster",
        "danio_rerio": "zebrafish",
        "saccharomyces_cerevisiae": "saccharomyces_cerevisiae",
        "caenorhabditis_elegans": "caenorhabditis_elegans",
        "arabidopsis_thaliana": "arabidopsis_thaliana",
    }
    return mapping.get(species, species)
