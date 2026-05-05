import { useEffect, useState } from "react";
import api from "../api";

type ProductData = {
  id: number;
  name: string;
  producer_name: string;
  farm_origin: string;
  food_miles: string | null;
  organic_certified: boolean;
  harvest_date: string;
};

type RecipeData = {
  id: number;
  title: string;
  description: string;
  ingredients: string;
  producer_name: string;
};

/* ── shared styles ────────────────────────────── */
const page: React.CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "40px 20px",
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  padding: "1.5rem",
  marginBottom: "1.5rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#1f4d3a",
  margin: "0 0 0.75rem",
};

const badge = (color: string, bg: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 6,
  fontSize: "0.78rem",
  fontWeight: 700,
  color,
  background: bg,
  marginRight: 6,
});

export default function Sustainability() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [recipes, setRecipes] = useState<RecipeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ProductData[]>("/api/products/").catch(() => ({ data: [] })),
      api.get<RecipeData[]>("/api/recipes/").catch(() => ({ data: [] })),
    ]).then(([prodRes, recRes]) => {
      setProducts(prodRes.data);
      setRecipes(recRes.data);
      setLoading(false);
    });
  }, []);

  const productsWithMiles = products.filter(
    (p) => p.food_miles !== null && p.food_miles !== undefined
  );

  const avgFoodMiles =
    productsWithMiles.length > 0
      ? (
          productsWithMiles.reduce(
            (sum, p) => sum + parseFloat(p.food_miles || "0"),
            0
          ) / productsWithMiles.length
        ).toFixed(1)
      : null;

  const organicCount = products.filter((p) => p.organic_certified).length;
  const localCount = products.filter(
    (p) =>
      p.farm_origin &&
      p.farm_origin.toLowerCase().includes("bristol")
  ).length;

  return (
    <div style={page}>
      {/* ── Hero ──────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
          borderRadius: 16,
          padding: "3rem 2.5rem",
          marginBottom: "2rem",
          color: "#fff",
        }}
      >
        <h1
          style={{
            fontSize: "2.4rem",
            margin: "0 0 0.75rem",
            fontWeight: 800,
          }}
        >
          Sustainability at Bristol Regional Food Network
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "1.05rem",
            lineHeight: 1.7,
            maxWidth: 700,
            opacity: 0.9,
          }}
        >
          We believe in connecting communities with local, seasonal food. By
          shortening supply chains and supporting regional producers, we reduce
          food miles, cut emissions, and keep money in the local economy. Every
          purchase on this platform is a step towards a more sustainable food
          system.
        </p>
      </div>

      {loading ? (
        <p style={{ opacity: 0.6, padding: 20 }}>Loading sustainability data…</p>
      ) : (
        <>
          {/* ── Quick stats ───────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <div style={card}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                Products Listed
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#1f4d3a",
                }}
              >
                {products.length}
              </p>
            </div>
            <div style={card}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                Organic Certified
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#1f4d3a",
                }}
              >
                {organicCount}
              </p>
            </div>
            <div style={card}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                Bristol-Local Products
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#1f4d3a",
                }}
              >
                {localCount}
              </p>
            </div>
            <div style={card}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                Avg Food Miles
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#1f4d3a",
                }}
              >
                {avgFoodMiles !== null ? `${avgFoodMiles} mi` : "N/A"}
              </p>
            </div>
          </div>

          {/* ── Food Miles section ────────────────── */}
          <div style={card}>
            <h2 style={sectionTitle}>Understanding Food Miles</h2>
            <p
              style={{
                margin: "0 0 1rem",
                color: "#374151",
                lineHeight: 1.7,
              }}
            >
              Food miles measure the distance food travels from where it is
              grown or produced to where it is consumed. The further food
              travels, the greater the carbon emissions from transport. By
              buying from local producers through our platform, you
              dramatically reduce the environmental footprint of your meals.
              Typical supermarket produce in the UK travels an average of 1,500
              miles — our platform aims to keep that under 50.
            </p>

            {productsWithMiles.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.9rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      <th style={{ padding: "10px 12px" }}>Product</th>
                      <th style={{ padding: "10px 12px" }}>Producer</th>
                      <th style={{ padding: "10px 12px" }}>Origin</th>
                      <th style={{ padding: "10px 12px" }}>Food Miles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsWithMiles.map((p) => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: "1px solid #f0f0f0" }}
                      >
                        <td style={{ padding: "10px 12px" }}>{p.name}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {p.producer_name}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {p.farm_origin || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                          {parseFloat(p.food_miles || "0") < 30 ? (
                            <span style={badge("#065f46", "#d1fae5")}>
                              {p.food_miles} mi
                            </span>
                          ) : (
                            <span style={badge("#92400e", "#fef3c7")}>
                              {p.food_miles} mi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p
                style={{
                  opacity: 0.5,
                  fontStyle: "italic",
                  margin: "1rem 0 0",
                }}
              >
                Food miles data will appear here once producers add origin
                information to their products.
              </p>
            )}
          </div>

          {/* ── Traceability section ──────────────── */}
          <div style={card}>
            <h2 style={sectionTitle}>Traceability &amp; Transparency</h2>
            <p
              style={{
                margin: "0 0 1.25rem",
                color: "#374151",
                lineHeight: 1.7,
              }}
            >
              Every product on our platform carries traceability information so
              you know exactly where your food comes from and how it was
              produced. Here is what we track:
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: 10,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 0.5rem",
                    fontSize: "1.05rem",
                    color: "#1f4d3a",
                  }}
                >
                  Harvest Dates
                </h3>
                <p style={{ margin: 0, color: "#374151", lineHeight: 1.6, fontSize: "0.9rem" }}>
                  Producers record when each product was harvested, so you can
                  be sure you are getting the freshest seasonal produce
                  available.
                </p>
              </div>

              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: 10,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 0.5rem",
                    fontSize: "1.05rem",
                    color: "#1f4d3a",
                  }}
                >
                  Organic Certification
                </h3>
                <p style={{ margin: 0, color: "#374151", lineHeight: 1.6, fontSize: "0.9rem" }}>
                  Products that meet organic standards are clearly marked with
                  an organic badge, giving you confidence in how they were
                  grown.
                </p>
              </div>

              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: 10,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 0.5rem",
                    fontSize: "1.05rem",
                    color: "#1f4d3a",
                  }}
                >
                  Farm Origin
                </h3>
                <p style={{ margin: 0, color: "#374151", lineHeight: 1.6, fontSize: "0.9rem" }}>
                  Each product displays where it was grown or produced, letting
                  you support farms in your own community and reduce transport
                  emissions.
                </p>
              </div>
            </div>
          </div>

          {/* ── Product origins table ─────────────── */}
          {products.length > 0 && (
            <div style={card}>
              <h2 style={sectionTitle}>Our Products at a Glance</h2>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.9rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      <th style={{ padding: "10px 12px" }}>Product</th>
                      <th style={{ padding: "10px 12px" }}>Producer</th>
                      <th style={{ padding: "10px 12px" }}>Origin</th>
                      <th style={{ padding: "10px 12px" }}>Harvest Date</th>
                      <th style={{ padding: "10px 12px" }}>Organic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: "1px solid #f0f0f0" }}
                      >
                        <td style={{ padding: "10px 12px" }}>{p.name}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {p.producer_name}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {p.farm_origin || "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {p.harvest_date
                            ? new Date(p.harvest_date).toLocaleDateString()
                            : "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {p.organic_certified ? (
                            <span style={badge("#065f46", "#d1fae5")}>
                              Organic
                            </span>
                          ) : (
                            <span style={{ opacity: 0.4 }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Recipes section ───────────────────── */}
          {recipes.length > 0 && (
            <div style={card}>
              <h2 style={sectionTitle}>Recipes from Our Producers</h2>
              <p
                style={{
                  margin: "0 0 1rem",
                  color: "#374151",
                  lineHeight: 1.7,
                }}
              >
                Our producers share recipes using their own ingredients,
                inspiring you to cook seasonal, local meals.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1rem",
                }}
              >
                {recipes.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "1.25rem",
                      borderRadius: 10,
                      background: "#fefce8",
                      border: "1px solid #fde68a",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 0.4rem",
                        fontSize: "1.05rem",
                        color: "#92400e",
                      }}
                    >
                      {r.title}
                    </h3>
                    <p
                      style={{
                        margin: "0 0 0.5rem",
                        fontSize: "0.82rem",
                        color: "#6b7280",
                      }}
                    >
                      By {r.producer_name}
                    </p>
                    {r.description && (
                      <p
                        style={{
                          margin: "0 0 0.5rem",
                          color: "#374151",
                          lineHeight: 1.6,
                          fontSize: "0.9rem",
                        }}
                      >
                        {r.description}
                      </p>
                    )}
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        color: "#374151",
                        whiteSpace: "pre-line",
                      }}
                    >
                      <strong>Ingredients:</strong>
                      {"\n"}
                      {r.ingredients}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
