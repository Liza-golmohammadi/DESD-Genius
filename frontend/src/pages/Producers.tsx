import { useEffect, useState } from "react";
import api from "../api";

type Producer = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  store_name: string | null;
  description: string | null;
  created_at: string;
};


export default function Producers() {
  const [items, setItems] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const res = await api.get<Producer[]>("/api/producers/");
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
      <p style={{ opacity: 0.75 }}>
        Data from <code>GET /api/producers/</code>
      </p>

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
            <a
                href={`/producers/${p.id}`}
                style={{ fontWeight: 800, textDecoration: "none", color: "inherit" }}
                >
                {p.store_name || `${p.first_name} ${p.last_name}`.trim() || p.email}
            </a>
            <div style={{ opacity: 0.75 }}>{p.email}</div>
            {p.description && <p style={{ marginTop: 10 }}>{p.description}</p>}
          </div>
        ))}

        {items.length === 0 && (
        <div style={{ opacity: 0.7 }}>No producers yet. Register a producer account to see it here.</div>
        )}

        
      </div>
    </div>
  );
}