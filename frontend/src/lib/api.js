import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({
  baseURL: API,
  timeout: 90000,
});

export default client;

export const api = {
  extract: (payload) => client.post("/extract", payload).then((r) => r.data),
  getExtraction: (id) => client.get(`/extract/${id}`).then((r) => r.data),
  listMatrices: (limit = 30, tax_id = 9606, collection = "CORE") =>
    client
      .get(`/jaspar/matrices?limit=${limit}&tax_id=${tax_id}&collection=${collection}`)
      .then((r) => r.data),
  metadata: () => client.get(`/jaspar/metadata`).then((r) => r.data),
  compare: (payload) => client.post("/compare", payload).then((r) => r.data),
  buildGraph: (payload) => client.post("/graph/build", payload).then((r) => r.data),
  analyzeGraph: (payload) =>
    client.post("/graph/analyze", payload).then((r) => r.data),
  characterize: (payload) =>
    client.post("/characterize", payload).then((r) => r.data),
  mining: (payload) => client.post("/mining", payload).then((r) => r.data),
  engineering: (payload) =>
    client.post("/engineering", payload).then((r) => r.data),
  exportFasta: (payload) =>
    client
      .post("/export/fasta", payload, { responseType: "blob" })
      .then((r) => r.data),
  exportCsv: (payload) =>
    client
      .post("/export/csv", payload, { responseType: "blob" })
      .then((r) => r.data),
  exportJson: (payload) =>
    client
      .post("/export/json", payload, { responseType: "blob" })
      .then((r) => r.data),
  exportGraphml: (payload) =>
    client
      .post("/export/graphml", payload, { responseType: "blob" })
      .then((r) => r.data),
  exportPdf: (payload) =>
    client
      .post("/export/pdf", payload, { responseType: "blob" })
      .then((r) => r.data),
};

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
