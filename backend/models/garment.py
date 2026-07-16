"""garment.py — Garment DB model"""

from sqlalchemy import Column, Integer, String, JSON
from models.database import Base


class Garment(Base):
    __tablename__ = "garments"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    brand         = Column(String, default="")
    category      = Column(String, default="upper")  # upper | lower | full
    image_path    = Column(String, nullable=False)    # path on disk to the garment photo
    thumbnail_url = Column(String, default="")         # public URL served by /garments
    tags          = Column(JSON, default=list)          # ["casual", "summer", ...]
