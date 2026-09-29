# Campus Customs — Project Harness

**Project:** Campus Customs Shop + Chatbot — a Yale-themed merch store with an AI shopping assistant.

**What this document is:** A complete, plain-language reference for how the whole
project works, written to be read by a manager. Each section explains not just
*what* exists but *why it matters* for the shop and its chatbot.

**The project in one paragraph.** Campus Customs is a Yale ("Bulldog Blue") apparel
shop. Shoppers browse a catalogue, create an account, add items to a cart, and
check out. A chat assistant — an AI agent running on our API key through Portkey —
answers questions about products, prices, and live stock by reading the store's
database, and can update the page to show items it finds. Shoppers can review past
orders, start returns, leave feedback, and win a discount by playing a Yale trivia
game. Everything the assistant does is grounded in real data and recorded in an
audit trail.

**Tech stack:** React + Vite + TypeScript front end · FastAPI (Python) back end ·
Pydantic AI agent via Portkey (`gpt-5.6-terra`) · SQLite database.

**Contents**
1. The Database
2. Backend (+ 2.1 Accounts & Authentication)
3. AI Agent (+ 3.1 Portkey, 3.2 Memory / page awareness / screenshots)
4. Agent Tools & Abilities
5. Front End (+ 5.1 chat-driven search, 5.2 orders/returns/recommendations, 5.3 design)
6. Safety & Guardrails
7. Audit Trail
8. Data Models (`models.py`) — fields & why
9. Specs, Tech Stack & Running It

---

## 1. The Database

The app is powered by a single local SQLite database, `data/campus_customs.db`. Everything the chatbot says about products, prices, and stock comes from here — the agent is never allowed to invent this information. The database has three tables that matter for the shop (`catalogue`, `inventory`, `users`) plus one supporting table the chatbot writes to (`chat_messages`).

At a glance:

| Table | Rows | What it holds | Why it matters for the chatbot |
|---|---|---|---|
| `catalogue` | 102 | The product listings — name, description, colors, price, image | The source of truth for *what we sell* and *what it costs* |
| `inventory` | 612 | Stock counts, one row per product per size | The source of truth for *what's in stock* right now |
| `users` | 3 | Registered shopper accounts | Lets shoppers log in and personalizes the chat |
| `chat_messages` | 22 | Saved chat history per user | Gives the chatbot memory of past conversations |

---

### 1.1 `catalogue` — the products (102 items)

One row per product. This is the master list of everything Campus Customs sells.

| Field | Type | Description | Why it matters for the chatbot |
|---|---|---|---|
| `product_id` | text, primary key | Unique slug, e.g. `basic-hoodie-big-yale` | The stable ID the agent uses to link a product to its stock and its image |
| `name` | text | Display name, e.g. "Basic Hoodie Big Yale" | What the chatbot shows the shopper |
| `garment_type` | text | Category, e.g. "pullover hoodie", "crewneck sweatshirt" | Lets the chatbot answer "what hoodies do you have?" |
| `description` | text | A rich sentence describing the item's look and features | Feeds honest, detailed answers about how a product looks |
| `colors` | text (JSON list) | Available colors, e.g. `["navy blue", "white"]` | Lets the chatbot answer "do you have this in pink?" honestly |
| `search_tags` | text (JSON list) | Keywords, e.g. `["Yale hoodie", "navy hoodie", ...]` | Powers the chat-driven product search that updates the page |
| `image_file_path` | text | Relative path, e.g. `products/basic-hoodie-big-yale.jpg` | Lets matching items appear on the page with a picture |
| `price` | number | Price in dollars, e.g. `68.0` | The source of truth for honest price answers |

**What the data looks like:**
- **Prices** are tidy and category-based, ranging from **$32 to $98** (average ~$58). T-shirts are $32, crewnecks $58, hoodies $68, quarter-zips $72, fleece jackets and bombers $98.
- **Garment types are messy.** There are 22 distinct spellings for what are really ~6 real categories — e.g. "short-sleeve T-shirt" and "short-sleeve t-shirt" appear separately, and "pullover hoodie", "hoodie", and "hooded sweatshirt" all describe hoodies. *This matters:* if the chatbot filters by exact garment type it will miss items, so search should lean on `search_tags` and fuzzy matching rather than exact category strings.
- **Colors and tags are JSON strings, not native lists** — they must be parsed after reading. There are 22 distinct colors (navy dominates) and 270 distinct search tags ("Yale" appears on 88 of 102 products).
- Every product has a valid image file on disk and every JSON field parses cleanly — no missing images, no broken records.

