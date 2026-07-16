"""
brands.py (v3 — fixes the color/category mismatch reported after v2)

WHAT WAS STILL WRONG IN v2
  v2 added stopword filtering, occasion/category vocabulary expansion, and
  a color bonus/exclusivity pass — genuine improvements, but it only ever
  looked for color words inside `title` + `product_type` + `tags` free
  text. On real Shopify stores (this is the actual, structural reason
  "red shoes" kept returning other colors), color is overwhelmingly
  carried as a VARIANT OPTION ("Color: Red"), not repeated in the
  product's own title or tags. A product titled "Aria Sandal" with a
  tag list like ["New Arrival", "SS25"] carries its actual color only on
  each variant (e.g. variant option1="Red"). v2's color check against
  title/tags/product_type text for that product found nothing — so
  "red" never appeared anywhere v2 was looking, even for a genuinely red
  product. When the *true* match was invisible to the scorer like this,
  v2's fallback (drop the strict color filter and re-show unfiltered
  results if the strict pass found zero) surfaced whatever else scored
  on category alone — a shoe in any other color. That fallback design
  was reasonable UX intent ("don't show nothing"), but paired with the
  broken color detection it silently produced exactly the
  mismatched-color complaint being fixed here.

THE FIX (v3)
  1. Extract real color(s) per product from Shopify's `options` +
     `variants` arrays: find whichever option is named Color/Colour, and
     collect every variant's value for that option position. This is
     ground-truth data the retailer set, not a guess from marketing tag
     text. Falls back to scanning each variant's own `title` string
     (Shopify variant titles are usually "<Color> / <Size>") against
     COLOR_WORDS when there's no explicitly named Color option — some
     smaller storefronts skip naming the option "Color" but the variant
     title still carries it.
  2. `Product.colors` is a new field carrying this real per-product
     color list. Color matching/exclusivity now checks `colors` FIRST,
     falling back to text-based matching only for products where no
     variant color data was recoverable at all (better than nothing,
     worse than real data — logged as a distinct case, not silently
     conflated with a confirmed match).
  3. Honesty over silent substitution: if the user named a specific
     color and NO product's real color data (or text fallback) confirms
     it, this returns has_results=False with a color-specific reason —
     rag_chain.py's existing fallback to a plain conversational answer
     kicks in, instead of quietly handing back a same-category,
     wrong-color item dressed up as if it were what was asked for.
  4. Removed the domains that were flagged "guessed, unverified" in v2's
     comments (hushpuppies.com.pk, ecs.pk, metro-shoes.com,
     batik.com.pk, naqshi.pk). A wrong-but-plausible-looking domain is
     worse than a missing one: if it happens to resolve to some
     unrelated real business's Shopify store, you'd silently start
     recommending a completely different company's products under
     GlamourBot's name. Verify the real domains for these categories and
     add them back deliberately (see ADD_VERIFIED_DOMAINS below) rather
     than guessing again.
"""

import os
import re
import time
import logging
from dataclasses import dataclass, field
from typing import Optional

import requests

logger = logging.getLogger(__name__)

DEFAULT_BRAND_DOMAINS = [
    # Clothing
    "mariab.pk",
    "sanasafinaz.com",
    "gulahmedshop.com",
    "khaadi.com",
    "edenrobe.com",
    "limelight.pk",
    "bonanza.com.pk",
    "zellbury.com",
    "generation.com.pk",
    "outfitters.com.pk",
    "charcoal.com.pk",
    "junaidjamsheddotcom.myshopify.com",
    "aghanoor.com",
    "laam.pk",
    # Bags / shoes — confirmed-plausible only; see module docstring point 4
    "borjan.com.pk",
    "stylo.pk",
    "almas.pk",
    "beechtree.pk",
    "ndure.com",
    "servis.pk",
    "jafferjees.com",
    # Jewelry
    "nayabjewellery.com",
    "divat.pk",
]

# ADD_VERIFIED_DOMAINS: put confirmed real Shopify domains here once you've
# checked https://<domain>/products.json actually returns JSON in a browser.
# This is intentionally empty rather than filled with more guesses.
ADD_VERIFIED_DOMAINS: list[str] = []

