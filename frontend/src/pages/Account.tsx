import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchOrders,
  formatPrice,
  requestReturn,
  submitItemFeedback,
} from "../api";
import { useAuth } from "../context/AuthContext";
import type { Order } from "../types";
import Recommendations from "../components/Recommendations";

const FIT_OPTIONS: { key: string; label: string }[] = [
  { key: "too_small", label: "Too small" },
  { key: "just_right", label: "Just right" },
  { key: "too_big", label: "Too big" },
];

const RETURN_REASONS = [
  "Wrong size",
  "Didn't like the fit",
  "Not as described",
  "Arrived damaged",
  "Changed my mind",
  "Other",
];

export default function Account() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Return modal state
  const [returnItemId, setReturnItemId] = useState<number | null>(null);
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [returnCertified, setReturnCertified] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [returnMessage, setReturnMessage] = useState("");

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetchOrders(token)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Seeds for recommendations: everything they've bought, and the sizes they buy.
  const { seedIds, seedSizes } = useMemo(() => {
    const ids = new Set<string>();
    const sizes = new Set<string>();
    for (const o of orders) {
      for (const it of o.items) {
        ids.add(it.product_id);
        sizes.add(it.size);
      }
    }
    return { seedIds: Array.from(ids), seedSizes: Array.from(sizes) };
  }, [orders]);

  async function onFit(itemId: number, fit: string) {
    if (!token) return;
    await submitItemFeedback(itemId, { fit_feedback: fit }, token);
    load();
  }
  async function onRate(itemId: number, rating: number) {
    if (!token) return;
    await submitItemFeedback(itemId, { rating }, token);
    load();
  }
  function openReturn(itemId: number) {
    setReturnItemId(itemId);
    setReturnReason(RETURN_REASONS[0]);
    setReturnCertified(false);
    setReturnError("");
    setReturnMessage("");
  }

  async function submitReturn() {
    if (!token || returnItemId == null) return;
    if (!returnCertified) {
      setReturnError("Please certify the item is clean and still has its tags.");
      return;
    }
    try {
      const res = await requestReturn(
        returnItemId,
        { reason: returnReason, certified: true },
        token,
      );
      setReturnMessage(
        res.message ??
          "Your return request has been recorded. You'll receive an email with follow-up instructions.",
      );
      load();
    } catch (e) {
      setReturnError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  if (!user) {
    return (
      <div className="page">
        <h1>Your Account</h1>
        <p className="muted">Please log in to see your orders and recommendations.</p>
        <Link to="/login" className="btn btn-primary">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="page account">
      <h1>Hi, {user.first_name ?? "there"} 👋</h1>
      <p className="muted">Your orders, returns, and picks we think you'll love.</p>

      <section>
        <h2>Order history</h2>
        {loading && <p className="muted">Loading your orders…</p>}
        {!loading && orders.length === 0 && (
          <div className="empty-cart">
            <p className="muted">No orders yet.</p>
            <Link to="/products" className="btn btn-primary">
              Start shopping
            </Link>
          </div>
        )}

        {orders.map((order, i) => (
          <div key={order.id} className="order-card">
            <div className="order-head">
              <div>
                {/* Sequential per-shopper number (newest first), not the DB id. */}
                <strong>Order #{orders.length - i}</strong>
                <span className="muted"> · {order.created_at}</span>
              </div>
              <div className="muted">
                {formatPrice(order.total)}
                {order.card_last4 ? ` · card ••••${order.card_last4}` : ""}
              </div>
            </div>

            {order.items.map((it) => (
              <div key={it.id} className="order-item">
                {it.image_url && <img src={it.image_url} alt={it.name} />}
                <div className="order-item-main">
                  <h3>{it.name}</h3>
                  <p className="muted">
                    Size {it.size} · Qty {it.quantity} · {formatPrice(it.price)}
                  </p>

                  <div className="feedback-row">
                    <span className="feedback-label">Fit:</span>
                    {FIT_OPTIONS.map((f) => (
                      <button
                        key={f.key}
                        className={
                          "chip" + (it.fit_feedback === f.key ? " chip-on" : "")
                        }
                        onClick={() => onFit(it.id, f.key)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="feedback-row">
                    <span className="feedback-label">Rating:</span>
                    <span className="stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          className={
                            "star" + ((it.rating ?? 0) >= n ? " star-on" : "")
                          }
                          onClick={() => onRate(it.id, n)}
                          aria-label={`Rate ${n} of 5`}
                        >
                          ★
                        </button>
                      ))}
                    </span>
                  </div>
                </div>

                <div className="order-item-actions">
                  {it.status === "return_requested" ? (
                    <span className="badge badge-return">Return requested</span>
                  ) : (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openReturn(it.id)}
                    >
                      Start return
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      <Recommendations
        seedIds={seedIds}
        sizes={seedSizes}
        title="Recommended for you"
        subtitle="Based on what you've bought — same teams, colleges, and Yale spirit."
        limit={4}
      />

      {returnItemId != null && (
        <div
          className="modal-overlay"
          onClick={() => setReturnItemId(null)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Start a return"
          >
            <div className="modal-head">
              <h2>Start a return</h2>
              <button
                className="chat-close"
                onClick={() => setReturnItemId(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {returnMessage ? (
              <>
                <p>{returnMessage}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setReturnItemId(null)}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                {returnError && <div className="form-error">{returnError}</div>}
                <label>
                  Why are you returning this?
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    {RETURN_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="cert-check">
                  <input
                    type="checkbox"
                    checked={returnCertified}
                    onChange={(e) => setReturnCertified(e.target.checked)}
                  />
                  I certify this item is clean, unworn, and still has its tags.
                </label>
                <button className="btn btn-primary btn-lg" onClick={submitReturn}>
                  Submit return request
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
