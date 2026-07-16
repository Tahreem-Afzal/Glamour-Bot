"""
chat_router.py
GlamourBot's conversational endpoints: text chat (RAG + brand recommender
routing), voice input/output, weather lookup, and knowledge-base rebuild.
"""

import os
import logging
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, UploadFile, File, Response
from pydantic import BaseModel

from services.loader import GlamourBotLoader
from services.vectorstore import build_vectorstore, load_vectorstore
from services.rag_chain import build_rag_chain, chat as run_chat
from services.voice import speech_to_text, text_to_speech
from services.weather import get_weather, get_forecast, forecast_to_fabric_hint

logger = logging.getLogger(__name__)
router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "vector_db")
DATA_DIR = os.path.join(BASE_DIR, "data")

# Populated at startup by main.py's lifespan — module-level state kept
# deliberately simple (single-process dev/demo server, not a multi-worker
# production deployment).
_state = {"rag_client": None, "index": None, "docs": None}


def init_chat_state():
    """Called once at app startup (see main.py's lifespan)."""
    if os.path.exists(os.path.join(DB_DIR, "index.bin")):
        logger.info("Loading existing vectorstore...")
        index, docs = load_vectorstore()
    else:
        logger.info("Building vectorstore for first time...")
        loader = GlamourBotLoader()
        docs = loader.load_all(DATA_DIR)
        index, docs = build_vectorstore(docs)

    _state["index"] = index
    _state["docs"] = docs
    _state["rag_client"] = build_rag_chain()
    logger.info("✅ GlamourBot chat is ready.")


class ChatRequest(BaseModel):
    message: str
    city: Optional[str] = None


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    response = run_chat(_state["rag_client"], _state["index"], _state["docs"],
                         request.message, city=request.city)
    return ChatResponse(response=response)


@router.post("/voice/input")
async def voice_input(audio: UploadFile = File(...), city: Optional[str] = None):
    audio_bytes = await audio.read()
    filename = audio.filename or "audio.webm"
    if not filename.endswith(('.webm', '.mp3', '.wav', '.m4a', '.ogg')):
        filename = "audio.webm"

    user_text = speech_to_text(audio_bytes, filename)

    # Whisper is known to "hallucinate" short filler phrases (e.g. "you",
    # "thank you", "thanks for watching") when given a very short or
    # near-silent clip — a side effect of its training data being full of
    # YouTube captions with sign-off phrases over silence. Rather than
    # feed that straight into the chat pipeline (which produces a
    # confusing "you didn't ask a question" reply), detect this pattern
    # and ask the user to try again with a clearer recording.
    _HALLUCINATION_PHRASES = {
        "you", "you.", "thank you", "thank you.", "thanks for watching",
        "bye", "bye.", "the end", ".", "",
    }
    if user_text.strip().lower() in _HALLUCINATION_PHRASES or len(user_text.strip()) < 3:
        retry_msg = "I didn't quite catch that — could you try recording again and speak a little closer to the mic?"
        audio_response = text_to_speech(retry_msg, lang="en")
        return Response(
            content=audio_response,
            media_type="audio/mpeg",
            headers={"X-Transcript": quote("(unclear audio)"), "X-Response": quote(retry_msg)},
        )

    answer = run_chat(_state["rag_client"], _state["index"], _state["docs"], user_text, city=city)
    audio_response = text_to_speech(answer)

    return Response(
        content=audio_response,
        media_type="audio/mpeg",
        # HTTP headers must be Latin-1-safe — GlamourBot's replies routinely
        # contain Urdu script and emoji, which would otherwise crash this
        # response with a UnicodeEncodeError. Percent-encoding here (and
        # decodeURIComponent on the frontend) keeps the raw text intact.
        headers={"X-Transcript": quote(user_text), "X-Response": quote(answer)},
    )


@router.get("/weather")
def weather_endpoint(city: str = "Lahore"):
    return get_weather(city)


@router.get("/weather/forecast")
def weather_forecast_endpoint(city: str = "Lahore", date: str = None):
    """Future-date forecast for planning an event outfit ahead of time —
    accepts any date up to 16 days out (Open-Meteo's free-tier limit).
    `date` must be YYYY-MM-DD; returns ok=False with a reason if it's out
    of range or the city can't be found."""
    if not date:
        return {"ok": False, "reason": "missing_date"}
    forecast = get_forecast(city, date)
    fabric_hint = forecast_to_fabric_hint(forecast) if forecast.get("ok") else {"prefer_fabrics": [], "avoid_fabrics": [], "note": ""}
    return {**forecast, "fabric_hint": fabric_hint}


@router.post("/rebuild")
async def rebuild_index():
    loader = GlamourBotLoader()
    docs = loader.load_all(DATA_DIR)
    index, docs = build_vectorstore(docs)
    _state["index"] = index
    _state["docs"] = docs
    return {"message": "Index rebuilt!", "chunks": len(docs)}