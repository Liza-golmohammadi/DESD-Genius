import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
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
  status: string;
  producer_name: string;
  delivery_address: string;
  delivery_date: string | null;
  notes: string;
  subtotal: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  ready: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

const s = {
  page: { maxWidth: 700, margin: "0 auto", padding: "32px 16px" } as React.CSSProperties,
  card: { background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 24, marginBottom: 20 } as React.CSSProperties,
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } as React.CSSProperties,
  title: { margin: 0, fontSize: 22, fontWeight: 800, color: "#1b4332" } as React.CSSProperties,
  badge: (status: string) => ({ padding: "6px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", background: statusColors[status] || "#6b7280", textTransform: "capitalize" }) as React.CSSProperties,
  meta: { display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 12px", fontSize: 14 } as React.CSSProperties,
  metaLabel: { color: "#9ca3af", fontWeight: 600 } as React.CSSProperties,
  row: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14 } as React.CSSProperties,
  totalRow: { display: "flex", justifyContent: "space-between", padding: "14px 0 0", fontSize: 18, fontWeight: 800, color: "#1b4332" } as React.CSSProperties,
  back: { color: "#1b4332", fontWeight: 600, textDecoration: "none", fontSize: 14 } as React.CSSProperties,
};

const OrderDetail = () => {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Order>(`/api/orders/${orderNumber}/`);
        setOrder(res.data);
      } catch (e: any) {
        setError(e?.response?.status === 404 ? "Order not found" : e?.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderNumber]);

  if (loading) return <div style={s.page}><p>Loading order…</p></div>;
  if (error) return <div style={s.page}><p style={{ color: "crimson" }}>{error}</p><Link to="/orders" style={s.back}>← Back to Orders</Link></div>;
  if (!order) return <div style={s.page}><p>Order not found.</p></div>;

  return (
    <div style={s.page}>
      <Link to="/orders" style={s.back}>← Back to Orders</Link>

      {/* Order Header */}
      <div style={{ ...s.card, marginTop: 16 }}>
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Order #{order.order_number.slice(0, 8)}</h1>
            {order.producer_name && (
              <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>
                from <strong style={{ color: "#1b4332" }}>{order.producer_name}</strong>
              </div>
            )}
          </div>
          <span style={s.badge(order.status)}>{order.status}</span>
        </div>

        <div style={s.meta}>
          <span style={s.metaLabel}>Placed</span>
          <span>{new Date(order.created_at).toLocaleString()}</span>

          <span style={s.metaLabel}>Last Updated</span>
          <span>{new Date(order.updated_at).toLocaleString()}</span>

          {order.delivery_date && (
            <>
              <span style={s.metaLabel}>Delivery Date</span>
              <span>{new Date(order.delivery_date).toLocaleDateString()}</span>
            </>
          )}

          {order.delivery_address && (
            <>
              <span style={s.metaLabel}>Address</span>
              <span>{order.delivery_address}</span>
            </>
          )}

          {order.notes && (
            <>
              <span style={s.metaLabel}>Notes</span>
              <span>{order.notes}</span>
            </>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={s.card}>
        <h3 style={{ margin: "0 0 12px", color: "#1b4332" }}>Items</h3>
        {order.items.map((item, idx) => (
          <div key={idx} style={s.row}>
            <span>
              {item.product_name}
              <span style={{ color: "#9ca3af", marginLeft: 6 }}>× {item.quantity}</span>
            </span>
            <span style={{ fontWeight: 600 }}>£{item.line_total.toFixed(2)}</span>
          </div>
        ))}
        <div style={s.totalRow}>
          <span>Total</span>
          <span>£{parseFloat(order.subtotal).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
