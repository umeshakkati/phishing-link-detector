from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    theme: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    theme: Optional[str] = None
    email: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# ── Scan ──────────────────────────────────────────────────────────────────────
class URLScanRequest(BaseModel):
    url: str


class BulkScanRequest(BaseModel):
    urls: list[str]


class ScanResult(BaseModel):
    url: str
    prediction: str
    risk_score: float
    features: dict
    virustotal: Optional[dict] = None
    whois: Optional[dict] = None
    ssl: Optional[dict] = None
    redirect_chain: Optional[list[str]] = None
    typosquatting: Optional[list[dict]] = None
    screenshot: Optional[str] = None   # base64 jpeg
    recommendations: list[str] = []


class BulkScanResult(BaseModel):
    total: int
    results: list[ScanResult]


class ScanHistoryOut(BaseModel):
    id: int
    url: str
    prediction: str
    risk_score: float
    scanned_at: datetime

    class Config:
        from_attributes = True


class ScanHistoryDetail(ScanHistoryOut):
    features: Optional[str] = None
    virustotal_result: Optional[str] = None
    whois_result: Optional[str] = None
    ssl_result: Optional[str] = None
    redirect_chain: Optional[str] = None
    typosquatting: Optional[str] = None

    class Config:
        from_attributes = True


# ── API Keys ──────────────────────────────────────────────────────────────────
class APIKeyCreate(BaseModel):
    name: str


class APIKeyOut(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime] = None

    class Config:
        from_attributes = True


class APIKeyCreated(APIKeyOut):
    raw_key: str   # only returned once at creation


# ── Whitelist ─────────────────────────────────────────────────────────────────
class WhitelistAdd(BaseModel):
    domain: str


class WhitelistOut(BaseModel):
    id: int
    domain: str
    added_at: datetime

    class Config:
        from_attributes = True


# ── Email Alerts ──────────────────────────────────────────────────────────────
class EmailAlertSettings(BaseModel):
    enabled: bool = True
    min_risk_score: float = 60.0


class EmailAlertOut(EmailAlertSettings):
    class Config:
        from_attributes = True


# ── Email Header Analyzer ─────────────────────────────────────────────────────
class EmailHeaderRequest(BaseModel):
    headers: str   # raw email header text


class EmailHeaderResult(BaseModel):
    urls_found: int
    results: list[ScanResult]


# ── Leaderboard ───────────────────────────────────────────────────────────────
class LeaderboardEntry(BaseModel):
    username: str
    total_scans: int
    phishing_caught: int


# ── Admin ─────────────────────────────────────────────────────────────────────
class AdminUserOut(UserOut):
    is_active: bool
    scan_count: Optional[int] = None


class GlobalStats(BaseModel):
    total_users: int
    total_scans: int
    phishing: int
    suspicious: int
    legitimate: int
