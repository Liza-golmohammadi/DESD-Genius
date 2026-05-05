import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import api from "../utils/api";
import "./Home.css";

// ── Types ────────────────────────────────────────────────────────────────────
type Category = { id: number; name: string };

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
  producer_id: string;
  producer_name: string;
};

type CartItem = {
  id: number;
  product_id: number;
  quantity: number;
};

type CartData = {
  id: number;
  items: CartItem[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function LeafIcon({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 0-5 8" />
    </svg>
  );
}

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
  return url;
}

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  cartQty,
  onAddToCart,
  onUpdateQty,
  adding,
}: {
  product: Product;
  cartQty: number;
  onAddToCart: () => void;
  onUpdateQty: (newQty: number) => void;
  adding: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageUrl = resolveImageUrl(product.image_source);
  const outOfStock = !product.is_available || product.stock_quantity <= 0;

  return (
    <div className="product-card">
      <div className="product-card__image-wrap">
        <img
          src={imgFailed || !imageUrl ? `https://picsum.photos/seed/${product.id}/500/300` : imageUrl}
          alt={product.name}
          onError={() => setImgFailed(true)}
          className="product-card__image"
        />

        {product.organic_certified && (
          <div className="product-card__organic">
            <LeafIcon size={16} color="#fff" />
          </div>
        )}

        {isInSeason(product) && <span className="product-card__season">In Season</span>}
      </div>

      <div className="product-card__body">
        <div className="product-card__meta">
          {product.producer_name || product.producer_id} · {product.category?.name || "Uncategorized"}
        </div>

        <div className="product-card__header">
          <h3 className="product-card__name">{product.name}</h3>
          <span className="product-card__price">{formatPrice(product.price)}</span>
        </div>

        <div className="product-card__unit">{product.unit}</div>

        <div
          className={`product-card__stock ${
            product.stock_quantity <= 0
              ? "product-card__stock--out"
              : product.stock_quantity <= 5
              ? "product-card__stock--low"
              : "product-card__stock--ok"
          }`}
        >
          {product.stock_quantity <= 0
            ? "Out of stock"
            : product.stock_quantity <= 5
            ? `Only ${product.stock_quantity} left`
            : `${product.stock_quantity} in stock`}
        </div>

        {/* If item is in cart → show +/- controls, otherwise show Add button */}
        {cartQty > 0 ? (
          <div className="product-card__qty-controls">
            <button
              className="product-card__qty-btn"
              onClick={(e) => { e.stopPropagation(); onUpdateQty(cartQty - 1); }}
              disabled={adding}
            >
              −
            </button>
            <span className="product-card__qty-value">{cartQty}</span>
            <button
              className="product-card__qty-btn"
              onClick={(e) => { e.stopPropagation(); onUpdateQty(cartQty + 1); }}
              disabled={adding || cartQty >= product.stock_quantity}
            >
              +
            </button>
          </div>
        ) : (
          <button
            className="product-card__add-btn"
            onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
            disabled={adding || outOfStock}
          >
            {adding ? "Adding..." : outOfStock ? "Unavailable" : "Add to basket"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Home Component ──────────────────────────────────────────────────────
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

  // Cart state — maps product_id → { cartItemId, quantity }
  const [cartMap, setCartMap] = useState<Record<number, { id: number; quantity: number }>>({});

  // Load products + categories + cart
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

        // Load cart if authenticated
        if (localStorage.getItem("access")) {
          try {
            const cartRes = await api.get<CartData>("/api/orders/cart/");
            const map: Record<number, { id: number; quantity: number }> = {};
            for (const item of cartRes.data.items || []) {
              map[item.product_id] = { id: item.id, quantity: item.quantity };
            }
            setCartMap(map);
          } catch {
            // Not logged in or cart error — fine
          }
        }
      } catch (error: any) {
        setPageError(error?.response?.data?.error || error?.message || "Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Derived data
  const producerNames = useMemo(
    () => Array.from(new Set(products.map((p) => p.producer_name || p.producer_id))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    let list = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.producer_name || p.producer_id).toLowerCase().includes(q) ||
          p.category?.name.toLowerCase().includes(q)
      );
    }

    if (activeCategories.length > 0) list = list.filter((p) => activeCategories.includes(p.category?.id));
    if (organicOnly) list = list.filter((p) => p.organic_certified);
    if (activeProducers.length > 0) list = list.filter((p) => activeProducers.includes(p.producer_name || p.producer_id));

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
          (activeProducers.length === 0 || activeProducers.includes(p.producer_name || p.producer_id))
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
      const res = await api.post<CartData>("/api/orders/cart/items/", { product_id: productId, quantity: 1 });
      // Update cart map from response
      const map: Record<number, { id: number; quantity: number }> = {};
      for (const item of res.data.items || []) {
        map[item.product_id] = { id: item.id, quantity: item.quantity };
      }
      setCartMap(map);
      setActionMessage("Item added to basket.");
    } catch (error: any) {
      setActionMessage(error?.response?.data?.error || error?.message || "Failed to add item to basket.");
    } finally {
      setAddingProductId(null);
    }
  }

  async function handleUpdateCartQty(productId: number, newQty: number) {
    const cartItem = cartMap[productId];
    if (!cartItem) return;

    try {
      setAddingProductId(productId);
      let res;
      if (newQty <= 0) {
        res = await api.delete<CartData>(`/api/orders/cart/items/${cartItem.id}/`);
      } else {
        res = await api.patch<CartData>(`/api/orders/cart/items/${cartItem.id}/`, { quantity: newQty });
      }
      const map: Record<number, { id: number; quantity: number }> = {};
      for (const item of res.data.items || []) {
        map[item.product_id] = { id: item.id, quantity: item.quantity };
      }
      setCartMap(map);
    } catch {
      // ignore
    } finally {
      setAddingProductId(null);
    }
  }

  if (loading) {
    return <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>Loading products...</div>;
  }

  if (pageError) {
    return <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px", color: "crimson" }}>{pageError}</div>;
  }

  return (
    <div className="home">
      {/* Hero */}
      <div className="home__hero">
        <div className="home__hero-overlay" />
        <div className="home__hero-content">
          <h1 className="home__hero-title">
            Fresh food,<br />delivered to your door.
          </h1>
          <p className="home__hero-sub">
            Support local growers and enjoy the freshest seasonal produce Bristol has to offer.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="home__stats">
        <div className="home__stats-inner">
          <span><strong>{products.length}</strong> products available</span>
          <span><strong>{producerNames.length}</strong> local producers</span>
          <span><strong>{products.filter((p) => p.organic_certified).length}</strong> organic lines</span>
        </div>
      </div>

      {/* Body */}
      <div className="home__body">
        {/* Sidebar */}
        <aside className="home__sidebar">
          <div className="home__sidebar-section">
            <div className="home__sidebar-heading">Categories</div>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`home__cat-row ${activeCategories.includes(cat.id) ? "home__cat-row--active" : ""}`}
                onClick={() => toggleCategory(cat.id)}
              >
                <span>{cat.name}</span>
                <span className="home__cat-badge">{countPerCategory[cat.id] || 0}</span>
              </div>
            ))}
          </div>

          <div className="home__sidebar-section">
            <div className="home__sidebar-heading">Certification</div>
            <label className="home__checkbox-label">
              <input type="checkbox" checked={organicOnly} onChange={(e) => setOrganicOnly(e.target.checked)} />
              Organic Certified
            </label>
          </div>

          <div className="home__sidebar-section">
            <div className="home__sidebar-heading">Producers</div>
            {producerNames.map((name) => (
              <label key={name} className="home__producer-label">
                <input type="checkbox" checked={activeProducers.includes(name)} onChange={() => toggleProducer(name)} />
                <span>{name}</span>
              </label>
            ))}
          </div>

          {(activeCategories.length > 0 || organicOnly || activeProducers.length > 0) && (
            <div style={{ padding: "0 20px" }}>
              <button
                className="home__clear-btn"
                onClick={() => { setActiveCategories([]); setOrganicOnly(false); setActiveProducers([]); }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="home__main">
          <div className="home__main-header">
            <div>
              <h2 className="home__main-title">Fresh from the Farm</h2>
              <p className="home__main-count">
                Showing <strong>{filtered.length}</strong> products
              </p>
            </div>

            <div className="home__sort-wrap">
              <span className="home__sort-label">Sort by:</span>
              <select
                className="home__sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="popular">Most Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          {/* Toast */}
          {actionMessage && (
            <div
              className={`home__toast ${
                actionMessage.toLowerCase().includes("added") ? "home__toast--success" : "home__toast--error"
              }`}
            >
              {actionMessage}
            </div>
          )}

          {/* Active filter chips */}
          {(activeCategories.length > 0 || organicOnly || activeProducers.length > 0 || search) && (
            <div className="home__chips">
              {categories.filter((c) => activeCategories.includes(c.id)).map((c) => (
                <button key={c.id} className="home__chip" onClick={() => toggleCategory(c.id)}>
                  {c.name} ×
                </button>
              ))}
              {organicOnly && (
                <button className="home__chip" onClick={() => setOrganicOnly(false)}>Organic ×</button>
              )}
              {search && (
                <button className="home__chip home__chip--search" onClick={() => setSearchParams({})}>
                  "{search}" ×
                </button>
              )}
            </div>
          )}

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div className="home__empty">No products match your filters.</div>
          ) : (
            <div className="home__grid">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartQty={cartMap[product.id]?.quantity || 0}
                  adding={addingProductId === product.id}
                  onAddToCart={() => handleAddToCart(product.id)}
                  onUpdateQty={(newQty) => handleUpdateCartQty(product.id, newQty)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}