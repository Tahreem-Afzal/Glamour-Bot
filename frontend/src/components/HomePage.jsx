import { useState } from "react";
import { COLORS, FONT_DISPLAY } from "../styles.js";

const STEPS = [
  { icon: "💬", title: "1. Chat", desc: "Get styling advice", tab: "chatbot" },
  { icon: "🛍️", title: "2. Discover", desc: "Find matching pieces", tab: "recommend" },
  { icon: "✨", title: "3. Generate", desc: "From fabric to garment", tab: "imagegen" },
  { icon: "👗", title: "4. Try On", desc: "See it on yourself", tab: "tryon" },
];

const NAV_PILLS = [
  { label: "Recommendation system", tab: "recommend" },
  { label: "Open the chatbot", tab: "chatbot" },
  { label: "Image generation", tab: "imagegen" },
  { label: "Try the AR fitting room", tab: "tryon" },
  { label: "About us", tab: "about" },
];

const COPY = {
  en: {
    headline: ["Style advice that ", "actually", " speaks your language."],
    body: "A bilingual AI fashion assistant that chats in English or Urdu, recommends outfits from a real Pakistani brand catalog, and lets you try them on before you buy — all through the browser, no app install.",
  },
  ur: {
    headline: ["اسٹائل کا مشورہ جو ", "واقعی", " آپ کی زبان میں بات کرتا ہے۔"],
    body: "ایک دو لسانی AI فیشن اسسٹنٹ جو انگریزی یا اردو میں بات کرتا ہے، ایک حقیقی پاکستانی برانڈ کیٹلاگ سے آؤٹ فٹس تجویز کرتا ہے، اور خریدنے سے پہلے آپ کو انہیں آزمانے دیتا ہے — یہ سب براؤزر کے ذریعے، کسی ایپ کی تنصیب کے بغیر۔",
  },
};

function PhoneMockup({ offset = 0, messages }) {
  return (
    <div
      style={{
        position: "absolute",
        left: offset,
        top: offset * 0.6,
        width: 200,
        borderRadius: 24,
        border: `8px solid ${COLORS.textPrimary}`,
        background: COLORS.bg,
        overflow: "hidden",
        boxShadow: "0 12px 28px rgba(46,34,48,0.18)",
      }}
    >
      <div style={{ background: COLORS.accent, color: "#fff", fontSize: 11, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
        GlamourAI
      </div>
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 220 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.mine ? "flex-end" : "flex-start",
              background: m.mine ? COLORS.accent : COLORS.surface,
              color: m.mine ? "#fff" : COLORS.textPrimary,
              border: m.mine ? "none" : `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "6px 9px",
              fontSize: 10,
              maxWidth: "85%",
              lineHeight: 1.4,
            }}
          >
            {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ onNavigate }) {
  const [lang, setLang] = useState("en");
  const c = COPY[lang];
  const isUrdu = lang === "ur";

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 40px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <div style={{ display: "flex", border: `1px solid ${COLORS.border}`, borderRadius: 20, overflow: "hidden" }}>
            <button
              onClick={() => setLang("en")}
              style={{
                border: "none", padding: "5px 14px", fontSize: 11, cursor: "pointer",
                background: lang === "en" ? COLORS.accent : "none",
                color: lang === "en" ? "#fff" : COLORS.textSecondary,
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLang("ur")}
              style={{
                border: "none", padding: "5px 14px", fontSize: 11, cursor: "pointer",
                background: lang === "ur" ? COLORS.accent : "none",
                color: lang === "ur" ? "#fff" : COLORS.textSecondary,
              }}
            >
              اردو
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 40, alignItems: "center" }}>
          <div dir={isUrdu ? "rtl" : "ltr"}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: 2,
                color: COLORS.accent, marginBottom: 18, justifyContent: isUrdu ? "flex-end" : "flex-start",
              }}
            >
              {!isUrdu && <span style={{ width: 16, height: 1, background: COLORS.accent }} />}
              GLAMOURAI
              {isUrdu && <span style={{ width: 16, height: 1, background: COLORS.accent }} />}
            </div>
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 38,
                fontWeight: 500,
                color: COLORS.textPrimary,
                margin: "0 0 18px",
                lineHeight: 1.25,
                textAlign: isUrdu ? "right" : "left",
              }}
            >
              {c.headline[0]}
              <span style={{ fontStyle: "italic", color: COLORS.accent }}>{c.headline[1]}</span>
              {c.headline[2]}
            </h1>
            <p
              style={{
                fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.7,
                maxWidth: 480, margin: isUrdu ? "0 0 28px auto" : "0 0 28px",
                textAlign: isUrdu ? "right" : "left",
              }}
            >
              {c.body}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: isUrdu ? "flex-end" : "flex-start" }}>
              <button
                onClick={() => onNavigate("home")}
                style={{
                  background: COLORS.accentSoftBg, border: `1px solid ${COLORS.accent}`, color: COLORS.accent,
                  padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                Home
              </button>
              {NAV_PILLS.map((p) => (
                <button
                  key={p.tab}
                  onClick={() => onNavigate(p.tab)}
                  style={{
                    background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary,
                    padding: "8px 16px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="glamourai-home-phones" style={{ position: "relative", height: 300 }}>
            <PhoneMockup
              offset={40}
              messages={[
                { text: "Salam! Looking for something for a wedding, or everyday wear?" },
                { text: "Wedding — something in maroon, size M", mine: true },
                { text: "Found 3 pieces from Sana Safinaz and Khaadi. Want to try the first one?" },
              ]}
            />
            <PhoneMockup
              offset={0}
              messages={[
                { text: "Ap ko kis event ke liye outfit chahiye?" },
                { text: "Eid ke liye kuch light pink chahiye", mine: true },
                { text: "Got it — here are a few light pink options." },
              ]}
            />
          </div>
        </div>
      </div>

      <div
        id="how-it-works"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          padding: "24px 24px 56px",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {STEPS.map((s) => (
          <button
            key={s.tab}
            onClick={() => onNavigate(s.tab)}
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "20px 16px",
              textAlign: "center",
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = `0 8px 20px rgba(198, 66, 125, 0.12)`;
              e.currentTarget.style.borderColor = COLORS.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = COLORS.border;
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{s.title}</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>{s.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}