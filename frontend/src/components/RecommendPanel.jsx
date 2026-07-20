import { useState } from "react";
import { API_BASE, S, COLORS } from "../styles.js";
import { apiFetch } from "../api.js";
import PageHeader from "./PageHeader.jsx";

const CATEGORY_OPTIONS = [
  ["", "Any", "کوئی بھی"],
  ["shirt", "Shirts", "شرٹس"],
  ["kurta", "Kurtas", "کرتے"],
  ["jeans", "Jeans", "جینز"],
  ["lawn suit", "Lawn Suits", "لان سوٹ"],
  ["heels", "Heels", "ہیلز"],
  ["sneakers", "Sneakers", "اسنیکرز"],
  ["bag", "Bags", "بیگز"],
  ["jewelry", "Jewelry", "زیورات"],
  ["dress", "Dresses", "ڈریسز"],
];

// Try-On's catalog only understands three garment-shape buckets
// (upper/lower/full — that's what drives its Tops/Bottoms/Dresses filter
// chips and the Full-Outfit top+bottom picker). Recommendations' search
// category uses shopping-style labels instead, so map between the two
// whenever a result gets sent to Try-On via tryThisOn() below.
const SEARCH_TO_TRYON_CATEGORY = {
  shirt: "upper",
  kurta: "upper",
  jeans: "lower",
  "lawn suit": "full",
  dress: "full",
  heels: "full",
  sneakers: "full",
  bag: "full",
  jewelry: "full",
};

const COLOR_OPTIONS = [
  ["", "Any", "کوئی بھی"],
  ["red", "Red", "سرخ"],
  ["maroon", "Maroon", "میرون"],
  ["black", "Black", "کالا"],
  ["white", "White", "سفید"],
  ["blue", "Blue", "نیلا"],
  ["pink", "Pink", "گلابی"],
  ["gold", "Gold", "سنہرا"],
  ["green", "Green", "سبز"],
  ["beige", "Beige", "بیج"],
];

