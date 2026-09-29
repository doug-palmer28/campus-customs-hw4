import { Link } from "react-router-dom";
import { DanFetch } from "./DanExtras";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-cols">
          <div>
            <h4>Campus Customs</h4>
            <p>Yale-inspired spirit wear for students, alumni, and fans.</p>
            <div className="footer-dan">
              <DanFetch size={54} />
              <span>Handsome Dan says thanks for visiting!</span>
            </div>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li>
                <Link to="/products?category=Hoodies">Hoodies</Link>
              </li>
              <li>
                <Link to="/products?category=Crewnecks">Crewnecks</Link>
              </li>
              <li>
                <Link to="/products?category=T-Shirts">T-Shirts</Link>
              </li>
              <li>
                <Link to="/products?category=Quarter-Zips">Quarter-Zips</Link>
              </li>
              <li>
                <Link to="/products?category=Jackets">Jackets</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Help</h4>
            <ul>
              <li>
                <Link to="/shipping">Shipping &amp; Returns</Link>
              </li>
              <li>
                <Link to="/size-guide">Size Guide</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
              <li>
                <Link to="/trivia">Yale Trivia (win 10% off)</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Small, subtle CYA disclaimer — this is a class project, not a real store. */}
        <p className="footer-disclaimer">
          This is not a real store. It is a student test project built for a class
          and is not affiliated with, endorsed by, or connected to Yale University
          or Campus Customs. No real orders are processed.
        </p>
      </div>
    </footer>
  );
}
