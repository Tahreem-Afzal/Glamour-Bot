"""
weather.py
Weather-aware context for GlamourBot — free, no API key required.
Uses Open-Meteo geocoding + forecast APIs.

Includes a small in-memory TTL cache: Render's free tier shares outbound
IPs across many different apps, and Open-Meteo's free API will 429 ("Too
Many Requests") a shared IP that sends too much combined traffic. Caching
cuts our own request volume way down — repeat lookups for the same city
(which is most of them, since most users are checking the same city
during a session) are served from memory instead of hitting Open-Meteo
again. This resets on every redeploy since it's in-memory, which is fine
for a cache.
"""

import time
import requests
from typing import Optional

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

DEFAULT_CITY = "Lahore"
DEFAULT_LAT, DEFAULT_LON = 31.5497, 74.3436

WEATHER_CODE_LABELS = {
    0: "clear sky", 1: "mostly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "fog",
    51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
    61: "light rain", 63: "rain", 65: "heavy rain",
    71: "light snow", 73: "snow", 75: "heavy snow",
    80: "rain showers", 81: "rain showers", 82: "violent rain showers",
    95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with hail",
}

# ---------------------------------------------------------------------------
# Tiny in-memory TTL cache — key -> (expires_at_epoch_seconds, value)
# ---------------------------------------------------------------------------
_CACHE: dict = {}

GEOCODE_TTL = 24 * 60 * 60   # city coordinates never change — cache a full day
WEATHER_TTL = 10 * 60        # current weather — 10 minutes is plenty fresh
FORECAST_TTL = 30 * 60       # daily forecast changes slowly — 30 minutes
FAILURE_TTL = 60             # cache failures briefly too, so a burst of page
                              # loads during a rate-limited window doesn't
                              # keep hammering Open-Meteo every single time


def _cache_get(key):
    entry = _CACHE.get(key)
    if entry is None:
        return None
    expires_at, value = entry
    if time.time() > expires_at:
        del _CACHE[key]
        return None
    return value


def _cache_set(key, value, ttl_seconds):
    _CACHE[key] = (time.time() + ttl_seconds, value)


def geocode_city(city_name: str) -> Optional[dict]:
    cache_key = ("geocode", city_name.strip().lower())
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        r = requests.get(
            GEOCODE_URL,
            params={"name": city_name, "count": 1, "language": "en", "format": "json"},
            timeout=8,
        )
        r.raise_for_status()
        results = r.json().get("results")
        if not results:
            return None
        top = results[0]
        loc = {
            "lat": top["latitude"], "lon": top["longitude"],
            "name": top.get("name", city_name), "country": top.get("country", ""),
        }
        _cache_set(cache_key, loc, GEOCODE_TTL)
        return loc
    except Exception as e:
        print(f"[Weather] Geocoding failed for '{city_name}': {e}")
        return None


def get_weather(city_name: str = DEFAULT_CITY) -> dict:
    cache_key = ("weather", city_name.strip().lower())
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    loc = geocode_city(city_name)
    if loc is None:
        loc = {"lat": DEFAULT_LAT, "lon": DEFAULT_LON, "name": city_name, "country": ""}

    try:
        r = requests.get(
            FORECAST_URL,
            params={
                "latitude": loc["lat"], "longitude": loc["lon"],
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,"
                           "precipitation,weather_code,wind_speed_10m",
                "timezone": "auto",
            },
            timeout=8,
        )
        r.raise_for_status()
        cur = r.json().get("current", {})

        code = cur.get("weather_code", 0)
        condition = WEATHER_CODE_LABELS.get(code, "unknown")
        is_rainy = code in (51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99)

        result = {
            "ok": True, "city": loc["name"],
            "temp_c": cur.get("temperature_2m"), "feels_like_c": cur.get("apparent_temperature"),
            "humidity_pct": cur.get("relative_humidity_2m"), "wind_kph": cur.get("wind_speed_10m"),
            "condition": condition, "is_rainy": is_rainy, "weather_code": code,
            "local_time": cur.get("time"),  # ISO 8601, already in the city's own timezone (timezone=auto above)
        }
        _cache_set(cache_key, result, WEATHER_TTL)
        return result
    except Exception as e:
        print(f"[Weather] Forecast fetch failed for '{city_name}': {e}")
        result = {
            "ok": False, "city": city_name, "temp_c": None, "feels_like_c": None,
            "humidity_pct": None, "wind_kph": None, "condition": "unknown",
            "is_rainy": False, "weather_code": None, "local_time": None,
            "reason": str(e),
        }
        _cache_set(cache_key, result, FAILURE_TTL)
        return result


