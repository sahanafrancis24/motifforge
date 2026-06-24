"""Architecture mining - frequent patterns and motif co-occurrence."""
from typing import List, Dict, Any
from collections import Counter
import itertools
import networkx as nx


def motif_cooccurrence(motif_hits: List[Dict[str, Any]], window: int = 150) -> Dict[str, Any]:
    """Compute pairwise motif co-occurrence within a positional window."""
    sorted_hits = sorted(motif_hits, key=lambda h: h["start"])
    pair_counts: Counter = Counter()
    n = len(sorted_hits)
    for i in range(n):
        a = sorted_hits[i]
        for j in range(i + 1, n):
            b = sorted_hits[j]
            if b["start"] - a["start"] > window:
                break
            if a["name"] == b["name"]:
                continue
            key = tuple(sorted((a["name"], b["name"])))
            pair_counts[key] += 1
    matrix_pairs = sorted(
        [{"a": k[0], "b": k[1], "count": v} for k, v in pair_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )
    return {"pairs": matrix_pairs, "window": window}


def frequent_triplets(motif_hits: List[Dict[str, Any]], window: int = 200, min_support: int = 1) -> List[Dict[str, Any]]:
    """Find frequent motif triplets within positional window."""
    sorted_hits = sorted(motif_hits, key=lambda h: h["start"])
    triplet_counts: Counter = Counter()
    n = len(sorted_hits)
    for i in range(n):
        cluster = [sorted_hits[i]]
        for j in range(i + 1, n):
            if sorted_hits[j]["start"] - sorted_hits[i]["start"] > window:
                break
            cluster.append(sorted_hits[j])
        names = list({h["name"] for h in cluster})
        for combo in itertools.combinations(sorted(names), 3):
            triplet_counts[combo] += 1
    output = [
        {"motifs": list(t), "support": c}
        for t, c in triplet_counts.items()
        if c >= min_support
    ]
    output.sort(key=lambda x: x["support"], reverse=True)
    return output[:30]


def architecture_signature(G: nx.Graph) -> Dict[str, Any]:
    """Compute a fingerprint of the regulatory architecture."""
    degree_seq = sorted([d for _, d in G.degree()], reverse=True)
    triangles = sum(nx.triangles(G).values()) // 3 if G.number_of_nodes() else 0
    return {
        "degree_sequence_top10": degree_seq[:10],
        "triangle_count": triangles,
        "transitivity": round(nx.transitivity(G), 4) if G.number_of_nodes() else 0.0,
        "avg_shortest_path": _safe_avg_shortest_path(G),
        "diameter": _safe_diameter(G),
    }


def _safe_avg_shortest_path(G: nx.Graph) -> float:
    if G.number_of_nodes() < 2:
        return 0.0
    try:
        if nx.is_connected(G):
            return round(nx.average_shortest_path_length(G), 4)
        largest = max(nx.connected_components(G), key=len)
        sub = G.subgraph(largest)
        return round(nx.average_shortest_path_length(sub), 4)
    except Exception:
        return 0.0


def _safe_diameter(G: nx.Graph) -> int:
    if G.number_of_nodes() < 2:
        return 0
    try:
        if nx.is_connected(G):
            return int(nx.diameter(G))
        largest = max(nx.connected_components(G), key=len)
        sub = G.subgraph(largest)
        return int(nx.diameter(sub))
    except Exception:
        return 0
