import json
import io
import csv
import joblib
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import Integer
from sqlalchemy.orm import Session
from pathlib import Path
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.feature_extractor import extract_features, features_to_vector
from app.threat_intel import (
    check_virustotal, check_whois, check_ssl,
    trace_redirects, check_typosquatting, capture_screenshot, generate_recommendations,
)

router = APIRouter(prefix="/api/scan", tags=["scan"])

MODEL_PATH = Path(__file__).parent.parent.parent / "model.pkl"
_model = None


def get_model():
    global _model
    if _model is None and MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)
    return _model


def predict_url(features: dict) -> tuple[str, float]:
    model = get_model()
    vector = features_to_vector(features)

    if model:
        proba = model.predict_proba([vector])[0]
        pred_class = int(np.argmax(proba))
        risk_score = float(proba[1] * 0.5 + proba[2]) * 100
        label_map = {0: "legitimate", 1: "suspicious", 2: "phishing"}
        return label_map[pred_class], round(risk_score, 1)

    # Heuristic fallback
    score = 0
    if features.get("has_ip_address"):       score += 30
    if features.get("has_at_symbol"):        score += 20
    if not features.get("uses_https"):       score += 15
    score += features.get("has_suspicious_keywords", 0) * 8
    if features.get("has_suspicious_tld"):   score += 20
    if features.get("num_dots", 0) > 5:      score += 10
    if features.get("has_hyphen_in_domain"): score += 10
    if features.get("url_length", 0) > 100:  score += 10
    if features.get("has_hex_encoding"):     score += 15
    if features.get("has_punycode"):         score += 20
    if features.get("has_non_standard_port"):score += 15
    if features.get("num_subdomains", 0) > 3:score += 10

    score = min(score, 100)
    return ("phishing" if score >= 60 else "suspicious" if score >= 30 else "legitimate"), round(float(score), 1)


def _is_whitelisted(url: str, db: Session, user_id: int) -> bool:
    """Return True if the domain is on the user's whitelist."""
    if not user_id:
        return False
    import tldextract
    ext = tldextract.extract(url)
    domain = f"{ext.domain}.{ext.suffix}".lower()
    return db.query(models.WhitelistedDomain).filter(
        models.WhitelistedDomain.user_id == user_id,
        models.WhitelistedDomain.domain == domain,
    ).first() is not None


