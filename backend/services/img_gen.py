# -*- coding: utf-8 -*-
"""
img_gen.py (v4 — fixes the "just edits fabric pixels, doesn't stitch a
garment" bug)

THE ACTUAL BUG (confirmed against Stability's real API docs)
  v3 sent the fabric photo through Stability's SD3 endpoint in
  `mode=image-to-image`. In that mode, the model starts denoising from a
  noised version of the LITERAL input image — meaning the output is
  structurally anchored to the fabric photo's own composition (a flat
  swatch/folded cloth, no human figure, no garment silhouette). No
  amount of prompt detail ("flowing frock", "stitched maxi dress") can
  overcome that, because the starting point of the diffusion process is
  already committed to the fabric image's own layout. Text-to-image mode
  was available in the same file (_call_stability_text_to_image) but was
  never used when a fabric photo was provided — image-to-image always
  took priority, which is exactly backwards for this use case.

THE FIX
  Switch to Stability's `/v2beta/stable-image/control/style` endpoint.
  This is architecturally different from image-to-image: it extracts
  STYLE (color palette, texture, pattern) from the reference image and
  uses that to guide a BRAND NEW generation driven by the text prompt —
  it does not denoise the reference image's own composition. That's
  exactly "use this fabric's color/texture, but generate a proper
  stitched [frock/maxi/shirt/palazzo/...] worn by a model or displayed
  on a dress form, from scratch."

  `fidelity` (0-1) controls how strongly the output's style matches the
  fabric photo. Default 0.4 — enough to carry the fabric's color and
  print through clearly, without constraining the model so hard that it
  fights the garment-construction instructions in the prompt.

GARMENT-TYPE VOCABULARY EXTENDED
  The old `styles` dict recognized lehenga/sharara/gharara/anarkali/
  frock/maxi/trail/jacket/cape/straight/peplum but NOT shirt/trouser/
  capri/palazzo/pants/shalwar/kameez/top/skirt — all garment types
  explicitly requested. Added below.

Usable two ways:
  - CLI: `python img_gen.py`
  - Importable: `generate_stitched_garment(fabric_image_path, garment_type,
    detail_prompt, display_on, strength_fidelity, output_dir)` — used by
    the /generate-outfit FastAPI endpoint.
"""

import os
import sys
import pathlib
import requests
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

if sys.platform == "win32":
    os.system("chcp 65001 >nul 2>&1")
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

STABILITY_API_KEY = os.environ.get("STABILITY_API_KEY", os.environ.get("Stabiliy_API_KEY", ""))
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

API_URL_STYLE_CONTROL = "https://api.stability.ai/v2beta/stable-image/control/style"
API_URL_TEXT_TO_IMAGE = "https://api.stability.ai/v2beta/stable-image/generate/core"

DEFAULT_PROMPT = "a beautiful Pakistani outfit, elegant styling, studio lighting, photorealistic"
DEFAULT_FIDELITY = 0.4  # how strongly the fabric's color/texture carries through

