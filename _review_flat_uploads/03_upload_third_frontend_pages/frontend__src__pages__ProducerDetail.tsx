import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import api from "../api";

type Product = {
  id: number;
  name: string;
  price: string | number;
  unit: string;
  image_source: string | null;
  image_url: string | null;
  organic_certified: boolean;
  is_available: boolean;
  stock_quantity: number;
  category: { id: number; name: string };
};

type Producer = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  store_name: string | null;
  store_description: string | null;
  store_contact: string | null;
  store_address: string | null;
  store_created_at: string;
  farm_story: string | null;
  products: Product[];
};

function formatPrice(v: string | number) {
  return `£${parseFloat(String(v)).toFixed(2)}`;
}

function resolveImage(url: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `http://127.0.0.1:8000${url}`;
}

export default function ProducerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [producer, setProducer] = useState<Producer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get<Producer>(`/accounts/producers/${id}/`)
      .then((r) => setProducer(r.data))
      .catch((e) => setError(e?.message || "Failed to load producer"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAddToCart(productId: number) {
    try {
      setAdding(productId);
      setMessage("");
      await api.post("/api/cart/items/", { product_id: productId, quantity: 1 });
      setMessage("Added to basket!");
    } catch (err: any) {
      setMessage(err?.response?.data?.error || "Failed to add to basket.");
    } finally {
      setAdding(null);
    }
  }

  if (loading) return <div style={{ padding: "60px 20px", color: "#78716c" }}>Loading producer...</div>;
  if (error) return <div style={{ padding: "60px 20px", color: "crimson" }}>{error}</div>;
  if (!producer) return <div style={{ padding: "60px 20px" }}>Not found.</div>;

  const storeName = producer.store_name || `${producer.first_name} ${producer.last_name}`.trim();

  return (
    <div style={{ background: "#f8faf8", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Hero banner */}
      <div style={{ background: "#1b4332", padding: "48px 20px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontWeight: 600, fontSize: 14, marginBottom: 24, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            ← Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {/* Avatar */}
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#2d6a4f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {storeName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#fff" }}>{storeName}</h1>
              {producer.store_address && (
                <div style={{ marginTop: 6, fontSize: 14, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 6 }}>
                  📍 {producer.store_address}
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                Member since {new Date(producer.store_created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>

        {/* Description + contact */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
          {producer.store_description && (
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#1b4332", textTransform: "uppercase", letterSpacing: 1 }}>About</h2>
              <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7, fontSize: 15 }}>{producer.store_description}</p>
            </div>
          )}
          {producer.store_contact && (
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#1b4332", textTransform: "uppercase", letterSpacing: 1 }}>Contact</h2>
              <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7, fontSize: 15, wordBreak: "break-word" }}>{producer.store_contact}</p>
            </div>
          )}
        </div>

        {/* Farm story */}
        {producer.farm_story && (
          <div style={{ background: "#f0faf4", borderRadius: 16, padding: "28px 32px", marginBottom: 32, border: "1px solid #d1fae5" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#1b4332", textTransform: "uppercase", letterSpacing: 1 }}>
              📖 Our Story
            </h2>
            <p style={{ margin: 0, color: "#374151", lineHeight: 1.8, fontSize: 16 }}>{producer.farm_story}</p>
          </div>
        )}

        {/* Products */}
        <div>
          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "#1b4332" }}>
            Products from {storeName}
            <span style={{ fontSize: 14, fontWeight: 400, color: "#9ca3af", marginLeft: 10 }}>
              {producer.products.length} item{producer.products.length !== 1 ? "s" : ""}
            </span>
          </h2>

          {message && (
            <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 10, background: message.includes("Added") ? "#ecfdf3" : "#fef2f2", color: message.includes("Added") ? "#166534" : "#b91c1c", fontSize: 14, fontWeight: 600 }}>
              {message}
            </div>
          )}

          {producer.products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa" }}>No products available right now.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {producer.products.map((p) => {
                const imageUrl = resolveImage(p.image_source || p.image_url);
                const unavailable = !p.is_available || p.stock_quantity <= 0;
                return (
                  <div key={p.id} style={{ borderRadius: 16, overflow: "hidden", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                    <Link to={`/products/${p.id}`} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{ height: 180, background: "#e8f5e9", overflow: "hidden", position: "relative" }}>
                        <img
                          src={imageUrl || `https://picsum.photos/seed/${p.id}/400/300`}
                          alt={p.name}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${p.id}/400/300`; }}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        {p.organic_certified && (
                          <span style={{ position: "absolute", top: 10, right: 10, background: "#2d6a4f", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>
                            Organic
                          </span>
                        )}
                      </div>
                    </Link>
                    <div style={{ padding: "12px 14px 14px" }}>
                      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>{p.category?.name}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <Link to={`/products/${p.id}`} style={{ fontWeight: 700, fontSize: 14, color: "#1b4332", textDecoration: "none" }}>{p.name}</Link>
                        <span style={{ fontWeight: 800, fontSize: 15, color: "#1b4332", whiteSpace: "nowrap" }}>{formatPrice(p.price)}</span>
                      </div>
                      <button
                        onClick={() => handleAddToCart(p.id)}
                        disabled={adding === p.id || unavailable}
                        style={{ marginTop: 10, width: "100%", padding: "8px 0", borderRadius: 10, border: "none", background: adding === p.id || unavailable ? "#9ca3af" : "#2d6a4f", color: "#fff", fontWeight: 700, fontSize: 13, cursor: adding === p.id || unavailable ? "not-allowed" : "pointer" }}
                      >
                        {adding === p.id ? "Adding..." : unavailable ? "Unavailable" : "Add to Basket"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
