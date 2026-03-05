import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

type ProducerMe = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  store_name: string;
  description: string;
  contact_info?: string; // new
  created_at: string;
};

const card: React.CSSProperties = {
  maxWidth: 720,
  margin: "40px auto",
  padding: 20,
  borderRadius: 12,
  border: "1px solid #e6e6e6",
  background: "white",
};

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px solid #f0f0f0",
};

const label: React.CSSProperties = { opacity: 0.7 };

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
};

const successBox: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 10,
  background: "#ecfff2",
  border: "1px solid #bff0cf",
};

const errorBox: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 10,
  background: "#ffecec",
  border: "1px solid #ffc9c9",
  color: "#8a1f1f",
};

export default function ProducerDashboard() {
  const [data, setData] = useState<ProducerMe | null>(null);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState(""); // new

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<ProducerMe>("/accounts/producer/me/");
      setData(res.data);
      setStoreName(res.data.store_name ?? "");
      setDescription(res.data.description ?? "");
      setContactInfo(res.data.contact_info ?? ""); // new
    } catch (e: any) {
      const r = e?.response;
      const message =
        r?.data?.detail ||
        r?.data?.error ||
        (r?.data && typeof r.data === "object"
          ? Object.entries(r.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
              .join(" | ")
          : null) ||
        e?.message ||
        "Failed to load producer profile";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      await api.patch("/accounts/producer/me/", {
        store_name: storeName,
        description,
        contact_info: contactInfo, // new
      });

      await load();
      setEditMode(false);
      setMsg("Producer profile updated successfully.");
    } catch (e: any) {
      const r = e?.response;
      const message =
        r?.data?.detail ||
        r?.data?.error ||
        (r?.data && typeof r.data === "object"
          ? Object.entries(r.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
              .join(" | ")
          : null) ||
        e?.message ||
        "Failed to update producer profile";
      setErr(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={card}>Loading producer dashboard…</div>;

  if (!data) {
    return (
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Producer Dashboard</h2>
        {err ? <div style={errorBox}>{err}</div> : <p>Unable to load.</p>}
        <div style={{ marginTop: 12 }}>
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>Producer Dashboard</h2>

      {msg && <div style={successBox}>{msg}</div>}
      {err && <div style={errorBox}>{err}</div>}

      <div style={{ marginTop: 16 }}>
        <div style={row}>
          <div style={label}>Email</div>
          <div>{data.email}</div>
        </div>

        <div style={row}>
          <div style={label}>Name</div>
          <div>{`${data.first_name} ${data.last_name}`.trim()}</div>
        </div>

        <div style={row}>
          <div style={label}>Store name</div>
          {editMode ? (
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              style={inputStyle}
              placeholder="Your store name"
            />
          ) : (
            <div>{data.store_name || <span style={{ opacity: 0.6 }}>—</span>}</div>
          )}
        </div>

        <div style={row}>
          <div style={label}>Description</div>
          {editMode ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 90 }}
              placeholder="Tell customers about your farm / business"
            />
          ) : (
            <div>{data.description || <span style={{ opacity: 0.6 }}>—</span>}</div>
          )}
        </div>

        {/* NEW: Contact info (free text) */}
        <div style={{ ...row, borderBottom: "none" }}>
          <div style={label}>Contact info</div>
          {editMode ? (
            <textarea
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              style={{ ...inputStyle, minHeight: 90 }}
              placeholder="How customers can contact you (phone, WhatsApp, Instagram, pickup address, etc.)"
            />
          ) : (
            <div>{contactInfo || <span style={{ opacity: 0.6 }}>—</span>}</div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        {!editMode ? (
          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setErr(null);
              setEditMode(true);
            }}
            style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer" }}
          >
            Edit producer profile
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                cursor: saving ? "not-allowed" : "pointer",
                background: "#111",
                color: "#fff",
                border: "none",
              }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setMsg(null);
                setErr(null);
                setStoreName(data.store_name ?? "");
                setDescription(data.description ?? "");
                setContactInfo(data.contact_info ?? "");
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                background: "#fff",
                border: "1px solid #ddd",
              }}
            >
              Cancel
            </button>
          </>
        )}

        <Link to="/user">User profile</Link>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
}