"""The Campus Customs chat agent (Pydantic AI + Portkey).

This builds the agent that powers the website's chat widget. It:
  - loads the system prompt (voice + safety) from prompts/prompt.md,
  - connects to the model through Portkey using PORTKEY_API_KEY from the .env,
  - registers the data tools from tools.py so answers are grounded in real data,
  - exposes `run_chat()`, which main.py calls from the /api/chat route.

The agent is built lazily on first use, so importing this module (and starting the
API) never requires the API key — only actually chatting does.
"""
from __future__ import annotations

import base64
import json
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Keep the Pydantic AI startup banner out of the server logs.
os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic_ai import Agent, BinaryContent, RunContext
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

import tools
from models import (
    AgentReply,
    ChatRequest,
    ChatTurn,
    PageContext,
    ProductDetails,
    ProductSearchResult,
    StockInfo,
)

ROOT = Path(__file__).resolve().parent
PROMPT_PATH = ROOT / "prompts" / "prompt.md"

DEFAULT_MODEL = os.getenv("CAMPUS_CUSTOMS_MODEL", "gpt-5.6-terra")


# --- Append-only audit trail -------------------------------------------------
# Every agent loop (one chat turn) is appended as a single JSON line to
# output/audit_trail.json. The file is never wiped or rewritten — new activity is
# only added at the bottom — so it's a durable, reviewable record of what the agent
# did: when, which tools it called with what results, its reply, and why it stopped.
AUDIT_PATH = Path(
    os.environ.get("CAMPUS_CUSTOMS_AUDIT", ROOT.parent / "output" / "audit_trail.json")
)


def _truncate(value: Any, limit: int = 400) -> str:
    """Stringify a value (tool args/results, replies) and cap its length so the
    audit log stays readable."""
    try:
        text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        text = str(value)
    text = " ".join(text.split())  # collapse whitespace/newlines
    return text if len(text) <= limit else text[:limit] + "…"


def record(entry: dict[str, Any]) -> None:
    """Append one entry to the audit trail (append-only; never overwrites).

    A UTC timestamp is added automatically. Failures are swallowed and logged to the
    console so auditing can never break a chat reply.
    """
    try:
        AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        line = {"time": datetime.now(timezone.utc).isoformat(timespec="seconds"), **entry}
        with open(AUDIT_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(line, ensure_ascii=False) + "\n")
    except Exception as exc:  # noqa: BLE001 - auditing must never break the app
        print(f"[audit] failed to record: {type(exc).__name__}: {exc}")


@dataclass
class ChatDeps:
    """Per-request context handed to the agent and its tools."""

    user_first_name: str | None = None
    page_context: PageContext | None = None
    screenshot: str | None = None  # data URL of the current page, if provided


_agent: Agent[ChatDeps, AgentReply] | None = None


def _load_env() -> None:
    """Load environment variables from the backend .env and the project-root .env.

    The PORTKEY_API_KEY lives in the AI Foundations root .env (two levels up), so
    we load both locations; values already set in the environment win.
    """
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT.parent / ".env")
    load_dotenv(ROOT.parent.parent / ".env")


def _model() -> OpenAIChatModel:
    """Build the model, routed through Portkey with our API key."""
    _load_env()
    try:
        key = os.environ["PORTKEY_API_KEY"]
    except KeyError as exc:
        raise RuntimeError(
            "PORTKEY_API_KEY is not set. Add it to the project .env so the agent "
            "can reach the model."
        ) from exc

    client = AsyncOpenAI(
        api_key=key,
        base_url=os.getenv("PORTKEY_BASE_URL", "https://api.portkey.ai/v1"),
        default_headers={
            "x-portkey-api-key": key,
            "x-portkey-provider": "openai",
        },
    )
    return OpenAIChatModel(DEFAULT_MODEL, provider=OpenAIProvider(openai_client=client))


def _page_context_text(page: PageContext) -> str:
    """Render the current-page context as a short block for the system prompt."""
    lines = [f"The shopper is currently on the page: {page.path or '/'}"]
    if page.title:
        lines.append(f"Page title: {page.title}")
    if page.focused_product_id:
        lines.append(
            f"They are viewing the detail page for product_id "
            f"'{page.focused_product_id}'."
        )
    if page.products:
        shown = ", ".join(
            f"{p.name} (id={p.product_id}"
            + (f", ${p.price:.2f}" if p.price is not None else "")
            + ")"
            for p in page.products[:30]
        )
        lines.append(f"Products currently shown on the page: {shown}")
    lines.append(
        "When the shopper says things like 'this one' or 'the third one', they mean "
        "an item on this page. Use these product_ids with your tools to give exact, "
        "up-to-date answers."
    )
    return "\n".join(lines)


