"""
catalog_router.py
REST API for the garment catalog.

Endpoints:
  GET    /catalog/          — list all garments (filter by category)
  GET    /catalog/{id}      — get single garment
  POST   /catalog/          — upload new garment photo + metadata
  DELETE /catalog/{id}      — remove garment
"""

import os
import io
import json
import uuid
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from PIL import Image

from models.database import get_db
from models.garment import Garment

logger = logging.getLogger(__name__)
router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GARMENT_DIR = os.path.join(BASE_DIR, "garment_images")
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp", ".jfif"}


def resolve_garment_path(image_path: str) -> str:
    """Garment.image_path is stored as a relative path (e.g. 'garment_images/x.jpg')
    so the DB stays portable across machines. Resolve it against BASE_DIR here;
    also accept an already-absolute path for safety."""
    if os.path.isabs(image_path):
        return image_path
    return os.path.join(BASE_DIR, image_path)


class GarmentOut(BaseModel):
    id: int
    name: str
    brand: str
    category: str
    thumbnail_url: str
    tags: list

    class Config:
        from_attributes = True


@router.get("/", response_model=List[GarmentOut])
def list_garments(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Garment)
    if category:
        q = q.filter(Garment.category == category)
    return q.order_by(Garment.id).all()


@router.get("/{garment_id}", response_model=GarmentOut)
def get_garment(garment_id: int, db: Session = Depends(get_db)):
    g = db.query(Garment).filter(Garment.id == garment_id).first()
    if not g:
        raise HTTPException(404, "Garment not found")
    return g


@router.post("/", response_model=GarmentOut)
async def create_garment(
    name: str = Form(...),
    brand: str = Form(""),
    category: str = Form("upper"),
    tags: str = Form("[]"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    os.makedirs(GARMENT_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, "Unsupported file type — use PNG, JPG, or WEBP")

    contents = await file.read()

    # Always re-encode to JPEG. This (a) sidesteps path-traversal entirely
    # since the filename is never derived from user input, and (b) guarantees
    # every garment image is a browser-universal format regardless of what
    # was uploaded (.jfif/.webp don't always get the right Content-Type
    # otherwise).
    try:
        img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Uploaded file is not a valid image")

    safe_name = f"{uuid.uuid4().hex}.jpg"
    file_path = os.path.join(GARMENT_DIR, safe_name)
    img.save(file_path, "JPEG", quality=90)

    try:
        tag_list = json.loads(tags) if tags else []
    except json.JSONDecodeError:
        tag_list = []

    garment = Garment(
        name=name,
        brand=brand,
        category=category,
        image_path=f"garment_images/{safe_name}",  # relative — portable
        thumbnail_url=f"/garments/{safe_name}",
        tags=tag_list,
    )
    db.add(garment)
    db.commit()
    db.refresh(garment)
    return garment


@router.delete("/{garment_id}")
def delete_garment(garment_id: int, db: Session = Depends(get_db)):
    g = db.query(Garment).filter(Garment.id == garment_id).first()
    if not g:
        raise HTTPException(404, "Garment not found")
    abs_path = resolve_garment_path(g.image_path)
    if os.path.exists(abs_path):
        try:
            os.remove(abs_path)
        except OSError:
            logger.warning(f"Could not delete file for garment {garment_id}: {abs_path}")
    db.delete(g)
    db.commit()
    return {"deleted": garment_id}
