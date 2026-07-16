"""
fashn_client.py
Wraps a single call to the FASHN Virtual Try-On API (https://fashn.ai).

Uses the official `fashn` Python SDK (pip install fashn). The SDK's
`.subscribe()` call submits the job and polls until it's done, so from our
side this is just one blocking call — which is why we run it inside
FastAPI's thread-pool executor from the router (see tryon_router.py),
rather than awaiting it directly.

NOTE: FASHN's exact input/output field names can change between API
versions. If this stops working, check https://docs.fashn.ai for the
current `tryon-max` (or `tryon-v1.6`) request/response schema and adjust
the `inputs=` dict and the output-parsing block below accordingly.
"""

import os
import base64
import logging

import httpx
from fashn import Fashn

logger = logging.getLogger(__name__)


def _get_client() -> Fashn:
    api_key = os.environ.get("FASHN_API_KEY")
    if not api_key:
        raise RuntimeError(
            "FASHN_API_KEY is not set. Add it to backend/.env as "
            "FASHN_API_KEY=your_key_here and restart the server."
        )
    return Fashn(api_key=api_key)


def _to_data_uri(image_bytes: bytes, mime: str = "image/jpeg") -> str:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime};base64,{b64}"


def run_tryon(person_image_bytes: bytes, garment_image_bytes: bytes) -> bytes:
    """
    Sends a person photo + garment photo to FASHN's Virtual Try-On API and
    returns the generated result image as raw JPEG bytes.

    This is a BLOCKING call (network + ~5-20s of model inference) — always
    invoke it via loop.run_in_executor(), never directly inside an async def.
    """
    client = _get_client()

    person_uri = _to_data_uri(person_image_bytes)
    garment_uri = _to_data_uri(garment_image_bytes)

    logger.info("Submitting try-on request to FASHN...")
    result = client.predictions.subscribe(
        model_name="tryon-max",
        inputs={
            "model_image": person_uri,
            "product_image": garment_uri,
        },
    )

    status = getattr(result, "status", None)
    if status not in ("completed", "success", "succeeded", None):
        raise RuntimeError(f"FASHN generation did not complete (status={status})")

    output = getattr(result, "output", None)
    if not output:
        raise RuntimeError("FASHN returned no output image")

    image_ref = output[0] if isinstance(output, list) else output

    if isinstance(image_ref, str) and image_ref.startswith("http"):
        resp = httpx.get(image_ref, timeout=30)
        resp.raise_for_status()
        return resp.content
    elif isinstance(image_ref, str) and image_ref.startswith("data:"):
        b64_data = image_ref.split(",", 1)[1]
        return base64.b64decode(b64_data)
    else:
        raise RuntimeError(f"Unrecognized FASHN output format: {type(image_ref)} — "
                            f"check docs.fashn.ai for the current response schema")
