import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import api from "../api";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  food_miles_total?: number | string;
  producers: ProducerGroup[];
};

// ─── Outer wrapper ────────────────────────────────────────────────────────────
// When this component mounts, it asks our backend to create a Stripe PaymentIntent.
// The backend calculates the cart total, calls Stripe, and returns a client_secret.
// We then pass that secret into <Elements> so Stripe knows which payment to confirm.
const Checkout = () => {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [intentError, setIntentError] = useState("");

  useEffect(() => {
    const createIntent = async () => {
      try {
        // POST to our backend — backend creates a PaymentIntent with Stripe
        // and returns the client_secret we need to confirm the payment later
        const res = await api.post<{ client_secret: string; publishable_key: string }>(
          "/api/payments/create-intent/"
        );

        // loadStripe initialises the Stripe.js library with our publishable key
        // The publishable key is safe to use in frontend code
        setStripePromise(loadStripe(res.data.publishable_key));
        setClientSecret(res.data.client_secret);
      } catch (err: any) {
        setIntentError(err?.response?.data?.error || "Failed to initialise payment.");
      }
    };

    createIntent();
  }, []);

  if (intentError) {
    return (
      <div style={pageStyle}>
        <p style={{ color: "#b91c1c" }}>{intentError}</p>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div style={pageStyle}>
        <p style={{ color: "#6b7280" }}>Loading checkout...</p>
      </div>
    );
  }

  // <Elements> is Stripe's React context provider.
  // It gives all child components access to useStripe() and useElements() hooks.
  // clientSecret links this session to the specific PaymentIntent on Stripe's servers.
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm clientSecret={clientSecret} />
    </Elements>
  );
};

