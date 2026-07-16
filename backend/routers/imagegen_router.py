"""
imagegen_router.py
Web-facing wrapper around the fixed img_gen.py (see its module docstring
for the style-control fix). Takes an uploaded fabric photo + a garment
type + optional free-text detail prompt, returns the generated stitched
garment image as PNG bytes.
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Response

from services.img_gen import generate_from_fabric, DEFAULT_PROMPT, DEFAULT_FIDELITY

logger = logging.getLogger(__name__)
router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GENERATED_DIR = os.path.join(BASE_DIR, "generated")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

# Dropdown options the frontend shows — kept here so the UI and backend
# vocabulary can't drift out of sync.
GARMENT_TYPES = [
    "frock", "maxi", "anarkali", "lehenga", "sharara", "gharara",
    "shirt", "kameez", "top", "blouse",
    "trouser", "capri", "palazzo", "shalwar", "skirt",
]


@router.get("/garment-types")
def garment_types():
    return {"garment_types": GARMENT_TYPES}


@router.post("/generate-outfit")
async def generate_outfit(
    image: UploadFile = File(...),
    garment_type: Optional[str] = Form(None),   # e.g. "frock", "palazzo"
    detail_prompt: Optional[str] = Form(None),  # free text: event, color, style notes
    fidelity: float = Form(DEFAULT_FIDELITY),
):
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(GENERATED_DIR, exist_ok=True)

    if not image.filename:
        return Response(content=b'{"error": "No file uploaded"}', media_type="application/json", status_code=400)

    upload_path = os.path.join(UPLOADS_DIR, image.filename)

    # Combine the dropdown garment type with any free-text detail into
    # one instruction — build_prompt()/extract_user_details() in
    # img_gen.py already parse garment-type keywords out of free text,
    # so just concatenating is enough for it to pick up "make a palazzo".
    full_prompt = " ".join(filter(None, [
        f"Make a {garment_type}." if garment_type else None,
        detail_prompt,
    ])) or DEFAULT_PROMPT

    try:
        contents = await image.read()
        with open(upload_path, "wb") as f:
            f.write(contents)

        out_path = generate_from_fabric(
            upload_path,
            prompt=full_prompt,
            fidelity=fidelity,
            output_dir=GENERATED_DIR,
        )

        with open(out_path, "rb") as f:
            image_bytes = f.read()

        return Response(
            content=image_bytes,
            media_type="image/png",
        )
    except RuntimeError as e:
        return Response(
            content=f'{{"error": {str(e)!r}}}'.encode(),
            media_type="application/json",
            status_code=400,
        )
    except Exception as e:
        logger.exception("Image generation failed")
        return Response(
            content=f'{{"error": "Unexpected server error: {e}"}}'.encode(),
            media_type="application/json",
            status_code=500,
        )
    finally:
        if os.path.exists(upload_path):
            os.remove(upload_path)
