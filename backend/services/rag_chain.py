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

ADVICE_PROMPT_TEMPLATE = """You are GlamourBot — a smart, friendly AI fashion assistant.

The user is asking for styling advice about what to wear, NOT asking to see product links or shop right now. Give a warm, specific, interactive answer that covers:
1. What kind of dress/outfit would suit the event — silhouette, fabric, and color suggestions appropriate for the occasion (and weather, if mentioned below).
2. Accessory suggestions that would complete the look (jewelry, bag, dupatta/scarf, etc. as relevant).
3. Shoe suggestions that would pair well with the outfit.

Use the context below to ground your advice. If context is not enough, use your own fashion knowledge.
Detect the language of the user's question and always respond in the same language. If user writes in Roman Urdu or Urdu, respond ENTIRELY in Roman Urdu. If user writes in English, respond ENTIRELY in English. Never switch languages partway through a reply, and never give the same answer twice in two languages — pick exactly one language and use it for the whole response.
Do NOT include product links, brand names, or prices — this is styling advice only. If the user wants to see actual shoppable items afterward, they can ask you to show/find/link some, or use the Recommendations tab.
{weather_note}
Context:
{context}

Question: {question}

GlamourBot Answer:"""

# Strong, explicit signals that the user wants actual shoppable results
# right now (product links) — NOT just styling advice.
SHOPPING_SIGNAL_KEYWORDS = [
    "link", "links", "buy", "shop", "purchase", "order",
    "where can i find", "where can i buy", "show me", "dikhao",
    "price", "brand", "options", "give me some products", "find me",
]

# Broader "this is about styling/fashion" signals — triggers the advice
# prompt (dress + accessories + shoes) rather than the shopping recommender,
# unless a SHOPPING_SIGNAL_KEYWORDS term is also present.
PRODUCT_INTENT_KEYWORDS = [
    "wear", "suggest", "recommend", "outfit", "dress",
    "kurta", "kameez", "lehenga", "sharara", "gharara", "shirt", "suit",
    "bag", "jewelry", "jewellery", "shoes", "accessory", "accessories",
    "pehnu", "kapray", "kapre",
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


def _looks_like_shopping_query(text: str) -> bool:
    """Explicit signal the user wants actual shoppable links right now,
    not just styling advice — e.g. 'show me red heels' or 'give me links
    for a wedding lehenga', as opposed to 'what should I wear to a wedding'."""
    lower = text.lower()
    return any(kw in lower for kw in SHOPPING_SIGNAL_KEYWORDS)


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


def _get_weather_note(city: str = None, event_date: str = None) -> str:
    """Independent weather lookup for the advice prompt (the recommender's
    own weather lookup only runs when we actually call it, which advice
    mode deliberately skips)."""
    if not city:
        return ""
    try:
        from services.weather import get_weather, weather_to_fabric_hint, get_forecast, forecast_to_fabric_hint
        if event_date:
            hint = forecast_to_fabric_hint(get_forecast(city, event_date))
        else:
            hint = weather_to_fabric_hint(get_weather(city))
        return hint.get("note", "")
    except Exception as e:
        print(f"[Chat] Weather lookup skipped for advice prompt: {e}")
        return ""


def chat(client, index, docs, user_message: str, city: str = None, event_date: str = None) -> str:
    from services.vectorstore import search

    chunks = search(index, docs, user_message, n_results=5)
    context = "\n\n".join(chunks)

    # Tier 1: explicit shopping intent — go straight to shoppable product
    # links, same as before.
    if _looks_like_shopping_query(user_message):
        try:
            recommender = _get_recommender()
            result = recommender.recommend(user_message, max_results=6, city=city, event_date=event_date)
            if result.get("has_results") and result.get("brands"):
                return recommender.format_response(result, user_message)
            if result.get("reason") == "no_exact_color_match":
                # Honest color-mismatch message (see brands.py v3) — return
                # this directly rather than falling through to a generic
                # RAG answer that wouldn't mention the color issue at all.
                return recommender.format_response(result, user_message)
        except Exception as e:
            print(f"[Chat] Recommender unavailable, falling back to RAG: {e}")

    # Tier 2: general styling/fashion topic (event, outfit, accessories,
    # etc.) but no explicit shopping signal — give interactive advice
    # (dress style + accessories + shoes) instead of jumping to links.
    elif _looks_like_product_query(user_message):
        weather_note = _get_weather_note(city, event_date)
        weather_block = f"\nWeather context: {weather_note}\n" if weather_note else ""
        prompt = ADVICE_PROMPT_TEMPLATE.format(context=context, question=user_message, weather_note=weather_block)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1024
        )
        return response.choices[0].message.content

    # Tier 3: everything else — plain fashion RAG chat.
    prompt = PROMPT_TEMPLATE.format(context=context, question=user_message)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1024
    )

    return response.choices[0].message.content