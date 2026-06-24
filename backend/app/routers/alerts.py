from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import require_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=schemas.EmailAlertOut)
def get_alert_settings(db: Session = Depends(get_db), current_user=Depends(require_user)):
    cfg = db.query(models.EmailAlert).filter(
        models.EmailAlert.user_id == current_user.id
    ).first()
    if not cfg:
        return schemas.EmailAlertOut(enabled=False, min_risk_score=60.0)
    return cfg


@router.put("", response_model=schemas.EmailAlertOut)
def update_alert_settings(
    body: schemas.EmailAlertSettings,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    cfg = db.query(models.EmailAlert).filter(
        models.EmailAlert.user_id == current_user.id
    ).first()
    if cfg:
        cfg.enabled = body.enabled
        cfg.min_risk_score = body.min_risk_score
    else:
        cfg = models.EmailAlert(
            user_id=current_user.id,
            enabled=body.enabled,
            min_risk_score=body.min_risk_score,
        )
        db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg
