from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import require_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _require_admin(current_user=Depends(require_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats", response_model=schemas.GlobalStats)
def global_stats(db: Session = Depends(get_db), _=Depends(_require_admin)):
    total_users = db.query(models.User).count()
    q = db.query(models.ScanHistory)
    return schemas.GlobalStats(
        total_users=total_users,
        total_scans=q.count(),
        phishing=q.filter(models.ScanHistory.prediction == "phishing").count(),
        suspicious=q.filter(models.ScanHistory.prediction == "suspicious").count(),
        legitimate=q.filter(models.ScanHistory.prediction == "legitimate").count(),
    )


@router.get("/users", response_model=list[schemas.AdminUserOut])
def list_users(db: Session = Depends(get_db), _=Depends(_require_admin)):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    result = []
    for u in users:
        scan_count = db.query(models.ScanHistory).filter(
            models.ScanHistory.user_id == u.id
        ).count()
        out = schemas.AdminUserOut(
            id=u.id, username=u.username, email=u.email, role=u.role,
            theme=u.theme, created_at=u.created_at, is_active=u.is_active,
            scan_count=scan_count,
        )
        result.append(out)
    return result


@router.patch("/users/{user_id}/toggle")
def toggle_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@router.patch("/users/{user_id}/role")
def set_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    if role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    return {"id": user.id, "role": user.role}


@router.get("/scans", response_model=list[schemas.ScanHistoryOut])
def all_scans(
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    return db.query(models.ScanHistory).order_by(
        models.ScanHistory.scanned_at.desc()
    ).limit(limit).all()


@router.get("/banned", tags=["admin"])
def list_banned(db: Session = Depends(get_db), _=Depends(_require_admin)):
    return db.query(models.BannedDomain).order_by(models.BannedDomain.banned_at.desc()).all()


@router.post("/banned", tags=["admin"])
def ban_domain(
    domain: str,
    reason: str = "",
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    import tldextract
    ext = tldextract.extract(domain)
    clean = f"{ext.domain}.{ext.suffix}".lower() if ext.domain else domain.lower()
    if db.query(models.BannedDomain).filter(models.BannedDomain.domain == clean).first():
        raise HTTPException(status_code=409, detail="Domain already banned")
    entry = models.BannedDomain(domain=clean, reason=reason, banned_by=current_user.id)
    db.add(entry)
    db.commit()
    return {"domain": clean, "banned": True}


@router.delete("/banned/{domain_id}", tags=["admin"])
def unban_domain(domain_id: int, db: Session = Depends(get_db), _=Depends(_require_admin)):
    entry = db.query(models.BannedDomain).filter(models.BannedDomain.id == domain_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()
    return {"message": "Domain unbanned"}
