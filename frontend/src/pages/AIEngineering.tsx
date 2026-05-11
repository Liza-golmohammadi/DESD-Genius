import { useEffect, useState } from "react";
import api from "../api";

type MLModel = {
  id: number; name: string; version: string; model_type: string;
  architecture: string; accuracy: number | null; f1_score: number | null;
  is_active: boolean; uploaded_at: string; notes: string; changelog: string;
};
type Interaction = {
  id: number; customer_email: string; product_id: number; product_name: string;
  category: string | null; interaction_type: string; quantity: number;
  override_reason: string; created_at: string;
};
type InteractionData = {
  total_count: number; returned: number; offset: number; limit: number;
  type_breakdown: Record<string, number>; records: Interaction[];
};

const C: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "20px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
};
const BTN: React.CSSProperties = {
  padding: "8px 18px", borderRadius: 10, border: "none", background: "#2d6a4f",
  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const INP: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db",
  fontSize: 13, boxSizing: "border-box",
};
const LBL: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" };

const TABS = ["Model Registry", "Upload Model", "Interaction Data"] as const;
type Tab = (typeof TABS)[number];

export default function AIEngineering() {
  const [tab, setTab] = useState<Tab>("Model Registry");

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7f4", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 60%, #40916c 100%)", padding: "40px 24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚙️</span> AI Engineering Console
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, margin: 0, maxWidth: 500 }}>
            Upload trained ML models, manage versions, and access user interaction data for model refinement.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #e5e7eb" }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 20px", border: "none", background: "transparent", fontSize: 14,
              fontWeight: tab === t ? 700 : 500, color: tab === t ? "#1b4332" : "#6b7280",
              borderBottom: tab === t ? "3px solid #1b4332" : "3px solid transparent",
              cursor: "pointer", marginBottom: -2,
            }}>{t}</button>
          ))}
        </div>

        {tab === "Model Registry" && <ModelRegistry />}
        {tab === "Upload Model" && <UploadModel />}
        {tab === "Interaction Data" && <InteractionBrowser />}
      </div>
    </div>
  );
}

