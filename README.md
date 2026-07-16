# Glamour-Bot — Unified Fashion Assistant Suite

One project, one backend, one frontend, four modes: **Chatbot**,
**Recommendations**, **Image Generation**, **Try-On**.

This merges your virtual try-on service (FASHN-powered) and your
GlamourBot backend (chat + brand recommender + Stability AI image
generation) into a single FastAPI app + single React frontend, with the
two reported bugs actually fixed at the root cause — details below.

---

## What was fixed

### 1. Image generation — was editing fabric pixels, not stitching a garment

**Root cause:** the old `img_gen.py` sent your fabric photo to Stability's
SD3 endpoint in `mode=image-to-image`. In that mode, the model starts
denoising from a noised version of the *literal input image* — so the
output stayed structurally anchored to the flat fabric photo's own
composition (no human figure, no garment silhouette), no matter how
detailed the text prompt was.

**Fix:** switched to Stability's `/v2beta/stable-image/control/style`
endpoint. This extracts *style* (color, texture, pattern) from the fabric
photo and uses it to guide a **brand-new generation** driven entirely by
your prompt — it does not denoise the fabric photo's own layout. That's
what actually lets it construct a real stitched garment silhouette while
still reflecting the fabric's look.

Also added:
- A `garment_type` dropdown (frock, maxi, shirt, kameez, trouser, capri,
  palazzo, shalwar, skirt, etc.) — the old code only recognized
  lehenga/sharara/gharara/anarkali/frock/maxi and a few others; explicit
  types like "shirt" or "palazzo" fell through to a generic default
  before.
- A `fidelity` slider (0–1) controlling how strongly the fabric's
  color/texture carries into the result.
- A negative prompt (`flat fabric swatch, folded cloth, textile sample...`)
  to actively push the model away from re-rendering a flat cloth image.
