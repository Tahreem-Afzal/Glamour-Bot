import { useState } from "react";
import { API_BASE, S, COLORS } from "../styles.js";

const CATEGORIES = ["", "dress", "shirt", "kurta", "bag", "shoes", "jewelry", "sunglasses"];
const COLOR_OPTIONS = ["", "red", "pink", "blue", "green", "black", "white", "gold", "silver", "maroon", "navy", "mustard", "mint"];

export default function RecommendPanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const search = async () => {
    if (!query.trim() && !category && !color) {
      setError("Type a query or pick a category/color first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/recommend/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || "outfit",
          category: category || null,
          color: color || null,
          city: city || null,
          max_results: 8,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <h2 style={S.pageTitle}>RECOMMENDATION SYSTEM</h2>

      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={S.formGroup}>
          <label style={S.label}>WHAT ARE YOU LOOKING FOR?</label>
          <input
            style={S.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. formal red heels for an engagement"
          />
        </div>
        <div style={S.formGrid}>
          <div style={S.formGroup}>
            <label style={S.label}>CATEGORY (optional)</label>
            <select style={S.input} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c || "Any"}
                </option>
              ))}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>COLOR (optional)</label>
            <select style={S.input} value={color} onChange={(e) => setColor(e.target.value)}>
              {COLOR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c || "Any"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>CITY (optional — enables weather-aware fabric suggestions)</label>
          <input style={S.input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lahore" />
        </div>
        <button
          style={{ ...S.btnPrimary, alignSelf: "flex-start", opacity: loading ? 0.6 : 1 }}
          onClick={search}
          disabled={loading}
        >
          {loading ? "Searching…" : "🔍 Find Products"}
        </button>
      </div>

      {loading && (
        <div style={S.spinnerWrap}>
          <span style={S.spinner} /> Fetching live product data — first search after a while can take a few
          seconds while brand catalogs refresh.
        </div>
      )}

      {error && (
        <div style={{ ...S.card, borderColor: COLORS.red, color: COLORS.red }}>⚠️ {error}</div>
      )}

      {result && !result.has_results && (
        <div style={{ ...S.card, color: COLORS.gold }}>{result.message}</div>
      )}

      {result && result.has_results && (
        <>
          {result.weather_note && (
            <div style={{ ...S.card, color: COLORS.textSecondary, fontSize: 12, marginBottom: 14 }}>
              {result.weather_note}
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {result.products.map((p, i) => (
              <a
                key={i}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...S.card,
                  padding: 0,
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    height: 160,
                    background: COLORS.surfaceAlt,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 32 }}>👗</span>
                  )}
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{p.title}</p>
                  <p style={{ margin: "4px 0", fontSize: 11, color: COLORS.textSecondary }}>{p.brand}</p>
                  {p.colors?.length > 0 && (
                    <p style={{ margin: "4px 0", fontSize: 11, color: COLORS.accent }}>
                      {p.colors.join(" / ")} {p.colors_confirmed ? "" : "(approx.)"}
                    </p>
                  )}
                  {p.price && <p style={{ margin: 0, fontSize: 13, color: COLORS.green }}>PKR {p.price}</p>}
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
