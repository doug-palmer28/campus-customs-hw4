import { Link } from "react-router-dom";
import { formatPrice } from "../api";
import type { ProductSummary } from "../types";

export default function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      to={`/products/${product.product_id}`}
      className="product-card"
      data-product-id={product.product_id}
      data-name={product.name}
      data-price={product.price}
    >
      <div className="product-card-image">
        <img src={product.image_url} alt={product.name} loading="lazy" />
      </div>
      <div className="product-card-body">
        <span className="product-type">{product.category}</span>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.short_description}</p>
        <div className="product-card-foot">
          <span className="product-price">{formatPrice(product.price)}</span>
          <span className="product-link">View details →</span>
        </div>
      </div>
    </Link>
  );
}
