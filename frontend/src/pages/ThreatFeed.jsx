import { useEffect, useState } from "react";
import { Globe, RefreshCw, AlertTriangle } from "lucide-react";
import api from "../api/client";

export default function ThreatFeed() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([
        api.get("/api/scan/feed?limit=50"),
        api.get("/api/admin/stats"),
      ]);
      setFeed(f.data);
      setGlobalStats(s.data);
    } catch {
      const f = await api.get("/api/scan/feed?limit=50").catch(() => ({ data: [] }));
      setFeed(f.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Globe className="w-7 h-7 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Live Threat Feed</h1>
            <p className="text-gray-500 text-sm">Recently detected phishing and suspicious URLs — public, no login required.</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Global stats banner */}
      {globalStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Scans", value: globalStats.total_scans, color: "text-blue-400" },
            { label: "Phishing Caught", value: globalStats.phishing, color: "text-red-400" },
            { label: "Suspicious", value: globalStats.suspicious, color: "text-yellow-400" },
            { label: "Total Users", value: globalStats.total_users, color: "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="card text-center py-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        <h2 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" /> Recent Threats
        </h2>
        {loading ? (
          <p className="text-center text-gray-600 py-8">Loading...</p>
        ) : feed.length === 0 ? (
          <p className="text-center text-gray-600 py-8">No threats detected yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-2 font-medium">URL</th>
                <th className="text-left pb-2 font-medium">Verdict</th>
                <th className="text-left pb-2 font-medium">Risk</th>
                <th className="text-left pb-2 font-medium">Detected</th>
              </tr>
            </thead>
            <tbody>
              {feed.map((r, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-2 pr-4 text-gray-300 max-w-xs truncate font-mono text-xs">{r.url}</td>
                  <td className="py-2 pr-4">
                    <span className={`badge-${r.prediction}`}>{r.prediction.toUpperCase()}</span>
                  </td>
                  <td className={`py-2 pr-4 font-semibold ${r.risk_score >= 60 ? "text-red-400" : "text-yellow-400"}`}>
                    {r.risk_score}%
                  </td>
                  <td className="py-2 text-gray-500 text-xs">{new Date(r.scanned_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
