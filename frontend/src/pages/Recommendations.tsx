import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../api";
import useAuth from "../context/useAuth";

/* ── Types ─────────────────────────────────────────────────────────── */
type RecItem = {
  product_id: number;
  product_name: string;
  price: string;
  producer_name: string;
  reason: string;
  quality_grade: string | null;
  quality_boosted: boolean;
  has_discount: boolean;
  discount_percentage: number;
  score?: number;
};

type QuickReorderItem = {
  product_id: number;
  product_name: string;
  price: string;
  times_ordered: number;
  available: boolean;
  stock_level: number;
};

type SurpriseItem = {
  product_id: number;
  product_name: string;
  label: string;
  reason: string;
  quality_grade: string;
} | null;

type SurplusDeal = {
  product_id: number;
  product_name: string;
  price: string;
  producer_name: string;
  discount_percentage: number;
  grade: string;
};

type RecsPayload = {
  recommendations: RecItem[];
  quick_reorder: QuickReorderItem[];
  surprise: SurpriseItem;
  surplus_deals: SurplusDeal[];
  personalisation_score: number;
  products_boosted: number;
  products_suppressed: number;
  algorithm: string;
  quality_filter_active: boolean;
};

/* ── Constants ─────────────────────────────────────────────────────── */
const GRADE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  A: { bg: "#d1fae5", fg: "#065f46", border: "#6ee7b7" },
  B: { bg: "#fef3c7", fg: "#92400e", border: "#fcd34d" },
  C: { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
};

const REASON_ICONS: Record<string, string> = {
  "Grade A": "⭐",
  "similar tastes": "👥",
  "purchase history": "🛒",
};

function getReasonIcon(reason: string): string {
  for (const [key, icon] of Object.entries(REASON_ICONS)) {
    if (reason.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "💡";
}

function getReasonLabel(reason: string): string {
  if (reason.toLowerCase().includes("grade a")) return "Quality Boosted";
  if (reason.toLowerCase().includes("similar tastes")) return "Collaborative";
  if (reason.toLowerCase().includes("purchase history")) return "Your History";
  return "AI Pick";
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: "100vh",
    background: "#f8faf8",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  } as React.CSSProperties,
  hero: {
    background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%)",
    padding: "48px 24px 40px",
    position: "relative" as const,
    overflow: "hidden" as const,
  } as React.CSSProperties,
  heroInner: {
    maxWidth: 1100,
    margin: "0 auto",
    position: "relative" as const,
    zIndex: 1,
  } as React.CSSProperties,
  heroTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: 800,
    margin: "0 0 6px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  } as React.CSSProperties,
  heroSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    margin: 0,
    maxWidth: 500,
  } as React.CSSProperties,
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px 60px",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#1b4332",
    margin: "0 0 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,
  card: {
    background: "#fff",
    borderRadius: 16,
    overflow: "hidden" as const,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    transition: "transform 0.2s, box-shadow 0.2s",
  } as React.CSSProperties,
  btn: {
    padding: "8px 16px",
    borderRadius: 10,
    border: "none",
    background: "#2d6a4f",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    transition: "background 0.15s",
  } as React.CSSProperties,
  btnDisabled: {
    background: "#9ca3af",
    cursor: "not-allowed",
  } as React.CSSProperties,
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
  } as React.CSSProperties,
};

/* ── Personalisation Meter ──────────────────────────────────────────── */
function PersonalisationMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const label = pct >= 80 ? "Highly Personalised" : pct >= 40 ? "Growing" : "Getting Started";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
      <div style={{ flex: 1, maxWidth: 200, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 3,
            background: "linear-gradient(90deg, #86efac, #34d399)",
            transition: "width 0.8s ease",
          }}
        />
      </div>
      <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 600 }}>
        {label} ({pct}%)
      </span>
    </div>
  );
}

