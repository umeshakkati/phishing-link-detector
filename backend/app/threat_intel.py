import httpx
import socket
import ssl
import whois
import difflib
from datetime import datetime
from urllib.parse import urlparse
from typing import Optional
from app.config import get_settings

settings = get_settings()

# Top brands to check for typosquatting
POPULAR_BRANDS = [
    "google", "facebook", "amazon", "apple", "microsoft", "paypal",
    "netflix", "instagram", "twitter", "linkedin", "youtube", "github",
    "dropbox", "spotify", "ebay", "yahoo", "adobe", "chase", "wellsfargo",
    "bankofamerica", "citibank", "steam", "roblox", "discord", "tiktok",
]


async def check_virustotal(url: str) -> Optional[dict]:
    if not settings.virustotal_api_key:
        return {"error": "VirusTotal API key not configured", "available": False}

    headers = {"x-apikey": settings.virustotal_api_key}
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                "https://www.virustotal.com/api/v3/urls",
                headers=headers,
                data={"url": url},
            )
            if resp.status_code not in (200, 201):
                return {"error": f"VT submission failed: {resp.status_code}", "available": True}

            analysis_id = resp.json().get("data", {}).get("id", "")
            if not analysis_id:
                return {"error": "No analysis ID returned", "available": True}

            result_resp = await client.get(
                f"https://www.virustotal.com/api/v3/analyses/{analysis_id}",
                headers=headers,
            )
            data = result_resp.json().get("data", {}).get("attributes", {})
            stats = data.get("stats", {})
            return {
                "available": True,
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
                "undetected": stats.get("undetected", 0),
                "status": data.get("status", "unknown"),
            }
        except Exception as e:
            return {"error": str(e), "available": True}


def check_whois(url: str) -> dict:
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.replace("www.", "").split(":")[0]
        w = whois.whois(domain)

        creation = w.creation_date
        expiry = w.expiration_date
        if isinstance(creation, list):
            creation = creation[0]
        if isinstance(expiry, list):
            expiry = expiry[0]

        domain_age_days = None
        if creation:
            domain_age_days = (datetime.utcnow() - creation).days

        return {
            "domain": domain,
            "registrar": w.registrar,
            "creation_date": creation.isoformat() if creation else None,
            "expiry_date": expiry.isoformat() if expiry else None,
            "domain_age_days": domain_age_days,
            "is_new_domain": domain_age_days is not None and domain_age_days < 180,
            "country": w.country,
            "org": w.org,
        }
    except Exception as e:
        return {"error": str(e), "domain": urlparse(url).netloc}


def check_ssl(url: str) -> dict:
    try:
        parsed = urlparse(url)
        hostname = parsed.netloc.split(":")[0]

        if parsed.scheme != "https":
            return {"has_ssl": False, "error": "URL does not use HTTPS"}

        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
            s.settimeout(5)
            s.connect((hostname, 443))
            cert = s.getpeercert()

        not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
        not_before = datetime.strptime(cert["notBefore"], "%b %d %H:%M:%S %Y %Z")
        days_left = (not_after - datetime.utcnow()).days
        issuer = dict(x[0] for x in cert.get("issuer", []))
        subject = dict(x[0] for x in cert.get("subject", []))

        return {
            "has_ssl": True,
            "issuer": issuer.get("organizationName", "Unknown"),
            "subject": subject.get("commonName", hostname),
            "valid_from": not_before.isoformat(),
            "valid_until": not_after.isoformat(),
            "days_remaining": days_left,
            "is_expired": days_left < 0,
            "is_expiring_soon": 0 <= days_left <= 30,
        }
    except ssl.SSLCertVerificationError as e:
        return {"has_ssl": True, "valid": False, "error": f"SSL verification failed: {str(e)}"}
    except Exception as e:
        return {"has_ssl": False, "error": str(e)}


async def trace_redirects(url: str) -> list[str]:
    """Follow redirect chain and return each hop URL."""
    chain = [url]
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=10,
            max_redirects=10,
        ) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            # collect redirect history
            for r in resp.history:
                loc = str(r.headers.get("location", ""))
                if loc and loc not in chain:
                    chain.append(loc)
            final = str(resp.url)
            if final not in chain:
                chain.append(final)
    except Exception:
        pass
    return chain


def check_typosquatting(url: str) -> list[dict]:
    """Compare the domain against popular brands for typosquatting."""
    parsed = urlparse(url)
    import tldextract
    ext = tldextract.extract(url)
    domain_name = ext.domain.lower()

    matches = []
    for brand in POPULAR_BRANDS:
        if domain_name == brand:
            continue  # exact match — it IS the brand
        ratio = difflib.SequenceMatcher(None, domain_name, brand).ratio()
        if ratio >= 0.75:
            matches.append({"brand": brand, "similarity": round(ratio * 100, 1)})

    return sorted(matches, key=lambda x: -x["similarity"])


async def capture_screenshot(url: str) -> Optional[str]:
    """Capture a base64 screenshot of the URL using Playwright (headless)."""
    try:
        from playwright.async_api import async_playwright
        import base64
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
            page = await browser.new_page(viewport={"width": 1280, "height": 720})
            await page.goto(url, timeout=15000, wait_until="domcontentloaded")
            screenshot = await page.screenshot(type="jpeg", quality=70, full_page=False)
            await browser.close()
            return base64.b64encode(screenshot).decode()
    except Exception as e:
        return None


def generate_recommendations(
    prediction: str,
    risk_score: float,
    features: dict,
    whois_data: dict,
    ssl_data: dict,
    redirect_chain: list = None,
    typosquatting: list = None,
) -> list:
    recs = []

    if prediction == "phishing":
        recs.append("Do NOT visit this URL. It is classified as a phishing site.")
    elif prediction == "suspicious":
        recs.append("Exercise extreme caution. This URL shows multiple suspicious indicators.")

    if features.get("uses_https") == 0:
        recs.append("This site does not use HTTPS. Avoid entering sensitive information.")
    if features.get("has_ip_address"):
        recs.append("URL uses an IP address instead of a domain — a common phishing tactic.")
    if features.get("has_at_symbol"):
        recs.append("URL contains '@' which can disguise the real destination.")
    if features.get("has_suspicious_keywords", 0) > 2:
        recs.append("URL contains multiple suspicious keywords commonly used in phishing.")
    if whois_data and whois_data.get("is_new_domain"):
        recs.append(
            f"Domain is only {whois_data.get('domain_age_days')} days old. "
            "Newly registered domains are frequently used in phishing attacks."
        )
    if ssl_data:
        if ssl_data.get("is_expired"):
            recs.append("SSL certificate is expired.")
        if not ssl_data.get("has_ssl"):
            recs.append("No valid SSL certificate detected.")
    if redirect_chain and len(redirect_chain) > 2:
        recs.append(
            f"URL redirects through {len(redirect_chain) - 1} hops — "
            "multi-hop redirects are a common phishing obfuscation technique."
        )
    if typosquatting:
        brands = ", ".join(t["brand"] for t in typosquatting[:3])
        recs.append(f"Domain looks similar to well-known brand(s): {brands}. Possible typosquatting.")

    if not recs:
        recs.append("No immediate threats detected. Always stay vigilant online.")

    return recs
