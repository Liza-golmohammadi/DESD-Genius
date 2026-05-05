import { useEffect, useState } from "react";
import api from "../api";
import AdminUsers from "./AdminUsers";
import AdminOrders from "./AdminOrders";

// ── AI Insights types ─────────────────────────────────────────────────────────
type AiAdminInsights = {
  total_assessments: number;
  grade_distribution: { A: number; B: number; C: number };
  override_rate: number;
  top_recommended_products: { product__name: string; count: number }[];
  producer_quality_ranking: {
    producer__email: string;
    avg_colour: number;
    avg_size: number;
    avg_ripeness: number;
    total: number;
  }[];
  fairness_alerts: Record<string, unknown>;
  model_performance: {
    name?: string;
    version?: string;
    accuracy?: number;
    f1_score?: number;
    is_mock?: boolean;
  };
  interaction_volume_chart: string | null;
};

type ReportsData = {
  user_summary: {
    total_users: number;
    total_customers: number;
    total_producers: number;
    total_admins: number;
  };
  order_summary: {
    total_orders: number;
    pending_orders: number;
    confirmed_orders: number;
    ready_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
  };
  financial_summary: {
    total_revenue: string;
    total_commission: string;
    producer_payout_total: string;
  };
  recent_orders: {
    order_number: string;
    status: string;
    total_amount: string;
    created_at: string;
  }[];
};

const TABS = ["Overview", "Users", "Orders", "AI Insights"] as const;
type Tab = (typeof TABS)[number];

