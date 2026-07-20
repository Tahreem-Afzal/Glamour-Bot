import { useState, useEffect, useRef } from "react";
import { API_BASE, S, COLORS } from "../styles.js";
import { apiFetch } from "../api.js";
import PageHeader from "./PageHeader.jsx";

const T = {
  en: {
    eyebrow: "Image generation",
    title: "Turn unstitched fabric into a finished look.",
    subtitle: "Upload a fabric or cloth photo, pick a garment shape, and describe the occasion — the model stitches a realistic preview using the fabric's own color and print.",
    fabricLabel: "UNSTITCHED FABRIC / CLOTH PHOTO",
    dropHere: "Drop it here!",
    clickOrDrag: "Click or drag a fabric photo here",
    garmentTypeLabel: "GARMENT TYPE",
    fidelityLabel: "FABRIC INFLUENCE (fidelity)",
    fidelityNote: (v) => `${v} — higher = fabric color/print carries through more strongly`,
    detailsLabel: "DETAILS (event, occasion, color, style — English or Roman Urdu)",
    detailsPlaceholder: "e.g. eid ke liye light pink frock, round neckline, half sleeves",
    generating: "⏳ Generating…",
    generate: "✦ Generate Stitched Garment",
    generatingNote: "This takes around 10-30 seconds — Stability AI is generating a fresh, fully stitched garment guided by your fabric's color and texture.",
    resultLabel: "RESULT",
    download: "↓ Download Result",
    uploadFirst: "Upload a fabric/cloth photo first.",
  },
  ur: {
    eyebrow: "تصویر کی تخلیق",
    title: "غیر سلا ہوا کپڑا مکمل لباس میں بدلیں۔",
    subtitle: "کپڑے یا فیبرک کی تصویر اپلوڈ کریں، لباس کی شکل منتخب کریں، اور موقع بیان کریں — ماڈل آپ کے کپڑے کے اپنے رنگ اور پرنٹ کے ساتھ ایک حقیقت پسندانہ جھلک تیار کرتا ہے۔",
    fabricLabel: "غیر سلا ہوا کپڑا / فیبرک کی تصویر",
    dropHere: "یہاں چھوڑیں!",
    clickOrDrag: "کپڑے کی تصویر یہاں کلک کریں یا گھسیٹیں",
    garmentTypeLabel: "لباس کی قسم",
    fidelityLabel: "کپڑے کا اثر (fidelity)",
    fidelityNote: (v) => `${v} — زیادہ ہونے پر کپڑے کا رنگ/پرنٹ زیادہ نمایاں ہوگا`,
    detailsLabel: "تفصیلات (موقع، رنگ، انداز — انگریزی یا رومن اردو)",
    detailsPlaceholder: "مثلاً عید کے لیے ہلکا گلابی فراک، گول گلا، آدھی آستین",
    generating: "⏳ تیار ہو رہا ہے…",
    generate: "✦ سلا ہوا لباس تیار کریں",
    generatingNote: "اس میں تقریباً 10-30 سیکنڈ لگتے ہیں — Stability AI آپ کے کپڑے کے رنگ اور بناوٹ کی رہنمائی میں ایک نیا، مکمل سلا ہوا لباس تیار کر رہا ہے۔",
    resultLabel: "نتیجہ",
    download: "↓ نتیجہ ڈاؤن لوڈ کریں",
    uploadFirst: "پہلے کپڑے/فیبرک کی تصویر اپلوڈ کریں۔",
  },
};

