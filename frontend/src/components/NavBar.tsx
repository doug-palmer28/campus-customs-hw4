import { NavLink, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Products", end: false },
  { to: "/about", label: "About Us", end: false },
];

export default function NavBar() {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" aria-label="Campus Customs home">
          <span className="brand-mark">Y</span>
          <span className="brand-text">
            <strong>Campus Customs</strong>
            <small>Yale Bulldog Blue</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <NavLink to="/account" className="nav-greeting">
                Hi, {user.first_name ?? "there"}
              </NavLink>
              <button className="btn btn-outline btn-sm" onClick={logout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link">
                Log In
              </NavLink>
              <NavLink to="/create-account" className="btn btn-outline btn-sm">
                Create Account
              </NavLink>
            </>
          )}
          <NavLink to="/cart" className="cart-link" aria-label="View cart">
            Cart
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </NavLink>
        </div>
      </div>
    </header>
  );
}
