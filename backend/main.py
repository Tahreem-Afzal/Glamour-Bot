"""
GlamourAI — unified backend
Merges GlamourBot (chatbot + recommender + image generation) and the
virtual try-on service into a single FastAPI app.
"""

import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers.chat_router import router as chat_router, init_chat_state
from routers.recommend_router import router as recommend_router
from routers.imagegen_router import router as imagegen_router
from routers.catalog_router import router as catalog_router, GARMENT_DIR
from routers.tryon_router import router as tryon_router
from routers.auth_router import router as auth_router
from services.auth import get_current_user
from models.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GENERATED_DIR = os.path.join(BASE_DIR, "generated")

# Created here (at import time) rather than only in lifespan/startup: the
# StaticFiles mounts below run as soon as this module is imported, before
# the lifespan startup hook fires — so these directories must already
# exist by then. Also needed regardless of Git, since empty folders (with
# nothing but a .gitignore rule inside them) aren't tracked by Git and
# won't exist at all on a fresh clone/deploy.
os.makedirs(GARMENT_DIR, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Re-affirmed here too (harmless if they already exist) for local dev
    # runs that import main.py differently.
    os.makedirs(GARMENT_DIR, exist_ok=True)
    os.makedirs(GENERATED_DIR, exist_ok=True)

    # Try-on garment catalog DB + users table
    init_db()
    logger.info("✅ Garment catalog DB initialized.")


    # GlamourBot vectorstore + RAG client (builds the embedding index on
    # first run if vector_db/ is missing — otherwise loads the prebuilt one)
    init_chat_state()

    if not os.environ.get("FASHN_API_KEY"):
        logger.warning("⚠️  FASHN_API_KEY not set — try-on generation will fail until configured.")
    if not os.environ.get("STABILITY_API_KEY"):
        logger.warning("⚠️  STABILITY_API_KEY not set — image generation will fail until configured.")
    if not os.environ.get("GROQ_API_KEY"):
        logger.warning("⚠️  GROQ_API_KEY not set — chatbot and prompt enhancement will fail until configured.")
    if not os.environ.get("JWT_SECRET_KEY"):
        logger.warning("⚠️  JWT_SECRET_KEY not set — set this to a long random string before deploying, or all logins are insecure.")
    if not os.environ.get("GOOGLE_CLIENT_ID"):
        logger.warning("⚠️  GOOGLE_CLIENT_ID not set — Google sign-in will fail until configured.")

    yield


app = FastAPI(title="GlamourAI — Fashion Assistant Suite", version="1.0.0", lifespan=lifespan)

# CORS: localhost for local dev, plus whatever the deployed frontend's
# origin is (set FRONTEND_URL in Render's environment variables, e.g.
# https://glamourai-frontend.onrender.com — no trailing slash).
_default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_frontend_url = os.environ.get("FRONTEND_URL")
_allow_origins = _default_origins + ([_frontend_url] if _frontend_url else [])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Without this, the browser hides custom response headers from JS by
    # default (only a small "safe list" is exposed automatically) — the
    # voice input endpoint relies on the frontend being able to read
    # X-Transcript/X-Response, so they must be explicitly allowed here.
    expose_headers=["X-Transcript", "X-Response"],
)

# Static file serving
app.mount("/garments", StaticFiles(directory=GARMENT_DIR), name="garments")
app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")

# Auth — open (this is where a token is obtained in the first place)
app.include_router(auth_router, prefix="/auth", tags=["Auth"])

# Every other router now requires a valid JWT (the whole app is gated
# behind login). Depends(get_current_user) runs before the route body,
# so an unauthenticated request gets a 401 before any business logic runs.
_auth_dep = [Depends(get_current_user)]
app.include_router(chat_router,      tags=["Chatbot"],        dependencies=_auth_dep)
app.include_router(recommend_router, prefix="/recommend", tags=["Recommendations"], dependencies=_auth_dep)
app.include_router(imagegen_router,  tags=["Image Generation"], dependencies=_auth_dep)
app.include_router(catalog_router,   prefix="/catalog", tags=["Catalog"], dependencies=_auth_dep)
app.include_router(tryon_router,     prefix="/tryon",   tags=["Try-On"], dependencies=_auth_dep)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "fashn_configured": bool(os.environ.get("FASHN_API_KEY")),
        "stability_configured": bool(os.environ.get("STABILITY_API_KEY")),
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
        "auth_configured": bool(os.environ.get("JWT_SECRET_KEY")),
        "google_signin_configured": bool(os.environ.get("GOOGLE_CLIENT_ID")),
    }