import { Link } from "react-router";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="#40916c">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 0-5 8" />
            </svg>
            <div>
              <div className="footer__brand-title">BRISTOL</div>
              <div className="footer__brand-sub">REGIONAL FOOD NETWORK</div>
            </div>
          </div>
          <p className="footer__tagline">
            Connecting Bristol's finest local producers with food lovers who care about quality,
            sustainability, and community.
          </p>
        </div>

        <div>
          <h4 className="footer__heading">Shop</h4>
          <ul className="footer__links">
            <li><Link to="/" className="footer__link">All Products</Link></li>
            <li><Link to="/producers" className="footer__link">Our Producers</Link></li>
            <li><Link to="/cart" className="footer__link">Basket</Link></li>
            <li><Link to="/orders" className="footer__link">My Orders</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer__heading">About</h4>
          <ul className="footer__links">
            <li><Link to="/sustainability" className="footer__link">Sustainability</Link></li>
            <li><Link to="/" className="footer__link">How It Works</Link></li>
            <li><Link to="/" className="footer__link">Food Miles</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer__heading">Account</h4>
          <ul className="footer__links">
            <li><Link to="/login" className="footer__link">Login</Link></li>
            <li><Link to="/signup" className="footer__link">Sign Up</Link></li>
            <li><Link to="/user" className="footer__link">Profile</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <span className="footer__copy">© {new Date().getFullYear()} Bristol Regional Food Network</span>
        <div className="footer__badges">
          <span className="footer__badge">🌱 Local First</span>
          <span className="footer__badge">♻️ Sustainable</span>
        </div>
      </div>
    </footer>
  );
}
