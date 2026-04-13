import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import api from "../utils/api";

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

const s = {
  page: { maxWidth: 800, margin: "0 auto", padding: "32px 16px" } as React.CSSProperties,
  title: { margin: "0 0 8px", fontSize: 28, fontWeight: 800, color: "#1b4332" } as React.CSSProperties,
  sub: { margin: "0 0 24px", color: "#6b7280" } as React.CSSProperties,
  card: { background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" } as React.CSSProperties,
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f3f4f6", gap: 12 } as React.CSSProperties,
  name: { fontWeight: 700, fontSize: 15, flex: 1 } as React.CSSProperties,
  price: { color: "#374151", minWidth: 70, textAlign: "right" } as React.CSSProperties,
  qtyWrap: { display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  qtyBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties,
  qtyVal: { minWidth: 24, textAlign: "center", fontWeight: 700 } as React.CSSProperties,
  removeBtn: { background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "4px 8px" } as React.CSSProperties,
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px", background: "#f9fafb" } as React.CSSProperties,
  totalLabel: { fontWeight: 700, fontSize: 18, color: "#1b4332" } as React.CSSProperties,
  checkoutBtn: { padding: "12px 28px", borderRadius: 10, border: "none", background: "#1b4332", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" } as React.CSSProperties,
  empty: { textAlign: "center", padding: "60px 20px", color: "#9ca3af" } as React.CSSProperties,
  link: { color: "#1b4332", fontWeight: 600, textDecoration: "none" } as React.CSSProperties,
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

  if (loading) return <div style={s.page}><p>Loading cart…</p></div>;
  if (error) return <div style={s.page}><p style={{ color: "crimson" }}>{error}</p></div>;

  const items = cart?.items || [];

  return (
    <div style={s.page}>
      <h1 style={s.title}>Your Basket</h1>
      <p style={s.sub}>{items.length} item{items.length !== 1 ? "s" : ""} in your basket</p>

      {items.length === 0 ? (
        <div style={s.empty as any}>
          <p style={{ fontSize: 52, margin: "0 0 16px" }}>🧺</p>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Your basket is empty</p>
          <p style={{ marginBottom: 20 }}>Browse our fresh produce and add items to get started.</p>
          <Link to="/" style={s.link}>← Continue Shopping</Link>
        </div>
      ) : (
        <div style={s.card}>
          {items.map((item) => (
            <div key={item.id} style={s.row}>
              <div style={s.name}>{item.product_name}</div>

              <div style={s.qtyWrap}>
                <button
                  style={s.qtyBtn}
                  disabled={updating === item.id}
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                >−</button>
                <span style={s.qtyVal as any}>{item.quantity}</span>
                <button
                  style={s.qtyBtn}
                  disabled={updating === item.id}
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                >+</button>
              </div>

              <div style={s.price as any}>
                £{item.line_total.toFixed(2)}
              </div>

              <button
                style={s.removeBtn}
                disabled={updating === item.id}
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>
          ))}

          <div style={s.footer}>
            <div style={s.totalLabel}>Total: £{(cart?.total || 0).toFixed(2)}</div>
            <button style={s.checkoutBtn} onClick={() => navigate("/checkout")}>
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Link to="/" style={s.link}>← Continue Shopping</Link>
        </div>
      )}
    </div>
  );
};

export default Cart;
