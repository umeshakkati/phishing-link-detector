import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ShieldX, ShieldAlert, Shield, History, Download, Search, Filter } from "lucide-react";
import api from "../api/client";

const PIE_COLORS = { phishing: "#ef4444", suspicious: "#eab308", legitimate: "#22c55e" };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [filterPred, setFilterPred] = useState("");
  const [minRisk, setMinRisk] = useState("");
  const [maxRisk, setMaxRisk] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadHistory = async (params = {}) => {
    const q = new URLSearchParams({ limit: 50, ...params });
    const res = await api.get(`/api/scan/history?${q}`);
    setHistory(res.data);
  };

  useEffect(() => {
    Promise.all([api.get("/api/scan/stats"), api.get("/api/scan/history?limit=50")])
      .then(([s, h]) => { setStats(s.data); setHistory(h.data); })
      .finally(() => setLoading(false));
  }, []);

  const applyFilters = () => {
    const p = {};
    if (search) p.search = search;
    if (filterPred) p.prediction = filterPred;
    if (minRisk !== "") p.min_risk = minRisk;
    if (maxRisk !== "") p.max_risk = maxRisk;
    loadHistory(p);
  };

  const clearFilters = () => {
    setSearch(""); setFilterPred(""); setMinRisk(""); setMaxRisk("");
    loadHistory();
  };

  const exportHistory = async (fmt) => {
    const res = await api.get(`/api/scan/history/export?fmt=${fmt}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scan_history.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading dashboard...</div>;

  const pieData = stats
    ? [
        { name: "Phishing", value: stats.phishing },
        { name: "Suspicious", value: stats.suspicious },
        { name: "Legitimate", value: stats.legitimate },
      ].filter((d) => d.value > 0)
    : [];

  const barData = history
    .slice(0, 10)
    .reverse()
    .map((s) => {
      let hostname = s.url;
      try { hostname = new URL(s.url.startsWith("http") ? s.url : `https://${s.url}`).hostname.replace("www.", "").slice(0, 18); } catch {}
      return { name: hostname, score: s.risk_score, prediction: s.prediction };
    });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-blue-400" /> Threat Dashboard
        </h1>
        <div className="flex gap-2">
          <button onClick={() => exportHistory("csv")} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => exportHistory("json")} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
            <Download className="w-4 h-4" /> JSON
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Shield className="w-5 h-5 text-blue-400" />} label="Total Scans" value={stats?.total ?? 0} />
        <StatCard icon={<ShieldX className="w-5 h-5 text-red-400" />} label="Phishing" value={stats?.phishing ?? 0} />
        <StatCard icon={<ShieldAlert className="w-5 h-5 text-yellow-400" />} label="Suspicious" value={stats?.suspicious ?? 0} />
        <StatCard icon={<Shield className="w-5 h-5 text-green-400" />} label="Legitimate" value={stats?.legitimate ?? 0} />
      </div>

      {/* Charts */}
      <div className="grid sm:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Threat Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((entry) => <Cell key={entry.name} fill={PIE_COLORS[entry.name.toLowerCase()]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {barData.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Recent Risk Scores</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  formatter={(v) => [`${v}%`, "Risk Score"]}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.prediction === "phishing" ? "#ef4444" : entry.prediction === "suspicious" ? "#eab308" : "#22c55e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* History with filters */}
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-400">Scan History</h2>
          <button onClick={() => setFiltersOpen((p) => !p)} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
        </div>

        {filtersOpen && (
          <div className="grid sm:grid-cols-4 gap-3 mb-4 p-4 bg-gray-800/50 rounded-lg">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Search URL</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                <input className="input text-xs pl-8 py-2" placeholder="keyword..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Verdict</label>
              <select className="input text-xs py-2" value={filterPred} onChange={(e) => setFilterPred(e.target.value)}>
                <option value="">All</option>
                <option value="phishing">Phishing</option>
                <option value="suspicious">Suspicious</option>
                <option value="legitimate">Legitimate</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Min Risk %</label>
              <input type="number" min="0" max="100" className="input text-xs py-2" placeholder="0" value={minRisk} onChange={(e) => setMinRisk(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max Risk %</label>
              <input type="number" min="0" max="100" className="input text-xs py-2" placeholder="100" value={maxRisk} onChange={(e) => setMaxRisk(e.target.value)} />
            </div>
            <div className="sm:col-span-4 flex gap-2">
              <button onClick={applyFilters} className="btn-primary text-xs py-1.5">Apply</button>
              <button onClick={clearFilters} className="btn-secondary text-xs py-1.5">Clear</button>
            </div>
          </div>
        )}

        {history.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">No scans match your filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-2 font-medium">URL</th>
                <th className="text-left pb-2 font-medium">Result</th>
                <th className="text-left pb-2 font-medium">Risk</th>
                <th className="text-left pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((scan) => (
                <tr key={scan.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-2 pr-4 text-gray-300 max-w-xs truncate">{scan.url}</td>
                  <td className="py-2 pr-4">
                    <span className={`badge-${scan.prediction}`}>{scan.prediction.toUpperCase()}</span>
                  </td>
                  <td className={`py-2 pr-4 font-semibold ${scan.risk_score >= 60 ? "text-red-400" : scan.risk_score >= 30 ? "text-yellow-400" : "text-green-400"}`}>
                    {scan.risk_score}%
                  </td>
                  <td className="py-2 text-gray-500 text-xs">{new Date(scan.scanned_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card flex items-center gap-3">
      <div className="bg-gray-800 p-2 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
