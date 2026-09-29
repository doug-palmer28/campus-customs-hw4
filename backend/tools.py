"""Data tools for the Campus Customs agent.

These are the functions the agent uses to look things up in the catalogue
database, so its answers about the store are grounded in real data rather than
invented. This is the shared home for catalogue/database logic (main.py imports
the category helpers from here).

Problem 5 provides the database connection, the category normalizer, and a
high-level `catalogue_overview` tool. The detailed product-info and stock tools
are added in Problem 6.
"""
from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

from models import (
    ProductDetails,
    ProductSearchResult,
    SizeAvailability,
    StockInfo,
)

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]

# Resolve the database the same way main.py does, so both read the same file.
_BACKEND_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _BACKEND_DIR.parent
DATA_DIR = Path(os.environ.get("CAMPUS_CUSTOMS_DATA_DIR", _PROJECT_ROOT / "data"))
DB_PATH = Path(os.environ.get("CAMPUS_CUSTOMS_DB", DATA_DIR / "campus_customs.db"))


# Canonical categories, in the order we want them offered to shoppers.
CATEGORIES = [
    "T-Shirts",
    "Long-Sleeve Shirts",
    "Crewnecks",
    "Hoodies",
    "Quarter-Zips",
    "Jackets",
]


def normalize_category(garment_type: str) -> str:
    """Collapse the catalogue's many garment-type spellings into one clean
    category so filtering/answering by "T-Shirts" gathers every t-shirt, etc.

    Order matters: more specific checks come first (a "short-sleeve crew-neck
    t-shirt" is a T-shirt, not a crewneck; a "full-zip hooded sweatshirt" is a
    hoodie, not a jacket).
    """
    g = (garment_type or "").lower()
    if "hood" in g:
        return "Hoodies"
    if "quarter-zip" in g or "quarter zip" in g or "1/4" in g:
        return "Quarter-Zips"
    if "t-shirt" in g or "t shirt" in g or "tee" in g:
        return "T-Shirts"
    if "long-sleeve" in g or "long sleeve" in g or "performance" in g:
        return "Long-Sleeve Shirts"
    if "jacket" in g or "bomber" in g or "fleece" in g:
        return "Jackets"
    if "crew" in g or "raglan" in g or "mockneck" in g or "sweatshirt" in g:
        return "Crewnecks"
    return "Other"


# Consolidate the many raw color spellings into a small, clean set of garment
# colors. Keyed by substring so "heather gray", "dark heather charcoal", etc. all
# land in "Gray"; "navy" and "navy blue" both become "Navy" (distinct from "Blue").
# Order matters: more specific terms are checked first.
_COLOR_RULES: list[tuple[tuple[str, ...], str]] = [
    (("navy", "midnight"), "Navy"),
    (("charcoal", "heather gray", "heather grey", "gray", "grey", "ash", "silver"), "Gray"),
    (("royal", "carolina", "sky", "light blue", "blue"), "Blue"),
    (("cream", "ivory", "natural", "white"), "White"),
    (("black", "onyx"), "Black"),
    (("maroon", "crimson", "burgundy", "red"), "Red"),
    (("forest", "kelly", "olive", "green"), "Green"),
    (("gold", "yellow", "mustard"), "Gold"),
    (("pink", "rose", "coral"), "Pink"),
    (("purple", "violet"), "Purple"),
    (("orange",), "Orange"),
    (("tan", "khaki", "brown", "beige"), "Tan"),
]


def canonicalize_color(raw: str) -> str:
    """Map a raw color string to one of a small set of clean garment colors."""
    c = (raw or "").strip().lower()
    for needles, label in _COLOR_RULES:
        if any(n in c for n in needles):
            return label
    return raw.strip().title() if raw else "Other"


def primary_color(colors: list[str]) -> str:
    """The garment's main color = the first color listed (the base of the garment,
    not the text/graphic accents), consolidated to a clean label."""
    return canonicalize_color(colors[0]) if colors else "Other"


def get_connection() -> sqlite3.Connection | None:
    """Open the catalogue database read-only. Returns None if it isn't present."""
    if not DB_PATH.exists():
        return None
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


# Size chart — mirrors the Size Guide page so the agent and the site agree.
SIZE_GUIDE = [
    {"size": "XS", "chest_min_in": 32, "chest_max_in": 34},
    {"size": "S", "chest_min_in": 35, "chest_max_in": 37},
    {"size": "M", "chest_min_in": 38, "chest_max_in": 41},
    {"size": "L", "chest_min_in": 42, "chest_max_in": 45},
    {"size": "XL", "chest_min_in": 46, "chest_max_in": 49},
    {"size": "XXL", "chest_min_in": 50, "chest_max_in": 53},
]

