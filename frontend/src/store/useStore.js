import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useMotifStore = create(
  persist(
    (set, get) => ({
      // Extraction result
      extraction: null,
      setExtraction: (extraction) => set({ extraction }),

      // Graph state
      graph: null,
      setGraph: (graph) => set({ graph }),

      // Characterization
      characterization: null,
      setCharacterization: (characterization) => set({ characterization }),

      // Mining
      mining: null,
      setMining: (mining) => set({ mining }),

      // Engineering
      engineering: null,
      setEngineering: (engineering) => set({ engineering }),

      // Settings
      coBindingWindow: 100,
      setCoBindingWindow: (coBindingWindow) => set({ coBindingWindow }),
      threshold: 0.85,
      setThreshold: (threshold) => set({ threshold }),
      matrixLimit: 30,
      setMatrixLimit: (matrixLimit) => set({ matrixLimit }),
      upstream: 1500,
      setUpstream: (upstream) => set({ upstream }),
      downstream: 500,
      setDownstream: (downstream) => set({ downstream }),

      reset: () =>
        set({
          extraction: null,
          graph: null,
          characterization: null,
          mining: null,
          engineering: null,
        }),
    }),
    {
      name: "motifforge-state",
      partialize: (state) => ({
        coBindingWindow: state.coBindingWindow,
        threshold: state.threshold,
        matrixLimit: state.matrixLimit,
        upstream: state.upstream,
        downstream: state.downstream,
      }),
    }
  )
);