DEFAULT_BRAND_DOMAINS = DEFAULT_BRAND_DOMAINS + ADD_VERIFIED_DOMAINS

REQUEST_TIMEOUT = 10
PRODUCTS_PER_PAGE = 50

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "to", "of", "in", "on", "for", "with", "and", "or", "but", "at", "by",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us",
    "them", "my", "your", "his", "its", "our", "their",
    "what", "which", "who", "whom", "this", "that", "these", "those",
    "can", "could", "should", "would", "will", "shall", "do", "does", "did",
    "have", "has", "had", "give", "want", "need", "please", "some", "any",
    "wear", "suggest", "show", "find", "recommend", "looking", "look",
    "get", "buy", "link", "links", "something", "days", "now", "nowadays",
    "today", "ok", "okay",
}
ROMAN_URDU_STOPWORDS = {
    "hai", "hain", "ka", "ki", "ke", "ko", "se", "mein", "aur", "ya",
    "kya", "kaunsa", "kaunsi", "chahiye", "chahta", "chahti", "de", "do",
    "dijiye", "mujhe", "aap", "aapka", "aapki", "apna", "apni", "kuch",
    "bhi", "hoon", "ho", "tha", "thi",
}
ALL_STOPWORDS = STOPWORDS | ROMAN_URDU_STOPWORDS

OCCASION_EXPANSION = {
    "engagement": ["formal", "embroidered", "silk", "chiffon", "organza", "net", "embellished"],
    "mehndi":     ["formal", "embroidered", "silk", "organza", "net", "festive"],
    "wedding":    ["formal", "embroidered", "silk", "bridal", "heavy", "embellished"],
    "baraat":     ["formal", "embroidered", "silk", "bridal", "heavy", "embellished"],
    "walima":     ["formal", "embroidered", "silk", "bridal", "heavy", "embellished"],
    "party":      ["formal", "embroidered", "net", "organza", "chiffon", "embellished"],
    "casual":     ["lawn", "cotton", "printed", "daily"],
    "formal":     ["embroidered", "silk", "chiffon", "organza", "net", "embellished"],
    "fancy":      ["embroidered", "silk", "chiffon", "organza", "embellished", "net"],
    "office":     ["formal", "cotton", "lawn", "solid"],
    "summer":     ["lawn", "cotton", "linen", "chiffon"],
    "winter":     ["velvet", "khaddar", "wool", "karandi"],
}