MEASURE_INSTRUCTIONS = (
    "How to measure your chest: wrap a soft tape measure around the fullest part "
    "of your chest, under your arms and across your shoulder blades, keeping the "
    "tape level and snug but not tight. Take the measurement in inches while "
    "wearing a light shirt. If you're between sizes, size up for a roomier, "
    "layer-friendly fit."
)


def size_guide() -> dict[str, Any]:
    """Return the Campus Customs size chart (chest measurements per size) and
    instructions for taking measurements. Use this to help a shopper figure out
    which size to order from their chest measurement."""
    return {
        "unit": "inches",
        "measure_instructions": MEASURE_INSTRUCTIONS,
        "sizes": SIZE_GUIDE,
        "note": "Apparel runs true to size with a relaxed fit; between sizes, size up.",
    }


def recommend_size(chest_inches: float) -> dict[str, Any]:
    """Recommend a size for a given chest measurement (in inches), following the
    size chart. Returns the recommended size and a short explanation."""
    for row in SIZE_GUIDE:
        if chest_inches <= row["chest_max_in"]:
            return {
                "chest_inches": chest_inches,
                "recommended_size": row["size"],
                "fits_range": f"{row['chest_min_in']}-{row['chest_max_in']} in",
            }
    return {
        "chest_inches": chest_inches,
        "recommended_size": "XXL",
        "fits_range": "50-53 in",
        "note": "Above the top of our size range; XXL is our largest size.",
    }


# Which categories pair well together, for "complete the look" recommendations.
_COMPLEMENTARY = {
    "T-Shirts": ["Hoodies", "Crewnecks", "Quarter-Zips", "Jackets"],
    "Long-Sleeve Shirts": ["Quarter-Zips", "Jackets", "Hoodies"],
    "Crewnecks": ["T-Shirts", "Jackets"],
    "Hoodies": ["T-Shirts", "Jackets"],
    "Quarter-Zips": ["T-Shirts", "Long-Sleeve Shirts"],
    "Jackets": ["T-Shirts", "Crewnecks", "Hoodies"],
}

# Generic tags that don't signal a specific affinity (college/sport/school).
_GENERIC_TAGS = {
    "yale", "yale university", "college apparel", "college merch", "crewneck",
    "sweatshirt", "hoodie", "t-shirt", "tee", "long sleeve", "short sleeve",
    "pullover", "quarter-zip", "jacket", "campus customs", "navy", "gray", "white",
    "cotton", "fleece", "unisex", "mens", "womens",
}


def recommend_products(
    seed_product_ids: list[str],
    preferred_sizes: list[str] | None = None,
    limit: int = 4,
) -> list[str]:
    """Recommend product_ids to go with a set of seed products (cart or purchase
    history). Prefers items that (1) share an affinity — a specific college, sport,
    or school — with the seeds, (2) are a complementary category (a jacket to layer
    over a tee, etc.), and (3) are in stock in the shopper's preferred sizes. Falls
    back to general Yale gear when the seeds carry no specific affinity.

    Returns an ordered list of product_ids (best first), excluding the seeds.
    """
    conn = get_connection()
    if conn is None:
        return []
    try:
        seed_set = set(seed_product_ids)
        rows = conn.execute(
            "SELECT c.product_id, c.name, c.garment_type, c.search_tags, "
            "COALESCE(SUM(i.quantity), 0) AS total_qty "
            "FROM catalogue c LEFT JOIN inventory i ON i.product_id = c.product_id "
            "GROUP BY c.product_id"
        ).fetchall()
        by_id = {r["product_id"]: r for r in rows}

        # Build affinity signal + seed categories from the seed products.
        affinity: set[str] = set()
        seed_categories: set[str] = set()
        for pid in seed_product_ids:
            r = by_id.get(pid)
            if not r:
                continue
            seed_categories.add(normalize_category(r["garment_type"]))
            for tag in _parse_json_list(r["search_tags"]):
                t = tag.strip().lower()
                if t and t not in _GENERIC_TAGS:
                    affinity.add(t)

        complementary_cats: set[str] = set()
        for cat in seed_categories:
            complementary_cats.update(_COMPLEMENTARY.get(cat, []))

        # Which products are in stock in a preferred size?
        size_ok: set[str] | None = None
        if preferred_sizes:
            wanted = {s.strip().upper() for s in preferred_sizes if s}
            if wanted:
                placeholders = ",".join("?" for _ in wanted)
                srows = conn.execute(
                    f"SELECT DISTINCT product_id FROM inventory "
                    f"WHERE upper(size) IN ({placeholders}) AND quantity > 0",
                    tuple(wanted),
                ).fetchall()
                size_ok = {r["product_id"] for r in srows}

        scored: list[tuple[int, str]] = []
        for r in rows:
            pid = r["product_id"]
            if pid in seed_set:
                continue
            if r["total_qty"] <= 0:
                continue  # never recommend a sold-out product
            if size_ok is not None and pid not in size_ok:
                continue

            cat = normalize_category(r["garment_type"])
            tags = {t.strip().lower() for t in _parse_json_list(r["search_tags"])}
            shared = len(affinity & tags)

            score = 0
            score += 5 * shared  # sharing a college/sport/school is the strongest signal
            if cat in complementary_cats:
                score += 3  # complements what they have
            if cat not in seed_categories:
                score += 1  # add some variety
            if score == 0:
                score = 1  # still a valid in-stock fallback (general Yale gear)
            scored.append((score, pid))

        scored.sort(key=lambda pair: (-pair[0], by_id[pair[1]]["name"]))
        return [pid for _, pid in scored[:limit]]
    finally:
        conn.close()


