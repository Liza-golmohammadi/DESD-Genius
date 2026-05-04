import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ShieldAlert, MessageSquare, Package, CheckCircle2, ChevronRight, Send, AlertTriangle, X } from "lucide-react";
import api from "../api";

const C = {
  pageBg:     "#f4f6f2",
  cardBg:     "#ffffff",
  cardBorder: "#e8ede5",
  cardShadow: "0 2px 10px rgba(60,80,60,0.07)",
  textPrimary:"#2a3628",
  textBody:   "#526155",
  textMuted:  "#8da48f",
  green:      "#3e7055",
  greenDark:  "#2d6a4f",
  greenLight: "#eaf2ec",
  sectionBg:  "#f3f0ea",
};
const font = "'Segoe UI', system-ui, -apple-system, sans-serif";

type OrderSummary = {
  order_number: string;
  total_amount: string;
  status: string;
  status_display: string;
  created_at: string;
  producer_count: number;
};

type ProducerOrder = {
  id: number;
  producer_id: number;
  producer_name: string;
  subtotal: string;
  status: string;
  status_display: string;
  items: { product_name: string; quantity: number; unit_price: string; line_total: string }[];
};

type OrderDetail = {
  order_number: string;
  total_amount: string;
  status: string;
  status_display: string;
  created_at: string;
  delivery_address: string;
  producer_orders: ProducerOrder[];
};

type Message = { id: number; sender: "me" | "producer"; text: string; time: string };

