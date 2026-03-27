import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import useAuth from "../context/useAuth";
import {
  ArrowLeft, Leaf, Calendar, AlertCircle, ShoppingBasket,
  Minus, Plus, MapPin, CheckCircle2, Clock, Map, Tag,
  BookOpen, ChefHat, Info, ShieldAlert,
} from "lucide-react";
import api from "../api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Product = {
  id: number;
  name: string;
  description: string;
  price: string | number;
  unit: string;
  image_source: string | null;
  stock_quantity: number;
  is_available: boolean;
  organic_certified: boolean;
  available_from: string | null;
  available_to: string | null;
  is_in_season: boolean;
  is_low_stock: boolean;
  allergens: string;
  storage_tips: string;
  recipe_idea: string;
  harvest_date: string | null;
  category: { id: number; name: string };
  producer_name: string;
  producer_id: number;
  farm_origin: string | null;
  food_miles: string | null;
};

// ── Colours (matches app theme) ───────────────────────────────────────────────
const C = {
  green: "#2d6a4f",
  greenDark: "#1b4332",
  accent: "#40916c",
  light: "#e8f5e9",
  stone900: "#1c1917",
  stone600: "#57534e",
  stone500: "#78716c",
  stone400: "#a8a29e",
  stone200: "#e7e5e4",
  stone100: "#f5f5f4",
  stone50: "#fafaf9",
};

function formatPrice(v: string | number) {
  return `£${parseFloat(String(v)).toFixed(2)}`;
}

