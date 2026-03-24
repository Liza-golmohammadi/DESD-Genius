import { useEffect, useState } from "react";
import api from "../api";
import useAuth from "../context/useAuth";

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

// Status transitions
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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

  async function submit(e: React.FormEvent) {
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
        await api.patch(`/products/${initial!.id}/inventory/`, {
          stock_quantity: body.stock_quantity,
          low_stock_threshold: body.low_stock_threshold,
          is_available: body.is_available,
          available_from: body.available_from,
          available_to: body.available_to,
        });
      } else {
        await api.post("/products/", body);
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
  const { setUser } = useAuth();
  const [tab, setTab] = useState<"products" | "orders" | "profile">("products");

  // Profile — aligned with UserUpdateSerializer
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

  // ── Loaders ───────────────────────────────────────────────────────────────
  async function loadProfile() {
    setProfileLoading(true);
    try {

      const res = await api.get<ProducerMe>("/accounts/auth/user/me/");
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
      const res = await api.get<Product[]>("/products/");
      setProducts(res.data);
    } catch { /* silently fail */ } finally {
      setProductsLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await api.get<Category[]>("/products/categories/");
      setCategories(res.data);
    } catch { /* ignore */ }
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const res = await api.get<ProducerOrder[]>("/orders/producer/");
      setOrders(res.data);
    } catch { /* silently fail */ } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    loadProducts();
    loadCategories();
    loadOrders();
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg(null);
    setProfileErr(null);
    try {
      
      await api.patch("/accounts/auth/user/me/", {
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
      await api.patch(`/orders/producer/${orderId}/status/`, { status: newStatus, note: "" });
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

      {/* ── Banner ──────────────────────────────────────────────────────────── */}
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

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0 }}>
          {(["products", "orders", "profile"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "14px 20px", border: "none", borderBottom: tab === t ? "2px solid #1b4332" : "2px solid transparent", background: "none", fontWeight: tab === t ? 700 : 500, color: tab === t ? "#1b4332" : "#6b7280", cursor: "pointer", fontSize: 14, textTransform: "capitalize" }}>
              {t === "products" ? `Products (${products.length})` : t === "orders" ? `Orders (${orders.length})` : "Store Profile"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── PRODUCTS TAB ─────────────────────────────────────────────────── */}
        {tab === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>My Products</h2>
              <button onClick={() => { setEditProduct(undefined); setShowModal(true); }} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#1b4332", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                + Add Product
              </button>
            </div>

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
                          <button onClick={() => { setEditProduct(p); setShowModal(true); }} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#374151" }}>
                            Edit Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS TAB ───────────────────────────────────────────────────── */}
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

        {/* ── PROFILE TAB ──────────────────────────────────────────────────── */}
        {tab === "profile" && (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>Store Profile</h2>

            {profileMsg && <div style={{ background: "#d1fae5", color: "#065f46", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>{profileMsg}</div>}
            {profileErr && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>{profileErr}</div>}

            <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Read-only fields */}
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
                {/* ✅ read from producer_profile.store_created_at */}
                <div style={{ fontSize: 15 }}>
                  {profile?.producer_profile?.store_created_at
                    ? new Date(profile.producer_profile.store_created_at).toLocaleDateString()
                    : "—"}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Store name — editable */}
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
                        // ✅ reset to current profile values
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

      {showModal && (
        <ProductModal
          categories={categories}
          initial={editProduct}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadProducts(); }}
        />
      )}
    </div>
  );
}
