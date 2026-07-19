import { useState, useEffect, useCallback } from "react";
import { API_BASE, S, COLORS } from "./styles.js";
import { apiFetch, setAuthToken, setUnauthorizedHandler } from "./api.js";
import HomePage from "./components/HomePage.jsx";
import ChatbotPanel from "./components/ChatbotPanel.jsx";
import RecommendPanel from "./components/RecommendPanel.jsx";
import ImageGenPanel from "./components/ImageGenPanel.jsx";
import TryOnPanel from "./components/TryOnPanel.jsx";
import WeatherWidget from "./components/WeatherWidget.jsx";
import AboutPage from "./components/AboutPage.jsx";
import LoginPage from "./components/LoginPage.jsx";

const TABS = [
  ["home", "Home", "ہوم"],
  ["recommend", "Recommendations", "تجاویز"],
  ["chatbot", "Chatbot", "چیٹ بوٹ"],
  ["imagegen", "Image Generation", "تصویر کی تخلیق"],
  ["tryon", "Try-On", "آزما کر دیکھیں"],
  ["about", "About Us", "ہمارے بارے میں"],
];

const STATUS_TEXT = {
  ready: { en: "all systems ready", ur: "تمام سسٹم تیار ہیں" },
  degraded: { en: "backend up (some keys missing)", ur: "بیک اینڈ فعال ہے (کچھ کیز موجود نہیں)" },
  down: { en: "backend unreachable", ur: "بیک اینڈ تک رسائی نہیں" },
};

const TOKEN_STORAGE_KEY = "glamourai_token";

export default function App() {
  // --- Auth state -----------------------------------------------------
  // "checking" = still verifying a stored token on first load (avoids a
  // flash of the login page for someone who's already signed in).
  const [authStatus, setAuthStatus] = useState("checking"); // "checking" | "authed" | "anon"
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
    setAuthStatus("anon");
  }, []);

  const handleAuthenticated = (newToken, newUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setAuthToken(newToken);
    setUser(newUser);
    setAuthStatus("authed");
  };

  // On first load: if a token is saved, verify it's still valid via
  // /auth/me before trusting it — an expired/revoked token should bounce
  // straight back to the login page rather than showing a broken app.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!saved) {
      setAuthStatus("anon");
      return;
    }
    setAuthToken(saved);
    apiFetch(`${API_BASE}/auth/me`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((u) => {
        setUser(u);
        setAuthStatus("authed");
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setAuthStatus("anon");
      });
  }, [logout]);

  // --- Everything below only matters once authenticated ---------------
  const [tab, setTab] = useState("home");
  const [health, setHealth] = useState(null);
  const [pendingTryOnGarment, setPendingTryOnGarment] = useState(null);
  const [plannedEvent, setPlannedEvent] = useState(null); // { city, date } | null
  const [lang, setLang] = useState("en");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (authStatus !== "authed") return;
    apiFetch(`${API_BASE}/health`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setHealth)
      .catch(() => setHealth(null));
  }, [authStatus]);

  const statusColor = health ? COLORS.green : COLORS.red;
  const statusKey = health
    ? [
        !health.fashn_configured && "no FASHN key",
        !health.stability_configured && "no Stability key",
        !health.groq_configured && "no Groq key",
      ].filter(Boolean).length > 0
        ? "degraded"
        : "ready"
    : "down";
  const statusText = STATUS_TEXT[statusKey][lang];

  if (authStatus === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
        <span style={S.spinner} />
      </div>
    );
  }

  if (authStatus === "anon") {
    return <LoginPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.logo}>
          <span style={{ color: COLORS.accent, fontSize: 20 }}>◈</span>
          <span style={S.logoText}>
            GLAMOUR<span style={{ color: COLORS.accent }}>AI</span>
          </span>
        </div>
        <nav className="glamourai-nav" style={S.nav}>
          {TABS.map(([t, en, ur]) => (
            <button key={t} style={{ ...S.navBtn, ...(tab === t ? S.navBtnActive : {}) }} onClick={() => setTab(t)}>
              {lang === "ur" ? ur : en}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <WeatherWidget plannedEvent={plannedEvent} onPlanChange={setPlannedEvent} />
          <div style={S.statusPill}>
            <span style={{ ...S.dot, background: health ? statusColor : COLORS.textMuted }} />
            <span>{statusText}</span>
          </div>
          <div style={{ display: "flex", border: `1px solid ${COLORS.border}`, borderRadius: 20, overflow: "hidden", flexShrink: 0 }}>
            <button
              onClick={() => setLang("en")}
              style={{
                border: "none",
                padding: "5px 14px",
                fontSize: 11,
                cursor: "pointer",
                background: lang === "en" ? COLORS.accent : "none",
                color: lang === "en" ? "#fff" : COLORS.textSecondary,
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLang("ur")}
              style={{
                border: "none",
                padding: "5px 14px",
                fontSize: 11,
                cursor: "pointer",
                background: lang === "ur" ? COLORS.accent : "none",
                color: lang === "ur" ? "#fff" : COLORS.textSecondary,
              }}
            >
              اردو
            </button>
          </div>

          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: COLORS.accentSoftBg,
                border: `1.5px solid ${COLORS.accent}`,
                color: COLORS.accentDark,
                borderRadius: 20,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 20, height: 20, borderRadius: "50%", background: COLORS.accent, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                }}
              >
                {(user?.name || user?.email || "?").trim()[0]?.toUpperCase()}
              </span>
              {user?.name || user?.email}
            </button>
            {userMenuOpen && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
                  background: COLORS.surface, border: `1.5px solid ${COLORS.accent}`, borderRadius: 10,
                  padding: 10, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.textSecondary, wordBreak: "break-word" }}>
                  {user?.email}
                </p>
                <button
                  onClick={logout}
                  style={{
                    width: "100%", background: COLORS.redSoftBg, border: `1px solid ${COLORS.red}`,
                    color: COLORS.red, borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div key={tab} className="glamourai-page-transition">
          {tab === "home" && <HomePage onNavigate={setTab} lang={lang} />}
          {tab === "chatbot" && <ChatbotPanel lang={lang} plannedEvent={plannedEvent} onClearPlan={() => setPlannedEvent(null)} />}
          {tab === "recommend" && (
            <RecommendPanel
              lang={lang}
              plannedEvent={plannedEvent}
              onClearPlan={() => setPlannedEvent(null)}
              onTryOn={(garment) => {
                setPendingTryOnGarment(garment);
                setTab("tryon");
              }}
            />
          )}
          {tab === "imagegen" && <ImageGenPanel lang={lang} />}
          {tab === "tryon" && (
            <TryOnPanel
              lang={lang}
              pendingGarment={pendingTryOnGarment}
              onConsumePending={() => setPendingTryOnGarment(null)}
            />
          )}
          {tab === "about" && <AboutPage lang={lang} />}
        </div>
      </div>
    </div>
  );
}