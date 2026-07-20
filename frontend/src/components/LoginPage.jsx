import { useState, useEffect, useRef } from "react";
import { API_BASE, COLORS, FONT_DISPLAY } from "../styles.js";
import { apiFetch } from "../api.js";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function LoginPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const googleBtnRef = useRef(null);

  // Load Google's Identity Services script once, then render its button
  // into our own container. This is Google's own vanilla-JS integration —
  // no extra npm package needed, and it works the same in every React
  // version.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return; // not configured — just skip rendering the button

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const existing = document.getElementById("google-gsi-script");
    if (existing) {
      existing.addEventListener("load", initGoogle);
      return () => existing.removeEventListener("load", initGoogle);
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
    // Intentionally not removing the script on unmount — Google's script is
    // safe to leave loaded for the lifetime of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleCredential = async (response) => {
    setError("");
    setBusy(true);
    try {
      const res = await apiFetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Google sign-in failed.");
      onAuthenticated(data.access_token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      const body =
        mode === "signup"
          ? { email: email.trim(), password, name: name.trim() }
          : { email: email.trim(), password };

      const res = await apiFetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong.");
      onAuthenticated(data.access_token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    background: COLORS.surface,
    border: `1.5px solid ${COLORS.accent}`,
    color: COLORS.textPrimary,
    padding: "10px 14px",
    fontSize: 14,
    borderRadius: 8,
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: COLORS.cardBg,
          border: `3px solid ${COLORS.accent}`,
          borderRadius: 16,
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color: COLORS.accent, fontSize: 22 }}>◈</span>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: COLORS.textPrimary }}>
            GALMOUR<span style={{ color: COLORS.accent }}>BOT</span>
          </span>
        </div>

        <h1 style={{ margin: 0, textAlign: "center", fontFamily: FONT_DISPLAY, fontSize: 22, color: COLORS.textPrimary }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p style={{ margin: 0, textAlign: "center", fontSize: 13, color: COLORS.textSecondary }}>
          {mode === "login" ? "Log in to continue to GalmourBot." : "Sign up to start styling with GalmourBot."}
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input
              style={inputStyle}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          )}
          <input
            style={inputStyle}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            style={inputStyle}
            type="password"
            placeholder={mode === "signup" ? "Password (min. 8 characters)" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />

          {error && <p style={{ margin: 0, fontSize: 12.5, color: COLORS.red }}>{error}</p>}

          <button
            type="submit"
            disabled={busy}
            style={{
              background: COLORS.accent,
              border: `1px solid ${COLORS.accent}`,
              color: "#fff",
              padding: "11px 0",
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>OR</span>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            </div>
            <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }} />
          </>
        )}

        <p style={{ margin: 0, textAlign: "center", fontSize: 12.5, color: COLORS.textSecondary }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            style={{ background: "none", border: "none", color: COLORS.accent, fontWeight: 600, cursor: "pointer", fontSize: 12.5, padding: 0 }}
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}