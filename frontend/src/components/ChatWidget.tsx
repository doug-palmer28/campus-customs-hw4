import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  fetchChatHistory,
  formatPrice,
  sendChatMessage,
} from "../api";
import { useChatResults } from "../context/ChatResultsContext";
import { useAuth } from "../context/AuthContext";
import ThinkingDog from "./ThinkingDog";
import type { PageContext, ProductSummary } from "../types";

interface ChatEntry {
  role: "user" | "assistant";
  text: string;
  products?: ProductSummary[];
}

// Minimal, safe markdown for chat bubbles: escapes HTML, then renders **bold**,
// bullet lists, and line breaks — so the assistant's replies read cleanly instead
// of showing raw markdown symbols.
function renderMessage(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bold = (s: string) =>
    esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const lines = text.split("\n");
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${bold(bullet[1])}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (line.trim()) html += `<p>${bold(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

const GREETING: ChatEntry = {
  role: "assistant",
  text:
    "Hi! I'm the Campus Customs assistant. Ask me about our merch, prices, or " +
    "what's in stock — and if you're signed in, I'll remember our past chats.",
};

// Read what's currently on the page so the agent can answer "this one" / "these".
function collectPageContext(pathname: string): PageContext {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>("[data-product-id]"),
  );
  const products: PageContext["products"] = [];
  const seen = new Set<string>();
  for (const el of els) {
    const id = el.getAttribute("data-product-id");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const priceAttr = el.getAttribute("data-price");
    products.push({
      product_id: id,
      name: el.getAttribute("data-name") ?? "",
      price: priceAttr ? Number(priceAttr) : null,
    });
  }
  const focused =
    pathname.startsWith("/products/") &&
    document.querySelector(".product-detail")?.getAttribute("data-product-id");
  return {
    path: pathname,
    title: document.title,
    products: products.slice(0, 30),
    focused_product_id: focused || null,
  };
}

// Best-effort screenshot of the current page (used by the agent's look_at_page
// tool). Captures just the visible viewport, heavily downscaled, with a hard
// timeout and a size cap — so a chat message is never blocked or bloated by the
// screenshot (e.g. on the image-heavy catalogue page). Failures are swallowed.
const SCREENSHOT_TIMEOUT_MS = 5000;
const SCREENSHOT_MAX_CHARS = 1_500_000; // ~1.1 MB of base64

async function captureScreenshot(): Promise<string | undefined> {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const render = html2canvas(document.body, {
      scale: 0.6,
      logging: false,
      useCORS: true,
      backgroundColor: "#ffffff",
      imageTimeout: 2000,
    });
    const timeout = new Promise<undefined>((resolve) =>
      setTimeout(() => resolve(undefined), SCREENSHOT_TIMEOUT_MS),
    );
    const canvas = await Promise.race([render, timeout]);
    if (!canvas) return undefined;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    return dataUrl.length > SCREENSHOT_MAX_CHARS ? undefined : dataUrl;
  } catch {
    return undefined;
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [entries, setEntries] = useState<ChatEntry[]>([GREETING]);
  const { setResults } = useChatResults();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Restore the signed-in user's saved conversation when they return / log in.
  useEffect(() => {
    let active = true;
    if (user && token) {
      fetchChatHistory(token)
        .then((turns) => {
          if (!active) return;
          const restored: ChatEntry[] = turns.map((t) => ({
            role: t.role,
            text: t.content,
            products: t.products,
          }));
          setEntries([GREETING, ...restored]);
        })
        .catch(() => {
          /* keep the greeting on failure */
        });
    } else {
      setEntries([GREETING]);
    }
    return () => {
      active = false;
    };
  }, [user, token]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setEntries((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const pageContext = collectPageContext(location.pathname);
      const screenshot = await captureScreenshot();
      const res = await sendChatMessage(text, { token, pageContext, screenshot });
      setEntries((prev) => [
        ...prev,
        { role: "assistant", text: res.reply, products: res.products },
      ]);
      // If the agent matched products, update the website to show exactly those
      // items and take the shopper to the Products page to see them.
      if (res.products && res.products.length > 0) {
        setResults(res.products, text);
        navigate("/products");
      }
    } catch {
      setEntries((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry — I couldn't reach the server. Is the backend running?",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`chat-widget ${open ? "open" : ""}`}>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Campus Customs chat">
          <div className="chat-header">
            <span>Campus Customs Assistant</span>
            <button
              className="chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="chat-body">
            {entries.map((entry, i) => (
              <div key={i} className={`chat-msg ${entry.role}`}>
                <div
                  className="chat-msg-text"
                  dangerouslySetInnerHTML={{ __html: renderMessage(entry.text) }}
                />
                {entry.products && entry.products.length > 0 && (
                  <div className="chat-products">
                    {entry.products.map((p) => (
                      <Link
                        key={p.product_id}
                        to={`/products/${p.product_id}`}
                        className="chat-product"
                      >
                        <img src={p.image_url} alt={p.name} />
                        <span>{p.name}</span>
                        <span className="chat-product-price">
                          {formatPrice(p.price)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="chat-msg assistant thinking">
                <ThinkingDog />
              </div>
            )}
          </div>

          <form className="chat-input" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              placeholder="Ask about our merch…"
              onChange={(e) => setInput(e.target.value)}
              aria-label="Chat message"
            />
            <button type="submit" disabled={sending || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        className="chat-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Minimize chat" : "Open chat"}
      >
        {open ? "Close" : "💬 Chat"}
      </button>
    </div>
  );
}