def build_agent() -> Agent[ChatDeps, AgentReply]:
    """Create the agent with its system prompt, structured output, tools, and the
    per-request context (who the shopper is, what page they're on, a screenshot)."""
    system_prompt = PROMPT_PATH.read_text(encoding="utf-8")
    agent: Agent[ChatDeps, AgentReply] = Agent(
        _model(),
        deps_type=ChatDeps,
        system_prompt=system_prompt,
        output_type=AgentReply,
    )

    # Dynamic system prompt: injects who the shopper is and what's on their page.
    @agent.system_prompt
    def dynamic_context(ctx: RunContext[ChatDeps]) -> str:
        parts: list[str] = []
        if ctx.deps.user_first_name:
            parts.append(
                f"The shopper is {ctx.deps.user_first_name}, a signed-in customer. "
                f"You may greet them by name and you remember your past conversations "
                f"with them."
            )
        else:
            parts.append(
                "The shopper is browsing as a guest (not signed in). Don't assume "
                "any past history."
            )
        if ctx.deps.page_context:
            parts.append(_page_context_text(ctx.deps.page_context))
        if ctx.deps.screenshot:
            parts.append(
                "A screenshot of the shopper's current page is available — call "
                "`look_at_page` if a question needs you to actually see the page."
            )
        return "\n\n".join(parts)

    # Register the data tools so the agent can ground its answers in real data.
    # Each tool reads the database live, so answers reflect current price/stock.
    @agent.tool_plain
    def catalogue_overview() -> dict:
        """Summarize what the shop sells: product count, categories with counts,
        and the overall price range. Use for broad "what do you sell / price
        range" questions."""
        return tools.catalogue_overview()

    @agent.tool_plain
    def search_products(
        query: str | None = None,
        category: str | None = None,
        max_price: float | None = None,
        in_stock_only: bool = False,
        size: str | None = None,
    ) -> list[ProductSearchResult]:
        """Search the catalogue for products matching a shopper's request. Matches
        the query against name, description, colors, and tags, and can filter by
        category (T-Shirts, Long-Sleeve Shirts, Crewnecks, Hoodies, Quarter-Zips,
        Jackets), a maximum price, whether it's in stock, and a specific size
        (e.g. 'L' returns only products with a Large in stock). Use this to find
        products and to get their product_id for follow-up lookups. The products
        you return (via product_ids in your reply) are shown on the page."""
        return tools.search_products(
            query=query,
            category=category,
            max_price=max_price,
            in_stock_only=in_stock_only,
            size=size,
        )

    @agent.tool_plain
    def get_product_details(
        product_id: str | None = None, name: str | None = None
    ) -> ProductDetails | None:
        """Get full details for one product: description, exact price, colors,
        category, and live per-size stock. Identify it by product_id (preferred)
        or name. Use this for detailed questions about a specific item."""
        return tools.get_product_details(product_id=product_id, name=name)

    @agent.tool_plain
    def check_stock(
        product_id: str | None = None,
        name: str | None = None,
        size: str | None = None,
    ) -> StockInfo | None:
        """Check live stock for a product, optionally for one size (e.g. 'L').
        Identify it by product_id (preferred) or name. Use this for "is this in
        stock / do you have it in a large?" questions."""
        return tools.check_stock(product_id=product_id, name=name, size=size)

    @agent.tool_plain
    def size_guide() -> dict:
        """Get the size chart (chest measurement range for each size) plus
        instructions for how to measure. Use this to help a shopper choose a size
        and to walk them through taking their measurements."""
        return tools.size_guide()

    @agent.tool_plain
    def recommend_size(chest_inches: float) -> dict:
        """Given a chest measurement in inches, return the recommended size from
        the size chart. Use after helping the shopper measure their chest."""
        return tools.recommend_size(chest_inches)

    @agent.tool
    def look_at_page(ctx: RunContext[ChatDeps]) -> list:
        """Look at a screenshot of the shopper's current page. Use this only when a
        question genuinely needs you to SEE the page (e.g. about its layout or
        something visual you can't get from the product tools). Returns the page
        image, or a note if no screenshot is available."""
        shot = ctx.deps.screenshot
        if not shot:
            return ["No screenshot of the page is available right now."]
        image = _decode_data_url(shot)
        if image is None:
            return ["The page screenshot couldn't be read."]
        return ["Here is the shopper's current page:", image]

    return agent