function statusStyle(status: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    pending:   ["#92400e", "#fef3c7"],
    confirmed: ["#1e40af", "#dbeafe"],
    ready:     ["#6b21a8", "#f3e8ff"],
    delivered: ["#065f46", "#d1fae5"],
    cancelled: ["#991b1b", "#fee2e2"],
  };
  const [color, bg] = map[status] ?? [C.textMuted, C.greenLight];
  return { color, background: bg, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: font, display: "inline-flex", alignItems: "center", gap: 4 };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function formatTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function ResolutionCenter() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyText, setSafetyText] = useState("");
  const [safetySubmitted, setSafetySubmitted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<OrderSummary[]>("/api/orders/")
      .then(r => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, []);

  useEffect(() => {
    if (!selectedOrder) return;
    setLoadingDetail(true);
    setDetail(null);
    api.get<OrderDetail>(`/api/orders/${selectedOrder}/`)
      .then(r => setDetail(r.data))
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedOrder]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedOrder]);

  function sendMessage() {
    if (!input.trim() || !selectedOrder) return;
    const msg: Message = { id: Date.now(), sender: "me", text: input.trim(), time: formatTime() };
    setMessages(prev => ({ ...prev, [selectedOrder]: [...(prev[selectedOrder] ?? []), msg] }));
    setInput("");
    // Simulate producer reply after 2s
    setTimeout(() => {
      const reply: Message = {
        id: Date.now() + 1,
        sender: "producer",
        text: "Thanks for reaching out! We've received your message and will get back to you shortly.",
        time: formatTime(),
      };
      setMessages(prev => ({ ...prev, [selectedOrder]: [...(prev[selectedOrder] ?? []), reply] }));
    }, 2000);
  }

  function submitSafetyReport() {
    if (!safetyText.trim()) return;
    setSafetySubmitted(true);
  }

  const msgs = selectedOrder ? (messages[selectedOrder] ?? []) : [];
  const activeOrder = orders.find(o => o.order_number === selectedOrder);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ background: C.pageBg, minHeight: "100vh", padding: "40px 24px", fontFamily: font }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 34, fontWeight: 900, color: C.textPrimary, fontFamily: "Georgia, serif" }}>
            Resolution Center
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: C.textBody, maxWidth: 560 }}>
            Direct communication with your producers. Report quality issues or food safety concerns for a rapid response.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>

          {/* ── Left: Order list ── */}
          <div>
            <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: C.textMuted }}>
              Your Orders
            </p>

            {loadingOrders && (
              <p style={{ color: C.textMuted, fontSize: 14 }}>Loading orders...</p>
            )}

            {!loadingOrders && orders.length === 0 && (
              <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
                <Package size={32} color={C.textMuted} style={{ marginBottom: 10 }} />
                <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>No orders found.</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {orders.map(order => {
                const active = selectedOrder === order.order_number;
                return (
                  <div key={order.order_number} onClick={() => setSelectedOrder(order.order_number)}
                    style={{ background: active ? C.greenLight : C.cardBg, border: `1px solid ${active ? C.green : C.cardBorder}`, borderRadius: 16, padding: "16px 18px", cursor: "pointer", transition: "border 0.15s, background 0.15s", boxShadow: active ? "none" : C.cardShadow }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{order.order_number}</span>
                      <span style={{ fontSize: 11, color: C.textMuted }}>{formatDate(order.created_at)}</span>
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: C.textBody }}>
                      {order.producer_count} producer{order.producer_count !== 1 ? "s" : ""} · £{parseFloat(order.total_amount).toFixed(2)}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={statusStyle(order.status)}>
                        {order.status === "delivered" && <CheckCircle2 size={10} />}
                        {order.status === "pending" && <Package size={10} />}
                        {order.status_display}
                      </span>
                      <ChevronRight size={14} color={C.textMuted} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Chat panel ── */}
          <div>
            {!selectedOrder ? (
              <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 24, minHeight: 440, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
                <MessageSquare size={44} color={C.cardBorder} style={{ marginBottom: 16 }} />
                <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: C.textPrimary }}>Select an order</h3>
                <p style={{ margin: 0, color: C.textMuted, fontSize: 14, maxWidth: 320 }}>
                  Choose an order on the left to message the producer or report a quality issue.
                </p>
              </div>
            ) : (
              <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", height: 620, boxShadow: C.cardShadow }}>

                {/* Chat header */}
                <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.cardBorder}`, background: C.sectionBg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    {loadingDetail ? (
                      <p style={{ margin: 0, fontSize: 14, color: C.textMuted }}>Loading...</p>
                    ) : detail ? (
                      <>
                        <h3 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700, color: C.textPrimary }}>
                          {detail.producer_orders.map(p => p.producer_name).join(", ")}
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>
                          Order {detail.order_number} · {formatDate(detail.created_at)}
                        </p>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: 14, color: C.textMuted }}>{activeOrder?.order_number}</p>
                    )}
                  </div>
                  <button onClick={() => setShowSafetyModal(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font }}>
                    <ShieldAlert size={14} /> Report Food Safety Issue
                  </button>
                </div>

                {/* Order items summary */}
                {detail && detail.producer_orders.length > 0 && (
                  <div style={{ padding: "10px 22px", borderBottom: `1px solid ${C.cardBorder}`, background: "#fafcfa", display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {detail.producer_orders.flatMap(po => po.items).map((item, i) => (
                      <span key={i} style={{ fontSize: 11, color: C.textBody, background: C.greenLight, borderRadius: 999, padding: "3px 10px", fontWeight: 500 }}>
                        {item.quantity}× {item.product_name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, background: "#fafcfa" }}>
                  {msgs.length === 0 && (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <p style={{ color: C.textMuted, fontSize: 13, textAlign: "center" }}>No messages yet. Send a message to start the conversation.</p>
                    </div>
                  )}
                  {msgs.map(msg => (
                    <div key={msg.id} style={{ display: "flex", justifyContent: msg.sender === "me" ? "flex-end" : "flex-start", gap: 10 }}>
                      {msg.sender === "producer" && (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          PR
                        </div>
                      )}
                      <div style={{ maxWidth: "72%", background: msg.sender === "me" ? C.green : C.cardBg, color: msg.sender === "me" ? "#fff" : C.textPrimary, padding: "10px 14px", borderRadius: msg.sender === "me" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", border: msg.sender === "producer" ? `1px solid ${C.cardBorder}` : "none", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 13, lineHeight: 1.55 }}>{msg.text}</p>
                        <span style={{ fontSize: 10, opacity: 0.65 }}>{msg.time}</span>
                      </div>
                      {msg.sender === "me" && (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.greenLight, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          ME
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.cardBorder}`, background: C.cardBg }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      placeholder="Type your message to the producer..."
                      style={{ flex: 1, padding: "11px 16px", border: `1px solid ${C.cardBorder}`, borderRadius: 12, fontSize: 13, fontFamily: font, outline: "none", background: C.sectionBg, color: C.textPrimary }} />
                    <button onClick={sendMessage} disabled={!input.trim()}
                      style={{ padding: "11px 18px", background: input.trim() ? C.green : C.cardBorder, color: "#fff", border: "none", borderRadius: 12, cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, fontFamily: font, transition: "background 0.15s" }}>
                      <Send size={14} /> Send
                    </button>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: C.textMuted, textAlign: "center" }}>
                    Producers typically respond within 24 hours. For urgent food safety issues, use the red button above.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Food Safety Modal */}
      {showSafetyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowSafetyModal(false); setSafetySubmitted(false); setSafetyText(""); } }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
            style={{ background: C.cardBg, borderRadius: 24, padding: 36, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={20} color="#991b1b" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#991b1b", fontFamily: font }}>Food Safety Report</h2>
                  <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>{activeOrder?.order_number}</p>
                </div>
              </div>
              <button onClick={() => { setShowSafetyModal(false); setSafetySubmitted(false); setSafetyText(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted }}>
                <X size={20} />
              </button>
            </div>

            {safetySubmitted ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <CheckCircle2 size={48} color={C.green} style={{ marginBottom: 14 }} />
                <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: C.textPrimary, fontFamily: font }}>Report Submitted</h3>
                <p style={{ margin: "0 0 24px", fontSize: 14, color: C.textBody }}>
                  Your food safety concern has been logged and flagged to the producer and our admin team. We'll follow up within 2 hours.
                </p>
                <button onClick={() => { setShowSafetyModal(false); setSafetySubmitted(false); setSafetyText(""); }}
                  style={{ padding: "11px 28px", background: C.green, color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: font }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <p style={{ margin: "0 0 16px", fontSize: 14, color: C.textBody }}>
                  Describe the food safety concern in detail. This will be flagged as urgent and sent to both the producer and our admin team immediately.
                </p>
                <textarea value={safetyText} onChange={e => setSafetyText(e.target.value)}
                  placeholder="e.g. Found foreign object in product, unusual smell or appearance, suspected contamination..."
                  rows={5}
                  style={{ width: "100%", padding: "12px 14px", border: `1px solid ${C.cardBorder}`, borderRadius: 12, fontSize: 13, fontFamily: font, outline: "none", resize: "vertical", color: C.textPrimary, background: C.sectionBg, boxSizing: "border-box" }} />
                <button onClick={submitSafetyReport} disabled={!safetyText.trim()}
                  style={{ marginTop: 14, width: "100%", padding: "13px 0", background: safetyText.trim() ? "#dc2626" : "#fca5a5", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: safetyText.trim() ? "pointer" : "default", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <ShieldAlert size={16} /> Submit Urgent Report
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
