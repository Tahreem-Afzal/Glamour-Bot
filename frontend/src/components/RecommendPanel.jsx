import { useState, useEffect } from "react";
import { API_BASE, S, COLORS } from "../styles.js";

const CATEGORIES = ["", "dress", "shirt", "kurta", "bag", "shoes", "jewelry", "sunglasses"];
const COLOR_OPTIONS = ["", "red", "pink", "blue", "green", "black", "white", "gold", "silver", "maroon", "navy", "mustard", "mint"];
const WISHLIST_KEY = "glamourai_wishlist";

function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function RecommendPanel({ onTryOn, plannedEvent, onClearPlan }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tryingOnIndex, setTryingOnIndex] = useState(null);
  const [wishlist, setWishlist] = useState(loadWishlist);
  const [showWishlist, setShowWishlist] = useState(false);

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const isSaved = (product) => wishlist.some((w) => w.url === product.url);

  const toggleSave = (product) => {
    setWishlist((prev) =>
      prev.some((w) => w.url === product.url)
        ? prev.filter((w) => w.url !== product.url)
        : [...prev, product]
    );
  };

  // Maps a product's free-text category word to the Try-On catalog's
  // three body-placement categories, so a "Try On" click files it in the
  // right place without asking the user anything extra.
  const inferTryOnCategory = (product) => {
    const text = `${product.title} ${product.brand}`.toLowerCase();
    if (/\b(shoe|shoes|heel|heels|sandal|sneaker|slipper|khussa)\b/.test(text)) return "lower"; // footwear has no dedicated slot; closest existing bucket
    if (/\b(shirt|top|kurti|blouse|kameez)\b/.test(text)) return "upper";
    if (/\b(trouser|pant|jeans|palazzo|shalwar|skirt)\b/.test(text)) return "lower";
    return "full"; // dresses, suits, kaftans, sets, and anything unrecognized
  };

  const handleTryOn = async (product, index) => {
    setTryingOnIndex(index);
    try {
      const res = await fetch(`${API_BASE}/catalog/from-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: product.image_url,
          name: product.title,
          brand: product.brand || "",
          category: inferTryOnCategory(product),
          tags: product.colors || [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || res.statusText);
      }
      const garment = await res.json();
      onTryOn?.(garment);
    } catch (err) {
      setError(`Couldn't add "${product.title}" to Try-On: ${err.message}`);
    } finally {
      setTryingOnIndex(null);
    }
  };

  const search = async () => {
    if (!query.trim() && !category && !color && !maxPrice) {
      setError("Type a query or pick a category/color/budget first.");
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
          max_price: maxPrice ? Number(maxPrice) : null,
          city: plannedEvent?.city || city || null,
          event_date: plannedEvent?.date || null,
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
        <div style={{ ...S.formGrid, gridTemplateColumns: "1fr 1fr 1fr" }}>
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
          <div style={S.formGroup}>
            <label style={S.label}>MAX BUDGET (PKR, optional)</label>
            <input
              type="number"
              min="0"
              style={S.input}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="e.g. 12000"
            />
          </div>
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>CITY (optional — enables weather-aware fabric suggestions)</label>
          <input
            style={S.input}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Lahore"
            disabled={!!plannedEvent}
          />
        </div>

        {plannedEvent && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: COLORS.accentSoftBg, border: `1px solid ${COLORS.accent}`,
              borderRadius: 8, padding: "8px 12px", fontSize: 12, color: COLORS.accent,
            }}
          >
            <span>📅 Planning for {plannedEvent.date} in {plannedEvent.city} — results use that day's forecast.</span>
            <button
              onClick={onClearPlan}
              style={{ background: "none", border: "none", color: COLORS.accent, textDecoration: "underline", cursor: "pointer", fontSize: 12 }}
            >
              Use today instead
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }}
            onClick={search}
            disabled={loading}
          >
            {loading ? "Searching…" : "🔍 Find Products"}
          </button>
          <button
            style={{
              ...S.btnSecondary,
              borderColor: showWishlist ? COLORS.accent : S.btnSecondary.border,
              color: showWishlist ? COLORS.accent : S.btnSecondary.color,
              background: showWishlist ? COLORS.accentSoftBg : S.btnSecondary.background,
            }}
            onClick={() => setShowWishlist((s) => !s)}
          >
            {showWishlist ? "← Back to search" : `♥ Saved (${wishlist.length})`}
          </button>
        </div>
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

      {showWishlist ? (
        wishlist.length === 0 ? (
          <div style={{ ...S.card, color: COLORS.textSecondary }}>
            Nothing saved yet — tap the ♡ on any product to keep it here.
          </div>
        ) : (
          renderProductGrid(wishlist)
        )
      ) : (
        <>
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
              {renderProductGrid(result.products)}
            </>
          )}
        </>
      )}
    </div>
  );

  function renderProductGrid(products) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {products.map((p, i) => (
          <div
            key={p.url || i}
            style={{
              ...S.card,
              padding: 0,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <button
              onClick={() => toggleSave(p)}
              title={isSaved(p) ? "Remove from saved" : "Save for later"}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 2,
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.9)",
                color: isSaved(p) ? COLORS.accent : COLORS.textMuted,
                fontSize: 15,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSaved(p) ? "♥" : "♡"}
            </button>
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
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
              <div style={{ padding: "12px 14px 8px" }}>
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
            <div style={{ padding: "0 14px 14px" }}>
              <button
                style={{
                  ...S.btnPrimary,
                  width: "100%",
                  padding: "8px 0",
                  fontSize: 12,
                  opacity: tryingOnIndex === i ? 0.6 : 1,
                }}
                onClick={() => handleTryOn(p, i)}
                disabled={tryingOnIndex === i || !p.image_url}
                title={!p.image_url ? "No product photo available to try on" : undefined}
              >
                {tryingOnIndex === i ? "Adding…" : "✦ Try On"}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
}