CATEGORY_EXPANSION = {
    "bag":         ["bag", "tote", "clutch", "purse", "handbag", "sling", "satchel", "crossbody"],
    "bags":        ["bag", "tote", "clutch", "purse", "handbag", "sling", "satchel", "crossbody"],
    "jewelry":     ["jewelry", "jewellery", "earring", "earrings", "necklace", "ring", "bangle", "pendant", "bracelet"],
    "jewellery":   ["jewelry", "jewellery", "earring", "earrings", "necklace", "ring", "bangle", "pendant", "bracelet"],
    "jewlery":     ["jewelry", "jewellery", "earring", "earrings", "necklace", "ring", "bangle", "pendant", "bracelet"],
    "jewelery":    ["jewelry", "jewellery", "earring", "earrings", "necklace", "ring", "bangle", "pendant", "bracelet"],
    "jewelrey":    ["jewelry", "jewellery", "earring", "earrings", "necklace", "ring", "bangle", "pendant", "bracelet"],
    "jewleryy":    ["jewelry", "jewellery", "earring", "earrings", "necklace", "ring", "bangle", "pendant", "bracelet"],
    "jewellary":   ["jewelry", "jewellery", "earring", "earrings", "necklace", "ring", "bangle", "pendant", "bracelet"],
    "jewelory":    ["jewelry", "jewellery", "earring", "earrings", "necklace", "ring", "bangle", "pendant", "bracelet"],
    "shoe":        ["shoe", "shoes", "sandal", "heel", "sneaker", "khussa", "flat", "pump", "slipper"],
    "shoes":       ["shoe", "shoes", "sandal", "heel", "sneaker", "khussa", "flat", "pump", "slipper"],
    "sandals":     ["sandal", "sandals", "flat", "slide"],
    "heels":       ["heel", "heels", "pump", "stiletto"],
    "heel":        ["heel", "heels", "pump", "stiletto"],
    "eyewear":     ["sunglasses", "eyewear", "glasses", "shades"],
    "sunglasses":  ["sunglasses", "eyewear", "glasses", "shades"],
    "accessories": ["bag", "jewelry", "jewellery", "shoe", "sunglasses", "earring", "necklace"],
    "accessory":   ["bag", "jewelry", "jewellery", "shoe", "sunglasses", "earring", "necklace"],
    # Clothing — added: the brand domains here are Pakistani lawn/eastern-wear
    # retailers whose product titles almost never contain the literal word
    # "dress". Without this expansion, "dress" had zero vocabulary bridge to
    # what's actually in these catalogs (suit/kurta/kameez/pret/etc.), so it
    # scored 0 overlap on every product and always returned no results.
    "dress":       ["dress", "frock", "gown", "kurta", "kurti", "kameez",
                    "suit", "shirt", "pret", "stitched", "unstitched", "outfit"],
    "dresses":     ["dress", "frock", "gown", "kurta", "kurti", "kameez",
                    "suit", "shirt", "pret", "stitched", "unstitched", "outfit"],
    "frock":       ["dress", "frock", "gown", "kurta", "kurti", "kameez", "outfit"],
    "gown":        ["dress", "frock", "gown", "kameez", "outfit"],
    "kurta":       ["kurta", "kurti", "kameez", "shirt", "suit", "dress"],
    "kurti":       ["kurta", "kurti", "kameez", "shirt", "suit", "dress"],
    "kameez":      ["kameez", "kurta", "kurti", "suit", "shirt", "dress"],
    "suit":        ["suit", "kurta", "kameez", "pret", "stitched", "unstitched", "dress"],
    "shirt":       ["shirt", "kurta", "kameez", "suit", "dress"],
    "abaya":       ["abaya", "gown", "outfit"],
}

COLOR_WORDS = {
    "pink", "red", "blue", "green", "yellow", "black", "white", "gold",
    "golden", "silver", "maroon", "navy", "beige", "mustard", "peach",
    "mint", "lavender", "coral", "teal", "purple", "orange", "brown",
    "grey", "gray", "cream", "ivory", "turquoise", "magenta", "rose",
    "olive", "tan", "rust", "wine", "emerald", "nude",
}
PASTEL_FAMILY = {"peach", "mint", "lavender", "coral", "nude", "cream", "rose"}

GENDER_WORDS = {
    "men":   ["men", "man", "male", "mens", "gents", "gentleman"],
    "women": ["women", "woman", "female", "womens", "ladies", "lady"],
}
KIDS_WORDS = ["kids", "kid", "children", "child", "boys", "girls", "boy", "girl", "junior", "toddler"]

