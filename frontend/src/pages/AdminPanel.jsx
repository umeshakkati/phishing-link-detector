import { useEffect, useState } from "react";
import { ShieldAlert, Users, Ban, BarChart2, Trash2, ToggleLeft, ToggleRight, Plus, Loader2 } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [scans, setScans] = useState([]);
  const [banned, setBanned] = useState([]);
  const [banInput, setBanInput] = useState("");
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [user]);

  useEffect(() => {
    if (tab === "stats") api.get("/api/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    if (tab === "users") api.get("/api/admin/users").then((r) => setUsers(r.data)).catch(() => {});
    if (tab === "scans") api.get("/api/admin/scans?limit=50").then((r) => setScans(r.data)).catch(() => {});
    if (tab === "banned") api.get("/api/admin/banned").then((r) => setBanned(r.data)).catch(() => {});
  }, [tab]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const toggleUser = async (id) => {
    const res = await api.patch(`/api/admin/users/${id}/toggle`);
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: res.data.is_active } : u));
  };

  const setRole = async (id, role) => {
    await api.patch(`/api/admin/users/${id}/role?role=${role}`);
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
    flash("Role updated");
  };

  const banDomain = async () => {
    if (!banInput.trim()) return;
    setLoading(true);
    try {
      const res = await api.post(`/api/admin/banned?domain=${encodeURIComponent(banInput.trim())}&reason=${encodeURIComponent(banReason)}`);
      setBanned((prev) => [res.data, ...prev]);
      setBanInput(""); setBanReason("");
      flash("Domain banned");
    } catch (e) { flash(e.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };

  const unban = async (id) => {
    await api.delete(`/api/admin/banned/${id}`);
    setBanned((prev) => prev.filter((b) => b.id !== id));
  };

  const TABS = [
    { id: "stats", label: "Stats", Icon: BarChart2 },
    { id: "users", label: "Users", Icon: Users },
    { id: "scans", label: "All Scans", Icon: ShieldAlert },
    { id: "banned", label: "Banned Domains", Icon: Ban },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-7 h-7 text-red-400" />
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
      </div>

      {msg && <div className="mb-4 bg-green-900/30 border border-green-800 text-green-400 px-4 py-2 rounded-lg text-sm">{msg}</div>}

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-blue-600 text-white" : "btn-secondary"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === "stats" && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Users", value: stats.total_users, color: "text-blue-400" },
            { label: "Total Scans", value: stats.total_scans, color: "text-purple-400" },
            { label: "Phishing", value: stats.phishing, color: "text-red-400" },
            { label: "Suspicious", value: stats.suspicious, color: "text-yellow-400" },
            { label: "Legitimate", value: stats.legitimate, color: "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="card text-center py-6">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value?.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-2 font-medium">User</th>
                <th className="text-left pb-2 font-medium">Email</th>
                <th className="text-left pb-2 font-medium">Role</th>
                <th className="text-left pb-2 font-medium">Scans</th>
                <th className="text-left pb-2 font-medium">Status</th>
                <th className="text-left pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-2 pr-4 font-medium text-white">{u.username}</td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">{u.email}</td>
                  <td className="py-2 pr-4">
                    <select
                      value={u.role}
                      onChange={(e) => setRole(u.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-300"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-2 pr-4 text-gray-400">{u.scan_count}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                      {u.is_active ? "active" : "banned"}
                    </span>
                  </td>
                  <td className="py-2">
                    <button onClick={() => toggleUser(u.id)} className="text-gray-500 hover:text-white transition-colors p-1" title="Toggle active">
                      {u.is_active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-red-400" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All Scans */}
      {tab === "scans" && (
        <div className="card overflow-x-auto">
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
              {scans.map((s) => (
                <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-2 pr-4 text-gray-300 max-w-xs truncate text-xs font-mono">{s.url}</td>
                  <td className="py-2 pr-4"><span className={`badge-${s.prediction}`}>{s.prediction.toUpperCase()}</span></td>
                  <td className={`py-2 pr-4 font-semibold ${s.risk_score >= 60 ? "text-red-400" : s.risk_score >= 30 ? "text-yellow-400" : "text-green-400"}`}>
                    {s.risk_score}%
                  </td>
                  <td className="py-2 text-gray-500 text-xs">{new Date(s.scanned_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Banned Domains */}
      {tab === "banned" && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Ban a Domain</h3>
            <div className="flex gap-2 flex-wrap">
              <input className="input text-sm flex-1 min-w-0" placeholder="domain.com" value={banInput} onChange={(e) => setBanInput(e.target.value)} />
              <input className="input text-sm w-48" placeholder="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
              <button onClick={banDomain} disabled={loading || !banInput.trim()} className="btn-primary flex items-center gap-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ban
              </button>
            </div>
          </div>

          <div className="card overflow-x-auto">
            {banned.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">No banned domains.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2 font-medium">Domain</th>
                    <th className="text-left pb-2 font-medium">Reason</th>
                    <th className="text-left pb-2 font-medium">Banned At</th>
                    <th className="text-left pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {banned.map((b) => (
                    <tr key={b.id} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 text-red-400 font-mono text-xs">{b.domain}</td>
                      <td className="py-2 pr-4 text-gray-400 text-xs">{b.reason || "—"}</td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">{new Date(b.banned_at).toLocaleDateString()}</td>
                      <td className="py-2">
                        <button onClick={() => unban(b.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
