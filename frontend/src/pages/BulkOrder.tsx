import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "../api";
import useAuth from "../context/useAuth";

type Product = {
  id: number;
  name: string;
  description: string;
  price: string;
  unit: string;
  stock_quantity: number;
  category_name?: string;
  producer_name?: string;
  producer_id?: number;
  image_source?: string;
  is_in_season?: boolean;
  organic_certified?: boolean;
};

const BulkOrder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [addingToCart, setAddingToCart] = useState<Record<number, boolean>>({});
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get<Product[]>("/api/products/");
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        setError(err?.response?.data?.error || "Failed to load products.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = [...new Set(products.map((p) => p.category_name).filter(Boolean))];
  const producers = [...new Set(products.map((p) => p.producer_name).filter(Boolean))];

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || p.category_name === categoryFilter;
    return matchSearch && matchCat;
  });

  // Group by producer
  const grouped: Record<string, Product[]> = {};
  for (const p of filtered) {
    const key = p.producer_name || "Unknown Producer";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }

  const handleQuantityChange = (productId: number, qty: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, qty) }));
  };

  const handleAddToCart = async (product: Product) => {
    const qty = quantities[product.id] || 0;
    if (qty <= 0) return;

    setAddingToCart((prev) => ({ ...prev, [product.id]: true }));
    try {
      await api.post("/api/cart/add/", {
        product_id: product.id,
        quantity: qty,
      });
      setSuccessMsg(`Added ${qty}× ${product.name} to cart`);
      setQuantities((prev) => ({ ...prev, [product.id]: 0 }));
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to add to cart.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setAddingToCart((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const handleAddAll = async () => {
    const itemsToAdd = Object.entries(quantities).filter(([, qty]) => qty > 0);
    if (itemsToAdd.length === 0) return;

    for (const [idStr, qty] of itemsToAdd) {
      try {
        await api.post("/api/cart/add/", {
          product_id: Number(idStr),
          quantity: qty,
        });
      } catch {
        // continue adding others
      }
    }
    setSuccessMsg(`Added ${itemsToAdd.length} item(s) to cart!`);
    setQuantities({});
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const totalSelected = Object.values(quantities).filter((q) => q > 0).length;

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>🏢 Bulk Order</h1>
        <p>Loading products from all suppliers...</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={bulkBadge}>BULK</span>
          <h1 style={{ ...headingStyle, marginBottom: 0 }}>Institutional Bulk Ordering</h1>
        </div>
        {user?.organisation_name && (
          <p style={{ margin: 0, color: "#6b7280", fontSize: 15 }}>
            Ordering for <strong>{user.organisation_name}</strong>
          </p>
        )}
        <p style={subTextStyle}>
          Browse products from all suppliers in one view. Add quantities and send everything to your cart.
        </p>
      </div>

      {/* Success banner */}
      {successMsg && <div style={successBanner}>{successMsg}</div>}
      {error && <div style={errorBanner}>{error}</div>}

      {/* Filters */}
      <div style={filterRow}>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        {totalSelected > 0 && (
          <button onClick={handleAddAll} style={addAllBtn}>
            Add All ({totalSelected}) to Cart →
          </button>
        )}
        <button
          onClick={() => navigate("/cart")}
          style={{ ...addAllBtn, background: "#1b4332" }}
        >
          View Cart
        </button>
      </div>

      {/* Products grouped by producer */}
      {Object.keys(grouped).length === 0 ? (
        <div style={emptyBox}>
          <p>No products match your filters.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([producerName, prods]) => (
          <div key={producerName} style={producerSection}>
            <h2 style={producerHeading}>
              <span style={{ fontSize: 20 }}>🌾</span> {producerName}
            </h2>
            <div style={productGrid}>
              {prods.map((product) => {
                const qty = quantities[product.id] || 0;
                const isAdding = addingToCart[product.id];

                return (
                  <div key={product.id} style={productCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                          {product.name}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          {product.category_name} · {product.unit}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#2d6a4f", fontSize: 16 }}>
                          £{parseFloat(product.price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: 12, color: product.stock_quantity > 10 ? "#6b7280" : "#dc2626" }}>
                          {product.stock_quantity} in stock
                        </div>
                      </div>
                    </div>

                    {product.organic_certified && (
                      <span style={organicBadge}>🌿 Organic</span>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => handleQuantityChange(product.id, qty - 1)}
                        style={qtyBtn}
                        disabled={qty <= 0}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={product.stock_quantity}
                        value={qty}
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                        style={qtyInput}
                      />
                      <button
                        onClick={() => handleQuantityChange(product.id, qty + 1)}
                        style={qtyBtn}
                        disabled={qty >= product.stock_quantity}
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={qty <= 0 || isAdding}
                        style={{
                          ...addBtn,
                          opacity: qty <= 0 ? 0.4 : 1,
                          cursor: qty <= 0 ? "default" : "pointer",
                        }}
                      >
                        {isAdding ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

/* ── Styles ── */
const pageStyle: React.CSSProperties = {
  maxWidth: 1200,
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

const bulkBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1,
  color: "#fff",
  background: "linear-gradient(135deg, #f59e0b, #d97706)",
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

const filterRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 28,
};

const searchInput: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  minWidth: 200,
};

const selectStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  background: "#fff",
};

const addAllBtn: React.CSSProperties = {
  padding: "10px 20px",
  border: "none",
  borderRadius: 10,
  background: "#2d6a4f",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const producerSection: React.CSSProperties = {
  marginBottom: 32,
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  padding: "24px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};

const producerHeading: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#1b4332",
  marginTop: 0,
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const productGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: 14,
};

const productCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "16px",
  background: "#fafbfc",
};

const organicBadge: React.CSSProperties = {
  display: "inline-block",
  marginTop: 6,
  fontSize: 11,
  color: "#15803d",
  background: "#dcfce7",
  padding: "2px 8px",
  borderRadius: 6,
  fontWeight: 600,
};

const qtyBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#fff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const qtyInput: React.CSSProperties = {
  width: 56,
  textAlign: "center",
  padding: "6px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
};

const addBtn: React.CSSProperties = {
  marginLeft: "auto",
  padding: "8px 16px",
  border: "none",
  borderRadius: 8,
  background: "#40916c",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
};

const emptyBox: React.CSSProperties = {
  background: "#fff",
  padding: 32,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  textAlign: "center",
  color: "#6b7280",
};

export default BulkOrder;
