import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Key, Bell, Shield, Trash2, Copy, Plus, Sun, Moon, Loader2, CheckCircle } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState(null);
  const [whitelist, setWhitelist] = useState([]);
  const [newDomain, setNewDomain] = useState("");
  const [alertCfg, setAlertCfg] = useState({ enabled: false, min_risk_score: 60 });
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/api/apikeys"),
      api.get("/api/whitelist"),
      api.get("/api/alerts"),
    ]).then(([k, w, a]) => {
      setApiKeys(k.data);
      setWhitelist(w.data);
      setAlertCfg(a.data);
    }).catch(() => {});
  }, []);

  const flash = (msg) => { setSaved(msg); setTimeout(() => setSaved(""), 2500); };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/api/apikeys", { name: newKeyName.trim() });
      setCreatedKey(res.data.raw_key);
      setApiKeys((prev) => [res.data, ...prev]);
      setNewKeyName("");
    } catch (e) {
      flash(e.response?.data?.detail || "Failed to create key");
    } finally { setLoading(false); }
  };

  const revokeKey = async (id) => {
    await api.delete(`/api/apikeys/${id}`);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    try {
      const res = await api.post("/api/whitelist", { domain: newDomain.trim() });
      setWhitelist((prev) => [res.data, ...prev]);
      setNewDomain("");
      flash("Domain whitelisted");
    } catch (e) { flash(e.response?.data?.detail || "Failed"); }
  };

  const removeDomain = async (id) => {
    await api.delete(`/api/whitelist/${id}`);
    setWhitelist((prev) => prev.filter((d) => d.id !== id));
  };

  const saveAlerts = async () => {
    await api.put("/api/alerts", alertCfg);
    flash("Alert settings saved");
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); flash("Copied!"); };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <SettingsIcon className="w-7 h-7 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-900/30 border border-green-800 text-green-400 px-4 py-2 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4" /> {saved}
        </div>
      )}

      {/* Theme */}
      <Section icon={<Sun className="w-5 h-5 text-yellow-400" />} title="Appearance">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Current theme: <span className="text-white font-medium">{theme}</span></span>
          <button onClick={toggle} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            Switch to {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </Section>

      {/* API Keys */}
      <Section icon={<Key className="w-5 h-5 text-purple-400" />} title="API Keys" subtitle="Use these to call the scanner API programmatically (max 5).">
        {createdKey && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-3">
            <p className="text-xs text-yellow-400 mb-1">Copy this key now — it won't be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-white font-mono bg-gray-900 px-2 py-1 rounded flex-1 truncate">{createdKey}</code>
              <button onClick={() => copyToClipboard(createdKey)} className="btn-secondary p-1.5">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <input className="input text-sm" placeholder="Key name (e.g. My App)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
          <button onClick={createKey} disabled={loading || !newKeyName.trim()} className="btn-primary flex items-center gap-1 whitespace-nowrap">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
          </button>
        </div>
        {apiKeys.length === 0 ? (
          <p className="text-gray-600 text-sm">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm text-white font-medium">{k.name}</p>
                  <p className="text-xs text-gray-500">
                    Created {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used ? ` · Last used ${new Date(k.last_used).toLocaleDateString()}` : " · Never used"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${k.is_active ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-500"}`}>
                    {k.is_active ? "active" : "revoked"}
                  </span>
                  {k.is_active && (
                    <button onClick={() => revokeKey(k.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-600 mt-2">Usage: <code className="text-gray-400">Authorization: ApiKey pg_...</code></p>
      </Section>

      {/* Whitelist */}
      <Section icon={<Shield className="w-5 h-5 text-green-400" />} title="Whitelisted Domains" subtitle="Domains you trust — they'll always be marked as legitimate.">
        <div className="flex gap-2 mb-3">
          <input className="input text-sm" placeholder="e.g. google.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDomain()} />
          <button onClick={addDomain} disabled={!newDomain.trim()} className="btn-primary flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {whitelist.length === 0 ? (
          <p className="text-gray-600 text-sm">No whitelisted domains.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {whitelist.map((d) => (
              <div key={d.id} className="flex items-center gap-1.5 bg-green-900/30 border border-green-800 text-green-300 px-3 py-1 rounded-full text-sm">
                {d.domain}
                <button onClick={() => removeDomain(d.id)} className="hover:text-red-400 transition-colors ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Email Alerts */}
      <Section icon={<Bell className="w-5 h-5 text-blue-400" />} title="Email Alerts" subtitle="Get notified when a high-risk URL is scanned. Requires SMTP config on the server.">
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={alertCfg.enabled}
              onChange={(e) => setAlertCfg((p) => ({ ...p, enabled: e.target.checked }))}
              className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-300">Enable email alerts</span>
          </label>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Minimum risk score to trigger alert: <span className="text-white">{alertCfg.min_risk_score}%</span></label>
            <input type="range" min="0" max="100" step="5"
              value={alertCfg.min_risk_score}
              onChange={(e) => setAlertCfg((p) => ({ ...p, min_risk_score: Number(e.target.value) }))}
              className="w-full accent-blue-500" />
            <div className="flex justify-between text-xs text-gray-600 mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
          </div>
          <button onClick={saveAlerts} className="btn-primary text-sm py-1.5">Save Alert Settings</button>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, subtitle, children }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
