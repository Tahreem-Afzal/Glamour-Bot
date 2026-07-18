import { useState } from "react";
import { COLORS, FONT_DISPLAY } from "../styles.js";

const CARDS = [
  { icon: "🏠", title: "Home", desc: "Back to the start", tab: "home" },
  { icon: "🛍️", title: "Recommendation system", desc: "Find matching pieces", tab: "recommend" },
  { icon: "💬", title: "Chatbot", desc: "Get styling advice", tab: "chatbot" },
  { icon: "✨", title: "Image generation", desc: "From fabric to garment", tab: "imagegen" },
  { icon: "👗", title: "Try on", desc: "See it on yourself", tab: "tryon" },
  { icon: "ℹ️", title: "About us", desc: "Meet the team", tab: "about" },
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

export default function HomePage({ onNavigate, lang = "en" }) {
  const c = COPY[lang];
  const isUrdu = lang === "ur";
  const [hoveredTab, setHoveredTab] = useState(null);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 40px", position: "relative" }}>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          padding: "24px 24px 56px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {CARDS.map((s) => {
          const hovered = hoveredTab === s.tab;
          const isCurrent = s.tab === "home";
          return (
            <button
              key={s.tab}
              onClick={() => onNavigate(s.tab)}
              onMouseEnter={() => setHoveredTab(s.tab)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                background: isCurrent ? COLORS.accent : COLORS.accentSoftBg,
                border: `2px solid ${isCurrent ? COLORS.accentDark : COLORS.accent}`,
                borderRadius: 12,
                padding: "20px 16px",
                textAlign: "center",
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
                transform: hovered ? "translateY(-3px)" : "none",
                boxShadow: hovered ? "0 8px 20px rgba(194, 24, 91, 0.18)" : "none",
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: isCurrent ? "#fff" : COLORS.textPrimary }}>
                {s.title}
                {isCurrent && (
                  <span style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#fff", opacity: 0.85, marginTop: 2 }}>
                    YOU ARE HERE
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: isCurrent ? "rgba(255,255,255,0.85)" : COLORS.textSecondary, marginTop: 3 }}>
                {s.desc}
              </div>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontSize: 15,
                  color: isCurrent ? "#fff" : COLORS.accent,
                  fontWeight: 700,
                  opacity: hovered ? 1 : 0,
                  transform: hovered ? "translateX(0)" : "translateX(-6px)",
                  transition: "opacity 0.15s, transform 0.15s",
                }}
              >
                →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}