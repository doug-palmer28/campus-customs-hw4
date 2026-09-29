import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProducts } from "../api";
import type { ProductSummary } from "../types";
import ProductCard from "../components/ProductCard";
import { useChatResults } from "../context/ChatResultsContext";

type LoadState = "loading" | "ready" | "error";

// Price buckets tuned to the catalogue's price points ($32–$98).
const PRICE_BUCKETS: Record<string, (p: number) => boolean> = {
  all: () => true,
  "under-50": (p) => p < 50,
  "50-75": (p) => p >= 50 && p < 75,
  "75-plus": (p) => p >= 75,
};
const PRICE_LABELS: Record<string, string> = {
  all: "Any price",
  "under-50": "Under $50",
  "50-75": "$50 – $75",
  "75-plus": "$75 & up",
};

type SortKey = "featured" | "price-asc" | "price-desc";

export default function Products() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [searchParams, setSearchParams] = useSearchParams();
  const chat = useChatResults();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [price, setPrice] = useState("all");
  const [color, setColor] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("featured");

  useEffect(() => {
    fetchProducts()
      .then((data) => {
        setProducts(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  // Allow deep links like /products?category=Hoodies (used by the footer/home).
  useEffect(() => {
    const c = searchParams.get("category");
    if (c) setCategory(c);
  }, [searchParams]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const colors = useMemo(() => {
    // Filter by the garment's actual primary color (consolidated), not text/accents.
    const set = new Set<string>();
    products.forEach((p) => set.add(p.primary_color));
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const priceTest = PRICE_BUCKETS[price] ?? PRICE_BUCKETS.all;

    const list = products.filter((p) => {
      const matchesCategory = category === "all" || p.category === category;
      const matchesPrice = priceTest(p.price);
      const matchesColor = color === "all" || p.primary_color === color;
      const matchesStock = !inStockOnly || p.any_in_stock;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q) ||
        p.colors.some((c) => c.toLowerCase().includes(q));
      return (
        matchesCategory &&
        matchesPrice &&
        matchesColor &&
        matchesStock &&
        matchesQuery
      );
    });

    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    // "featured" keeps the backend's name-sorted order.
    return list;
  }, [products, query, category, price, color, inStockOnly, sort]);

  function updateCategory(next: string) {
    setCategory(next);
    // Keep the URL in sync so the filter is shareable/bookmarkable.
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("category");
    else params.set("category", next);
    setSearchParams(params, { replace: true });
  }

  function clearFilters() {
    setQuery("");
    setPrice("all");
    setColor("all");
    setInStockOnly(false);
    setSort("featured");
    updateCategory("all");
  }

  const activeFilters =
    (category !== "all" ? 1 : 0) +
    (price !== "all" ? 1 : 0) +
    (color !== "all" ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (query.trim() ? 1 : 0);

  // When the chat assistant has matched products, the page shows exactly those
  // items instead of the full catalogue + filters, until the shopper clears it.
  if (chat.active) {
    return (
      <div className="page products">
        <div className="chat-results-banner">
          <div>
            <span className="chat-results-eyebrow">🐾 From your chat</span>
            <h1>{chat.products.length} matches for the assistant</h1>
            {chat.query && (
              <p className="muted">You asked: “{chat.query}”</p>
            )}
          </div>
          <button className="btn btn-outline" onClick={chat.clear}>
            Show all products
          </button>
        </div>

        {chat.products.length > 0 ? (
          <div className="product-grid">
            {chat.products.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        ) : (
          <p className="muted">
            The assistant didn't match any products. Try asking a different way, or
            show all products.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="page products">
      <div className="section-head">
        <h1>Products</h1>
        <span className="muted">{filtered.length} items</span>
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />

        <label className="filter-field">
          <span>Category</span>
          <select
            value={category}
            onChange={(e) => updateCategory(e.target.value)}
            aria-label="Filter by category"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Price</span>
          <select
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Filter by price"
          >
            {Object.keys(PRICE_BUCKETS).map((k) => (
              <option key={k} value={k}>
                {PRICE_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Color</span>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Filter by color"
          >
            {colors.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All colors" : c}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort products"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </label>

        <label className="filter-check">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          In stock only
        </label>

        {activeFilters > 0 && (
          <button className="link-btn" onClick={clearFilters}>
            Clear filters ({activeFilters})
          </button>
        )}
      </div>

      {state === "loading" && <p className="muted">Loading products…</p>}
      {state === "error" && (
        <p className="muted">
          Couldn't load products. Make sure the backend is running and the
          catalogue database is in place.
        </p>
      )}
      {state === "ready" && filtered.length === 0 && (
        <p className="muted">No products match your filters.</p>
      )}

      {state === "ready" && filtered.length > 0 && (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard key={p.product_id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
