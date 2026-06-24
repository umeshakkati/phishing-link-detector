import tldextract
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import require_user

router = APIRouter(prefix="/api/whitelist", tags=["whitelist"])


def _normalize(domain: str) -> str:
    ext = tldextract.extract(domain)
    if ext.domain and ext.suffix:
        return f"{ext.domain}.{ext.suffix}".lower()
    return domain.lower().replace("www.", "")


@router.get("", response_model=list[schemas.WhitelistOut])
def get_whitelist(db: Session = Depends(get_db), current_user=Depends(require_user)):
    return db.query(models.WhitelistedDomain).filter(
        models.WhitelistedDomain.user_id == current_user.id
    ).order_by(models.WhitelistedDomain.added_at.desc()).all()


@router.post("", response_model=schemas.WhitelistOut)
def add_to_whitelist(
    body: schemas.WhitelistAdd,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    domain = _normalize(body.domain)
    if not domain:
        raise HTTPException(status_code=400, detail="Invalid domain")
    exists = db.query(models.WhitelistedDomain).filter(
        models.WhitelistedDomain.user_id == current_user.id,
        models.WhitelistedDomain.domain == domain,
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="Domain already whitelisted")
    entry = models.WhitelistedDomain(domain=domain, user_id=current_user.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def remove_from_whitelist(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    entry = db.query(models.WhitelistedDomain).filter(
        models.WhitelistedDomain.id == entry_id,
        models.WhitelistedDomain.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Removed from whitelist"}
