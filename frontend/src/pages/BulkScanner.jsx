import { useState, useCallback } from "react";
import { Layers, Loader2, Download, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import api from "../api/client";

const PRED_COLOR = { phishing: "text-red-400", suspicious: "text-yellow-400", legitimate: "text-green-400", error: "text-gray-400" };

export default function BulkScanner() {
  const [text, setText] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parseUrls = (raw) =>
    raw.split(/[\n,\s]+/).map((u) => u.trim()).filter((u) => u.length > 0).slice(0, 50);

  const onDrop = useCallback((files) => {
    const reader = new FileReader();
    reader.onload = (e) => setText((e.target.result || "").slice(0, 20000));
    reader.readAsText(files[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "text/*": [".txt", ".csv"] }, multiple: false,
  });

  const scan = async () => {
    const urls = parseUrls(text);
    if (!urls.length) return;
    setLoading(true); setError(""); setResults(null);
    try {
      const res = await api.post("/api/scan/bulk", { urls });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Bulk scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!results) return;
    const header = "url,prediction,risk_score\n";
    const rows = results.results.map((r) => `"${r.url}",${r.prediction},${r.risk_score}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bulk_scan_results.csv";
    a.click();
  };

  const urlCount = parseUrls(text).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Layers className="w-7 h-7 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Bulk URL Scanner</h1>
          <p className="text-gray-500 text-sm">Scan up to 50 URLs at once. Paste URLs or upload a .txt/.csv file.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Paste URLs (one per line or comma-separated)</label>
          <textarea
            className="input text-sm h-48 resize-none font-mono"
            placeholder={"https://example.com\nhttps://another.com\n..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-gray-600 mt-1">{urlCount} URL{urlCount !== 1 ? "s" : ""} detected{urlCount >= 50 ? " (max 50)" : ""}</p>
        </div>

        <div
          {...getRootProps()}
          className={`card border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-colors h-48 ${
            isDragActive ? "border-blue-500 bg-blue-900/10" : "border-gray-700 hover:border-gray-600"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-gray-500 mb-2" />
          <p className="text-gray-400 text-sm">Drop a .txt or .csv file</p>
          <p className="text-gray-600 text-xs mt-1">One URL per line or comma-separated</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={scan}
          disabled={loading || urlCount === 0}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
          Scan {urlCount > 0 ? urlCount : ""} URL{urlCount !== 1 ? "s" : ""}
        </button>
        {results && (
          <button onClick={downloadCsv} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Download CSV
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {results && (
        <div className="mt-6 card overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-400">Results — {results.total} URLs scanned</h2>
            <div className="flex gap-3 text-xs">
              <span className="text-red-400">{results.results.filter((r) => r.prediction === "phishing").length} phishing</span>
              <span className="text-yellow-400">{results.results.filter((r) => r.prediction === "suspicious").length} suspicious</span>
              <span className="text-green-400">{results.results.filter((r) => r.prediction === "legitimate").length} legitimate</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-2 font-medium">#</th>
                <th className="text-left pb-2 font-medium">URL</th>
                <th className="text-left pb-2 font-medium">Result</th>
                <th className="text-left pb-2 font-medium">Risk</th>
                <th className="text-left pb-2 font-medium">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {results.results.map((r, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-2 pr-3 text-gray-600">{i + 1}</td>
                  <td className="py-2 pr-4 text-gray-300 max-w-xs truncate">{r.url}</td>
                  <td className="py-2 pr-4">
                    <span className={`badge-${r.prediction} text-xs`}>{r.prediction.toUpperCase()}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={PRED_COLOR[r.prediction] || "text-gray-400"}>{r.risk_score}%</span>
                  </td>
                  <td className="py-2 text-gray-500 text-xs max-w-xs truncate">{r.recommendations?.[0] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
