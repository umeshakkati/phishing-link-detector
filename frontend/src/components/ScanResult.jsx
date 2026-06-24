import {
  Shield, ShieldAlert, ShieldX, CheckCircle, XCircle,
  AlertCircle, Clock, Lock, Globe, ArrowRight, AlertTriangle, Camera
} from "lucide-react";
import RiskMeter from "./RiskMeter";

const ICONS = {
  phishing: <ShieldX className="w-6 h-6 text-red-400" />,
  suspicious: <ShieldAlert className="w-6 h-6 text-yellow-400" />,
  legitimate: <Shield className="w-6 h-6 text-green-400" />,
  error: <AlertCircle className="w-6 h-6 text-gray-400" />,
};
const LABELS = {
  phishing: { text: "PHISHING", cls: "badge-phishing" },
  suspicious: { text: "SUSPICIOUS", cls: "badge-suspicious" },
  legitimate: { text: "LEGITIMATE", cls: "badge-legitimate" },
  error: { text: "ERROR", cls: "badge-error" },
};

export default function ScanResult({ result }) {
  const { prediction, risk_score, url, features, virustotal, whois, ssl,
          redirect_chain, typosquatting, screenshot, recommendations } = result;
  const label = LABELS[prediction] || LABELS.suspicious;

  return (
    <div className="space-y-4 mt-6">
      {/* Header */}
      <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {ICONS[prediction]}
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1 break-all">{url}</p>
            <span className={label.cls}>{label.text}</span>
          </div>
        </div>
        <RiskMeter score={risk_score} />
      </div>

      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <div className="card border-l-4 border-yellow-600 space-y-2">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">Security Recommendations</h3>
          {recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Typosquatting */}
      {typosquatting?.length > 0 && (
        <div className="card border-l-4 border-orange-600">
          <h3 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Typosquatting Alert
          </h3>
          <div className="flex flex-wrap gap-2">
            {typosquatting.map((t, i) => (
              <div key={i} className="bg-orange-900/30 border border-orange-800 px-3 py-1 rounded-lg text-xs text-orange-300">
                Similar to <span className="font-semibold">{t.brand}</span> — {t.similarity}% match
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redirect Chain */}
      {redirect_chain?.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-purple-400" /> Redirect Chain ({redirect_chain.length} hops)
          </h3>
          <div className="space-y-1">
            {redirect_chain.map((hop, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? "bg-blue-900 text-blue-400" :
                  i === redirect_chain.length - 1 ? "bg-purple-900 text-purple-400" :
                  "bg-gray-800 text-gray-500"
                }`}>{i + 1}</span>
                <span className="text-gray-300 break-all">{hop}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Grid */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">URL Feature Analysis</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <FeatureBadge label="HTTPS" value={features.uses_https === 1} type="bool" />
          <FeatureBadge label="IP Address" value={features.has_ip_address === 1} type="bool-bad" />
          <FeatureBadge label="@ Symbol" value={features.has_at_symbol === 1} type="bool-bad" />
          <FeatureBadge label="Suspicious TLD" value={features.has_suspicious_tld === 1} type="bool-bad" />
          <FeatureBadge label="Hyphen in Domain" value={features.has_hyphen_in_domain === 1} type="bool-warn" />
          <FeatureBadge label="Hex Encoding" value={features.has_hex_encoding === 1} type="bool-bad" />
          <FeatureStat label="URL Length" value={features.url_length} unit="chars" />
          <FeatureStat label="Subdomains" value={features.num_subdomains} />
          <FeatureStat label="Suspicious Keywords" value={features.has_suspicious_keywords} />
          <FeatureStat label="Dots" value={features.num_dots} />
          <FeatureStat label="URL Depth" value={features.url_depth} />
          <FeatureStat label="Digits in URL" value={features.num_digits_in_url} />
        </div>
      </div>

      {/* Intel Row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <IntelCard title="VirusTotal" icon={<Globe className="w-4 h-4 text-blue-400" />}>
          {virustotal?.error ? (
            <p className="text-gray-500 text-xs">{virustotal.error}</p>
          ) : virustotal ? (
            <div className="space-y-1 text-sm">
              <StatRow label="Malicious" value={virustotal.malicious} color="text-red-400" />
              <StatRow label="Suspicious" value={virustotal.suspicious} color="text-yellow-400" />
              <StatRow label="Harmless" value={virustotal.harmless} color="text-green-400" />
              <StatRow label="Undetected" value={virustotal.undetected} color="text-gray-400" />
            </div>
          ) : <p className="text-gray-500 text-xs">No data</p>}
        </IntelCard>

        <IntelCard title="WHOIS / Domain Age" icon={<Clock className="w-4 h-4 text-purple-400" />}>
          {whois?.error && !whois?.registrar ? (
            <p className="text-gray-500 text-xs">{whois.error}</p>
          ) : whois ? (
            <div className="space-y-1 text-sm">
              <StatRow label="Registrar" value={whois.registrar || "Unknown"} />
              <StatRow
                label="Age (days)" value={whois.domain_age_days ?? "N/A"}
                color={whois.is_new_domain ? "text-red-400" : "text-green-400"}
              />
              <StatRow label="Country" value={whois.country || "N/A"} />
              {whois.is_new_domain && <p className="text-xs text-red-400 mt-1">⚠ New domain — high risk</p>}
            </div>
          ) : <p className="text-gray-500 text-xs">No data</p>}
        </IntelCard>

        <IntelCard title="SSL Certificate" icon={<Lock className="w-4 h-4 text-teal-400" />}>
          {!ssl ? <p className="text-gray-500 text-xs">No data</p> :
           ssl.error && !ssl.has_ssl ? <p className="text-gray-500 text-xs">{ssl.error}</p> : (
            <div className="space-y-1 text-sm">
              <StatRow label="Has SSL" value={ssl.has_ssl ? "Yes" : "No"} color={ssl.has_ssl ? "text-green-400" : "text-red-400"} />
              {ssl.has_ssl && <>
                <StatRow label="Issuer" value={ssl.issuer || "Unknown"} />
                <StatRow label="Days Left" value={ssl.days_remaining ?? "N/A"} color={ssl.days_remaining < 30 ? "text-yellow-400" : "text-green-400"} />
                {ssl.is_expired && <p className="text-xs text-red-400">⚠ Expired</p>}
              </>}
            </div>
          )}
        </IntelCard>
      </div>

      {/* Screenshot */}
      {screenshot && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" /> Page Screenshot
          </h3>
          <img
            src={`data:image/jpeg;base64,${screenshot}`}
            alt="Page screenshot"
            className="w-full rounded-lg border border-gray-700"
          />
        </div>
      )}
    </div>
  );
}

function FeatureBadge({ label, value, type }) {
  let cls = "bg-gray-800 text-gray-400";
  if (type === "bool")      cls = value ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500";
  if (type === "bool-bad")  cls = value ? "bg-red-900/40 text-red-400" : "bg-gray-800 text-gray-500";
  if (type === "bool-warn") cls = value ? "bg-yellow-900/40 text-yellow-400" : "bg-gray-800 text-gray-500";
  const good = !value;
  const icon = type === "bool"
    ? (value ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5 text-gray-600" />)
    : (value ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5 text-gray-600" />);
  return (
    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${cls}`}>
      {icon} {label}
    </div>
  );
}

function FeatureStat({ label, value, unit }) {
  return (
    <div className="bg-gray-800 px-3 py-2 rounded-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-200">{value}{unit ? ` ${unit}` : ""}</p>
    </div>
  );
}

function IntelCard({ title, icon, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatRow({ label, value, color = "text-gray-300" }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${color} truncate max-w-[60%] text-right`}>{String(value)}</span>
    </div>
  );
}