# ================================================================
#  PAKISTANI EVENT RULES (unchanged — real domain knowledge)
# ================================================================
EVENT_RULES = {
    "eid":         {"weight": "light",  "colors": "pastel pink, mint green, sky blue, soft yellow, ivory",         "fabric": "lawn, chiffon, cotton", "embroidery": "minimal gota work, simple border",          "silhouette": "straight cut kameez with shalwar or trousers", "dupatta": "light chiffon dupatta"},
    "eid ul fitr": {"weight": "light",  "colors": "pastel pink, mint green, sky blue, soft yellow, ivory",         "fabric": "lawn, chiffon, cotton", "embroidery": "minimal gota work, simple border",          "silhouette": "straight cut kameez with shalwar or trousers", "dupatta": "light chiffon dupatta"},
    "eid ul adha": {"weight": "light",  "colors": "white, cream, earthy tones, beige, light green",                "fabric": "cotton, lawn",          "embroidery": "very minimal, clean lines",                 "silhouette": "simple shalwar kameez",                        "dupatta": "simple cotton dupatta"},
    "casual":      {"weight": "light",  "colors": "any comfortable colors, pastels or neutrals",                   "fabric": "cotton, lawn, khaddar", "embroidery": "no embroidery or very minimal print",       "silhouette": "relaxed fit kameez shalwar or kurta pants",    "dupatta": "optional casual dupatta"},
    "picnic":      {"weight": "light",  "colors": "bright cheerful colors, floral prints",                         "fabric": "cotton, lawn",          "embroidery": "simple prints or no embroidery",            "silhouette": "comfortable loose fit",                        "dupatta": "optional"},
    "college":     {"weight": "light",  "colors": "any, pastels or neutrals preferred",                            "fabric": "cotton, lawn",          "embroidery": "minimal or printed fabric",                 "silhouette": "simple straight kameez shalwar",               "dupatta": "simple dupatta"},
    "office":      {"weight": "light",  "colors": "navy, grey, white, black, subtle tones",                        "fabric": "cotton blend, chiffon", "embroidery": "no embroidery, clean professional look",    "silhouette": "formal straight cut kameez shalwar",           "dupatta": "formal dupatta pinned neatly"},
    "lunch":       {"weight": "light",  "colors": "soft pastels, coral, peach, blush",                             "fabric": "chiffon, cotton",       "embroidery": "light embroidery or printed",               "silhouette": "semi-casual kameez",                           "dupatta": "light dupatta"},
    "birthday":    {"weight": "medium", "colors": "rose gold, blush pink, lilac, gold, silver",                    "fabric": "chiffon, georgette",    "embroidery": "light sequins, dabka work, pearl embellishments", "silhouette": "A-line or flared kameez, or short lehenga",  "dupatta": "embellished chiffon dupatta"},
    "dawat":       {"weight": "medium", "colors": "jewel tones, teal, burgundy, forest green, royal blue",         "fabric": "silk, chiffon, organza","embroidery": "moderate embroidery, zari work",            "silhouette": "formal kameez or short gharara",               "dupatta": "embroidered dupatta"},
    "dinner":      {"weight": "medium", "colors": "black, navy, deep red, emerald green",                          "fabric": "silk, velvet, chiffon", "embroidery": "moderate embellishments, sequins",          "silhouette": "elegant maxi or formal kameez",                "dupatta": "embellished evening dupatta"},
    "mehndi":      {"weight": "medium", "colors": "yellow, green, orange, fuchsia, bright festive colors",         "fabric": "chiffon, organza, net", "embroidery": "colorful gota, dabka, mirror work",         "silhouette": "flared lehenga or sharara",                    "dupatta": "colorful heavily embellished dupatta"},
    "dholki":      {"weight": "medium", "colors": "bright colors, multicolor, hot pink, yellow, orange",           "fabric": "chiffon, cotton net",   "embroidery": "playful colorful embellishments, tassels",  "silhouette": "fun flared kameez or short lehenga",           "dupatta": "colorful dupatta"},
    "engagement":  {"weight": "medium", "colors": "blush pink, gold, peach, dusty rose, light purple",             "fabric": "silk, chiffon, organza","embroidery": "heavy embroidery, zari, sequins, pearls",   "silhouette": "lehenga or formal gharara",                    "dupatta": "heavily embroidered dupatta"},
    "nikkah":      {"weight": "heavy",  "colors": "ivory, gold, blush, mint, powder blue, pastels",                "fabric": "jamawar, silk, brocade","embroidery": "heavy zari, gota, dabka, pearl work",       "silhouette": "formal gharara or lehenga",                    "dupatta": "heavily embroidered dupatta draped on head"},
    "shaadi":      {"weight": "heavy",  "colors": "bridal red, maroon, deep pink, gold",                           "fabric": "pure silk, velvet",     "embroidery": "maximum embellishments, heavy zardozi, gota","silhouette": "bridal lehenga or sharara",                   "dupatta": "full bridal dupatta draped on head with embroidery"},
    "wedding":     {"weight": "heavy",  "colors": "bridal red, maroon, deep pink, gold",                           "fabric": "pure silk, velvet",     "embroidery": "maximum embellishments, heavy zardozi, gota","silhouette": "bridal lehenga or sharara",                   "dupatta": "full bridal dupatta draped on head"},
    "barat":       {"weight": "heavy",  "colors": "deep red, maroon, crimson with gold",                           "fabric": "pure silk, velvet, jamawar", "embroidery": "maximum zardozi, heavy gold work, full embellishment", "silhouette": "full bridal lehenga with blouse and sharara", "dupatta": "heavy bridal dupatta with gold border draped on head"},
    "valima":      {"weight": "heavy",  "colors": "ivory, white, gold, pastel pink, mint",                         "fabric": "silk, chiffon, organza","embroidery": "heavy embroidery, sequins, pearl work",     "silhouette": "elegant lehenga or formal gharara",            "dupatta": "embellished dupatta"},
    "formal":      {"weight": "heavy",  "colors": "jewel tones, black, navy, emerald, deep purple",                "fabric": "velvet, silk, brocade", "embroidery": "heavy formal embellishments, zari, sequins", "silhouette": "formal maxi or lehenga",                      "dupatta": "heavily embellished formal dupatta"},
}