def catalogue_overview() -> dict[str, Any]:
    """High-level summary of what the shop sells: how many products, which
    categories (with counts), and the overall price range.

    Use this to answer broad questions like "what do you sell?", "what kinds of
    merch do you have?", or "what's your price range?". For a specific product's
    details or stock, use the product tools (added in Problem 6).
    """
    conn = get_connection()
    if conn is None:
        return {"available": False, "message": "The catalogue is not available right now."}
    try:
        rows = conn.execute(
            "SELECT garment_type, price FROM catalogue"
        ).fetchall()
        if not rows:
            return {"available": True, "product_count": 0, "categories": {}, "price_range": None}

        counts: dict[str, int] = {}
        for r in rows:
            cat = normalize_category(r["garment_type"])
            counts[cat] = counts.get(cat, 0) + 1
        # Order the categories the way we present them.
        ordered = {c: counts[c] for c in CATEGORIES if c in counts}
        for c, n in counts.items():
            if c not in ordered:
                ordered[c] = n

        prices = [float(r["price"]) for r in rows]
        return {
            "available": True,
            "product_count": len(rows),
            "categories": ordered,
            "price_range": {"min": min(prices), "max": max(prices)},
        }
    finally:
        conn.close()


# --- Shared helpers ----------------------------------------------------------
def _parse_json_list(raw: Any) -> list[str]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
        return [str(v) for v in value] if isinstance(value, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


# Match-time synonyms so a shopper's spelling finds the catalogue's spelling
# (the data uses American "gray"; shoppers often type "grey", "tshirt", etc.).
_SYNONYMS = {
    "grey": "gray",
    "tshirt": "t-shirt",
    "tee": "t-shirt",
    "tees": "t-shirt",
    "hoody": "hoodie",
    "sweater": "sweatshirt",
}


def _canon(text: str) -> str:
    """Lowercase and apply spelling synonyms for more forgiving matching."""
    text = (text or "").lower()
    for src, dst in _SYNONYMS.items():
        text = text.replace(src, dst)
    return text


def _short_description(description: str, limit: int = 120) -> str:
    description = (description or "").strip()
    if len(description) <= limit:
        return description
    return description[:limit].rsplit(" ", 1)[0].rstrip(",.;:") + "…"


def _sizes_for(conn: sqlite3.Connection, product_id: str) -> list[SizeAvailability]:
    """Read live per-size stock for a product, in a natural size order."""
    inv = conn.execute(
        "SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)
    ).fetchall()
    by_size = {r["size"]: int(r["quantity"]) for r in inv}
    ordered = [s for s in SIZE_ORDER if s in by_size]
    ordered += [s for s in by_size if s not in SIZE_ORDER]
    return [
        SizeAvailability(size=s, quantity=by_size[s], in_stock=by_size[s] > 0)
        for s in ordered
    ]


def _resolve_row(conn: sqlite3.Connection, product_id: str | None, name: str | None):
    """Find a catalogue row by exact id, else by best name match."""
    if product_id:
        row = conn.execute(
            "SELECT * FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
        if row is not None:
            return row
    if name:
        q = name.strip().lower()
        # Exact name first, then a contains match.
        row = conn.execute(
            "SELECT * FROM catalogue WHERE lower(name) = ?", (q,)
        ).fetchone()
        if row is not None:
            return row
        row = conn.execute(
            "SELECT * FROM catalogue WHERE lower(name) LIKE ? ORDER BY length(name) LIMIT 1",
            (f"%{q}%",),
        ).fetchone()
        return row
    return None


# --- Agent lookup tools ------------------------------------------------------
def search_products(
    query: str | None = None,
    category: str | None = None,
    max_price: float | None = None,
    in_stock_only: bool = False,
    size: str | None = None,
    limit: int = 30,
) -> list[ProductSearchResult]:
    """Search the catalogue for products matching a shopper's request.

    Matches `query` words against the product name, description, colors, and search
    tags, and can filter by `category`, `max_price`, availability, and `size`
    (only products that have that specific size in stock). Returns the best matches
    (most relevant first). Reads the database live.
    """
    conn = get_connection()
    if conn is None:
        return []
    try:
        rows = conn.execute(
            "SELECT c.product_id, c.name, c.garment_type, c.description, c.colors, "
            "c.search_tags, c.price, COALESCE(SUM(i.quantity), 0) AS total_qty "
            "FROM catalogue c LEFT JOIN inventory i ON i.product_id = c.product_id "
            "GROUP BY c.product_id"
        ).fetchall()

        wanted_cat = category.strip().lower() if category else None
        terms = [t for t in _canon(query or "").split() if t]

        # If a specific size is requested, precompute which products have that size
        # in stock (a single query), so we can filter precisely and live.
        size_in_stock: set[str] | None = None
        if size:
            wanted_size = size.strip().upper()
            size_rows = conn.execute(
                "SELECT product_id FROM inventory "
                "WHERE upper(size) = ? AND quantity > 0",
                (wanted_size,),
            ).fetchall()
            size_in_stock = {r["product_id"] for r in size_rows}

        scored: list[tuple[int, sqlite3.Row]] = []
        for r in rows:
            cat = normalize_category(r["garment_type"])
            if wanted_cat and cat.lower() != wanted_cat:
                continue
            if max_price is not None and float(r["price"]) > max_price:
                continue
            if in_stock_only and r["total_qty"] <= 0:
                continue
            if size_in_stock is not None and r["product_id"] not in size_in_stock:
                continue

            if not terms:
                score = 1  # no query -> everything that passed the filters qualifies
            else:
                name = _canon(r["name"] or "")
                desc = _canon(r["description"] or "")
                colors = _canon(" ".join(_parse_json_list(r["colors"])))
                tags = _canon(" ".join(_parse_json_list(r["search_tags"])))
                score = 0
                for t in terms:
                    if t in name:
                        score += 5  # name matches are the strongest signal
                    if t in tags:
                        score += 3
                    if t in colors:
                        score += 2
                    if t in desc:
                        score += 1
                if score == 0:
                    continue
            scored.append((score, r))

        # Highest score first; stable by name for ties.
        scored.sort(key=lambda pair: (-pair[0], pair[1]["name"]))
        results = []
        for _, r in scored[:limit]:
            results.append(
                ProductSearchResult(
                    product_id=r["product_id"],
                    name=r["name"],
                    category=normalize_category(r["garment_type"]),
                    price=float(r["price"]),
                    colors=_parse_json_list(r["colors"]),
                    short_description=_short_description(r["description"]),
                    any_in_stock=r["total_qty"] > 0,
                )
            )
        return results
    finally:
        conn.close()


def get_product_details(
    product_id: str | None = None, name: str | None = None
) -> ProductDetails | None:
    """Look up full details for one product: description, price, colors, category,
    and live per-size stock. Identify the product by `product_id` (preferred) or
    by `name`. Returns None if no product matches.
    """
    conn = get_connection()
    if conn is None:
        return None
    try:
        row = _resolve_row(conn, product_id, name)
        if row is None:
            return None
        sizes = _sizes_for(conn, row["product_id"])
        return ProductDetails(
            product_id=row["product_id"],
            name=row["name"],
            category=normalize_category(row["garment_type"]),
            garment_type=row["garment_type"],
            price=float(row["price"]),
            description=(row["description"] or "").strip(),
            colors=_parse_json_list(row["colors"]),
            sizes=sizes,
            any_in_stock=any(s.in_stock for s in sizes),
        )
    finally:
        conn.close()


def check_stock(
    product_id: str | None = None,
    name: str | None = None,
    size: str | None = None,
) -> StockInfo | None:
    """Check live stock for a product, optionally for one specific size.

    Identify the product by `product_id` (preferred) or `name`. If `size` is given
    (e.g. "L"), only that size is returned. Reads the database live, so it reflects
    current stock. Returns None if no product matches.
    """
    conn = get_connection()
    if conn is None:
        return None
    try:
        row = _resolve_row(conn, product_id, name)
        if row is None:
            return None
        sizes = _sizes_for(conn, row["product_id"])
        if size:
            wanted = size.strip().upper()
            sizes = [s for s in sizes if s.size.upper() == wanted]
        return StockInfo(
            product_id=row["product_id"],
            name=row["name"],
            sizes=sizes,
            any_in_stock=any(s.in_stock for s in sizes),
        )
    finally:
        conn.close()
