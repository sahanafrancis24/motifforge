"""Promoter engineering - identifies architectural deficiencies and proposes optimizations."""
from typing import List, Dict, Any
import networkx as nx


CORE_PROMOTER_ELEMENTS = ["TATA", "Inr", "DPE", "BRE", "MTE"]


def analyze_gc_balance(gc_content: float) -> Dict[str, Any]:
    optimal_range = (0.40, 0.65)
    in_range = optimal_range[0] <= gc_content <= optimal_range[1]
    if in_range:
        comment = "GC content within recommended promoter range (40-65%)."
    elif gc_content < optimal_range[0]:
        comment = "Low GC content - may reduce promoter strength and stability."
    else:
        comment = "High GC content - may form secondary structures and impede transcription."
    return {
        "value": gc_content,
        "optimal_range": optimal_range,
        "in_range": in_range,
        "comment": comment,
    }


def analyze_spacing(motif_hits: List[Dict[str, Any]], min_spacing: int = 10) -> Dict[str, Any]:
    sorted_hits = sorted(motif_hits, key=lambda h: h["start"])
    violations = []
    for i in range(len(sorted_hits) - 1):
        a, b = sorted_hits[i], sorted_hits[i + 1]
        gap = b["start"] - a["end"]
        if gap < min_spacing:
            violations.append(
                {
                    "a": a["name"],
                    "b": b["name"],
                    "a_position": a["start"],
                    "b_position": b["start"],
                    "gap": gap,
                    "severity": "high" if gap < 0 else "moderate",
                }
            )
    return {"min_spacing": min_spacing, "violations": violations, "count": len(violations)}


def analyze_connectivity_gaps(G: nx.Graph) -> Dict[str, Any]:
    isolated = [n for n in G.nodes() if G.degree(n) == 0]
    weakly_connected = [n for n in G.nodes() if G.degree(n) == 1]
    return {
        "isolated_nodes": isolated,
        "weakly_connected_nodes": weakly_connected,
        "isolated_count": len(isolated),
        "weak_count": len(weakly_connected),
    }


def analyze_redundancy(motif_hits: List[Dict[str, Any]], duplicate_threshold: int = 5) -> Dict[str, Any]:
    from collections import Counter
    counts = Counter(h["name"] for h in motif_hits)
    redundant = [
        {"name": name, "count": c}
        for name, c in counts.items()
        if c >= duplicate_threshold
    ]
    return {"threshold": duplicate_threshold, "redundant_motifs": redundant}


def analyze_missing_core_elements(motif_hits: List[Dict[str, Any]]) -> Dict[str, Any]:
    present_names = {h["name"].upper() for h in motif_hits}
    missing = []
    for el in CORE_PROMOTER_ELEMENTS:
        if not any(el.upper() in n for n in present_names):
            missing.append(el)
    return {"missing": missing, "checked": CORE_PROMOTER_ELEMENTS}


def generate_suggestions(
    gc_analysis: Dict[str, Any],
    spacing_analysis: Dict[str, Any],
    connectivity_analysis: Dict[str, Any],
    redundancy_analysis: Dict[str, Any],
    missing_core: Dict[str, Any],
) -> List[Dict[str, Any]]:
    suggestions: List[Dict[str, Any]] = []

    if not gc_analysis["in_range"]:
        if gc_analysis["value"] < gc_analysis["optimal_range"][0]:
            suggestions.append(
                {
                    "action": "increase_gc",
                    "category": "sequence",
                    "priority": "high",
                    "description": "Introduce GC-rich motif sites (Sp1, KLF, EGR1) to elevate promoter GC content.",
                }
            )
        else:
            suggestions.append(
                {
                    "action": "reduce_gc",
                    "category": "sequence",
                    "priority": "moderate",
                    "description": "Replace dense GC-rich elements with AT-rich spacers to mitigate secondary structure.",
                }
            )

    for v in spacing_analysis["violations"][:5]:
        suggestions.append(
            {
                "action": "fix_spacing",
                "category": "geometry",
                "priority": v["severity"],
                "description": f"Increase spacing between {v['a']} ({v['a_position']}) and {v['b']} ({v['b_position']}); current gap {v['gap']}bp.",
            }
        )

    for node in connectivity_analysis["isolated_nodes"][:5]:
        suggestions.append(
            {
                "action": "increase_connectivity",
                "category": "graph",
                "priority": "moderate",
                "description": f"Motif '{node}' is isolated. Co-locate with a complementary TF to form functional context.",
            }
        )

    for r in redundancy_analysis["redundant_motifs"][:5]:
        suggestions.append(
            {
                "action": "reduce_redundancy",
                "category": "composition",
                "priority": "low",
                "description": f"'{r['name']}' appears {r['count']}x. Consider pruning to reduce binding interference.",
            }
        )

    for el in missing_core["missing"]:
        suggestions.append(
            {
                "action": "add_core_element",
                "category": "composition",
                "priority": "high",
                "description": f"Core promoter element '{el}' not detected. Adding it may improve transcription initiation accuracy.",
            }
        )

    return suggestions


def predict_score_improvement(current_score: float, suggestions: List[Dict[str, Any]]) -> float:
    """Estimated architecture score after applying suggestions."""
    bonus = 0.0
    for s in suggestions:
        if s["priority"] == "high":
            bonus += 4.0
        elif s["priority"] == "moderate":
            bonus += 2.0
        else:
            bonus += 1.0
    predicted = min(100.0, current_score + bonus)
    return round(predicted, 2)
