import { useState } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <div className="page info-page">
      <h1>Contact Us</h1>
      <p>
        Questions about our merch, an order, or sizing? Send us a note and we'll
        get back to you. You can also reach the team during regular business
        hours.
      </p>

      <ul className="contact-details">
        <li>
          <strong>Email:</strong> hello@campuscustoms.example
        </li>
        <li>
          <strong>Phone:</strong> (203) 555-0134
        </li>
        <li>
          <strong>Hours:</strong> Mon–Fri, 9am–5pm ET
        </li>
      </ul>

      {sent ? (
        <div className="callout">
          Thanks for reaching out! (This is a demo, so no message was actually
          sent.)
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <label>
            Your name
            <input required placeholder="Handsome Dan" />
          </label>
          <label>
            Email
            <input required type="email" placeholder="you@example.com" />
          </label>
          <label>
            Message
            <textarea required rows={4} placeholder="How can we help?" />
          </label>
          <button type="submit" className="btn btn-primary btn-lg">
            Send message
          </button>
        </form>
      )}
    </div>
  );
}
