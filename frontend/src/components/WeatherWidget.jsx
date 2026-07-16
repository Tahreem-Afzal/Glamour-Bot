import { useState, useEffect, useRef } from "react";
import { API_BASE, COLORS } from "../styles.js";

const WEATHER_ICONS = {
  "clear sky": "☀️", "mostly clear": "🌤️", "partly cloudy": "⛅", "overcast": "☁️",
  "fog": "🌫️",
  "light drizzle": "🌦️", "drizzle": "🌦️", "heavy drizzle": "🌧️",
  "light rain": "🌦️", "rain": "🌧️", "heavy rain": "🌧️",
  "light snow": "🌨️", "snow": "❄️", "heavy snow": "❄️",
  "rain showers": "🌧️", "violent rain showers": "⛈️",
  "thunderstorm": "⛈️", "thunderstorm with hail": "⛈️",
};

function weatherIcon(condition) {
  return WEATHER_ICONS[condition] || "🌡️";
}

// `isoString` arrives already localized to the queried city's own timezone
// (Open-Meteo's timezone=auto) — parse it as literal UTC components so the
// browser doesn't re-shift it into the *viewer's* timezone on top of that.
function formatLocalTime(isoString) {
  if (!isoString) return "";
  const [datePart, timePart] = isoString.split("T");
  if (!datePart || !timePart) return "";
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const day = dt.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const time = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return `${day}, ${time}`;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const popoverRef = useRef(null);

  const fetchWeather = (city) => {
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/weather?city=${encodeURIComponent(city)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!data.ok) throw new Error("not ok");
        setWeather(data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWeather("Lahore");
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    const city = cityInput.trim();
    if (!city) return;
    fetchWeather(city);
  };

  return (
    <div ref={popoverRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: COLORS.textSecondary,
          background: COLORS.surfaceAlt,
          border: `1px solid ${COLORS.border}`,
          padding: "4px 10px",
          borderRadius: 20,
          cursor: "pointer",
        }}
      >
        {loading ? (
          <span>🌡️ …</span>
        ) : error || !weather ? (
          <span>🌡️ Weather unavailable</span>
        ) : (
          <span>
            {weatherIcon(weather.condition)} {Math.round(weather.temp_c)}°C {weather.city}
          </span>
        )}
        <span style={{ fontSize: 9 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 50,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 16,
            width: 240,
            boxShadow: "0 8px 24px rgba(46, 34, 48, 0.12)",
          }}
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search a city…"
              style={{
                flex: 1,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textPrimary,
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 6,
                outline: "none",
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                background: COLORS.accent,
                border: "none",
                color: "#fff",
                padding: "0 12px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Go
            </button>
          </div>

          {loading && <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: 0 }}>Loading…</p>}
          {!loading && error && (
            <p style={{ fontSize: 12, color: COLORS.red, margin: 0 }}>Couldn't find that city — try another spelling.</p>
          )}
          {!loading && !error && weather && (
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>
                {weatherIcon(weather.condition)} {weather.city}
              </p>
              <p style={{ margin: "2px 0 10px", fontSize: 11, color: COLORS.textSecondary }}>
                {formatLocalTime(weather.local_time)}
              </p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.accent }}>
                {Math.round(weather.temp_c)}°C
              </p>
              <p style={{ margin: "2px 0 8px", fontSize: 12, color: COLORS.textSecondary, textTransform: "capitalize" }}>
                {weather.condition} · feels like {Math.round(weather.feels_like_c)}°C
              </p>
              <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted }}>
                Humidity {weather.humidity_pct}% · Wind {Math.round(weather.wind_kph)} km/h
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}