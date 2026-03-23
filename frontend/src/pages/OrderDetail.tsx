import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

type OrderLineItem = {
  id?: number;
  product?: number;
  product_id?: number;
  product_name?: string;
  name?: string;
  quantity: number;
  unit_price?: string | number;
  price?: string | number;
  total_price?: string | number;
  subtotal?: string | number;
};

type ProducerOrder = {
  id?: number;
  producer?: number;
  producer_id?: number;
  producer_name?: string;
  status?: string;
  delivery_date?: string | null;
  subtotal?: string | number;
  total_amount?: string | number;
  items?: OrderLineItem[];
};

type OrderDetailData = {
  id?: number;
  order_number: string;
  status: string;
  total_amount: string | number;
  created_at: string;
  delivery_address?: string;
  producer_orders?: ProducerOrder[];
};

const OrderDetail = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrderDetail = async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("access");

      if (!token) {
        setError("You must be logged in to view this order.");
        setLoading(false);
        return;
      }

      if (!orderNumber) {
        setError("Order number is missing.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://127.0.0.1:8000/api/orders/${orderNumber}/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch order details.");
        }

        const data = await response.json();
        setOrder(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Something went wrong while loading the order.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [orderNumber]);

  const getStatusStyle = (status: string) => {
    const normalized = status.toLowerCase();

    if (normalized === "pending") {
      return {
        backgroundColor: "#e5e7eb",
        color: "#374151",
      };
    }

    if (normalized === "processing") {
      return {
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    if (normalized === "shipped") {
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

    return {
      backgroundColor: "#f3f4f6",
      color: "#111827",
    };
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not provided";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return "Not provided";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (value?: string | number | null) => {
    const numericValue =
      typeof value === "string"
        ? parseFloat(value)
        : typeof value === "number"
        ? value
        : 0;

    return `£${numericValue.toFixed(2)}`;
  };

  const getItemUnitPrice = (item: OrderLineItem) => {
    if (item.unit_price !== undefined) return item.unit_price;
    if (item.price !== undefined) return item.price;
    return 0;
  };

  const getItemTotal = (item: OrderLineItem) => {
    if (item.total_price !== undefined) return item.total_price;
    if (item.subtotal !== undefined) return item.subtotal;

    const unitPrice =
      typeof getItemUnitPrice(item) === "string"
        ? parseFloat(getItemUnitPrice(item) as string)
        : (getItemUnitPrice(item) as number);

    return unitPrice * item.quantity;
  };

  const getProducerSubtotal = (producerOrder: ProducerOrder) => {
    if (producerOrder.subtotal !== undefined) return producerOrder.subtotal;
    if (producerOrder.total_amount !== undefined) return producerOrder.total_amount;

    const items = producerOrder.items || [];
    return items.reduce((sum, item) => {
      const itemTotal = getItemTotal(item);
      const numericItemTotal =
        typeof itemTotal === "string" ? parseFloat(itemTotal) : itemTotal;
      return sum + numericItemTotal;
    }, 0);
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <button style={backButtonStyle} onClick={() => navigate("/orders")}>
          ← Back to Orders
        </button>
        <h1 style={headingStyle}>Order Details</h1>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <button style={backButtonStyle} onClick={() => navigate("/orders")}>
          ← Back to Orders
        </button>
        <h1 style={headingStyle}>Order Details</h1>
        <div style={errorBoxStyle}>{error}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={pageStyle}>
        <button style={backButtonStyle} onClick={() => navigate("/orders")}>
          ← Back to Orders
        </button>
        <h1 style={headingStyle}>Order Details</h1>
        <div style={emptyBoxStyle}>Order not found.</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button style={backButtonStyle} onClick={() => navigate("/orders")}>
        ← Back to Orders
      </button>

      <div style={heroCardStyle}>
        <div>
          <h1 style={headingStyle}>Order {order.order_number}</h1>
          <p style={subTextStyle}>Placed on {formatDateTime(order.created_at)}</p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ marginBottom: 10 }}>
            <span
              style={{
                ...badgeStyle,
                ...getStatusStyle(order.status),
              }}
            >
              {order.status}
            </span>
          </div>
          <div style={totalAmountStyle}>{formatPrice(order.total_amount)}</div>
          <div style={smallMutedStyle}>Total order amount</div>
        </div>
      </div>

      <div style={infoGridStyle}>
        <div style={infoCardStyle}>
          <h3 style={sectionTitleStyle}>Delivery Address</h3>
          <p style={infoTextStyle}>{order.delivery_address || "Not provided"}</p>
        </div>

        <div style={infoCardStyle}>
          <h3 style={sectionTitleStyle}>Order Summary</h3>
          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Order Number</span>
            <span style={summaryValueStyle}>{order.order_number}</span>
          </div>
          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Created</span>
            <span style={summaryValueStyle}>{formatDateTime(order.created_at)}</span>
          </div>
          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Status</span>
            <span style={summaryValueStyle}>{order.status}</span>
          </div>
          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Producer Groups</span>
            <span style={summaryValueStyle}>{order.producer_orders?.length || 0}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <h2 style={sectionHeadingStyle}>Producer Orders</h2>

        {!order.producer_orders || order.producer_orders.length === 0 ? (
          <div style={emptyBoxStyle}>No producer orders found for this order.</div>
        ) : (
          <div style={producerOrdersWrapperStyle}>
            {order.producer_orders.map((producerOrder, index) => (
              <div
                key={producerOrder.id ?? `${producerOrder.producer_id ?? "producer"}-${index}`}
                style={producerCardStyle}
              >
                <div style={producerHeaderStyle}>
                  <div>
                    <h3 style={producerNameStyle}>
                      {producerOrder.producer_name || `Producer ${producerOrder.producer_id ?? ""}`}
                    </h3>
                    <p style={producerMetaStyle}>
                      Delivery date: {formatDate(producerOrder.delivery_date)}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    {producerOrder.status && (
                      <div style={{ marginBottom: 8 }}>
                        <span
                          style={{
                            ...badgeStyle,
                            ...getStatusStyle(producerOrder.status),
                          }}
                        >
                          {producerOrder.status}
                        </span>
                      </div>
                    )}
                    <div style={producerSubtotalStyle}>
                      {formatPrice(getProducerSubtotal(producerOrder))}
                    </div>
                    <div style={smallMutedStyle}>Producer subtotal</div>
                  </div>
                </div>

                <div style={itemsTableWrapperStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Product</th>
                        <th style={thStyle}>Quantity</th>
                        <th style={thStyle}>Unit Price</th>
                        <th style={thStyle}>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {producerOrder.items && producerOrder.items.length > 0 ? (
                        producerOrder.items.map((item, itemIndex) => (
                          <tr
                            key={item.id ?? `${producerOrder.id ?? index}-${itemIndex}`}
                            style={itemRowStyle}
                          >
                            <td style={tdStyle}>
                              {item.product_name || item.name || "Unnamed product"}
                            </td>
                            <td style={tdStyle}>{item.quantity}</td>
                            <td style={tdStyle}>{formatPrice(getItemUnitPrice(item))}</td>
                            <td style={tdStyle}>{formatPrice(getItemTotal(item))}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td style={tdStyle} colSpan={4}>
                            No items found for this producer order.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "40px 20px",
};

const backButtonStyle: React.CSSProperties = {
  marginBottom: "20px",
  backgroundColor: "transparent",
  border: "none",
  color: "#2d6a4f",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};

const headingStyle: React.CSSProperties = {
  fontSize: "34px",
  fontWeight: 700,
  margin: 0,
  color: "#163A2D",
};

const subTextStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#6b7280",
  fontSize: "15px",
};

const heroCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "20px",
  padding: "28px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 600,
  textTransform: "capitalize",
};

const totalAmountStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#163A2D",
};

const smallMutedStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px",
  marginTop: "24px",
};

const infoCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "18px",
  padding: "24px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
};

const sectionTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "14px",
  fontSize: "18px",
  color: "#163A2D",
};

const infoTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  lineHeight: 1.6,
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  padding: "10px 0",
  borderBottom: "1px solid #f3f4f6",
};

const summaryLabelStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
};

const summaryValueStyle: React.CSSProperties = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: 600,
  textAlign: "right",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: "26px",
  fontWeight: 700,
  color: "#163A2D",
  marginBottom: "16px",
};

const producerOrdersWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const producerCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
  overflow: "hidden",
};

const producerHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  padding: "22px 24px 18px",
  borderBottom: "1px solid #f3f4f6",
  flexWrap: "wrap",
};

const producerNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
  color: "#163A2D",
};

const producerMetaStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const producerSubtotalStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 800,
  color: "#163A2D",
};

const itemsTableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
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

const itemRowStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
};

const emptyBoxStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "24px",
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

export default OrderDetail;