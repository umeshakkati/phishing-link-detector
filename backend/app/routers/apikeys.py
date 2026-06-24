import secrets
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app import models, schemas
from app.auth import require_user

router = APIRouter(prefix="/api/apikeys", tags=["api-keys"])


def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


@router.get("", response_model=list[schemas.APIKeyOut])
def list_keys(db: Session = Depends(get_db), current_user=Depends(require_user)):
    return db.query(models.APIKey).filter(
        models.APIKey.user_id == current_user.id
    ).order_by(models.APIKey.created_at.desc()).all()


@router.post("", response_model=schemas.APIKeyCreated)
def create_key(
    body: schemas.APIKeyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    count = db.query(models.APIKey).filter(
        models.APIKey.user_id == current_user.id,
        models.APIKey.is_active == True,
    ).count()
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 active API keys allowed")

    raw = f"pg_{secrets.token_urlsafe(32)}"
    key = models.APIKey(
        key_hash=_hash_key(raw),
        name=body.name,
        user_id=current_user.id,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return schemas.APIKeyCreated(
        id=key.id, name=key.name, is_active=key.is_active,
        created_at=key.created_at, last_used=key.last_used,
        raw_key=raw,
    )


@router.delete("/{key_id}")
def revoke_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    key = db.query(models.APIKey).filter(
        models.APIKey.id == key_id,
        models.APIKey.user_id == current_user.id,
    ).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    db.commit()
    return {"message": "API key revoked"}