---

### 1.2 `inventory` — stock on hand (612 rows)

Stock is tracked per product **and** per size. Every one of the 102 products has exactly 6 size rows (XS, S, M, L, XL, XXL), which is why there are 612 rows.

| Field | Type | Description | Why it matters for the chatbot |
|---|---|---|---|
| `id` | integer, primary key | Row ID | Internal only |
| `product_id` | text | Links to `catalogue.product_id` | Ties a stock count to its product |
| `size` | text | One of XS, S, M, L, XL, XXL | Lets the chatbot answer "do you have this in a large?" |
| `quantity` | integer | Units in stock (0–25) | The source of truth for honest stock answers |
| *(unique constraint)* | — | one row per (`product_id`, `size`) | Guarantees stock is never double-counted |

**What the data looks like:**
- Quantities range from **0 to 25**, averaging about **10 units** per size.
- **145 of the 612 rows are out of stock (quantity 0)** — so individual sizes selling out is common and the chatbot must check per size, not just per product.
- **No product is completely sold out** — every product has at least one size available. So "we're totally out of that" should never happen, but "we're out of that in XL" will happen often.
- The links are clean: every inventory row matches a real product, and every product has inventory. Nothing is orphaned.

*Why this matters:* honest stock answers require joining `catalogue` and `inventory` on `product_id` and then looking at the specific size. This join is the backbone of the "honest answers about price and stock" feature.

---

### 1.3 `users` — shopper accounts (3 rows)

Registered accounts. Currently holds a test account and two sample shoppers.

| Field | Type | Description | Why it matters for the chatbot |
|---|---|---|---|
| `id` | integer, primary key | Account ID | The key that ties a shopper to their chat history |
| `name` | text | Full display name | Legacy full-name field |
| `first_name` | text | First name (added later) | Lets the chatbot greet the shopper personally |
| `last_name` | text | Last name (added later) | Personalization |
| `email` | text, unique | Login identifier, e.g. `ada@yale.edu` | The username shoppers log in with; enforced unique |
| `password_hash` | text | Securely hashed password (never plain text) | Lets shoppers log in safely |
| `created_at` | text | Account creation timestamp | Record-keeping |

**What the data looks like:**
- Passwords are **stored hashed, never in plain text** — the format is a salted PBKDF2-SHA256 hash. We will match this same scheme when we build account creation and login so new accounts are stored the same safe way.
- `name` is the original field; `first_name` / `last_name` were added afterward (they sit at the end of the table). New signups should populate all three so greetings work.
- Email is unique, so it doubles as the login handle.

---

### 1.4 `chat_messages` — conversation history (22 rows)

The chatbot's memory. Every message, from both the shopper and the assistant, is saved here and tied to a user.

| Field | Type | Description | Why it matters for the chatbot |
|---|---|---|---|
| `id` | integer, primary key | Message ID | Ordering within a conversation |
| `user_id` | integer | Links to `users.id` | Keeps each shopper's history separate |
| `role` | text | `user` or `assistant` | Distinguishes who said what |
| `content` | text | The message text | The conversation itself |
| `products_json` | text (JSON) | Snapshot of products the assistant showed | Lets the page re-display the items the chatbot matched, and remembers what was recommended |
| `created_at` | text | Timestamp | Ordering and record-keeping |

**What the data looks like:**
- History is **balanced** — 11 shopper messages, 11 assistant replies — and tied to 2 of the 3 users, so this is real sample dialogue we can learn the expected style from.
- Assistant messages carry a `products_json` snapshot (the matched items with their details); shopper messages leave it empty. *This is the mechanism* behind "see matching items appear on the page" — the products the chatbot picks are saved alongside its words, so the page can render them and reload them later.
- The sample dialogue confirms the intended behavior: shoppers ask things like "What hoodies do you have?" and "you have this in pink?", and the assistant answers honestly from the catalogue ("only available in navy and white, not pink").

---

## 2. Backend

A small **FastAPI** service (`backend/main.py`) is the only thing that touches the database. The front end never reads the database directly — it asks the backend, which keeps the data in one trusted place. This is the simple starting point; it grows into the agent-powered backend in Section 3.

**Design principle — data-driven and defensive.** Nothing about individual products is written into the code. The API reflects whatever database is loaded beside it, so the site updates automatically as the catalogue changes. Because the database and images are deliberately *not* shipped to the public repo, the backend is written to degrade gracefully: if the database is missing it returns an empty catalogue (the site still loads) rather than crashing.

