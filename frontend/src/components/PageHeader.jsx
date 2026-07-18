import { COLORS, FONT_DISPLAY } from "../styles.js";

export default function PageHeader({ eyebrow, title, subtitle, eyebrowStyle }) {
  return (
    <div style={{ padding: "40px clamp(16px, 6vw, 100px) 28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          letterSpacing: 2,
          color: COLORS.accent,
          fontWeight: 600,
          marginBottom: 14,
          ...eyebrowStyle,
        }}
      >
        <span style={{ width: "1.4em", height: 2, background: COLORS.accent, display: "inline-block" }} />
        {eyebrow.toUpperCase()}
      </div>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 500,
          fontSize: 34,
          color: COLORS.textPrimary,
          margin: "0 0 12px",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0, lineHeight: 1.6, maxWidth: 560 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}