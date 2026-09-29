"""Campus Customs — FastAPI backend (Problem 3 starting point).

Serves the product catalogue, per-product inventory, and product images by
reading the local SQLite database (data/campus_customs.db). Everything is
data-driven: nothing about individual products is hard-coded, so the site
reflects whatever database is loaded next to it.

The database and product images are intentionally NOT committed to git, so this
app is written defensively: if the database or an image is missing, the API
degrades gracefully (empty catalogue / 404 image) instead of crashing. This lets
the front end run in a clean checkout.

This is the simple starting point requested in Problem 3. It grows into the
Pydantic-AI-powered backend in Problem 5.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

import agent as agent_module
from models import ChatRequest, ChatTurn
import tools
from tools import CATEGORIES, normalize_category  # noqa: F401  (CATEGORIES re-used elsewhere)

# --- Paths -------------------------------------------------------------------
# The backend lives in <project>/backend/. The data lives in <project>/data/.
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = Path(os.environ.get("CAMPUS_CUSTOMS_DATA_DIR", PROJECT_ROOT / "data"))
DB_PATH = Path(os.environ.get("CAMPUS_CUSTOMS_DB", DATA_DIR / "campus_customs.db"))

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]

app = FastAPI(title="Campus Customs API", version="0.1.0")

# Allow the Vite dev server (and common local ports) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ------------------------------------------------------------------
class SizeStock(BaseModel):
    size: str
    quantity: int
    in_stock: bool


class ProductSummary(BaseModel):
    product_id: str
    name: str
    garment_type: str  # the raw, specific type from the database
    category: str  # a normalized, standardized category for clean filtering
    price: float
    short_description: str
    colors: list[str]
    primary_color: str  # the garment's main color, consolidated (for filtering)
    image_url: str
    any_in_stock: bool


class ProductDetail(ProductSummary):
    description: str
    search_tags: list[str]
    sizes: list[SizeStock]


class RegisterIn(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class AuthUser(BaseModel):
    id: int
    first_name: str | None
    last_name: str | None
    email: str


class AuthResponse(BaseModel):
    token: str
    user: AuthUser


class ChatResponse(BaseModel):
    """The HTTP response the chat widget receives: the agent's reply plus any
    products to display. The agent-facing types live in models.py."""

    reply: str
    products: list[ProductSummary] = []


# --- Orders / feedback / recommendations (Problem 9) -------------------------
class OrderItemIn(BaseModel):
    product_id: str
    name: str
    size: str
    quantity: int
    price: float


class OrderCreate(BaseModel):
    items: list[OrderItemIn]
    # The (demo) card number entered at checkout. It is NEVER stored in the clear:
    # the backend keeps only the last 4 digits (for display) and a salted hash.
    card_number: str | None = None
    coupon_code: str | None = None


class OrderItemOut(BaseModel):
    id: int
    product_id: str
    name: str
    size: str
    quantity: int
    price: float
    status: str
    fit_feedback: str | None = None
    rating: int | None = None
    image_url: str | None = None


class OrderOut(BaseModel):
    id: int
    created_at: str
    total: float
    status: str
    card_last4: str | None = None
    discount_percent: int = 0
    coupon_code: str | None = None
    items: list[OrderItemOut] = []


class FeedbackIn(BaseModel):
    fit_feedback: str | None = None  # "too_small" | "just_right" | "too_big"
    rating: int | None = None  # 1-5


class ReturnRequest(BaseModel):
    reason: str | None = None  # why they're returning it
    certified: bool = False  # confirmed item is clean and still has tags


class RecommendRequest(BaseModel):
    product_ids: list[str] = []  # seed products (cart contents or purchase history)
    sizes: list[str] = []  # sizes the shopper likes
    limit: int = 4


class CouponOut(BaseModel):
    code: str
    discount_percent: int
    status: str


class CouponValidateRequest(BaseModel):
    code: str


class TriviaOption(BaseModel):
    id: int
    difficulty: str
    question: str
    options: list[str]


class TriviaSubmit(BaseModel):
    answers: dict[int, int]  # question id -> chosen option index


class TriviaResult(BaseModel):
    passed: bool
    correct_count: int
    total: int
    coupon: CouponOut | None = None


# --- Database helpers --------------------------------------------------------
def get_connection() -> sqlite3.Connection | None:
    """Open the SQLite database read-only. Returns None if it is not present."""
    if not DB_PATH.exists():
        return None
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def get_write_connection() -> sqlite3.Connection | None:
    """Open the database read-write (for creating accounts). None if missing."""
    if not DB_PATH.exists():
        return None
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


# --- Authentication: password hashing & signed session tokens ----------------
# Passwords are never stored or compared in plaintext. We use PBKDF2-HMAC-SHA256
# with a per-user random salt and a high iteration count (expensive to brute-force),
# and constant-time comparison. Sessions use short signed tokens that contain only a
# user id + expiry — never the password.
PBKDF2_ALGORITHM = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 200_000
SALT_BYTES = 16
DEFAULT_TTL_SECONDS = 7 * 24 * 3600  # one week
# Signing secret: gitignored file next to this module, so tokens survive restarts
# but the secret is never committed.
_SECRET_FILE = Path(__file__).resolve().parent / ".auth_secret"


def hash_password(password: str) -> str:
    """Hash a plaintext password for storage. Never store the plaintext.

    Format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex> — self-describing, so
    verification never has to guess the parameters.
    """
    salt = secrets.token_bytes(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"{PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Constant-time verify of a plaintext password against a stored hash.

    Supports the 4-part format used for accounts created here, and tolerates the
    legacy 3-part seed format for completeness.
    """
    try:
        parts = stored.split("$")
        if len(parts) == 4:
            algo, iters, salt_hex, hash_hex = parts
            if algo != PBKDF2_ALGORITHM:
                return False
            iterations = int(iters)
            salt = bytes.fromhex(salt_hex)
            expected = bytes.fromhex(hash_hex)
        elif len(parts) == 3:
            algo, salt_raw, hash_hex = parts
            if algo != PBKDF2_ALGORITHM:
                return False
            iterations = PBKDF2_ITERATIONS
            salt = salt_raw.encode("utf-8")
            expected = bytes.fromhex(hash_hex)
        else:
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(candidate, expected)
    except (ValueError, TypeError):
        return False


