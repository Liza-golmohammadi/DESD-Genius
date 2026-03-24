import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import useAuth from "../context/useAuth";

type ProducerProfile = {
  store_name: string;
  store_description: string;
  store_contact: string;
  store_created_at: string;
};

type UserProfile = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  customer_role: string | null;
  is_producer: boolean;
  accepted_terms_at: string | null;
  producer_profile: ProducerProfile | null;
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

const sectionTitle: React.CSSProperties = {
  margin: "20px 0 8px",
  fontWeight: 700,
  fontSize: 14,
  color: "#1f4d3a",
  textTransform: "uppercase",
  letterSpacing: 0.5,
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

export default function User() {
  const { user, loading } = useAuth();
  const access = localStorage.getItem("access");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Editable user fields
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customerRole, setCustomerRole] = useState("");

  // Editable producer fields
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeContact, setStoreContact] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!access) {
    return (
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>You're not logged in</h2>
        <p style={{ opacity: 0.8 }}>Please log in to view your account details.</p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/login">Go to Login</Link>
          <Link to="/signup">Create an account</Link>
        </div>
      </div>
    );
  }

  const populateFields = (data: UserProfile) => {
    setEmail(data.email ?? "");
    setFirstName(data.first_name ?? "");
    setLastName(data.last_name ?? "");
    setCustomerRole(data.customer_role ?? "");
    setStoreName(data.producer_profile?.store_name ?? "");
    setStoreDescription(data.producer_profile?.store_description ?? "");
    setStoreContact(data.producer_profile?.store_contact ?? "");
  };

  useEffect(() => {
    if (user) {
      setProfile(user as UserProfile);
      populateFields(user as UserProfile);
      return;
    }
    (async () => {
      try {
        const res = await api.get<UserProfile>("/accounts/auth/me/");
        setProfile(res.data);
        populateFields(res.data);
      } catch {
        // handled by UI below
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Loading your profile…</h2>
        <p style={{ opacity: 0.8 }}>Please wait a moment.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Loading your profile…</h2>
        <p style={{ opacity: 0.8 }}>
          If this takes too long, your session may have expired.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer" }}
          >
            Retry
          </button>
          <Link
            to="/login"
            onClick={() => {
              localStorage.removeItem("access");
              localStorage.removeItem("refresh");
            }}
          >
            Log in again
          </Link>
        </div>
      </div>
    );
  }

  async function saveProfile() {
    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      const payload: Record<string, unknown> = {
        email,
        first_name: firstName,
        last_name: lastName,
        // only send customer_role if not a producer
        ...(!profile?.is_producer && { customer_role: customerRole }),
        // only send producer_profile if user is a producer
        ...(profile?.is_producer && {
          producer_profile: {
            store_name: storeName,
            store_description: storeDescription,
            store_contact: storeContact,
          },
        }),
      };

      await api.patch("/accounts/auth/me/", payload);
      const refreshed = await api.get<UserProfile>("/accounts/auth/me/");
      setProfile(refreshed.data);
      populateFields(refreshed.data);

      setEditMode(false);
      setMsg("Profile updated successfully.");
    } catch (e: unknown) {
      const axiosErr = e as { response?: { data?: Record<string, string[]> } };
      const data = axiosErr.response?.data;
      if (data) {
        const message = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
          .join(" | ");
        setErr(message);
      } else {
        setErr((e as Error).message || "Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>Your Account</h2>

      {msg && <div style={successBox}>{msg}</div>}
      {err && <div style={errorBox}>{err}</div>}

      {/* ── Account Info ── */}
      <div style={sectionTitle}>Account Info</div>
      <div>
        {/* Email — editable */}
        <div style={row}>
          <div style={label}>Email</div>
          {editMode ? (
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          ) : (
            <div>{profile.email}</div>
          )}
        </div>

        {/* First name — editable */}
        <div style={row}>
          <div style={label}>First name</div>
          {editMode ? (
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
          ) : (
            <div>{profile.first_name}</div>
          )}
        </div>

        {/* Last name — editable */}
        <div style={row}>
          <div style={label}>Last name</div>
          {editMode ? (
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
          ) : (
            <div>{profile.last_name}</div>
          )}
        </div>

        {/* Customer role — editable, only for customers */}
        {!profile.is_producer && (
          <div style={row}>
            <div style={label}>Account type</div>
            {editMode ? (
              <select
                value={customerRole}
                onChange={(e) => setCustomerRole(e.target.value)}
                style={inputStyle}
              >
                <option value="individual">Individual</option>
                <option value="restaurant">Restaurant</option>
              </select>
            ) : (
              <div style={{ textTransform: "capitalize" }}>{profile.customer_role ?? "—"}</div>
            )}
          </div>
        )}

        {/* Is producer — read only */}
        <div style={row}>
          <div style={label}>Account role</div>
          <div>{profile.is_producer ? "Producer" : "Customer"}</div>
        </div>
      </div>

      {/* ── Producer Store Info ── */}
      {profile.is_producer && profile.producer_profile && (
        <>
          <div style={sectionTitle}>Store Info</div>
          <div>
            {/* Store name — editable */}
            <div style={row}>
              <div style={label}>Store name</div>
              {editMode ? (
                <input value={storeName} onChange={(e) => setStoreName(e.target.value)} style={inputStyle} />
              ) : (
                <div>{profile.producer_profile.store_name || "—"}</div>
              )}
            </div>

            {/* Store description — editable */}
            <div style={row}>
              <div style={label}>Description</div>
              {editMode ? (
                <textarea
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              ) : (
                <div>{profile.producer_profile.store_description || "—"}</div>
              )}
            </div>

            {/* Store contact — editable */}
            <div style={row}>
              <div style={label}>Contact</div>
              {editMode ? (
                <input value={storeContact} onChange={(e) => setStoreContact(e.target.value)} style={inputStyle} />
              ) : (
                <div>{profile.producer_profile.store_contact || "—"}</div>
              )}
            </div>

            {/* Store created at — read only */}
            <div style={row}>
              <div style={label}>Created since</div>
              <div>
                {profile.producer_profile.store_created_at
                  ? new Date(profile.producer_profile.store_created_at).toLocaleDateString()
                  : "—"}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Actions ── */}
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
            Edit profile
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                cursor: saving ? "not-allowed" : "pointer",
                background: "#1f4d3a",
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
                setErr(null);
                setMsg(null);
                populateFields(profile);
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

        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            window.location.href = "/login";
          }}
          style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer" }}
        >
          Log out
        </button>

        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
}