- "Displayed on a mannequin/dress form" vs. "worn by a model" — detected
  from your prompt (defaults to mannequin display, matching "put it on
  the dummy").

### 2. Recommendations — right category, wrong color

**Root cause:** the recommender only ever looked for color words inside a
product's `title`/`tags`/`product_type` free text. On real Shopify
stores, color is carried as a **variant option** ("Color: Red"), not
repeated in the product's own title or tags — a product titled "Aria
Sandal" tagged `["New Arrival", "SS25"]` carries its actual color only on
its variants. The old code's color check against title/tags text found
nothing for genuinely red products, so when no real match was
detectable, it silently fell back to showing *any* category match
regardless of color — that fallback is exactly the "I want something
else and it gives me another color" bug.

**Fix:** `brands.py` now extracts real color data from Shopify's
`options`/`variants` arrays (ground truth the retailer set), and the
color exclusivity filter trusts that data first. If a specific color is
requested and genuinely nothing matches it, the system now says so
honestly ("I couldn't find anything in **green** specifically...")
instead of silently substituting a wrong-colored item. Verified against
mock Shopify-shaped data reproducing the exact bug — see
`backend/services/brands.py`'s module docstring for the before/after.

**One remaining caveat, stated plainly:** several bag/shoe brand domains
in the recommender's brand list were marked "guessed, unverified" in the
version I inherited (real domain names were never confirmed). I removed
the clearly-guessed ones rather than keep shipping unverified domains —
see `ADD_VERIFIED_DOMAINS` in `backend/services/brands.py`. Confirm real
domains for those categories and add them there; a wrong-but-plausible
domain is worse than a missing one.

### Also fixed while merging
- **Security:** removed the `/config/image-keys` endpoint, which exposed
  your raw `GROQ_API_KEY` and `STABILITY_API_KEY` to any caller with no
  auth. Never expose API keys to the frontend — the backend calls
  external APIs itself now, keys stay server-side only.
- `.env` is actually read now (`load_dotenv()` runs before any
  `os.environ` access) — this was silently broken in the try-on
  service before.

---

## What's genuinely new vs. reused as-is

| Piece | Status |
|---|---|
| Garment catalog (17 garments, DB, images) | Reused as-is from your try-on rebuild |
| FASHN try-on generation | Reused as-is |
| Chat RAG (loader/vectorstore/voice/weather) | Reused as-is |
| `brands.py` (recommender) | **Rewritten** — real variant color extraction, honest fallback |
| `img_gen.py` | **Rewritten** — style-control endpoint instead of image-to-image |
| Unified `main.py`, all routers | **New** — merges both backends into one app |
| Frontend (4-tab unified UI) | **New** — one React app instead of two separate frontends |

---

## Setup

### 1. API keys

You need three:
- **FASHN** (try-on) — app.fashn.ai → Developer API → API Keys
- **Stability AI** (image generation) — platform.stability.ai/account/keys
- **Groq** (chatbot + prompt enhancement) — console.groq.com/keys

```bash
cd backend
copy .env.example .env      (Windows)
cp .env.example .env        (Mac/Linux)
```
Fill in all three keys in `backend/.env`.

### 2. Run it

**Option A — launcher script:**
- Windows: double-click `START.bat`
- Mac/Linux: `chmod +x START.sh && ./START.sh`

**Option B — manual (two terminals):**

Terminal 1:
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
⚠️ This install is heavier than the try-on-only backend was —
`sentence-transformers` pulls in `torch` for the chatbot's embedding
search. Expect several minutes, similar to your first try-on install.

Terminal 2:
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

### 3. Verify

`http://localhost:8000/health` should show all three keys configured:
```json
{"status":"ok","fashn_configured":true,"stability_configured":true,"groq_configured":true}
```

---

## Deploying (Render)

`render.yaml` at the project root is a Render **Blueprint** — it defines
both services (FastAPI backend + static frontend build) in one file, so
Render can create them together.

1. Push this repo to GitHub (see commands below).
2. Render dashboard → **New → Blueprint** → pick this repo. Render reads
   `render.yaml` and creates `glamourai-backend` and `glamourai-frontend`.
3. When prompted, paste in your three real API keys (`FASHN_API_KEY`,
   `STABILITY_API_KEY`, `GROQ_API_KEY`) — these are marked `sync: false`
   in the blueprint precisely so they're never stored in the repo; you
   enter them once, directly in Render's dashboard.
4. `FRONTEND_URL` (backend's CORS allowlist) and `VITE_API_BASE`
   (frontend's API target) are wired automatically between the two
   services — no manual URL copying needed.
5. Deploy. First backend build is slow (`torch` + `sentence-transformers`).

**Two things to know:**
- The backend plan is currently set to `free` in `render.yaml`. That
  tier gives 512MB RAM, and `torch` + `sentence-transformers` loading
  the embedding model at startup **may crash it (OOM)** — free tier
  simply may not have enough headroom for this dependency. Deploy and
  check the logs; if you see the service repeatedly restarting or a
  "Ran out of memory" message, you have two options:
  1. Switch `plan: free` → `plan: starter` in `render.yaml` (~$7/mo) — guaranteed to fit.
  2. Ask for the embeddings API rewrite — swaps the local `torch`/`sentence-transformers`
     model for a hosted embeddings API call, which fits comfortably in free-tier RAM but
     requires a real code change (not just a config edit).
- `tryon.db` and `garment_images/`/`uploads/` live on the backend's local
  disk, which Render wipes on every redeploy. Fine for a demo; add a
  persistent Disk (or move to Postgres/S3) if catalog uploads need to
  survive restarts.

---

## Security note

No real API keys are committed anywhere in this repo — only
`backend/.env.example` (a template with placeholder text) is tracked.
Your actual `backend/.env` is excluded by `.gitignore`. Never commit a
real `.env` file or paste real keys into `render.yaml`, issues, or commit
messages — treat any key that touches Git history as compromised and
rotate it.

---

- **Chatbot** — ask fashion questions in English or Roman Urdu. Product
  questions ("suggest red heels for a party") automatically route into
  the recommender; everything else gets a normal RAG-grounded answer.
- **Recommendations** — a structured search (query + category + color +
  city dropdowns) that calls the recommender directly, showing product
  cards with images, confirmed colors, and working links.
- **Image Generation** — upload a fabric/cloth photo, pick a garment
  type, add any details (event, color, style — English or Roman Urdu),
  adjust the fidelity slider, generate.
- **Try-On** — upload a photo or capture from your camera (1920×1080),
  pick a garment from the catalog, generate a realistic try-on via
  FASHN. Catalog/Upload sub-tabs manage garments.

---

## Project structure

```
GlamourAI/
├── START.bat / START.sh
├── README.md
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/                    ← GlamourBot knowledge base (docx/pdf/json)
│   ├── vector_db/                ← prebuilt embedding index (52 chunks)
│   ├── garment_images/            ← try-on garment photos (17, pre-seeded)
│   ├── tryon.db                    ← garment catalog DB
│   ├── generated/                  ← image-gen outputs land here
│   ├── uploads/                     ← temp uploads
│   ├── models/                       ← garment catalog SQLAlchemy models
│   ├── routers/
│   │   ├── chat_router.py            ← /chat, /voice/input, /weather, /rebuild
│   │   ├── recommend_router.py        ← /recommend/ (standalone)
│   │   ├── imagegen_router.py          ← /generate-outfit, /garment-types
│   │   ├── catalog_router.py            ← garment CRUD
│   │   └── tryon_router.py               ← /tryon/generate (FASHN)
│   └── services/
│       ├── brands.py                      ← FIXED recommender
│       ├── product_cache.py                ← brand product SQLite cache
│       ├── img_gen.py                       ← FIXED image generation
│       ├── fashn_client.py                   ← FASHN API wrapper
│       ├── loader.py, vectorstore.py          ← RAG knowledge base
│       ├── rag_chain.py                        ← chat logic + intent routing
│       ├── voice.py, weather.py                 ← voice + weather-aware styling
└── frontend/
    ├── package.json, vite.config.js, index.html
    └── src/
        ├── App.jsx              ← 4-tab shell
        ├── styles.js             ← shared theme
        └── components/
            ├── ChatbotPanel.jsx
            ├── RecommendPanel.jsx
            ├── ImageGenPanel.jsx
            └── TryOnPanel.jsx
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Status pill says a key is missing | Fill in all three keys in `backend/.env`, restart uvicorn |
| Chat is slow to first respond | First startup builds/loads the vector index — subsequent requests are fast |
| "Try-on/Image generation failed" | Check the exact error — usually an invalid/expired key or exhausted credits |
| Recommendation says "no exact color match" a lot | This is the honesty fix working as intended — the live brand catalogs may genuinely not carry that color right now, or need the domain list expanded (see `ADD_VERIFIED_DOMAINS`) |
| Camera won't start | Check browser camera permissions |
| `npm run dev` fails mentioning esbuild/rollup | Delete `frontend/node_modules` + `package-lock.json`, run `npm install` again |