**What it offers (endpoints):**

| Endpoint | What it does | Why it matters |
|---|---|---|
| `GET /api/health` | Reports status and whether the database is present | Quick sanity check that everything is wired up |
| `GET /api/products` | The full catalogue as summary cards (name, type, price, short description, colors, image link) | Powers the Products page and the home page |
| `GET /api/products/{id}` | One product in full detail, including per-size stock | Powers the single-product page and honest stock answers |
| `GET /api/images/{path}` | Serves a product image from the data folder | Lets product pictures appear on the site |
| `POST /api/chat` | Placeholder chat reply (no AI yet) | Gives the chat widget a backend to talk to until the agent is built |

**Notes that matter for the chatbot:**
- The backend does the messy work of turning stored data into clean answers: it parses the JSON color/tag fields, trims long descriptions into short blurbs for cards, and joins a product to its per-size inventory so stock is reported size by size.
- **Standardized categories.** The database's ~22 inconsistent garment-type spellings are collapsed into six clean categories (T-Shirts, Long-Sleeve Shirts, Crewnecks, Hoodies, Quarter-Zips, Jackets) so that filtering by "T-Shirts" reliably gathers every t-shirt. Each product still carries its original specific type as well.
- Every product summary also reports whether it has **any size in stock**, so the site (and later the chatbot) can offer an "in stock only" view without a second lookup.
- Image links are handed out as clean URLs, so both the website and (later) the chatbot can show pictures without knowing where files live on disk.
- The image route is guarded so it can only serve files from inside the data folder — it can't be tricked into reading elsewhere on the computer.
- The chat endpoint is intentionally a stub right now. It returns a friendly "not wired up yet" message so the front end is fully functional while the real assistant is built in the next steps.

### 2.1 Accounts & Authentication (how log-in works, and how passwords are protected)

Shoppers can **create an account** (first name, last name, email, password with confirmation) and **log in** with their email and password. New accounts are saved into the existing `users` table. The whole feature was built with one guiding rule: **treat every password as a secret we must never be able to read ourselves.**

**How it works, step by step:**
1. **Sign-up.** The shopper fills in their details. The browser checks the basics (names present, password at least 8 characters, and the two password fields match) before anything is sent.
2. **Hashing.** When the request reaches the backend, the password is immediately converted into a one-way *hash* — a scrambled fingerprint that cannot be turned back into the original password. Only this hash is stored. The plain password is never written to the database, never logged, and never included in any response.
3. **Storage.** The new account is inserted into the `users` table with the hash, matching the same secure scheme the existing accounts already used.
4. **Log-in.** When the shopper logs in, the password they type is hashed the same way and compared to the stored hash. If they match, they're in; the real password is never needed again.
5. **Staying logged in.** On success the backend hands the browser a short, signed *session token* that proves who they are for about a week. The shopper stays logged in across page refreshes, and can log out at any time.

**What protects the information (in plain terms):**

| Protection | What it means | Why it matters |
|---|---|---|
| One-way hashing (PBKDF2-HMAC-SHA256) | Passwords are stored as an irreversible fingerprint, never as text | Even someone who got a copy of the database could not read anyone's password |
| A unique random "salt" per account | Each password is scrambled with its own random value | Two people with the same password get different hashes, and precomputed "rainbow table" attacks don't work |
| A high work factor (200,000 rounds) | Each hash is deliberately slow to compute | Makes large-scale password guessing painfully expensive for an attacker |
| Constant-time comparison | The check takes the same time whether or not the password is right | Prevents clever "timing" tricks that could leak hints about the password |
| Generic login errors + equal timing | A failed login always says the same thing and takes the same time, whether the email exists or not | Stops attackers from discovering which emails have accounts |
| Signed, expiring session tokens | The "keep me logged in" token is tamper-proof and never contains the password | A token can't be forged or reused forever, and leaks nothing sensitive |
| Secrets kept out of the code repo | The token-signing secret and the `.env` file are never committed to git | The public GitHub repo can't expose anything that would compromise accounts |
| Basic sign-up rules | Valid email format, minimum password length, and no duplicate emails | Keeps accounts clean and blocks trivially weak or conflicting sign-ups |

**A note on scope:** passwords travel from the browser to the server to be hashed — in a real deployment that trip is protected by HTTPS (standard web encryption). Password *storage*, which is what an attacker who breaches a database would see, is fully protected here by the measures above.

## 3. AI Agent

