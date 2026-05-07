import { useEffect, useState } from "react";
import { Star, AlertCircle } from "lucide-react";
import api from "../api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Review = {
  id: number;
  product: number;
  product_name: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  customer: number;
  customer_email: string;
  customer_name: string;
  created_at: string;
  updated_at: string;
};

type ReviewSummary = {
  product_id: number;
  product_name: string;
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  reviews: Review[];
};

type ReviewFormData = {
  rating: number;
  title: string;
  comment: string;
  producer_order_id: number;
};

const C = {
  green: "#2d6a4f",
  accent: "#40916c",
  light: "#e8f5e9",
  stone900: "#1c1917",
  stone600: "#57534e",
  stone500: "#78716c",
  stone400: "#a8a29e",
  stone200: "#e7e5e4",
  stone100: "#f5f5f4",
};

function StarRating({ rating, setRating }: { rating: number; setRating: (r: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((r) => (
        <button
          key={r}
          onClick={() => setRating(r)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Star
            size={32}
            fill={r <= rating ? C.green : "none"}
            color={r <= rating ? C.green : C.stone200}
            style={{ transition: "all 0.15s" }}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ReviewsSection({ productId, userId }: { productId: number; userId: number | undefined }) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 5,
    title: "",
    comment: "",
    producer_order_id: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  function fetchReviews() {
    setLoading(true);
    api
      .get<ReviewSummary>(`/api/reviews/product/${productId}/`)
      .then((r) => setSummary(r.data))
      .catch((err) => setError("Failed to load reviews"))
      .finally(() => setLoading(false));
  }

  function handleShowForm() {
    setShowForm(true);
    fetchDeliveredOrders();
  }

  function fetchDeliveredOrders() {
    api
      .get("/api/orders/my-orders/")
      .then((r) => {
        const delivered = (r.data || []).filter((o: any) =>
          o.producer_orders?.some((po: any) => po.status === "delivered" && po.items?.some((i: any) => i.product === productId))
        );
        setOrders(delivered);
      })
      .catch(() => setOrders([]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      await api.post("/api/reviews/reviews/", {
        product: productId,
        producer_order_id: formData.producer_order_id,
        rating: formData.rating,
        title: formData.title,
        comment: formData.comment,
      });

      setSubmitSuccess(true);
      setFormData({ rating: 5, title: "", comment: "", producer_order_id: 0 });
      setShowForm(false);

      setTimeout(() => {
        fetchReviews();
      }, 500);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.[0] || "Failed to submit review";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: C.stone500 }}>
        Loading reviews...
      </div>
    );

  if (!summary) return null;

  const ratingDist = summary.rating_distribution || {};

  return (
    <div style={{ marginTop: 80, borderTop: `1px solid ${C.stone200}`, paddingTop: 40 }}>
      <h2
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: C.stone900,
          marginBottom: 32,
        }}
      >
        Customer Reviews
      </h2>

      {/* Summary Stats */}
      {summary.total_reviews > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 40, marginBottom: 48 }}>
          {/* Left: Rating overview */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 48, fontWeight: 300, color: C.green }}>
                {summary.average_rating.toFixed(1)}
              </span>
              <span style={{ fontSize: 14, color: C.stone500, fontWeight: 600 }}>
                / 5.0
              </span>
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i <= Math.round(summary.average_rating) ? C.green : C.stone200}
                  color={i <= Math.round(summary.average_rating) ? C.green : C.stone200}
                />
              ))}
            </div>
            <p style={{ fontSize: 12, color: C.stone500, margin: 0 }}>
              Based on {summary.total_reviews} review{summary.total_reviews !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Right: Distribution bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDist[String(stars) as "1" | "2" | "3" | "4" | "5"] || 0;
              const pct = summary.total_reviews > 0 ? (count / summary.total_reviews) * 100 : 0;
              return (
                <div key={stars} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, minWidth: 30, color: C.stone600, fontWeight: 600 }}>
                    {stars}★
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: C.stone100,
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: C.green,
                        width: `${pct}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, minWidth: 30, color: C.stone500, fontWeight: 500 }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write a Review Button */}
      {userId && !showForm && (
        <button
          onClick={handleShowForm}
          style={{
            marginBottom: 40,
            padding: "12px 24px",
            background: C.green,
            color: "#fff",
            border: "none",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.opacity = "1";
          }}
        >
          Write a Review
        </button>
      )}

      {/* Review Form */}
      {showForm && userId && (
        <div
          style={{
            marginBottom: 40,
            padding: 24,
            background: C.stone50,
            borderRadius: 16,
            border: `1px solid ${C.stone200}`,
          }}
        >
          <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: C.stone900 }}>
            Share Your Experience
          </h3>

          {submitSuccess && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                background: "#ecfdf3",
                color: "#166534",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ✓ Review submitted! Thank you for your feedback.
            </div>
          )}

          {submitError && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Select delivered order */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14, color: C.stone900 }}>
                Select Order
              </label>
              <select
                required
                value={formData.producer_order_id}
                onChange={(e) =>
                  setFormData({ ...formData, producer_order_id: parseInt(e.target.value) })
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${C.stone200}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                <option value="">-- Choose an order --</option>
                {orders.map((order) =>
                  (order.producer_orders || [])
                    .filter((po: any) => po.status === "delivered")
                    .map((po: any) => (
                      <option key={po.id} value={po.id}>
                        Order {order.order_number} · {formatDate(po.delivery_date)}
                      </option>
                    ))
                )}
              </select>
              {orders.length === 0 && (
                <p style={{ marginTop: 8, fontSize: 13, color: C.stone500 }}>
                  No delivered orders with this product found
                </p>
              )}
            </div>

            {/* Rating */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 12, fontSize: 14, color: C.stone900 }}>
                Rating
              </label>
              <StarRating rating={formData.rating} setRating={(r) => setFormData({ ...formData, rating: r })} />
            </div>

            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14, color: C.stone900 }}>
                Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Fresh and delicious!"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${C.stone200}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Comment */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14, color: C.stone900 }}>
                Your Review
              </label>
              <textarea
                required
                placeholder="Share your experience with this product..."
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${C.stone200}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "10px 24px",
                  background: submitting ? C.stone400 : C.green,
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: "10px 24px",
                  background: C.stone200,
                  color: C.stone900,
                  border: "none",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {summary.total_reviews === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            background: C.stone50,
            borderRadius: 16,
            color: C.stone500,
          }}
        >
          <p style={{ margin: 0, fontSize: 16 }}>
            No reviews yet. Be the first to share your experience!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {summary.reviews.map((review) => (
            <div
              key={review.id}
              style={{
                padding: 24,
                background: C.stone50,
                borderRadius: 16,
                border: `1px solid ${C.stone200}`,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={16}
                        fill={i <= review.rating ? C.green : C.stone200}
                        color={i <= review.rating ? C.green : C.stone200}
                      />
                    ))}
                  </div>
                  <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: C.stone900 }}>
                    {review.title}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: C.stone500,
                      fontWeight: 500,
                    }}
                  >
                    by {review.customer_name} • {formatDate(review.created_at)}
                  </p>
                </div>
                {review.is_verified_purchase && (
                  <span
                    style={{
                      padding: "4px 12px",
                      background: "#ecfdf3",
                      color: "#166534",
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 999,
                    }}
                  >
                    ✓ Verified Purchase
                  </span>
                )}
              </div>

              {/* Comment */}
              <p
                style={{
                  margin: 0,
                  color: C.stone600,
                  lineHeight: 1.6,
                  fontSize: 14,
                }}
              >
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
