import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";

import Landing from "@/pages/Landing";
import ExtractionPage from "@/pages/ExtractionPage";
import GraphStudioPage from "@/pages/GraphStudioPage";
import CharacterizationPage from "@/pages/CharacterizationPage";
import MiningPage from "@/pages/MiningPage";
import EngineeringPage from "@/pages/EngineeringPage";
import ExportPage from "@/pages/ExportPage";
import ComparePage from "@/pages/ComparePage";
import AnalysisLoader from "@/pages/AnalysisLoader";

function App() {
  return (
    <div className="App">
      {/* Global Video Background */}
      <div className="video-background">
        <video autoPlay muted loop playsInline preload="auto">
          <source src="/motifforge-bg.mp4" type="video/mp4" />
        </video>

        {/* Dark Scientific Overlay */}
        <div className="video-overlay"></div>
      </div>

      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/extract" element={<ExtractionPage />} />
            <Route path="/graph" element={<GraphStudioPage />} />
            <Route path="/characterize" element={<CharacterizationPage />} />
            <Route path="/mining" element={<MiningPage />} />
            <Route path="/engineer" element={<EngineeringPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/analysis/:id" element={<AnalysisLoader />} />
          </Routes>
        </Layout>

        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            classNames: {
              toast:
                "!bg-[#0A0F1D] !border-slate-800 !text-slate-200",
            },
          }}
        />
      </BrowserRouter>
    </div>
  );
}

export default App;