def detect_event(text: str) -> dict:
    text_lower = text.lower()
    for key, rules in EVENT_RULES.items():
        if key in text_lower:
            return {"event": key, **rules}
    return {
        "event": "general", "weight": "medium",
        "colors": "jewel tones, pastels",
        "fabric": "chiffon, silk",
        "embroidery": "moderate embroidery",
        "silhouette": "elegant kameez or lehenga",
        "dupatta": "embellished dupatta"
    }


def extract_user_details(user_prompt: str) -> dict:
    text = user_prompt.lower()
    details = {}

    colors = [
        "red", "maroon", "crimson", "pink", "blush", "rose", "fuchsia", "orange", "peach",
        "coral", "yellow", "gold", "golden", "green", "emerald", "mint", "olive", "teal",
        "blue", "navy", "purple", "violet", "lavender", "white", "ivory", "cream", "black",
        "grey", "silver", "brown", "beige", "nude", "laal", "gulabi", "neela", "sabz",
        "ferozi", "jamni", "asmani", "peelay", "safed"
    ]
    found_colors = [c for c in colors if c in text]
    if found_colors:
        details["user_colors"] = ", ".join(found_colors)

    fabrics = [
        "silk", "chiffon", "lawn", "cotton", "velvet", "net", "organza", "georgette",
        "jamawar", "brocade", "lace", "satin", "tissue", "khaddar", "linen", "crepe",
        "raw silk", "banarsi"
    ]
    found_fabrics = [f for f in fabrics if f in text]
    if found_fabrics:
        details["user_fabric"] = ", ".join(found_fabrics)

    embellishments = [
        "gota", "dabka", "zari", "zardozi", "sequins", "pearls", "crystals", "beads",
        "mirror work", "thread work", "embroidery", "sitara", "lace", "resham", "stone work"
    ]
    found_emb = [e for e in embellishments if e in text]
    if found_emb:
        details["user_embellishments"] = ", ".join(found_emb)

    # v4: extended with the exact garment types the user asked for —
    # shirt/trouser/capri/palazzo/pants/shalwar/kameez/top/skirt were
    # previously unrecognized and silently fell through to the event's
    # generic default silhouette instead of what was actually requested.
    styles = {
        "lehenga":  "lehenga choli with flared skirt",
        "sharara":  "sharara with wide flared pants",
        "gharara":  "gharara with knee-length kameez",
        "anarkali": "anarkali frock",
        "frock":    "flowing stitched frock, knee-length or midi length",
        "maxi":     "full length stitched maxi dress",
        "trail":    "outfit with long dramatic trail",
        "jacket":   "kameez with embellished jacket",
        "cape":     "outfit with attached cape",
        "straight": "straight cut kameez",
        "peplum":   "peplum style kameez",
        "shirt":    "fully stitched fitted shirt/kameez with finished collar, cuffs, and hem",
        "kameez":   "fully stitched kameez with finished collar, cuffs, and hem",
        "top":      "fitted stitched top with finished hem and seams",
        "blouse":   "fitted stitched blouse with finished neckline and seams",
        "trouser":  "fully stitched tailored trousers with waistband and hem",
        "trousers": "fully stitched tailored trousers with waistband and hem",
        "pants":    "fully stitched tailored pants with waistband and hem",
        "capri":    "fully stitched capri pants, cropped at mid-calf, tailored waistband",
        "palazzo":  "fully stitched wide-leg palazzo pants with tailored waistband",
        "shalwar":  "fully stitched traditional shalwar with tailored waistband",
        "skirt":    "fully stitched skirt with finished waistband and hem",
    }
    for s, desc in styles.items():
        if s in text:
            details["user_style"] = desc
            break

    sleeves = {
        "sleeveless": "sleeveless",
        "short sleeve": "short sleeves",
        "half sleeve": "half sleeves",
        "full sleeve": "full length sleeves",
        "bell sleeve": "bell sleeves",
        "off shoulder": "off-shoulder",
    }
    for s, desc in sleeves.items():
        if s in text:
            details["user_sleeve"] = desc
            break

    necklines = {
        "v neck": "V-neckline", "v-neck": "V-neckline",
        "round neck": "round neckline", "boat neck": "boat neckline",
        "square neck": "square neckline", "sweetheart": "sweetheart neckline",
    }
    for n, desc in necklines.items():
        if n in text:
            details["user_neckline"] = desc
            break

    # v4: how the finished garment should be displayed — a real dress
    # form/mannequin ("dummy") vs. worn by a human model. Defaults to
    # mannequin display, matching "put it on the dummy" — the exact
    # phrasing used when this bug was reported.
    if any(w in text for w in ("model", "wearing", "worn by")):
        details["display_on"] = "worn by a professional Pakistani fashion model, full body shot"
    else:
        details["display_on"] = (
            "displayed on a professional tailor's dress form / mannequin, "
            "product photography style, no visible human head or face"
        )

    return details