export default function ImageGenPanel({ lang = "en" }) {
  const t = T[lang];
  const isUrdu = lang === "ur";

  const [garmentTypes, setGarmentTypes] = useState([]);
  const [garmentType, setGarmentType] = useState("frock");
  const [detailPrompt, setDetailPrompt] = useState("");
  const [fabricFile, setFabricFile] = useState(null);
  const [fabricPreview, setFabricPreview] = useState(null);
  const [fidelity, setFidelity] = useState(0.4);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/garment-types`)
      .then((r) => r.json())
      .then((d) => setGarmentTypes(d.garment_types || []))
      .catch(() => setGarmentTypes(["frock", "maxi", "shirt", "trouser", "palazzo"]));
  }, []);

  const handleFabricUpload = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (fabricPreview) URL.revokeObjectURL(fabricPreview);
    setFabricFile(file);
    setFabricPreview(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const generate = async () => {
    if (!fabricFile) {
      setError(t.uploadFirst);
      return;
    }
    setGenerating(true);
    setError(null);
    setResultUrl(null);
    try {
      const fd = new FormData();
      fd.append("image", fabricFile);
      fd.append("garment_type", garmentType);
      fd.append("detail_prompt", detailPrompt);
      fd.append("fidelity", String(fidelity));

      const res = await apiFetch(`${API_BASE}/generate-outfit`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server returned ${res.status}` }));
        throw new Error(err.error || `Server returned ${res.status}`);
      }
      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "generated-outfit.png";
    a.click();
  };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <PageHeader
        eyebrow={t.eyebrow}
        eyebrowStyle={{ fontSize: 22, fontWeight: 800, color: COLORS.accent, letterSpacing: 1.5 }}
        title={t.title}
        subtitle={t.subtitle}
      />
      <div dir={isUrdu ? "rtl" : "ltr"} style={S.pageNarrow}>

      <div style={{ ...S.card, border: `3px solid ${COLORS.accent}`, width: "100%", boxSizing: "border-box" }}>
        <div style={S.formGroup}>
          <label style={S.label}>{t.fabricLabel}</label>
          <div
            style={{
              border: `2px dashed ${COLORS.accent}`,
              borderRadius: 8,
              padding: 20,
              textAlign: "center",
              cursor: "pointer",
              minHeight: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: dragOver ? COLORS.accentSoftBg : "transparent",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFabricUpload(e.dataTransfer.files?.[0]);
            }}
          >
            {fabricPreview ? (
              <img src={fabricPreview} alt="Fabric" style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 6 }} />
            ) : (
              <span style={{ color: dragOver ? COLORS.accentDark : COLORS.textSecondary, fontWeight: dragOver ? 600 : 400 }}>
                {dragOver ? t.dropHere : t.clickOrDrag}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFabricUpload(e.target.files?.[0])}
            />
          </div>
        </div>

        <div style={S.formGrid}>
          <div style={S.formGroup}>
            <label style={S.label}>{t.garmentTypeLabel}</label>
            <select style={{ ...S.input, border: `1.5px solid ${COLORS.accent}` }} value={garmentType} onChange={(e) => setGarmentType(e.target.value)}>
              {garmentTypes.map((g) => (
                <option key={g} value={g}>
                  {g[0].toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>{t.fidelityLabel}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={fidelity}
              onChange={(e) => setFidelity(parseFloat(e.target.value))}
              style={{ accentColor: COLORS.accent }}
            />
            <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{t.fidelityNote(fidelity.toFixed(2))}</span>
          </div>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>{t.detailsLabel}</label>
          <textarea
            style={{ ...S.textarea, border: `1.5px solid ${COLORS.accent}` }}
            value={detailPrompt}
            onChange={(e) => setDetailPrompt(e.target.value)}
            placeholder={t.detailsPlaceholder}
          />
        </div>

        <button
          style={{ ...S.btnPrimary, alignSelf: "flex-start", opacity: generating ? 0.6 : 1 }}
          onClick={generate}
          disabled={generating}
        >
          {generating ? t.generating : t.generate}
        </button>

        {generating && (
          <div style={S.spinnerWrap}>
            <span style={S.spinner} /> {t.generatingNote}
          </div>
        )}

        {error && <div style={{ color: COLORS.red, fontSize: 13 }}>⚠️ {error}</div>}

        {resultUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={S.label}>{t.resultLabel}</p>
            <img src={resultUrl} style={{ width: "100%", borderRadius: 8, border: `2px solid ${COLORS.accent}` }} alt="Generated outfit" />
            <button style={S.btnSave} onClick={download}>
              {t.download}
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}