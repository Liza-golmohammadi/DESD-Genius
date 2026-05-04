import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import useAuth from "../context/useAuth";

type ProducerProfile = {
  store_name: string;
  store_description: string;
  store_contact: string;
  store_address: string | null;
  store_created_at: string;
};

type UserProfile = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  address: string | null;
  postcode: string | null;
  delivery_address: string | null;
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
  width: "100%",
  boxSizing: "border-box",
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

const sectionHeading: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "#1f4d3a",
  margin: "24px 0 12px",
  paddingTop: 12,
  borderTop: "2px solid #e5e7eb",
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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerRole, setCustomerRole] = useState("");

  // Address editing
  const [editAddress, setEditAddress] = useState(false);

  // Editable producer fields
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeContact, setStoreContact] = useState("");
  const [storeAddress, setStoreAddress] = useState("");

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
    setPhoneNumber(data.phone_number ?? data.phone ?? "");
    setAddress(data.address ?? "");
    setPostcode(data.postcode ?? "");
    setDeliveryAddress(data.delivery_address ?? "");
    setCustomerRole(data.customer_role ?? "");
    setStoreName(data.producer_profile?.store_name ?? "");
    setStoreDescription(data.producer_profile?.store_description ?? "");
    setStoreContact(data.producer_profile?.store_contact ?? "");
    setStoreAddress(data.producer_profile?.store_address ?? "");
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
        phone_number: phoneNumber,
        address: address,
        ...(!profile?.is_producer && { customer_role: customerRole }),
        ...(profile?.is_producer && {
          producer_profile: {
            store_name: storeName,
            store_description: storeDescription,
            store_contact: storeContact,
            store_address: storeAddress,
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

  async function saveAddress() {
    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      await api.patch("/accounts/auth/user/", {
        address,
        postcode,
        delivery_address: deliveryAddress,
      });

      const refreshed = await api.get<UserProfile>("/accounts/auth/user/");
      setProfile(refreshed.data);
      setAddress(String(refreshed.data.address ?? ""));
      setPostcode(String(refreshed.data.postcode ?? ""));
      setDeliveryAddress(String(refreshed.data.delivery_address ?? ""));

      setEditAddress(false);
      setMsg("Address updated successfully.");
    } catch (e: any) {
      const data = e?.response?.data;
      const message =
        data?.detail ||
        data?.error ||
        (data && typeof data === "object"
          ? Object.entries(data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
              .join(" | ")
          : null) ||
        e?.message ||
        "Failed to update address";
      setErr(message);
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

        {/* Role — read only */}
        {profile.role && (
          <div style={row}>
            <div style={label}>Role</div>
            <div>{profile.role}</div>
          </div>
        )}

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

        {/* Phone number — editable */}
        <div style={row}>
          <div style={label}>Phone number</div>
          {editMode ? (
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+44 7700 900000"
              style={inputStyle}
            />
          ) : (
            <div>{profile.phone_number || profile.phone || "—"}</div>
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
                <option value="community_group">Community Group</option>
                <option value="restaurant">Restaurant</option>
              </select>
            ) : (
              <div style={{ textTransform: "capitalize" }}>{profile.customer_role ?? "—"}</div>
            )}
          </div>
        )}

        {/* Account role — read only */}
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

            <div style={row}>
              <div style={label}>Store name</div>
              {editMode ? (
                <input value={storeName} onChange={(e) => setStoreName(e.target.value)} style={inputStyle} />
              ) : (
                <div>{profile.producer_profile.store_name || "—"}</div>
              )}
            </div>

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

            <div style={row}>
              <div style={label}>Contact</div>
              {editMode ? (
                <input value={storeContact} onChange={(e) => setStoreContact(e.target.value)} style={inputStyle} />
              ) : (
                <div>{profile.producer_profile.store_contact || "—"}</div>
              )}
            </div>

            <div style={row}>
              <div style={label}>Store address</div>
              {editMode ? (
                <textarea
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  rows={3}
                  placeholder="123 Farm Lane, Bristol, BS1 1AA"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              ) : (
                <div>{profile.producer_profile.store_address || "—"}</div>
              )}
            </div>

            <div style={row}>
              <div style={label}>Store since</div>
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
      </div>

      {/* ── Delivery Address ── */}
      <h3 style={sectionHeading}>Delivery Address</h3>

      {!editAddress ? (
        <>
          <div style={row}>
            <div style={label}>Street address</div>
            <div>{profile.address || profile.delivery_address || "Not set"}</div>
          </div>
          <div style={row}>
            <div style={label}>Postcode</div>
            <div>{profile.postcode || "Not set"}</div>
          </div>

          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setErr(null);
              setEditAddress(true);
            }}
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Edit address
          </button>
        </>
      ) : (
        <>
          <div style={row}>
            <div style={label}>Street address</div>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 High Street"
              style={inputStyle}
            />
          </div>
          <div style={row}>
            <div style={label}>Postcode</div>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="BS1 1AA"
              style={inputStyle}
            />
          </div>
          <div style={row}>
            <div style={label}>Delivery address</div>
            <input
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Same as above, or a different delivery address"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button
              type="button"
              onClick={saveAddress}
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
              {saving ? "Saving…" : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditAddress(false);
                setErr(null);
                setMsg(null);
                setAddress(String(profile.address ?? ""));
                setPostcode(String(profile.postcode ?? ""));
                setDeliveryAddress(String(profile.delivery_address ?? ""));
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
          </div>
        </>
      )}

      {/* ── My Orders link ── */}
      {(profile.role === "customer" || !profile.is_producer) && (
        <>
          <h3 style={sectionHeading}>My Orders</h3>
          <p style={{ margin: "0 0 12px", color: "#374151", lineHeight: 1.6 }}>
            View your order history, track deliveries, and reorder past purchases.
          </p>
          <Link
            to="/orders"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 10,
              background: "#1f4d3a",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            View Order History
          </Link>
        </>
      )}

      {/* ── Footer actions ── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 24,
          paddingTop: 16,
          borderTop: "2px solid #e5e7eb",
          flexWrap: "wrap",
        }}
      >
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