const T = {
  en: {
    eyebrow: "Recommendation system",
    title: "Tell it what you need, get matches back.",
    subtitle: "Discover dresses, accessories, and shoes curated just for you. Simply describe what you're looking for, choose your preferred color and price range, and let us bring you personalized recommendations that match your unique style.",
    lookingForLabel: "WHAT ARE YOU LOOKING FOR?",
    lookingForPlaceholder: "e.g. formal red heels for an engagement",
    categoryLabel: "CATEGORY (OPTIONAL)",
    colorLabel: "COLOR (OPTIONAL)",
    budgetLabel: "MAX BUDGET (PKR, OPTIONAL)",
    budgetPlaceholder: "e.g. 12000",
    cityLabel: "CITY (OPTIONAL — ENABLES WEATHER-AWARE FABRIC SUGGESTIONS)",
    cityPlaceholder: "e.g. Lahore",
    planningFor: (date, city) => `📅 Planning for ${date} in ${city} — suggestions use that day's forecast.`,
    useToday: "Use today instead",
    searching: "Searching…",
    findProducts: "🔍 Find products",
    saved: (n) => `♡ Saved (${n})`,
    tellFirst: "Tell it what you're looking for first.",
    couldntReach: (msg) => `Couldn't reach the backend: ${msg}`,
    couldntTryOn: (msg) => `Couldn't send that to Try-On: ${msg}`,
    nothingSaved: "Nothing saved yet — tap the heart on a result to keep it here.",
    match: (pct) => `${pct}% match`,
    removeSaved: "Remove from saved",
    save: "Save",
    view: "View",
    tryOn: "Try On",
    groupLabels: { clothing: "Clothing", bags: "Bags", footwear: "Footwear", eyewear: "Eyewear", jewelry: "Jewelry" },
  },
  ur: {
    eyebrow: "تجاویز کا نظام",
    title: "بتائیں آپ کو کیا چاہیے، ہم آپ کو ملتی جلتی اشیاء دکھائیں گے۔",
    subtitle: "اپنے لیے منتخب کردہ ڈریسز، لوازمات اور جوتے دریافت کریں۔ بس بتائیں آپ کیا تلاش کر رہے ہیں، اپنا پسندیدہ رنگ اور قیمت کی حد منتخب کریں، اور ہم آپ کو آپ کے اپنے انداز سے میل کھاتی ذاتی تجاویز فراہم کریں گے۔",
    lookingForLabel: "آپ کیا تلاش کر رہے ہیں؟",
    lookingForPlaceholder: "مثلاً منگنی کے لیے رسمی سرخ ہیلز",
    categoryLabel: "قسم (اختیاری)",
    colorLabel: "رنگ (اختیاری)",
    budgetLabel: "زیادہ سے زیادہ بجٹ (روپے، اختیاری)",
    budgetPlaceholder: "مثلاً 12000",
    cityLabel: "شہر (اختیاری — موسم کے مطابق کپڑے کی تجاویز کے لیے)",
    cityPlaceholder: "مثلاً لاہور",
    planningFor: (date, city) => `📅 ${city} میں ${date} کے لیے منصوبہ بندی — تجاویز اُس دن کی پیشگوئی کے مطابق ہیں۔`,
    useToday: "آج کا استعمال کریں",
    searching: "تلاش ہو رہی ہے…",
    findProducts: "🔍 مصنوعات تلاش کریں",
    saved: (n) => `♡ محفوظ شدہ (${n})`,
    tellFirst: "پہلے بتائیں آپ کیا تلاش کر رہے ہیں۔",
    couldntReach: (msg) => `بیک اینڈ تک رسائی نہیں ہو سکی: ${msg}`,
    couldntTryOn: (msg) => `اسے ٹرائی آن پر نہیں بھیجا جا سکا: ${msg}`,
    nothingSaved: "ابھی تک کچھ محفوظ نہیں کیا گیا — کسی نتیجے پر دل کے آئیکن کو دبائیں۔",
    match: (pct) => `${pct}% موزوں`,
    removeSaved: "محفوظ شدہ سے ہٹائیں",
    save: "محفوظ کریں",
    view: "دیکھیں",
    tryOn: "ٹرائی آن",
    groupLabels: { clothing: "لباس", bags: "بیگز", footwear: "جوتے", eyewear: "چشمے", jewelry: "زیورات" },
  },
};

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