# MATERIAL_STYLE_SYNONYMS: fabric, embroidery/print, and finish/heel-style
# descriptors — this is the vocabulary needed for "a red chikankari lawn
# dress" or "beige glossy court shoes" to be treated as MANDATORY
# requirements rather than loose keyword bonuses. Each canonical key maps
# to every spelling/synonym variant we want to recognize in a user's query
# (multi-word phrases are matched as substrings, single words as whole
# words) — product-side text is assumed to use the canonical/standard
# spelling, which is what real retailers use in titles/tags.
MATERIAL_STYLE_SYNONYMS = {
    # fabrics
    "lawn":       ["lawn"],
    "chiffon":    ["chiffon"],
    "silk":       ["silk"],
    "cotton":     ["cotton"],
    "linen":      ["linen"],
    "organza":    ["organza"],
    "net":        ["net"],
    "velvet":     ["velvet"],
    "khaddar":    ["khaddar", "khadar"],
    "karandi":    ["karandi", "qarandi"],
    "georgette":  ["georgette", "jorjette", "jorjet"],
    "jamawar":    ["jamawar"],
    "cambric":    ["cambric"],
    "voile":      ["voile"],
    "wool":       ["wool", "woolen", "woollen"],
    "denim":      ["denim"],
    "leather":    ["leather"],
    "suede":      ["suede"],
    "satin":      ["satin"],
    "tissue":     ["tissue"],
    # embroidery / print style
    "chikankari": ["chikankari", "chikan", "chikenkari", "chickenkari",
                   "chicken kari", "chikan kari", "chikankary"],
    "embroidered": ["embroidered", "embroidery"],
    "printed":    ["printed", "print"],
    "plain":      ["plain", "solid"],
    "digital print": ["digital print", "digital printed"],
    "sequined":   ["sequined", "sequin", "sequinned"],
    "gota":       ["gota", "gota work"],
    "mirror work": ["mirror work", "mirrorwork", "shisha"],
    # finishes / heel & shoe styles
    "glossy":     ["glossy", "shiny", "patent"],
    "matte":      ["matte", "matt"],
    "block heel": ["block heel", "block heels"],
    "stiletto":   ["stiletto", "stilettos"],
    "wedge":      ["wedge", "wedges"],
    "flat":       ["flat", "flats"],
    "platform":   ["platform", "platforms"],
    "court":      ["court", "court shoe", "court shoes", "pump", "pumps"],
    "slip-on":    ["slip on", "slip-on", "slipon"],
    "lace-up":    ["lace up", "lace-up", "laceup"],
    "buckle":     ["buckle", "buckled"],
    "strappy":    ["strap", "strappy", "straps"],
}

# Single-word variant -> canonical, used to correct the query side so a
# typo'd word ("chikenkari") still overlaps with the product's correctly
# spelled text ("chikankari") during scoring.
VARIANT_TO_CANONICAL = {
    variant: canonical
    for canonical, variants in MATERIAL_STYLE_SYNONYMS.items()
    for variant in variants
    if " " not in variant
}

# Pool of every recognized single-word vocabulary term, used as the fuzzy-
# match target set for typo correction on category/color/occasion words
# that aren't explicitly enumerated (e.g. "shues" -> "shoes").
FUZZY_VOCAB_WORDS = (
    set(COLOR_WORDS)
    | set(CATEGORY_EXPANSION.keys())
    | {w for words in CATEGORY_EXPANSION.values() for w in words}
    | set(OCCASION_EXPANSION.keys())
    | {w for words in OCCASION_EXPANSION.values() for w in words}
    | set(VARIANT_TO_CANONICAL.keys())
    | set(VARIANT_TO_CANONICAL.values())
    | {w for words in GENDER_WORDS.values() for w in words}
    | set(KIDS_WORDS)
)


def _normalize_query_words(raw_words: set) -> set:
    """
    Returns raw_words plus any typo-corrected/canonicalized additions, so
    downstream category/color/attribute detection and scoring see the
    "real" vocabulary word even when the user misspelled it.
    """
    import difflib

    normalized = set(raw_words)
    for w in raw_words:
        canon = VARIANT_TO_CANONICAL.get(w)
        if canon:
            normalized.add(canon)

    for w in raw_words:
        if w in ALL_STOPWORDS or w in FUZZY_VOCAB_WORDS or w in VARIANT_TO_CANONICAL:
            continue
        match = difflib.get_close_matches(w, FUZZY_VOCAB_WORDS, n=1, cutoff=0.82)
        if match:
            normalized.add(match[0])
            canon = VARIANT_TO_CANONICAL.get(match[0])
            if canon:
                normalized.add(canon)

    return normalized


def _extract_attributes(query_lower: str) -> set:
    """
    Finds every fabric/embroidery/finish descriptor explicitly present in
    the raw query text (handles both single words and multi-word phrases,
    and typo variants, via MATERIAL_STYLE_SYNONYMS). These become
    MANDATORY requirements in recommend() — a product must match every
    attribute the user actually named.
    """
    found = set()
    for canonical, variants in MATERIAL_STYLE_SYNONYMS.items():
        for v in variants:
            if " " in v:
                if v in query_lower:
                    found.add(canonical)
                    break
            elif re.search(rf"\b{re.escape(v)}\b", query_lower):
                found.add(canonical)
                break
    return found


