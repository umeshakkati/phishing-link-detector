export default function RiskMeter({ score }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const color = pct >= 60 ? "#ef4444" : pct >= 30 ? "#eab308" : "#22c55e";
  const label = pct >= 60 ? "High Risk" : pct >= 30 ? "Medium Risk" : "Low Risk";
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#1f2937" strokeWidth="12" />
        <circle
          cx="70" cy="70" r="54"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="bold" dy="0.3em">
          {Math.round(pct)}
        </text>
        <text x="70" y="88" textAnchor="middle" fill="#9ca3af" fontSize="11">
          Risk Score
        </text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}
