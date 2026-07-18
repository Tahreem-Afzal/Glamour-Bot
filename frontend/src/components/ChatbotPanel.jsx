import { useState, useRef, useEffect } from "react";
import { API_BASE, S, COLORS } from "../styles.js";
import PageHeader from "./PageHeader.jsx";

const SUGGESTED_PROMPTS = [
  "👗 Suggest an outfit for a wedding",
  "☔ What should I wear in monsoon season?",
  "💼 Something formal for a job interview",
  "🌙 Eid outfit ideas in light pink",
  "🥻 Casual lawn suit for everyday wear",
];

export default function ChatbotPanel({ plannedEvent, onClearPlan }) {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm GlamourBot — ask me about outfits, occasions, or fashion advice. You can write in English or Roman Urdu." },
  ]);
  const [input, setInput] = useState("");
  const [city, setCity] = useState("");
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const recordTimerRef = useRef(null);
  const recordStartRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Stop any active mic stream if the component unmounts mid-recording
  // (e.g. the user switches tabs while recording).
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(recordTimerRef.current);
  }, []);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          city: plannedEvent?.city || city || null,
          event_date: plannedEvent?.date || null,
        }),
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

  const stopSpeaking = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  const startRecording = async () => {
    // If the bot happens to still be speaking when the user chooses to
    // record instead, cut it off — but pressing mic while speaking is now
    // handled as "just stop speaking" (see micClick), so this is mostly a
    // safety net for edge cases (e.g. speaking ends a split second after
    // the click registers).
    stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        sendVoice(blob);
      };

      recorder.start();
      setIsRecording(true);
      recordStartRef.current = Date.now();
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }, 250);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `⚠️ Couldn't access microphone: ${err.message}` }]);
    }
  };

  const MIN_RECORDING_MS = 800; // guards against an accidental instant click producing a near-silent clip

  const stopRecording = () => {
    clearInterval(recordTimerRef.current);
    const elapsed = Date.now() - recordStartRef.current;
    if (elapsed < MIN_RECORDING_MS) {
      // Let it keep recording a little longer rather than send a clip so
      // short Whisper is likely to mistranscribe it as filler noise.
      setTimeout(() => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
      }, MIN_RECORDING_MS - elapsed);
      return;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const sendVoice = async (blob) => {
    setVoiceBusy(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const effectiveCity = plannedEvent?.city || city;
      const params = new URLSearchParams();
      if (effectiveCity) params.set("city", effectiveCity);
      if (plannedEvent?.date) params.set("event_date", plannedEvent.date);
      const url = `${API_BASE}/voice/input${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      // Headers are percent-encoded on the backend (Urdu script/emoji
      // aren't valid raw HTTP header bytes) — decode them back here.
      const transcriptHeader = res.headers.get("X-Transcript");
      const responseHeader = res.headers.get("X-Response");
      const transcript = transcriptHeader ? decodeURIComponent(transcriptHeader) : "(voice message)";
      const answer = responseHeader ? decodeURIComponent(responseHeader) : "";

      setMessages((m) => [...m, { role: "user", text: transcript }, { role: "bot", text: answer }]);

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.play().catch(() => {
          // Autoplay can be blocked by the browser — not fatal, the text
          // reply is already shown either way.
        });
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `⚠️ Voice message failed: ${err.message}` }]);
    } finally {
      setVoiceBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Three-way mic button, matching how ChatGPT's voice mode behaves:
  // - Bot is speaking → just stop the speech (don't start recording)
  // - Currently recording → stop recording and send it
  // - Otherwise → start recording
  const micClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
    <div style={{ flex: 1, width: "100%", overflowY: "auto" }}>
      <PageHeader
        eyebrow="Chatbot"
        title="Ask it anything, in either language."
        subtitle="Retrieval-augmented generation grounds every answer in the actual brand catalog — no invented products, no dead-end links."
      />
      <div style={{ padding: "0 clamp(16px, 6vw, 100px) 40px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ ...S.card, height: "65vh", width: "100%", boxSizing: "border-box", border: `3px solid ${COLORS.accent}` }}>
        <div style={{ ...S.formGroup, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={S.label}>CITY (for weather-aware suggestions)</label>
          <input
            style={{ ...S.input, width: 160, border: `1.5px solid ${COLORS.accent}` }}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Lahore"
            disabled={!!plannedEvent}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p.replace(/^\p{Emoji}\s*/u, ""))}
              disabled={sending}
              style={{
                background: COLORS.accentSoftBg,
                border: `1.5px solid ${COLORS.accent}`,
                color: COLORS.accentDark,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.6 : 1,
                transition: "transform 0.12s, box-shadow 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 14px rgba(194, 24, 91, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {plannedEvent && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: COLORS.accentSoftBg, border: `1px solid ${COLORS.accent}`,
              borderRadius: 8, padding: "8px 12px", fontSize: 12, color: COLORS.accent,
            }}
          >
            <span>📅 Planning for {plannedEvent.date} in {plannedEvent.city} — advice uses that day's forecast.</span>
            <button
              onClick={onClearPlan}
              style={{ background: "none", border: "none", color: COLORS.accent, textDecoration: "underline", cursor: "pointer", fontSize: 12 }}
            >
              Use today instead
            </button>
          </div>
        )}

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
                border: `1.5px solid ${COLORS.accent}`,
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
          {(sending || voiceBusy) && (
            <div style={S.spinnerWrap}>
              <span style={S.spinner} /> {voiceBusy ? "Listening & thinking…" : "GlamourBot is thinking…"}
            </div>
          )}
        </div>

        <audio
          ref={audioPlayerRef}
          style={{ display: "none" }}
          onPlay={() => setIsSpeaking(true)}
          onPause={() => setIsSpeaking(false)}
          onEnded={() => setIsSpeaking(false)}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              ...S.btnSecondary,
              padding: "9px 14px",
              border: `1.5px solid ${isRecording || isSpeaking ? COLORS.red : COLORS.accent}`,
              color: isRecording || isSpeaking ? COLORS.red : S.btnSecondary.color,
              background: isRecording || isSpeaking ? COLORS.redSoftBg : S.btnSecondary.background,
            }}
            onClick={micClick}
            disabled={sending || voiceBusy}
            title={isSpeaking ? "Stop GlamourBot speaking" : isRecording ? "Stop recording" : "Speak your question"}
          >
            {isSpeaking ? "⏸ Stop" : isRecording ? `⏹ ${recordSeconds}s` : "🎤"}
          </button>
          <input
            style={{ ...S.input, flex: 1, border: `1.5px solid ${COLORS.accent}` }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isRecording ? "Recording… speak now" : "Ask about outfits, occasions, or products…"}
            disabled={isRecording}
          />
          <button
            style={{ ...S.btnPrimary, opacity: sending || !input.trim() ? 0.5 : 1 }}
            onClick={() => send()}
            disabled={sending || !input.trim() || isRecording}
          >
            Send
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}