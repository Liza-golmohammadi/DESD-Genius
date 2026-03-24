import { useEffect, useState } from "react";
import api from "../api";

type OrderRecord = {
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_amount: string;
  commission_amount: string;
  status: string;
  status_display: string;
  item_count: number;
  created_at: string;
};

const statusBadge = (s: string): React.CSSProperties => {
  const map: Record<string, { bg: string; fg: string }> = {
    pending:   { bg: "#f3f4f6", fg: "#6b7280" },
    confirmed: { bg: "#dbeafe", fg: "#1e40af" },
    ready:     { bg: "#fef3c7", fg: "#92400e" },
    delivered: { bg: "#d1fae5", fg: "#065f46" },
    cancelled: { bg: "#fce4ec", fg: "#b71c1c" },
  };
  const c = map[s] || { bg: "#f5f5f5", fg: "#333" };
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 6,
    fontSize: "0.8rem",
    fontWeight: 700,
    background: c.bg,
    color: c.fg,
    textTransform: "capitalize",
  };
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const qs = params.toString() ? `?${params.toString()}` : "";

    api
      .get<OrderRecord[]>(`/api/admin/orders/${qs}`)
      .then((res) => setOrders(res.data))
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  }, [statusFilter, dateFrom, dateTo]);

  if (loading)
    return <p style={{ padding: 20, opacity: 0.6 }}>Loading orders…</p>;
  if (error) return <p style={{ padding: 20, color: "#b71c1c" }}>{error}</p>;

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: "0.85rem",
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="ready">Ready</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 4 }}>
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: "0.85rem",
            }}
          />
        </label>

        <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 4 }}>
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: "0.85rem",
            }}
          />
        </label>

        {(statusFilter || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("");
              setDateFrom("");
              setDateTo("");
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.9rem",
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px" }}>Order #</th>
              <th style={{ padding: "10px 12px" }}>Customer</th>
              <th style={{ padding: "10px 12px" }}>Date</th>
              <th style={{ padding: "10px 12px" }}>Items</th>
              <th style={{ padding: "10px 12px" }}>Total</th>
              <th style={{ padding: "10px 12px" }}>Commission</th>
              <th style={{ padding: "10px 12px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.order_number} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "0.82rem" }}>
                  {o.order_number}
                </td>
                <td style={{ padding: "10px 12px" }}>{o.customer_name}</td>
                <td style={{ padding: "10px 12px" }}>
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  {o.item_count}
                </td>
                <td style={{ padding: "10px 12px" }}>£{o.total_amount}</td>
                <td style={{ padding: "10px 12px" }}>£{o.commission_amount}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={statusBadge(o.status)}>{o.status_display}</span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", opacity: 0.5 }}>
                  No orders found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: "0.82rem", opacity: 0.5 }}>
        Showing {orders.length} order{orders.length !== 1 && "s"}
      </p>
    </div>
  );
}