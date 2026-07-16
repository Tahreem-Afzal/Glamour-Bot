import { useState, useRef, useEffect } from "react";
import { API_BASE, S, COLORS } from "../styles.js";

export default function ChatbotPanel() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm GlamourBot — ask me about outfits, occasions, or fashion advice. You can write in English or Roman Urdu." },
  ]);
  const [input, setInput] = useState("");
  const [city, setCity] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, city: city || null }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setMessages((m) => [...m, { role: "bot", text: data.response }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `⚠️ Couldn't reach the backend: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Very light markdown: **bold** and bare URLs as clickable links —
  // matches what the bot actually outputs (product recommendations use
  // **Title** and a raw URL on the next line).
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <b key={i}>{part.slice(2, -2)}</b>;
      }
      if (part.startsWith("http")) {
        return (
          <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: COLORS.accent }}>
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div style={S.pageNarrow}>
      <h2 style={S.pageTitle}>CHATBOT</h2>
      <div style={{ ...S.card, height: "65vh" }}>
        <div style={{ ...S.formGroup, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <label style={S.label}>CITY (for weather-aware suggestions)</label>
          <input
            style={{ ...S.input, width: 160 }}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Lahore"
          />
        </div>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "8px 4px",
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                background: m.role === "user" ? COLORS.accentSoftBg : COLORS.surfaceAlt,
                border: `1px solid ${m.role === "user" ? COLORS.accent : COLORS.border}`,
                color: COLORS.textPrimary,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {renderText(m.text)}
            </div>
          ))}
          {sending && (
            <div style={S.spinnerWrap}>
              <span style={S.spinner} /> GlamourBot is thinking…
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...S.input, flex: 1 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about outfits, occasions, or products…"
          />
          <button
            style={{ ...S.btnPrimary, opacity: sending || !input.trim() ? 0.5 : 1 }}
            onClick={send}
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
