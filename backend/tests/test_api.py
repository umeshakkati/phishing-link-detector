"""
Basic API integration tests using FastAPI TestClient.
Run with: pytest tests/
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_root():
    r = client.get("/")
    assert r.status_code == 200


def test_register_and_login():
    # Register
    r = client.post("/api/auth/register", json={
        "username": "pytest_user",
        "email": "pytest@test.com",
        "password": "testpass123",
    })
    # 200 = created, 400 = already exists (re-run)
    assert r.status_code in (200, 400)

    # Login
    r = client.post("/api/auth/login", data={
        "username": "pytest_user",
        "password": "testpass123",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_scan_url_unauthenticated():
    """Unauthenticated scan should still work (guest mode)."""
    r = client.post("/api/scan/url", json={"url": "https://google.com"})
    assert r.status_code == 200
    data = r.json()
    assert "prediction" in data
    assert "risk_score" in data
    assert data["prediction"] in ("legitimate", "suspicious", "phishing")


def test_threat_feed_public():
    """Threat feed is public — no auth needed."""
    r = client.get("/api/scan/feed")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