# A throwaway hash used to keep login timing similar whether or not the email
# exists, so responses don't leak which emails are registered.
_DUMMY_HASH = hash_password("this-is-not-a-real-password")


def dummy_verify(password: str) -> None:
    """Run a verify against a dummy hash to equalize timing. Result ignored."""
    verify_password(password, _DUMMY_HASH)


def _auth_secret() -> bytes:
    """Load the token signing secret (AUTH_SECRET env var, else a persisted file)."""
    env = os.environ.get("AUTH_SECRET")
    if env:
        return env.encode("utf-8")
    if _SECRET_FILE.exists():
        return _SECRET_FILE.read_bytes()
    generated = secrets.token_bytes(32)
    _SECRET_FILE.write_bytes(generated)
    return generated


def create_token(user_id: int, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> str:
    expiry = int(time.time()) + ttl_seconds
    payload = f"{user_id}:{expiry}".encode("utf-8")
    signature = hmac.new(_auth_secret(), payload, hashlib.sha256).hexdigest()
    body = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
    return f"{body}.{signature}"


def verify_token(token: str) -> int | None:
    """Return the user id if the token is valid and unexpired, else None."""
    try:
        body, signature = token.split(".", 1)
        padding = "=" * (-len(body) % 4)
        payload = base64.urlsafe_b64decode(body + padding)
        expected = hmac.new(_auth_secret(), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        user_id_str, expiry_str = payload.decode("utf-8").split(":")
        if int(expiry_str) < int(time.time()):
            return None
        return int(user_id_str)
    except (ValueError, TypeError):
        return None


def user_id_from_authorization(authorization: str | None) -> int | None:
    """Parse an `Authorization: Bearer <token>` header into a user id."""
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return verify_token(token.strip())


def _add_column_if_missing(
    conn: sqlite3.Connection, table: str, column: str, decl: str
) -> None:
    cols = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


def ensure_schema() -> None:
    """Create/upgrade the tables added in Problem 9 (orders, coupons, extra columns).

    Runs against the same database; safe to call on every startup. If the database
    isn't present, this is a no-op so the app still starts.
    """
    conn = get_write_connection()
    if conn is None:
        return
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                total REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'placed',
                card_last4 TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                name TEXT NOT NULL,
                size TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'ordered',
                fit_feedback TEXT,
                rating INTEGER,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            );
            CREATE TABLE IF NOT EXISTS coupons (
                code TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                discount_percent INTEGER NOT NULL,
                source TEXT NOT NULL DEFAULT 'trivia',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                redeemed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """
        )
        # Columns added after the tables first shipped.
        _add_column_if_missing(conn, "orders", "discount_percent", "INTEGER NOT NULL DEFAULT 0")
        _add_column_if_missing(conn, "orders", "coupon_code", "TEXT")
        _add_column_if_missing(conn, "orders", "card_hash", "TEXT")
        _add_column_if_missing(conn, "order_items", "return_reason", "TEXT")
        _add_column_if_missing(conn, "order_items", "return_certified", "INTEGER")
        conn.commit()
    finally:
        conn.close()


ensure_schema()


def _parse_json_list(raw: Any) -> list[str]:
    """catalogue.colors / search_tags are stored as JSON strings."""
    if not raw:
        return []
    try:
        value = json.loads(raw)
        return [str(v) for v in value] if isinstance(value, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _short_description(description: str, limit: int = 120) -> str:
    description = (description or "").strip()
    if len(description) <= limit:
        return description
    return description[:limit].rsplit(" ", 1)[0].rstrip(",.;:") + "…"


def _image_url(image_file_path: str) -> str:
    path = (image_file_path or "").lstrip("/")
    return f"/api/images/{path}"


def _row_to_summary(row: sqlite3.Row, any_in_stock: bool) -> ProductSummary:
    return ProductSummary(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        category=normalize_category(row["garment_type"]),
        price=float(row["price"]),
        short_description=_short_description(row["description"]),
        colors=_parse_json_list(row["colors"]),
        primary_color=tools.primary_color(_parse_json_list(row["colors"])),
        image_url=_image_url(row["image_file_path"]),
        any_in_stock=any_in_stock,
    )


# --- Routes ------------------------------------------------------------------
@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "database_present": DB_PATH.exists()}


@app.get("/api/products", response_model=list[ProductSummary])
def list_products() -> list[ProductSummary]:
    conn = get_connection()
    if conn is None:
        return []
    try:
        rows = conn.execute(
            "SELECT c.product_id, c.name, c.garment_type, c.description, "
            "c.colors, c.image_file_path, c.price, "
            "COALESCE(SUM(i.quantity), 0) AS total_qty "
            "FROM catalogue c "
            "LEFT JOIN inventory i ON i.product_id = c.product_id "
            "GROUP BY c.product_id ORDER BY c.name"
        ).fetchall()
        return [_row_to_summary(r, any_in_stock=r["total_qty"] > 0) for r in rows]
    finally:
        conn.close()


@app.get("/api/products/{product_id}", response_model=ProductDetail)
def get_product(product_id: str) -> ProductDetail:
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Catalogue database not available")
    try:
        row = conn.execute(
            "SELECT * FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Product not found")

        inv = conn.execute(
            "SELECT size, quantity FROM inventory WHERE product_id = ?",
            (product_id,),
        ).fetchall()
        by_size = {r["size"]: int(r["quantity"]) for r in inv}
        # Present sizes in a natural order, keeping any unexpected sizes at the end.
        ordered = [s for s in SIZE_ORDER if s in by_size]
        ordered += [s for s in by_size if s not in SIZE_ORDER]
        sizes = [
            SizeStock(size=s, quantity=by_size[s], in_stock=by_size[s] > 0)
            for s in ordered
        ]

        any_in_stock = any(s.in_stock for s in sizes)
        summary = _row_to_summary(row, any_in_stock=any_in_stock)
        return ProductDetail(
            **summary.model_dump(),
            description=(row["description"] or "").strip(),
            search_tags=_parse_json_list(row["search_tags"]),
            sizes=sizes,
        )
    finally:
        conn.close()


# --- Authentication routes ---------------------------------------------------
def _row_to_auth_user(row: sqlite3.Row) -> AuthUser:
    return AuthUser(
        id=row["id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        email=row["email"],
    )


@app.post("/api/auth/register", response_model=AuthResponse)
def register(payload: RegisterIn) -> AuthResponse:
    first = payload.first_name.strip()
    last = payload.last_name.strip()
    email = payload.email.strip().lower()

    if not first or not last:
        raise HTTPException(status_code=400, detail="First and last name are required.")
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if len(payload.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
        )

    conn = get_write_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="User database not available.")
    try:
        existing = conn.execute(
            "SELECT id FROM users WHERE lower(email) = ?", (email,)
        ).fetchone()
        if existing is not None:
            raise HTTPException(
                status_code=409, detail="An account with that email already exists."
            )

        # Hash the password before it ever touches the database.
        password_hash = hash_password(payload.password)
        full_name = f"{first} {last}"
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash, first_name, last_name) "
            "VALUES (?, ?, ?, ?, ?)",
            (full_name, email, password_hash, first, last),
        )
        conn.commit()
        user_id = int(cursor.lastrowid)
        user = AuthUser(id=user_id, first_name=first, last_name=last, email=email)
        return AuthResponse(token=create_token(user_id), user=user)
    finally:
        conn.close()


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginIn) -> AuthResponse:
    email = payload.email.strip().lower()
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="User database not available.")
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE lower(email) = ?", (email,)
        ).fetchone()
        if row is None:
            # Verify against a dummy hash so timing doesn't reveal whether the
            # email exists, then return the same generic error.
            dummy_verify(payload.password)
            raise HTTPException(status_code=401, detail="Incorrect email or password.")
        if not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Incorrect email or password.")
        return AuthResponse(
            token=create_token(int(row["id"])), user=_row_to_auth_user(row)
        )
    finally:
        conn.close()


@app.get("/api/auth/me", response_model=AuthUser)
def me(authorization: str | None = Header(default=None)) -> AuthUser:
    user_id = user_id_from_authorization(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="User database not available.")
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=401, detail="Not authenticated.")
        return _row_to_auth_user(row)
    finally:
        conn.close()


@app.get("/api/images/{image_path:path}")
def get_image(image_path: str):
    """Serve a product image from the data directory.

    Guards against path traversal by resolving the final path and confirming it
    stays inside DATA_DIR.
    """
    candidate = (DATA_DIR / image_path).resolve()
    try:
        candidate.relative_to(DATA_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid image path")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(candidate)


def _resolve_products(product_ids: list[str]) -> list[ProductSummary]:
    """Turn product IDs the agent surfaced into full product cards for the widget.

    Preserves the agent's ordering and silently drops any unknown IDs so a bad ID
    can never break a chat reply.
    """
    if not product_ids:
        return []
    conn = get_connection()
    if conn is None:
        return []
    try:
        placeholders = ",".join("?" for _ in product_ids)
        rows = conn.execute(
            f"SELECT c.product_id, c.name, c.garment_type, c.description, "
            f"c.colors, c.image_file_path, c.price, "
            f"COALESCE(SUM(i.quantity), 0) AS total_qty "
            f"FROM catalogue c LEFT JOIN inventory i ON i.product_id = c.product_id "
            f"WHERE c.product_id IN ({placeholders}) GROUP BY c.product_id",
            product_ids,
        ).fetchall()
        by_id = {r["product_id"]: r for r in rows}
        return [
            _row_to_summary(by_id[pid], any_in_stock=by_id[pid]["total_qty"] > 0)
            for pid in product_ids
            if pid in by_id
        ]
    finally:
        conn.close()


# --- Chat memory (only for signed-in users) ----------------------------------
HISTORY_TURN_LIMIT = 20  # how many recent turns to give the agent as memory


class HistoryTurn(BaseModel):
    role: str
    content: str
    products: list[ProductSummary] = []


def _load_history_turns(user_id: int, limit: int = HISTORY_TURN_LIMIT) -> list[ChatTurn]:
    """Load a signed-in user's recent chat turns (chronological) for agent memory."""
    conn = get_connection()
    if conn is None:
        return []
    try:
        rows = conn.execute(
            "SELECT role, content FROM chat_messages WHERE user_id = ? "
            "ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
        return [ChatTurn(role=r["role"], content=r["content"]) for r in reversed(rows)]
    finally:
        conn.close()


def _get_first_name(user_id: int) -> str | None:
    conn = get_connection()
    if conn is None:
        return None
    try:
        row = conn.execute(
            "SELECT first_name FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        return row["first_name"] if row else None
    finally:
        conn.close()


def _save_message(
    user_id: int, role: str, content: str, product_ids: list[str] | None = None
) -> None:
    """Save one chat message to the signed-in user's account."""
    conn = get_write_connection()
    if conn is None:
        return
    try:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) "
            "VALUES (?, ?, ?, ?)",
            (user_id, role, content, json.dumps(product_ids or [])),
        )
        conn.commit()
    finally:
        conn.close()


@app.post("/api/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest, authorization: str | None = Header(default=None)
) -> ChatResponse:
    """Chat endpoint powered by the Pydantic AI agent.

    Messages from the website's chat widget are handed to the agent (which runs on
    our API key via Portkey), and its reply is returned. Any products the agent
    surfaces are resolved to full product cards for the page.

    Memory: if the request carries a valid login token, the user's past chat is
    loaded so the agent remembers them, and this exchange is saved to their account.
    Guests get a normal reply, but nothing is stored.
    """
    user_id = user_id_from_authorization(authorization)

    history: list[ChatTurn] = []
    first_name: str | None = None
    if user_id is not None:
        history = _load_history_turns(user_id)
        first_name = _get_first_name(user_id)

    result = await agent_module.run_chat(
        payload, history=history, user_first_name=first_name, user_id=user_id
    )
    products = _resolve_products(result.product_ids)

    # Only persist chat for a signed-in user, and only to their own account.
    if user_id is not None:
        _save_message(user_id, "user", payload.message)
        _save_message(user_id, "assistant", result.reply, result.product_ids)

    return ChatResponse(reply=result.reply, products=products)


@app.get("/api/chat/history", response_model=list[HistoryTurn])
def chat_history(authorization: str | None = Header(default=None)) -> list[HistoryTurn]:
    """Return the signed-in user's saved chat history so the widget can restore the
    conversation when they return. Guests get an empty list."""
    user_id = user_id_from_authorization(authorization)
    if user_id is None:
        return []
    conn = get_connection()
    if conn is None:
        return []
    try:
        rows = conn.execute(
            "SELECT role, content, products_json FROM chat_messages "
            "WHERE user_id = ? ORDER BY id ASC",
            (user_id,),
        ).fetchall()
    finally:
        conn.close()

    turns: list[HistoryTurn] = []
    for r in rows:
        product_ids: list[str] = []
        raw = r["products_json"]
        if raw:
            try:
                parsed = json.loads(raw)
                # Stored as a list of product_ids (new) — ignore legacy object rows.
                if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
                    product_ids = parsed
            except (json.JSONDecodeError, TypeError):
                product_ids = []
        turns.append(
            HistoryTurn(
                role=r["role"],
                content=r["content"],
                products=_resolve_products(product_ids),
            )
        )
    return turns


# --- Orders, returns, feedback, recommendations (Problem 9) -------------------
def _image_url_for(conn: sqlite3.Connection, product_id: str) -> str | None:
    row = conn.execute(
        "SELECT image_file_path FROM catalogue WHERE product_id = ?", (product_id,)
    ).fetchone()
    return _image_url(row["image_file_path"]) if row else None


def _card_last4_and_hash(card_number: str | None) -> tuple[str | None, str | None]:
    """From a (demo) card number, return (last4, salted_hash). The full number is
    never stored — only the last 4 digits (for display) and a one-way hash, the
    same PBKDF2 scheme we use for passwords."""
    if not card_number:
        return None, None
    digits = "".join(ch for ch in card_number if ch.isdigit())
    if not digits:
        return None, None
    last4 = digits[-4:]
    return last4, hash_password(digits)


@app.post("/api/orders", response_model=OrderOut)
def create_order(
    payload: OrderCreate, authorization: str | None = Header(default=None)
) -> OrderOut:
    """Record an order for a signed-in shopper (demo checkout — no real payment).

    The card number is never stored in the clear: only its last 4 digits and a
    salted hash are kept. An optional coupon is validated and applied, then marked
    redeemed.
    """
    user_id = user_id_from_authorization(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Please log in to place an order.")
    if not payload.items:
        raise HTTPException(status_code=400, detail="Your cart is empty.")

    conn = get_write_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Database not available.")
    try:
        subtotal = sum(i.price * i.quantity for i in payload.items)

        # Validate + apply a coupon, if one was supplied.
        discount_percent = 0
        coupon_code: str | None = None
        if payload.coupon_code:
            coupon = conn.execute(
                "SELECT * FROM coupons WHERE code = ? AND user_id = ? AND status = 'active'",
                (payload.coupon_code.strip().upper(), user_id),
            ).fetchone()
            if coupon is None:
                raise HTTPException(status_code=400, detail="That coupon isn't valid.")
            discount_percent = int(coupon["discount_percent"])
            coupon_code = coupon["code"]

        total = round(subtotal * (1 - discount_percent / 100), 2)
        last4, card_hash = _card_last4_and_hash(payload.card_number)

        cursor = conn.execute(
            "INSERT INTO orders "
            "(user_id, total, card_last4, card_hash, discount_percent, coupon_code) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, total, last4, card_hash, discount_percent, coupon_code),
        )
        order_id = int(cursor.lastrowid)
        for i in payload.items:
            conn.execute(
                "INSERT INTO order_items "
                "(order_id, product_id, name, size, quantity, price) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (order_id, i.product_id, i.name, i.size, i.quantity, i.price),
            )
        # A game coupon is single-use: mark it redeemed once applied.
        if coupon_code:
            conn.execute(
                "UPDATE coupons SET status = 'redeemed', redeemed_at = datetime('now') "
                "WHERE code = ?",
                (coupon_code,),
            )
        conn.commit()
    finally:
        conn.close()
    return _get_order(user_id, order_id)


def _get_order(user_id: int, order_id: int) -> OrderOut:
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Database not available.")
    try:
        o = conn.execute(
            "SELECT * FROM orders WHERE id = ? AND user_id = ?", (order_id, user_id)
        ).fetchone()
        if o is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        items = conn.execute(
            "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", (order_id,)
        ).fetchall()
        return OrderOut(
            id=o["id"],
            created_at=o["created_at"],
            total=o["total"],
            status=o["status"],
            card_last4=o["card_last4"],
            discount_percent=o["discount_percent"] if "discount_percent" in o.keys() else 0,
            coupon_code=o["coupon_code"] if "coupon_code" in o.keys() else None,
            items=[
                OrderItemOut(
                    id=it["id"],
                    product_id=it["product_id"],
                    name=it["name"],
                    size=it["size"],
                    quantity=it["quantity"],
                    price=it["price"],
                    status=it["status"],
                    fit_feedback=it["fit_feedback"],
                    rating=it["rating"],
                    image_url=_image_url_for(conn, it["product_id"]),
                )
                for it in items
            ],
        )
    finally:
        conn.close()


@app.get("/api/orders", response_model=list[OrderOut])
def list_orders(authorization: str | None = Header(default=None)) -> list[OrderOut]:
    """Return the signed-in shopper's order history (most recent first)."""
    user_id = user_id_from_authorization(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Please log in.")
    conn = get_connection()
    if conn is None:
        return []
    try:
        ids = conn.execute(
            "SELECT id FROM orders WHERE user_id = ? ORDER BY id DESC", (user_id,)
        ).fetchall()
    finally:
        conn.close()
    return [_get_order(user_id, r["id"]) for r in ids]


def _owns_item(conn: sqlite3.Connection, user_id: int, item_id: int):
    """Return the order_item row if it belongs to this user, else None."""
    return conn.execute(
        "SELECT oi.* FROM order_items oi JOIN orders o ON o.id = oi.order_id "
        "WHERE oi.id = ? AND o.user_id = ?",
        (item_id, user_id),
    ).fetchone()


@app.post("/api/orders/items/{item_id}/return")
def request_return(
    item_id: int,
    payload: ReturnRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    """Start a return for one ordered item.

    Records the reason and the shopper's certification that the item is clean and
    still has its tags. Requires that certification.
    """
    user_id = user_id_from_authorization(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Please log in.")
    if not payload.certified:
        raise HTTPException(
            status_code=400,
            detail="Please certify the item is clean and still has its tags.",
        )
    conn = get_write_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Database not available.")
    try:
        if _owns_item(conn, user_id, item_id) is None:
            raise HTTPException(status_code=404, detail="Item not found.")
        conn.execute(
            "UPDATE order_items SET status = 'return_requested', "
            "return_reason = ?, return_certified = 1 WHERE id = ?",
            (payload.reason, item_id),
        )
        conn.commit()
    finally:
        conn.close()
    return {
        "status": "return_requested",
        "item_id": item_id,
        "message": (
            "Your return request has been recorded. You'll receive an email with "
            "follow-up instructions to complete the return. (This is a class "
            "project, so no email is actually sent.)"
        ),
    }


@app.post("/api/orders/items/{item_id}/feedback")
def leave_feedback(
    item_id: int,
    payload: FeedbackIn,
    authorization: str | None = Header(default=None),
) -> dict:
    """Save fit feedback and/or a rating for an ordered item."""
    user_id = user_id_from_authorization(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Please log in.")
    if payload.rating is not None and not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1-5.")
    conn = get_write_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Database not available.")
    try:
        if _owns_item(conn, user_id, item_id) is None:
            raise HTTPException(status_code=404, detail="Item not found.")
        conn.execute(
            "UPDATE order_items SET fit_feedback = COALESCE(?, fit_feedback), "
            "rating = COALESCE(?, rating) WHERE id = ?",
            (payload.fit_feedback, payload.rating, item_id),
        )
        conn.commit()
    finally:
        conn.close()
    return {"status": "saved", "item_id": item_id}


@app.post("/api/recommendations", response_model=list[ProductSummary])
def recommendations(payload: RecommendRequest) -> list[ProductSummary]:
    """Recommend complementary, affinity-matched, in-stock products for a set of
    seed products (the cart, or a shopper's purchase history)."""
    ids = tools.recommend_products(
        payload.product_ids, preferred_sizes=payload.sizes, limit=payload.limit
    )
    return _resolve_products(ids)


# --- Coupons & Yale trivia game (Problem 9 additions) ------------------------
import secrets as _secrets

# Trivia questions, ordered easy -> hard. Answers stay server-side.
TRIVIA_QUESTIONS = [
    {
        "id": 1,
        "difficulty": "medium",
        "question": "What is Yale's Latin motto?",
        "options": [
            "Lux et Veritas",
            "Veritas",
            "In Deo Speramus",
            "Sapientia et Doctrina",
        ],
        "answer_index": 0,
    },
    {
        "id": 2,
        "difficulty": "hard",
        "question": "What was Yale originally named when it was founded in 1701?",
        "options": [
            "New Haven College",
            "The Collegiate School",
            "Saybrook College",
            "Elihu Academy",
        ],
        "answer_index": 1,
    },
    {
        "id": 3,
        "difficulty": "expert",
        "question": "What is the name of Yale's oldest a cappella group, founded in 1909?",
        "options": [
            "The Spizzwinks",
            "Whim 'n Rhythm",
            "The Whiffenpoofs",
            "The Alley Cats",
        ],
        "answer_index": 2,
    },
]

TRIVIA_DISCOUNT_PERCENT = 10
_COUPON_PREFIXES = ["BOOLA", "BULLDOG", "HANDSOMEDAN", "YALEBLUE", "OLDELI", "GOBULLDOGS"]


def _generate_coupon_code(conn: sqlite3.Connection) -> str:
    """A Yale-themed prefix plus a unique alphanumeric suffix, e.g. BOOLA-7K2Q9M."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no ambiguous chars
    for _ in range(20):
        prefix = _secrets.choice(_COUPON_PREFIXES)
        suffix = "".join(_secrets.choice(alphabet) for _ in range(6))
        code = f"{prefix}-{suffix}"
        exists = conn.execute(
            "SELECT 1 FROM coupons WHERE code = ?", (code,)
        ).fetchone()
        if exists is None:
            return code
    # Extremely unlikely fallback.
    return f"YALE-{_secrets.token_hex(4).upper()}"


@app.get("/api/trivia/questions", response_model=list[TriviaOption])
def trivia_questions() -> list[TriviaOption]:
    """The Yale trivia questions (without the answers)."""
    return [
        TriviaOption(
            id=q["id"],
            difficulty=q["difficulty"],
            question=q["question"],
            options=q["options"],
        )
        for q in TRIVIA_QUESTIONS
    ]


@app.post("/api/trivia/submit", response_model=TriviaResult)
def trivia_submit(
    payload: TriviaSubmit, authorization: str | None = Header(default=None)
) -> TriviaResult:
    """Grade the trivia. All correct -> a single-use 10% coupon. Must be logged in.

    A shopper can only hold one active game coupon at a time: if they already have
    one, it's returned rather than issuing another.
    """
    user_id = user_id_from_authorization(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Please log in to play.")

    correct = sum(
        1
        for q in TRIVIA_QUESTIONS
        if payload.answers.get(q["id"]) == q["answer_index"]
    )
    total = len(TRIVIA_QUESTIONS)
    passed = correct == total

    if not passed:
        return TriviaResult(passed=False, correct_count=correct, total=total, coupon=None)

    conn = get_write_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Database not available.")
    try:
        # One active game coupon at a time.
        existing = conn.execute(
            "SELECT * FROM coupons WHERE user_id = ? AND source = 'trivia' "
            "AND status = 'active'",
            (user_id,),
        ).fetchone()
        if existing is not None:
            coupon = CouponOut(
                code=existing["code"],
                discount_percent=existing["discount_percent"],
                status=existing["status"],
            )
            return TriviaResult(passed=True, correct_count=correct, total=total, coupon=coupon)

        code = _generate_coupon_code(conn)
        conn.execute(
            "INSERT INTO coupons (code, user_id, discount_percent, source) "
            "VALUES (?, ?, ?, 'trivia')",
            (code, user_id, TRIVIA_DISCOUNT_PERCENT),
        )
        conn.commit()
        coupon = CouponOut(
            code=code, discount_percent=TRIVIA_DISCOUNT_PERCENT, status="active"
        )
        return TriviaResult(passed=True, correct_count=correct, total=total, coupon=coupon)
    finally:
        conn.close()


@app.get("/api/coupons", response_model=list[CouponOut])
def list_coupons(authorization: str | None = Header(default=None)) -> list[CouponOut]:
    """The signed-in shopper's active coupons."""
    user_id = user_id_from_authorization(authorization)
    if user_id is None:
        return []
    conn = get_connection()
    if conn is None:
        return []
    try:
        rows = conn.execute(
            "SELECT code, discount_percent, status FROM coupons "
            "WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        return [
            CouponOut(code=r["code"], discount_percent=r["discount_percent"], status=r["status"])
            for r in rows
        ]
    finally:
        conn.close()


@app.post("/api/coupons/validate", response_model=CouponOut)
def validate_coupon(
    payload: CouponValidateRequest, authorization: str | None = Header(default=None)
) -> CouponOut:
    """Check a coupon code belongs to this shopper and is still active."""
    user_id = user_id_from_authorization(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Please log in.")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Database not available.")
    try:
        row = conn.execute(
            "SELECT code, discount_percent, status FROM coupons "
            "WHERE code = ? AND user_id = ? AND status = 'active'",
            (payload.code.strip().upper(), user_id),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=400, detail="That coupon isn't valid.")
        return CouponOut(
            code=row["code"], discount_percent=row["discount_percent"], status=row["status"]
        )
    finally:
        conn.close()