def _product_matches_attributes(product, attrs_found: set) -> bool:
    """A product must contain EVERY requested attribute's canonical term
    (or one of its variants) in its own text — all are mandatory, none
    are optional bonuses."""
    text = f"{product.title} {product.product_type} {' '.join(product.tags)}".lower()
    for a in attrs_found:
        variants = MATERIAL_STYLE_SYNONYMS[a]
        matched = False
        for v in variants:
            if " " in v:
                if v in text:
                    matched = True
                    break
            elif re.search(rf"\b{re.escape(v)}\b", text):
                matched = True
                break
        if not matched:
            return False
    return True


def _detect_gender_and_kids(raw_words: set) -> tuple[Optional[str], bool]:
    is_kids = any(w in raw_words for w in KIDS_WORDS)
    target_gender = None
    if any(w in raw_words for w in GENDER_WORDS["men"]):
        target_gender = "men"
    elif any(w in raw_words for w in GENDER_WORDS["women"]):
        target_gender = "women"
    if target_gender is None:
        if "boys" in raw_words or "boy" in raw_words:
            target_gender = "men"
        elif "girls" in raw_words or "girl" in raw_words:
            target_gender = "women"
    return target_gender, is_kids


def _expand_query(raw_words: set) -> tuple[set, set]:
    content = raw_words - ALL_STOPWORDS
    expanded = set(content)
    colors = {w for w in raw_words if w in COLOR_WORDS}
    for w in content:
        if w in OCCASION_EXPANSION:
            expanded.update(OCCASION_EXPANSION[w])
        if w in CATEGORY_EXPANSION:
            expanded.update(CATEGORY_EXPANSION[w])
    if "pastel" in raw_words:
        colors.update(PASTEL_FAMILY)
    return expanded, colors


@dataclass
class Product:
    brand: str
    title: str
    handle: str
    product_type: str
    price: Optional[str]
    image_url: Optional[str]
    url: str
    tags: list = field(default_factory=list)
    colors: list = field(default_factory=list)          # NEW in v3 — real variant color data
    colors_confirmed: bool = False                        # NEW — True if colors came from real variant data, not a text guess


class ShopifyFetcher:
    """Pulls product listings from a brand's public Shopify /products.json endpoint."""

    def __init__(self, domain: str):
        self.domain = domain.strip().rstrip("/")

    def _build_product_url(self, product: dict) -> Optional[str]:
        handle = product.get("handle")
        if not handle or not handle.strip():
            return None
        collection = product.get("_collection_hint")
        if collection:
            return f"https://{self.domain}/collections/{collection}/products/{handle}"
        return f"https://{self.domain}/products/{handle}"

    def _extract_colors(self, product: dict) -> tuple[list, bool]:
        """
        Returns (colors, confirmed).

        confirmed=True means these colors came from real Shopify option/
        variant data (ground truth set by the retailer) — this is the v3
        fix. confirmed=False means we fell back to scanning variant title
        text against COLOR_WORDS, which is weaker but still better than
        nothing for storefronts that don't name their option "Color".
        """
        options = product.get("options", [])
        variants = product.get("variants", [])

        color_option_index = None  # 1, 2, or 3 -> maps to variant's option1/2/3
        for i, opt in enumerate(options):
            opt_name = (opt.get("name") or "").strip().lower()
            if opt_name in ("color", "colour"):
                color_option_index = i + 1  # Shopify variants use 1-indexed option1/2/3
                break

        colors = set()
        if color_option_index is not None:
            key = f"option{color_option_index}"
            for v in variants:
                val = v.get(key)
                if val:
                    colors.add(val.strip().lower())
            if colors:
                return sorted(colors), True

        # Fallback: no explicitly named Color option — scan variant titles
        # (Shopify's default convention is "<Option1> / <Option2>", and
        # color is very often option1) against our known color vocabulary.
        for v in variants:
            title = (v.get("title") or "").lower()
            for c in COLOR_WORDS:
                if c in title:
                    colors.add(c)
        return sorted(colors), False

    def fetch_products(self, limit: int = 250) -> list[Product]:
        products = []
        page = 1
        while len(products) < limit:
            try:
                resp = requests.get(
                    f"https://{self.domain}/products.json",
                    params={"limit": PRODUCTS_PER_PAGE, "page": page},
                    timeout=REQUEST_TIMEOUT,
                    headers={"User-Agent": "GlamourBot/1.0 (fashion assistant)"},
                )
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.warning(f"[ShopifyFetcher] {self.domain}: fetch failed on page {page}: {e}")
                break

            page_items = data.get("products", [])
            if not page_items:
                break

            for p in page_items:
                url = self._build_product_url(p)
                if url is None:
                    continue

                variants = p.get("variants", [])
                price = variants[0].get("price") if variants else None
                images = p.get("images", [])
                image_url = images[0].get("src") if images else None
                colors, confirmed = self._extract_colors(p)

                products.append(Product(
                    brand=self.domain,
                    title=p.get("title", "Untitled"),
                    handle=p["handle"],
                    product_type=p.get("product_type", ""),
                    price=price,
                    image_url=image_url,
                    url=url,
                    tags=p.get("tags", []),
                    colors=colors,
                    colors_confirmed=confirmed,
                ))

            if len(page_items) < PRODUCTS_PER_PAGE:
                break
            page += 1

        return products[:limit]


