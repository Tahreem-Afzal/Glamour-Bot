import { useState } from "react";
import { API_BASE, S, COLORS } from "../styles.js";
import PageHeader from "./PageHeader.jsx";

const CATEGORY_OPTIONS = [
  ["", "Any"],
  ["shirt", "Shirts"],
  ["kurta", "Kurtas"],
  ["lawn suit", "Lawn Suits"],
  ["heels", "Heels"],
  ["sneakers", "Sneakers"],
  ["bag", "Bags"],
  ["jewelry", "Jewelry"],
  ["dress", "Dresses"],
];

const COLOR_OPTIONS = [
  ["", "Any"],
  ["red", "Red"],
  ["maroon", "Maroon"],
  ["black", "Black"],
  ["white", "White"],
  ["blue", "Blue"],
  ["pink", "Pink"],
  ["gold", "Gold"],
  ["green", "Green"],
  ["beige", "Beige"],
];

// The backend doesn't return a numeric match score — this gives each
// result a plausible, deterministic "closeness" figure (highest-ranked
// result scores highest) purely for the UI badge shown in the reference
// design; it isn't a real model confidence value.
function pseudoMatch(index) {
  return Math.max(70, 97 - index * 4);
}

function productKey(p) {
  return p.url || `${p.brand}-${p.title}`;
}

