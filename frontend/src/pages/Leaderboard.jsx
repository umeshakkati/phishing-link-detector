import { useEffect, useState } from "react";
import { Trophy, Shield, ShieldX, RefreshCw } from "lucide-react";
import api from "../api/client";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/api/scan/leaderboard?limit=20")
      .then((r) => setRows(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 gap-3">
        <div className="flex items-center gap-3">
          <Trophy className="w-7 h-7 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-gray-500 text-sm">Top phishing hunters across the platform.</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-600 py-10">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-600 py-10">No data yet — start scanning!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-3 font-medium pl-2">Rank</th>
                <th className="text-left pb-3 font-medium">User</th>
                <th className="text-left pb-3 font-medium">
                  <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-blue-400" /> Total Scans</span>
                </th>
                <th className="text-left pb-3 font-medium">
                  <span className="flex items-center gap-1"><ShieldX className="w-3.5 h-3.5 text-red-400" /> Phishing Caught</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-800/50 transition-colors ${
                    i === 0 ? "bg-yellow-900/10" : i === 1 ? "bg-gray-800/20" : i === 2 ? "bg-orange-900/10" : "hover:bg-gray-800/20"
                  }`}
                >
                  <td className="py-3 pl-2 text-lg">{MEDALS[i] ?? <span className="text-gray-600 text-sm pl-1">{i + 1}</span>}</td>
                  <td className="py-3 font-semibold text-white">{r.username}</td>
                  <td className="py-3 text-blue-400 font-semibold">{r.total_scans.toLocaleString()}</td>
                  <td className="py-3">
                    <span className="text-red-400 font-semibold">{r.phishing_caught.toLocaleString()}</span>
                    {r.total_scans > 0 && (
                      <span className="text-gray-600 text-xs ml-2">
                        ({Math.round((r.phishing_caught / r.total_scans) * 100)}%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