async def _run_scan(url: str, db: Session, user_id=None, with_screenshot: bool = False) -> schemas.ScanResult:
    """Core scan logic shared by single-scan and bulk-scan endpoints."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # Check banned domains
    import tldextract as _tld
    _ext = _tld.extract(url)
    _domain = f"{_ext.domain}.{_ext.suffix}".lower()
    banned = db.query(models.BannedDomain).filter(models.BannedDomain.domain == _domain).first()
    if banned:
        return schemas.ScanResult(
            url=url, prediction="phishing", risk_score=100.0,
            features={}, recommendations=[f"Domain is on the global ban list: {banned.reason or 'Flagged by admin'}"],
        )

    # Whitelist short-circuit
    if user_id and _is_whitelisted(url, db, user_id):
        features = extract_features(url)
        return schemas.ScanResult(
            url=url, prediction="legitimate", risk_score=0.0,
            features=features, recommendations=["Domain is on your whitelist."],
        )

    features = extract_features(url)
    prediction, risk_score = predict_url(features)

    vt_result = await check_virustotal(url)
    whois_result = check_whois(url)
    ssl_result = check_ssl(url)
    redirect_chain = await trace_redirects(url)
    typosquatting = check_typosquatting(url)
    screenshot = await capture_screenshot(url) if with_screenshot else None
    recommendations = generate_recommendations(
        prediction, risk_score, features, whois_result, ssl_result,
        redirect_chain, typosquatting,
    )

    scan = models.ScanHistory(
        url=url,
        prediction=prediction,
        risk_score=risk_score,
        features=json.dumps(features),
        virustotal_result=json.dumps(vt_result),
        whois_result=json.dumps(whois_result),
        ssl_result=json.dumps(ssl_result),
        redirect_chain=json.dumps(redirect_chain),
        typosquatting=json.dumps(typosquatting),
        user_id=user_id,
    )
    db.add(scan)
    db.commit()

    if user_id and risk_score >= 60:
        _maybe_send_alert(db, user_id, url, prediction, risk_score)

    return schemas.ScanResult(
        url=url, prediction=prediction, risk_score=risk_score,
        features=features, virustotal=vt_result, whois=whois_result,
        ssl=ssl_result, redirect_chain=redirect_chain,
        typosquatting=typosquatting, screenshot=screenshot,
        recommendations=recommendations,
    )


def _maybe_send_alert(db: Session, user_id: int, url: str, prediction: str, risk_score: float):
    alert_cfg = db.query(models.EmailAlert).filter(
        models.EmailAlert.user_id == user_id,
        models.EmailAlert.enabled == True,
    ).first()
    if not alert_cfg or risk_score < alert_cfg.min_risk_score:
        return
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return
    # Send via configured SMTP (best-effort, non-blocking)
    try:
        import smtplib
        from email.mime.text import MIMEText
        from app.config import get_settings
        s = get_settings()
        if not s.smtp_host:
            return
        msg = MIMEText(
            f"PhishGuard Alert\n\nA high-risk URL was scanned:\n"
            f"URL: {url}\nResult: {prediction.upper()}\nRisk Score: {risk_score}%\n"
            f"\nStay safe,\nPhishGuard AI"
        )
        msg["Subject"] = f"[PhishGuard] {prediction.upper()} detected — risk {risk_score}%"
        msg["From"] = s.smtp_from
        msg["To"] = user.email
        with smtplib.SMTP(s.smtp_host, s.smtp_port) as server:
            if s.smtp_tls:
                server.starttls()
            if s.smtp_user:
                server.login(s.smtp_user, s.smtp_password)
            server.send_message(msg)
    except Exception:
        pass  # non-critical, swallow silently


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/url", response_model=schemas.ScanResult)
async def scan_url(
    request: schemas.URLScanRequest,
    screenshot: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await _run_scan(request.url.strip(), db, current_user.id if current_user else None, with_screenshot=screenshot)


@router.post("/bulk", response_model=schemas.BulkScanResult)
async def bulk_scan(
    request: schemas.BulkScanRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if len(request.urls) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 URLs per bulk scan")
    results = []
    for url in request.urls:
        try:
            r = await _run_scan(url.strip(), db, current_user.id if current_user else None)
            results.append(r)
        except Exception as e:
            results.append(schemas.ScanResult(
                url=url, prediction="error", risk_score=0,
                features={}, recommendations=[str(e)],
            ))
    return schemas.BulkScanResult(total=len(results), results=results)


@router.post("/qr", response_model=schemas.ScanResult)
async def scan_qr_code(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        from PIL import Image
        from pyzbar.pyzbar import decode as qr_decode
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"QR scanning unavailable: {e}")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    decoded = qr_decode(image)
    if not decoded:
        raise HTTPException(status_code=400, detail="No QR code detected in image")

    url = decoded[0].data.decode("utf-8")
    return await _run_scan(url, db, current_user.id if current_user else None)


@router.get("/history", response_model=list[schemas.ScanHistoryOut])
def get_history(
    limit: int = Query(50, le=500),
    offset: int = 0,
    prediction: str = Query(None),
    min_risk: float = Query(None),
    max_risk: float = Query(None),
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.ScanHistory)
    if current_user:
        query = query.filter(models.ScanHistory.user_id == current_user.id)
    if prediction:
        query = query.filter(models.ScanHistory.prediction == prediction)
    if min_risk is not None:
        query = query.filter(models.ScanHistory.risk_score >= min_risk)
    if max_risk is not None:
        query = query.filter(models.ScanHistory.risk_score <= max_risk)
    if search:
        query = query.filter(models.ScanHistory.url.contains(search))
    return query.order_by(models.ScanHistory.scanned_at.desc()).offset(offset).limit(limit).all()


@router.get("/history/export")
def export_history(
    fmt: str = Query("csv", regex="^(csv|json)$"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Login required to export")

    rows = db.query(models.ScanHistory).filter(
        models.ScanHistory.user_id == current_user.id
    ).order_by(models.ScanHistory.scanned_at.desc()).all()

    if fmt == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "url", "prediction", "risk_score", "scanned_at"])
        for r in rows:
            writer.writerow([r.id, r.url, r.prediction, r.risk_score, r.scanned_at.isoformat()])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=scan_history.csv"},
        )
    else:
        data = [
            {"id": r.id, "url": r.url, "prediction": r.prediction,
             "risk_score": r.risk_score, "scanned_at": r.scanned_at.isoformat()}
            for r in rows
        ]
        return StreamingResponse(
            iter([json.dumps(data, indent=2)]),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=scan_history.json"},
        )


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(models.ScanHistory)
    if current_user:
        query = query.filter(models.ScanHistory.user_id == current_user.id)

    total = query.count()
    phishing = query.filter(models.ScanHistory.prediction == "phishing").count()
    suspicious = query.filter(models.ScanHistory.prediction == "suspicious").count()
    legitimate = query.filter(models.ScanHistory.prediction == "legitimate").count()
    return {"total": total, "phishing": phishing, "suspicious": suspicious, "legitimate": legitimate}


@router.get("/feed")
def public_threat_feed(limit: int = Query(20, le=100), db: Session = Depends(get_db)):
    """Public feed of recently detected phishing/suspicious URLs."""
    rows = (
        db.query(models.ScanHistory)
        .filter(models.ScanHistory.prediction.in_(["phishing", "suspicious"]))
        .order_by(models.ScanHistory.scanned_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {"url": r.url, "prediction": r.prediction, "risk_score": r.risk_score,
         "scanned_at": r.scanned_at.isoformat()}
        for r in rows
    ]


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(models.ScanHistory)
    if current_user:
        query = query.filter(models.ScanHistory.user_id == current_user.id)
    total = query.count()
    phishing = query.filter(models.ScanHistory.prediction == "phishing").count()
    suspicious = query.filter(models.ScanHistory.prediction == "suspicious").count()
    legitimate = query.filter(models.ScanHistory.prediction == "legitimate").count()
    return {"total": total, "phishing": phishing, "suspicious": suspicious, "legitimate": legitimate}


@router.get("/feed")
def public_threat_feed(limit: int = Query(20, le=100), db: Session = Depends(get_db)):
    rows = (
        db.query(models.ScanHistory)
        .filter(models.ScanHistory.prediction.in_(["phishing", "suspicious"]))
        .order_by(models.ScanHistory.scanned_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {"url": r.url, "prediction": r.prediction, "risk_score": r.risk_score,
         "scanned_at": r.scanned_at.isoformat()}
        for r in rows
    ]


@router.get("/leaderboard", response_model=list[schemas.LeaderboardEntry])
def leaderboard(limit: int = Query(10, le=50), db: Session = Depends(get_db)):
    from sqlalchemy import func
    rows = (
        db.query(
            models.User.username,
            func.count(models.ScanHistory.id).label("total_scans"),
            func.sum(
                (models.ScanHistory.prediction == "phishing").cast(Integer)
            ).label("phishing_caught"),
        )
        .join(models.ScanHistory, models.ScanHistory.user_id == models.User.id, isouter=True)
        .group_by(models.User.id)
        .order_by(func.count(models.ScanHistory.id).desc())
        .limit(limit)
        .all()
    )
    return [
        schemas.LeaderboardEntry(
            username=r.username,
            total_scans=r.total_scans or 0,
            phishing_caught=int(r.phishing_caught or 0),
        )
        for r in rows
    ]


@router.post("/email-headers", response_model=schemas.EmailHeaderResult)
async def analyze_email_headers(
    request: schemas.EmailHeaderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    import re
    url_pattern = re.compile(
        r'https?://[^\s<>"\'\])\}]+'
    )
    urls = list(set(url_pattern.findall(request.headers)))
    if not urls:
        return schemas.EmailHeaderResult(urls_found=0, results=[])
    if len(urls) > 20:
        urls = urls[:20]

    results = []
    for url in urls:
        try:
            r = await _run_scan(url.strip(), db, current_user.id if current_user else None)
            results.append(r)
        except Exception as e:
            results.append(schemas.ScanResult(
                url=url, prediction="error", risk_score=0,
                features={}, recommendations=[str(e)],
            ))
    return schemas.EmailHeaderResult(urls_found=len(results), results=results)
