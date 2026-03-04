import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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

export default function ProducerDetail() {
  const { id } = useParams();
  const [item, setItem] = useState<Producer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const res = await api.get<Producer>(`/api/producers/${id}/`);
        setItem(res.data);
      } catch (e: any) {
        setError(e?.message || "Failed to load producer");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <p>Loading producer…</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!item) return <p>Not found.</p>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <Link to="/producers">← Back to producers</Link>

      <h1 style={{ marginTop: 12 }}>
        {item.store_name || `${item.first_name} ${item.last_name}`.trim() || item.email}
      </h1>

      <div style={{ opacity: 0.75 }}>{item.email}</div>

      {item.description && <p style={{ marginTop: 12 }}>{item.description}</p>}

      <div style={{ marginTop: 16, opacity: 0.7, fontSize: 13 }}>
        Created: {new Date(item.created_at).toLocaleString()}
      </div>
    </div>
  );
}