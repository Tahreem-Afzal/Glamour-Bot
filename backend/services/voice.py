import os
import io
import re
from groq import Groq
from gtts import gTTS
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"), timeout=60.0)

# Roman Urdu (GlamourBot's usual Urdu output) is written in Latin script,
# so English gTTS reads it phonetically close enough. Actual Urdu-script
# text is a different story — reading Arabic-range characters with the
# English voice produces garbled, wrong-sounding audio. Detect real Urdu
# script specifically so that rare case gets the correct voice instead.
_URDU_SCRIPT_RE = re.compile(r"[\u0600-\u06FF]")


def detect_tts_lang(text: str) -> str:
    """Returns 'ur' if the text is written in actual Urdu script, else 'en'
    (which also correctly covers English and Roman Urdu, both Latin script)."""
    urdu_chars = len(_URDU_SCRIPT_RE.findall(text))
    return "ur" if urdu_chars > max(5, len(text) * 0.15) else "en"


def speech_to_text(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    transcription = groq_client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model="whisper-large-v3",
        response_format="text"
    )
    return transcription


def text_to_speech(text: str, lang: str = None) -> bytes:
    if lang is None:
        lang = detect_tts_lang(text)
    tts = gTTS(text=text, lang=lang, slow=False)
    audio_buffer = io.BytesIO()
    tts.write_to_fp(audio_buffer)
    audio_buffer.seek(0)
    return audio_buffer.read()