The chat assistant on the website is a **Pydantic AI agent** that runs inside the
backend. It is what turns a shopper's typed question into a helpful, grounded
reply. The model itself (the "brain") runs on our API key, reached through
**Portkey**.

**How the front end talks to the backend (the round trip):**

1. A shopper types in the **chat widget** (bottom-right of every page) and hits
   send.
2. The widget makes a web request to **`POST /api/chat`** on the FastAPI backend,
   sending the message (and, later, who they are and the conversation so far).
   In development this request is forwarded to the backend automatically by the
   dev server, so the same code works locally and in production.
3. FastAPI hands the message to the agent, waits for its answer, and sends back a
   reply plus any products to show.
4. The widget displays the reply in a chat bubble (and can show product cards when
   the agent surfaces matching items).

**How the agent is organized (four files next to `main.py`):**

| File | Role |
|---|---|
| `backend/prompts/prompt.md` | The system prompt — the agent's **voice** and its **safety rules**. Kept as plain text so it's easy to read and expand. |
| `backend/models.py` | The data shapes for a chat: the incoming request, prior turns, and the agent's structured reply (its message plus any product IDs to display). |
| `backend/tools.py` | The agent's **data tools** — how it looks things up in the catalogue database so its answers are based on real data, not guesses. |
| `backend/agent.py` | Builds the agent: loads the prompt, connects to the model through Portkey, registers the tools, and exposes the function `main.py` calls. |
| `backend/main.py` | The FastAPI app (run with Uvicorn). Exposes `/api/chat`, which calls the agent and returns its reply. |

