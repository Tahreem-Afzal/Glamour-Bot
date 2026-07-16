"""
recommend_router.py
Standalone product recommendation endpoint — the "Recommendation System"
tab talks to this directly (structured request/response), rather than
going through /chat's free-text intent detection. /chat still routes into
the same BrandRecommender for conversational queries; this just exposes
it explicitly for a dedicated UI (with a category/color form instead of
typing a sentence).
"""

import logging
from typing import Optional, List

from fastapi import APIRouter
from pydantic import BaseModel

from services.brands import BrandRecommender

logger = logging.getLogger(__name__)
router = APIRouter()

_recommender: Optional[BrandRecommender] = None


def _get_recommender() -> BrandRecommender:
    global _recommender
    if _recommender is None:
        _recommender = BrandRecommender(auto_sync=True)
    return _recommender


class RecommendRequest(BaseModel):
    query: str                 # free text, e.g. "red heels for a party"
    category: Optional[str] = None   # optional explicit filter, e.g. "shoes"
    color: Optional[str] = None      # optional explicit filter, e.g. "red"
    city: Optional[str] = None       # for weather-aware fabric suggestions
    max_results: int = 6


class ProductOut(BaseModel):
    brand: str
    title: str
    price: Optional[str]
    image_url: Optional[str]
    url: str
    colors: List[str] = []
    colors_confirmed: bool = False


class RecommendResponse(BaseModel):
    has_results: bool
    products: List[ProductOut] = []
    message: str
    weather_note: str = ""


@router.post("/", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    recommender = _get_recommender()

    # Explicit category/color filters (from dropdowns in the UI) are just
    # appended to the query text — brands.py's own vocabulary expansion
    # and color matching already handles this correctly either way.
    full_query = req.query
    if req.category:
        full_query += f" {req.category}"
    if req.color:
        full_query += f" {req.color}"

    result = recommender.recommend(full_query, max_results=req.max_results, city=req.city)

    if not result.get("has_results"):
        return RecommendResponse(
            has_results=False,
            message=recommender.format_response(result, full_query),
        )

    products = [
        ProductOut(
            brand=p.brand, title=p.title, price=p.price,
            image_url=p.image_url, url=p.url,
            colors=p.colors, colors_confirmed=p.colors_confirmed,
        )
        for p in result["brands"]
    ]
    return RecommendResponse(
        has_results=True,
        products=products,
        message=f"Found {len(products)} matching product(s).",
        weather_note=result.get("weather_note", ""),
    )


@router.post("/resync")
def resync(force: bool = False):
    """Manually trigger a re-fetch of live product data from all brand domains."""
    recommender = _get_recommender()
    recommender.sync(force=force)
    return {"message": "Resynced", "total_products": len(recommender._products)}
