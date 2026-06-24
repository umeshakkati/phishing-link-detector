from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import require_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.patch("/me", response_model=schemas.UserOut)
def update_me(
    body: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    if body.theme and body.theme in ("dark", "light"):
        current_user.theme = body.theme
    if body.email:
        exists = db.query(models.User).filter(
            models.User.email == body.email,
            models.User.id != current_user.id,
        ).first()
        if exists:
            raise HTTPException(status_code=409, detail="Email already in use")
        current_user.email = body.email
    db.commit()
    db.refresh(current_user)
    return current_user
