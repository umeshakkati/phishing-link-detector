const API_BASE = "http://localhost:8000";

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function scanUrl(url) {
  const res = await fetch(`${API_BASE}/api/scan/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function renderResult(data) {
  const result = document.getElementById("result");
  const badge = document.getElementById("badge-container");
  const fill = document.getElementById("risk-fill");
  const riskVal = document.getElementById("risk-value");
  const recs = document.getElementById("recommendations");

  result.style.display = "block";

  badge.innerHTML = `<span class="badge badge-${data.prediction}">${data.prediction.toUpperCase()}</span>`;

  const color = data.prediction === "phishing" ? "#ef4444" : data.prediction === "suspicious" ? "#eab308" : "#22c55e";
  fill.style.width = `${data.risk_score}%`;
  fill.style.background = color;
  riskVal.textContent = data.risk_score;
  riskVal.style.color = color;

  recs.textContent = data.recommendations?.[0] || "";
}

document.addEventListener("DOMContentLoaded", async () => {
  const tab = await getCurrentTab();
  const urlEl = document.getElementById("current-url");
  const btn = document.getElementById("scan-btn");
  const loading = document.getElementById("loading");

  if (tab?.url) {
    urlEl.textContent = new URL(tab.url).hostname;
  }

  btn.addEventListener("click", async () => {
    if (!tab?.url) return;
    btn.style.display = "none";
    loading.style.display = "block";
    try {
      const data = await scanUrl(tab.url);
      renderResult(data);
    } catch (e) {
      document.getElementById("result").style.display = "block";
      document.getElementById("badge-container").innerHTML = `<span style="color:#ef4444;font-size:12px">Error: ${e.message}</span>`;
    } finally {
      loading.style.display = "none";
    }
  });
});
