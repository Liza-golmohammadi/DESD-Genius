import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import useAuth from "../context/useAuth";
import "./Navbar.css";

type NavbarProps = {
  cartCount?: number;
};

export default function Navbar({ cartCount = 0 }: NavbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");

  const isAuthed = !!localStorage.getItem("access");
  const isProducer = !!user?.producer_profile;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(searchInput.trim())}`);
  }

  return (
    <div className="navbar">
      <div className="navbar__inner">
        <div className="navbar__left">
          <NavLink to="/" className="navbar__brand">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="#40916c">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 0-5 8" />
            </svg>
            <div>
              <div className="navbar__brand-title">BRISTOL</div>
              <div className="navbar__brand-sub">REGIONAL FOOD NETWORK</div>
            </div>
          </NavLink>

          <nav className="navbar__nav">
            <NavLink to="/" className={({ isActive }) => `navbar__pill${isActive ? " active" : ""}`} end>
              Home
            </NavLink>

            {isAuthed && (
              <NavLink to="/producers" className={({ isActive }) => `navbar__pill${isActive ? " active" : ""}`}>
                Our Producers
              </NavLink>
            )}

            {isAuthed && isProducer && (
              <NavLink to="/producer/dashboard" className={({ isActive }) => `navbar__pill${isActive ? " active" : ""}`}>
                Dashboard
              </NavLink>
            )}

            {isAuthed && !isProducer && (
              <NavLink to="/orders" className={({ isActive }) => `navbar__pill${isActive ? " active" : ""}`}>
                My Orders
              </NavLink>
            )}

            <NavLink to="/sustainability" className={({ isActive }) => `navbar__pill${isActive ? " active" : ""}`}>
              Sustainability
            </NavLink>
          </nav>
        </div>

        <form onSubmit={handleSearch} className="navbar__search">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search fresh produce, farms, or artisan goods..."
            className="navbar__search-input"
          />
          <button type="submit" className="navbar__search-btn">
            &#128269;
          </button>
        </form>

        <div className="navbar__right">
          <NavLink to="/cart" className="navbar__cart-link">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2}>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && <span className="navbar__cart-badge">{cartCount}</span>}
          </NavLink>

          {isAuthed && user?.email && <span className="navbar__email">{user.email}</span>}

          {!isAuthed ? (
            <>
              <NavLink to="/login" className="navbar__auth-btn">Login</NavLink>
              <NavLink to="/signup" className="navbar__auth-btn navbar__auth-btn--primary">Sign up</NavLink>
            </>
          ) : (
            <NavLink to="/logout" className="navbar__auth-btn">Logout</NavLink>
          )}
        </div>
      </div>
    </div>
  );
}
