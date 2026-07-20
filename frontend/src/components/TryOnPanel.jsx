import { useState, useRef, useEffect, useCallback } from "react";
import { API_BASE, COLORS } from "../styles.js";
import { apiFetch } from "../api.js";
import BeforeAfterSlider from "./BeforeAfterSlider.jsx";
import PageHeader from "./PageHeader.jsx";

const CATEGORY_COLORS = {
  upper: { bg: COLORS.accentSoftBg, accent: COLORS.accent },
  lower: { bg: COLORS.greenSoftBg, accent: COLORS.green },
  full: { bg: COLORS.purpleSoftBg, accent: COLORS.purple },
};
const CAT_ICON = { upper: "👕", lower: "👖", full: "👗" };

const TR = {
  en: {
    eyebrow: "Virtual fitting room",
    title: "See it before you BUY it.",
    subtitle: "Experience fashion like never before with GlamourAI's Virtual Try-On. Upload your photo, choose any outfit, and instantly see how it looks on you. Explore styles with confidence and discover your perfect look before making a choice.",
    tabTryOn: "Try on", tabCatalog: "Catalog", tabUpload: "Upload",
    couldntLoadGarments: "Could not reach the backend to load garments.",
    cameraDenied: (msg) => `Camera access denied: ${msg}`,
    selectImageFile: "Please select an image file",
    addPhotoFirst: "Add a photo first (upload or capture)",
    selectGarmentFirst: "Select a garment first",
    tryonGenerated: "Try-on generated!",
    generationFailed: (msg) => `Generation failed: ${msg}`,
    provideNameAndImage: "Provide a name and an image file",
    uploadedSuccess: "Garment uploaded successfully!",
    uploadFailed: (msg) => `Upload failed: ${msg}`,
    uploadPhotoBtn: "📁 Upload photo",
    useCameraBtn: "📷 Use camera",
    clickOrDragPhoto: "Click or drag a photo here",
    startCameraPrompt: "to begin",
    startCameraBold: "Start Camera",
    clickWord: "Click",
    startCameraBtn: "▶ Start Camera",
    capturePhotoBtn: "⬤ Capture Photo",
    retakeBtn: "↺ Retake",
    chooseDifferentBtn: "↺ Choose Different Photo",
    generatingBtn: "⏳ Generating (up to ~20s)…",
    generateBtn: "✦ Generate Try-On",
    resultLabel: "RESULT — drag to compare",
    downloadResult: "↓ Download Result",
    garmentCatalog: "GARMENT CATALOG",
    clear: "✕ Clear",
    filterAll: "All", filterTops: "Tops", filterBottoms: "Bottoms", filterDresses: "Dresses",
    noGarmentsFoundUpload: "No garments found. Upload one first.",
    noGarmentsYet: "No garments yet — upload one to get started.",
    nameLabel: "NAME", namePlaceholder: "e.g. Gray Kurta",
    brandLabel: "BRAND", brandPlaceholder: "optional",
    categoryLabel: "CATEGORY",
    catUpper: "Upper (shirts, tops)", catLower: "Lower (pants, jeans)", catFull: "Full (dresses, gowns)",
    tagsLabel: "TAGS (comma separated)", tagsPlaceholder: "casual, summer",
    garmentImageLabel: "GARMENT IMAGE",
    uploading: "Uploading…",
    addToCatalog: "Add to Catalog",
    singleModeBtn: "👕 Single item",
    comboModeBtn: "👔 Full outfit (top + bottom)",
    selectTopBadge: "TOP",
    selectBottomBadge: "BOTTOM",
    selectBothFirst: "Pick a top and a bottom first",
    comboGenerateBtn: "✦ Generate Full Outfit",
    comboGeneratingBtn: "⏳ Fitting top, then bottom (up to ~40s)…",
    comboGenerated: "Full outfit try-on generated!",
    comboExtraCreditsNote: "Full outfit runs FASHN twice (top, then bottom) — uses roughly double the credits of a single try-on.",
  },
  ur: {
    eyebrow: "ورچوئل فٹنگ روم",
    title: "خریدنے سے پہلے دیکھ لیں۔",
    subtitle: "GlamourAI کے ورچوئل ٹرائی آن کے ساتھ فیشن کا نیا تجربہ کریں۔ اپنی تصویر اپلوڈ کریں، کوئی بھی لباس منتخب کریں، اور فوراً دیکھیں یہ آپ پر کیسا لگتا ہے۔ اعتماد کے ساتھ اسٹائلز دریافت کریں اور فیصلہ کرنے سے پہلے اپنا بہترین انداز جانیں۔",
    tabTryOn: "آزما کر دیکھیں", tabCatalog: "کیٹلاگ", tabUpload: "اپلوڈ",
    couldntLoadGarments: "لباس لوڈ کرنے کے لیے بیک اینڈ تک رسائی نہیں ہو سکی۔",
    cameraDenied: (msg) => `کیمرے تک رسائی مسترد کر دی گئی: ${msg}`,
    selectImageFile: "براہ کرم ایک تصویری فائل منتخب کریں",
    addPhotoFirst: "پہلے ایک تصویر شامل کریں (اپلوڈ یا کیمرے سے)",
    selectGarmentFirst: "پہلے ایک لباس منتخب کریں",
    tryonGenerated: "ٹرائی آن تیار ہوگیا!",
    generationFailed: (msg) => `تیاری ناکام ہوگئی: ${msg}`,
    provideNameAndImage: "نام اور تصویری فائل فراہم کریں",
    uploadedSuccess: "لباس کامیابی سے اپلوڈ ہوگیا!",
    uploadFailed: (msg) => `اپلوڈ ناکام ہوگیا: ${msg}`,
    uploadPhotoBtn: "📁 تصویر اپلوڈ کریں",
    useCameraBtn: "📷 کیمرہ استعمال کریں",
    clickOrDragPhoto: "تصویر یہاں کلک کریں یا گھسیٹیں",
    startCameraPrompt: "دبائیں شروع کرنے کے لیے",
    startCameraBold: "کیمرہ شروع کریں",
    clickWord: "",
    startCameraBtn: "▶ کیمرہ شروع کریں",
    capturePhotoBtn: "⬤ تصویر کھینچیں",
    retakeBtn: "↺ دوبارہ لیں",
    chooseDifferentBtn: "↺ مختلف تصویر منتخب کریں",
    generatingBtn: "⏳ تیار ہو رہا ہے (تقریباً 20 سیکنڈ)…",
    generateBtn: "✦ ٹرائی آن تیار کریں",
    resultLabel: "نتیجہ — موازنہ کے لیے گھسیٹیں",
    downloadResult: "↓ نتیجہ ڈاؤن لوڈ کریں",
    garmentCatalog: "لباس کا کیٹلاگ",
    clear: "✕ صاف کریں",
    filterAll: "تمام", filterTops: "اوپری لباس", filterBottoms: "نچلا لباس", filterDresses: "ڈریسز",
    noGarmentsFoundUpload: "کوئی لباس نہیں ملا۔ پہلے ایک اپلوڈ کریں۔",
    noGarmentsYet: "ابھی تک کوئی لباس نہیں — شروع کرنے کے لیے ایک اپلوڈ کریں۔",
    nameLabel: "نام", namePlaceholder: "مثلاً گرے کرتا",
    brandLabel: "برانڈ", brandPlaceholder: "اختیاری",
    categoryLabel: "قسم",
    catUpper: "اوپری (شرٹس، ٹاپس)", catLower: "نچلا (پینٹس، جینز)", catFull: "مکمل (ڈریسز، گاؤن)",
    tagsLabel: "ٹیگز (کوما سے الگ)", tagsPlaceholder: "کیژول، گرمی",
    garmentImageLabel: "لباس کی تصویر",
    uploading: "اپلوڈ ہو رہا ہے…",
    addToCatalog: "کیٹلاگ میں شامل کریں",
    singleModeBtn: "👕 ایک لباس",
    comboModeBtn: "👔 مکمل لباس (اوپر + نیچے)",
    selectTopBadge: "اوپر",
    selectBottomBadge: "نیچے",
    selectBothFirst: "پہلے ایک اوپری اور ایک نچلا لباس منتخب کریں",
    comboGenerateBtn: "✦ مکمل لباس تیار کریں",
    comboGeneratingBtn: "⏳ پہلے اوپر، پھر نیچے کا لباس فٹ ہو رہا ہے (تقریباً 40 سیکنڈ)…",
    comboGenerated: "مکمل لباس کا ٹرائی آن تیار ہوگیا!",
    comboExtraCreditsNote: "مکمل لباس FASHN کو دو بار چلاتا ہے (پہلے اوپر، پھر نیچے) — ایک عام ٹرائی آن سے تقریباً دوگنی کریڈٹس استعمال ہوتی ہیں۔",
  },
};

