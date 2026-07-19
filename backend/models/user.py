"""user.py — User DB model for authentication (email/password + Google)"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime
from models.database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True, nullable=False)
    # Nullable: a user who signed up via Google never sets a password.
    hashed_password = Column(String, nullable=True)
    name            = Column(String, default="")
    # Google's unique, stable subject ID for this user (the "sub" claim in
    # their ID token) — unique/nullable so email/password-only users leave
    # this empty, and it doubles as a fast lookup key on Google login.
    google_sub      = Column(String, unique=True, nullable=True, index=True)
    created_at      = Column(DateTime, default=datetime.utcnow)