"""NetworkX-based regulatory graph analytics.

Builds a regulatory graph from motif hits using biologically motivated rules:
  - One node per unique TF (deduplicated by motif name)
  - Edges between TFs whose binding sites lie within a max distance window
  - Edge weight = inverse genomic distance
"""
from typing import List, Dict, Any
import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities


def build_regulatory_graph(
    motif_hits: List[Dict[str, Any]],
    co_binding_window: int = 100,
) -> nx.Graph:
    """Construct an undirected regulatory graph from motif hits."""
    G = nx.Graph()

    # Aggregate hits per TF
    tf_meta: Dict[str, Dict[str, Any]] = {}
    for h in motif_hits:
        name = h["name"]
        if name not in tf_meta:
            tf_meta[name] = {
                "name": name,
                "matrix_id": h.get("matrix_id"),
                "tf_class": h.get("tf_class"),
                "tf_family": h.get("tf_family"),
                "count": 0,
                "positions": [],
                "avg_score": 0.0,
            }
        tf_meta[name]["count"] += 1
        tf_meta[name]["positions"].append(h["start"])
        tf_meta[name]["avg_score"] += h.get("rel_score", 0.0)

    for name, meta in tf_meta.items():
        meta["avg_score"] = round(meta["avg_score"] / meta["count"], 4)
        G.add_node(
            name,
            kind="tf_motif",
            count=meta["count"],
            tf_class=meta["tf_class"],
            tf_family=meta["tf_family"],
            matrix_id=meta["matrix_id"],
            avg_score=meta["avg_score"],
            positions=meta["positions"],
        )

    # Edges via spatial co-occurrence
    sorted_hits = sorted(motif_hits, key=lambda h: h["start"])
    n = len(sorted_hits)
    edge_counts: Dict = {}
    for i in range(n):
        a = sorted_hits[i]
        for j in range(i + 1, n):
            b = sorted_hits[j]
            d = b["start"] - a["start"]
            if d > co_binding_window:
                break
            if a["name"] == b["name"]:
                continue
            key = tuple(sorted((a["name"], b["name"])))
            edge_counts.setdefault(key, []).append(d)

    for (u, v), dists in edge_counts.items():
        weight = round(len(dists) / (1.0 + sum(dists) / len(dists)), 4)
        G.add_edge(
            u,
            v,
            weight=weight,
            co_binding_count=len(dists),
            mean_distance=round(sum(dists) / len(dists), 2),
            kind="co_binding",
        )

    return G


def graph_to_cytoscape(G: nx.Graph) -> Dict[str, Any]:
    """Serialize graph to Cytoscape.js elements format."""
    nodes = []
    edges = []
    for n, data in G.nodes(data=True):
        nodes.append(
            {
                "data": {
                    "id": n,
                    "label": n,
                    **{k: v for k, v in data.items() if k != "positions"},
                    "positions_count": len(data.get("positions", [])),
                }
            }
        )
    for u, v, data in G.edges(data=True):
        edges.append(
            {
                "data": {
                    "id": f"{u}__{v}",
                    "source": u,
                    "target": v,
                    **data,
                }
            }
        )
    return {"nodes": nodes, "edges": edges}


def graph_statistics(G: nx.Graph) -> Dict[str, Any]:
    n = G.number_of_nodes()
    m = G.number_of_edges()
    avg_deg = round((2 * m) / n, 4) if n else 0.0
    density = round(nx.density(G), 6) if n > 1 else 0.0

    components = list(nx.connected_components(G))
    largest_cc = max((len(c) for c in components), default=0)

    try:
        communities = [list(c) for c in greedy_modularity_communities(G)]
    except Exception:
        communities = [[n] for n in G.nodes()]

    return {
        "node_count": n,
        "edge_count": m,
        "average_degree": avg_deg,
        "density": density,
        "connected_components": len(components),
        "largest_component_size": largest_cc,
        "community_count": len(communities),
        "communities": communities,
    }


def centrality_metrics(G: nx.Graph) -> Dict[str, Any]:
    if G.number_of_nodes() == 0:
        return {"degree": {}, "betweenness": {}, "closeness": {}, "eigenvector": {}}

    degree = nx.degree_centrality(G)
    betweenness = nx.betweenness_centrality(G, weight=None)
    closeness = nx.closeness_centrality(G)
    try:
        eigenvector = nx.eigenvector_centrality_numpy(G)
    except Exception:
        eigenvector = {n: 0.0 for n in G.nodes()}

    return {
        "degree": {k: round(v, 4) for k, v in degree.items()},
        "betweenness": {k: round(v, 4) for k, v in betweenness.items()},
        "closeness": {k: round(v, 4) for k, v in closeness.items()},
        "eigenvector": {k: round(v, 4) for k, v in eigenvector.items()},
    }


def architecture_scores(G: nx.Graph, centrality: Dict[str, Any]) -> Dict[str, Any]:
    """Composite scores describing the regulatory architecture."""
    n = G.number_of_nodes()
    m = G.number_of_edges()
    if n == 0:
        return {"complexity": 0.0, "topology": 0.0, "architecture": 0.0, "quality": "empty"}

    density = nx.density(G) if n > 1 else 0.0
    try:
        clustering = nx.average_clustering(G)
    except Exception:
        clustering = 0.0
    try:
        communities = list(greedy_modularity_communities(G))
        modularity = nx.algorithms.community.modularity(G, communities)
    except Exception:
        modularity = 0.0

    complexity = round(min(1.0, (m / max(1, n)) / 4.0) * 100, 2)
    topology = round((density * 0.4 + clustering * 0.3 + max(0.0, modularity) * 0.3) * 100, 2)

    degree_values = list(centrality.get("degree", {}).values())
    influence_spread = (
        round((1.0 - (max(degree_values) - min(degree_values)) if degree_values else 0.0) * 100, 2)
        if degree_values
        else 0.0
    )
    architecture = round((complexity * 0.4 + topology * 0.4 + influence_spread * 0.2), 2)

    quality = (
        "high" if architecture > 65 else "moderate" if architecture > 35 else "low"
    )
    return {
        "complexity": complexity,
        "topology": topology,
        "influence_spread": influence_spread,
        "architecture": architecture,
        "modularity": round(modularity, 4),
        "clustering_coefficient": round(clustering, 4),
        "quality": quality,
    }


def hub_motifs(centrality: Dict[str, Any], top_n: int = 10) -> List[Dict[str, Any]]:
    degree = centrality.get("degree", {})
    betweenness = centrality.get("betweenness", {})
    eigenvector = centrality.get("eigenvector", {})
    combined = []
    for name in degree:
        score = (
            degree.get(name, 0) * 0.4
            + betweenness.get(name, 0) * 0.3
            + eigenvector.get(name, 0) * 0.3
        )
        combined.append(
            {
                "name": name,
                "hub_score": round(score, 4),
                "degree": degree.get(name, 0),
                "betweenness": betweenness.get(name, 0),
                "eigenvector": eigenvector.get(name, 0),
            }
        )
    combined.sort(key=lambda x: x["hub_score"], reverse=True)
    return combined[:top_n]
