import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "../api";
import type { ProductSummary } from "../types";
import ProductCard from "../components/ProductCard";
import Bulldog from "../components/Bulldog";

export default function Home() {
  const [featured, setFeatured] = useState<ProductSummary[]>([]);

  useEffect(() => {
    fetchProducts()
      .then((all) => setFeatured(all.slice(0, 3)))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-eyebrow">Officially Bulldog. Unofficially a class demo.</p>
            <h1>Classic Bulldog pride, made for everyday.</h1>
            <p className="hero-sub">
              From cozy crewnecks to game-day tees, Campus Customs brings Yale spirit
              to your closet. Comfortable staples and standout pieces for students,
              alumni, and fans who bleed blue.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="btn btn-primary">
                Shop the collection
              </Link>
              <Link to="/about" className="btn btn-outline">
                Our story
              </Link>
            </div>
          </div>
          <div className="hero-mascot">
            <Bulldog size={240} />
            <span className="mascot-caption">Handsome Dan says hi! 🐾</span>
          </div>
        </div>
      </section>

      <section className="value-row">
        <div className="value">
          <h3>Everyday comfort</h3>
          <p>Soft cotton basics and relaxed fits you'll actually reach for.</p>
        </div>
        <div className="value">
          <h3>Yale through and through</h3>
          <p>Residential colleges, athletics, and schools — represent your corner of campus.</p>
        </div>
        <div className="value">
          <h3>Built to last</h3>
          <p>Heavyweight fabrics and crisp graphics designed to hold up season after season.</p>
        </div>
      </section>

      <section className="featured">
        <div className="section-head">
          <h2>Fresh from the shop</h2>
          <Link to="/products" className="see-all">
            See all products →
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        ) : (
          <p className="muted">
            Products will appear here once the catalogue database is connected.
          </p>
        )}
      </section>
    </div>
  );
}