def get_forecast(city_name: str, target_date: str) -> dict:
    """Forecast for a specific future date (YYYY-MM-DD), up to 16 days out
    — Open-Meteo's free forecast API supports this range without any extra
    key or paid tier. Used for the 'Plan Ahead' event-outfit flow."""
    cache_key = ("forecast", city_name.strip().lower(), target_date)
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    loc = geocode_city(city_name)
    if loc is None:
        loc = {"lat": DEFAULT_LAT, "lon": DEFAULT_LON, "name": city_name, "country": ""}

    try:
        r = requests.get(
            FORECAST_URL,
            params={
                "latitude": loc["lat"], "longitude": loc["lon"],
                "daily": "temperature_2m_max,temperature_2m_min,weather_code",
                "timezone": "auto",
                "start_date": target_date, "end_date": target_date,
            },
            timeout=8,
        )
        r.raise_for_status()
        daily = r.json().get("daily", {})
        dates = daily.get("time", [])
        if target_date not in dates:
            result = {"ok": False, "city": loc["name"], "date": target_date, "reason": "date_out_of_range"}
            _cache_set(cache_key, result, FAILURE_TTL)
            return result

        i = dates.index(target_date)
        code = daily.get("weather_code", [0])[i]
        condition = WEATHER_CODE_LABELS.get(code, "unknown")
        temp_max = daily.get("temperature_2m_max", [None])[i]
        temp_min = daily.get("temperature_2m_min", [None])[i]

        result = {
            "ok": True, "city": loc["name"], "date": target_date,
            "temp_max_c": temp_max, "temp_min_c": temp_min,
            "condition": condition, "weather_code": code,
        }
        _cache_set(cache_key, result, FORECAST_TTL)
        return result
    except Exception as e:
        print(f"[Weather] Forecast fetch failed for '{city_name}' on {target_date}: {e}")
        result = {"ok": False, "city": city_name, "date": target_date, "reason": str(e)}
        _cache_set(cache_key, result, FAILURE_TTL)
        return result


def forecast_to_fabric_hint(forecast: dict) -> dict:
    """Same fabric-weighting logic as weather_to_fabric_hint(), adapted for
    a future-date forecast (which has a max/min range instead of one
    current reading) — averages them and reuses the identical thresholds."""
    if not forecast.get("ok") or forecast.get("temp_max_c") is None:
        return {"prefer_fabrics": [], "avoid_fabrics": [], "note": ""}

    avg_temp = (forecast["temp_max_c"] + forecast["temp_min_c"]) / 2
    return weather_to_fabric_hint({"ok": True, "temp_c": avg_temp, "city": forecast["city"]})


def weather_to_fabric_hint(weather: dict) -> dict:
    if not weather.get("ok") or weather.get("temp_c") is None:
        return {"prefer_fabrics": [], "avoid_fabrics": [], "note": ""}

    temp = weather["temp_c"]

    if temp >= 32:
        return {
            "prefer_fabrics": ["lawn", "cotton", "chiffon", "linen", "cambric"],
            "avoid_fabrics": ["velvet", "wool", "karandi"],
            "note": f"It's {temp:.0f}°C in {weather['city']} — leaning toward lighter, breathable fabrics.",
        }
    elif temp <= 15:
        return {
            "prefer_fabrics": ["velvet", "wool", "karandi", "khaddar"],
            "avoid_fabrics": ["lawn", "linen"],
            "note": f"It's {temp:.0f}°C in {weather['city']} — leaning toward warmer fabrics.",
        }
    else:
        return {
            "prefer_fabrics": [], "avoid_fabrics": [],
            "note": f"It's {temp:.0f}°C in {weather['city']} — comfortable range, no fabric weighting applied.",
        }