def build_prompt(user_prompt: str, event_info: dict, has_fabric_img: bool) -> str:
    e = event_info
    ud = extract_user_details(user_prompt)

    colors = ud.get("user_colors", e["colors"])
    fabric = ud.get("user_fabric", e["fabric"])
    emb = ud.get("user_embellishments", e["embroidery"])
    style = ud.get("user_style", e["silhouette"])
    sleeve = ud.get("user_sleeve", "")
    neckline = ud.get("user_neckline", "")
    display_on = ud["display_on"]

    prompt = f"A fully stitched, finished {style}, ready to wear — not a flat piece of cloth. "
    prompt += f"Made in {fabric} fabric, {colors} color. "
    if neckline:
        prompt += f"Features a {neckline}. "
    if sleeve:
        prompt += f"With {sleeve}. "
    prompt += f"Adorned with {emb}. "
    prompt += f"Specific design request: {user_prompt}. "
    prompt += f"The finished garment is {display_on}. "

    if has_fabric_img:
        prompt += (
            "The garment's fabric color, print, and texture matches the reference swatch exactly. "
        )

    weight = e["weight"]
    if weight == "light":
        prompt += "Elegant yet comfortable, simple clean lines with graceful draping. "
    elif weight == "medium":
        prompt += "Semi-formal festive look with tasteful embellishments. "
    else:
        prompt += "Full bridal/formal look with maximum embellishments, intricate handwork. "

    prompt += (
        "Fully sewn, tailored construction with visible seams, hems, and finishing — "
        "this is a completed garment, never a flat textile swatch or fabric roll. "
        "Soft studio lighting, elegant plain background. "
        "Full body shot showing the complete finished outfit. "
        "Vogue Pakistan fashion editorial style. "
        "Photorealistic, sharp details, professional fashion photography."
    )
    return prompt


NEGATIVE_PROMPT = (
    "flat fabric swatch, folded cloth, textile sample, fabric roll, fabric bolt, "
    "unstitched cloth, cloth piece, blurry, low quality, deformed, extra limbs"
)


