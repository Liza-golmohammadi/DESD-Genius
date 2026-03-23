import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import api from "../api";

type CartItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total?: number | string;
};

type ProducerGroup = {
  producer_id: number;
  producer_name?: string;
  producer_subtotal: number | string;
  items: CartItem[];
};

type CartSummary = {
  cart_id?: number;
  item_count: number;
  grand_total: number | string;
  producers: ProducerGroup[];
};

const Checkout = () => {
  const navigate = useNavigate();

  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [producerDeliveryDates, setProducerDeliveryDates] = useState<Record<string, string>>({});
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchCartSummary = async () => {
      try {
        const response = await api.get<CartSummary>("/api/cart/");
        const data = response.data;

        setCartSummary(data);

        const initialDates: Record<string, string> = {};
        if (Array.isArray(data?.producers)) {
          data.producers.forEach((producer) => {
            initialDates[String(producer.producer_id)] = "";
          });
        }
        setProducerDeliveryDates(initialDates);
        setError("");
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || "Failed to load cart summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchCartSummary();
  }, []);

  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().split("T")[0];
  }, []);

  const formatPrice = (value: string | number | undefined) => {
    const numericValue = typeof value === "string" ? parseFloat(value) : value || 0;
    return `£${numericValue.toFixed(2)}`;
  };

  const handleProducerDateChange = (producerId: number, value: string) => {
    setProducerDeliveryDates((prev) => ({
      ...prev,
      [String(producerId)]: value,
    }));
  };

  const validateMockPayment = () => {
    if (!cardName.trim()) return "Cardholder name is required.";
    if (cardNumber.replace(/\s/g, "").length < 12) return "Card number looks too short.";
    if (!expiry.trim()) return "Expiry date is required.";
    if (cvv.trim().length < 3) return "CVV must be at least 3 digits.";
    return "";
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (deliveryAddress.trim().length < 10) {
      setError("Delivery address must be at least 10 characters.");
      return;
    }

    if (!cartSummary || cartSummary.item_count === 0) {
      setError("Your basket is empty.");
      return;
    }

    for (const producer of cartSummary.producers) {
      const dateValue = producerDeliveryDates[String(producer.producer_id)];
      if (!dateValue) {
        setError(
          `Please select a delivery date for producer ${
            producer.producer_name || producer.producer_id
          }.`
        );
        return;
      }
    }

    const paymentValidationError = validateMockPayment();
    if (paymentValidationError) {
      setError(paymentValidationError);
      return;
    }

    const payload = {
      delivery_address: deliveryAddress,
      producer_delivery_dates: producerDeliveryDates,
    };

    try {
      setSubmitting(true);

      const response = await api.post("/api/orders/checkout/", payload);
      const data = response.data;

      setSuccessMessage("Order placed successfully.");
      navigate("/orders", {
        state: {
          checkoutSuccess: true,
          orderNumber: data?.order_number,
        },
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>Checkout</h1>
        <p>Loading checkout details...</p>
      </div>
    );
  }

  if (error && !cartSummary) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>Checkout</h1>
        <div style={errorBoxStyle}>{error}</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={topSectionStyle}>
        <div>
          <h1 style={headingStyle}>Checkout</h1>
          <p style={subTextStyle}>
            Confirm your delivery details, choose producer delivery dates, and complete the mock payment step.
          </p>
        </div>
      </div>

      {successMessage && <div style={successBoxStyle}>{successMessage}</div>}
      {error && <div style={errorBoxStyle}>{error}</div>}

      <div style={layoutStyle}>
        <form onSubmit={handleCheckout} style={leftColumnStyle}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>1. Delivery Address</h2>
            <label style={labelStyle}>Full delivery address</label>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter your full delivery address"
              style={textareaStyle}
              rows={4}
            />
            <p style={hintStyle}>
              Please provide a clear delivery address. Minimum length: 10 characters.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>2. Delivery Dates by Producer</h2>
            <p style={hintStyle}>
              Each producer requires at least 48 hours notice. Choose a delivery date for every producer.
            </p>

            {cartSummary?.producers?.map((producer) => (
              <div key={producer.producer_id} style={producerBoxStyle}>
                <div style={producerHeaderStyle}>
                  <div>
                    <h3 style={producerNameStyle}>
                      {producer.producer_name || `Producer #${producer.producer_id}`}
                    </h3>
                    <p style={producerSubStyle}>
                      Subtotal: {formatPrice(producer.producer_subtotal)}
                    </p>
                  </div>
                  <div style={{ minWidth: 210 }}>
                    <label style={labelStyle}>Delivery date</label>
                    <input
                      type="date"
                      min={minDate}
                      value={producerDeliveryDates[String(producer.producer_id)] || ""}
                      onChange={(e) => handleProducerDateChange(producer.producer_id, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={itemsListStyle}>
                  {producer.items.map((item) => (
                    <div key={`${producer.producer_id}-${item.product_id}`} style={itemRowStyle}>
                      <span>{item.product_name}</span>
                      <span>
                        {item.quantity} × {formatPrice(item.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>3. Mock Payment</h2>
            <p style={hintStyle}>
              This is a simulated payment step for coursework purposes. No real card details are processed.
            </p>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Cardholder name</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="John Smith"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Card number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Expiry</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="12/28"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>CVV</label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  style={inputStyle}
                />
              </div>
            </div>
          </section>

          <button type="submit" disabled={submitting} style={submitButtonStyle}>
            {submitting ? "Placing order..." : "Place Order"}
          </button>
        </form>

        <aside style={rightColumnStyle}>
          <section style={summaryCardStyle}>
            <h2 style={sectionTitleStyle}>Order Summary</h2>

            <div style={summaryRowStyle}>
              <span>Total items</span>
              <strong>{cartSummary?.item_count || 0}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Producers</span>
              <strong>{cartSummary?.producers?.length || 0}</strong>
            </div>

            <div style={dividerStyle} />

            {cartSummary?.producers?.map((producer) => (
              <div key={producer.producer_id} style={summaryProducerRowStyle}>
                <span>{producer.producer_name || `Producer #${producer.producer_id}`}</span>
                <strong>{formatPrice(producer.producer_subtotal)}</strong>
              </div>
            ))}

            <div style={dividerStyle} />

            <div style={grandTotalRowStyle}>
              <span>Grand total</span>
              <strong>{formatPrice(cartSummary?.grand_total || 0)}</strong>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "40px 20px",
};

const topSectionStyle: React.CSSProperties = {
  marginBottom: "24px",
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

const rightColumnStyle: React.CSSProperties = {
  position: "sticky",
  top: "100px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "24px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
};

const summaryCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "24px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  marginTop: 0,
  marginBottom: "16px",
  color: "#163A2D",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
};

const hintStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const producerBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "16px",
  marginBottom: "16px",
  backgroundColor: "#fafdfb",
};

const producerHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "16px",
  marginBottom: "14px",
};

const producerNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  color: "#163A2D",
};

const producerSubStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  color: "#6b7280",
  fontSize: "14px",
};

const itemsListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const itemRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 0",
  borderBottom: "1px solid #eef2f7",
  fontSize: "14px",
};

const submitButtonStyle: React.CSSProperties = {
  padding: "14px 20px",
  borderRadius: "12px",
  border: "none",
  backgroundColor: "#2d6a4f",
  color: "#fff",
  fontWeight: 700,
  fontSize: "15px",
  cursor: "pointer",
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
  color: "#374151",
};

const summaryProducerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "10px",
  gap: "12px",
  fontSize: "14px",
  color: "#374151",
};

const grandTotalRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "18px",
  fontWeight: 700,
  color: "#163A2D",
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  backgroundColor: "#e5e7eb",
  margin: "16px 0",
};

const errorBoxStyle: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  padding: "14px 16px",
  borderRadius: "12px",
  marginBottom: "16px",
};

const successBoxStyle: React.CSSProperties = {
  backgroundColor: "#ecfdf5",
  color: "#166534",
  border: "1px solid #bbf7d0",
  padding: "14px 16px",
  borderRadius: "12px",
  marginBottom: "16px",
};

export default Checkout;