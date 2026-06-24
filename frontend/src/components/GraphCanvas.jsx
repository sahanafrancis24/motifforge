import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import svgExporter from "cytoscape-svg";

if (!cytoscape.prototype.hasInitialised) {
  cytoscape.use(fcose);
  cytoscape.use(svgExporter);
  cytoscape.prototype.hasInitialised = true;
}

const STYLE = [
  {
    selector: "node",
    style: {
      "background-color": "#3B82F6",
      "background-opacity": 0.85,
      label: "data(label)",
      color: "#E2E8F0",
      "font-family": "IBM Plex Mono, monospace",
      "font-size": 11,
      "text-valign": "center",
      "text-halign": "center",
      "text-outline-width": 2,
      "text-outline-color": "#060913",
      width: "mapData(count, 1, 30, 22, 56)",
      height: "mapData(count, 1, 30, 22, 56)",
      "border-width": 1,
      "border-color": "#1E293B",
    },
  },
  {
    selector: "node[tf_class = 'Zinc-coordinating']",
    style: { "background-color": "#10B981" },
  },
  {
    selector: "node[tf_class = 'Basic helix-loop-helix factors (bHLH)']",
    style: { "background-color": "#F59E0B" },
  },
  {
    selector: "node[tf_class = 'Basic leucine zipper factors (bZIP)']",
    style: { "background-color": "#A855F7" },
  },
  {
    selector: "node:selected",
    style: { "border-color": "#22D3EE", "border-width": 3 },
  },
  {
    selector: "edge",
    style: {
      width: "mapData(co_binding_count, 1, 20, 0.6, 4)",
      "line-color": "#475569",
      "line-opacity": 0.5,
      "curve-style": "bezier",
      "target-arrow-shape": "none",
      label: "",
    },
  },
  {
    selector: "edge:selected",
    style: { "line-color": "#22D3EE", "line-opacity": 1 },
  },
];

export default function GraphCanvas({ elements, height = 520, testId, onSelect }) {
  const ref = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }
    const nodes = (elements?.nodes || []).map((n) => ({ data: n.data }));
    const edges = (elements?.edges || []).map((e) => ({ data: e.data }));
    cyRef.current = cytoscape({
      container: ref.current,
      elements: [...nodes, ...edges],
      style: STYLE,
      layout: {
        name: "fcose",
        animate: false,
        randomize: true,
        nodeRepulsion: 12000,
        idealEdgeLength: 90,
      },
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 4,
    });
    if (onSelect) {
      cyRef.current.on("tap", "node", (e) => onSelect(e.target.data()));
    }
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [elements, onSelect]);

  const fit = () => cyRef.current?.fit(undefined, 30);
  const reset = () => {
    cyRef.current?.zoom(1);
    cyRef.current?.center();
  };
  const downloadPng = () => {
    if (!cyRef.current) return;
    const data = cyRef.current.png({ bg: "#04060F", full: true, scale: 2 });
    const a = document.createElement("a");
    a.href = data;
    a.download = "motifforge_graph.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const downloadSvg = () => {
    if (!cyRef.current) return;
    const svgText = cyRef.current.svg({ scale: 1, full: true, bg: "#04060F" });
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "motifforge_graph.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        data-testid={testId}
        className="w-full bg-[#04060F] border border-slate-800 rounded-sm"
        style={{ height }}
      />
      <div className="absolute top-2 right-2 flex gap-2">
        <button
          onClick={fit}
          data-testid="graph-fit"
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          Fit
        </button>
        <button
          onClick={reset}
          data-testid="graph-reset"
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          Reset
        </button>
        <button
          onClick={downloadPng}
          data-testid="graph-png"
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 bg-blue-600/80 border border-blue-500 text-white hover:bg-blue-600"
        >
          PNG
        </button>
        <button
          onClick={downloadSvg}
          data-testid="graph-svg"
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 bg-blue-600/80 border border-blue-500 text-white hover:bg-blue-600"
        >
          SVG
        </button>
      </div>
    </div>
  );
}