def enhance_with_groq(base_prompt: str, user_prompt: str, event_info: dict) -> str:
    if not GROQ_API_KEY:
        return base_prompt
    try:
        from groq import Groq
    except ImportError:
        print("[!] groq package not installed — skipping prompt enhancement")
        return base_prompt

    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        system_msg = """You are an expert Pakistani fashion designer and AI image prompt engineer.
Take a base fashion prompt and make it ultra-detailed and vivid for image generation.
CRITICAL: the output must always describe a FULLY STITCHED, FINISHED garment — never a flat
fabric swatch or piece of cloth. Keep event dress-code rules strictly:
- Light events (Eid, casual): simple, comfortable, minimal embroidery
- Medium events (Mehndi, dawat, birthday): semi-formal, moderate embellishments
- Heavy events (Barat, Nikkah, Shaadi, Valima): maximum embellishments, rich fabric
Output ONLY the enhanced prompt. No explanations. No bullet points. Just one detailed paragraph."""

        user_msg = f"""Base prompt: {base_prompt}

User original request: {user_prompt}
Event: {event_info['event']} (Dress level: {event_info['weight']})

Enhance this into an ultra-detailed, vivid image generation prompt describing a
FULLY STITCHED, FINISHED garment (never a flat swatch). Be specific about: fabric
texture, embroidery details, color shades, construction/tailoring details, background,
lighting. End with: photorealistic, professional fashion photography."""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            max_tokens=500,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"  [!] Groq enhancement failed ({e}) — using base prompt instead")
        return base_prompt


def _call_stability_style_control(prompt: str, fabric_image_path: str,
                                   fidelity: float = DEFAULT_FIDELITY) -> bytes:
    """
    THE FIX: extracts style (color/texture/pattern) from the fabric photo
    and uses it to guide a NEW generation driven by `prompt` — does not
    denoise the fabric photo's own composition, unlike image-to-image
    mode. This is what actually lets the model construct a real stitched
    garment silhouette while still reflecting the fabric's look.
    """
    with open(fabric_image_path, "rb") as f:
        files = {"image": (os.path.basename(fabric_image_path), f, "image/jpeg")}
        data = {
            "prompt": prompt,
            "negative_prompt": NEGATIVE_PROMPT,
            "fidelity": str(fidelity),
            "output_format": "png",
            "aspect_ratio": "2:3",
        }
        headers = {"Authorization": f"Bearer {STABILITY_API_KEY}", "Accept": "image/*"}
        resp = requests.post(API_URL_STYLE_CONTROL, headers=headers, files=files, data=data, timeout=90)

    if resp.status_code != 200:
        raise RuntimeError(f"Stability AI request failed ({resp.status_code}): {resp.text[:500]}")
    return resp.content


def _call_stability_text_to_image(prompt: str) -> bytes:
    """Pure text-to-image, used when no fabric photo is provided at all."""
    headers = {"Accept": "image/*", "Authorization": f"Bearer {STABILITY_API_KEY}"}
    data = {
        "prompt": prompt,
        "negative_prompt": NEGATIVE_PROMPT,
        "output_format": "jpeg",
        "aspect_ratio": "2:3",
    }
    resp = requests.post(API_URL_TEXT_TO_IMAGE, headers=headers, files={"none": ""}, data=data, timeout=90)
    if resp.status_code != 200:
        raise RuntimeError(f"Stability AI request failed ({resp.status_code}): {resp.text[:500]}")
    return resp.content


def generate_outfit_image(
    user_prompt: str,
    fabric_image_path: Optional[str] = None,
    fidelity: float = DEFAULT_FIDELITY,
    output_dir: str = "generated",
    use_groq_enhancement: bool = True,
) -> str:
    if not STABILITY_API_KEY:
        raise RuntimeError(
            "STABILITY_API_KEY not set in environment. Get one at "
            "https://platform.stability.ai/account/keys and add it to .env"
        )

    event_info = detect_event(user_prompt)
    base_prompt = build_prompt(user_prompt, event_info, has_fabric_img=bool(fabric_image_path))
    prompt = enhance_with_groq(base_prompt, user_prompt, event_info) if use_groq_enhancement else base_prompt

    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = os.path.join(output_dir, f"outfit_{event_info['event']}_{timestamp}.png")

    if fabric_image_path:
        if not os.path.exists(fabric_image_path):
            raise FileNotFoundError(f"Fabric image not found: {fabric_image_path}")
        image_bytes = _call_stability_style_control(prompt, fabric_image_path, fidelity)
    else:
        image_bytes = _call_stability_text_to_image(prompt)

    with open(out_path, "wb") as f:
        f.write(image_bytes)

    return out_path


