"""Export Center - FASTA, CSV, JSON, GraphML, PDF outputs."""
import io
import csv
import json
from typing import Dict, Any, List
import networkx as nx
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


def to_fasta(header: str, sequence: str, width: int = 60) -> str:
    chunks = [sequence[i : i + width] for i in range(0, len(sequence), width)]
    return f">{header}\n" + "\n".join(chunks) + "\n"


def motifs_to_csv(motif_hits: List[Dict[str, Any]]) -> str:
    output = io.StringIO()
    if not motif_hits:
        return ""
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "name",
            "matrix_id",
            "tf_class",
            "tf_family",
            "start",
            "end",
            "strand",
            "score",
            "rel_score",
            "length",
            "consensus",
        ],
    )
    writer.writeheader()
    for h in motif_hits:
        writer.writerow({k: h.get(k, "") for k in writer.fieldnames})
    return output.getvalue()


def graph_to_graphml(G: nx.Graph) -> str:
    buf = io.BytesIO()
    H = nx.Graph()
    for n, data in G.nodes(data=True):
        clean = {k: v for k, v in data.items() if not isinstance(v, list)}
        H.add_node(n, **clean)
    for u, v, data in G.edges(data=True):
        clean = {k: val for k, val in data.items() if not isinstance(val, list)}
        H.add_edge(u, v, **clean)
    nx.write_graphml(H, buf)
    return buf.getvalue().decode("utf-8")


def build_pdf_report(project: Dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=f"MotifForge Report - {project.get('gene_symbol', '')}")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        textColor=colors.HexColor("#1E3A8A"),
        fontSize=22,
        spaceAfter=18,
    )
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor=colors.HexColor("#1F2937"))
    body = styles["BodyText"]

    elements = []
    elements.append(Paragraph("MotifForge Scientific Report", title_style))
    elements.append(Paragraph(f"Gene: <b>{project.get('gene_symbol', 'n/a')}</b>", body))
    elements.append(Paragraph(f"Generated: {project.get('generated_at', '')}", body))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("1. Promoter Information", h2))
    promoter = project.get("promoter", {}) or {}
    promoter_rows = [
        ["Ensembl ID", promoter.get("ensembl_id", "-")],
        ["Chromosome", promoter.get("chromosome", "-")],
        ["Strand", str(promoter.get("strand", "-"))],
        ["Length (bp)", str(promoter.get("length", "-"))],
        ["Assembly", promoter.get("assembly", "-")],
        ["Source", promoter.get("source", "-")],
    ]
    elements.append(_table(promoter_rows))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("2. Sequence Statistics", h2))
    stats = project.get("stats", {}) or {}
    stats_rows = [
        ["GC content", f"{stats.get('gc_content', '-'):.4f}" if isinstance(stats.get("gc_content"), float) else "-"],
        ["AT content", f"{stats.get('at_content', '-'):.4f}" if isinstance(stats.get("at_content"), float) else "-"],
        ["Length", str(stats.get("length", "-"))],
    ]
    elements.append(_table(stats_rows))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("3. Detected Motifs", h2))
    motifs = project.get("motifs", []) or []
    elements.append(Paragraph(f"Total occurrences: <b>{len(motifs)}</b>", body))
    if motifs:
        table_data = [["Name", "Class", "Start", "End", "Strand", "Score"]]
        for m in motifs[:30]:
            table_data.append(
                [
                    str(m.get("name", "")),
                    str(m.get("tf_class", "") or ""),
                    str(m.get("start", "")),
                    str(m.get("end", "")),
                    str(m.get("strand", "")),
                    f"{m.get('rel_score', 0):.3f}",
                ]
            )
        elements.append(_table(table_data, header=True))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("4. Network Topology", h2))
    graph_stats = project.get("graph_stats", {}) or {}
    elements.append(
        _table(
            [
                ["Node count", str(graph_stats.get("node_count", "-"))],
                ["Edge count", str(graph_stats.get("edge_count", "-"))],
                ["Density", str(graph_stats.get("density", "-"))],
                ["Average degree", str(graph_stats.get("average_degree", "-"))],
                ["Communities", str(graph_stats.get("community_count", "-"))],
            ]
        )
    )
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("5. Architecture Scores", h2))
    scores = project.get("scores", {}) or {}
    elements.append(
        _table(
            [
                ["Complexity", str(scores.get("complexity", "-"))],
                ["Topology", str(scores.get("topology", "-"))],
                ["Architecture", str(scores.get("architecture", "-"))],
                ["Modularity", str(scores.get("modularity", "-"))],
                ["Quality", str(scores.get("quality", "-"))],
            ]
        )
    )

    elements.append(Spacer(1, 12))
    elements.append(Paragraph("6. Engineering Suggestions", h2))
    suggestions = project.get("suggestions", []) or []
    if not suggestions:
        elements.append(Paragraph("No suggestions generated.", body))
    else:
        for s in suggestions[:15]:
            elements.append(
                Paragraph(
                    f"<b>[{s.get('priority','')}]</b> {s.get('action','')}: {s.get('description','')}",
                    body,
                )
            )

    elements.append(PageBreak())
    elements.append(Paragraph("7. References", h2))
    refs = [
        "JASPAR (https://jaspar.genereg.net) - Open-access database of transcription factor binding profiles.",
        "Ensembl REST API (https://rest.ensembl.org) - Genome annotation and sequence retrieval.",
        "UCSC Genome Browser PhyloP track (https://genome.ucsc.edu) - Conservation scoring.",
        "NetworkX - Hagberg, Schult, Swart. Exploring network structure, dynamics, and function using NetworkX.",
        "BioPython - Cock et al. Biopython: freely available Python tools for computational molecular biology and bioinformatics.",
    ]
    for r in refs:
        elements.append(Paragraph(f"• {r}", body))

    doc.build(elements)
    return buf.getvalue()


def _table(data, header: bool = False) -> Table:
    t = Table(data, hAlign="LEFT")
    style = TableStyle(
        [
            ("FONT", (0, 0), (-1, -1), "Helvetica", 9),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
    )
    if header:
        style.add("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2937"))
        style.add("TEXTCOLOR", (0, 0), (-1, 0), colors.white)
        style.add("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 10)
    t.setStyle(style)
    return t


def export_json_payload(project: Dict[str, Any]) -> str:
    return json.dumps(project, indent=2, default=str)
