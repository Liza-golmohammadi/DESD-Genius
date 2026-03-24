import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import api from "../api";

type Producer = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  store_name: string | null;
  store_description: string | null;
  store_created_at: string;
  store_contact: string | null;
  store_address: string | null;
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
        const res = await api.get<Producer>(`/accounts/producers/${id}/`);
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

      {item.store_description && <p style={{ marginTop: 12 }}>{item.store_description}</p>}

      {item.store_contact && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>Contact details</div>
          <div style={{ whiteSpace: "pre-line", opacity: 0.85 }}>
            {item.store_contact}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, opacity: 0.7, fontSize: 13 }}>
        Joined Since: {new Date(item.store_created_at).toLocaleString()}
      </div>
    </div>
  );
}