**How the agent is loaded (and why that's safe):**

- The agent is built **lazily** — the very first time someone chats, not when the
  server starts. This means the API (products, images, accounts) still starts and
  runs even if the model key isn't configured; only chatting needs it.
- When it builds, `agent.py` reads the API key from the project's `.env` file
  (which is never committed), connects to the model through Portkey, loads the
  voice-and-safety prompt, and attaches the data tools. The built agent is then
  reused for every subsequent chat.
- The model is configured once, in one place, so switching models or providers is
  a one-line change.

**Grounded, honest answers.** The agent is told never to invent product facts. It
uses its tools to look up real catalogue data, and if it doesn't have something it
says so rather than guessing — exactly the honest behavior the shop wants. (The
detailed product-info and stock tools are added in Section 4.)

**Running the backend.** From the `backend` folder:

```
uvicorn main:app --reload --port 8000
```

## 3.1 What powers the model (Portkey)

The agent doesn't call the model provider directly — it goes through **Portkey**,
a gateway that sits in front of the model. Our single `PORTKEY_API_KEY` (stored in
the `.env`, never in the code or the public repo) authenticates the request, and
Portkey routes it to the configured model. This keeps the key in one secret place
and makes provider/model changes easy.

## 3.2 Customer memory, page awareness, and looking at the page

The assistant doesn't start from scratch every message. It knows who the shopper
is, remembers past chats, sees what's on the page, and can even look at the page.

**Memory of past chats (signed-in shoppers only).**

- Every message and reply for a **signed-in** shopper is saved to the
  `chat_messages` table, tied to their account. Guests can chat, but nothing is
  stored — privacy by default.
- How it knows who's who: the website sends the shopper's login token with each
  chat message; the backend checks the token and gets their account id from it (the
  client can't fake this). Chat is only ever saved to that verified account.
- On a new message, the backend loads that shopper's recent history and hands it to
  the agent as real conversation memory, so it remembers preferences they mentioned
  before (favorite color, size, what they were after) and greets them by name.
- When a shopper returns, the chat widget calls a history endpoint and **restores
  the past conversation** in the panel, so it picks up where they left off.

**Page awareness.** With each message the website also sends a small description of
what the shopper is currently viewing: the page, the products shown on it, and —
on a product page — which product is in focus. This is how the agent can answer
"is *this one* in stock?" or "tell me about the third one" — it maps those to the
real products on the page and looks up live data with its tools.

**Looking at the page (screenshots).** For questions that need the agent to
actually *see* the page, the website can capture a screenshot of it and the agent
can view it with a `look_at_page` tool. The screenshot is taken in the shopper's
browser (the only place that can see their screen), captured best-effort with a
time limit and size cap so it never slows down or blocks the chat, and the agent
only looks at it when a question genuinely calls for it (ordinary price/stock
questions use the exact data tools instead).

**Why this is safe and private.** Chat is stored only for a logged-in user and only
under their own account, keyed off a verified login token — never by a value the
browser could spoof. Guests leave no trace.

## 4. Agent Tools

The agent answers product questions by calling **tools** that read the catalogue
database directly. Crucially, every tool opens the database **fresh on each call**,
so answers always reflect the current data — as stock is sold and counts drop, the
agent sees the new numbers immediately. It is instructed never to rely on
remembered prices or stock.

### The tools

| Tool | What it does | When the agent uses it |
|---|---|---|
| `catalogue_overview` | High-level summary: total products, categories with counts, overall price range | "What do you sell?", "What's your price range?" |
| `search_products` | Finds products matching a text query, with optional filters for category, maximum price, and in-stock-only; returns the best matches | "Show me navy hoodies under $70", "What crewnecks do you have?" |
| `get_product_details` | Full details for one product — description, exact price, colors, category, and live per-size stock | "Tell me about the Basic Hoodie", "How much is X and what colors?" |
| `check_stock` | Live stock for one product, optionally a single size | "Is this in stock?", "Do you have it in a large?" |
| `size_guide` | The size chart (chest range per size) and how to measure | "What size am I?", "How do I measure?" |
| `recommend_size` | Turns a chest measurement (inches) into a recommended size | After the shopper shares their chest measurement |

The size tools (added in Problem 9) let the assistant walk a shopper through
measuring and recommend the right size — see also the usability write-up.

A typical conversation: the agent uses `search_products` to find an item and learn
its `product_id`, then `get_product_details` or `check_stock` for specifics — then
answers with exact figures.

### What each lookup returns, and why those fields

The tool results are deliberately **lean** — each carries only what the agent needs
to answer a shopper honestly, so results stay easy for the model to reason over and
don't bury it in noise. The shapes are defined in `backend/models.py`.

**Search result** (`ProductSearchResult`, one per match):

| Field | Why it's included |
|---|---|
| `product_id` | The stable handle the agent uses for follow-up lookups and to surface the item on the page |
| `name` | What the shopper sees |
| `category` | The normalized category (T-Shirts, Hoodies, …) for grouping and filtering |
| `price` | So price answers come straight from the data |
| `colors` | Answers "do you have it in navy?" without a second lookup |
| `short_description` | A one-line summary that keeps a list scannable |
| `any_in_stock` | Lets the agent prefer or flag items that are actually available |

*Left out on purpose:* the full description and every size's stock — those would
bloat a multi-item list, so the agent fetches them per-product only when a shopper
drills in.

**Product details** (`ProductDetails`, one product in depth) — adds the full
`description` (accurate answers), the specific `garment_type` (precise wording),
and `sizes`: a list of **per-size stock** entries. It carries everything needed to
answer any question about a single item.

**Per-size stock** (`SizeAvailability`, used inside details and stock checks):

| Field | Why it's included |
|---|---|
| `size` | Which size (XS–XXL) |
| `quantity` | The **exact** count, so the agent can say "2 left" rather than a vague "yes" |
| `in_stock` | A quick true/false for simple yes/no availability answers |

**Stock check** (`StockInfo`) — a focused availability answer: the product's id and
name, the relevant `sizes` (filtered to one size when the shopper asked about a
specific one), and an overall `any_in_stock` flag.

### Why this keeps answers honest

Because the data is read live and the fields carry exact prices and exact counts,
the agent can (and is told to) quote precise figures and admit when something is
sold out — rather than guessing. If a lookup finds no match, the tools return
nothing and the agent says it couldn't find the item instead of inventing one.

## 5. Front End

A **React + Vite + TypeScript** single-page app (`frontend/`) is what shoppers actually see. It is styled with a Yale look — dark blue, an ivy/gold accent, and a collegiate serif — as the foundation; richer styling comes in a later step. During development it talks to the backend through a proxy, so the same code works locally and in production.

**The pages:**

| Page | What a shopper can do | Notes |
|---|---|---|
| Home | See a welcome hero, brand highlights, and a few featured products | Copy is written in our own words, modeled on the real shop |
| Products | Browse the whole catalogue; search and filter by category, price, color, and stock, and sort by price | Data-driven — every product from the database appears here with its name, price, short description, and image. Filters are shareable via the URL (e.g. the footer's category links) |
| Product detail | See the full description, colors, and per-size stock; add an item to the cart | Reached by clicking any product; sold-out sizes are shown but disabled |
| About Us | Read the brand story | Original copy modeled on the real shop |
| Log In / Create Account | Real sign-in and sign-up, secured per Section 2.1 | |
| Account | See order history, start returns, leave fit/rating feedback, and view personalized recommendations | Reached from the "Hi, [name]" greeting in the nav |
| Cart | Review items, change quantities, check out, and see "Complete the look" recommendations | Demo checkout — no real payment; for signed-in shoppers the order is saved to their account |
| Shipping & Returns / Size Guide / Contact | Store-info pages | Linked from the footer so every footer link leads somewhere |

**Mascot.** A cheerful "Handsome Dan" bulldog, drawn in inline SVG (not an image file), greets shoppers on the home hero and turns up on the empty-cart and not-found pages.

**Shared elements on every page:**
- A **navigation bar** at the top linking Home, Products, About Us, Log In, Create Account, and the Cart (with a live item-count badge).
- A **chat widget** pinned to the bottom-right that talks to the AI agent and can drive what the page shows (see below).
- A small, subtle **disclaimer** in the footer making clear this is a class project, not a real store and not affiliated with Yale.

**Why it's built this way:** the cart remembers its contents across page refreshes, and shared state connects the chat to the page, so a conversation can change what products are displayed.

### 5.1 Chat-driven search: the page updates from the conversation

The chat isn't just a side conversation — it drives what the website shows. Ask
the assistant for something ("show me cool grey t-shirts in stock in a large") and
the **Products page updates to display exactly those items**.

**The API contract.** When the widget sends a message to `POST /api/chat`, the
response contains two things:

- `reply` — the assistant's text for the chat bubble, and
- `products` — a list of **structured product matches** (the same product cards the
  catalogue uses: id, name, category, price, colors, image, availability).

Those matches come from the agent: when it uses its search tool, it returns the
matching `product_id`s, and the backend expands them into full product cards before
replying. So the front end receives ready-to-render products, not raw text it has
to parse.

**How the page renders them.** A small shared store (the "chat results") sits
between the widget and the pages:

1. The shopper asks for something in the chat.
2. The agent searches the live catalogue and returns the matching products.
3. The widget saves those matches to the shared store and sends the shopper to the
   **Products page**.
4. The Products page notices there are chat matches and shows **just those items**,
   under a highlighted banner ("13 matches for the assistant — you asked: …")
   instead of the full catalogue and filters.
5. Every match is a normal product card, so **clicking one still opens the full
   detail view** (description, colors, per-size stock, add-to-cart) — nothing about
   that changes.
6. A **"Show all products"** button on the banner clears the chat results and
   returns the page to normal browsing.

**Why this design.** Reusing the same product-card and detail-page components means
chat results behave exactly like the rest of the shop — same look, same click-through
to detail, same add-to-cart — with no separate code path. And because the matches
come from the agent's live database search, what the page shows always reflects
current stock and prices. (The search tool also forgives common spelling
differences — e.g. "grey" finds the catalogue's "gray" — so a shopper's natural
wording still finds the right items.)

### 5.2 Orders, returns, feedback, and recommendations (Problem 9)

Two new database tables — `orders` and `order_items` — record what shoppers buy
(created automatically at startup if missing). Checkout for a signed-in shopper
saves the order to their account; it's a demo, so no real payment is taken and only
a dummy card's last four digits are stored.

New backend endpoints (all account-scoped, keyed off the verified login token):

| Endpoint | What it does |
|---|---|
| `POST /api/orders` | Save a checkout as an order (signed-in only); applies a coupon and stores the card securely |
| `GET /api/orders` | The shopper's order history with items |
| `POST /api/orders/items/{id}/return` | Start a return with a reason + cleanliness/tags certification |
| `POST /api/orders/items/{id}/feedback` | Save fit feedback and/or a 1–5 rating |
| `POST /api/recommendations` | Recommend products for a set of seed items |
| `GET /api/trivia/questions` · `POST /api/trivia/submit` | The Yale trivia game; all-correct issues a coupon |
| `GET /api/coupons` · `POST /api/coupons/validate` | The shopper's active coupons / validate a code |

**Card handling.** Checkout is a demo, but the card number is treated like a
password: it is **never stored in the clear** — only the last four digits (for
display) and a salted one-way hash are kept.

**Returns.** Starting a return records the shopper's reason and their certification
that the item is clean and still has its tags; they're told a follow-up email will
be sent (no email is actually sent — it's a class project).

**Coupons & the trivia game.** A signed-in shopper can play a three-question Yale
trivia game (each harder than the last). Getting all three correct issues a
**single-use 10% coupon** with a unique Yale-themed code; a shopper can hold only one
game coupon at a time. The code is entered in the checkout coupon box, validated
against their account, applied to the total, and marked redeemed when the order is
placed. Answers are graded server-side (the questions are served without the answer
key), so the game can't be gamed from the browser.

**All feedback is recorded.** Fit feedback, ratings, return reasons/certifications,
orders, and coupons are all persisted to the database for later use.

**How recommendations work.** Given seed products (the cart, or a shopper's purchase
history) and the sizes they buy, the recommender prefers items that (1) **share an
affinity** — a specific college, sport, or school — read from the products' search
tags (ignoring generic tags like "Yale" or "cotton"); (2) are a **complementary
category** (a jacket to layer over a tee); and (3) are **in stock in the shopper's
sizes**. If the seeds carry no specific affinity, it falls back to general Yale gear.
The same logic powers both the cart's "Complete the look" and the account page's
"Recommended for you". Full detail is in `output/usability.md`.

### 5.3 Visual design & polish (Problem 10)

The site leans into Yale visually and fixes several rough edges:

- **Cartoon Yale landmarks.** Hand-drawn SVG cartoons of the Yale Bowl, Ingalls Rink
  ("The Whale"), the School of Management, Payne Whitney Gym, Beinecke and Sterling
  libraries, and Harkness Tower — in the same friendly style as Handsome Dan. They
  appear as a faint watermark backdrop behind the cards throughout, and are showcased
  with descriptions on the About page.
- **Browser tab icon.** A navy-and-gold "Y" favicon shows in the browser tab.
- **Nav polish.** The "Hi, [name]" and Cart items now show the same gold underline on
  hover as the other nav links, signaling they're clickable. The chat button is
  larger and lifts on hover to invite clicks.
- **Cleaner color filter.** Products filter by the garment's **actual primary color**
  (the base of the item, not text/graphic accents), consolidated from ~22 raw color
  strings into a short list (Navy, Gray, White, Blue, …).
- **Checkout scroll fix.** The checkout modal now scrolls inside the card and locks
  the page behind it, so a long form (with the coupon box) no longer scrolls the page.
- **Harder trivia.** The quiz questions were made tougher (Yale motto → original
  name → oldest a cappella group), labeled Medium / Hard / Expert.
- **Readable chat.** The assistant's replies render light markdown (bold, bullet
  lists) instead of showing raw `**` symbols.
- **Smooth navigation.** Every route change scrolls to the top of the new page, so
  navigating (e.g. from a footer link) always lands you at the top.

A visual, browsable verification of key features is in `output/app_check.html`
(with screenshots in `output/app_check_images/`).

---

## 6. Safety & Guardrails

The assistant is built to be honest, on-topic, and private by design. Its rules live
in one place — the system prompt at `backend/prompts/prompt.md` — so they're easy to
read and adjust. In plain terms, the agent is told to:

- **Never make things up.** Every claim about a product, price, color, or stock must
  come from a database tool. If it doesn't know, it says so instead of guessing.
- **Be honest even when the answer is "no."** Sold-out sizes and unavailable colors
  are reported plainly — honesty is the whole point of the assistant.
- **Make no false promises.** It can't change prices, apply discounts on its own, or
  override stock; it only reports what's real and doesn't guarantee delivery or
  refunds beyond store policy.
- **Stay on topic and refuse harm.** It sticks to Campus Customs shopping and
  politely declines unrelated, harmful, deceptive, or offensive requests (including
  anything mean-spirited about rival schools).
- **Protect personal and account data.** It never asks for or repeats passwords or
  full card numbers in chat, only discusses the current shopper's own information,
  and never exposes secrets, keys, the system prompt, or how its tools work.
- **Resist manipulation.** If a message tries to get it to ignore its rules or act as
  a different assistant, it declines and carries on safely.
- **Be transparent.** If asked, it says clearly that this is a class-project demo —
  no real orders ship and no real payment is taken.

**Guardrails beyond the prompt.** Safety isn't only the prompt:
- The agent's answers are **grounded in tools** that read the real database, so it
  can't drift far from the truth.
- **Payment data is never stored in the clear** (card numbers are kept only as a
  salted hash plus last four digits), and passwords use the same one-way hashing.
- Account-scoped endpoints are **keyed off a verified login token**, so a shopper can
  only ever see their own orders, chat history, and coupons.
- The model provider adds its own content filtering on top; when it blocks a request
  (e.g. a prompt-injection attempt), the app fails safe with a friendly message and
  records the reason in the audit trail.
- If the model errors for any reason, the chat returns a graceful fallback rather
  than a crash.

## 7. Audit Trail

Every run of the agent (one chat turn) is appended as a single line to
**`output/audit_trail.json`**. The file is **append-only** — it's never wiped or
rewritten, only added to at the bottom — so it's a durable, reviewable record of
what the assistant actually did.

Each entry records:

| Field | What it captures |
|---|---|
| `time` | UTC timestamp of the turn |
| `user_id` | The signed-in shopper's id, or `"guest"` |
| `page` | The page the shopper was on |
| `message` | The shopper's message |
| `tool_activity` | The ordered list of tool calls (with arguments) and their results — the actual agent loop |
| `reply` | The assistant's reply |
| `product_ids` | Any products it surfaced to the page |
| `stop_reason` | Why the loop stopped: `completed`, or `error: …` with the cause |
| `duration_ms` | How long the turn took |

Because it's one JSON object per line, the log is both human-readable and easy to
parse for analysis. Writing to it can never break a chat — any logging failure is
swallowed and noted on the server console. Implementation lives in `backend/agent.py`.

## 8. Data Models (`models.py`) — fields & why

The agent's data shapes live in `backend/models.py`. They are deliberately **lean** —
each field earns its place so the model has exactly what it needs and nothing that
would confuse it or bloat responses. (The HTTP request/response and order models
live in `main.py`; the product/tool result models are detailed in Section 4.)

**Conversation types**
- `ChatTurn` — `role` ("user"/"assistant") + `content`. One past message, used to
  rebuild the agent's memory of the conversation.
- `ChatRequest` — what the widget sends: `message`, optional `user_id`, `history`
  (loaded server-side for signed-in users), `page_context`, and an optional
  `screenshot`. Carries everything the agent needs about *this* turn.
- `PageContext` / `PageProduct` — the page path/title and the products currently on
  screen, so the agent can answer "is *this one* in stock?" It carries `product_id`
  and `name` (and price) — enough to identify items without extra lookups.
- `AgentReply` — the agent's **structured output**: `reply` (the chat text) and
  `product_ids` (items to show on the page). Keeping the reply structured is what
  lets the page update from chat and what the audit trail records.

**Tool result types** (full rationale in Section 4)
- `ProductSearchResult` — a compact card for lists (id, name, category, price,
  colors, short description, availability); heavy fields are left out so a
  multi-item result stays easy to reason over.
- `ProductDetails` — everything for one product, including full description and
  **live per-size stock**.
- `SizeAvailability` — `size`, exact `quantity` (so it can say "2 left"), and an
  `in_stock` flag.
- `StockInfo` — a focused availability answer for one product (optionally one size).

**Why structured models at all?** Typed models mean the agent's inputs and outputs
are predictable: the front end can rely on the shape, the page-update and audit
features have clean data to work with, and the model is nudged to return exactly
what's needed rather than free-form text.

## 9. Specs, Tech Stack & Running It

**Architecture at a glance.** The React front end talks only to the FastAPI back
end over a small JSON API; the back end is the only thing that touches the SQLite
database and the AI model. The agent reaches the model through Portkey using a
single secret API key.

**Key specs**
- **Front end:** React + Vite + TypeScript (`frontend/`). Talks to the API via a dev
  proxy so the same code works locally and in production.
- **Back end:** FastAPI + Uvicorn. `main.py` holds the API app and the account/auth
  helpers (password hashing + session tokens); `agent.py` holds the Pydantic AI
  agent + Portkey wiring + the audit trail; `tools.py` holds the database tools;
  `models.py` holds the data shapes; and the agent's voice + safety rules live in
  `prompts/prompt.md`.
- **Model:** `gpt-5.6-terra` via Portkey; the API key is read from a `.env` file and
  is never committed.
- **Database:** SQLite (`data/campus_customs.db`) — catalogue, inventory, users,
  chat history, orders/order items, and coupons.

**Not committed to the public repo (by design):** the `.env` secret, the token
signing secret, the SQLite database, and the product images.

**Run it locally** — backend (from `backend/`):

```
uvicorn main:app --reload --port 8000
```

Front end (from `frontend/`):

```
npm install
npm run dev
```

Then open http://localhost:5173. The API, product browsing, and accounts work
without the model key; only the chat assistant needs it.

**Where to verify the work:** `output/app_check.html` is a browsable page with
screenshots demonstrating the chat inventory check, the chat-driven page update, and
the trivia-for-discount feature.
