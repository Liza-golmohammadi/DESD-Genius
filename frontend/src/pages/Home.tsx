import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import api from "../api";

// ── Types ────────────────────────────────────────────────────────────────────
type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  sku: string;
  name: string;
  price: string | number;
  unit: string;
  image_url: string | null;
  image_source: string | null;
  stock_quantity: number;
  is_available: boolean;
  organic_certified: boolean;
  available_from: string | null;
  available_to: string | null;
  category: Category;
  producer_name: string;
};

// ── Leaf SVG icon ────────────────────────────────────────────────────────────
function LeafIcon({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 0-5 8" />
    </svg>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function isInSeason(product: Product) {
  const today = new Date();
  const from = product.available_from ? new Date(product.available_from) : null;
  const to = product.available_to ? new Date(product.available_to) : null;

  if (from && today < from) return false;
  if (to && today > to) return false;
  return true;
}

function formatPrice(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `£${num.toFixed(2)}`;
}

function resolveImageUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `http://127.0.0.1:8000${url}`;
}

// ── Product card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onAddToCart,
  adding,
}: {
  product: Product;
  onAddToCart: () => void;
  adding: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageUrl = resolveImageUrl(product.image_source);

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.14)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)";
      }}
    >
      <div style={{ position: "relative", height: 200, background: "#e8f5e9", overflow: "hidden" }}>
        <img
          src={
            imgFailed || !imageUrl
              ? `https://picsum.photos/seed/${product.id}/500/300`
              : imageUrl
          }
          alt={product.name}
          onError={() => setImgFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {product.organic_certified && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "#2d6a4f",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LeafIcon size={16} color="#fff" />
          </div>
        )}

        {isInSeason(product) && (
          <span
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              background: "#2d6a4f",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: "4px 12px",
              borderRadius: 20,
              textTransform: "uppercase",
            }}
          >
            In Season
          </span>
        )}
      </div>

      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 2 }}>
          {product.producer_name} · {product.category?.name || "Uncategorized"}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
            {product.name}
          </h3>
          <span style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", color: "#1b4332" }}>
            {formatPrice(product.price)}
          </span>
        </div>

        <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{product.unit}</div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart();
          }}
          disabled={adding || !product.is_available || product.stock_quantity <= 0}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "8px 0",
            borderRadius: 10,
            border: "none",
            background:
              adding || !product.is_available || product.stock_quantity <= 0 ? "#9ca3af" : "#2d6a4f",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor:
              adding || !product.is_available || product.stock_quantity <= 0 ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {adding
            ? "Adding..."
            : !product.is_available || product.stock_quantity <= 0
            ? "Unavailable"
            : "Add to basket"}
        </button>
      </div>
    </div>
  );
}

