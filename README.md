# Campus Customs Shop + Chatbot

A Yale-themed merch store with an AI shopping assistant. **React + Vite + TypeScript**
front end, **FastAPI** (Python) back end powered by a **Pydantic AI** agent (via
Portkey), and a **SQLite** catalogue.

> **Note:** This is a student class project — a demo, not a real store. It is not
> affiliated with or endorsed by Yale University or Campus Customs, and no real
> orders or payments are processed.

## Project structure

```
hw4/
├── AI_prompts.md            # the prompts used to build the project
├── requirements.txt         # Python backend dependencies
├── .env.example             # copy to .env and add your key
├── .gitignore
├── README.md
├── frontend/                # Vite + React + TypeScript app
├── backend/                 # FastAPI app
│   ├── main.py              # API app (incl. accounts/auth) — run: uvicorn main:app --reload --port 8000
│   ├── agent.py             # the Pydantic AI agent + Portkey wiring + audit trail
│   ├── tools.py             # the agent's database tools
│   ├── models.py            # data models
│   └── prompts/
│       └── prompt.md        # the agent's voice + safety rules
└── output/                  # project documentation
    ├── harness.md           # full project reference (start here)
    ├── design.md            # design/styling notes
    ├── usability.md         # usability improvements
    ├── app_check.html       # browsable feature verification (with screenshots)
    ├── app_check_images/
    └── audit_trail.json     # append-only log of agent activity
```

## The data pack (local only — not in git)

The catalogue database and product images are **not committed** to the repository.
To run the site, place the provided data pack inside `hw4/` so you have:

```
hw4/
└── data/
    ├── campus_customs.db     # the SQLite catalogue
    └── products/             # images referenced by the catalogue (*.jpg)
```

(If the pack is a zip, unzip it into `hw4/` so the `data/` folder lands as shown.)
The site is written to be data-driven: it displays whatever catalogue is in `data/`.
If `data/` is missing, the API and site still start (empty catalogue) rather than
crashing — but you'll want the pack in place to see products.

## Setup & running

You'll run two things: the **backend** (port 8000) and the **frontend** (port 5173).

### 0. Add your API key

```bash
cp .env.example .env
```

Then edit `.env` and set `PORTKEY_API_KEY` to your key. (The API, product browsing,
and accounts all work without it — only the AI chat assistant needs it.)

### 1. Backend (port 8000)

From the `hw4/` folder:

```bash
python -m venv .venv
# Windows:        .venv\Scripts\activate
# macOS / Linux:  source .venv/bin/activate
pip install -r requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```

### 2. Front end (port 5173)

In a second terminal, from `hw4/frontend/`:

```bash
npm install
npm run dev
```

### 3. Open the site

Go to **http://localhost:5173**. The Vite dev server proxies `/api/*` calls to the
backend on port 8000.

## Features

- Browse the catalogue; search and filter by category, price, color, and stock.
- Create an account and log in (passwords are stored only as salted hashes).
- Product detail pages with live per-size stock and add-to-cart.
- Cart + demo checkout (no real payment; card data is never stored in the clear).
- AI chat assistant that answers about products, price, and **live** stock, and
  updates the page to show items it finds.
- Customer memory (past chats), page-context awareness, order history, returns,
  item feedback, affinity-based recommendations, and a Yale trivia game for a
  discount coupon.
- An append-only **audit trail** of all agent activity in `output/audit_trail.json`.

See `output/harness.md` for a full, manager-readable explanation of how everything
works.
