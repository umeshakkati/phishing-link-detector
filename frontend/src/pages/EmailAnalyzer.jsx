import { useState } from "react";
import { Mail, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import api from "../api/client";

const SAMPLE = `Received: from mail.suspicious-domain.tk
From: "PayPal Support" <support@paypa1-secure.tk>
To: victim@example.com
Subject: Your account has been suspended

Please verify your account at https://paypal-secure-login.ml/verify?token=abc123
Or click here: http://192.168.1.1/paypal/login
Visit our help center: https://www.paypal.com`;

export default function EmailAnalyzer() {
  const [headers, setHeaders] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!headers.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await api.post("/api/scan/email-headers", { headers });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const phishingCount = result?.results?.filter((r) => r.prediction === "phishing").length ?? 0;
  const suspiciousCount = result?.results?.filter((r) => r.prediction === "suspicious").length ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Mail className="w-7 h-7 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Email Header Analyzer</h1>
          <p className="text-gray-500 text-sm">Paste raw email headers or body — all URLs are extracted and scanned automatically.</p>
        </div>
      </div>

      <div className="card mb-4">
        <label className="text-xs text-gray-400 mb-2 block">Paste email headers / body text</label>
        <textarea
          className="input text-sm h-48 resize-none font-mono"
          placeholder="Paste email headers or body here..."
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
        />
        <div className="flex gap-3 mt-3 flex-wrap">
          <button onClick={analyze} disabled={loading || !headers.trim()} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Analyze
          </button>
          <button onClick={() => setHeaders(SAMPLE)} className="btn-secondary text-sm">
            Load Sample
          </button>
          <button onClick={() => { setHeaders(""); setResult(null); }} className="btn-secondary text-sm">
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Analysis Summary</h2>
            <div className="flex gap-4 flex-wrap">
              <Chip label="URLs Found" value={result.urls_found} color="text-blue-400" />
              {phishingCount > 0 && <Chip label="Phishing" value={phishingCount} color="text-red-400" />}
              {suspiciousCount > 0 && <Chip label="Suspicious" value={suspiciousCount} color="text-yellow-400" />}
              <Chip
                label="Safe"
                value={result.results.filter((r) => r.prediction === "legitimate").length}
                color="text-green-400"
              />
            </div>
            {(phishingCount > 0 || suspiciousCount > 0) && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                This email contains {phishingCount + suspiciousCount} malicious or suspicious URL{phishingCount + suspiciousCount > 1 ? "s" : ""}. Do not click any links.
              </div>
            )}
            {phishingCount === 0 && suspiciousCount === 0 && result.urls_found > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                All URLs appear legitimate.
              </div>
            )}
          </div>

          {/* Per-URL results */}
          {result.results.map((r, i) => (
            <div key={i} className={`card border-l-4 ${
              r.prediction === "phishing" ? "border-red-600" :
              r.prediction === "suspicious" ? "border-yellow-600" : "border-green-700"
            }`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-mono break-all mb-1">{r.url}</p>
                  <span className={`badge-${r.prediction}`}>{r.prediction.toUpperCase()}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-2xl font-bold ${r.risk_score >= 60 ? "text-red-400" : r.risk_score >= 30 ? "text-yellow-400" : "text-green-400"}`}>
                    {r.risk_score}%
                  </p>
                  <p className="text-xs text-gray-500">risk score</p>
                </div>
              </div>
              {r.recommendations?.[0] && (
                <p className="text-xs text-gray-400 mt-2 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-yellow-500" />
                  {r.recommendations[0]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, color }) {
  return (
    <div className="bg-gray-800 rounded-lg px-4 py-2 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
