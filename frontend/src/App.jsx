import { useState, useEffect } from "react";
import { API_BASE, S, COLORS } from "./styles.js";
import ChatbotPanel from "./components/ChatbotPanel.jsx";
import RecommendPanel from "./components/RecommendPanel.jsx";
import ImageGenPanel from "./components/ImageGenPanel.jsx";
import TryOnPanel from "./components/TryOnPanel.jsx";

const TABS = [
  ["chatbot", "Chatbot"],
  ["recommend", "Recommendations"],
  ["imagegen", "Image Generation"],
  ["tryon", "Try-On"],
];

export default function App() {
  const [tab, setTab] = useState("chatbot");
  const [health, setHealth] = useState(null);
  // Set by RecommendPanel's "Try On" button, consumed by TryOnPanel — lets a
  // product from Recommendations land pre-selected in the Try-On catalog
  // without the user having to manually re-find/upload it.
  const [pendingTryOnGarment, setPendingTryOnGarment] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const statusColor = health ? COLORS.green : COLORS.red;
  const statusText = health
    ? [
        !health.fashn_configured && "no FASHN key",
        !health.stability_configured && "no Stability key",
        !health.groq_configured && "no Groq key",
      ].filter(Boolean).length > 0
        ? "backend up (some keys missing)"
        : "all systems ready"
    : "backend unreachable";

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.logo}>
          <span style={{ color: COLORS.accent, fontSize: 20 }}>◈</span>
          <span style={S.logoText}>
            GLAMOUR<span style={{ color: COLORS.accent }}>AI</span>
          </span>
        </div>
        <nav style={S.nav}>
          {TABS.map(([t, label]) => (
            <button key={t} style={{ ...S.navBtn, ...(tab === t ? S.navBtnActive : {}) }} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </nav>
        <div style={S.statusPill}>
          <span style={{ ...S.dot, background: health ? statusColor : COLORS.textMuted }} />
          <span>{statusText}</span>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {tab === "chatbot" && <ChatbotPanel />}
        {tab === "recommend" && (
          <RecommendPanel
            onTryOn={(garment) => {
              setPendingTryOnGarment(garment);
              setTab("tryon");
            }}
          />
        )}
        {tab === "imagegen" && <ImageGenPanel />}
        {tab === "tryon" && (
          <TryOnPanel
            pendingGarment={pendingTryOnGarment}
            onConsumePending={() => setPendingTryOnGarment(null)}
          />
        )}
      </div>
    </div>
  );
}