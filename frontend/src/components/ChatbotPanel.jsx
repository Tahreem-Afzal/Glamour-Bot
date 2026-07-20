import { useState, useRef, useEffect } from "react";
import { API_BASE, S, COLORS } from "../styles.js";
import { apiFetch } from "../api.js";
import PageHeader from "./PageHeader.jsx";

const T = {
  en: {
    eyebrow: "Chatbot",
    title: "Share your event, choose the date, and let GlamourAI create a complete, professionally styled look just for you.",
    subtitle: "From outfits and shoes to accessories and makeup, every recommendation is thoughtfully curated to match the occasion. Available in English and Urdu.",
    cityLabel: "CITY (for weather-aware suggestions)",
    cityPlaceholder: "e.g. Lahore",
    greeting: "Hi! I'm GlamourBot — ask me about outfits, occasions, or fashion advice. You can write in English or Roman Urdu.",
    planningFor: (date, city) => `📅 Planning for ${date} in ${city} — advice uses that day's forecast.`,
    useToday: "Use today instead",
    listening: "Listening & thinking…",
    thinking: "GlamourBot is thinking…",
    stopSpeaking: "Stop GlamourBot speaking",
    stopRecording: "Stop recording",
    speakQuestion: "Speak your question",
    recording: "Recording… speak now",
    inputPlaceholder: "Ask about outfits, occasions, or products…",
    send: "Send",
    couldntReach: (msg) => `⚠️ Couldn't reach the backend: ${msg}`,
    micError: (msg) => `⚠️ Couldn't access microphone: ${msg}`,
    voiceError: (msg) => `⚠️ Voice message failed: ${msg}`,
    prompts: [
      "👗 Suggest an outfit for a wedding",
      "☔ What should I wear in monsoon season?",
      "💼 Something formal for a job interview",
      "🌙 Eid outfit ideas in light pink",
      "🥻 Casual lawn suit for everyday wear",
    ],
  },
  ur: {
    eyebrow: "چیٹ بوٹ",
    title: "اپنے موقع کا انتخاب کریں، تاریخ چنیں، اور GlamourAI کو آپ کے لیے مکمل، پیشہ ورانہ انداز میں تیار کردہ لک بنانے دیں۔",
    subtitle: "لباس اور جوتوں سے لے کر لوازمات اور میک اپ تک، ہر تجویز موقع کے مطابق سوچ سمجھ کر تیار کی جاتی ہے۔ انگریزی اور اردو میں دستیاب۔",
    cityLabel: "شہر (موسم کے مطابق تجاویز کے لیے)",
    cityPlaceholder: "مثلاً لاہور",
    greeting: "السلام علیکم! میں GlamourBot ہوں — مجھ سے لباس، مواقع، یا فیشن کے مشورے پوچھیں۔ آپ انگریزی یا رومن اردو میں لکھ سکتے ہیں۔",
    planningFor: (date, city) => `📅 ${city} میں ${date} کے لیے منصوبہ بندی — مشورہ اُس دن کی پیشگوئی کے مطابق ہے۔`,
    useToday: "آج کا استعمال کریں",
    listening: "سن اور سوچ رہا ہے…",
    thinking: "GlamourBot سوچ رہا ہے…",
    stopSpeaking: "GlamourBot کی آواز روکیں",
    stopRecording: "ریکارڈنگ روکیں",
    speakQuestion: "اپنا سوال بولیں",
    recording: "ریکارڈنگ ہو رہی ہے… ابھی بولیں",
    inputPlaceholder: "لباس، مواقع، یا مصنوعات کے بارے میں پوچھیں…",
    send: "بھیجیں",
    couldntReach: (msg) => `⚠️ بیک اینڈ تک رسائی نہیں ہو سکی: ${msg}`,
    micError: (msg) => `⚠️ مائیکروفون تک رسائی نہیں ہو سکی: ${msg}`,
    voiceError: (msg) => `⚠️ صوتی پیغام ناکام ہوگیا: ${msg}`,
    prompts: [
      "👗 شادی کے لیے لباس تجویز کریں",
      "☔ برسات کے موسم میں کیا پہنوں؟",
      "💼 نوکری کے انٹرویو کے لیے رسمی لباس",
      "🌙 عید کے لیے ہلکے گلابی لباس کے آئیڈیاز",
      "🥻 روزمرہ پہننے کے لیے کیژول لان سوٹ",
    ],
  },
};

