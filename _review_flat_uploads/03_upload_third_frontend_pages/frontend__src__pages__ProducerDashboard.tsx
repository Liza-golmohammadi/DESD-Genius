import { useEffect, useState } from "react";
import api from "../api";
import useAuth from "../context/useAuth";

// ── Domain types ──────────────────────────────────────────────────────────────
type ProducerProfile = {
  store_name: string;
  store_description: string;
  store_contact: string;
  store_created_at: string;
};

type ProducerMe = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_producer: boolean;
  accepted_terms_at: string | null;
  producer_profile: ProducerProfile;
};

type Category = { id: number; name: string };

type Product = {
  id: number;
  sku: string;
  name: string;
  price: string;
  unit: string;
  image_url: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_available: boolean;
  organic_certified: boolean;
  available_from: string | null;
  available_to: string | null;
  is_in_season?: boolean;
  is_low_stock?: boolean;
  category: { id: number; name: string };
  producer_name: string;
};

type OrderItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: number;
};

type ProducerOrder = {
  id: number;
  subtotal: string;
  producer_payout: string;
  delivery_date: string;
  status: string;
  status_display: string;
  notes: string;
  items: OrderItem[];
};

// ── AI types ──────────────────────────────────────────────────────────────────
type AttributeScore = {
  score: number;
  grade: string;
  passed_a?: boolean;
  passed_b?: boolean;
  threshold_a?: number;
  threshold_b?: number;
};

type GradeBreakdown = {
  colour: AttributeScore;
  size: AttributeScore;
  ripeness: AttributeScore;
  overall_grade: string;
  weakest_attribute: string;
  explanation: string;
  confidence: number;
  is_mock: boolean;
};

type XaiExplanation = {
  technical?: {
    breakdown?: GradeBreakdown;
    confidence?: number;
    model_version?: string;
    threshold_comparison?: Record<string, { score: number; vs_grade_a: number; status: string }>;
  };
  non_technical?: {
    summary?: string;
    implication?: string;
    action?: string;
  };
  grad_cam_available?: boolean;
  grad_cam_url?: string | null;
};

type AssessmentResult = {
  id: number;
  product_id: number;
  product_name: string;
  colour_score: number;
  size_score: number;
  ripeness_score: number;
  overall_grade: "A" | "B" | "C";
  grade_display: string;
  confidence: number;
  is_mock: boolean;
  auto_discount_applied: boolean;
  discount_percentage: number | null;
  assessed_at: string;
  model_version: string;
  grade_breakdown: GradeBreakdown | null;
  xai_explanation: XaiExplanation | null;
  discount_recommendation: { apply_discount: boolean; percentage: number; reason: string } | null;
};

type GradeStats = {
  total: number;
  grade_a_count: number;
  grade_a_pct: number;
  grade_b_count: number;
  grade_b_pct: number;
  grade_c_count: number;
  grade_c_pct: number;
  avg_confidence: number;
  avg_colour: number;
  avg_size: number;
  avg_ripeness: number;
  trend: "improving" | "stable" | "declining";
  mock_percentage: number;
};

type RecentAssessment = {
  id: number;
  product_name: string;
  grade: string;
  confidence: number;
  assessed_at: string;
  auto_discount_applied?: boolean;
};

type AiInsights = {
  grade_statistics: GradeStats;
  recent_assessments: RecentAssessment[];
  revenue_impact: {
    grade_c_caught_this_week: number;
    estimated_waste_prevented_gbp: number;
    note: string;
  };
  trend_chart_b64: string | null;
  recommendations_for_improvement: string[];
  auto_discounts_this_week?: number;
};