const AdminDashboard = () => {
  const [tab, setTab] = useState<Tab>("Overview");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiData, setAiData] = useState<AiAdminInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ReportsData>("/api/admin/reports/")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "AI Insights" || aiData || aiLoading) return;
    setAiLoading(true);
    api
      .get<AiAdminInsights>("/api/ai/admin/insights/")
      .then((res) => setAiData(res.data))
      .catch(() => setAiError("Failed to load AI insights."))
      .finally(() => setAiLoading(false));
  }, [tab]);

  /* ── shared styles ──────────────────────────── */
  const card: React.CSSProperties = {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: "1.25rem",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  };

  const statusColor: Record<string, { bg: string; fg: string }> = {
    pending:   { bg: "#f3f4f6", fg: "#6b7280" },
    confirmed: { bg: "#dbeafe", fg: "#1e40af" },
    ready:     { bg: "#fef3c7", fg: "#92400e" },
    delivered: { bg: "#d1fae5", fg: "#065f46" },
    cancelled: { bg: "#fce4ec", fg: "#b71c1c" },
  };

  /* ── overview content ───────────────────────── */
  function renderOverview() {
    if (loading)
      return <p style={{ opacity: 0.6, padding: 20 }}>Loading dashboard…</p>;
    if (error || !data)
      return <p style={{ color: "#b71c1c", padding: 20 }}>{error}</p>;

    const statCards: { label: string; value: string | number }[] = [
      { label: "Total Users", value: data.user_summary.total_users },
      { label: "Total Producers", value: data.user_summary.total_producers },
      { label: "Total Orders", value: data.order_summary.total_orders },
      { label: "Total Revenue", value: `£${data.financial_summary.total_revenue}` },
      { label: "Platform Commission", value: `£${data.financial_summary.total_commission}` },
      { label: "Producer Payouts", value: `£${data.financial_summary.producer_payout_total}` },
    ];

    return (
      <>
        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {statCards.map((s) => (
            <div key={s.label} style={card}>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
                {s.label}
              </p>
              <h2
                style={{
                  margin: "0.4rem 0 0",
                  fontSize: "1.75rem",
                  color: "#1f4d3a",
                }}
              >
                {s.value}
              </h2>
            </div>
          ))}
        </div>

        {/* Two-column: orders by status + recent orders */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          {/* Orders by status */}
          <div style={card}>
            <h3
              style={{
                margin: "0 0 1rem",
                fontSize: "1.15rem",
                color: "#1f4d3a",
              }}
            >
              Orders by Status
            </h3>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                { key: "pending", label: "Pending", count: data.order_summary.pending_orders },
                { key: "confirmed", label: "Confirmed", count: data.order_summary.confirmed_orders },
                { key: "ready", label: "Ready", count: data.order_summary.ready_orders },
                { key: "delivered", label: "Delivered", count: data.order_summary.delivered_orders },
                { key: "cancelled", label: "Cancelled", count: data.order_summary.cancelled_orders },
              ].map((s) => (
                <div
                  key={s.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      background: statusColor[s.key]?.bg,
                      color: statusColor[s.key]?.fg,
                    }}
                  >
                    {s.label}
                  </span>
                  <span style={{ fontWeight: 700, color: "#1f4d3a" }}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent orders */}
          <div style={card}>
            <h3
              style={{
                margin: "0 0 1rem",
                fontSize: "1.15rem",
                color: "#1f4d3a",
              }}
            >
              Recent Orders
            </h3>
            {data.recent_orders.length === 0 ? (
              <p style={{ opacity: 0.5 }}>No orders yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {data.recent_orders.map((o) => (
                  <div
                    key={o.order_number}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: "0.88rem",
                    }}
                  >
                    <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {o.order_number}
                    </span>
                    <span>£{o.total_amount}</span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        background: statusColor[o.status]?.bg || "#f5f5f5",
                        color: statusColor[o.status]?.fg || "#333",
                        textTransform: "capitalize",
                      }}
                    >
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User breakdown */}
        <div style={{ ...card, marginTop: "1.5rem" }}>
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "1.15rem",
              color: "#1f4d3a",
            }}
          >
            User Breakdown
          </h3>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[
              { label: "Customers", count: data.user_summary.total_customers },
              { label: "Producers", count: data.user_summary.total_producers },
              { label: "Admins", count: data.user_summary.total_admins },
            ].map((u) => (
              <div key={u.label}>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                  {u.label}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#1f4d3a",
                  }}
                >
                  {u.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  /* ── AI insights content ────────────────────── */
  function renderAiInsights() {
    if (aiLoading) return <p style={{ opacity: 0.6, padding: 20 }}>Loading AI insights…</p>;
    if (aiError || !aiData) return <p style={{ color: "#b71c1c", padding: 20 }}>{aiError ?? "No data."}</p>;

    const gd = aiData.grade_distribution;
    const total = aiData.total_assessments || 1;
    const gradeColors: Record<string, { bg: string; fg: string; bar: string }> = {
      A: { bg: "#d1fae5", fg: "#065f46", bar: "#10b981" },
      B: { bg: "#fef3c7", fg: "#92400e", bar: "#f59e0b" },
      C: { bg: "#fee2e2", fg: "#991b1b", bar: "#ef4444" },
    };

    return (
      <>
        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Assessments", value: aiData.total_assessments },
            { label: "Grade A", value: `${gd.A} (${((gd.A / total) * 100).toFixed(0)}%)` },
            { label: "Grade B", value: `${gd.B} (${((gd.B / total) * 100).toFixed(0)}%)` },
            { label: "Grade C", value: `${gd.C} (${((gd.C / total) * 100).toFixed(0)}%)` },
            { label: "Override Rate", value: `${aiData.override_rate}%` },
          ].map((s) => (
            <div key={s.label} style={card}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{s.label}</p>
              <h2 style={{ margin: "0.4rem 0 0", fontSize: "1.6rem", color: "#1f4d3a" }}>{s.value}</h2>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>

          {/* Grade distribution bar chart */}
          <div style={card}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#1f4d3a" }}>Grade Distribution</h3>
            {aiData.total_assessments === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13 }}>No assessments yet.</p>
            ) : (
              (["A", "B", "C"] as const).map((g) => {
                const count = gd[g];
                const pct = (count / total) * 100;
                const gc = gradeColors[g];
                return (
                  <div key={g} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 22, height: 22, borderRadius: 5, background: gc.bg, color: gc.fg, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{g}</span>
                        <span style={{ fontSize: 13 }}>Grade {g}</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ height: 9, background: "#f3f4f6", borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: gc.bar, borderRadius: 5, transition: "width 0.6s" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Model performance */}
          <div style={card}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#1f4d3a" }}>Active Model Performance</h3>
            {!aiData.model_performance?.name ? (
              <p style={{ color: "#aaa", fontSize: 13 }}>No active model registered.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Model</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1f4d3a" }}>{aiData.model_performance.name} v{aiData.model_performance.version}</div>
                  {aiData.model_performance.is_mock && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 4, padding: "2px 6px" }}>DEMO MODE</span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Accuracy</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1f4d3a", marginTop: 2 }}>
                      {aiData.model_performance.accuracy != null ? `${(aiData.model_performance.accuracy * 100).toFixed(1)}%` : "—"}
                    </div>
                  </div>
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>F1 Score</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1f4d3a", marginTop: 2 }}>
                      {aiData.model_performance.f1_score != null ? aiData.model_performance.f1_score.toFixed(3) : "—"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace", background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
                  Architecture: MobileNetV2 (transfer learning) · Grades: A / B / C
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top recommended products + producer ranking */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>

          <div style={card}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#1f4d3a" }}>Top Recommended Products</h3>
            {aiData.top_recommended_products.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13 }}>No recommendation data yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {aiData.top_recommended_products.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0", fontSize: 14 }}>
                    <span style={{ fontWeight: i < 3 ? 700 : 400 }}>{p["product__name"]}</span>
                    <span style={{ background: "#dbeafe", color: "#1e40af", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{p.count} purchases</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#1f4d3a" }}>Producer Quality Ranking</h3>
            {aiData.producer_quality_ranking.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13 }}>No assessment data yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      {["Producer", "Colour", "Size", "Ripeness", "Assessments"].map((h) => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#6b7280", fontSize: 11, textTransform: "uppercase" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aiData.producer_quality_ranking.map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 10px", fontSize: 12, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p["producer__email"]}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1f4d3a" }}>{p.avg_colour?.toFixed(0)}%</td>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1f4d3a" }}>{p.avg_size?.toFixed(0)}%</td>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1f4d3a" }}>{p.avg_ripeness?.toFixed(0)}%</td>
                        <td style={{ padding: "8px 10px", color: "#6b7280" }}>{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Interaction volume chart */}
        {aiData.interaction_volume_chart && (
          <div style={{ ...card, marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#1f4d3a" }}>Recommendation Interaction Volume</h3>
            <img
              src={`data:image/png;base64,${aiData.interaction_volume_chart}`}
              alt="Interaction volume chart"
              style={{ width: "100%", borderRadius: 8, maxHeight: 300, objectFit: "contain" }}
            />
          </div>
        )}

        {/* Model footer */}
        <div style={{ padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", fontSize: 12, color: "#065f46", display: "flex", gap: 20, flexWrap: "wrap" }}>
          <span>Algorithm: <strong>Hybrid Quality-Aware Collaborative v1</strong></span>
          <span>XAI: <strong>Two-tier (technical + plain-English)</strong></span>
          <span>GDPR: <strong>Right-to-erasure endpoint active</strong></span>
        </div>
      </>
    );
  }

  /* ── main render ────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7f4",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "2.2rem",
              margin: 0,
              marginBottom: "0.4rem",
              color: "#1f4d3a",
            }}
          >
            Admin Dashboard
          </h1>
          <p
            style={{
              margin: 0,
              color: "#4b5563",
              fontSize: "0.95rem",
              maxWidth: 700,
              lineHeight: 1.6,
            }}
          >
            Monitor platform activity, manage users, and review orders.
          </p>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: "1.5rem",
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: 0,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: "10px 20px",
                border: "none",
                borderBottom: tab === t ? "3px solid #1f4d3a" : "3px solid transparent",
                background: "transparent",
                fontSize: "0.95rem",
                fontWeight: tab === t ? 700 : 500,
                color: tab === t ? "#1f4d3a" : "#6b7280",
                cursor: "pointer",
                marginBottom: -2,
                transition: "color 0.15s",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "Overview" && renderOverview()}
        {tab === "Users" && <AdminUsers />}
        {tab === "Orders" && <AdminOrders />}
        {tab === "AI Insights" && renderAiInsights()}
      </div>
    </div>
  );
};

export default AdminDashboard;