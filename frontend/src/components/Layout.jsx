import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Dna,
  Workflow,
  Network,
  GitBranch,
  PieChart,
  FlaskConical,
  Download,
  Home,
  CircleDot,
  GitCompare,
} from "lucide-react";
import { TIDS } from "@/constants/tids";

const NAV = [
  { to: "/", label: "Home", icon: Home, tid: TIDS.navHome },
  { to: "/extract", label: "M1 · Extraction", icon: Dna, tid: TIDS.navExtraction, code: "01" },
  { to: "/graph", label: "M2 · Graph Studio", icon: Network, tid: TIDS.navGraph, code: "02" },
  { to: "/characterize", label: "M3 · Architecture", icon: GitBranch, tid: TIDS.navCharacterization, code: "03" },
  { to: "/mining", label: "M4 · Mining", icon: PieChart, tid: TIDS.navMining, code: "04" },
  { to: "/engineer", label: "M5 · Engineering", icon: FlaskConical, tid: TIDS.navEngineering, code: "05" },
  { to: "/compare", label: "M+ · Compare", icon: GitCompare, tid: TIDS.navCompare, code: "★" },
  { to: "/export", label: "M6 · Export Center", icon: Download, tid: TIDS.navExport, code: "06" },
];

export default function Layout({ children }) {
  const loc = useLocation();
  const isHome = loc.pathname === "/";

  return (
    <div className="min-h-screen bg-[#060913] text-slate-200 flex">
      {!isHome && (
        <aside className="w-60 shrink-0 border-r border-slate-800 bg-[#0A0F1D] flex flex-col sticky top-0 h-screen">
          <Link
            to="/"
            data-testid={TIDS.brandLogo}
            className="px-5 py-4 border-b border-slate-800 flex items-center gap-2"
          >
            <BrandMark />
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold text-slate-100 tracking-tight">
                MotifForge
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Regulatory DNA Lab
              </span>
            </div>
          </Link>

          <nav className="flex-1 py-3 px-2 space-y-0.5">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                data-testid={n.tid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm font-mono transition-colors rounded-sm ${
                    isActive
                      ? "bg-blue-600/10 text-blue-300 border-l-2 border-blue-500"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-2 border-transparent"
                  }`
                }
              >
                {n.code && (
                  <span className="text-[10px] text-slate-600 font-mono w-5">{n.code}</span>
                )}
                <n.icon className="w-4 h-4" />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="px-4 py-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              <CircleDot className="w-3 h-3 text-emerald-500" />
              <span>Live APIs</span>
            </div>
            <div className="mt-1 text-[10px] font-mono text-slate-500">
              NCBI · JASPAR · Ensembl · UCSC
            </div>
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="w-8 h-8 border border-blue-500/40 bg-blue-500/10 rounded-sm flex items-center justify-center">
      <Dna className="w-4 h-4 text-blue-400" />
    </div>
  );
}
