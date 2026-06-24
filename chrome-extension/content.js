chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "showOverlay") return;
  const { data } = msg;

  if (document.getElementById("phishguard-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "phishguard-overlay";
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%; z-index:2147483647;
    background:rgba(0,0,0,0.92); display:flex; align-items:center; justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  `;

  const color = data.prediction === "phishing" ? "#ef4444" : "#eab308";
  const icon = data.prediction === "phishing" ? "🛡️" : "⚠️";

  overlay.innerHTML = `
    <div style="background:#111827; border:2px solid ${color}; border-radius:16px; padding:40px; max-width:520px; text-align:center;">
      <div style="font-size:64px; margin-bottom:16px;">${icon}</div>
      <h1 style="color:${color}; font-size:24px; font-weight:700; margin:0 0 8px">
        ${data.prediction === "phishing" ? "Phishing Site Detected!" : "Suspicious Site Warning"}
      </h1>
      <p style="color:#9ca3af; font-size:14px; margin:0 0 24px">${window.location.hostname}</p>
      <div style="background:#1f2937; border-radius:12px; padding:16px; margin-bottom:24px; text-align:left;">
        <div style="color:#6b7280; font-size:12px; margin-bottom:4px;">Risk Score</div>
        <div style="background:#374151; border-radius:100px; height:8px; overflow:hidden;">
          <div style="background:${color}; width:${data.risk_score}%; height:100%; border-radius:100px;"></div>
        </div>
        <div style="color:${color}; font-weight:700; margin-top:4px;">${data.risk_score}%</div>
      </div>
      ${data.recommendations?.length ? `
        <div style="text-align:left; margin-bottom:24px;">
          ${data.recommendations.slice(0, 2).map(r => `<p style="color:#d1d5db; font-size:13px; margin:6px 0;">• ${r}</p>`).join("")}
        </div>
      ` : ""}
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="pg-go-back" style="background:#ef4444; color:white; border:none; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px;">
          ← Go Back (Safe)
        </button>
        <button id="pg-proceed" style="background:#374151; color:#9ca3af; border:none; padding:12px 24px; border-radius:8px; cursor:pointer; font-size:14px;">
          Proceed Anyway
        </button>
      </div>
      <p style="color:#4b5563; font-size:11px; margin-top:16px;">Powered by PhishGuard AI</p>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("pg-go-back").addEventListener("click", () => window.history.back());
  document.getElementById("pg-proceed").addEventListener("click", () => overlay.remove());
});
