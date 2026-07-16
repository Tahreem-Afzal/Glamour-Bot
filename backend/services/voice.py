import os
import io
from groq import Groq
from gtts import gTTS
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"), timeout=60.0)


def speech_to_text(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    transcription = groq_client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model="whisper-large-v3",
        response_format="text"
    )
    return transcription


def text_to_speech(text: str) -> bytes:
    tts = gTTS(text=text, lang='en', slow=False)
    audio_buffer = io.BytesIO()
    tts.write_to_fp(audio_buffer)
    audio_buffer.seek(0)
    return audio_buffer.read()
