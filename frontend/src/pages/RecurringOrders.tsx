import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "../api";

type RecurringItem = {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
};

type RecurringOrder = {
  id: number;
  name: string;
  frequency: string;
  frequency_display: string;
  delivery_address: string;
  next_delivery_date: string;
  end_date: string | null;
  status: string;
  status_display: string;
  times_placed: number;
  last_placed_at: string | null;
  source_order_number: string | null;
  created_at: string;
  items: RecurringItem[];
};

const RecurringOrders = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<RecurringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [placing, setPlacing] = useState<number | null>(null);

  // Edit modal state
  const [editId, setEditId] = useState<number | null>(null);
  const [editFreq, setEditFreq] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editName, setEditName] = useState("");

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get<RecurringOrder[]>("/api/orders/recurring/");
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load recurring orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handlePlaceNow = async (id: number) => {
    setPlacing(id);
    try {
      const res = await api.post(`/api/orders/recurring/${id}/place-now/`);
      const data = res.data as any;
      const addedCount = data.added?.length || 0;
      const unavailableCount = data.unavailable?.length || 0;
      setActionMsg(
        `Added ${addedCount} item(s) to cart.${unavailableCount ? ` ${unavailableCount} item(s) unavailable.` : ""}`
      );
      setTimeout(() => setActionMsg(""), 4000);
      fetchSchedules();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to place order.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setPlacing(null);
    }
  };

  const handlePause = async (id: number) => {
    try {
      await api.patch(`/api/orders/recurring/${id}/`, { status: "paused" });
      fetchSchedules();
      setActionMsg("Schedule paused.");
      setTimeout(() => setActionMsg(""), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to pause.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleResume = async (id: number) => {
    try {
      await api.patch(`/api/orders/recurring/${id}/`, { status: "active" });
      fetchSchedules();
      setActionMsg("Schedule resumed.");
      setTimeout(() => setActionMsg(""), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to resume.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this recurring order?")) return;
    try {
      await api.patch(`/api/orders/recurring/${id}/`, { status: "cancelled" });
      fetchSchedules();
      setActionMsg("Schedule cancelled.");
      setTimeout(() => setActionMsg(""), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to cancel.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const openEdit = (s: RecurringOrder) => {
    setEditId(s.id);
    setEditFreq(s.frequency);
    setEditDate(s.next_delivery_date);
    setEditEnd(s.end_date || "");
    setEditName(s.name);
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    try {
      const payload: any = {
        frequency: editFreq,
        next_delivery_date: editDate,
        name: editName,
      };
      if (editEnd) payload.end_date = editEnd;
      else payload.end_date = null;

      await api.patch(`/api/orders/recurring/${editId}/`, payload);
      setEditId(null);
      fetchSchedules();
      setActionMsg("Schedule updated.");
      setTimeout(() => setActionMsg(""), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const getStatusColor = (status: string) => {
    if (status === "active") return { bg: "#dcfce7", fg: "#15803d" };
    if (status === "paused") return { bg: "#fef3c7", fg: "#b45309" };
    return { bg: "#fee2e2", fg: "#b91c1c" };
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>🔄 Recurring Orders</h1>
        <p>Loading your schedules...</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h1 style={{ ...headingStyle, marginBottom: 0 }}>🔄 Recurring Orders</h1>
        </div>
        <p style={subTextStyle}>
          Manage your recurring order schedules. Set up from any past order to automate repeat purchasing.
        </p>
      </div>

      {actionMsg && <div style={successBanner}>{actionMsg}</div>}
      {error && <div style={errorBanner}>{error}</div>}

      {schedules.length === 0 ? (
        <div style={emptyBox}>
          <h2 style={{ marginTop: 0, color: "#374151" }}>No recurring orders yet</h2>
          <p style={{ color: "#6b7280", marginBottom: 16 }}>
            Go to any delivered order and click "Set Up Recurring" to create a schedule.
          </p>
          <button onClick={() => navigate("/orders")} style={primaryBtn}>
            View Past Orders
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {schedules.map((s) => {
            const sc = getStatusColor(s.status);
            const itemTotal = s.items.reduce(
              (sum, item) => sum + parseFloat(item.line_total || "0"),
              0
            );

            return (
              <div key={s.id} style={card}>
                {/* Header */}
                <div style={cardHeader}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>
                      {s.name || `Schedule #${s.id}`}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                      {s.source_order_number && (
                        <span>
                          From order{" "}
                          <span
                            style={{ color: "#2d6a4f", cursor: "pointer", fontWeight: 600 }}
                            onClick={() => navigate(`/orders/${s.source_order_number}`)}
                          >
                            {s.source_order_number}
                          </span>
                          {" · "}
                        </span>
                      )}
                      Created {formatDate(s.created_at)}
                    </div>
                  </div>
                  <span
                    style={{
                      ...statusBadge,
                      background: sc.bg,
                      color: sc.fg,
                    }}
                  >
                    {s.status_display}
                  </span>
                </div>

                {/* Stats row */}
                <div style={statsRow}>
                  <div style={statBox}>
                    <div style={statLabel}>Frequency</div>
                    <div style={statValue}>{s.frequency_display}</div>
                  </div>
                  <div style={statBox}>
                    <div style={statLabel}>Next Delivery</div>
                    <div style={statValue}>{formatDate(s.next_delivery_date)}</div>
                  </div>
                  <div style={statBox}>
                    <div style={statLabel}>Times Placed</div>
                    <div style={statValue}>{s.times_placed}</div>
                  </div>
                  <div style={statBox}>
                    <div style={statLabel}>Est. Total</div>
                    <div style={statValue}>£{itemTotal.toFixed(2)}</div>
                  </div>
                  {s.end_date && (
                    <div style={statBox}>
                      <div style={statLabel}>Ends</div>
                      <div style={statValue}>{formatDate(s.end_date)}</div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                    Items ({s.items.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {s.items.map((item) => (
                      <div key={item.id} style={itemChip}>
                        <span style={{ fontWeight: 600 }}>{item.quantity}×</span>{" "}
                        {item.product_name}
                        <span style={{ color: "#6b7280", marginLeft: 6 }}>
                          £{parseFloat(item.unit_price).toFixed(2)}/ea
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={actionsRow}>
                  {s.status === "active" && (
                    <>
                      <button
                        onClick={() => handlePlaceNow(s.id)}
                        disabled={placing === s.id}
                        style={placeNowBtn}
                      >
                        {placing === s.id ? "Adding to cart..." : "🛒 Place Now"}
                      </button>
                      <button onClick={() => openEdit(s)} style={editBtn}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => handlePause(s.id)} style={pauseBtn}>
                        ⏸ Pause
                      </button>
                      <button onClick={() => handleCancel(s.id)} style={cancelBtn}>
                        Cancel
                      </button>
                    </>
                  )}
                  {s.status === "paused" && (
                    <>
                      <button onClick={() => handleResume(s.id)} style={placeNowBtn}>
                        ▶ Resume
                      </button>
                      <button onClick={() => openEdit(s)} style={editBtn}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleCancel(s.id)} style={cancelBtn}>
                        Cancel
                      </button>
                    </>
                  )}
                  {s.status === "cancelled" && (
                    <span style={{ color: "#9ca3af", fontSize: 13 }}>This schedule is cancelled.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editId !== null && (
        <div style={modalOverlay} onClick={() => setEditId(null)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: "#1b4332" }}>Edit Schedule</h2>

            <label style={fieldLabel}>Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={fieldInput}
            />

            <label style={fieldLabel}>Frequency</label>
            <select value={editFreq} onChange={(e) => setEditFreq(e.target.value)} style={fieldInput}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>

            <label style={fieldLabel}>Next Delivery Date</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              style={fieldInput}
            />

            <label style={fieldLabel}>End Date (optional)</label>
            <input
              type="date"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
              style={fieldInput}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={handleSaveEdit} style={placeNowBtn}>
                Save Changes
              </button>
              <button onClick={() => setEditId(null)} style={cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Styles ── */
const pageStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "40px 20px",
};

const headingStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 800,
  color: "#163A2D",
  marginBottom: 8,
};

const subTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: 15,
};

const successBanner: React.CSSProperties = {
  background: "#dcfce7",
  color: "#15803d",
  border: "1px solid #86efac",
  padding: "12px 16px",
  borderRadius: 12,
  marginBottom: 16,
  fontWeight: 600,
  fontSize: 14,
};

const errorBanner: React.CSSProperties = {
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  padding: "12px 16px",
  borderRadius: 12,
  marginBottom: 16,
  fontWeight: 600,
  fontSize: 14,
};

const emptyBox: React.CSSProperties = {
  background: "#fff",
  padding: 40,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  textAlign: "center",
  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 24px",
  border: "none",
  borderRadius: 10,
  background: "#2d6a4f",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  padding: 24,
  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const statusBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 14px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  textTransform: "capitalize",
};

const statsRow: React.CSSProperties = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  marginTop: 16,
  padding: "14px 0",
  borderTop: "1px solid #f3f4f6",
  borderBottom: "1px solid #f3f4f6",
};

const statBox: React.CSSProperties = {
  minWidth: 100,
};

const statLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const statValue: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#111827",
  marginTop: 2,
};

const itemChip: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  background: "#f3f4f6",
  fontSize: 13,
  color: "#374151",
};

const actionsRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const placeNowBtn: React.CSSProperties = {
  padding: "9px 18px",
  border: "none",
  borderRadius: 10,
  background: "#2d6a4f",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const editBtn: React.CSSProperties = {
  padding: "9px 18px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#fff",
  color: "#374151",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const pauseBtn: React.CSSProperties = {
  padding: "9px 18px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#fffbeb",
  color: "#b45309",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  padding: "9px 18px",
  border: "1px solid #fecaca",
  borderRadius: 10,
  background: "#fff",
  color: "#b91c1c",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalContent: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 32,
  maxWidth: 460,
  width: "90%",
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
  marginTop: 14,
  marginBottom: 4,
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export default RecurringOrders;