// ── Order helpers ─────────────────────────────────────────────────────────────
const NEXT_STATUSES: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready", "cancelled"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#fef3c7", color: "#92400e" },
  confirmed: { bg: "#dbeafe", color: "#1e40af" },
  ready:     { bg: "#d1fae5", color: "#065f46" },
  delivered: { bg: "#e0e7ff", color: "#3730a3" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

// ── Grade helpers ─────────────────────────────────────────────────────────────
const GRADE_CONFIG = {
  A: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7", label: "Excellent", dot: "#10b981" },
  B: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d", label: "Acceptable", dot: "#f59e0b" },
  C: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", label: "Poor", dot: "#ef4444" },
};

const TREND_CONFIG = {
  improving: { color: "#065f46", bg: "#d1fae5", icon: "↑", label: "Improving" },
  stable:    { color: "#1e40af", bg: "#dbeafe", icon: "→", label: "Stable" },
  declining: { color: "#991b1b", bg: "#fee2e2", icon: "↓", label: "Declining" },
};

// ── Misc helpers ──────────────────────────────────────────────────────────────
function errMsg(e: unknown): string {
  const r = (e as { response?: { data?: Record<string, unknown> } })?.response;
  const data = r?.data;
  if (!data) return (e as Error)?.message || "Something went wrong";
  if (typeof data === "object") {
    return Object.entries(data)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join(" | ");
  }
  return String(data);
}

function Badge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${accent ?? "#2d6a4f"}`, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#1b4332", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, score, grade }: { label: string; score: number; grade: string }) {
  const g = (GRADE_CONFIG as Record<string, typeof GRADE_CONFIG.A>)[grade] ?? GRADE_CONFIG.B;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{score.toFixed(1)}%</span>
          <span style={{ padding: "1px 7px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: g.bg, color: g.color, border: `1px solid ${g.border}` }}>
            Grade {grade}
          </span>
        </div>
      </div>
      <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(score, 100)}%`,
            background: `linear-gradient(90deg, ${g.dot}, ${g.color})`,
            borderRadius: 4,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── AI Assessment Result Modal ────────────────────────────────────────────────
function AssessmentModal({ result, onClose }: { result: AssessmentResult; onClose: () => void }) {
  const gc = GRADE_CONFIG[result.overall_grade] ?? GRADE_CONFIG.B;
  const confPct = Math.round(result.confidence * 100);
  const xai = result.xai_explanation;
  const bd = result.grade_breakdown;
  const nt = xai?.non_technical;
  const heatmapUrl = xai?.grad_cam_url ?? null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal header ── */}
        <div style={{ background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)", borderRadius: "20px 20px 0 0", padding: "22px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ background: "rgba(255,255,255,0.15)", padding: "3px 10px", borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 700, letterSpacing: 0.5 }}>
                  AI QUALITY ASSESSMENT
                </span>
                {result.is_mock && (
                  <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    DEMO MODE
                  </span>
                )}
              </div>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 800 }}>{result.product_name}</h2>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 3 }}>
                Assessment #{result.id} · {new Date(result.assessed_at).toLocaleString()} · Model v{result.model_version}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 32, height: 32, color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Verdict row ── */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {/* Grade */}
            <div style={{ flex: 1, minWidth: 120, background: gc.bg, border: `2px solid ${gc.border}`, borderRadius: 16, padding: "20px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: gc.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Overall Grade</div>
              <div style={{ fontSize: 52, fontWeight: 900, color: gc.color, lineHeight: 1 }}>{result.overall_grade}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: gc.color, marginTop: 4 }}>{gc.label}</div>
            </div>

            {/* Confidence */}
            <div style={{ flex: 1, minWidth: 160, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Model Confidence</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#1b4332" }}>{confPct}<span style={{ fontSize: 18 }}>%</span></div>
              <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${confPct}%`, background: confPct >= 80 ? "#10b981" : confPct >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 3, transition: "width 0.6s" }} />
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>
                {confPct >= 80 ? "High confidence" : confPct >= 60 ? "Moderate confidence" : "Low confidence — treat with caution"}
              </div>
            </div>

            {/* Status */}
            <div style={{ flex: 1, minWidth: 140, background: result.overall_grade === "C" ? "#fee2e2" : "#d1fae5", border: `1px solid ${result.overall_grade === "C" ? "#fca5a5" : "#6ee7b7"}`, borderRadius: 16, padding: "20px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: result.overall_grade === "C" ? "#991b1b" : "#065f46", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Sale Status</div>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{result.overall_grade === "C" ? "🚫" : "✅"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: result.overall_grade === "C" ? "#991b1b" : "#065f46" }}>
                {result.overall_grade === "C" ? "Not suitable for sale" : "Suitable for sale"}
              </div>
              {result.auto_discount_applied && result.discount_percentage && (
                <div style={{ marginTop: 6, background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                  {result.discount_percentage}% auto-discount applied
                </div>
              )}
            </div>
          </div>

          {/* ── Attribute scores ── */}
          {(result.colour_score > 0 || result.size_score > 0 || result.ripeness_score > 0) && (
            <div style={{ background: "#f8fafc", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>📊</span> Multi-Dimensional Quality Analysis
              </div>
              <ScoreBar
                label="Colour Uniformity"
                score={result.colour_score}
                grade={bd?.colour?.grade ?? (result.colour_score >= 85 ? "A" : result.colour_score >= 70 ? "B" : "C")}
              />
              <ScoreBar
                label="Size Consistency"
                score={result.size_score}
                grade={bd?.size?.grade ?? (result.size_score >= 85 ? "A" : result.size_score >= 70 ? "B" : "C")}
              />
              <ScoreBar
                label="Ripeness Index"
                score={result.ripeness_score}
                grade={bd?.ripeness?.grade ?? (result.ripeness_score >= 80 ? "A" : result.ripeness_score >= 65 ? "B" : "C")}
              />
              {bd?.weakest_attribute && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280", background: "#fef3c7", borderRadius: 8, padding: "8px 12px" }}>
                  ⚠ Weakest attribute: <strong style={{ color: "#92400e", textTransform: "capitalize" }}>{bd.weakest_attribute}</strong> — focus improvement here
                </div>
              )}
            </div>
          )}

          {/* ── Plain-English explanation ── */}
          {nt?.summary && (
            <div style={{ background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)", border: "1px solid #bbf7d0", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>💬</span> What This Means
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 14, color: "#1b4332", lineHeight: 1.6 }}>{nt.summary}</p>
              {nt.implication && <p style={{ margin: "0 0 8px", fontSize: 13, color: "#2d6a4f", lineHeight: 1.5 }}><strong>Implication:</strong> {nt.implication}</p>}
              {nt.action && <p style={{ margin: 0, fontSize: 13, color: "#2d6a4f", lineHeight: 1.5 }}><strong>Recommended action:</strong> {nt.action}</p>}
            </div>
          )}

          {/* ── Technical explanation from grade breakdown ── */}
          {bd?.explanation && !nt?.summary && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46", marginBottom: 6 }}>Assessment Summary</div>
              <p style={{ margin: 0, fontSize: 14, color: "#1b4332", lineHeight: 1.6 }}>{bd.explanation}</p>
            </div>
          )}

          {/* ── XAI Heatmap ── */}
          {heatmapUrl && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>🔬</span> Visual Explanation (XAI)
                <span style={{ marginLeft: 6, fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
                  Edge-based attention heatmap — highlighted regions influenced the model decision
                </span>
              </div>
              <img
                src={heatmapUrl}
                alt="XAI Heatmap"
                style={{ width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 10, marginTop: 8, border: "1px solid #e2e8f0" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* ── Discount recommendation ── */}
          {result.discount_recommendation?.apply_discount && (
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>💰</span> Discount Recommendation
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#78350f", lineHeight: 1.5 }}>
                Reduce price by <strong>{result.discount_recommendation.percentage}%</strong> — {result.discount_recommendation.reason}
              </p>
            </div>
          )}

          {/* ── Technical metadata ── */}
          <details style={{ borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <summary style={{ padding: "12px 16px", background: "#f9fafb", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6b7280" }}>
              Technical Details
            </summary>
            <div style={{ padding: "14px 16px", fontSize: 12, color: "#6b7280", display: "flex", flexDirection: "column", gap: 6, fontFamily: "monospace", lineHeight: 1.7 }}>
              <div>Assessment ID: <strong>{result.id}</strong></div>
              <div>Model version: <strong>{result.model_version || "—"}</strong></div>
              <div>Mode: <strong>{result.is_mock ? "mock (demo)" : "live inference"}</strong></div>
              <div>Raw confidence: <strong>{result.confidence.toFixed(4)}</strong></div>
              {result.colour_score > 0 && <div>Colour / Size / Ripeness: <strong>{result.colour_score.toFixed(1)} / {result.size_score.toFixed(1)} / {result.ripeness_score.toFixed(1)}</strong></div>}
              {result.auto_discount_applied && <div>Auto-discount applied: <strong>{result.discount_percentage}%</strong></div>}
              <div>Assessed at: <strong>{new Date(result.assessed_at).toISOString()}</strong></div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

// ── Product Form Modal ────────────────────────────────────────────────────────
function ProductModal({ categories, initial, onClose, onSaved }: { categories: Category[]; initial?: Partial<Product>; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: "",
    price: initial?.price ?? "",
    unit: initial?.unit ?? "unit",
    image_url: initial?.image_url ?? "",
    stock_quantity: String(initial?.stock_quantity ?? ""),
    low_stock_threshold: String(initial?.low_stock_threshold ?? "5"),
    is_available: initial?.is_available ?? true,
    organic_certified: initial?.organic_certified ?? false,
    available_from: initial?.available_from ?? "",
    available_to: initial?.available_to ?? "",
    harvest_date: "",
    category: String(initial?.category?.id ?? (categories[0]?.id ?? "")),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        ...form,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity),
        low_stock_threshold: parseInt(form.low_stock_threshold),
        category: parseInt(form.category),
        available_from: form.available_from || null,
        available_to: form.available_to || null,
      };
      if (!body.image_url) delete body.image_url;
      if (isEdit) {
        await api.patch(`/api/products/${initial!.id}/inventory/`, {
          stock_quantity: body.stock_quantity,
          low_stock_threshold: body.low_stock_threshold,
          is_available: body.is_available,
          available_from: body.available_from,
          available_to: body.available_to,
        });
      } else {
        await api.post("/api/products/", body);
      }
      onSaved();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" };
  const half: React.CSSProperties = { flex: 1 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800 }}>{isEdit ? "Edit Inventory" : "Add New Product"}</h3>
        {err && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 9, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>{err}</div>}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!isEdit && (
            <>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Product Name *</label>
                <input required style={inp} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Organic Carrots" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Description *</label>
                <textarea required style={{ ...inp, minHeight: 70, resize: "vertical" }} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe your product..." />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={half}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Price (£) *</label>
                  <input required type="number" min="0" step="0.01" style={inp} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="2.50" />
                </div>
                <div style={half}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Unit *</label>
                  <input required style={inp} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="kg / bunch / 500g" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={half}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Category *</label>
                  <select required style={inp} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={half}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Harvest Date *</label>
                  <input required type="date" style={inp} value={form.harvest_date} onChange={(e) => setForm((f) => ({ ...f, harvest_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Image URL</label>
                <input type="url" style={inp} value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={half}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Stock Quantity *</label>
              <input required type="number" min="0" style={inp} value={form.stock_quantity} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} />
            </div>
            <div style={half}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Low Stock Alert At</label>
              <input type="number" min="0" style={inp} value={form.low_stock_threshold} onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={half}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Available From</label>
              <input type="date" style={inp} value={form.available_from ?? ""} onChange={(e) => setForm((f) => ({ ...f, available_from: e.target.value }))} />
            </div>
            <div style={half}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Available To</label>
              <input type="date" style={inp} value={form.available_to ?? ""} onChange={(e) => setForm((f) => ({ ...f, available_to: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} style={{ accentColor: "#2d6a4f", width: 15, height: 15 }} />
              Available for sale
            </label>
            {!isEdit && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={form.organic_certified} onChange={(e) => setForm((f) => ({ ...f, organic_certified: e.target.checked }))} style={{ accentColor: "#2d6a4f", width: 15, height: 15 }} />
                Organic Certified
              </label>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#1b4332", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 14 }}>
              {saving ? "Saving…" : isEdit ? "Update Inventory" : "Add Product"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 14 }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ProducerDashboard() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState<"products" | "orders" | "payments" | "ai" | "profile">("products");

  // Profile
  const [profile, setProfile] = useState<ProducerMe | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeContact, setStoreContact] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>(undefined);

  // Orders
  const [orders, setOrders] = useState<ProducerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  // AI assessment
  const [assessingId, setAssessingId] = useState<number | null>(null);
  const [assessErr, setAssessErr] = useState<string | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  // AI insights
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsErr, setInsightsErr] = useState<string | null>(null);

  // ── Loaders ───────────────────────────────────────────────────────────────
  async function loadProfile() {
    setProfileLoading(true);
    try {
      const res = await api.get<ProducerMe>("/accounts/auth/me/");
      setProfile(res.data);
      setUser(res.data as any);
      setStoreName(res.data.producer_profile?.store_name ?? "");
      setStoreDescription(res.data.producer_profile?.store_description ?? "");
      setStoreContact(res.data.producer_profile?.store_contact ?? "");
    } catch (e) {
      setProfileErr(errMsg(e));
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadProducts() {
    setProductsLoading(true);
    try {
      const producerId = user?.id ?? profile?.id;
      const url = producerId ? `/api/products/?producer_id=${producerId}` : "/api/products/";
      const res = await api.get<Product[]>(url);
      setProducts(res.data);
    } catch {
      // silently fail
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await api.get<Category[]>("/api/products/categories/");
      setCategories(res.data);
    } catch { /* ignore */ }
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const res = await api.get<ProducerOrder[]>("/api/orders/producer/");
      setOrders(res.data);
    } catch { /* silently fail */ } finally {
      setOrdersLoading(false);
    }
  }

  async function loadAiInsights() {
    setInsightsLoading(true);
    setInsightsErr(null);
    try {
      const res = await api.get<any>("/api/ai/producer/insights/");
      const raw = res.data;
      setAiInsights({
        ...raw,
        revenue_impact: raw.revenue_impact ?? raw.revenue_impact_estimate ?? null,
        trend_chart_b64: raw.trend_chart_b64 ?? raw.quality_trend_chart ?? null,
      } as AiInsights);
    } catch (e) {
      setInsightsErr(errMsg(e));
    } finally {
      setInsightsLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    loadProducts();
    loadCategories();
    loadOrders();
  }, []);

  useEffect(() => {
    if (tab === "ai" && !aiInsights && !insightsLoading) {
      loadAiInsights();
    }
  }, [tab]);

  // ── AI assessment ─────────────────────────────────────────────────────────
  async function assessProduct(productId: number) {
    setAssessingId(productId);
    setAssessErr(null);
    try {
      const res = await api.post<AssessmentResult>("/api/ai/quality/assess/", { product_id: productId });
      setAssessmentResult(res.data);
      // Refresh insights if tab is open
      if (tab === "ai") loadAiInsights();
    } catch (e) {
      setAssessErr(errMsg(e));
    } finally {
      setAssessingId(null);
    }
  }

  // ── Profile save ──────────────────────────────────────────────────────────
  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg(null);
    setProfileErr(null);
    try {
      await api.patch("/accounts/auth/me/", {
        producer_profile: {
          store_name: storeName,
          store_description: storeDescription,
          store_contact: storeContact,
        },
      });
      await loadProfile();
      setEditMode(false);
      setProfileMsg("Profile updated successfully.");
    } catch (e) {
      setProfileErr(errMsg(e));
    } finally {
      setProfileSaving(false);
    }
  }

  async function updateOrderStatus(orderId: number, newStatus: string) {
    setStatusUpdating(orderId);
    try {
      await api.patch(`/api/orders/producer/${orderId}/status/`, { status: newStatus, note: "" });
      await loadOrders();
    } catch { /* ignore */ } finally {
      setStatusUpdating(null);
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activeProducts = products.filter((p) => p.is_available && p.stock_quantity > 0).length;
  const lowStock = products.filter((p) => p.is_low_stock).length;
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "confirmed").length;
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.producer_payout || "0"), 0);

  const inp: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14, width: "100%", boxSizing: "border-box" };

  if (profileLoading) {
    return <div style={{ maxWidth: 900, margin: "60px auto", textAlign: "center", color: "#888" }}>Loading dashboard…</div>;
  }

  return (
    <div style={{ background: "#f4f7f4", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Banner ── */}
      <div style={{ background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)", padding: "32px 0 28px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#40916c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {(profile?.producer_profile?.store_name || profile?.first_name || "P")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 2 }}>Producer Dashboard</div>
              <h1 style={{ color: "#fff", margin: 0, fontSize: 24, fontWeight: 800 }}>
                {profile?.producer_profile?.store_name || `${profile?.first_name} ${profile?.last_name}`.trim() || "Your Store"}
              </h1>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>
                {profile?.email} · Member since {profile?.producer_profile?.store_created_at
                  ? new Date(profile.producer_profile.store_created_at).getFullYear()
                  : "—"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
            <StatCard label="Total Products" value={products.length} sub={`${activeProducts} active`} accent="#40916c" />
            <StatCard label="Low Stock" value={lowStock} sub="need restocking" accent={lowStock > 0 ? "#d97706" : "#40916c"} />
            <StatCard label="Active Orders" value={pendingOrders} sub="pending/confirmed" accent="#3b82f6" />
            <StatCard label="Total Revenue" value={`£${totalRevenue.toFixed(2)}`} sub="your payout" accent="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0, overflowX: "auto" }}>
          {(["products", "orders", "payments", "ai", "profile"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "14px 18px",
                border: "none",
                borderBottom: tab === t ? "2px solid #1b4332" : "2px solid transparent",
                background: "none",
                fontWeight: tab === t ? 700 : 500,
                color: tab === t ? "#1b4332" : "#6b7280",
                cursor: "pointer",
                fontSize: 14,
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t === "ai" && <span style={{ fontSize: 15 }}>🤖</span>}
              {t === "products" ? `Products (${products.length})`
                : t === "orders" ? `Orders (${orders.length})`
                : t === "payments" ? "Payments"
                : t === "ai" ? "AI Quality"
                : "Store Profile"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── PRODUCTS TAB ── */}
        {tab === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>My Products</h2>
              <button onClick={() => { setEditProduct(undefined); setShowModal(true); }} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#1b4332", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                + Add Product
              </button>
            </div>

            {assessErr && (
              <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14, display: "flex", justifyContent: "space-between" }}>
                <span>{assessErr}</span>
                <button onClick={() => setAssessErr(null)} style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontWeight: 700 }}>×</button>
              </div>
            )}

            {productsLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Loading products…</div>
            ) : products.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 14, padding: 48, textAlign: "center", color: "#aaa", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#555" }}>No products yet</div>
                <div style={{ fontSize: 14, marginTop: 6 }}>Add your first product to start selling.</div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["Product", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🥦</div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: 12, color: "#aaa" }}>{p.unit}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#555" }}>{p.category?.name}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#1b4332" }}>£{parseFloat(p.price).toFixed(2)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontWeight: 600, color: p.is_low_stock ? "#d97706" : "#111" }}>{p.stock_quantity}</span>
                          {p.is_low_stock && <span style={{ marginLeft: 6, fontSize: 11, color: "#d97706", fontWeight: 600 }}>⚠ Low</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: p.is_available ? "#d1fae5" : "#fee2e2", color: p.is_available ? "#065f46" : "#991b1b" }}>
                            {p.is_available ? "Active" : "Hidden"}
                          </span>
                          {p.organic_certified && <span style={{ marginLeft: 6, fontSize: 11, color: "#2d6a4f", fontWeight: 700 }}>🌿 Organic</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { setEditProduct(p); setShowModal(true); }} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#374151" }}>
                              Edit Stock
                            </button>
                            <button
                              onClick={() => assessProduct(p.id)}
                              disabled={assessingId === p.id}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 8,
                                border: "1px solid #40916c",
                                background: assessingId === p.id ? "#f0fdf4" : "#1b4332",
                                cursor: assessingId === p.id ? "not-allowed" : "pointer",
                                fontSize: 12,
                                fontWeight: 700,
                                color: assessingId === p.id ? "#40916c" : "#fff",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {assessingId === p.id ? (
                                <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Analysing…</>
                              ) : (
                                <>🤖 Assess Quality</>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === "orders" && (
          <div>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>Incoming Orders</h2>
            {ordersLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Loading orders…</div>
            ) : orders.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 14, padding: 48, textAlign: "center", color: "#aaa", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#555" }}>No orders yet</div>
                <div style={{ fontSize: 14, marginTop: 6 }}>Orders from customers will appear here.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {orders.map((order) => {
                  const nextOptions = NEXT_STATUSES[order.status] ?? [];
                  return (
                    <div key={order.id} style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", borderLeft: `4px solid ${STATUS_COLORS[order.status]?.color ?? "#ccc"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 800, fontSize: 16 }}>Order #{order.id}</span>
                            <Badge status={order.status} />
                          </div>
                          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                            Delivery: <strong>{order.delivery_date || "—"}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, fontSize: 18, color: "#1b4332" }}>£{parseFloat(order.producer_payout || "0").toFixed(2)}</div>
                          <div style={{ fontSize: 12, color: "#aaa" }}>your payout</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 14, borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
                        {order.items.map((item) => (
                          <div key={item.product_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "3px 0" }}>
                            <span>{item.product_name} × {item.quantity}</span>
                            <span style={{ fontWeight: 600 }}>£{Number(item.line_total).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      {nextOptions.length > 0 && (
                        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {nextOptions.map((s) => (
                            <button key={s} disabled={statusUpdating === order.id} onClick={() => updateOrderStatus(order.id, s)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: s === "cancelled" ? "#fee2e2" : "#1b4332", color: s === "cancelled" ? "#991b1b" : "#fff", fontWeight: 700, fontSize: 13, cursor: statusUpdating === order.id ? "not-allowed" : "pointer", textTransform: "capitalize" }}>
                              {statusUpdating === order.id ? "…" : `Mark ${s}`}
                            </button>
                          ))}
                        </div>
                      )}
                      {order.notes && <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>Note: {order.notes}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
        {tab === "payments" && (
          <div style={{ maxWidth: 700 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>Payments &amp; Settlement</h2>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>
                Summary of your earnings across all fulfilled orders. The platform retains a 5% commission and the remaining 95% is your payout.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Earnings</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#1f4d3a", marginTop: 4 }}>£{orders.reduce((sum, o) => sum + parseFloat(o.subtotal || "0"), 0).toFixed(2)}</div>
                </div>
                <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Commission (5%)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#92400e", marginTop: 4 }}>
                    £{(orders.reduce((sum, o) => sum + parseFloat(o.subtotal || "0"), 0) - orders.reduce((sum, o) => sum + parseFloat(o.producer_payout || "0"), 0)).toFixed(2)}
                  </div>
                </div>
                <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Net Payout</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#1e40af", marginTop: 4 }}>£{orders.reduce((sum, o) => sum + parseFloat(o.producer_payout || "0"), 0).toFixed(2)}</div>
                </div>
              </div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#1f4d3a" }}>Order Breakdown</h3>
              {orders.length === 0 ? (
                <p style={{ color: "#aaa", fontStyle: "italic" }}>No orders yet. Payment data will appear here once customers place orders.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px" }}>Order</th>
                        <th style={{ padding: "10px 12px" }}>Status</th>
                        <th style={{ padding: "10px 12px" }}>Subtotal</th>
                        <th style={{ padding: "10px 12px" }}>Commission</th>
                        <th style={{ padding: "10px 12px" }}>Your Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const sub = parseFloat(o.subtotal || "0");
                        const payout = parseFloat(o.producer_payout || "0");
                        const sc = STATUS_COLORS[o.status] ?? { bg: "#f3f4f6", color: "#374151" };
                        return (
                          <tr key={o.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 600 }}>#{o.id}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.color, textTransform: "capitalize" }}>{o.status}</span>
                            </td>
                            <td style={{ padding: "10px 12px" }}>£{sub.toFixed(2)}</td>
                            <td style={{ padding: "10px 12px", color: "#92400e" }}>-£{(sub - payout).toFixed(2)}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1f4d3a" }}>£{payout.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AI QUALITY TAB ── */}
        {tab === "ai" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>AI Quality Intelligence</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  MobileNetV2-powered quality grading across colour, size, and ripeness dimensions
                </p>
              </div>
              <button
                onClick={loadAiInsights}
                disabled={insightsLoading}
                style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #40916c", background: "#fff", color: "#1b4332", fontWeight: 700, cursor: insightsLoading ? "not-allowed" : "pointer", fontSize: 13 }}
              >
                {insightsLoading ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>

            {insightsErr && (
              <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
                {insightsErr}
              </div>
            )}

            {insightsLoading && !aiInsights ? (
              <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                <div>Loading AI insights…</div>
              </div>
            ) : aiInsights ? (
              <>
                {/* ── Summary stat cards ── */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
                  <StatCard
                    label="Total Assessments"
                    value={aiInsights.grade_statistics.total}
                    sub="all time"
                    accent="#2d6a4f"
                  />
                  <StatCard
                    label="Avg Confidence"
                    value={`${Math.round((aiInsights.grade_statistics.avg_confidence || 0) * 100)}%`}
                    sub="model certainty"
                    accent="#3b82f6"
                  />
                  <StatCard
                    label="Quality Trend"
                    value={TREND_CONFIG[aiInsights.grade_statistics.trend]?.icon + " " + TREND_CONFIG[aiInsights.grade_statistics.trend]?.label}
                    sub="last 20 vs previous 20"
                    accent={TREND_CONFIG[aiInsights.grade_statistics.trend]?.color ?? "#6b7280"}
                  />
                  <StatCard
                    label="Waste Prevented"
                    value={`£${(aiInsights.revenue_impact?.estimated_waste_prevented_gbp || 0).toFixed(0)}`}
                    sub="est. value this week"
                    accent="#8b5cf6"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

                  {/* ── Grade distribution ── */}
                  <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1b4332", marginBottom: 16 }}>Grade Distribution</div>
                    {aiInsights.grade_statistics.total === 0 ? (
                      <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No assessments yet</div>
                    ) : (
                      <>
                        {(["A", "B", "C"] as const).map((g) => {
                          const count = aiInsights.grade_statistics[`grade_${g.toLowerCase()}_count` as keyof GradeStats] as number;
                          const pct = aiInsights.grade_statistics[`grade_${g.toLowerCase()}_pct` as keyof GradeStats] as number;
                          const gc = GRADE_CONFIG[g];
                          return (
                            <div key={g} style={{ marginBottom: 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ width: 24, height: 24, borderRadius: 6, background: gc.bg, color: gc.color, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${gc.border}` }}>{g}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>{gc.label}</span>
                                </div>
                                <span style={{ fontSize: 13, color: "#6b7280" }}>{count} ({pct.toFixed(1)}%)</span>
                              </div>
                              <div style={{ height: 10, background: "#f3f4f6", borderRadius: 5, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: gc.dot, borderRadius: 5, transition: "width 0.6s" }} />
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f3f4f6", display: "flex", gap: 16, fontSize: 12, color: "#6b7280" }}>
                          <span>Avg colour: <strong style={{ color: "#1b4332" }}>{aiInsights.grade_statistics.avg_colour?.toFixed(1) ?? "—"}%</strong></span>
                          <span>Avg size: <strong style={{ color: "#1b4332" }}>{aiInsights.grade_statistics.avg_size?.toFixed(1) ?? "—"}%</strong></span>
                          <span>Avg ripeness: <strong style={{ color: "#1b4332" }}>{aiInsights.grade_statistics.avg_ripeness?.toFixed(1) ?? "—"}%</strong></span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Trend chart or revenue impact ── */}
                  <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                    {aiInsights.trend_chart_b64 ? (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1b4332", marginBottom: 12 }}>Quality Trend Chart</div>
                        <img
                          src={`data:image/png;base64,${aiInsights.trend_chart_b64}`}
                          alt="Quality trend"
                          style={{ width: "100%", borderRadius: 8 }}
                        />
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1b4332", marginBottom: 16 }}>Business Impact (This Week)</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "14px 16px" }}>
                            <div style={{ fontSize: 12, color: "#065f46", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Grade C Products Caught</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: "#1b4332" }}>{aiInsights.revenue_impact?.grade_c_caught_this_week ?? 0}</div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>early quality failures detected</div>
                          </div>
                          <div style={{ background: "#ede9fe", borderRadius: 10, padding: "14px 16px" }}>
                            <div style={{ fontSize: 12, color: "#5b21b6", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Estimated Waste Prevented</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: "#1b4332" }}>£{(aiInsights.revenue_impact?.estimated_waste_prevented_gbp || 0).toFixed(2)}</div>
                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{aiInsights.revenue_impact?.note}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Improvement recommendations ── */}
                {aiInsights.recommendations_for_improvement?.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1b4332", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 16 }}>💡</span> AI Improvement Recommendations
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {aiInsights.recommendations_for_improvement.map((rec, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, background: "#f8fafc", borderRadius: 10, padding: "12px 14px", borderLeft: "3px solid #40916c" }}>
                          <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Recent assessments table ── */}
                {aiInsights.recent_assessments?.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1b4332" }}>Recent Assessments</div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {["Product", "Grade", "Confidence", "Date", "Discount"].map((h) => (
                            <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {aiInsights.recent_assessments.map((a, i) => {
                          const gc = (GRADE_CONFIG as Record<string, typeof GRADE_CONFIG.A>)[a.grade] ?? GRADE_CONFIG.B;
                          return (
                            <tr key={a.id} style={{ borderBottom: i < aiInsights.recent_assessments.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                              <td style={{ padding: "11px 16px", fontWeight: 600 }}>{a.product_name}</td>
                              <td style={{ padding: "11px 16px" }}>
                                <span style={{ padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: gc.bg, color: gc.color, border: `1px solid ${gc.border}` }}>
                                  {a.grade} — {gc.label}
                                </span>
                              </td>
                              <td style={{ padding: "11px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <div style={{ width: 48, height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${Math.round(a.confidence * 100)}%`, background: "#40916c", borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontSize: 12, color: "#6b7280" }}>{Math.round(a.confidence * 100)}%</span>
                                </div>
                              </td>
                              <td style={{ padding: "11px 16px", color: "#9ca3af", fontSize: 12 }}>
                                {new Date(a.assessed_at).toLocaleDateString()}
                              </td>
                              <td style={{ padding: "11px 16px" }}>
                                {a.auto_discount_applied
                                  ? <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "2px 8px", borderRadius: 5 }}>Applied</span>
                                  : <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Model info footer ── */}
                <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", fontSize: 12, color: "#065f46", display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <span>Model: <strong>MobileNetV2 (transfer learning)</strong></span>
                  <span>Classification: <strong>Colour · Size · Ripeness</strong></span>
                  <span>XAI: <strong>Edge-based heatmap</strong></span>
                  {aiInsights.grade_statistics.mock_percentage > 0 && (
                    <span style={{ color: "#92400e" }}>Demo mode: <strong>{aiInsights.grade_statistics.mock_percentage.toFixed(0)}% mock data</strong></span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ background: "#fff", borderRadius: 14, padding: 48, textAlign: "center", color: "#aaa", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#555" }}>No AI data yet</div>
                <div style={{ fontSize: 14, marginTop: 6 }}>Run your first quality assessment from the Products tab.</div>
                <button onClick={() => setTab("products")} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, border: "none", background: "#1b4332", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  Go to Products
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>Store Profile</h2>
            {profileMsg && <div style={{ background: "#d1fae5", color: "#065f46", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>{profileMsg}</div>}
            {profileErr && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>{profileErr}</div>}
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Email</label>
                <div style={{ fontSize: 15 }}>{profile?.email}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Name</label>
                <div style={{ fontSize: 15 }}>{`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Store Since</label>
                <div style={{ fontSize: 15 }}>
                  {profile?.producer_profile?.store_created_at
                    ? new Date(profile.producer_profile.store_created_at).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Store Name</label>
                  {editMode ? (
                    <input style={inp} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Your store name" />
                  ) : (
                    <div style={{ fontSize: 15 }}>{storeName || <span style={{ color: "#aaa" }}>—</span>}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Store Description</label>
                  {editMode ? (
                    <textarea style={{ ...inp, minHeight: 90, resize: "vertical" }} value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} placeholder="Tell customers about your farm / business" />
                  ) : (
                    <div style={{ fontSize: 15, lineHeight: 1.6 }}>{storeDescription || <span style={{ color: "#aaa" }}>—</span>}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Store Contact</label>
                  {editMode ? (
                    <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={storeContact} onChange={(e) => setStoreContact(e.target.value)} placeholder="Phone, WhatsApp, Instagram, pickup address…" />
                  ) : (
                    <div style={{ fontSize: 15, lineHeight: 1.6 }}>{storeContact || <span style={{ color: "#aaa" }}>—</span>}</div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                {!editMode ? (
                  <button onClick={() => { setProfileMsg(null); setProfileErr(null); setEditMode(true); }} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button onClick={saveProfile} disabled={profileSaving} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#1b4332", color: "#fff", fontWeight: 700, cursor: profileSaving ? "not-allowed" : "pointer", fontSize: 14 }}>
                      {profileSaving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setStoreName(profile?.producer_profile?.store_name ?? "");
                        setStoreDescription(profile?.producer_profile?.store_description ?? "");
                        setStoreContact(profile?.producer_profile?.store_contact ?? "");
                      }}
                      style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 14 }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <ProductModal
          categories={categories}
          initial={editProduct}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadProducts(); }}
        />
      )}

      {assessmentResult && (
        <AssessmentModal
          result={assessmentResult}
          onClose={() => setAssessmentResult(null)}
        />
      )}
    </div>
  );
}
