"""Motif scanning using BioPython PSSM over promoter sequences."""
import math
from typing import List, Dict, Any
from Bio.motifs.matrix import PositionWeightMatrix
from Bio.motifs import Motif
from Bio.Seq import Seq


def _pfm_to_motif(name: str, pfm: Dict[str, List[float]]) -> Motif:
    counts = {b: [float(x) for x in pfm[b]] for b in "ACGT"}
    motif = Motif(alphabet="ACGT", counts=counts)
    motif.name = name
    return motif


def _calc_pssm(motif: Motif, pseudocount: float = 0.25):
    pwm = motif.counts.normalize(pseudocounts=pseudocount)
    bg = {"A": 0.25, "C": 0.25, "G": 0.25, "T": 0.25}
    pssm = pwm.log_odds(background=bg)
    return pssm


def scan_sequence(
    sequence: str,
    pfms: List[Dict[str, Any]],
    threshold_factor: float = 0.85,
    max_hits_per_motif: int = 30,
) -> List[Dict[str, Any]]:
    """Scan sequence for motif occurrences using PSSM log-odds.

    threshold_factor: 0..1, applied to max possible PSSM score per motif.
    """
    seq = sequence.upper().replace("N", "A")
    bio_seq = Seq(seq)
    rev_seq = bio_seq.reverse_complement()

    hits: List[Dict[str, Any]] = []
    for entry in pfms:
        try:
            motif = _pfm_to_motif(entry.get("name", "unknown"), entry["pfm"])
            pssm = _calc_pssm(motif)
        except Exception:
            continue
        max_score = pssm.max
        if max_score is None or not math.isfinite(max_score):
            continue
        threshold = max_score * threshold_factor
        motif_hits = []

        for strand_label, target_seq in [("+", bio_seq), ("-", rev_seq)]:
            try:
                for pos, score in pssm.search(target_seq, threshold=threshold, both=False):
                    if pos < 0:
                        continue
                    if strand_label == "-":
                        end = len(seq) - pos
                        start = end - motif.length
                    else:
                        start = pos
                        end = pos + motif.length
                    motif_hits.append(
                        {
                            "matrix_id": entry.get("matrix_id"),
                            "name": entry.get("name"),
                            "tf_class": entry.get("tf_class"),
                            "tf_family": entry.get("tf_family"),
                            "start": int(start),
                            "end": int(end),
                            "strand": strand_label,
                            "score": float(score),
                            "max_score": float(max_score),
                            "rel_score": float(score / max_score) if max_score else 0.0,
                            "length": motif.length,
                            "consensus": entry.get("consensus", ""),
                        }
                    )
                    if len(motif_hits) >= max_hits_per_motif:
                        break
            except Exception:
                continue
            if len(motif_hits) >= max_hits_per_motif:
                break

        hits.extend(motif_hits)

    hits.sort(key=lambda h: (h["start"], -h["rel_score"]))
    return hits


def compute_gc_content(sequence: str) -> Dict[str, Any]:
    seq = sequence.upper()
    total = len(seq) or 1
    counts = {b: seq.count(b) for b in "ACGT"}
    gc = (counts["G"] + counts["C"]) / total
    at = (counts["A"] + counts["T"]) / total

    # Sliding window GC profile
    window = 50
    step = 10
    profile = []
    if len(seq) >= window:
        for i in range(0, len(seq) - window + 1, step):
            sub = seq[i : i + window]
            sub_gc = (sub.count("G") + sub.count("C")) / window
            profile.append({"position": i + window // 2, "gc": round(sub_gc, 4)})

    return {
        "length": len(seq),
        "counts": counts,
        "gc_content": round(gc, 4),
        "at_content": round(at, 4),
        "gc_profile": profile,
        "n_count": seq.count("N"),
    }


def motif_density(hits: List[Dict[str, Any]], length: int) -> Dict[str, Any]:
    bins = 20
    bin_size = max(1, length // bins)
    counts = [0] * bins
    for h in hits:
        idx = min(bins - 1, h["start"] // bin_size)
        counts[idx] += 1
    return {
        "bins": bins,
        "bin_size": bin_size,
        "counts": counts,
        "centers": [int(i * bin_size + bin_size // 2) for i in range(bins)],
    }
