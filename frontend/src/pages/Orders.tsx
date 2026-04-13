import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../utils/api";

type OrderItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: number;
};

type Order = {
  id: number;
  order_number: string;
  producer_name: string;
  status: string;
  subtotal: string;
  delivery_date: string | null;
  items: OrderItem[];
  created_at: string;
};

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  ready: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

const s = {
  page: { maxWidth: 800, margin: "0 auto", padding: "32px 16px" } as React.CSSProperties,
  title: { margin: "0 0 8px", fontSize: 28, fontWeight: 800, color: "#1b4332" } as React.CSSProperties,
  sub: { margin: "0 0 24px", color: "#6b7280" } as React.CSSProperties,
  card: { background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "18px 20px", marginBottom: 14, textDecoration: "none", color: "inherit", display: "block" } as React.CSSProperties,
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } as React.CSSProperties,
  orderNum: { fontWeight: 700, fontSize: 15, color: "#1b4332" } as React.CSSProperties,
  badge: (status: string) => ({ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", background: statusColors[status] || "#6b7280", textTransform: "capitalize" }) as React.CSSProperties,
  items: { fontSize: 13, color: "#6b7280", marginBottom: 6 } as React.CSSProperties,
  bottomRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#9ca3af" } as React.CSSProperties,
  empty: { textAlign: "center", padding: "60px 20px", color: "#9ca3af" } as React.CSSProperties,
  link: { color: "#1b4332", fontWeight: 600, textDecoration: "none" } as React.CSSProperties,
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Order[]>("/api/orders/");
        setOrders(res.data);
      } catch (e: any) {
        setError(e?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={s.page}><p>Loading orders…</p></div>;
  if (error) return <div style={s.page}><p style={{ color: "crimson" }}>{error}</p></div>;

  return (
    <div style={s.page}>
      <h1 style={s.title}>My Orders</h1>
      <p style={s.sub}>{orders.length} order{orders.length !== 1 ? "s" : ""}</p>

      {orders.length === 0 ? (
        <div style={s.empty as any}>
          <p style={{ fontSize: 52, margin: "0 0 16px" }}>📦</p>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No orders yet</p>
          <p style={{ marginBottom: 20 }}>Once you place an order, it will appear here.</p>
          <Link to="/" style={s.link}>← Browse Products</Link>
        </div>
      ) : (
        orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.order_number}`} style={s.card}>
            <div style={s.header}>
              <div>
                <span style={s.orderNum}>
                  Order #{order.order_number.slice(0, 8)}
                </span>
                {order.producer_name && (
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    from <strong>{order.producer_name}</strong>
                  </div>
                )}
              </div>
              <span style={s.badge(order.status)}>{order.status}</span>
            </div>

            <div style={s.items}>
              {order.items.map((item, i) => (
                <span key={item.product_id}>
                  {i > 0 ? ", " : ""}
                  {item.product_name} ×{item.quantity}
                </span>
              ))}
            </div>

            <div style={s.bottomRow}>
              <span>£{parseFloat(order.subtotal).toFixed(2)}</span>
              <span>{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
};

export default Orders;
