import { useEffect, useState } from "react";
import api from "../api";
import AdminUsers from "./AdminUsers";
import AdminOrders from "./AdminOrders";

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

const TABS = ["Overview", "Users", "Orders"] as const;
type Tab = (typeof TABS)[number];

const AdminDashboard = () => {
  const [tab, setTab] = useState<Tab>("Overview");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ReportsData>("/api/admin/reports/")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

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
      </div>
    </div>
  );
};

export default AdminDashboard;