def _decode_data_url(data_url: str) -> BinaryContent | None:
    """Turn a `data:image/...;base64,...` URL into image content for the model."""
    try:
        header, _, payload = data_url.partition(",")
        if not payload or "base64" not in header:
            return None
        media_type = header.split(";")[0].removeprefix("data:") or "image/png"
        return BinaryContent(data=base64.b64decode(payload), media_type=media_type)
    except (ValueError, TypeError):
        return None


def get_agent() -> Agent[ChatDeps, AgentReply]:
    """Return the shared agent, building it on first use."""
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent


def _to_message_history(history: list[ChatTurn]) -> list[ModelMessage]:
    """Convert stored chat turns into Pydantic AI message history, so the agent
    genuinely remembers the past conversation with this shopper."""
    messages: list[ModelMessage] = []
    for turn in history:
        if turn.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=turn.content)]))
        elif turn.role == "assistant":
            messages.append(ModelResponse(parts=[TextPart(content=turn.content)]))
    return messages


def _tool_events(result) -> list[dict]:
    """Extract the sequence of tool calls and their results from a run, for the
    audit trail."""
    events: list[dict] = []
    for msg in result.all_messages():
        for part in getattr(msg, "parts", []):
            if isinstance(part, ToolCallPart):
                events.append(
                    {"event": "tool_call", "tool": part.tool_name, "args": _truncate(part.args)}
                )
            elif isinstance(part, ToolReturnPart):
                events.append(
                    {"event": "tool_result", "tool": part.tool_name, "result": _truncate(part.content)}
                )
    return events


def _finish_reason(result) -> str:
    """Best-effort reason the agent loop stopped (the model's finish reason on its
    last response, else 'completed')."""
    for msg in reversed(result.all_messages()):
        fr = getattr(msg, "finish_reason", None)
        if fr:
            return str(fr)
    return "completed"


async def run_chat(
    request: ChatRequest,
    history: list[ChatTurn] | None = None,
    user_first_name: str | None = None,
    user_id: int | None = None,
) -> AgentReply:
    """Run one chat turn and return the agent's structured reply.

    `history` is the shopper's prior conversation (loaded from the database for
    signed-in users) so the agent remembers them. `user_first_name` personalizes
    the reply. Page context and any screenshot ride along on the request. Every
    loop is appended to the audit trail (output/audit_trail.json).

    Errors are caught and returned as a friendly in-chat message so the widget
    never sees a raw 500. The real error is logged to the server console.
    """
    started = time.monotonic()
    try:
        agent = get_agent()
        deps = ChatDeps(
            user_first_name=user_first_name,
            page_context=request.page_context,
            screenshot=request.screenshot,
        )
        result = await agent.run(
            request.message,
            deps=deps,
            message_history=_to_message_history(history or []),
        )
        output = result.output
        record(
            {
                "user_id": user_id if user_id is not None else "guest",
                "page": request.page_context.path if request.page_context else None,
                "had_screenshot": bool(request.screenshot),
                "message": _truncate(request.message),
                "tool_activity": _tool_events(result),
                "reply": _truncate(output.reply),
                "product_ids": output.product_ids,
                "stop_reason": "completed",
                "model_finish_reason": _finish_reason(result),
                "duration_ms": round((time.monotonic() - started) * 1000),
            }
        )
        return output
    except Exception as exc:  # noqa: BLE001 - surface a friendly message, log detail
        print(f"[chat] agent error: {type(exc).__name__}: {exc}")
        record(
            {
                "user_id": user_id if user_id is not None else "guest",
                "page": request.page_context.path if request.page_context else None,
                "message": _truncate(request.message),
                "tool_activity": [],
                "reply": None,
                "stop_reason": f"error: {type(exc).__name__}: {exc}",
                "duration_ms": round((time.monotonic() - started) * 1000),
            }
        )
        return AgentReply(
            reply=(
                "Sorry — I'm having trouble reaching my brain right now. Please try "
                "again in a moment."
            ),
            product_ids=[],
        )
