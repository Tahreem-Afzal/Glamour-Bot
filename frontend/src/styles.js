// Local dev hits localhost:8000. In production, set VITE_API_BASE in
// Render's environment variables to your deployed backend's URL
// (e.g. https://glamourai-backend.onrender.com) before building.
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// Editorial "cream & raspberry" palette — warm terracotta cream with a deep
// magenta-raspberry accent, matched from the approved reference designs.
export const FONT_DISPLAY = "'Lora', Georgia, serif";

export const COLORS = {
  bg: "#FBE9DA",
  surface: "#FFFFFF",
  surfaceAlt: "#F3E3CD",
  border: "#EAD6C2",
  borderStrong: "#E9B9CE",
  textPrimary: "#2A2019",
  textSecondary: "#8C7A6E",
  textMuted: "#B7A796",
  accent: "#C2185B",
  accentDark: "#96123F",
  accentSoftBg: "#F7D9E4",
  gold: "#D9A441",
  goldSoftBg: "#FBF0DC",
  green: "#2F7D3D",
  greenSoftBg: "#DEF3E1",
  red: "#D5393D",
  redSoftBg: "#FBE1E1",
  purple: "#8E5FBE",
  purpleSoftBg: "#F1E9FA",
  cardBg: "#FDEEE1",
};

export const S = {
  root: {
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    background: COLORS.bg,
    color: COLORS.textPrimary,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 28px",
    background: COLORS.bg,
    borderBottom: `1px solid ${COLORS.border}`,
    flexShrink: 0,
    flexWrap: "wrap",
    gap: 10,
  },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoText: { fontSize: 18, fontWeight: 700, letterSpacing: 4, color: COLORS.textPrimary },
  nav: { display: "flex", gap: 4, flexWrap: "wrap" },
  navBtn: {
    background: "none",
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textSecondary,
    padding: "6px 16px",
    cursor: "pointer",
    fontSize: 12,
    letterSpacing: 1,
    borderRadius: 20,
  },
  navBtnActive: { color: COLORS.accent, borderColor: COLORS.accent, background: COLORS.accentSoftBg },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 11,
    color: COLORS.textSecondary,
    background: COLORS.surfaceAlt,
    border: `1px solid ${COLORS.border}`,
    padding: "4px 12px",
    borderRadius: 20,
  },
  dot: { width: 7, height: 7, borderRadius: "50%" },
  toast: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 9999,
    padding: "10px 18px",
    borderRadius: 6,
    fontSize: 13,
    border: "1px solid",
    maxWidth: 380,
    lineHeight: 1.5,
  },
  page: { flex: 1, overflowY: "auto", padding: "22px clamp(16px, 6vw, 100px)" },
  pageNarrow: { flex: 1, overflowY: "auto", padding: "0 clamp(16px, 6vw, 100px) 48px" },
  pageTitle: { fontSize: 16, letterSpacing: 3, color: COLORS.accent, margin: "0 0 18px" },
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    boxShadow: "0 2px 10px rgba(194, 24, 91, 0.05)",
  },
  label: { fontSize: 10, color: COLORS.textSecondary, letterSpacing: 1, textTransform: "uppercase" },
  input: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textPrimary,
    padding: "9px 12px",
    fontSize: 13,
    borderRadius: 6,
    fontFamily: "inherit",
    outline: "none",
  },
  textarea: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textPrimary,
    padding: "9px 12px",
    fontSize: 13,
    borderRadius: 6,
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    minHeight: 70,
  },
  formGroup: { display: "flex", flexDirection: "column", gap: 5 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 },
  btnPrimary: {
    background: COLORS.accent,
    border: `1px solid ${COLORS.accent}`,
    color: "#FFFFFF",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 20,
  },
  btnSecondary: {
    background: COLORS.surfaceAlt,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textSecondary,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 13,
    borderRadius: 20,
  },
  btnSave: {
    background: COLORS.greenSoftBg,
    border: `1px solid ${COLORS.green}`,
    color: COLORS.green,
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: 12,
    borderRadius: 20,
  },
  spinnerWrap: { display: "flex", alignItems: "center", gap: 10, color: COLORS.textSecondary, fontSize: 13 },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: `3px solid ${COLORS.border}`,
    borderTopColor: COLORS.accent,
    animation: "spin 0.8s linear infinite",
  },
};

if (typeof document !== "undefined" && !document.getElementById("glamourai-keyframes")) {
  const style = document.createElement("style");
  style.id = "glamourai-keyframes";
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes glamourai-page-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .glamourai-page-transition {
      animation: glamourai-page-in 0.32s ease both;
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
    }

    /* ---- Mobile fixes ---- */
    @media (max-width: 720px) {
      .glamourai-hero-grid {
        grid-template-columns: 1fr !important;
      }
      .glamourai-home-phones {
        display: none !important;
      }
      .glamourai-nav {
        overflow-x: auto;
        flex-wrap: nowrap !important;
        -webkit-overflow-scrolling: touch;
        max-width: 100%;
      }
      .glamourai-nav::-webkit-scrollbar {
        display: none;
      }
      .glamourai-nav button {
        flex-shrink: 0;
      }
      .glamourai-page-transition {
        overflow-x: hidden;
      }
    }
  `;
  document.head.appendChild(style);
}