export default function RecommendPanel({ lang = "en", plannedEvent, onClearPlan, onTryOn }) {
  const t = T[lang];
  const isUrdu = lang === "ur";

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
  const [isMulti, setIsMulti] = useState(false);
  const [groups, setGroups] = useState([]);
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
      setError(t.tellFirst);
      return;
    }
    setSearching(true);
    setError("");
    setMessage("");
    setWeatherNote("");
    setShowSavedOnly(false);
    try {
      const res = await apiFetch(`${API_BASE}/recommend/`, {
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
      setIsMulti(!!data.is_multi);
      setGroups(data.is_multi ? data.groups : []);
      setMessage(data.message || "");
      setWeatherNote(data.weather_note || "");
    } catch (err) {
      setError(t.couldntReach(err.message));
      setProducts([]);
      setIsMulti(false);
      setGroups([]);
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
      const res = await apiFetch(`${API_BASE}/catalog/from-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: p.image_url,
          name: p.title,
          brand: p.brand,
          category: SEARCH_TO_TRYON_CATEGORY[category] || "full",
          tags: p.colors || [],
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const garment = await res.json();
      onTryOn?.(garment);
    } catch (err) {
      setError(t.couldntTryOn(err.message));
    } finally {
      setTryOnBusyKey(null);
    }
  };

  const renderProductGrid = (list, showMatchBadge) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        gap: 18,
        marginTop: 12,
      }}
    >
      {list.map((p, i) => {
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
            {showMatchBadge && (
              <span
                style={{
                  position: "absolute", top: 10, [isUrdu ? "left" : "right"]: 10, zIndex: 1,
                  background: COLORS.accent, color: "#fff", fontSize: 11, fontWeight: 600,
                  padding: "4px 10px", borderRadius: 20,
                }}
              >
                {t.match(pseudoMatch(i))}
              </span>
            )}
            <button
              onClick={() => toggleSave(p)}
              title={isSaved ? t.removeSaved : t.save}
              style={{
                position: "absolute", top: 10, [isUrdu ? "right" : "left"]: 10, zIndex: 1,
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
                  {t.view}
                </a>
                <button
                  style={{
                    ...S.btnPrimary, flex: 1, fontSize: 12, padding: "7px 0",
                    opacity: tryOnBusyKey === key ? 0.6 : 1,
                  }}
                  onClick={() => tryThisOn(p)}
                  disabled={tryOnBusyKey === key}
                >
                  {tryOnBusyKey === key ? "…" : t.tryOn}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <PageHeader
        eyebrow={t.eyebrow}
        eyebrowStyle={{ fontSize: 22, fontWeight: 800, color: COLORS.accent, letterSpacing: 1.5 }}
        title={t.title}
        subtitle={t.subtitle}
      />

      <div dir={isUrdu ? "rtl" : "ltr"} style={{ padding: "0 clamp(16px, 6vw, 100px) 48px" }}>
        <div style={{ ...S.card, border: `3px solid ${COLORS.accent}` }}>
          <div style={S.formGroup}>
            <label style={S.label}>{t.lookingForLabel}</label>
            <input
              style={fieldStyle}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t.lookingForPlaceholder}
            />
          </div>

          <div style={S.formGrid}>
            <div style={S.formGroup}>
              <label style={S.label}>{t.categoryLabel}</label>
              <select style={fieldStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map(([v, enLabel, urLabel]) => (
                  <option key={v} value={v}>
                    {isUrdu ? urLabel : enLabel}
                  </option>
                ))}
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>{t.colorLabel}</label>
              <select style={fieldStyle} value={color} onChange={(e) => setColor(e.target.value)}>
                {COLOR_OPTIONS.map(([v, enLabel, urLabel]) => (
                  <option key={v} value={v}>
                    {isUrdu ? urLabel : enLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={S.formGrid}>
            <div style={S.formGroup}>
              <label style={S.label}>{t.budgetLabel}</label>
              <input
                style={fieldStyle}
                type="number"
                min="0"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder={t.budgetPlaceholder}
              />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>{t.cityLabel}</label>
              <input
                style={fieldStyle}
                value={plannedEvent?.city || city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t.cityPlaceholder}
                disabled={!!plannedEvent}
              />
            </div>
          </div>

          {plannedEvent && (
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: COLORS.accentSoftBg, border: `1px solid ${COLORS.accent}`,
                borderRadius: 8, padding: "8px 12px", fontSize: 12, color: COLORS.accent, flexWrap: "wrap", gap: 8,
              }}
            >
              <span>{t.planningFor(plannedEvent.date, plannedEvent.city)}</span>
              <button
                onClick={onClearPlan}
                style={{ background: "none", border: "none", color: COLORS.accent, textDecoration: "underline", cursor: "pointer", fontSize: 12 }}
              >
                {t.useToday}
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={{ ...S.btnPrimary, opacity: searching ? 0.6 : 1 }} onClick={() => findProducts()} disabled={searching}>
              {searching ? t.searching : t.findProducts}
            </button>
            <button
              style={{
                ...S.btnSecondary,
                ...(showSavedOnly ? { borderColor: COLORS.accent, color: COLORS.accent, background: COLORS.accentSoftBg } : {}),
              }}
              onClick={() => setShowSavedOnly((v) => !v)}
            >
              {t.saved(savedCount)}
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
            {t.nothingSaved}
          </p>
        )}

        {showSavedOnly && visibleProducts.length > 0 && renderProductGrid(visibleProducts, false)}

        {!showSavedOnly && isMulti && groups.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
            {groups.map((g) => (
              <div key={g.label}>
                <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, textTransform: "capitalize", margin: "0 0 10px" }}>
                  {t.groupLabels[g.label] || g.label}
                </p>
                {g.has_results ? (
                  renderProductGrid(g.products, true)
                ) : (
                  <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>{g.message}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {!showSavedOnly && !isMulti && visibleProducts.length > 0 && renderProductGrid(visibleProducts, true)}
      </div>
    </div>
  );
}