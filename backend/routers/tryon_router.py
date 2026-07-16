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