/* ═══════════════ Model Registry ═══════════════ */
function ModelRegistry() {
  const [models, setModels] = useState<MLModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => { loadModels(); }, []);
  function loadModels() {
    setLoading(true);
    api.get<MLModel[]>("/api/ai/models/").then(r => setModels(r.data)).catch(() => setMsg("Failed to load models.")).finally(() => setLoading(false));
  }

  async function activate(id: number) {
    try {
      await api.post(`/api/ai/models/${id}/activate/`);
      setMsg("Model activated ✓");
      loadModels();
    } catch { setMsg("Failed to activate model."); }
    setTimeout(() => setMsg(""), 3000);
  }

  if (loading) return <p style={{ color: "#6b7280" }}>Loading models…</p>;

  return (
    <div>
      {msg && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: msg.includes("✓") ? "#ecfdf5" : "#fef2f2", color: msg.includes("✓") ? "#065f46" : "#991b1b", border: msg.includes("✓") ? "1px solid #bbf7d0" : "1px solid #fecaca", fontSize: 13, fontWeight: 600 }}>{msg}</div>}

      {models.length === 0 ? (
        <div style={{ ...C, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1b4332" }}>No models registered yet</div>
          <p style={{ color: "#6b7280", fontSize: 13 }}>Use the "Upload Model" tab to register your first model.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {models.map((m) => (
            <div key={m.id} style={{ ...C, border: m.is_active ? "2px solid #86efac" : "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1b4332" }}>{m.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>v{m.version}</span>
                  {m.is_active && <span style={{ fontSize: 10, fontWeight: 800, color: "#065f46", background: "#d1fae5", borderRadius: 6, padding: "2px 8px" }}>ACTIVE</span>}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {m.model_type} · {m.architecture || "—"} · Uploaded {new Date(m.uploaded_at).toLocaleDateString()}
                </div>
                {m.notes && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{m.notes}</div>}
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>Accuracy</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1b4332" }}>{m.accuracy != null ? `${(m.accuracy * 100).toFixed(1)}%` : "—"}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>F1</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1b4332" }}>{m.f1_score != null ? m.f1_score.toFixed(3) : "—"}</div>
                </div>
                {!m.is_active && (
                  <button onClick={() => activate(m.id)} style={{ ...BTN, background: "#065f46", fontSize: 12, padding: "6px 14px" }}>
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Upload Model ═══════════════ */
function UploadModel() {
  const [form, setForm] = useState({ name: "", version: "", model_type: "quality_classifier", model_file_path: "", architecture: "", accuracy: "", f1_score: "", notes: "", changelog: "", activate: false });
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(key: string, val: string | boolean) { setForm(f => ({ ...f, [key]: val })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.version || !form.model_file_path) { setMsg("Name, version, and model file path are required."); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (form.accuracy) payload.accuracy = parseFloat(form.accuracy);
      if (form.f1_score) payload.f1_score = parseFloat(form.f1_score);
      await api.post("/api/ai/models/upload/", payload);
      setMsg("Model registered successfully ✓");
      setForm({ name: "", version: "", model_type: "quality_classifier", model_file_path: "", architecture: "", accuracy: "", f1_score: "", notes: "", changelog: "", activate: false });
    } catch (err: any) {
      setMsg(err?.response?.data?.error || "Failed to register model.");
    } finally { setSubmitting(false); setTimeout(() => setMsg(""), 4000); }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {msg && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: msg.includes("✓") ? "#ecfdf5" : "#fef2f2", color: msg.includes("✓") ? "#065f46" : "#991b1b", border: msg.includes("✓") ? "1px solid #bbf7d0" : "1px solid #fecaca", fontSize: 13, fontWeight: 600 }}>{msg}</div>}

      <div style={C}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#1b4332" }}>Register a New ML Model</h3>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><label style={LBL}>Model Name *</label><input style={INP} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. FruitQualityNet" /></div>
            <div><label style={LBL}>Version *</label><input style={INP} value={form.version} onChange={e => set("version", e.target.value)} placeholder="e.g. v2.1" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={LBL}>Model Type *</label>
              <select style={INP} value={form.model_type} onChange={e => set("model_type", e.target.value)}>
                <option value="quality_classifier">Quality Classifier</option>
                <option value="recommendation">Recommendation Engine</option>
              </select>
            </div>
            <div><label style={LBL}>Architecture</label><input style={INP} value={form.architecture} onChange={e => set("architecture", e.target.value)} placeholder="e.g. MobileNetV2" /></div>
          </div>
          <div><label style={LBL}>Model File Path *</label><input style={INP} value={form.model_file_path} onChange={e => set("model_file_path", e.target.value)} placeholder="/models/quality_classifier_v2.1.h5" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><label style={LBL}>Accuracy (0–1)</label><input type="number" step="0.001" min="0" max="1" style={INP} value={form.accuracy} onChange={e => set("accuracy", e.target.value)} placeholder="0.952" /></div>
            <div><label style={LBL}>F1 Score (0–1)</label><input type="number" step="0.001" min="0" max="1" style={INP} value={form.f1_score} onChange={e => set("f1_score", e.target.value)} placeholder="0.948" /></div>
          </div>
          <div><label style={LBL}>Notes</label><textarea style={{ ...INP, minHeight: 60 }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Training notes, dataset info…" /></div>
          <div><label style={LBL}>Changelog</label><textarea style={{ ...INP, minHeight: 60 }} value={form.changelog} onChange={e => set("changelog", e.target.value)} placeholder="What changed from previous version…" /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={form.activate} onChange={e => set("activate", e.target.checked)} style={{ accentColor: "#2d6a4f", width: 16, height: 16 }} />
            Activate this model immediately (deactivates current active model of same type)
          </label>
          <button type="submit" disabled={submitting} style={{ ...BTN, padding: "10px 0", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Registering…" : "Register Model"}
          </button>
        </form>
      </div>

      <div style={{ ...C, marginTop: 20, background: "#f8fafc" }}>
        <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#374151" }}>📋 Upload Workflow</h4>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#6b7280", lineHeight: 1.8 }}>
          <li>Train your model externally (Jupyter, Colab, local GPU)</li>
          <li>Save the model file to the server's <code>/models/</code> directory</li>
          <li>Fill in the form above with the file path and performance metrics</li>
          <li>Optionally activate to make it the live model immediately</li>
        </ol>
      </div>
    </div>
  );
}

/* ═══════════════ Interaction Browser ═══════════════ */
function InteractionBrowser() {
  const [data, setData] = useState<InteractionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterDays, setFilterDays] = useState("");
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  useEffect(() => { load(0); }, [filterType, filterDays]);

  function load(offset: number) {
    setLoading(true);
    const params: Record<string, string> = { limit: String(LIMIT), offset: String(offset) };
    if (filterType) params.type = filterType;
    if (filterDays) params.days = filterDays;
    api.get<InteractionData>("/api/ai/interactions/", { params })
      .then(r => { setData(r.data); setPage(offset); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function exportCSV() {
    const params = new URLSearchParams({ format: "csv" });
    if (filterType) params.set("type", filterType);
    if (filterDays) params.set("days", filterDays);
    window.open(`${(api.defaults.baseURL || "http://localhost:8000")}/api/ai/interactions/?${params}`, "_blank");
  }

  const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
    purchased: { bg: "#d1fae5", fg: "#065f46" }, reordered: { bg: "#dbeafe", fg: "#1e40af" },
    viewed: { bg: "#f3f4f6", fg: "#374151" }, added_to_cart: { bg: "#fef3c7", fg: "#92400e" },
    overrode_recommendation: { bg: "#fee2e2", fg: "#991b1b" }, dismissed_recommendation: { bg: "#fce7f3", fg: "#9d174d" },
  };

  return (
    <div>
      {/* Summary cards */}
      {data?.type_breakdown && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.entries(data.type_breakdown).map(([type, count]) => {
            const tc = TYPE_COLORS[type] || { bg: "#f3f4f6", fg: "#374151" };
            return (
              <div key={type} onClick={() => setFilterType(filterType === type ? "" : type)}
                style={{ ...C, padding: "10px 16px", cursor: "pointer", border: filterType === type ? "2px solid #2d6a4f" : "1px solid #e5e7eb", minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1b4332" }}>{count}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: tc.fg, background: tc.bg, borderRadius: 6, padding: "2px 8px", marginTop: 4, textAlign: "center" }}>
                  {type.replace(/_/g, " ")}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select style={{ ...INP, width: "auto", minWidth: 160 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All interaction types</option>
          <option value="purchased">Purchased</option>
          <option value="reordered">Reordered</option>
          <option value="viewed">Viewed</option>
          <option value="added_to_cart">Added to Cart</option>
          <option value="overrode_recommendation">Override</option>
        </select>
        <select style={{ ...INP, width: "auto", minWidth: 130 }} value={filterDays} onChange={e => setFilterDays(e.target.value)}>
          <option value="">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {data ? `${data.total_count} total records` : ""}
        </span>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={exportCSV} style={{ ...BTN, background: "#1e40af", display: "flex", alignItems: "center", gap: 6 }}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...C, padding: 0, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 20, color: "#6b7280" }}>Loading interactions…</p>
        ) : !data || data.records.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1b4332" }}>No interaction data found</div>
            <p style={{ color: "#6b7280", fontSize: 13 }}>Interactions are logged when customers browse and purchase products.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8faf8", borderBottom: "2px solid #e5e7eb" }}>
                    {["ID", "Customer", "Product", "Category", "Type", "Qty", "Date"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.records.map(r => {
                    const tc = TYPE_COLORS[r.interaction_type] || { bg: "#f3f4f6", fg: "#374151" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#9ca3af" }}>{r.id}</td>
                        <td style={{ padding: "8px 12px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.customer_email}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1b4332" }}>{r.product_name}</td>
                        <td style={{ padding: "8px 12px", color: "#6b7280" }}>{r.category || "—"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ background: tc.bg, color: tc.fg, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                            {r.interaction_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{r.quantity}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #e5e7eb", background: "#f8faf8" }}>
              <button onClick={() => load(Math.max(0, page - LIMIT))} disabled={page === 0}
                style={{ ...BTN, background: page === 0 ? "#d1d5db" : "#374151", fontSize: 12, padding: "6px 14px", cursor: page === 0 ? "not-allowed" : "pointer" }}>
                ← Previous
              </button>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                Showing {page + 1}–{Math.min(page + LIMIT, data.total_count)} of {data.total_count}
              </span>
              <button onClick={() => load(page + LIMIT)} disabled={page + LIMIT >= data.total_count}
                style={{ ...BTN, background: page + LIMIT >= data.total_count ? "#d1d5db" : "#374151", fontSize: 12, padding: "6px 14px", cursor: page + LIMIT >= data.total_count ? "not-allowed" : "pointer" }}>
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
