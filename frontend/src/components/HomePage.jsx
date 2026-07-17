import { COLORS } from "../styles.js";

const STEPS = [
  { icon: "💬", title: "1. Chat", desc: "Get styling advice", tab: "chatbot" },
  { icon: "🛍️", title: "2. Discover", desc: "Find matching pieces", tab: "recommend" },
  { icon: "✨", title: "3. Generate", desc: "From fabric to garment", tab: "imagegen" },
  { icon: "👗", title: "4. Try On", desc: "See it on yourself", tab: "tryon" },
];

export default function HomePage({ onNavigate }) {
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "56px 24px 40px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: COLORS.accent,
            background: COLORS.accentSoftBg,
            display: "inline-block",
            padding: "4px 14px",
            borderRadius: 20,
            marginBottom: 18,
          }}
        >
          FINAL YEAR PROJECT — UMT
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 600, color: COLORS.textPrimary, margin: "0 0 14px" }}>
          Your AI-powered fashion mirror
        </h1>
        <p style={{ fontSize: 15, color: COLORS.textSecondary, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Chat for styling advice, get product recommendations, generate custom garments, and try
          them on virtually — all in one place.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() => onNavigate("chatbot")}
            style={{
              background: COLORS.accent,
              border: `1px solid ${COLORS.accent}`,
              color: "#fff",
              padding: "11px 26px",
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try it now
          </button>
          <button
            onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              background: "none",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textSecondary,
              padding: "11px 26px",
              borderRadius: 20,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            See how it works
          </button>
        </div>
      </div>

      <div
        id="how-it-works"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          padding: "0 24px 56px",
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