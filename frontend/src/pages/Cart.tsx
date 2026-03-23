import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import api from "../api";

type CartItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

type ProducerGroup = {
  producer_id: number;
  producer_name: string;
  producer_subtotal: number | string;
  items: CartItem[];
};

type CartSummary = {
  cart_id?: number;
  item_count: number;
  grand_total: number | string;
  producers: ProducerGroup[];
};

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchCart = async () => {
    try {
      const response = await api.get<CartSummary>("/api/cart/");
      setCart(response.data);
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load cart.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const formatPrice = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `£${num.toFixed(2)}`;
  };

  const updateQuantity = async (productId: number, newQuantity: number) => {
    try {
      setUpdatingId(productId);

      await api.patch(`/api/cart/items/${productId}/`, {
        quantity: newQuantity,
      });

      await fetchCart();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to update item quantity.");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (productId: number) => {
    try {
      setUpdatingId(productId);

      await api.delete(`/api/cart/items/${productId}/`);

      await fetchCart();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to remove item.");
    } finally {
      setUpdatingId(null);
    }
  };

  const clearCart = async () => {
    try {
      await api.delete("/api/cart/");
      await fetchCart();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to clear cart.");
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>Your Basket</h1>
        <p>Loading your basket...</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={topRowStyle}>
        <div>
          <h1 style={headingStyle}>Your Basket</h1>
          <p style={subTextStyle}>Review items from local producers before checkout.</p>
        </div>

        {cart && cart.item_count > 0 && (
          <button onClick={clearCart} style={secondaryButtonStyle}>
            Clear Basket
          </button>
        )}
      </div>

      {error && <div style={errorBoxStyle}>{error}</div>}

      {!cart || cart.item_count === 0 ? (
        <div style={emptyBoxStyle}>
          <h2 style={{ marginTop: 0 }}>Your basket is empty</h2>
          <p>Add some products first, then return here to review your order.</p>
          <NavLink to="/" style={primaryLinkStyle}>
            Continue Shopping
          </NavLink>
        </div>
      ) : (
        <div style={layoutStyle}>
          <div style={leftColumnStyle}>
            {cart.producers.map((producer) => (
              <div key={producer.producer_id} style={cardStyle}>
                <div style={producerHeaderStyle}>
                  <div>
                    <h2 style={producerTitleStyle}>{producer.producer_name}</h2>
                    <p style={producerSubStyle}>
                      Producer subtotal: {formatPrice(producer.producer_subtotal)}
                    </p>
                  </div>
                </div>

                <div style={itemsWrapStyle}>
                  {producer.items.map((item) => (
                    <div key={item.product_id} style={itemRowStyle}>
                      <div style={{ flex: 1 }}>
                        <h3 style={itemNameStyle}>{item.product_name}</h3>
                        <p style={itemMetaStyle}>Unit price: {formatPrice(item.unit_price)}</p>
                        <p style={itemMetaStyle}>Line total: {formatPrice(item.line_total)}</p>
                      </div>

                      <div style={controlsWrapStyle}>
                        <div style={qtyControlsStyle}>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            disabled={updatingId === item.product_id}
                            style={qtyButtonStyle}
                          >
                            -
                          </button>

                          <span style={qtyValueStyle}>{item.quantity}</span>

                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            disabled={updatingId === item.product_id}
                            style={qtyButtonStyle}
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.product_id)}
                          disabled={updatingId === item.product_id}
                          style={removeButtonStyle}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside style={summaryBoxStyle}>
            <h2 style={summaryTitleStyle}>Order Summary</h2>

            <div style={summaryRowStyle}>
              <span>Total items</span>
              <strong>{cart.item_count}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Producers</span>
              <strong>{cart.producers.length}</strong>
            </div>

            <div style={dividerStyle} />

            <div style={summaryTotalStyle}>
              <span>Grand total</span>
              <strong>{formatPrice(cart.grand_total)}</strong>
            </div>

            <button onClick={() => navigate("/checkout")} style={checkoutButtonStyle}>
              Proceed to Checkout
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "40px 20px",
};

const topRowStyle: React.CSSProperties = {
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
  color: "#6b7280",
  margin: 0,
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "24px",
  alignItems: "start",
};

const leftColumnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
};

const producerHeaderStyle: React.CSSProperties = {
  marginBottom: "14px",
};

const producerTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#163A2D",
  fontSize: "22px",
};

const producerSubStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  color: "#6b7280",
};

const itemsWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const itemRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "16px 0",
  borderTop: "1px solid #eef2f7",
};

const itemNameStyle: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: "18px",
  color: "#111827",
};

const itemMetaStyle: React.CSSProperties = {
  margin: "4px 0",
  color: "#6b7280",
  fontSize: "14px",
};

const controlsWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "10px",
};

const qtyControlsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const qtyButtonStyle: React.CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  background: "#fff",
  cursor: "pointer",
  fontSize: "18px",
};

const qtyValueStyle: React.CSSProperties = {
  minWidth: "24px",
  textAlign: "center",
  fontWeight: 700,
};

const removeButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: 600,
};

const summaryBoxStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
  position: "sticky",
  top: "100px",
};

const summaryTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "18px",
  color: "#163A2D",
  fontSize: "24px",
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
  color: "#374151",
};

const summaryTotalStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "20px",
  fontWeight: 700,
  color: "#163A2D",
  marginBottom: "20px",
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  backgroundColor: "#e5e7eb",
  margin: "16px 0",
};

const checkoutButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: "12px",
  border: "none",
  backgroundColor: "#2d6a4f",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "15px",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const emptyBoxStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "32px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: "12px",
  padding: "12px 16px",
  borderRadius: "10px",
  backgroundColor: "#2d6a4f",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  padding: "14px 16px",
  borderRadius: "12px",
  marginBottom: "16px",
};

export default Cart;