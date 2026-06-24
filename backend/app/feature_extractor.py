import re
import socket
import ssl
import tldextract
import validators
from urllib.parse import urlparse
from datetime import datetime
from typing import Optional


SUSPICIOUS_KEYWORDS = [
    "login", "verify", "update", "secure", "bank", "account", "paypal",
    "amazon", "apple", "google", "microsoft", "ebay", "netflix", "confirm",
    "password", "signin", "credential", "wallet", "invoice", "payment",
    "urgent", "suspended", "limited", "act-now", "click-here",
]


def extract_features(url: str) -> dict:
    """Extract security-relevant features from a URL."""
    parsed = urlparse(url)
    ext = tldextract.extract(url)
    domain = parsed.netloc or ""
    path = parsed.path or ""
    full_url = url.lower()

    features = {}

    # --- Structural features ---
    features["url_length"] = len(url)
    features["domain_length"] = len(domain)
    features["path_length"] = len(path)
    features["num_dots"] = url.count(".")
    features["num_hyphens"] = url.count("-")
    features["num_underscores"] = url.count("_")
    features["num_slashes"] = url.count("/")
    features["num_question_marks"] = url.count("?")
    features["num_equals"] = url.count("=")
    features["num_ampersands"] = url.count("&")
    features["num_at"] = url.count("@")
    features["num_exclamation"] = url.count("!")
    features["num_percent"] = url.count("%")
    features["num_digits_in_url"] = sum(c.isdigit() for c in url)

    # --- Domain-level features ---
    features["has_ip_address"] = _has_ip_address(domain)
    features["has_at_symbol"] = 1 if "@" in url else 0
    features["has_double_slash_redirect"] = 1 if "//" in path else 0
    features["uses_https"] = 1 if parsed.scheme == "https" else 0
    features["num_subdomains"] = len(ext.subdomain.split(".")) if ext.subdomain else 0
    features["has_hyphen_in_domain"] = 1 if "-" in (ext.domain or "") else 0
    features["domain_has_digits"] = 1 if any(c.isdigit() for c in (ext.domain or "")) else 0

    # --- Keyword-based features ---
    features["has_suspicious_keywords"] = _count_suspicious_keywords(full_url)
    features["subdomain_suspicious"] = _count_suspicious_keywords(ext.subdomain.lower() if ext.subdomain else "")

    # --- TLD features ---
    suspicious_tlds = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".work", ".click"]
    features["has_suspicious_tld"] = 1 if any(url.lower().endswith(t) or f"{t}/" in url.lower() for t in suspicious_tlds) else 0

    # --- Encoding / obfuscation ---
    features["has_hex_encoding"] = 1 if re.search(r"%[0-9a-fA-F]{2}", url) else 0
    features["has_punycode"] = 1 if "xn--" in url.lower() else 0

    # --- Port usage ---
    features["has_non_standard_port"] = _has_non_standard_port(parsed)

    # --- URL depth ---
    features["url_depth"] = len([p for p in path.split("/") if p])

    return features


def _has_ip_address(domain: str) -> int:
    """Detect IPv4 in domain."""
    ip_pattern = re.compile(
        r"^(\d{1,3}\.){3}\d{1,3}$"
    )
    clean = domain.split(":")[0]
    return 1 if ip_pattern.match(clean) else 0


def _count_suspicious_keywords(text: str) -> int:
    return sum(1 for kw in SUSPICIOUS_KEYWORDS if kw in text)


def _has_non_standard_port(parsed) -> int:
    standard_ports = {"http": 80, "https": 443}
    if parsed.port and parsed.scheme in standard_ports:
        return 1 if parsed.port != standard_ports[parsed.scheme] else 0
    return 0


def features_to_vector(features: dict) -> list:
    """Convert feature dict to ordered numeric list for ML model."""
    keys = [
        "url_length", "domain_length", "path_length", "num_dots",
        "num_hyphens", "num_underscores", "num_slashes", "num_question_marks",
        "num_equals", "num_ampersands", "num_at", "num_exclamation",
        "num_percent", "num_digits_in_url", "has_ip_address", "has_at_symbol",
        "has_double_slash_redirect", "uses_https", "num_subdomains",
        "has_hyphen_in_domain", "domain_has_digits", "has_suspicious_keywords",
        "subdomain_suspicious", "has_suspicious_tld", "has_hex_encoding",
        "has_punycode", "has_non_standard_port", "url_depth",
    ]
    return [features.get(k, 0) for k in keys]
