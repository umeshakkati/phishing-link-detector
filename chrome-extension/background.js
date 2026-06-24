const API_BASE = "http://localhost:8000";
const cache = new Map(); // url -> result

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  if (!tab.url.startsWith("http")) return;

  const url = tab.url;

  // Use cache to avoid repeat calls
  if (cache.has(url)) {
    const cached = cache.get(url);
    if (cached.prediction !== "legitimate") showWarning(tabId, url, cached);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/scan/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) return;
    const data = await res.json();
    cache.set(url, data);

    if (data.prediction !== "legitimate") {
      showWarning(tabId, url, data);
    }

    // Badge color
    const color = data.prediction === "phishing" ? "#ef4444" : data.prediction === "suspicious" ? "#eab308" : "#22c55e";
    chrome.action.setBadgeBackgroundColor({ color, tabId });
    chrome.action.setBadgeText({ text: data.prediction === "legitimate" ? "✓" : "!", tabId });
  } catch (e) {
    console.warn("PhishGuard: scan failed", e.message);
  }
});

function showWarning(tabId, url, data) {
  if (data.prediction === "phishing") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "⚠ PhishGuard: PHISHING DETECTED",
      message: `This site is flagged as a phishing page! Risk: ${data.risk_score}%\n${new URL(url).hostname}`,
      priority: 2,
    });

    // Inject warning overlay
    chrome.tabs.sendMessage(tabId, { action: "showOverlay", data }).catch(() => {});
  }
}