function resolveImage(url: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `http://127.0.0.1:8000${url}`;
}

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = "description" | "storage" | "story" | "recipe";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get<Product>(`/api/products/${id}/`)
      .then((r) => setProduct(r.data))
      .catch(() => setError("Product not found."))
      .finally(() => setLoading(false));
  }, [id]);

  function handleTabChange(t: Tab) {
    setActiveTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAddToCart() {
    if (!product) return;
    try {
      setAdding(true);
      setMessage("");
      await api.post("/api/cart/items/", { product_id: product.id, quantity });
      setMessage("Added to basket!");
    } catch (err: any) {
      setMessage(err?.response?.data?.error || "Failed to add to basket.");
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <div style={{ padding: "60px 20px", color: C.stone500 }}>Loading product...</div>;
  if (error || !product) return <div style={{ padding: "60px 20px", color: "crimson" }}>{error || "Product not found."}</div>;

  const imageUrl = resolveImage(product.image_source);
  const unavailable = !product.is_available || product.stock_quantity <= 0;
  const price = parseFloat(String(product.price));

  const tabStyle = (t: Tab): React.CSSProperties => ({
    paddingBottom: 8,
    paddingTop: 4,
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    whiteSpace: "nowrap",
    background: "none",
    border: "none",
    cursor: "pointer",
    borderBottom: activeTab === t ? `2px solid ${C.green}` : "2px solid transparent",
    color: activeTab === t ? C.green : C.stone400,
    transition: "color 0.15s",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 1200, margin: "0 auto", background: "#fff", paddingBottom: 80, fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "32px 20px 80px" }}
    >
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: "flex", alignItems: "center", gap: 8, color: C.stone500, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, marginBottom: 32 }}
      >
        <ArrowLeft size={16} /> Back to Marketplace
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>

        {/* ── Left: Image ───────────────────────────────────────────────────── */}
        <div>
          <div style={{ aspectRatio: "4/5", borderRadius: 24, overflow: "hidden", background: C.stone100, position: "relative" }}>
            <img
              src={imgFailed || !imageUrl ? `https://picsum.photos/seed/${product.id}/800/1000` : imageUrl}
              alt={product.name}
              onError={() => setImgFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {/* Badges */}
            <div style={{ position: "absolute", top: 24, left: 24, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
              {product.organic_certified && (
                <span style={{ background: "rgba(255,255,255,0.92)", color: C.green, padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                  <Leaf size={13} /> Certified Organic
                </span>
              )}
              {product.is_in_season && (
                <span style={{ background: "rgba(253,246,178,0.92)", color: "#92400e", padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={13} /> In Season
                </span>
              )}
              {product.is_low_stock && (
                <span style={{ background: "rgba(239,68,68,0.88)", color: "#fff", padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                  <Tag size={13} /> Low Stock
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Info ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>

          {/* Producer */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
            <MapPin size={14} />
            <Link to={`/producers/${product.producer_id}`} style={{ color: C.accent, textDecoration: "none" }}>
              {product.producer_name}
            </Link>
          </div>

          <h1 style={{ fontSize: 40, fontWeight: 800, color: C.stone900, lineHeight: 1.1, margin: "0 0 16px" }}>
            {product.name}
          </h1>

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 32 }}>
            <span style={{ fontSize: 30, fontWeight: 300, color: C.green }}>
              {formatPrice(product.price)} <span style={{ fontSize: 16, color: C.stone400, fontWeight: 400 }}>/ {product.unit}</span>
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${C.stone200}`, marginBottom: 24, overflowX: "auto" }}>
            {(["description", "storage", "story", "recipe"] as Tab[]).map((t) => (
              <button key={t} style={tabStyle(t)} onClick={() => handleTabChange(t)}>
                {t === "story" ? "Farm Story" : t === "recipe" ? "Recipe Idea" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ minHeight: 120, marginBottom: 40 }}>
            {activeTab === "description" && (
              <p style={{ color: C.stone600, lineHeight: 1.7, fontSize: 16 }}>{product.description || "No description available."}</p>
            )}
            {activeTab === "storage" && (
              <div style={{ color: C.stone600, lineHeight: 1.7 }}>
                <p style={{ fontWeight: 600, color: C.stone900, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <Info size={16} color={C.accent} /> Storage Guidance
                </p>
                <p>{product.storage_tips || "Store in a cool, dry place away from direct sunlight. Best consumed within a few days of delivery for maximum freshness."}</p>
              </div>
            )}
            {activeTab === "story" && (
              <div style={{ color: C.stone600, lineHeight: 1.7 }}>
                <p style={{ fontWeight: 600, color: C.stone900, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <BookOpen size={16} color={C.accent} /> Meet the Producer
                </p>
                <p><strong>{product.producer_name}</strong>{product.farm_origin ? ` · ${product.farm_origin}` : ""}</p>
                <Link to={`/producers/${product.producer_id}`} style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 4, color: C.green, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                  Visit their store & read full farm story →
                </Link>
              </div>
            )}
            {activeTab === "recipe" && (
              <div style={{ color: C.stone600, lineHeight: 1.7 }}>
                <p style={{ fontWeight: 600, color: C.stone900, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <ChefHat size={16} color={C.accent} /> Recipe Idea
                </p>
                <p>{product.recipe_idea || `Try ${product.name} paired with other local produce from the network for a seasonal dish that's hard to beat.`}</p>
              </div>
            )}
          </div>

          {/* Key details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "28px 0", borderTop: `1px solid ${C.stone100}`, borderBottom: `1px solid ${C.stone100}`, marginBottom: 40 }}>
            {product.harvest_date && (
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.light, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Calendar size={20} color={C.green} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.stone400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Harvest Date</p>
                  <p style={{ fontWeight: 600, color: C.stone900 }}>{product.harvest_date}</p>
                  <p style={{ fontSize: 13, color: C.stone500, marginTop: 2 }}>Peak freshness guaranteed</p>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={20} color="#2563eb" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.stone400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Stock</p>
                <p style={{ fontWeight: 600, color: C.stone900 }}>{product.stock_quantity} units available</p>
                <p style={{ fontSize: 13, color: C.stone500, marginTop: 2 }}>See storage tab for tips</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertCircle size={20} color="#d97706" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.stone400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Allergens</p>
                <p style={{ fontWeight: 600, color: C.stone900 }}>{product.allergens || "None listed"}</p>
                <p style={{ fontSize: 13, color: C.stone500, marginTop: 2 }}>Always check label on delivery</p>
              </div>
            </div>
            {product.food_miles && (
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Map size={20} color="#059669" />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.stone400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Food Miles</p>
                  <p style={{ fontWeight: 600, color: C.stone900 }}>{product.food_miles} miles</p>
                  <p style={{ fontSize: 13, color: C.stone500, marginTop: 2 }}>
                    {user?.postcode ? `to ${user.postcode}` : product.farm_origin || "Local producer"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          {message && (
            <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 12, background: message.includes("Added") ? "#ecfdf3" : "#fef2f2", color: message.includes("Added") ? "#166534" : "#b91c1c", fontSize: 14, fontWeight: 600 }}>
              {message}
            </div>
          )}

          {/* Add to basket */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: "auto" }}>
            {/* Quantity */}
            <div style={{ display: "flex", alignItems: "center", background: C.stone50, borderRadius: 999, border: `1px solid ${C.stone200}`, padding: 4 }}>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: 48, height: 48, borderRadius: "50%", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.stone500 }}>
                <Minus size={16} />
              </button>
              <span style={{ width: 48, textAlign: "center", fontWeight: 700, fontSize: 18, color: C.stone900 }}>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} style={{ width: 48, height: 48, borderRadius: "50%", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.stone500 }}>
                <Plus size={16} />
              </button>
            </div>

            {/* Button */}
            <button
              onClick={handleAddToCart}
              disabled={adding || unavailable}
              style={{ flex: 1, height: 56, borderRadius: 999, border: "none", background: adding || unavailable ? "#9ca3af" : C.green, color: "#fff", fontWeight: 700, fontSize: 17, cursor: adding || unavailable ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, transition: "background 0.15s" }}
            >
              <ShoppingBasket size={20} />
              {adding ? "Adding..." : unavailable ? "Unavailable" : `Add to Basket • ${formatPrice(price * quantity)}`}
            </button>
          </div>

          {/* Trust badges */}
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 32, fontSize: 13, fontWeight: 600, color: C.stone500 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} color={C.accent} /> Plastic-free packaging
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} color={C.accent} /> Fair price to farmer
            </span>
          </div>

          {/* Food safety */}
          <div style={{ marginTop: 32, padding: 16, background: "#fff1f2", borderRadius: 16, border: "1px solid #fecdd3", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <ShieldAlert size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#7f1d1d" }}>Food Safety & Quality Assurance</h4>
              <p style={{ margin: 0, fontSize: 13, color: "#991b1b", lineHeight: 1.6 }}>
                We maintain full traceability for this batch. If you experience any quality issues or food safety concerns, please{" "}
                <Link to={`/producers/${product.producer_id}`} style={{ color: "#dc2626", fontWeight: 700 }}>contact the producer immediately</Link>{" "}
                for a rapid response.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
