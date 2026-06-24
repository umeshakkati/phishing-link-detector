"""
Tests for URL feature extraction.
Run with: pytest tests/
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.feature_extractor import extract_features, features_to_vector


def test_https_detection():
    f = extract_features("https://example.com")
    assert f["uses_https"] == 1


def test_http_flagged():
    f = extract_features("http://example.com")
    assert f["uses_https"] == 0


def test_ip_address_detection():
    f = extract_features("http://192.168.1.1/login")
    assert f["has_ip_address"] == 1


def test_at_symbol_detection():
    f = extract_features("http://amazon.com@fake-site.tk/login")
    assert f["has_at_symbol"] == 1


def test_suspicious_tld():
    f = extract_features("http://paypal-secure.tk/login")
    assert f["has_suspicious_tld"] == 1


def test_suspicious_keywords():
    f = extract_features("http://secure-bank-login-verify.com")
    assert f["has_suspicious_keywords"] > 0


def test_feature_vector_length():
    f = extract_features("https://google.com")
    v = features_to_vector(f)
    assert len(v) == 28


def test_legitimate_url_clean():
    f = extract_features("https://www.google.com")
    assert f["has_ip_address"] == 0
    assert f["has_at_symbol"] == 0
    assert f["uses_https"] == 1
