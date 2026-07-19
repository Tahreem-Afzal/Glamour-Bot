import { useState, useEffect, useRef } from "react";
import { API_BASE, COLORS } from "../styles.js";
import { apiFetch } from "../api.js";

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

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function maxPlannableDateISO() {
  const d = new Date();
  d.setDate(d.getDate() + 16);
  return d.toISOString().split("T")[0];
}

export default function WeatherWidget({ plannedEvent, onPlanChange }) {
  const [mode, setMode] = useState("today"); // "today" | "plan"
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [planCity, setPlanCity] = useState("Lahore");
  const [planDate, setPlanDate] = useState(todayISO());
  const popoverRef = useRef(null);

  const fetchWeather = (city) => {
    setLoading(true);
    setError(false);
    apiFetch(`${API_BASE}/weather?city=${encodeURIComponent(city)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!data.ok) throw new Error("not ok");
        setWeather(data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  const fetchForecast = () => {
    setLoading(true);
    setError(false);
    apiFetch(`${API_BASE}/weather/forecast?city=${encodeURIComponent(planCity)}&date=${planDate}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!data.ok) throw new Error(data.reason || "not ok");
        setForecast(data);
        onPlanChange?.({ city: data.city, date: data.date });
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
          background: plannedEvent ? COLORS.accentSoftBg : COLORS.surfaceAlt,
          border: `1px solid ${plannedEvent ? COLORS.accent : COLORS.border}`,
          padding: "4px 10px",
          borderRadius: 20,
          cursor: "pointer",
        }}
      >
        {plannedEvent && <span title={`Planning ahead for ${plannedEvent.date} in ${plannedEvent.city}`}>📅</span>}
        {loading && mode === "today" ? (
          <span>🌡️ …</span>
        ) : error || !weather ? (
          <span>🌡️ Weather unavailable</span>
        ) : (
          <span>
            {weatherIcon(weather.condition)} Today {Math.round(weather.temp_c)}°C ({weather.city})
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
            width: 260,
            boxShadow: "0 8px 24px rgba(46, 34, 48, 0.12)",
          }}
        >
          <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            <button
              onClick={() => setMode("today")}
              style={{
                flex: 1, padding: "6px 0", fontSize: 11, borderRadius: 20, cursor: "pointer",
                border: `1px solid ${mode === "today" ? COLORS.accent : COLORS.border}`,
                background: mode === "today" ? COLORS.accentSoftBg : "none",
                color: mode === "today" ? COLORS.accent : COLORS.textSecondary,
              }}
            >
              Today
            </button>
            <button
              onClick={() => setMode("plan")}
              style={{
                flex: 1, padding: "6px 0", fontSize: 11, borderRadius: 20, cursor: "pointer",
                border: `1px solid ${mode === "plan" ? COLORS.accent : COLORS.border}`,
                background: mode === "plan" ? COLORS.accentSoftBg : "none",
                color: mode === "plan" ? COLORS.accent : COLORS.textSecondary,
              }}
            >
              Plan Ahead
            </button>
          </div>

          {mode === "today" && (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <input
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search a city…"
                  style={{
                    flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary, padding: "6px 10px", fontSize: 12, borderRadius: 6, outline: "none",
                  }}
                />
                <button
                  onClick={handleSearch}
                  style={{ background: COLORS.accent, border: "none", color: "#fff", padding: "0 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
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
                    {weatherIcon(weather.condition)} Today in {weather.city}
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
            </>
          )}

          {mode === "plan" && (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: COLORS.textMuted }}>
                Planning an event outfit? Pick a city and date (up to 16 days out) to see the predicted weather.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                <input
                  value={planCity}
                  onChange={(e) => setPlanCity(e.target.value)}
                  placeholder="City"
                  style={{
                    background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary, padding: "6px 10px", fontSize: 12, borderRadius: 6, outline: "none",
                  }}
                />
                <input
                  type="date"
                  value={planDate}
                  min={todayISO()}
                  max={maxPlannableDateISO()}
                  onChange={(e) => setPlanDate(e.target.value)}
                  style={{
                    background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary, padding: "6px 10px", fontSize: 12, borderRadius: 6, outline: "none",
                  }}
                />
                <button
                  onClick={fetchForecast}
                  style={{ background: COLORS.accent, border: "none", color: "#fff", padding: "7px 0", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                >
                  Check forecast
                </button>
              </div>

              {loading && <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: 0 }}>Loading…</p>}
              {!loading && error && (
                <p style={{ fontSize: 12, color: COLORS.red, margin: 0 }}>
                  Couldn't get a forecast for that — check the city name and that the date is within 16 days.
                </p>
              )}
              {!loading && !error && forecast && (
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>
                    {weatherIcon(forecast.condition)} {forecast.city} · {forecast.date}
                  </p>
                  <p style={{ margin: "6px 0 4px", fontSize: 18, fontWeight: 700, color: COLORS.accent }}>
                    {Math.round(forecast.temp_min_c)}° – {Math.round(forecast.temp_max_c)}°C
                  </p>
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.textSecondary, textTransform: "capitalize" }}>
                    {forecast.condition}
                  </p>
                  {forecast.fabric_hint?.note && (
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: COLORS.textMuted, fontStyle: "italic" }}>
                      {forecast.fabric_hint.note}
                    </p>
                  )}
                  {plannedEvent && (
                    <>
                      <p style={{ margin: "0 0 6px", fontSize: 11, color: COLORS.accent }}>
                        ✓ Active — Chatbot and Recommendations will use this forecast instead of today's weather.
                      </p>
                      <button
                        onClick={() => onPlanChange?.(null)}
                        style={{
                          background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary,
                          padding: "5px 0", width: "100%", borderRadius: 6, fontSize: 11, cursor: "pointer",
                        }}
                      >
                        Clear plan, use today instead
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}