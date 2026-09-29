"""Pydantic models for the Campus Customs chat agent.

These describe the shape of a chat conversation and the structured reply the
agent produces. The HTTP request/response wrappers the front end sees live in
main.py; these are the agent-facing types (and are imported there).
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    """One prior message in the conversation."""

    role: str  # "user" or "assistant"
    content: str


class PageProduct(BaseModel):
    """A product currently visible on the page the shopper is viewing."""

    product_id: str
    name: str
    price: float | None = None


class PageContext(BaseModel):
    """What the shopper is looking at right now, sent with each chat message so the
    agent can answer questions about the current page ("tell me about the third
    one", "is this one in stock?")."""

    path: str = ""  # e.g. "/products" or "/products/basic-hoodie-big-yale"
    title: str | None = None
    products: list[PageProduct] = Field(default_factory=list)  # products shown on the page
    focused_product_id: str | None = None  # set when viewing a single product's detail page


class ChatRequest(BaseModel):
    """A message sent from the website's chat widget to the backend."""

    message: str
    user_id: int | None = None
    # Prior turns are loaded from the database for logged-in users, so the client
    # does not need to send them; kept for completeness.
    history: list[ChatTurn] = Field(default_factory=list)
    # What the shopper is currently viewing.
    page_context: PageContext | None = None
    # An optional screenshot of the current page (a data URL). The agent can look
    # at it with the `look_at_page` tool when a question needs the visual.
    screenshot: str | None = None


class AgentReply(BaseModel):
    """The agent's structured output.

    `reply` is the text shown in the chat bubble. `product_ids` lists any catalogue
    products the agent wants surfaced on the page — the mechanism behind "matching
    items appear on the page," which is wired up fully in a later step. For now the
    agent leaves it empty unless it has real product IDs from a tool.
    """

    reply: str
    product_ids: list[str] = Field(default_factory=list)


# --- Tool result models ------------------------------------------------------
# These describe what the agent's database lookup tools return. They are kept
# deliberately lean: each field is something the agent needs to answer a shopper
# honestly, and nothing more, so results stay easy for the model to reason over.


class SizeAvailability(BaseModel):
    """Live stock for one size of a product."""

    size: str  # XS, S, M, L, XL, XXL
    quantity: int  # exact units on hand, so the agent can say "2 left"
    in_stock: bool  # convenience flag for a quick yes/no


class ProductSearchResult(BaseModel):
    """A compact product record returned by a catalogue search.

    Just enough to describe and compare items in a list without pulling the full
    description or every size — the agent fetches those with `get_product_details`
    when a shopper drills into one product.
    """

    product_id: str  # stable id the agent uses to look up details/stock and to surface the item
    name: str  # display name
    category: str  # normalized category (T-Shirts, Hoodies, ...), for grouping
    price: float  # so price answers come straight from the data
    colors: list[str]  # to answer "do you have it in navy?" without another lookup
    short_description: str  # a one-line summary for scanning
    any_in_stock: bool  # so the agent can prefer/flag available items


class ProductDetails(BaseModel):
    """Everything the agent needs to answer in depth about one product."""

    product_id: str
    name: str
    category: str  # normalized category
    garment_type: str  # the specific type text, for precise descriptions
    price: float  # exact price
    description: str  # full description text for accurate answers
    colors: list[str]  # all available colors
    sizes: list[SizeAvailability]  # live per-size stock
    any_in_stock: bool  # quick overall availability


class StockInfo(BaseModel):
    """A focused availability answer for one product (optionally one size)."""

    product_id: str
    name: str
    sizes: list[SizeAvailability]  # live per-size stock (filtered if a size was asked)
    any_in_stock: bool