export default function TryOnPanel({ lang = "en", pendingGarment, onConsumePending }) {
  const tr = TR[lang];
  const isUrdu = lang === "ur";
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [subTab, setSubTab] = useState("tryon"); // "tryon" | "catalog" | "upload"
  const [notification, setNotification] = useState(null);
  const [garments, setGarments] = useState([]);
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState(null);
  const [comboMode, setComboMode] = useState(false);
  const [selectedUpper, setSelectedUpper] = useState(null);
  const [selectedLower, setSelectedLower] = useState(null);

  const [personSource, setPersonSource] = useState("upload");
  const [personFile, setPersonFile] = useState(null);
  const [personPreview, setPersonPreview] = useState(null);
  const [camActive, setCamActive] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [generating, setGenerating] = useState(false);

  const [uploadForm, setUploadForm] = useState({ name: "", brand: "", category: "upper", tags: "" });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const showNotification = useCallback((msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4500);
  }, []);

  const fetchGarments = useCallback(() => {
    apiFetch(`${API_BASE}/catalog/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setGarments(Array.isArray(data) ? data : []))
      .catch(() => showNotification(tr.couldntLoadGarments, "error"));
  }, [showNotification]);

  useEffect(() => {
    fetchGarments();
  }, [fetchGarments]);

  // A garment added via Recommendations' "Try On" button arrives here —
  // select it, make sure it's in the loaded catalog list, land on the
  // Try-On sub-tab, and clear the pending flag so this only fires once.
  useEffect(() => {
    if (!pendingGarment) return;
    setGarments((prev) => (prev.some((g) => g.id === pendingGarment.id) ? prev : [...prev, pendingGarment]));
    setComboMode(false);
    setSelected(pendingGarment);
    setSubTab("tryon");
    onConsumePending?.();
  }, [pendingGarment, onConsumePending]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamActive(true);
    } catch (err) {
      showNotification(tr.cameraDenied(err.message), "error");
    }
  }, [showNotification]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (personPreview) URL.revokeObjectURL(personPreview);
        setPersonFile(blob);
        setPersonPreview(URL.createObjectURL(blob));
        setResultUrl(null);
        stopCamera();
      },
      "image/jpeg",
      0.95
    );
  }, [personPreview, stopCamera]);

  const retakePhoto = useCallback(() => {
    if (personPreview) URL.revokeObjectURL(personPreview);
    setPersonFile(null);
    setPersonPreview(null);
    setResultUrl(null);
    startCamera();
  }, [personPreview, startCamera]);

  const handlePersonUpload = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      showNotification(tr.selectImageFile, "error");
      return;
    }
    if (personPreview) URL.revokeObjectURL(personPreview);
    setPersonFile(file);
    setPersonPreview(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const switchPersonSource = (mode) => {
    setPersonSource(mode);
    if (personPreview) URL.revokeObjectURL(personPreview);
    setPersonFile(null);
    setPersonPreview(null);
    setResultUrl(null);
    if (mode !== "camera") stopCamera();
  };

  const toggleComboMode = () => {
    setComboMode((v) => !v);
    setSelected(null);
    setSelectedUpper(null);
    setSelectedLower(null);
    setResultUrl(null);
  };

  const generateTryOn = async () => {
    if (!personFile) {
      showNotification(tr.addPhotoFirst, "error");
      return;
    }
    if (comboMode) {
      if (!selectedUpper || !selectedLower) {
        showNotification(tr.selectBothFirst, "error");
        return;
      }
    } else if (!selected) {
      showNotification(tr.selectGarmentFirst, "error");
      return;
    }
    setGenerating(true);
    setResultUrl(null);
    try {
      const fd = new FormData();
      fd.append("person_image", personFile, "person.jpg");
      let url;
      if (comboMode) {
        fd.append("upper_garment_id", String(selectedUpper.id));
        fd.append("lower_garment_id", String(selectedLower.id));
        url = `${API_BASE}/tryon/generate-combo`;
      } else {
        fd.append("garment_id", String(selected.id));
        url = `${API_BASE}/tryon/generate`;
      }
      const res = await apiFetch(url, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || res.statusText);
      }
      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
      showNotification(comboMode ? tr.comboGenerated : tr.tryonGenerated, "success");
    } catch (err) {
      showNotification(tr.generationFailed(err.message), "error");
    } finally {
      setGenerating(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "tryon-result.jpg";
    a.click();
  };

  const handleUploadGarment = async () => {
    if (!uploadFile || !uploadForm.name) {
      showNotification(tr.provideNameAndImage, "error");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("name", uploadForm.name);
    fd.append("brand", uploadForm.brand);
    fd.append("category", uploadForm.category);
    fd.append("tags", JSON.stringify(uploadForm.tags.split(",").map((t) => t.trim()).filter(Boolean)));
    try {
      const res = await apiFetch(`${API_BASE}/catalog/`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || res.statusText);
      }
      const data = await res.json();
      // Prepend (not append) so a newly uploaded item appears at the very
      // top of the picker/catalog list immediately — previously it was
      // added to the end of an already-scrollable list, which could make
      // it look like the upload silently failed when it had actually
      // succeeded but was just scrolled out of view below existing items.
      setGarments((prev) => [data, ...prev]);
      // Also reset the shared category filter to "All" — if it was left
      // on e.g. "Tops" from browsing earlier and the new item is a
      // "Bottom", it wouldn't show under that filter at all even though
      // it uploaded correctly.
      setCategory("all");
      showNotification(tr.uploadedSuccess, "success");
      setUploadForm({ name: "", brand: "", category: "upper", tags: "" });
      setUploadFile(null);
    } catch (err) {
      showNotification(tr.uploadFailed(err.message), "error");
    } finally {
      setUploading(false);
    }
  };

  const filtered = category === "all" ? garments : garments.filter((g) => g.category === category);

  const GarmentPicker = () => (
    <div style={T.picker}>
      <div style={T.pickerHeader}>
        <span style={T.pickerTitle}>{tr.garmentCatalog}</span>
        {(comboMode ? (selectedUpper || selectedLower) : selected) && (
          <button
            style={T.btnClear}
            onClick={() => {
              setSelected(null);
              setSelectedUpper(null);
              setSelectedLower(null);
            }}
          >
            {tr.clear}
          </button>
        )}
      </div>
      <div style={T.filterRow}>
        {["all", "upper", "lower", "full"].map((c) => (
          <button key={c} style={{ ...T.chip, ...(category === c ? T.chipActive : {}) }} onClick={() => setCategory(c)}>
            {c === "all" ? tr.filterAll : c === "upper" ? tr.filterTops : c === "lower" ? tr.filterBottoms : tr.filterDresses}
          </button>
        ))}
      </div>
      <div style={T.garmentList}>
        {filtered.length === 0 && <div style={T.emptyMsg}>{tr.noGarmentsFoundUpload}</div>}
        {filtered.map((g) => {
          const col = CATEGORY_COLORS[g.category] || CATEGORY_COLORS.upper;
          const isFullInCombo = comboMode && g.category === "full";
          const isSel = comboMode
            ? selectedUpper?.id === g.id || selectedLower?.id === g.id
            : selected?.id === g.id;

          const handleClick = () => {
            if (isFullInCombo) return; // dresses can't be combined with a separate top/bottom
            if (comboMode) {
              if (g.category === "upper") {
                setSelectedUpper((prev) => (prev?.id === g.id ? null : g));
              } else if (g.category === "lower") {
                setSelectedLower((prev) => (prev?.id === g.id ? null : g));
              }
            } else {
              setSelected(isSel ? null : g);
            }
          };

          return (
            <div
              key={g.id}
              style={{
                ...T.garmentCard,
                background: isSel ? col.bg : COLORS.surface,
                borderColor: isSel ? col.accent : COLORS.accent,
                opacity: isFullInCombo ? 0.4 : 1,
                cursor: isFullInCombo ? "not-allowed" : "pointer",
              }}
              onClick={handleClick}
            >
              <div style={{ ...T.thumb, background: col.bg + "cc" }}>
                {g.thumbnail_url ? (
                  <img
                    src={`${API_BASE}${g.thumbnail_url}`}
                    style={T.thumbImg}
                    alt={g.name}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 22, color: col.accent }}>{CAT_ICON[g.category] || "👕"}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={T.garmentName}>{g.name}</p>
                <p style={T.garmentBrand}>{g.brand || "—"}</p>
              </div>
              {comboMode && selectedUpper?.id === g.id && (
                <span style={{ fontSize: 9, fontWeight: 700, color: col.accent, border: `1px solid ${col.accent}`, borderRadius: 20, padding: "2px 8px" }}>
                  {tr.selectTopBadge}
                </span>
              )}
              {comboMode && selectedLower?.id === g.id && (
                <span style={{ fontSize: 9, fontWeight: 700, color: col.accent, border: `1px solid ${col.accent}`, borderRadius: 20, padding: "2px 8px" }}>
                  {tr.selectBottomBadge}
                </span>
              )}
              {!comboMode && isSel && <span style={{ color: col.accent, fontWeight: 700 }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <PageHeader
        eyebrow={tr.eyebrow}
        eyebrowStyle={{ fontSize: 22, fontWeight: 800, color: COLORS.accent, letterSpacing: 1.5 }}
        title={tr.title}
        subtitle={tr.subtitle}
      />
      <div dir={isUrdu ? "rtl" : "ltr"} style={{ ...T.subNav, padding: "0 clamp(16px, 6vw, 100px) 12px" }}>
        {[
          ["tryon", tr.tabTryOn],
          ["catalog", tr.tabCatalog],
          ["upload", tr.tabUpload],
        ].map(([tabKey, label]) => (
          <button key={tabKey} style={{ ...T.subNavBtn, ...(subTab === tabKey ? T.subNavBtnActive : {}) }} onClick={() => setSubTab(tabKey)}>
            {label}
          </button>
        ))}
      </div>

      {notification && (
        <div
          style={{
            ...T.toast,
            background: notification.type === "success" ? COLORS.greenSoftBg : notification.type === "error" ? COLORS.redSoftBg : COLORS.accentSoftBg,
            color: notification.type === "success" ? COLORS.green : notification.type === "error" ? COLORS.red : COLORS.accent,
            borderColor: notification.type === "success" ? COLORS.green : notification.type === "error" ? COLORS.red : COLORS.accent,
          }}
        >
          {notification.msg}
        </div>
      )}

      {subTab === "tryon" && (
        <div dir={isUrdu ? "rtl" : "ltr"} style={T.tryonRoot}>
          <div style={T.leftPane}>
            <div style={T.modeToggle}>
              <button style={{ ...T.modeBtn, ...(!comboMode ? T.modeBtnActive : {}) }} onClick={() => comboMode && toggleComboMode()}>
                {tr.singleModeBtn}
              </button>
              <button style={{ ...T.modeBtn, ...(comboMode ? T.modeBtnActive : {}) }} onClick={() => !comboMode && toggleComboMode()}>
                {tr.comboModeBtn}
              </button>
            </div>
            {comboMode && (
              <p style={{ fontSize: 11, color: COLORS.textMuted, fontStyle: "italic", margin: 0 }}>
                {tr.comboExtraCreditsNote}
              </p>
            )}

            <div style={T.modeToggle}>
              <button style={{ ...T.modeBtn, ...(personSource === "upload" ? T.modeBtnActive : {}) }} onClick={() => switchPersonSource("upload")}>
                {tr.uploadPhotoBtn}
              </button>
              <button style={{ ...T.modeBtn, ...(personSource === "camera" ? T.modeBtnActive : {}) }} onClick={() => switchPersonSource("camera")}>
                {tr.useCameraBtn}
              </button>
            </div>

            <div style={T.viewport}>
              {personSource === "upload" && (
                <>
                  {!personPreview ? (
                    <div
                      style={T.dropZone}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handlePersonUpload(e.dataTransfer.files?.[0]);
                      }}
                    >
                      <span style={{ fontSize: 40 }}>🖼️</span>
                      <p style={{ color: COLORS.textSecondary, marginTop: 10 }}>{tr.clickOrDragPhoto}</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}
                        onChange={(e) => handlePersonUpload(e.target.files?.[0])}
                      />
                    </div>
                  ) : (
                    <img src={personPreview} style={T.previewImg} alt="Your photo" />
                  )}
                </>
              )}
              {personSource === "camera" && (
                <>
                  {personPreview ? (
                    <img src={personPreview} style={T.previewImg} alt="Captured" />
                  ) : (
                    <>
                      <video ref={videoRef} style={{ ...T.previewImg, display: camActive ? "block" : "none" }} muted playsInline />
                      {!camActive && (
                        <div style={T.camPlaceholder}>
                          <span style={{ fontSize: 40 }}>📷</span>
                          <p style={{ color: COLORS.textSecondary, marginTop: 10 }}>
                            {isUrdu ? (
                              <>{tr.startCameraPrompt} <b>{tr.startCameraBold}</b> پر کلک کریں</>
                            ) : (
                              <>Click <b>Start Camera</b> to begin</>
                            )}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div style={T.controls}>
              {personSource === "camera" && !personPreview && !camActive && (
                <button style={T.btnPrimary} onClick={startCamera}>
                  {tr.startCameraBtn}
                </button>
              )}
              {personSource === "camera" && camActive && (
                <button style={T.btnPrimary} onClick={capturePhoto}>
                  {tr.capturePhotoBtn}
                </button>
              )}
              {personSource === "camera" && personPreview && (
                <button style={T.btnSecondary} onClick={retakePhoto}>
                  {tr.retakeBtn}
                </button>
              )}
              {personSource === "upload" && personPreview && (
                <button style={T.btnSecondary} onClick={() => switchPersonSource("upload")}>
                  {tr.chooseDifferentBtn}
                </button>
              )}
              <button
                style={{
                  ...T.btnApplyBig,
                  opacity: generating || !personFile || (comboMode ? !selectedUpper || !selectedLower : !selected) ? 0.5 : 1,
                  cursor: generating || !personFile || (comboMode ? !selectedUpper || !selectedLower : !selected) ? "not-allowed" : "pointer",
                }}
                onClick={generateTryOn}
                disabled={generating || !personFile || (comboMode ? !selectedUpper || !selectedLower : !selected)}
              >
                {generating ? (comboMode ? tr.comboGeneratingBtn : tr.generatingBtn) : (comboMode ? tr.comboGenerateBtn : tr.generateBtn)}
              </button>
            </div>

            {resultUrl && (
              <div style={T.resultBox}>
                <p style={T.colLabel}>{tr.resultLabel}</p>
                <BeforeAfterSlider before={personPreview} after={resultUrl} height={380} />
                <button style={T.btnSave} onClick={downloadResult}>
                  {tr.downloadResult}
                </button>
              </div>
            )}
          </div>

          <GarmentPicker />
        </div>
      )}

      {subTab === "catalog" && (
        <div dir={isUrdu ? "rtl" : "ltr"} style={T.catalogPage}>
          <div style={T.filterRow}>
            {["all", "upper", "lower", "full"].map((c) => (
              <button key={c} style={{ ...T.chip, ...(category === c ? T.chipActive : {}) }} onClick={() => setCategory(c)}>
                {c === "all" ? tr.filterAll : c === "upper" ? tr.filterTops : c === "lower" ? tr.filterBottoms : tr.filterDresses}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div style={T.emptyMsg}>{tr.noGarmentsYet}</div>
          ) : (
            <div style={T.catalogGrid}>
              {filtered.map((g) => {
                const col = CATEGORY_COLORS[g.category] || CATEGORY_COLORS.upper;
                return (
                  <div key={g.id} style={T.catalogCard}>
                    <div style={{ ...T.catalogThumb, background: col.bg }}>
                      {g.thumbnail_url ? (
                        <img src={`${API_BASE}${g.thumbnail_url}`} style={T.thumbImg} alt={g.name} />
                      ) : (
                        <span style={{ fontSize: 40 }}>{CAT_ICON[g.category] || "👕"}</span>
                      )}
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <p style={T.garmentName}>{g.name}</p>
                      <p style={T.garmentBrand}>{g.brand || "—"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === "upload" && (
        <div dir={isUrdu ? "rtl" : "ltr"} style={T.uploadPage}>
          <div style={T.uploadCard}>
            <div style={T.formGrid}>
              <div style={T.formGroup}>
                <label style={T.label}>{tr.nameLabel}</label>
                <input style={T.input} value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} placeholder={tr.namePlaceholder} />
              </div>
              <div style={T.formGroup}>
                <label style={T.label}>{tr.brandLabel}</label>
                <input style={T.input} value={uploadForm.brand} onChange={(e) => setUploadForm({ ...uploadForm, brand: e.target.value })} placeholder={tr.brandPlaceholder} />
              </div>
              <div style={T.formGroup}>
                <label style={T.label}>{tr.categoryLabel}</label>
                <select style={T.input} value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}>
                  <option value="upper">{tr.catUpper}</option>
                  <option value="lower">{tr.catLower}</option>
                  <option value="full">{tr.catFull}</option>
                </select>
              </div>
              <div style={T.formGroup}>
                <label style={T.label}>{tr.tagsLabel}</label>
                <input style={T.input} value={uploadForm.tags} onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })} placeholder={tr.tagsPlaceholder} />
              </div>
            </div>
            <div style={T.formGroup}>
              <label style={T.label}>{tr.garmentImageLabel}</label>
              <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <button style={{ ...T.btnApplyBig, opacity: uploading ? 0.6 : 1 }} onClick={handleUploadGarment} disabled={uploading}>
              {uploading ? tr.uploading : tr.addToCatalog}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const T = {
  subNav: { display: "flex", gap: 4, padding: "10px 18px 0" },
  subNavBtn: { background: "none", border: `1.5px solid ${COLORS.accent}`, color: COLORS.textSecondary, padding: "6px 16px", cursor: "pointer", fontSize: 12, borderRadius: 20 },
  subNavBtnActive: { color: COLORS.accent, borderColor: COLORS.accent, background: COLORS.accentSoftBg },
  toast: { position: "fixed", top: 18, right: 18, zIndex: 9999, padding: "10px 18px", borderRadius: 6, fontSize: 13, border: "1px solid", maxWidth: 380, lineHeight: 1.5 },
  tryonRoot: { display: "flex", flexDirection: "column", flex: 1, overflow: "auto", padding: "0 clamp(16px, 6vw, 100px) 40px", gap: 20 },
  leftPane: { display: "flex", flexDirection: "column", gap: 14 },
  modeToggle: { display: "flex", gap: 0, border: `1.5px solid ${COLORS.accent}`, borderRadius: 20, overflow: "hidden", alignSelf: "flex-start" },
  modeBtn: { background: "none", border: "none", color: COLORS.textSecondary, padding: "8px 20px", cursor: "pointer", fontSize: 13 },
  modeBtnActive: { background: COLORS.accentSoftBg, color: COLORS.accent },
  viewport: { position: "relative", background: COLORS.cardBg, borderRadius: 12, overflow: "hidden", border: `3px solid ${COLORS.accent}`, height: 380, display: "flex", alignItems: "center", justifyContent: "center" },
  previewImg: { width: "100%", height: "100%", objectFit: "contain" },
  dropZone: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  camPlaceholder: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  controls: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  btnPrimary: { background: COLORS.accent, border: `1px solid ${COLORS.accent}`, color: "#FFFFFF", padding: "8px 18px", cursor: "pointer", fontSize: 13, borderRadius: 20 },
  btnSecondary: { background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary, padding: "8px 14px", cursor: "pointer", fontSize: 13, borderRadius: 20 },
  btnApplyBig: { marginLeft: "auto", background: COLORS.accent, border: `1px solid ${COLORS.accent}`, color: "#FFFFFF", padding: "10px 22px", cursor: "pointer", fontSize: 13, fontWeight: 600, borderRadius: 20 },
  resultBox: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  colLabel: { fontSize: 10, letterSpacing: 2, color: COLORS.textSecondary, margin: 0 },
  btnSave: { background: COLORS.greenSoftBg, border: `1px solid ${COLORS.green}`, color: COLORS.green, padding: "10px 14px", cursor: "pointer", fontSize: 12, borderRadius: 20 },
  picker: { background: COLORS.cardBg, border: `3px solid ${COLORS.accent}`, borderRadius: 12, display: "flex", flexDirection: "column", padding: 18 },
  pickerHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${COLORS.border}` },
  pickerTitle: { fontSize: 10, letterSpacing: 2.5, color: COLORS.textSecondary },
  btnClear: { background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary, padding: "3px 10px", cursor: "pointer", fontSize: 11, borderRadius: 20 },
  filterRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  chip: { background: "none", border: `1.5px solid ${COLORS.accent}`, color: COLORS.textSecondary, padding: "3px 12px", fontSize: 11, cursor: "pointer", borderRadius: 20 },
  chipActive: { color: COLORS.accent, borderColor: COLORS.accent, background: COLORS.accentSoftBg },
  garmentList: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, maxHeight: 340, overflowY: "auto" },
  emptyMsg: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", padding: 24 },
  garmentCard: { display: "flex", alignItems: "center", gap: 10, border: "1.5px solid", borderRadius: 10, padding: "9px 11px", cursor: "pointer" },
  thumb: { width: 46, height: 46, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  garmentName: { margin: 0, fontSize: 12, fontWeight: 600, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  garmentBrand: { margin: "2px 0 4px", fontSize: 10, color: COLORS.textSecondary },
  catalogPage: { padding: "20px clamp(16px, 6vw, 100px) 48px", overflowY: "auto" },
  catalogGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 },
  catalogCard: { background: COLORS.surface, border: `2px solid ${COLORS.accent}`, borderRadius: 12, overflow: "hidden" },
  catalogThumb: { height: 180, display: "flex", alignItems: "center", justifyContent: "center" },
  uploadPage: { padding: "24px clamp(16px, 6vw, 100px) 48px", maxWidth: 900, overflowY: "auto" },
  uploadCard: { background: COLORS.surface, border: `3px solid ${COLORS.accent}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  formGroup: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 10, color: COLORS.textSecondary, letterSpacing: 1, textTransform: "uppercase" },
  input: { background: COLORS.bg, border: `1.5px solid ${COLORS.accent}`, color: COLORS.textPrimary, padding: "8px 10px", fontSize: 12, borderRadius: 6, fontFamily: "inherit", outline: "none" },
};