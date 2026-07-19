"""
auth_router.py
Endpoints:
  POST /auth/register — email + password signup
  POST /auth/login     — email + password login
  POST /auth/google    — Google Identity Services sign-in
  GET  /auth/me         — return the current user (used by the frontend to
                           verify a stored token is still valid on load)
"""

import re
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator

from models.database import get_db
from models.user import User
from services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_google_id_token,
    get_current_user,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str = ""

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleIn(BaseModel):
    credential: str  # the ID token string from Google Identity Services


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def _user_out(user: User) -> dict:
    return {"id": user.id, "email": user.email, "name": user.name}


@router.post("/register", response_model=AuthOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        name=payload.name.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return {"access_token": token, "user": _user_out(user)}


@router.post("/login", response_model=AuthOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token(user.id)
    return {"access_token": token, "user": _user_out(user)}


@router.post("/google", response_model=AuthOut)
def google_login(payload: GoogleIn, db: Session = Depends(get_db)):
    idinfo = verify_google_id_token(payload.credential)
    google_sub = idinfo["sub"]
    email = idinfo.get("email", "").lower()
    name = idinfo.get("name", "")

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if not user and email:
        # A user who previously signed up with email/password using the
        # same address — link the Google account to that existing record
        # instead of creating a duplicate.
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.google_sub = google_sub

    if not user:
        user = User(email=email, name=name, google_sub=google_sub)
        db.add(user)

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return {"access_token": token, "user": _user_out(user)}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)