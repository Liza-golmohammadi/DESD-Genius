import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
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
};

type OrderItem = {
  product_name: string;
  quantity: number;
  line_total: number;
};

type OrderResponse = {
  id: number;
  order_number: string;
  producer_name: string;
  subtotal: string;
  items: OrderItem[];
};

type CheckoutResponse = {
  checkout_id: string;
  orders: OrderResponse[];
};

const s = {
  page: { maxWidth: 700, margin: "0 auto", padding: "32px 16px" } as React.CSSProperties,
  title: { margin: "0 0 8px", fontSize: 28, fontWeight: 800, color: "#1b4332" } as React.CSSProperties,
  sub: { margin: "0 0 24px", color: "#6b7280" } as React.CSSProperties,
  card: { background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 24, marginBottom: 20 } as React.CSSProperties,
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" } as React.CSSProperties,
  row: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14 } as React.CSSProperties,
  totalRow: { display: "flex", justifyContent: "space-between", padding: "14px 0 0", fontSize: 18, fontWeight: 800, color: "#1b4332" } as React.CSSProperties,
  placeBtn: { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#1b4332", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 12 } as React.CSSProperties,
  error: { marginTop: 12, padding: 12, borderRadius: 10, background: "#ffecec", border: "1px solid #ffc9c9", color: "#8a1f1f" } as React.CSSProperties,
  success: { textAlign: "center", padding: "48px 20px" } as React.CSSProperties,
};

const Checkout = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResponse | null>(null);

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<CartData>("/api/orders/cart/");
        setCart(res.data);
        if (!res.data.items.length) navigate("/cart");
      } catch (e: any) {
        setError(e?.message || "Failed to load cart");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    try {
      const res = await api.post<CheckoutResponse>("/api/orders/checkout/", {
        delivery_address: deliveryAddress,
        delivery_date: deliveryDate || null,
        notes,
      });
      setCheckoutResult(res.data);
    } catch (e: any) {
      const data = e?.response?.data;
      setError(data?.error || data?.detail || e?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) return <div style={s.page}><p>Loading…</p></div>;

  if (checkoutResult) {
    const orderCount = checkoutResult.orders.length;
    return (
      <div style={s.page}>
        <div style={s.success as any}>
          <p style={{ fontSize: 64, margin: "0 0 16px" }}>🎉</p>
          <h1 style={{ color: "#1b4332", marginBottom: 8 }}>Order{orderCount > 1 ? "s" : ""} Placed!</h1>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>
            {orderCount > 1
              ? `Your order has been split into ${orderCount} orders (one per producer).`
              : "Your order has been placed successfully."}
          </p>
        </div>

        {/* Show each producer order */}
        {checkoutResult.orders.map((order) => (
          <div
            key={order.order_number}
            style={{ ...s.card, cursor: "pointer" }}
            onClick={() => navigate(`/orders/${order.order_number}`)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1b4332" }}>
                  Order #{order.order_number.slice(0, 8)}
                </div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                  from <strong>{order.producer_name || "Producer"}</strong>
                </div>
              </div>
              <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", background: "#f59e0b", textTransform: "capitalize" }}>
                pending
              </span>
            </div>
            {order.items.map((item, i) => (
              <div key={i} style={s.row}>
                <span>{item.product_name} × {item.quantity}</span>
                <span>£{Number(item.line_total).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ ...s.totalRow, fontSize: 15 }}>
              <span>Subtotal</span>
              <span>£{parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
          <button
            style={{ ...s.placeBtn, width: "auto", padding: "12px 24px" }}
            onClick={() => navigate("/orders")}
          >
            View All Orders
          </button>
          <button
            style={{ ...s.placeBtn, width: "auto", padding: "12px 24px", background: "#fff", color: "#1b4332", border: "1px solid #d1d5db" }}
            onClick={() => navigate("/")}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];

  return (
    <div style={s.page}>
      <h1 style={s.title}>Checkout</h1>
      <p style={s.sub}>Review your order and provide delivery details.</p>

      {/* Order Summary */}
      <div style={s.card}>
        <h3 style={{ margin: "0 0 14px", color: "#1b4332" }}>Order Summary</h3>
        {items.map((item) => (
          <div key={item.id} style={s.row}>
            <span>{item.product_name} × {item.quantity}</span>
            <span>£{item.line_total.toFixed(2)}</span>
          </div>
        ))}
        <div style={s.totalRow}>
          <span>Total</span>
          <span>£{(cart?.total || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Delivery Details */}
      <div style={s.card}>
        <h3 style={{ margin: "0 0 14px", color: "#1b4332" }}>Delivery Details</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>Delivery Address</label>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Enter your delivery address"
            rows={3}
            style={{ ...s.input, resize: "vertical" } as any}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>Preferred Delivery Date</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            style={s.input as any}
          />
        </div>

        <div>
          <label style={s.label}>Order Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions?"
            rows={2}
            style={{ ...s.input, resize: "vertical" } as any}
          />
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <button
        style={{ ...s.placeBtn, opacity: placing ? 0.7 : 1 }}
        disabled={placing}
        onClick={placeOrder}
      >
        {placing ? "Placing Order…" : `Place Order — £${(cart?.total || 0).toFixed(2)}`}
      </button>
    </div>
  );
};

export default Checkout;
