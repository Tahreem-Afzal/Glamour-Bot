"""
tryon_router.py
The actual virtual try-on generation endpoint. Takes a person photo (either
uploaded from disk or captured from the browser's camera — both arrive here
identically as an UploadFile) plus a garment_id, and returns a generated
try-on image via the FASHN API.
"""

import os
import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session

from models.database import get_db
from models.garment import Garment
from routers.catalog_router import resolve_garment_path
from services.fashn_client import run_tryon

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate")
async def generate_tryon(
    person_image: UploadFile = File(...),
    garment_id: int = Form(...),
    db: Session = Depends(get_db),
):
    garment = db.query(Garment).filter(Garment.id == garment_id).first()
    if not garment:
        raise HTTPException(404, "Garment not found")

    garment_path = resolve_garment_path(garment.image_path)
    if not os.path.exists(garment_path):
        raise HTTPException(404, "Garment image file missing on disk")

    person_bytes = await person_image.read()
    if not person_bytes:
        raise HTTPException(400, "Empty person image upload")

    with open(garment_path, "rb") as f:
        garment_bytes = f.read()

    loop = asyncio.get_event_loop()
    try:
        result_bytes = await loop.run_in_executor(
            None, run_tryon, person_bytes, garment_bytes
        )
    except Exception as e:
        logger.exception("FASHN try-on generation failed")
        raise HTTPException(502, f"Try-on generation failed: {e}")

    return Response(content=result_bytes, media_type="image/jpeg")


@router.post("/generate-combo")
async def generate_combo_tryon(
    person_image: UploadFile = File(...),
    upper_garment_id: int = Form(...),
    lower_garment_id: int = Form(...),
    db: Session = Depends(get_db),
):
    """
    Full-outfit try-on (top + bottom at once).

    FASHN's API only accepts one garment per call — there's no single
    request that fits two items simultaneously. So this chains two calls:
    fit the top first, then feed THAT result back in as the new "person"
    photo for the bottom. This is the same sequential approach FASHN's own
    app uses internally when combining multiple products in one try-on.

    Costs two FASHN generations instead of one, and takes roughly twice as
    long since the second call can't start until the first one's result
    image is ready.
    """
    upper = db.query(Garment).filter(Garment.id == upper_garment_id).first()
    if not upper:
        raise HTTPException(404, "Top garment not found")
    lower = db.query(Garment).filter(Garment.id == lower_garment_id).first()
    if not lower:
        raise HTTPException(404, "Bottom garment not found")

    upper_path = resolve_garment_path(upper.image_path)
    lower_path = resolve_garment_path(lower.image_path)
    if not os.path.exists(upper_path):
        raise HTTPException(404, "Top garment image file missing on disk")
    if not os.path.exists(lower_path):
        raise HTTPException(404, "Bottom garment image file missing on disk")

    person_bytes = await person_image.read()
    if not person_bytes:
        raise HTTPException(400, "Empty person image upload")

    with open(upper_path, "rb") as f:
        upper_bytes = f.read()
    with open(lower_path, "rb") as f:
        lower_bytes = f.read()

    loop = asyncio.get_event_loop()
    try:
        logger.info("Combo try-on: fitting top first...")
        after_top_bytes = await loop.run_in_executor(
            None, run_tryon, person_bytes, upper_bytes
        )
        logger.info("Combo try-on: fitting bottom onto the top's result...")
        final_bytes = await loop.run_in_executor(
            None, run_tryon, after_top_bytes, lower_bytes
        )
    except Exception as e:
        logger.exception("FASHN combo try-on generation failed")
        raise HTTPException(502, f"Combo try-on generation failed: {e}")

    return Response(content=final_bytes, media_type="image/jpeg")