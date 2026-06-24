from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from collections import defaultdict
from time import time
from app.database import engine, Base
from app.routers import auth, scan, apikeys, whitelist, alerts, admin, users

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Powered Phishing Link Detection & Threat Intelligence Platform",
    description="Real-time phishing URL detection with ML, VirusTotal, WHOIS, SSL, QR scanning, bulk scan and more.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Simple in-memory rate limiter ────────────────────────────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 30        # requests
RATE_WINDOW = 60       # seconds


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.url.path.startswith("/api/scan"):
        ip = request.client.host
        now = time()
        window_start = now - RATE_WINDOW
        _rate_store[ip] = [t for t in _rate_store[ip] if t > window_start]
        if len(_rate_store[ip]) >= RATE_LIMIT:
            return JSONResponse(
                status_code=429,
                content={"detail": f"Rate limit exceeded: {RATE_LIMIT} requests per {RATE_WINDOW}s"},
            )
        _rate_store[ip].append(now)
    return await call_next(request)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(scan.router)
app.include_router(apikeys.router)
app.include_router(whitelist.router)
app.include_router(alerts.router)
app.include_router(admin.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {"message": "PhishGuard AI API v2 is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
