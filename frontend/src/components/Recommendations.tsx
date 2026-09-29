import { useEffect, useState } from "react";
import { fetchRecommendations } from "../api";
import type { ProductSummary } from "../types";
import ProductCard from "./ProductCard";
import Bulldog from "./Bulldog";

// Renders affinity-matched, complementary, in-stock recommendations for a set of
// seed products (cart contents or purchase history). Renders nothing if there are
// no seeds or no recommendations.
export default function Recommendations({
  seedIds,
  sizes = [],
  title,
  subtitle,
  limit = 4,
}: {
  seedIds: string[];
  sizes?: string[];
  title: string;
  subtitle?: string;
  limit?: number;
}) {
  const [items, setItems] = useState<ProductSummary[]>([]);

  const seedKey = seedIds.join(",");
  const sizeKey = sizes.join(",");
  useEffect(() => {
    let active = true;
    if (seedIds.length === 0) {
      setItems([]);
      return;
    }
    fetchRecommendations(seedIds, sizes, limit)
      .then((r) => active && setItems(r))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, sizeKey, limit]);

  if (items.length === 0) return null;

  return (
    <section className="recommendations">
      <div className="section-head">
        <div className="rec-title">
          <Bulldog size={40} />
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="product-grid">
        {items.map((p) => (
          <ProductCard key={p.product_id} product={p} />
        ))}
      </div>
    </section>
  );
}
