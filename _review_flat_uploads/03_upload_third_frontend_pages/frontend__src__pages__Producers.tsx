import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../api";

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
};

export default function Producers() {
  const [items, setItems] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const res = await api.get<Producer[]>("/accounts/producers/");
        console.log(res.data)
        setItems(res.data);
      } catch (e: any) {
        setError(e?.message || "Failed to load producers");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading producers…</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h1>Producers</h1>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((p) => (
          
          <div
            key={p.id}
            style={{
              border: "1px solid #eaeaea",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
            }}
          >
            <Link
              to={`/producers/${p.id}`}
              style={{
                fontWeight: 800,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              {p.store_name ||
                `${p.first_name} ${p.last_name}`.trim() ||
                p.email}
            </Link>

            {p.store_description && (
              <p style={{ marginTop: 8, marginBottom: 0 }}>{p.store_description}</p>
            )}

            {p.store_contact && (
              <p
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  fontSize: 13,
                  opacity: 0.7,
                  whiteSpace: "pre-line",
                }}
              >
                {p.store_contact}
              </p>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div style={{ opacity: 0.7 }}>
            No producers yet. Register a producer account to see it here.
          </div>
        )}
      </div>
    </div>
  );
}