/* ── AI Insight Chips ───────────────────────────────────────────────── */
function InsightChips({ data }: { data: RecsPayload }) {
  const chips = [
    { icon: "🛡️", text: "Quality filter active", show: data.quality_filter_active },
    { icon: "⬆️", text: `${data.products_boosted} boosted`, show: data.products_boosted > 0 },
    { icon: "⬇️", text: `${data.products_suppressed} suppressed`, show: data.products_suppressed > 0 },
  ].filter((c) => c.show);

  if (chips.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
      {chips.map((c, i) => (
        <span key={i} style={{ ...S.tag, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
          {c.icon} {c.text}
        </span>
      ))}
    </div>
  );
}

/* ── Recommendation Card ────────────────────────────────────────────── */
function RecCard({
  item,
  onAdd,
  adding,
}: {
  item: RecItem;
  onAdd: () => void;
  adding: boolean;
}) {
  const gc = item.quality_grade ? GRADE_COLORS[item.quality_grade] : null;
  const icon = getReasonIcon(item.reason);
  const label = getReasonLabel(item.reason);

  return (
    <div
      style={{
        ...S.card,
        border: item.quality_boosted ? "2px solid #86efac" : "1px solid #f0f0f0",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "10px 16px",
          background: item.quality_boosted
            ? "linear-gradient(90deg, #ecfdf5, #d1fae5)"
            : "linear-gradient(90deg, #f8faf8, #f0f4f0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <span style={{ ...S.tag, background: item.quality_boosted ? "#d1fae5" : "#f3f4f6", color: item.quality_boosted ? "#065f46" : "#6b7280" }}>
          {icon} {label}
        </span>
        {gc && item.quality_grade && (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: gc.bg,
              color: gc.fg,
              border: `1.5px solid ${gc.border}`,
              fontSize: 13,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.quality_grade}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <Link to={`/products/${item.product_id}`} style={{ textDecoration: "none" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1b4332", lineHeight: 1.3 }}>
            {item.product_name}
          </div>
        </Link>
        <div style={{ fontSize: 12, color: "#6b7280" }}>by {item.producer_name}</div>

        {/* Reason box */}
        <div
          style={{
            background: "#f8faf8",
            borderRadius: 10,
            padding: "10px 12px",
            borderLeft: "3px solid #40916c",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "#40916c", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            Why recommended
          </div>
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
            {item.reason}
          </div>
        </div>

        {/* Price + action */}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#1b4332" }}>
              £{parseFloat(item.price).toFixed(2)}
            </span>
            {item.has_discount && item.discount_percentage > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#92400e",
                  background: "#fef3c7",
                  borderRadius: 6,
                  padding: "2px 7px",
                }}
              >
                -{item.discount_percentage.toFixed(0)}%
              </span>
            )}
          </div>
          <button
            onClick={onAdd}
            disabled={adding}
            style={{ ...S.btn, ...(adding ? S.btnDisabled : {}) }}
          >
            {adding ? "Adding…" : "Add to basket"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Surprise Card ──────────────────────────────────────────────────── */
function SurpriseCard({
  item,
  onAdd,
  adding,
}: {
  item: NonNullable<SurpriseItem>;
  onAdd: () => void;
  adding: boolean;
}) {
  return (
    <div
      style={{
        ...S.card,
        border: "2px solid #c4b5fd",
        background: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)",
      }}
    >
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>✨</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#5b21b6" }}>{item.label}</span>
          <span
            style={{
              ...S.tag,
              background: GRADE_COLORS.A.bg,
              color: GRADE_COLORS.A.fg,
            }}
          >
            Grade {item.quality_grade}
          </span>
        </div>
        <Link to={`/products/${item.product_id}`} style={{ textDecoration: "none" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1b4332", marginBottom: 8 }}>
            {item.product_name}
          </div>
        </Link>
        <div
          style={{
            background: "rgba(255,255,255,0.7)",
            borderRadius: 10,
            padding: "12px 14px",
            borderLeft: "3px solid #8b5cf6",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            Why try this
          </div>
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{item.reason}</div>
        </div>
        <button
          onClick={onAdd}
          disabled={adding}
          style={{ ...S.btn, background: adding ? "#9ca3af" : "#7c3aed", ...(adding ? S.btnDisabled : {}) }}
        >
          {adding ? "Adding…" : "Add to basket"}
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function Recommendations() {
  const { user } = useAuth();
  const [data, setData] = useState<RecsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    api
      .get<RecsPayload>("/api/ai/recommendations/")
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.error || err?.message || "Failed to load recommendations."))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(productId: number) {
    try {
      setAddingId(productId);
      setToast("");
      await api.post("/api/cart/items/", { product_id: productId, quantity: 1 });
      setToast("Item added to basket ✓");
    } catch (err: any) {
      setToast(err?.response?.data?.error || "Failed to add item.");
    } finally {
      setAddingId(null);
      setTimeout(() => setToast(""), 3000);
    }
  }

  if (loading) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12, animation: "spin 1.5s linear infinite" }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1b4332" }}>Generating your personalised picks…</div>
          <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>Couldn't load recommendations</div>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>{error}</div>
          <Link to="/" style={{ ...S.btn, textDecoration: "none", display: "inline-block" }}>
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const recs = data.recommendations || [];
  const reorders = data.quick_reorder || [];
  const deals = data.surplus_deals || [];
  const surprise = data.surprise;

  return (
    <div style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div style={S.heroInner}>
          <h1 style={S.heroTitle}>
            <span style={{ fontSize: 28 }}>🤖</span> Your Personalised Picks
          </h1>
          <p style={S.heroSub}>
            Curated by our AI using your purchase history, quality grades from our CNN classifier, and collaborative filtering from similar customers.
          </p>
          <PersonalisationMeter score={data.personalisation_score} />
          <InsightChips data={data} />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100, background: toast.includes("✓") ? "#065f46" : "#991b1b", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", animation: "slideIn 0.3s ease" }}>
          {toast}
          <style>{`@keyframes slideIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>
        </div>
      )}

      <div style={S.container}>
        {/* Recommendations */}
        {recs.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={S.sectionTitle}>
              <span>🎯</span> Recommended For You
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginLeft: "auto" }}>
                {recs.length} picks
              </span>
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 20,
              }}
            >
              {recs.map((r) => (
                <RecCard key={r.product_id} item={r} onAdd={() => handleAdd(r.product_id)} adding={addingId === r.product_id} />
              ))}
            </div>
          </section>
        )}

        {/* Surprise discovery */}
        {surprise && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={S.sectionTitle}>
              <span>✨</span> Discover Something New
            </h2>
            <div style={{ maxWidth: 500 }}>
              <SurpriseCard item={surprise} onAdd={() => handleAdd(surprise.product_id)} adding={addingId === surprise.product_id} />
            </div>
          </section>
        )}

        {/* Quick reorder + Surplus deals row */}
        <div style={{ display: "grid", gridTemplateColumns: reorders.length > 0 && deals.length > 0 ? "1fr 1fr" : "1fr", gap: 24, marginBottom: 40 }}>
          {reorders.length > 0 && (
            <section>
              <h2 style={S.sectionTitle}><span>🔄</span> Quick Reorder</h2>
              <div style={{ ...S.card, border: "1px solid #f0f0f0" }}>
                {reorders.map((r, i) => (
                  <div
                    key={r.product_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      borderBottom: i < reorders.length - 1 ? "1px solid #f5f5f5" : "none",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={`/products/${r.product_id}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1b4332" }}>{r.product_name}</div>
                      </Link>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                        Ordered {r.times_ordered}× · {r.available ? `${r.stock_level} in stock` : "Out of stock"}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1b4332", flexShrink: 0 }}>
                      £{parseFloat(r.price).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAdd(r.product_id)}
                      disabled={!r.available || addingId === r.product_id}
                      style={{ ...S.btn, fontSize: 12, padding: "6px 12px", flexShrink: 0, ...((!r.available || addingId === r.product_id) ? S.btnDisabled : {}) }}
                    >
                      {addingId === r.product_id ? "…" : "Re-order"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {deals.length > 0 && (
            <section>
              <h2 style={S.sectionTitle}><span>🏷️</span> Surplus Deals</h2>
              <div style={{ ...S.card, border: "1px solid #fde68a", background: "#fffbeb" }}>
                {deals.map((d, i) => (
                  <div
                    key={d.product_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      borderBottom: i < deals.length - 1 ? "1px solid #fef3c7" : "none",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={`/products/${d.product_id}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#92400e" }}>{d.product_name}</div>
                      </Link>
                      <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
                        Grade {d.grade} · by {d.producer_name}
                      </div>
                    </div>
                    <span style={{ ...S.tag, background: "#fef3c7", color: "#92400e", fontSize: 12 }}>
                      -{d.discount_percentage.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#92400e", flexShrink: 0 }}>
                      £{parseFloat(d.price).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAdd(d.product_id)}
                      disabled={addingId === d.product_id}
                      style={{ ...S.btn, background: addingId === d.product_id ? "#9ca3af" : "#d97706", fontSize: 12, padding: "6px 12px", flexShrink: 0 }}
                    >
                      {addingId === d.product_id ? "…" : "Grab deal"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Empty state */}
        {recs.length === 0 && !surprise && reorders.length === 0 && deals.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1b4332", marginBottom: 8 }}>No recommendations yet</div>
            <p style={{ color: "#6b7280", fontSize: 14, maxWidth: 360, margin: "0 auto 20px" }}>
              Start shopping to help our AI learn your preferences. The more you order, the better your picks become!
            </p>
            <Link to="/" style={{ ...S.btn, textDecoration: "none", display: "inline-block", padding: "10px 28px" }}>
              Browse products
            </Link>
          </div>
        )}

        {/* How it works */}
        <section style={{ marginTop: 20 }}>
          <h2 style={{ ...S.sectionTitle, marginBottom: 20 }}>
            <span>🧠</span> How Our AI Works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { icon: "📊", title: "Purchase Analysis", desc: "We analyse your order frequency and patterns to find products you love." },
              { icon: "🔬", title: "CNN Quality Grading", desc: "Our classifier grades produce A/B/C — Grade A products get boosted in your feed." },
              { icon: "👥", title: "Collaborative Filtering", desc: "Customers with similar tastes help surface products you haven't tried yet." },
              { icon: "⚖️", title: "Fairness Monitoring", desc: "We monitor for bias to ensure all producers get fair representation." },
            ].map((step) => (
              <div key={step.title} style={{ ...S.card, border: "1px solid #f0f0f0", padding: "20px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{step.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1b4332", marginBottom: 6 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Algorithm footer */}
        <div style={{ textAlign: "center", marginTop: 40, padding: "16px", borderTop: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Algorithm: {data.algorithm} · Personalisation: {Math.round(data.personalisation_score * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
