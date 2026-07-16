"""
product_cache.py — SQLite cache for brands.py's fetched Shopify product
data. (Renamed from GlamourBot's original database.py to avoid clashing
with the try-on service's own models/database.py, which is a separate
SQLAlchemy setup for the garment catalog — unrelated to this cache.)

v3: added `colors` (JSON list) and `colors_confirmed` columns to persist
the real per-product color data brands.py now extracts from Shopify
variant options — see brands.py's module docstring for why this mattered.
"""

import os
import sqlite3
import json
import time
from contextlib import contextmanager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "brands_cache.db")


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS brand_products (
                domain           TEXT NOT NULL,
                title            TEXT NOT NULL,
                handle           TEXT NOT NULL,
                product_type     TEXT,
                price            TEXT,
                image_url        TEXT,
                url              TEXT NOT NULL,
                tags             TEXT,       -- JSON-encoded list
                colors           TEXT,       -- JSON-encoded list (v3)
                colors_confirmed INTEGER DEFAULT 0,  -- v3
                cached_at        REAL NOT NULL,
                PRIMARY KEY (domain, handle)
            )
        """)
        # Migrate older DBs created before v3 (colors columns missing)
        cols = {row["name"] for row in conn.execute("PRAGMA table_info(brand_products)")}
        if "colors" not in cols:
            conn.execute("ALTER TABLE brand_products ADD COLUMN colors TEXT")
        if "colors_confirmed" not in cols:
            conn.execute("ALTER TABLE brand_products ADD COLUMN colors_confirmed INTEGER DEFAULT 0")


def cache_products(domain: str, products: list) -> None:
    init_db()
    now = time.time()
    with _connect() as conn:
        conn.execute("DELETE FROM brand_products WHERE domain = ?", (domain,))
        conn.executemany(
            """INSERT INTO brand_products
               (domain, title, handle, product_type, price, image_url, url,
                tags, colors, colors_confirmed, cached_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                (domain, p.title, p.handle, p.product_type, p.price,
                 p.image_url, p.url, json.dumps(p.tags),
                 json.dumps(getattr(p, "colors", [])),
                 int(getattr(p, "colors_confirmed", False)),
                 now)
                for p in products
            ],
        )


def get_cached_products(domain: str) -> list:
    from services.brands import Product

    init_db()
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM brand_products WHERE domain = ?", (domain,)
        ).fetchall()

    return [
        Product(
            brand=row["domain"],
            title=row["title"],
            handle=row["handle"],
            product_type=row["product_type"] or "",
            price=row["price"],
            image_url=row["image_url"],
            url=row["url"],
            tags=json.loads(row["tags"]) if row["tags"] else [],
            colors=json.loads(row["colors"]) if row["colors"] else [],
            colors_confirmed=bool(row["colors_confirmed"]),
        )
        for row in rows
    ]


def is_cache_stale(domain: str, ttl_hours: int) -> bool:
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT MAX(cached_at) as latest FROM brand_products WHERE domain = ?",
            (domain,),
        ).fetchone()

    if row is None or row["latest"] is None:
        return True

    age_hours = (time.time() - row["latest"]) / 3600
    return age_hours > ttl_hours


def clear_cache(domain: str = None) -> None:
    init_db()
    with _connect() as conn:
        if domain:
            conn.execute("DELETE FROM brand_products WHERE domain = ?", (domain,))
        else:
            conn.execute("DELETE FROM brand_products")
