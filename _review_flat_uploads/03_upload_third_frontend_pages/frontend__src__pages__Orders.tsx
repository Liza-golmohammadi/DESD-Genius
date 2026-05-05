import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "../api";

type ProducerOrder = {
  id?: number;
  items?: unknown[];
};

type OrderItem = {
  id?: number;
  order_number: string;
  status: string;
  total_amount: string | number;
  created_at: string;
  producer_orders?: ProducerOrder[];
};

const Orders = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get<OrderItem[]>("/api/orders/");
        const data = response.data;
        setOrders(Array.isArray(data) ? data : []);
        setError("");
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || "Failed to fetch orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusStyle = (status: string): React.CSSProperties => {
    const normalized = status.toLowerCase();

    if (normalized === "pending") {
      return {
        backgroundColor: "#e5e7eb",
        color: "#374151",
      };
    }

    if (normalized === "confirmed") {
      return {
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    if (normalized === "ready") {
      return {
        backgroundColor: "#fef3c7",
        color: "#b45309",
      };
    }

    if (normalized === "delivered") {
      return {
        backgroundColor: "#dcfce7",
        color: "#15803d",
      };
    }

    if (normalized === "cancelled") {
      return {
        backgroundColor: "#fee2e2",
        color: "#b91c1c",
      };
    }

    return {
      backgroundColor: "#f3f4f6",
      color: "#111827",
    };
  };

  const formatStatus = (status: string) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (value: string | number) => {
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    return `£${numericValue.toFixed(2)}`;
  };

  const getItemCount = (order: OrderItem) => {
    if (!order.producer_orders || !Array.isArray(order.producer_orders)) {
      return 0;
    }

    return order.producer_orders.reduce((total, producerOrder) => {
      const items = Array.isArray(producerOrder.items) ? producerOrder.items.length : 0;
      return total + items;
    }, 0);
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>My Orders</h1>
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>My Orders</h1>
        <div style={errorBoxStyle}>{error}</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={headingStyle}>My Orders</h1>
          <p style={subTextStyle}>Track your recent and past marketplace orders.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={emptyBoxStyle}>
          <h2 style={{ marginTop: 0 }}>No orders yet</h2>
          <p style={{ marginBottom: 0 }}>
            Once you complete checkout, your order history will appear here.
          </p>
        </div>
      ) : (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Order Number</th>
                <th style={thStyle}>Date Placed</th>
                <th style={thStyle}>Items</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const itemCount = getItemCount(order);

                return (
                  <tr
                    key={order.order_number}
                    style={trStyle}
                    onClick={() => navigate(`/orders/${order.order_number}`)}
                  >
                    <td style={tdStyle}>{order.order_number}</td>
                    <td style={tdStyle}>{formatDate(order.created_at)}</td>
                    <td style={tdStyle}>{itemCount}</td>
                    <td style={tdStyle}>{formatPrice(order.total_amount)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          ...badgeStyle,
                          ...getStatusStyle(order.status),
                        }}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "40px 20px",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
};

const headingStyle: React.CSSProperties = {
  fontSize: "36px",
  fontWeight: 700,
  marginBottom: "8px",
  color: "#163A2D",
};

const subTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: "16px",
};

const tableWrapperStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "16px",
  backgroundColor: "#f9fafb",
  color: "#374151",
  fontSize: "14px",
  fontWeight: 700,
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
  padding: "16px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "15px",
  color: "#111827",
};

const trStyle: React.CSSProperties = {
  cursor: "pointer",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 600,
  textTransform: "capitalize",
};

const emptyBoxStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "32px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
};

const errorBoxStyle: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  padding: "16px",
  borderRadius: "12px",
};

export default Orders;