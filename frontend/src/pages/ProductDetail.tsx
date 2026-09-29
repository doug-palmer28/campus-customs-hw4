import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProduct, formatPrice } from "../api";
import type { ProductDetail as Detail } from "../types";
import { useCart } from "../context/CartContext";

type LoadState = "loading" | "ready" | "error";

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Detail | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setState("loading");
    fetchProduct(productId)
      .then((data) => {
        setProduct(data);
        setState("ready");
        const firstAvailable = data.sizes.find((s) => s.in_stock);
        setSelectedSize(firstAvailable?.size ?? "");
      })
      .catch(() => setState("error"));
  }, [productId]);

  function handleAdd() {
    if (!product || !selectedSize) return;
    addItem({
      product_id: product.product_id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      quantity: 1,
      image_url: product.image_url,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (state === "loading") {
    return (
      <div className="page">
        <p className="muted">Loading product…</p>
      </div>
    );
  }

  if (state === "error" || !product) {
    return (
      <div className="page">
        <p className="muted">
          We couldn't load this product. It may not exist, or the backend may be
          offline.
        </p>
        <Link to="/products" className="btn btn-outline">
          ← Back to products
        </Link>
      </div>
    );
  }

  return (
    <div
      className="page product-detail"
      data-product-id={product.product_id}
      data-name={product.name}
      data-price={product.price}
    >
      <Link to="/products" className="back-link">
        ← Back to products
      </Link>

      <div className="detail-grid">
        <div className="detail-image">
          <img src={product.image_url} alt={product.name} />
        </div>

        <div className="detail-info">
          <span className="product-type">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="detail-desc">{product.description}</p>

          {product.colors.length > 0 && (
            <p className="detail-colors">
              <strong>Colors:</strong> {product.colors.join(", ")}
            </p>
          )}

          <div className="size-section">
            <h3>Sizes {product.any_in_stock ? "" : "(currently sold out)"}</h3>
            <div className="size-options">
              {product.sizes.map((s) => (
                <button
                  key={s.size}
                  className={
                    "size-chip" +
                    (selectedSize === s.size ? " selected" : "") +
                    (s.in_stock ? "" : " out")
                  }
                  disabled={!s.in_stock}
                  onClick={() => setSelectedSize(s.size)}
                  title={s.in_stock ? `${s.quantity} in stock` : "Out of stock"}
                >
                  {s.size}
                  <small>{s.in_stock ? `${s.quantity} left` : "Sold out"}</small>
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleAdd}
            disabled={!selectedSize || !product.any_in_stock}
          >
            {added ? "Added to cart ✓" : "Add to cart"}
          </button>

          {product.search_tags.length > 0 && (
            <div className="tags">
              {product.search_tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
