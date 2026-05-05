import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import api from "../utils/api";
import "./Cart.css";

type CartItem = {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: string;
  quantity: number;
  line_total: number;
};

type CartData = {
  id: number;
  items: CartItem[];
  total: number;
  updated_at: string;
};

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCart() {
    try {
      const res = await api.get<CartData>("/api/orders/cart/");
      setCart(res.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCart(); }, []);

  async function updateQty(itemId: number, newQty: number) {
    setUpdating(itemId);
    try {
      const res = await api.patch<CartData>(`/api/orders/cart/items/${itemId}/`, { quantity: newQty });
      setCart(res.data);
    } catch { /* ignore */ } finally {
      setUpdating(null);
    }
  }

  async function removeItem(itemId: number) {
    setUpdating(itemId);
    try {
      const res = await api.delete<CartData>(`/api/orders/cart/items/${itemId}/`);
      setCart(res.data);
    } catch { /* ignore */ } finally {
      setUpdating(null);
    }
  }

  if (loading) return <div className="cart-page"><p>Loading cart…</p></div>;
  if (error) return <div className="cart-page"><p style={{ color: "crimson" }}>{error}</p></div>;

  const items = cart?.items || [];

  return (
    <div className="cart-page">
      <h1 className="cart-page__title">Your Basket</h1>
      <p className="cart-page__subtitle">{items.length} item{items.length !== 1 ? "s" : ""} in your basket</p>

      {items.length === 0 ? (
        <div className="cart-page__empty">
          <p className="cart-page__empty-icon">🧺</p>
          <p className="cart-page__empty-title">Your basket is empty</p>
          <p>Browse our fresh produce and add items to get started.</p>
          <Link to="/" className="cart-page__continue-link">← Continue Shopping</Link>
        </div>
      ) : (
        <div className="cart-page__card">
          {items.map((item) => (
            <div key={item.id} className="cart-page__row">
              <div className="cart-page__item-name">{item.product_name}</div>

              <div className="cart-page__qty-wrap">
                <button
                  className="cart-page__qty-btn"
                  disabled={updating === item.id}
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                >−</button>
                <span className="cart-page__qty-val">{item.quantity}</span>
                <button
                  className="cart-page__qty-btn"
                  disabled={updating === item.id}
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                >+</button>
              </div>

              <div className="cart-page__price">£{item.line_total.toFixed(2)}</div>

              <button
                className="cart-page__remove-btn"
                disabled={updating === item.id}
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="cart-page__footer">
            <div className="cart-page__total">Total: £{(cart?.total || 0).toFixed(2)}</div>
            <button className="cart-page__checkout-btn" onClick={() => navigate("/checkout")}>
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="cart-page__back">
          <Link to="/" className="cart-page__continue-link">← Continue Shopping</Link>
        </div>
      )}
    </div>
  );
};

export default Cart;