// ─── Inner form ───────────────────────────────────────────────────────────────
// This component must live inside <Elements> so it can use Stripe hooks.
// useStripe() gives us the Stripe instance to confirm payments.
// useElements() lets us grab the CardElement the user typed into.
const CheckoutForm = ({ clientSecret }: { clientSecret: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);

  const [fullName, setFullName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [producerDeliveryDates, setProducerDeliveryDates] = useState<Record<string, string>>({});

  // Cardholder name is still collected from our form (safe — not the card number)
  const [cardName, setCardName] = useState("");

  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [confirmedCart, setConfirmedCart] = useState<CartSummary | null>(null);
  const [confirmedAddress, setConfirmedAddress] = useState("");
  const [confirmedName, setConfirmedName] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch cart summary and pre-fill delivery address from the user's saved profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Load cart and user profile in parallel
        const [cartRes, profileRes] = await Promise.all([
          api.get<CartSummary>("/api/cart/"),
          api.get<{ first_name: string; last_name: string; address: string; postcode: string; delivery_address: string; phone_number?: string }>("/api/auth/me/"),
        ]);

        const data = cartRes.data;
        setCartSummary(data);

        // Pre-fill delivery fields from the customer's saved profile
        const profile = profileRes.data;
        if (profile.first_name || profile.last_name) {
          setFullName(`${profile.first_name} ${profile.last_name}`.trim());
        }
        if (profile.delivery_address) {
          setStreetAddress(profile.delivery_address);
        } else if (profile.address) {
          setStreetAddress(profile.address);
        }
        if (profile.postcode) setPostcode(profile.postcode);
        if (profile.phone_number) setPhoneNumber(profile.phone_number);

        // Set up an empty delivery date entry for each producer
        const initialDates: Record<string, string> = {};
        data.producers.forEach((producer) => {
          initialDates[String(producer.producer_id)] = "";
        });
        setProducerDeliveryDates(initialDates);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || "Failed to load cart.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Minimum delivery date is 48 hours from now (business rule)
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }, []);

  const formatPrice = (value: number | string | undefined) => {
    const num = typeof value === "string" ? parseFloat(value) : value || 0;
    return `£${num.toFixed(2)}`;
  };

  const handleProducerDateChange = (producerId: number, value: string) => {
    setProducerDeliveryDates((prev) => ({
      ...prev,
      [String(producerId)]: value,
    }));
  };

  const buildDeliveryAddress = () => {
    const lines = [
      fullName.trim(),
      streetAddress.trim(),
      postcode.trim(),
      phoneNumber.trim() ? `Phone: ${phoneNumber.trim()}` : "",
    ].filter(Boolean);
    return lines.join(", ");
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic delivery field validation
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (streetAddress.trim().length < 5) {
      setError("Please enter a valid street address.");
      return;
    }
    if (!postcode.trim()) {
      setError("Postcode is required.");
      return;
    }
    if (!cartSummary || cartSummary.item_count === 0) {
      setError("Your cart is empty.");
      return;
    }
    for (const producer of cartSummary.producers) {
      if (!producerDeliveryDates[String(producer.producer_id)]) {
        setError("Please select a delivery date for each producer.");
        return;
      }
    }
    if (!cardName.trim()) {
      setError("Cardholder name is required.");
      return;
    }

    // Make sure Stripe has loaded before we try to use it
    if (!stripe || !elements) {
      setError("Stripe is not loaded yet. Please wait a moment and try again.");
      return;
    }

    // Get a reference to the CardElement component the user typed into
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card details not found. Please refresh the page.");
      return;
    }

    const fullDeliveryAddress = buildDeliveryAddress();

    try {
      setSubmitting(true);

      // ── Step 1: Confirm the card payment with Stripe ─────────────────────
      // This sends card details directly to Stripe's servers — they never
      // touch our Django backend. Stripe checks the card, charges the amount
      // from the PaymentIntent, and returns a result.
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              // Billing name helps with fraud detection
              name: cardName,
            },
          },
        }
      );

      if (stripeError) {
        // Stripe declined the card or something went wrong on their end
        setError(stripeError.message || "Payment failed. Please check your card details.");
        return;
      }

      // ── Step 2: Create the order in our backend ───────────────────────────
      // Payment succeeded — now we tell Django to create the order.
      // We send the payment_intent_id so our backend can verify with Stripe
      // that the payment actually went through (and wasn't spoofed).
      const res = await api.post("/api/orders/checkout/", {
        delivery_address: fullDeliveryAddress,
        producer_delivery_dates: producerDeliveryDates,
        payment_intent_id: paymentIntent!.id,
      });

      setConfirmedCart(cartSummary);
      setConfirmedAddress(fullDeliveryAddress);
      setConfirmedName(fullName.trim());
      setOrderNumber(res.data?.order_number || "Order created");
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading / empty / confirmation states ────────────────────────────────

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>Checkout</h1>
        <p style={mutedTextStyle}>Loading your checkout details...</p>
      </div>
    );
  }

  if (!loading && (!cartSummary || cartSummary.item_count === 0) && !orderNumber) {
    return (
      <div style={pageStyle}>
        <div style={emptyBoxStyle}>
          <h1 style={headingStyle}>Checkout</h1>
          <p style={mutedTextStyle}>Your cart is empty.</p>
          <button onClick={() => navigate("/")} style={buttonStyle} type="button">
            Go Shopping
          </button>
        </div>
      </div>
    );
  }

  if (orderNumber && confirmedCart) {
    return (
      <div style={pageStyle}>
        <div style={confirmationCardStyle}>
          <h1 style={headingStyle}>Order Confirmed</h1>
          <p style={confirmationTextStyle}>
            Thank you{confirmedName ? `, ${confirmedName}` : ""}. Your order has been placed
            successfully and payment was taken via Stripe.
          </p>

          <div style={confirmationInfoBoxStyle}>
            <div style={summaryRowStyle}>
              <span>Order number</span>
              <strong>{orderNumber}</strong>
            </div>
            <div style={summaryRowStyle}>
              <span>Total paid</span>
              <strong>{formatPrice(confirmedCart.grand_total)}</strong>
            </div>
            <div style={summaryRowStyle}>
              <span>Total items</span>
              <strong>{confirmedCart.item_count}</strong>
            </div>
          </div>

          <div style={confirmationSectionStyle}>
            <h2 style={sectionHeadingStyle}>Delivery details</h2>
            <p style={mutedTextStyle}>{confirmedAddress}</p>
            <p style={deliveryNoteStyle}>
              Your order will be ready within 48 hours. Delivery dates may vary by producer.
            </p>
          </div>

          <div style={confirmationSectionStyle}>
            <h2 style={sectionHeadingStyle}>Items ordered</h2>
            {confirmedCart.producers.map((producer) => (
              <div key={producer.producer_id} style={confirmationProducerBoxStyle}>
                <h3 style={producerTitleStyle}>
                  {producer.producer_name || `Producer #${producer.producer_id}`}
                </h3>
                <p style={producerSubStyle}>
                  Producer subtotal: {formatPrice(producer.producer_subtotal)}
                </p>
                <div style={confirmationItemsListStyle}>
                  {producer.items.map((item) => (
                    <div key={`${producer.producer_id}-${item.product_id}`} style={confirmationItemRowStyle}>
                      <span>
                        {item.product_name} × {item.quantity}
                      </span>
                      <strong>{formatPrice(item.line_total)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={confirmationActionsStyle}>
            <button onClick={() => navigate("/orders")} style={buttonStyle} type="button">
              Go to Orders
            </button>
            <button onClick={() => navigate("/")} style={secondaryButtonStyle} type="button">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main checkout form ───────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={topBlockStyle}>
        <h1 style={headingStyle}>Checkout</h1>
        <p style={mutedTextStyle}>
          Enter your delivery details and pay securely with Stripe.
        </p>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={checkoutLayoutStyle}>
        <form onSubmit={handleCheckout} style={formCardStyle}>

          {/* ── Delivery details ── */}
          <div style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>Delivery Details</h2>
            <div style={inputGridStyle}>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 07..."
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Street Address</label>
              <textarea
                placeholder="House number, street name, area..."
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                style={textareaStyle}
              />
            </div>
            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Postcode</label>
              <input
                type="text"
                placeholder="e.g. BS1 5AH"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* ── Delivery dates per producer ── */}
          <div style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>Delivery Preferences</h2>
            <p style={helperTextStyle}>
              Choose a preferred delivery date for each producer. Earliest available:{" "}
              <strong>{minDate}</strong>.
            </p>
            <div style={producerDatesWrapStyle}>
              {cartSummary?.producers.map((producer) => (
                <div key={producer.producer_id} style={producerDateCardStyle}>
                  <div>
                    <h3 style={producerDateTitleStyle}>
                      {producer.producer_name || `Producer #${producer.producer_id}`}
                    </h3>
                    <p style={producerSubStyle}>
                      Subtotal: {formatPrice(producer.producer_subtotal)}
                    </p>
                  </div>
                  <input
                    type="date"
                    min={minDate}
                    value={producerDeliveryDates[String(producer.producer_id)] || ""}
                    onChange={(e) => handleProducerDateChange(producer.producer_id, e.target.value)}
                    style={dateInputStyle}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Stripe payment section ── */}
          {/* CardElement renders a secure iframe hosted by Stripe.               */}
          {/* Card details typed here go directly to Stripe — not to our server. */}
          <div style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>Payment</h2>
            <p style={helperTextStyle}>
              Secured by Stripe. Your card details are never sent to our servers.
            </p>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Cardholder Name</label>
              <input
                type="text"
                placeholder="Name as it appears on your card"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Card Details</label>
              {/* CardElement is Stripe's secure card input — it handles number, expiry, and CVC */}
              <div style={cardElementWrapStyle}>
                <CardElement
                  options={{
                    // Hide the postcode field — we collect it separately above
                    hidePostalCode: true,
                    style: {
                      base: {
                        fontSize: "16px",
                        color: "#163A2D",
                        fontFamily: "sans-serif",
                        "::placeholder": { color: "#9ca3af" },
                      },
                      invalid: { color: "#b91c1c" },
                    },
                  }}
                />
              </div>
            </div>

            <p style={testCardNoteStyle}>
              Test card: <strong>4242 4242 4242 4242</strong> · Any future date · Any 3-digit CVC
            </p>
          </div>

          <button disabled={submitting || !stripe} style={buttonStyle} type="submit">
            {submitting ? "Processing Payment..." : `Pay ${formatPrice(cartSummary?.grand_total || 0)}`}
          </button>
        </form>

        {/* ── Order summary sidebar ── */}
        <aside style={summaryBoxStyle}>
          <h2 style={summaryTitleStyle}>Order Summary</h2>
          {cartSummary?.producers.map((producer) => (
            <div key={producer.producer_id} style={summaryProducerBlockStyle}>
              <h3 style={summaryProducerTitleStyle}>
                {producer.producer_name || `Producer #${producer.producer_id}`}
              </h3>
              {producer.items.map((item) => (
                <div key={`${producer.producer_id}-${item.product_id}`} style={summaryItemRowStyle}>
                  <div>
                    <div style={summaryItemNameStyle}>{item.product_name}</div>
                    <div style={summaryItemMetaStyle}>Qty: {item.quantity}</div>
                  </div>
                  <strong>{formatPrice(item.line_total)}</strong>
                </div>
              ))}
              <div style={summaryProducerSubtotalStyle}>
                <span>Producer subtotal</span>
                <strong>{formatPrice(producer.producer_subtotal)}</strong>
              </div>
            </div>
          ))}

          <div style={dividerStyle} />

          <div style={summaryRowStyle}>
            <span>Total items</span>
            <strong>{cartSummary?.item_count || 0}</strong>
          </div>
          <div style={summaryRowStyle}>
            <span>Producers</span>
            <strong>{cartSummary?.producers.length || 0}</strong>
          </div>
          {cartSummary?.food_miles_total && Number(cartSummary.food_miles_total) > 0 && (
            <div style={summaryRowStyle}>
              <span>Total food miles</span>
              <strong style={{ color: "#2d6a4f" }}>
                {Number(cartSummary.food_miles_total).toFixed(1)} mi
              </strong>
            </div>
          )}
          <div style={summaryTotalStyle}>
            <span>Grand total</span>
            <strong>{formatPrice(cartSummary?.grand_total || 0)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" };
const topBlockStyle: React.CSSProperties = { marginBottom: "24px" };
const checkoutLayoutStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" };
const formCardStyle: React.CSSProperties = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "18px", padding: "24px", boxShadow: "0 8px 24px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "20px" };
const sectionBlockStyle: React.CSSProperties = { border: "1px solid #eef2f7", borderRadius: "14px", padding: "18px", background: "#fcfcfc" };
const inputGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" };
const fieldWrapStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle: React.CSSProperties = { fontWeight: 600, color: "#163A2D", fontSize: "14px" };
const inputStyle: React.CSSProperties = { padding: "12px 14px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none" };
const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: "100px", resize: "vertical" };
const dateInputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "14px" };
const cardElementWrapStyle: React.CSSProperties = { padding: "14px", borderRadius: "10px", border: "1px solid #d1d5db", background: "#fff" };
const testCardNoteStyle: React.CSSProperties = { fontSize: "13px", color: "#6b7280", marginTop: "8px", background: "#f9fafb", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e5e7eb" };
const buttonStyle: React.CSSProperties = { padding: "14px 18px", background: "#2d6a4f", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: 700, fontSize: "15px" };
const secondaryButtonStyle: React.CSSProperties = { padding: "12px 16px", borderRadius: "12px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 600, color: "#374151" };
const headingStyle: React.CSSProperties = { fontSize: "38px", fontWeight: 700, margin: "0 0 8px 0", color: "#163A2D" };
const sectionHeadingStyle: React.CSSProperties = { fontSize: "22px", fontWeight: 700, margin: "0 0 14px 0", color: "#163A2D" };
const mutedTextStyle: React.CSSProperties = { color: "#6b7280", margin: 0, lineHeight: 1.6 };
const helperTextStyle: React.CSSProperties = { color: "#6b7280", margin: "0 0 14px 0", fontSize: "14px", lineHeight: 1.5 };
const errorStyle: React.CSSProperties = { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "12px 14px", marginBottom: "16px", borderRadius: "12px" };
const producerDatesWrapStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "12px" };
const producerDateCardStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px 16px", background: "#fff" };
const producerDateTitleStyle: React.CSSProperties = { margin: "0 0 4px 0", fontSize: "17px", color: "#163A2D" };
const producerTitleStyle: React.CSSProperties = { margin: "0 0 4px 0", fontSize: "18px", color: "#163A2D" };
const producerSubStyle: React.CSSProperties = { margin: 0, color: "#6b7280", fontSize: "14px" };
const summaryBoxStyle: React.CSSProperties = { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "18px", padding: "24px", boxShadow: "0 8px 24px rgba(0,0,0,0.05)", position: "sticky", top: "100px" };
const summaryTitleStyle: React.CSSProperties = { marginTop: 0, marginBottom: "18px", color: "#163A2D", fontSize: "28px" };
const summaryProducerBlockStyle: React.CSSProperties = { paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid #eef2f7" };
const summaryProducerTitleStyle: React.CSSProperties = { margin: "0 0 10px 0", fontSize: "18px", color: "#163A2D" };
const summaryItemRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "10px" };
const summaryItemNameStyle: React.CSSProperties = { fontWeight: 600, color: "#111827" };
const summaryItemMetaStyle: React.CSSProperties = { fontSize: "13px", color: "#6b7280", marginTop: "3px" };
const summaryProducerSubtotalStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", marginTop: "10px", color: "#374151", fontSize: "14px", fontWeight: 600 };
const summaryRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", marginBottom: "12px", color: "#374151" };
const summaryTotalStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: "22px", fontWeight: 700, color: "#163A2D", marginTop: "18px" };
const dividerStyle: React.CSSProperties = { height: "1px", backgroundColor: "#e5e7eb", margin: "16px 0" };
const emptyBoxStyle: React.CSSProperties = { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", boxShadow: "0 8px 24px rgba(0,0,0,0.05)" };
const confirmationCardStyle: React.CSSProperties = { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "18px", padding: "28px", boxShadow: "0 8px 24px rgba(0,0,0,0.05)" };
const confirmationTextStyle: React.CSSProperties = { color: "#374151", fontSize: "16px", lineHeight: 1.6, marginTop: 0 };
const confirmationInfoBoxStyle: React.CSSProperties = { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "18px", margin: "20px 0" };
const confirmationSectionStyle: React.CSSProperties = { marginTop: "24px" };
const deliveryNoteStyle: React.CSSProperties = { marginTop: "10px", color: "#166534", background: "#ecfdf3", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "12px 14px" };
const confirmationProducerBoxStyle: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px", marginBottom: "14px", background: "#fcfcfc" };
const confirmationItemsListStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" };
const confirmationItemRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px" };
const confirmationActionsStyle: React.CSSProperties = { display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" };

export default Checkout;
