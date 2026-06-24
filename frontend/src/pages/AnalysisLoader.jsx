import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useMotifStore } from "@/store/useStore";

export default function AnalysisLoader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setExtraction = useMotifStore((s) => s.setExtraction);
  const reset = useMotifStore((s) => s.reset);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        reset();
        const data = await api.getExtraction(id);
        if (cancelled) return;
        setExtraction(data);
        toast.success(`Loaded shared analysis · ${data.promoter?.gene_symbol || "sequence"}`);
        navigate("/extract", { replace: true });
      } catch (e) {
        if (cancelled) return;
        toast.error(
          e?.response?.status === 404
            ? "Shared analysis not found or expired"
            : "Failed to load shared analysis"
        );
        navigate("/", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
        <div className="mt-3 text-sm font-mono text-slate-400">Loading shared analysis…</div>
        <div className="text-[11px] text-slate-500 font-mono mt-1">{id}</div>
      </div>
    </div>
  );
}
