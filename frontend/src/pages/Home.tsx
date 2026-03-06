import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import { PRODUCTS, CATEGORIES, PRODUCERS, type Category } from "../data/fakeProducts";

// ── Leaf SVG icon ────────────────────────────────────────────────────────────
function LeafIcon({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 0-5 8" />
    </svg>
  );
}

// ── Product card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onAddToCart,
}: {
  product: (typeof PRODUCTS)[0];
  onAddToCart: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        transition: "box-shadow 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.14)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)";
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", height: 200, background: "#e8f5e9", overflow: "hidden" }}>
        <img
          src={imgFailed ? `https://picsum.photos/seed/${product.id}/500/300` : product.image}
          alt={product.name}
          onError={() => setImgFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {/* Seasonal badge */}
        {product.seasonal && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(255,255,255,0.92)",
              color: "#2d6a4f",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1,
              padding: "4px 10px",
              borderRadius: 20,
              textTransform: "uppercase",
            }}
          >
            Seasonal
          </span>
        )}

        {/* Leaf icon */}
        {product.organic && (
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

        {/* In Season label */}
        {product.inSeason && (
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

      {/* Info */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 2 }}>
          {product.producer} · {product.producerLocation}
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
            £{product.price.toFixed(2)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{product.unit}</div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart();
          }}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "8px 0",
            borderRadius: 10,
            border: "none",
            background: "#2d6a4f",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#1b4332")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#2d6a4f")}
        >
          Add to basket
        </button>
      </div>
    </div>
  );
}

// ── Main Home Component ───────────────────────────────────────────────────────
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [activeProducers, setActiveProducers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"popular" | "price-asc" | "price-desc" | "name">("popular");
  const [, setCartCount] = useState(0);

  // ── Filtering & sorting ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = PRODUCTS;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.producer.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (activeCategories.length > 0) {
      list = list.filter((p) => activeCategories.includes(p.category));
    }

    if (organicOnly) {
      list = list.filter((p) => p.organic);
    }

    if (activeProducers.length > 0) {
      list = list.filter((p) => activeProducers.includes(p.producer));
    }

    if (sortBy === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sortBy === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [search, activeCategories, organicOnly, activeProducers, sortBy]);

  // ── Counts per category (after other filters) ─────────────────────────────
  const countPerCategory = useMemo(() => {
    return CATEGORIES.reduce(
      (acc, cat) => {
        acc[cat] = PRODUCTS.filter(
          (p) =>
            p.category === cat &&
            (!organicOnly || p.organic) &&
            (activeProducers.length === 0 || activeProducers.includes(p.producer))
        ).length;
        return acc;
      },
      {} as Record<Category, number>
    );
  }, [organicOnly, activeProducers]);

  function toggleCategory(cat: Category) {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleProducer(name: string) {
    setActiveProducers((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  }

  const uniqueProducerCount = new Set(PRODUCTS.map((p) => p.producer)).size;

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: "100vh",
      background: "#f8faf8",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    } as React.CSSProperties,
    hero: {
      background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%)",
      padding: "52px 40px 48px",
      position: "relative",
      overflow: "hidden",
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
    searchBar: {
      marginTop: 28,
      display: "flex",
      gap: 0,
      maxWidth: 520,
    } as React.CSSProperties,
    searchInput: {
      flex: 1,
      padding: "13px 18px",
      border: "none",
      borderRadius: "12px 0 0 12px",
      fontSize: 15,
      outline: "none",
    } as React.CSSProperties,
    searchBtn: {
      padding: "13px 20px",
      background: "#40916c",
      color: "#fff",
      border: "none",
      borderRadius: "0 12px 12px 0",
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
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

  return (
    <div style={s.page}>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
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
        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, rgba(27,67,50,0.82) 0%, rgba(27,67,50,0.55) 60%, rgba(27,67,50,0.25) 100%)",
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

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
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
          }}
        >
          <span>
            <strong style={{ color: "#1b4332" }}>{PRODUCTS.length}</strong> products available
          </span>
          <span>
            <strong style={{ color: "#1b4332" }}>{uniqueProducerCount}</strong> local producers
          </span>
          <span>
            <strong style={{ color: "#1b4332" }}>
              {PRODUCTS.filter((p) => p.organic).length}
            </strong>{" "}
            organic lines
          </span>
        </div>
      </div>

      {/* ── Body: sidebar + grid ───────────────────────────────────────────── */}
      <div style={s.body}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          {/* Categories */}
          <div style={s.sideSection}>
            <div style={s.sideHeading}>Categories</div>
            {CATEGORIES.map((cat) => {
              const active = activeCategories.includes(cat);
              return (
                <div
                  key={cat}
                  style={{
                    ...s.catRow,
                    background: active ? "#f0faf4" : "transparent",
                    fontWeight: active ? 700 : 400,
                    color: active ? "#1b4332" : "#333",
                  }}
                  onClick={() => toggleCategory(cat)}
                >
                  <span>{cat}</span>
                  <span style={s.badge}>{countPerCategory[cat]}</span>
                </div>
              );
            })}
          </div>

          {/* Certification */}
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

          {/* Producers */}
          <div style={{ ...s.sideSection, borderBottom: "none" }}>
            <div style={s.sideHeading}>Producers</div>
            {PRODUCERS.map((p) => (
              <label
                key={p.name}
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
                  checked={activeProducers.includes(p.name)}
                  onChange={() => toggleProducer(p.name)}
                  style={{ accentColor: "#2d6a4f", width: 14, height: 14, flexShrink: 0 }}
                />
                <span>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div style={{ color: "#aaa", fontSize: 11 }}>{p.location}</div>
                </span>
              </label>
            ))}
          </div>

          {/* Clear filters */}
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

        {/* Main content */}
        <main style={s.main}>
          {/* Header row */}
          <div style={s.mainHeader}>
            <div>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Fresh from the Farm</h2>
              <p style={{ margin: "6px 0 0", color: "#777", fontSize: 14 }}>
                Showing{" "}
                <strong style={{ color: "#1b4332" }}>{filtered.length}</strong> products from{" "}
                <strong style={{ color: "#1b4332" }}>{uniqueProducerCount}</strong> local producers
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
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

          {/* Active filter chips */}
          {(activeCategories.length > 0 || organicOnly || activeProducers.length > 0 || search) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {activeCategories.map((c) => (
                <span
                  key={c}
                  onClick={() => toggleCategory(c)}
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
                  {c} ×
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

          {/* Product grid */}
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
                  onAddToCart={() => setCartCount((n) => n + 1)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
