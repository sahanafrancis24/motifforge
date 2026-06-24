"""Ensembl REST client - extracts gene location and promoter region sequence."""
import requests
from typing import Optional, Dict, Any

ENSEMBL_BASE = "https://rest.ensembl.org"
HEADERS_JSON = {"Content-Type": "application/json", "Accept": "application/json"}
HEADERS_FASTA = {"Content-Type": "text/x-fasta"}

REQUEST_TIMEOUT = 15


def lookup_gene(symbol: str, species: str = "homo_sapiens") -> Optional[Dict[str, Any]]:
    """Lookup gene by symbol -> returns Ensembl gene info with location & TSS."""
    url = f"{ENSEMBL_BASE}/lookup/symbol/{species}/{symbol}?expand=1"
    try:
        r = requests.get(url, headers=HEADERS_JSON, timeout=REQUEST_TIMEOUT)
    except requests.RequestException:
        return None
    if r.status_code != 200:
        return None
    return r.json()


def get_promoter_sequence(
    chromosome: str,
    tss: int,
    strand: int,
    upstream: int = 1500,
    downstream: int = 500,
    species: str = "human",
) -> Optional[Dict[str, Any]]:
    """Fetch promoter region around TSS using Ensembl /sequence/region endpoint."""
    if strand == 1:
        start = max(tss - upstream, 1)
        end = tss + downstream
    else:
        start = max(tss - downstream, 1)
        end = tss + upstream

    region = f"{chromosome}:{start}..{end}:{strand}"
    url = f"{ENSEMBL_BASE}/sequence/region/{species}/{region}"
    try:
        r = requests.get(url, headers=HEADERS_JSON, timeout=REQUEST_TIMEOUT)
    except requests.RequestException:
        return None
    if r.status_code != 200:
        return None
    data = r.json()
    return {
        "sequence": data.get("seq", "").upper(),
        "chromosome": chromosome,
        "start": start,
        "end": end,
        "strand": strand,
        "tss": tss,
        "length": len(data.get("seq", "")),
        "assembly": data.get("assembly_name"),
        "source": "Ensembl REST",
    }


def extract_promoter_by_symbol(
    symbol: str, upstream: int = 1500, downstream: int = 500
) -> Optional[Dict[str, Any]]:
    info = lookup_gene(symbol)
    if not info:
        return None

    chromosome = info.get("seq_region_name")
    strand = info.get("strand", 1)
    gene_start = info.get("start")
    gene_end = info.get("end")
    if chromosome is None or gene_start is None:
        return None

    tss = gene_start if strand == 1 else gene_end
    seq_info = get_promoter_sequence(chromosome, tss, strand, upstream, downstream)
    if not seq_info:
        return None

    seq_info.update(
        {
            "gene_symbol": symbol,
            "ensembl_id": info.get("id"),
            "biotype": info.get("biotype"),
            "description": info.get("description"),
            "gene_start": gene_start,
            "gene_end": gene_end,
        }
    )
    return seq_info