def generate_from_fabric(image_path: str, prompt: str = None, fidelity: float = DEFAULT_FIDELITY,
                          output_dir: str = "generated") -> str:
    """Backward-compat wrapper — the FastAPI /generate-outfit endpoint calls
    this exact signature (fidelity replaces the old `strength` param name,
    since this no longer uses image-to-image `strength` semantics)."""
    return generate_outfit_image(
        user_prompt=prompt or DEFAULT_PROMPT,
        fabric_image_path=image_path,
        fidelity=fidelity,
        output_dir=output_dir,
    )


# ================================================================
#  Interactive CLI (unchanged experience)
# ================================================================

def get_image_paths(image_type: str) -> list:
    paths = []
    print(f"  {image_type} images upload karo.")
    print(f"  (Seedha path daalo, Enter se skip, 'done' se finish)\n")
    while True:
        p = input(f"  Path {len(paths)+1} (ya Enter skip): ").strip().strip('"')
        if p.lower() in ("", "done", "skip"):
            break
        if pathlib.Path(p).exists():
            paths.append(p)
            print(f"  [OK] Loaded: {pathlib.Path(p).name}")
        else:
            print(f"  [!] File nahi mila, dobara try karo.")
    return paths


def banner():
    print()
    print("  +=======================================================+")
    print("  |       ** GLAMOURBOT - AI FASHION DESIGNER **          |")
    print("  |       Pakistani Fashion, Powered by Stability AI      |")
    print("  +=======================================================+")
    print()


def divider(label=""):
    if label:
        print(f"\n  ===== {label} =====\n")
    else:
        print("  " + "-" * 51)


def main():
    banner()
    if not STABILITY_API_KEY:
        print("  [X] STABILITY_API_KEY set nahi!")
        print("  Key yahan se lo: https://platform.stability.ai/account/keys")
        sys.exit(1)
    if not GROQ_API_KEY:
        print("  [!] GROQ_API_KEY set nahi — prompt enhancement skip ho jayega.")

    divider("AAPKA DESIGN IDEA")
    print("  Jo chahiye likho - event ka naam aur garment type zaroor likho!")
    print("  Examples:")
    print("    - eid ke liye light pink lawn frock")
    print("    - barat ke liye heavy red bridal lehenga")
    print("    - is fabric se ek palazzo aur shirt bana do")
    print("    - casual outing ke liye simple trouser shirt")
    print()
    user_prompt = input("  Aapka idea: ").strip() or "eid ke liye khubsurat outfit"

    event_info = detect_event(user_prompt)
    print(f"\n  [OK] Event: {event_info['event'].upper()}")
    print(f"  [OK] Dress level: {event_info['weight'].upper()}")

    divider("FABRIC IMAGE (Optional)")
    fabric_paths = get_image_paths("Fabric/Kaprey ki")
    fabric_image_path = fabric_paths[0] if fabric_paths else None

    divider("IMAGE GENERATION")
    try:
        out_path = generate_outfit_image(
            user_prompt=user_prompt,
            fabric_image_path=fabric_image_path,
            output_dir=str(pathlib.Path(__file__).parent.parent / "generated"),
        )
        print(f"  [OK] Image saved: {out_path}")
        if sys.platform == "win32":
            try:
                os.startfile(out_path)
            except Exception:
                pass
    except Exception as e:
        print(f"  [!] Image generate nahi hui: {e}")

    divider()
    print("\n  ** Shukriya GlamourBot use karne ka! **\n")


if __name__ == "__main__":
    main()
