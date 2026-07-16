import os
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

PROMPT_TEMPLATE = """You are GlamourBot — a smart, friendly AI fashion assistant.

You specialize in:
- Outfit recommendations based on body type, skin tone, and occasion
- Pakistani and Western fashion advice
- Event styling (weddings, mehndi, baraat, casual, formal)
- Brand suggestions and accessory matching

Use the context below to answer the question.
If context is not enough, use your own fashion knowledge.
Detect the language of the user's question and always respond in the same language. If user writes in Roman Urdu or Urdu, respond ENTIRELY in Roman Urdu. If user writes in English, respond ENTIRELY in English. Never switch languages partway through a reply, and never give the same answer twice in two languages — pick exactly one language and use it for the whole response.
Always be warm, helpful, and give specific fashion advice.

Context:
{context}

Question: {question}

GlamourBot Answer:"""

PRODUCT_INTENT_KEYWORDS = [
    "wear", "suggest", "recommend", "buy", "shop", "outfit", "dress",
    "kurta", "kameez", "lehenga", "sharara", "gharara", "shirt", "suit",
    "where can i find", "link", "price", "brand", "show me", "options",
    "bag", "jewelry", "jewellery", "shoes", "accessory", "accessories",
    "pehnu", "dikhao", "kapray", "kapre",
    "heel", "heels", "sandal", "sandals", "flat", "flats", "sneaker",
    "sneakers", "khussa", "pump", "pumps", "stiletto", "slipper", "slippers",
    "earring", "earrings", "necklace", "ring", "rings", "bangle", "bangles",
    "bracelet", "pendant", "sunglasses", "eyewear", "glasses", "clutch",
    "tote", "purse", "handbag",
    "jewlery", "jewelery", "jewelrey", "jewleryy", "jewellary", "jewelory",
]

_recommender = None


def _get_recommender():
    global _recommender
    if _recommender is None:
        from services.brands import BrandRecommender
        _recommender = BrandRecommender(auto_sync=True)
    return _recommender


def _looks_like_product_query(text: str) -> bool:
    lower = text.lower()
    if any(kw in lower for kw in PRODUCT_INTENT_KEYWORDS):
        return True
    try:
        from services.brands import COLOR_WORDS
        words = set(re.findall(r"[a-z]+", lower))
        return bool(words & COLOR_WORDS)
    except Exception:
        return False


def build_rag_chain():
    client = Groq(api_key=os.getenv("GROQ_API_KEY"), timeout=60.0)
    return client


def chat(client, index, docs, user_message: str, city: str = None) -> str:
    from services.vectorstore import search

    chunks = search(index, docs, user_message, n_results=5)
    context = "\n\n".join(chunks)

    if _looks_like_product_query(user_message):
        try:
            recommender = _get_recommender()
            result = recommender.recommend(user_message, max_results=6, city=city)
            if result.get("has_results") and result.get("brands"):
                return recommender.format_response(result, user_message)
            if result.get("reason") == "no_exact_color_match":
                # Honest color-mismatch message (see brands.py v3) — return
                # this directly rather than falling through to a generic
                # RAG answer that wouldn't mention the color issue at all.
                return recommender.format_response(result, user_message)
        except Exception as e:
            print(f"[Chat] Recommender unavailable, falling back to RAG: {e}")

    prompt = PROMPT_TEMPLATE.format(context=context, question=user_message)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1024
    )

    return response.choices[0].message.content