export default function ChatbotPanel({ lang = "en", plannedEvent, onClearPlan }) {
  const t = T[lang];
  const isUrdu = lang === "ur";

  const [messages, setMessages] = useState([{ role: "bot", text: t.greeting }]);
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

  // Swap the greeting language if the user changes it before sending
  // their first real message (once they've started chatting, we leave
  // history alone rather than rewriting what they already said).
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].role === "bot" ? [{ role: "bot", text: t.greeting }] : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Stop any active mic stream if the component unmounts mid-recording
  // (e.g. the user switches tabs while recording).
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    clearInterval(recordTimerRef.current);
  }, []);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await apiFetch(`${API_BASE}/chat`, {
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
      setMessages((m) => [...m, { role: "bot", text: t.couldntReach(err.message) }]);
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
        stream.getTracks().forEach((tr) => tr.stop());
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
      setMessages((m) => [...m, { role: "bot", text: t.micError(err.message) }]);
    }
  };

  const MIN_RECORDING_MS = 800; // guards against an accidental instant click producing a near-silent clip

  const stopRecording = () => {
    clearInterval(recordTimerRef.current);
    const elapsed = Date.now() - recordStartRef.current;
    if (elapsed < MIN_RECORDING_MS) {
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
      const res = await apiFetch(url, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const transcriptHeader = res.headers.get("X-Transcript");
      const responseHeader = res.headers.get("X-Response");
      const transcript = transcriptHeader ? decodeURIComponent(transcriptHeader) : "(voice message)";
      const answer = responseHeader ? decodeURIComponent(responseHeader) : "";

      setMessages((m) => [...m, { role: "user", text: transcript }, { role: "bot", text: answer }]);

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.play().catch(() => {});
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: t.voiceError(err.message) }]);
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

  const micClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

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
        eyebrow={t.eyebrow}
        eyebrowStyle={{ fontSize: 22, fontWeight: 800, color: COLORS.accent, letterSpacing: 1.5 }}
        title={t.title}
        subtitle={t.subtitle}
      />
      <div style={{ padding: "0 clamp(16px, 6vw, 100px) 40px", width: "100%", boxSizing: "border-box" }}>
      <div
        dir={isUrdu ? "rtl" : "ltr"}
        style={{ ...S.card, height: "65vh", width: "100%", boxSizing: "border-box", border: `3px solid ${COLORS.accent}` }}
      >
        <div style={{ ...S.formGroup, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={S.label}>{t.cityLabel}</label>
          <input
            style={{ ...S.input, width: 160, border: `1.5px solid ${COLORS.accent}` }}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t.cityPlaceholder}
            disabled={!!plannedEvent}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {t.prompts.map((p) => (
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
                alignSelf: m.role === "user" ? (isUrdu ? "flex-start" : "flex-end") : (isUrdu ? "flex-end" : "flex-start"),
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
              <span style={S.spinner} /> {voiceBusy ? t.listening : t.thinking}
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
            title={isSpeaking ? t.stopSpeaking : isRecording ? t.stopRecording : t.speakQuestion}
          >
            {isSpeaking ? "⏸ Stop" : isRecording ? `⏹ ${recordSeconds}s` : "🎤"}
          </button>
          <input
            style={{ ...S.input, flex: 1, border: `1.5px solid ${COLORS.accent}` }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isRecording ? t.recording : t.inputPlaceholder}
            disabled={isRecording}
          />
          <button
            style={{ ...S.btnPrimary, opacity: sending || !input.trim() ? 0.5 : 1 }}
            onClick={() => send()}
            disabled={sending || !input.trim() || isRecording}
          >
            {t.send}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}