// ── Main Home Component ───────────────────────────────────────────────────────
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [addingProductId, setAddingProductId] = useState<number | null>(null);

  const [activeCategories, setActiveCategories] = useState<number[]>([]);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [activeProducers, setActiveProducers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"popular" | "price-asc" | "price-desc" | "name">("popular");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setPageError("");

        const [productsRes, categoriesRes] = await Promise.all([
          api.get<Product[]>("/api/products/"),
          api.get<Category[]>("/api/products/categories/"),
        ]);

        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      } catch (error: any) {
        setPageError(error?.response?.data?.error || error?.message || "Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const producerNames = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.producer_name))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.producer_name.toLowerCase().includes(q) ||
          p.category?.name.toLowerCase().includes(q)
      );
    }

    if (activeCategories.length > 0) {
      list = list.filter((p) => activeCategories.includes(p.category?.id));
    }

    if (organicOnly) {
      list = list.filter((p) => p.organic_certified);
    }

    if (activeProducers.length > 0) {
      list = list.filter((p) => activeProducers.includes(p.producer_name));
    }

    if (sortBy === "price-asc") list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "price-desc") list.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [products, search, activeCategories, organicOnly, activeProducers, sortBy]);

  const countPerCategory = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = products.filter(
        (p) =>
          p.category?.id === cat.id &&
          (!organicOnly || p.organic_certified) &&
          (activeProducers.length === 0 || activeProducers.includes(p.producer_name))
      ).length;
      return acc;
    }, {} as Record<number, number>);
  }, [categories, products, organicOnly, activeProducers]);

  function toggleCategory(categoryId: number) {
    setActiveCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  }

  function toggleProducer(name: string) {
    setActiveProducers((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  }

  async function handleAddToCart(productId: number) {
    try {
      setActionMessage("");
      setAddingProductId(productId);

      await api.post("/api/cart/items/", {
        product_id: productId,
        quantity: 1,
      });

      setActionMessage("Item added to basket.");
    } catch (error: any) {
      setActionMessage(
        error?.response?.data?.error || error?.message || "Failed to add item to basket."
      );
    } finally {
      setAddingProductId(null);
    }
  }

  const s = {
    page: {
      minHeight: "100vh",
      background: "#f8faf8",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    } as React.CSSProperties,
    heroTitle: {
      color: "#fff",
      fontSize: 44,
      fontWeight: 800,
      margin: "0 0 12px",
      lineHeight: 1.15,
      maxWidth: 520,
    } as React.CSSProperties,
    heroSub: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 17,
      margin: 0,
      maxWidth: 420,
    } as React.CSSProperties,
    body: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "32px 20px",
      display: "flex",
      gap: 32,
      alignItems: "flex-start",
    } as React.CSSProperties,
    sidebar: {
      width: 240,
      flexShrink: 0,
      background: "#fff",
      borderRadius: 16,
      padding: "20px 0",
      boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
      position: "sticky",
      top: 80,
    } as React.CSSProperties,
    sideSection: {
      padding: "0 20px 16px",
      borderBottom: "1px solid #f0f0f0",
      marginBottom: 4,
    } as React.CSSProperties,
    sideHeading: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: 1.2,
      color: "#999",
      textTransform: "uppercase" as const,
      margin: "16px 0 10px",
    },
    catRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "7px 0",
      cursor: "pointer",
      borderRadius: 8,
      margin: "0 -4px",
      paddingLeft: 4,
    } as React.CSSProperties,
    badge: {
      background: "#f0f4f0",
      borderRadius: 20,
      padding: "2px 8px",
      fontSize: 12,
      fontWeight: 700,
      color: "#555",
    } as React.CSSProperties,
    main: { flex: 1, minWidth: 0 } as React.CSSProperties,
    mainHeader: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 24,
      flexWrap: "wrap" as const,
      gap: 12,
    } as React.CSSProperties,
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: 20,
    } as React.CSSProperties,
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
        Loading products...
      </div>
    );
  }

  if (pageError) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px", color: "crimson" }}>
        {pageError}
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div
        style={{
          position: "relative",
          minHeight: 280,
          backgroundImage:
            "url('https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1400&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(27,67,50,0.82) 0%, rgba(27,67,50,0.55) 60%, rgba(27,67,50,0.25) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 1200,
            margin: "0 auto",
            padding: "52px 40px 48px",
            width: "100%",
          }}
        >
          <h1 style={s.heroTitle}>
            Fresh food,
            <br />
            delivered to your door.
          </h1>
          <p style={s.heroSub}>
            Support local growers and enjoy the freshest seasonal produce Bristol has to offer.
          </p>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: "14px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            gap: 32,
            fontSize: 13,
            color: "#666",
            flexWrap: "wrap",
          }}
        >
          <span>
            <strong style={{ color: "#1b4332" }}>{products.length}</strong> products available
          </span>
          <span>
            <strong style={{ color: "#1b4332" }}>{producerNames.length}</strong> local producers
          </span>
          <span>
            <strong style={{ color: "#1b4332" }}>
              {products.filter((p) => p.organic_certified).length}
            </strong>{" "}
            organic lines
          </span>
        </div>
      </div>

      <div style={s.body}>
        <aside style={s.sidebar}>
          <div style={s.sideSection}>
            <div style={s.sideHeading}>Categories</div>
            {categories.map((cat) => {
              const active = activeCategories.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  style={{
                    ...s.catRow,
                    background: active ? "#f0faf4" : "transparent",
                    fontWeight: active ? 700 : 400,
                    color: active ? "#1b4332" : "#333",
                  }}
                  onClick={() => toggleCategory(cat.id)}
                >
                  <span>{cat.name}</span>
                  <span style={s.badge}>{countPerCategory[cat.id] || 0}</span>
                </div>
              );
            })}
          </div>

          <div style={s.sideSection}>
            <div style={s.sideHeading}>Certification</div>
            <label
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}
            >
              <input
                type="checkbox"
                checked={organicOnly}
                onChange={(e) => setOrganicOnly(e.target.checked)}
                style={{ accentColor: "#2d6a4f", width: 16, height: 16 }}
              />
              Organic Certified
            </label>
          </div>

          <div style={{ ...s.sideSection, borderBottom: "none" }}>
            <div style={s.sideHeading}>Producers</div>
            {producerNames.map((name) => (
              <label
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "4px 0",
                }}
              >
                <input
                  type="checkbox"
                  checked={activeProducers.includes(name)}
                  onChange={() => toggleProducer(name)}
                  style={{ accentColor: "#2d6a4f", width: 14, height: 14, flexShrink: 0 }}
                />
                <span style={{ fontWeight: 500 }}>{name}</span>
              </label>
            ))}
          </div>

          {(activeCategories.length > 0 || organicOnly || activeProducers.length > 0) && (
            <div style={{ padding: "12px 20px 4px" }}>
              <button
                onClick={() => {
                  setActiveCategories([]);
                  setOrganicOnly(false);
                  setActiveProducers([]);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  background: "#fff",
                  color: "#555",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </aside>

        <main style={s.main}>
          <div style={s.mainHeader}>
            <div>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Fresh from the Farm</h2>
              <p style={{ margin: "6px 0 0", color: "#777", fontSize: 14 }}>
                Showing <strong style={{ color: "#1b4332" }}>{filtered.length}</strong> products
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 13,
                  color: "#888",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  fontSize: 14,
                  background: "#fff",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="popular">Most Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          {actionMessage && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 12,
                background: actionMessage.toLowerCase().includes("added") ? "#ecfdf3" : "#fef2f2",
                color: actionMessage.toLowerCase().includes("added") ? "#166534" : "#b91c1c",
                border: actionMessage.toLowerCase().includes("added")
                  ? "1px solid #bbf7d0"
                  : "1px solid #fecaca",
              }}
            >
              {actionMessage}
            </div>
          )}

          {(activeCategories.length > 0 || organicOnly || activeProducers.length > 0 || search) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {categories
                .filter((c) => activeCategories.includes(c.id))
                .map((c) => (
                  <span
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    style={{
                      background: "#e8f5e9",
                      color: "#1b4332",
                      padding: "5px 12px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {c.name} ×
                  </span>
                ))}

              {organicOnly && (
                <span
                  onClick={() => setOrganicOnly(false)}
                  style={{
                    background: "#e8f5e9",
                    color: "#1b4332",
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Organic ×
                </span>
              )}

              {search && (
                <span
                  onClick={() => setSearchParams({})}
                  style={{
                    background: "#fef3c7",
                    color: "#92400e",
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  "{search}" ×
                </span>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "64px 0",
                color: "#aaa",
                fontSize: 16,
              }}
            >
              No products match your filters.
            </div>
          ) : (
            <div style={s.grid}>
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  adding={addingProductId === product.id}
                  onAddToCart={() => handleAddToCart(product.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}