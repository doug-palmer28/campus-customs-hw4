import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCoupons,
  fetchTriviaQuestions,
  submitTrivia,
} from "../api";
import { useAuth } from "../context/AuthContext";
import type { Coupon, TriviaQuestion, TriviaResult } from "../types";
import Bulldog from "../components/Bulldog";

export default function Trivia() {
  const { user, token } = useAuth();
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<TriviaResult | null>(null);
  const [existingCoupon, setExistingCoupon] = useState<Coupon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTriviaQuestions().then(setQuestions).catch(() => setQuestions([]));
  }, []);

  useEffect(() => {
    if (token) {
      fetchCoupons(token).then((cs) => setExistingCoupon(cs[0] ?? null));
    }
  }, [token]);

  async function handleSubmit() {
    if (!token) return;
    if (Object.keys(answers).length < questions.length) {
      setError("Please answer all three questions.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const r = await submitTrivia(answers, token);
      setResult(r);
      if (r.coupon) setExistingCoupon(r.coupon);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setAnswers({});
    setResult(null);
  }

  if (!user) {
    return (
      <div className="page">
        <h1>Yale Trivia Challenge</h1>
        <p className="muted">
          Log in to play — answer three Yale trivia questions and win a coupon!
        </p>
        <Link to="/login" className="btn btn-primary">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="page trivia">
      <div className="trivia-head">
        <Bulldog size={70} />
        <div>
          <h1>Yale Trivia Challenge</h1>
          <p className="muted">
            Get all three right — each harder than the last — and earn{" "}
            <strong>10% off</strong>. One game coupon at a time.
          </p>
        </div>
      </div>

      {existingCoupon && !result && (
        <div className="callout">
          You already have an active coupon: <strong>{existingCoupon.code}</strong>{" "}
          ({existingCoupon.discount_percent}% off). Use it at checkout — you can win a
          new one after you use it.
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {!result && (
        <>
          {questions.map((q, i) => (
            <div key={q.id} className="trivia-q">
              <h3>
                <span className="trivia-diff">{q.difficulty}</span> Q{i + 1}.{" "}
                {q.question}
              </h3>
              <div className="trivia-options">
                {q.options.map((opt, idx) => (
                  <label key={idx} className="trivia-option">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === idx}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Checking…" : "Submit answers"}
          </button>
        </>
      )}

      {result && result.passed && result.coupon && (
        <div className="trivia-win">
          <h2>🎉 Boola Boola! You got all three!</h2>
          <p>Here's your one-time coupon for {result.coupon.discount_percent}% off:</p>
          <div className="coupon-code">{result.coupon.code}</div>
          <p className="muted">
            Enter it in the coupon box at checkout. (You can hold one game coupon at
            a time — win another after you use this one.)
          </p>
          <Link to="/cart" className="btn btn-primary">
            Go to cart
          </Link>
        </div>
      )}

      {result && !result.passed && (
        <div className="trivia-lose">
          <h2>So close!</h2>
          <p>
            You got {result.correct_count} of {result.total} right. Give it another
            shot — you've got this.
          </p>
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