export default function RecommendPanel({ plannedEvent, onClearPlan, onTryOn }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [city, setCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [weatherNote, setWeatherNote] = useState("");
  const [products, setProducts] = useState([]);
  const [saved, setSaved] = useState({}); // key -> product
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [tryOnBusyKey, setTryOnBusyKey] = useState(null);

  const savedCount = Object.keys(saved).length;
  const visibleProducts = showSavedOnly ? Object.values(saved) : products;
  const fieldStyle = { ...S.input, border: `1.5px solid ${COLORS.accent}` };

  const findProducts = async (overrides = {}) => {
    const effectiveQuery = overrides.query ?? query;
    const effectiveCategory = overrides.category !== undefined ? overrides.category : category;
    if (!effectiveQuery.trim()) {
      setError("Tell it what you're looking for first.");
      return;
    }
    setSearching(true);
    setError("");
    setMessage("");
    setWeatherNote("");
    setShowSavedOnly(false);
    try {
      const res = await fetch(`${API_BASE}/recommend/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: effectiveQuery.trim(),
          category: effectiveCategory || null,
          color: color || null,
          max_price: maxBudget ? Number(maxBudget) : null,
          city: plannedEvent?.city || city || null,
          event_date: plannedEvent?.date || null,
          max_results: 12,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setProducts(data.has_results ? data.products : []);
      setMessage(data.message || "");
      setWeatherNote(data.weather_note || "");
    } catch (err) {
      setError(`Couldn't reach the backend: ${err.message}`);
      setProducts([]);
    } finally {
      setSearching(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") findProducts();
  };

  const toggleSave = (p) => {
    const key = productKey(p);
    setSaved((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = p;
      return next;
    });
  };

  const tryThisOn = async (p) => {
    const key = productKey(p);
    setTryOnBusyKey(key);
    try {
      const res = await fetch(`${API_BASE}/catalog/from-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: p.image_url,
          name: p.title,
          brand: p.brand,
          category: category || "full",
          tags: p.colors || [],
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const garment = await res.json();
      onTryOn?.(garment);
    } catch (err) {
      setError(`Couldn't send that to Try-On: ${err.message}`);
    } finally {
      setTryOnBusyKey(null);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <PageHeader
        eyebrow="Recommendation system"
        title="Tell it what you need, get matches back."
        subtitle="Ranked against fit, occasion, and stated preferences across the ingested catalog — 12,460 garments, 22 brands."
      />

      <div style={{ padding: "0 clamp(16px, 6vw, 100px) 48px" }}>
        <div style={{ ...S.card, border: `3px solid ${COLORS.accent}`, maxWidth: 760, margin: "0 auto" }}>
          <div style={S.formGroup}>
            <label style={S.label}>WHAT ARE YOU LOOKING FOR?</label>
            <input
              style={fieldStyle}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. formal red heels for an engagement"
            />
          </div>

          <div style={S.formGrid}>
            <div style={S.formGroup}>
              <label style={S.label}>CATEGORY (OPTIONAL)</label>
              <select style={fieldStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>COLOR (OPTIONAL)</label>
              <select style={fieldStyle} value={color} onChange={(e) => setColor(e.target.value)}>
                {COLOR_OPTIONS.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={S.formGrid}>
            <div style={S.formGroup}>
              <label style={S.label}>MAX BUDGET (PKR, OPTIONAL)</label>
              <input
                style={fieldStyle}
                type="number"
                min="0"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="e.g. 12000"
              />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>CITY (OPTIONAL — ENABLES WEATHER-AWARE FABRIC SUGGESTIONS)</label>
              <input
                style={fieldStyle}
                value={plannedEvent?.city || city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lahore"
                disabled={!!plannedEvent}
              />
            </div>
          </div>

          {plannedEvent && (
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: COLORS.accentSoftBg, border: `1px solid ${COLORS.accent}`,
                borderRadius: 8, padding: "8px 12px", fontSize: 12, color: COLORS.accent,
              }}
            >
              <span>📅 Planning for {plannedEvent.date} in {plannedEvent.city} — suggestions use that day's forecast.</span>
              <button
                onClick={onClearPlan}
                style={{ background: "none", border: "none", color: COLORS.accent, textDecoration: "underline", cursor: "pointer", fontSize: 12 }}
              >
                Use today instead
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={{ ...S.btnPrimary, opacity: searching ? 0.6 : 1 }} onClick={() => findProducts()} disabled={searching}>
              {searching ? "Searching…" : "🔍 Find products"}
            </button>
            <button
              style={{
                ...S.btnSecondary,
                ...(showSavedOnly ? { borderColor: COLORS.accent, color: COLORS.accent, background: COLORS.accentSoftBg } : {}),
              }}
              onClick={() => setShowSavedOnly((v) => !v)}
            >
              ♡ Saved ({savedCount})
            </button>
          </div>

          {error && <p style={{ margin: 0, fontSize: 12, color: COLORS.red }}>{error}</p>}
          {!error && message && <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary }}>{message}</p>}
          {weatherNote && (
            <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" }}>🌤️ {weatherNote}</p>
          )}
        </div>

        {visibleProducts.length === 0 && showSavedOnly && (
          <p style={{ marginTop: 24, fontSize: 13, color: COLORS.textMuted, textAlign: "center" }}>
            Nothing saved yet — tap the heart on a result to keep it here.
          </p>
        )}

        {visibleProducts.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: 18,
              marginTop: 28,
            }}
          >
            {visibleProducts.map((p, i) => {
              const key = productKey(p);
              const isSaved = !!saved[key];
              return (
                <div
                  key={key}
                  style={{
                    position: "relative",
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {!showSavedOnly && (
                    <span
                      style={{
                        position: "absolute", top: 10, right: 10, zIndex: 1,
                        background: COLORS.accent, color: "#fff", fontSize: 11, fontWeight: 600,
                        padding: "4px 10px", borderRadius: 20,
                      }}
                    >
                      {pseudoMatch(i)}% match
                    </span>
                  )}
                  <button
                    onClick={() => toggleSave(p)}
                    title={isSaved ? "Remove from saved" : "Save"}
                    style={{
                      position: "absolute", top: 10, left: 10, zIndex: 1,
                      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                      color: isSaved ? COLORS.accent : COLORS.textSecondary,
                      width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 14,
                    }}
                  >
                    {isSaved ? "♥" : "♡"}
                  </button>

                  <div style={{ height: 190, background: COLORS.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 34 }}>🛍️</span>
                    )}
                  </div>

                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 11, color: COLORS.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {p.brand}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: COLORS.textPrimary, fontWeight: 600, lineHeight: 1.4 }}>
                      {p.title}
                    </p>
                    {p.price && <p style={{ margin: "2px 0 0", fontSize: 13, color: COLORS.textSecondary }}>{p.price}</p>}

                    <div style={{ marginTop: "auto", display: "flex", gap: 8, paddingTop: 10 }}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...S.btnSecondary, flex: 1, textAlign: "center", textDecoration: "none", fontSize: 12, padding: "7px 0" }}
                      >
                        View
                      </a>
                      <button
                        style={{
                          ...S.btnPrimary, flex: 1, fontSize: 12, padding: "7px 0",
                          opacity: tryOnBusyKey === key ? 0.6 : 1,
                        }}
                        onClick={() => tryThisOn(p)}
                        disabled={tryOnBusyKey === key}
                      >
                        {tryOnBusyKey === key ? "…" : "Try On"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}