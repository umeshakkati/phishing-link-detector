import { useState, useCallback } from "react";
import { Search, Upload, Shield, Loader2, Camera } from "lucide-react";
import { useDropzone } from "react-dropzone";
import api from "../api/client";
import ScanResult from "../components/ScanResult";

export default function Scanner() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("url");
  const [withScreenshot, setWithScreenshot] = useState(false);

  const scanUrl = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await api.post(`/api/scan/url?screenshot=${withScreenshot}`, { url: url.trim() });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Scan failed. Check API connection.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (files) => {
    if (!files[0]) return;
    setLoading(true); setError(""); setResult(null);
    const form = new FormData();
    form.append("file", files[0]);
    try {
      const res = await api.post("/api/scan/qr", form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "QR scan failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [] }, multiple: false,
  });

  const TABS = [
    { id: "url", label: "URL Scanner", Icon: Search },
    { id: "qr", label: "QR Code", Icon: Upload },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-900/30 p-4 rounded-full border border-blue-800">
            <Shield className="w-10 h-10 text-blue-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">PhishGuard AI</h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          AI-powered phishing detection — ML model, VirusTotal, WHOIS, SSL, redirect tracking, typosquatting & more.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === id ? "bg-blue-600 text-white" : "btn-secondary"}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === "url" && (
        <>
          <form onSubmit={scanUrl} className="flex gap-2">
            <input
              className="input text-sm"
              placeholder="Enter URL to scan (e.g. https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
              disabled={loading || !url.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Scan
            </button>
          </form>
          <label className="flex items-center gap-2 mt-3 text-sm text-gray-400 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={withScreenshot}
              onChange={(e) => setWithScreenshot(e.target.checked)}
              className="rounded"
            />
            <Camera className="w-4 h-4" /> Capture screenshot (requires Playwright)
          </label>
        </>
      )}

      {tab === "qr" && (
        <div
          {...getRootProps()}
          className={`card border-2 border-dashed cursor-pointer text-center py-12 transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-900/10" : "border-gray-700 hover:border-gray-600"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Drop a QR code image here, or click to select</p>
          <p className="text-gray-600 text-xs mt-1">PNG, JPG, WEBP</p>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto mt-3" />}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {result && <ScanResult result={result} />}
    </div>
  );
}
