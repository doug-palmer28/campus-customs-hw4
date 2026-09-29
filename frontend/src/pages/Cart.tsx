import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createOrder, formatPrice, validateCoupon } from "../api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import Bulldog from "../components/Bulldog";
import Recommendations from "../components/Recommendations";
import type { Coupon } from "../types";

export default function Cart() {
  const { items, subtotal, updateQuantity, removeItem, clear } = useCart();
  const { user, token } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placed, setPlaced] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState("");

  const shipping = subtotal > 0 ? 6.0 : 0;
  const discount = coupon ? (subtotal * coupon.discount_percent) / 100 : 0;
  const total = subtotal - discount + shipping;

  // Lock the page behind the checkout modal so scrolling stays inside the card.
  useEffect(() => {
    if (checkoutOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [checkoutOpen]);

  // Seeds for "complete the look": what's in the cart, and the sizes chosen.
  const seedIds = Array.from(new Set(items.map((i) => i.product_id)));
  const seedSizes = Array.from(new Set(items.map((i) => i.size)));

  async function applyCoupon() {
    if (!token) {
      setCouponMsg("Log in to use a coupon.");
      return;
    }
    if (!couponInput.trim()) return;
    try {
      const c = await validateCoupon(couponInput.trim(), token);
      setCoupon(c);
      setCouponMsg(`Applied ${c.discount_percent}% off!`);
    } catch (e) {
      setCoupon(null);
      setCouponMsg(e instanceof Error ? e.message : "That coupon isn't valid.");
    }
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    // For a signed-in shopper, record the order so it shows in their history.
    // The card number is sent for the demo but stored only hashed + last4.
    if (user && token) {
      try {
        await createOrder(
          items.map((i) => ({
            product_id: i.product_id,
            name: i.name,
            size: i.size,
            quantity: i.quantity,
            price: i.price,
          })),
          cardNumber || "4242424242424242",
          token,
          coupon?.code ?? null,
        );
      } catch {
        /* even if saving fails, don't block the demo confirmation */
      }
    }
    setCheckoutOpen(false); // release the body scroll-lock before showing confirmation
    setPlaced(true);
    clear();
  }

  if (placed) {
    return (
      <div className="page cart">
        <div className="order-confirmation">
          <h1>Thanks for your (pretend) order! 🎉</h1>
          <p>
            This is a class demo, so no payment was taken and nothing will ship.
            But in a real store, your Bulldog gear would be on its way.
          </p>
          <Link to="/products" className="btn btn-primary">
            Keep shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page cart">
      <h1>Your Cart</h1>

      {items.length === 0 ? (
        <div className="empty-cart">
          <Bulldog size={150} />
          <p className="muted">Your cart is empty — but Handsome Dan is ready to help you fill it.</p>
          <Link to="/products" className="btn btn-primary">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => (
              <div key={`${item.product_id}-${item.size}`} className="cart-item">
                <img src={item.image_url} alt={item.name} />
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p className="muted">Size: {item.size}</p>
                  <p className="cart-item-price">{formatPrice(item.price)}</p>
                </div>
                <div className="cart-item-controls">
                  <label>
                    Qty
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(
                          item.product_id,
                          item.size,
                          Math.max(1, Number(e.target.value)),
                        )
                      }
                    />
                  </label>
                  <button
                    className="link-btn"
                    onClick={() => removeItem(item.product_id, item.size)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <h2>Order summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{formatPrice(shipping)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setCheckoutOpen(true)}
            >
              Checkout
            </button>
            <p className="muted cart-trivia-link">
              🐾 <Link to="/trivia">Play Yale Trivia</Link> for a chance at 10% off.
            </p>
          </aside>
        </div>
      )}

      {items.length > 0 && (
        <Recommendations
          seedIds={seedIds}
          sizes={seedSizes}
          title="Complete the look"
          subtitle="In-stock picks in your sizes that pair well with your cart."
          limit={4}
        />
      )}

      {checkoutOpen && (
        <div
          className="modal-overlay"
          onClick={() => setCheckoutOpen(false)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Checkout"
          >
            <div className="modal-head">
              <h2>Checkout</h2>
              <button
                className="chat-close"
                onClick={() => setCheckoutOpen(false)}
                aria-label="Close checkout"
              >
                ×
              </button>
            </div>
            <p className="muted">
              Demo checkout — please don't enter real card details. Nothing is
              charged or stored.
            </p>
            <form className="checkout-form" onSubmit={placeOrder}>
              <label>
                Full name
                <input required placeholder="Handsome Dan" />
              </label>
              <label>
                Email
                <input required type="email" placeholder="you@example.com" />
              </label>
              <label>
                Shipping address
                <input required placeholder="123 Elm St, New Haven, CT" />
              </label>
              <label>
                Card number (demo)
                <input
                  required
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
              </label>

              <div className="coupon-box">
                <label>
                  Coupon code
                  <div className="coupon-input-row">
                    <input
                      placeholder="e.g. BOOLA-7K2Q9M"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                    />
                    <button type="button" className="btn btn-outline btn-sm" onClick={applyCoupon}>
                      Apply
                    </button>
                  </div>
                </label>
                {couponMsg && <p className="coupon-msg">{couponMsg}</p>}
                <p className="muted coupon-hint">
                  No coupon? <Link to="/trivia">Play Yale Trivia</Link> to win 10% off.
                </p>
              </div>

              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {coupon && (
                <div className="summary-row">
                  <span>Discount ({coupon.discount_percent}%)</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button type="submit" className="btn btn-primary btn-lg">
                Place order
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