_PRICE_UNDER_PATTERNS = [
    r"(?:under|below|less\s*than|se\s*kam|tak)\s*(?:pkr|rs\.?|rupees)?\s*([\d,]+)",
    r"([\d,]+)\s*(?:pkr|rs\.?|rupees)?\s*(?:se\s*kam|or\s*less|and\s*below)",
    r"(?:budget|max)\s*(?:of|is|:)?\s*(?:pkr|rs\.?|rupees)?\s*([\d,]+)",
]


def _extract_max_price(query_lower: str) -> Optional[float]:
    """Pulls a budget ceiling out of free text like 'under pkr 12000',
    'below rs 5000', 'budget 8000'. Returns None if no budget was stated."""
    for pattern in _PRICE_UNDER_PATTERNS:
        m = re.search(pattern, query_lower)
        if m:
            digits = m.group(1).replace(",", "")
            try:
                return float(digits)
            except ValueError:
                continue
    return None


def _product_price_value(product) -> Optional[float]:
    """Parses a product's stored price string (plain Shopify numeric
    string like '25990.00') into a float. Returns None if missing/unparseable."""
    if not product.price:
        return None
    try:
        return float(str(product.price).replace(",", "").strip())
    except ValueError:
        return None


class BrandRecommender:
    def __init__(self, auto_sync: bool = True, brand_domains: list[str] = None,
                 cache_ttl_hours: int = 12):
        self.brand_domains = brand_domains or DEFAULT_BRAND_DOMAINS
        self.cache_ttl_hours = cache_ttl_hours
        self._products: list[Product] = []
        if auto_sync:
            self.sync()

    def sync(self, force: bool = False):
        from services.product_cache import get_cached_products, cache_products, is_cache_stale

        all_products = []
        for domain in self.brand_domains:
            if not force and not is_cache_stale(domain, self.cache_ttl_hours):
                cached = get_cached_products(domain)
                if cached:
                    all_products.extend(cached)
                    continue

            fetcher = ShopifyFetcher(domain)
            fresh = fetcher.fetch_products()
            if fresh:
                cache_products(domain, fresh)
                all_products.extend(fresh)
            else:
                stale_cached = get_cached_products(domain)
                if stale_cached:
                    logger.info(f"[BrandRecommender] {domain}: using stale cache (live fetch failed/empty)")
                    all_products.extend(stale_cached)

        self._products = all_products
        logger.info(f"[BrandRecommender] synced {len(all_products)} products across {len(self.brand_domains)} brands")

    def recommend(self, query: str, max_results: int = 6, city: str = None) -> dict:
        if not self._products:
            return {"has_results": False, "brands": [], "query": query, "reason": "no_products_cached"}

        query_lower = query.lower()
        raw_words = set(re.findall(r"[a-z]+", query_lower))

        # Typo/spelling tolerance: correct things like "chikenkari" or
        # "shues" to the vocabulary word that actually appears in real
        # product text, BEFORE any matching happens.
        norm_words = _normalize_query_words(raw_words)

        expanded_words, colors_found = _expand_query(norm_words)
        target_gender, is_kids = _detect_gender_and_kids(norm_words)
        attrs_found = _extract_attributes(query_lower)

        if not expanded_words and not attrs_found:
            return {"has_results": False, "brands": [], "query": query, "reason": "empty_query"}

        fabric_hint = {"prefer_fabrics": [], "avoid_fabrics": []}
        if city:
            try:
                from services.weather import get_weather, weather_to_fabric_hint
                fabric_hint = weather_to_fabric_hint(get_weather(city))
            except Exception as e:
                logger.info(f"[BrandRecommender] weather lookup skipped: {e}")

        requested_categories = [c for c in CATEGORY_EXPANSION if c in norm_words]
        wanted_category_words = set()
        if requested_categories:
            # Use the MOST SPECIFIC category named (the one with the
            # smallest/narrowest vocabulary), not the union of all of them.
            # Bug this fixes: the UI's category dropdown appends a broad
            # word like "shoes" onto a query that already said "heels" —
            # unioning both vocabularies let plain sneakers/slippers back
            # in, since they satisfy the broad "shoes" set even though
            # they don't satisfy "heels". Picking the narrowest category
            # keeps the user's more specific, explicit intent authoritative.
            narrowest = min(requested_categories, key=lambda c: len(CATEGORY_EXPANSION[c]))
            wanted_category_words = set(CATEGORY_EXPANSION[narrowest])

        max_price = _extract_max_price(query_lower)

        def _text_of(product) -> str:
            return f"{product.title} {product.product_type} {' '.join(product.tags)}".lower()

        def _matches_requested_category(product) -> bool:
            if not wanted_category_words:
                return True
            text_words = set(re.findall(r"[a-z]+", _text_of(product)))
            return bool(wanted_category_words & text_words)

        def _matches_requested_color(product) -> bool:
            if not colors_found:
                return True
            # v3: real variant color data is authoritative; text is only a
            # fallback for products with no recoverable variant colors.
            if any(c in product.colors for c in colors_found):
                return True
            if not product.colors:
                return any(c in _text_of(product) for c in colors_found)
            return False

        def _contains_any_word(text: str, words: list) -> bool:
            return any(re.search(rf"\b{re.escape(w)}\b", text) for w in words)

        opposite_gender = {"men": "women", "women": "men"}.get(target_gender)

        def _matches_gender_and_kids(product) -> bool:
            text = _text_of(product)
            if opposite_gender and _contains_any_word(text, GENDER_WORDS[opposite_gender]):
                return False
            return True

        # --- MANDATORY pass: every specific thing the user named (category,
        # color, and each fabric/embroidery/finish attribute) must ALL be
        # true for a product to be eligible at all. Nothing here is a
        # scoring bonus — a product missing any named requirement is
        # excluded outright, so the links returned only ever point to
        # products that actually match everything asked for.
        def _matches_budget(product) -> bool:
            if max_price is None:
                return True
            price_value = _product_price_value(product)
            if price_value is None:
                # Unknown price + a stated budget: exclude rather than risk
                # showing something that could be well over what was asked.
                return False
            return price_value <= max_price

        def _eligible(relax_category=False, relax_color=False, relax_attrs=False, relax_budget=False):
            out = []
            for p in self._products:
                if not relax_category and not _matches_requested_category(p):
                    continue
                if not relax_color and not _matches_requested_color(p):
                    continue
                if not relax_attrs and attrs_found and not _product_matches_attributes(p, attrs_found):
                    continue
                if not relax_budget and max_price is not None and not _matches_budget(p):
                    continue
                if not _matches_gender_and_kids(p):
                    continue
                out.append(p)
            return out

        eligible = _eligible()

        if not eligible:
            # Diagnose which specific requirement is actually the blocker,
            # by relaxing exactly one dimension at a time and seeing if
            # that alone would produce results — so the message names the
            # real cause instead of guessing (e.g. not blaming color when
            # the true mismatch was the embroidery/fabric attribute).
            if attrs_found and _eligible(relax_attrs=True):
                return {
                    "has_results": False, "brands": [], "query": query,
                    "reason": "no_attribute_match",
                    "requested_attributes": sorted(attrs_found),
                }
            if colors_found and _eligible(relax_color=True):
                return {
                    "has_results": False, "brands": [], "query": query,
                    "reason": "no_exact_color_match",
                    "requested_colors": sorted(colors_found),
                }
            if max_price is not None and _eligible(relax_budget=True):
                return {
                    "has_results": False, "brands": [], "query": query,
                    "reason": "no_budget_match",
                    "requested_max_price": max_price,
                }
            if requested_categories and _eligible(relax_category=True):
                return {
                    "has_results": False, "brands": [], "query": query,
                    "reason": "no_category_match",
                    "requested_categories": requested_categories,
                }
            return {"has_results": False, "brands": [], "query": query, "reason": "filtered_to_empty"}

        # --- Ranking pass: among products that satisfy every mandatory
        # requirement, order by how well they also match the rest of the
        # query (extra descriptive words, fabric-weather hint, gender
        # emphasis). This never lets a product back in that failed the
        # mandatory pass above — it only orders the eligible set.
        if is_kids:
            kids_strict = [p for p in eligible if _contains_any_word(_text_of(p), KIDS_WORDS)]
            if kids_strict:
                eligible = kids_strict

        scored = []
        for p in eligible:
            text = _text_of(p)
            text_words = set(re.findall(r"[a-z]+", text))
            score = len(expanded_words & text_words) * 10

            for c in colors_found:
                if c in p.colors:
                    score += 20 if p.colors_confirmed else 12

            for a in attrs_found:
                score += 15  # already mandatory-matched; keeps these ranked above generic overlap

            for fab in fabric_hint.get("prefer_fabrics", []):
                if fab in text:
                    score += 10
            for fab in fabric_hint.get("avoid_fabrics", []):
                if fab in text:
                    score -= 5

            if target_gender and _contains_any_word(text, GENDER_WORDS[target_gender]):
                score += 12

            scored.append((score, p))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = [p for _, p in scored[:max_results]]

        return {
            "has_results": True,
            "brands": top,
            "query": query,
            "weather_note": fabric_hint.get("note", "") if city else "",
        }

    def format_response(self, result: dict, query: str) -> str:
        if not result.get("has_results"):
            reason = result.get("reason")
            if reason == "no_exact_color_match":
                colors = ", ".join(result.get("requested_colors", []))
                return (
                    f"I couldn't find anything in **{colors}** specifically for that request in the "
                    f"brands I currently track — want me to show similar styles in other colors instead, "
                    f"or suggest general style ideas?"
                )
            if reason == "no_attribute_match":
                attrs = ", ".join(result.get("requested_attributes", []))
                return (
                    f"I couldn't find anything matching **{attrs}** specifically for that request in the "
                    f"brands I currently track — want me to see similar styles without that detail instead?"
                )
            if reason == "no_budget_match":
                budget = result.get("requested_max_price")
                return (
                    f"I couldn't find anything matching that request under **PKR {budget:,.0f}** in the "
                    f"brands I currently track — want me to show the closest options slightly above that budget instead?"
                )
            if reason == "no_category_match":
                cats = ", ".join(result.get("requested_categories", []))
                return (
                    f"I couldn't find any **{cats}** in the brands I currently track — "
                    f"want me to suggest something else?"
                )
            return (
                "I couldn't find matching products for that right now — "
                "want me to suggest general style ideas instead?"
            )

        lines = ["Here's what I found:"]
        if result.get("weather_note"):
            lines.append(f"_{result['weather_note']}_")
        lines.append("")

        for p in result["brands"]:
            price_str = f" — PKR {p.price}" if p.price else ""
            color_str = f" ({'/'.join(p.colors)})" if p.colors else ""
            lines.append(f"- **{p.title}**{color_str} ({p.brand}){price_str}\n  {p.url}")

        return "\n".join(lines)