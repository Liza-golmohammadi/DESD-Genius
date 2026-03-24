import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import useAuth from "../context/useAuth";

type UserProfile = {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  address?: string;
  postcode?: string;
  phone?: string;
  delivery_address?: string;
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Address fields
  const [editAddress, setEditAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Logged out guard
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

  // Use context user if available, otherwise fetch once
  useEffect(() => {
    if (user) {
      const u = user as any;
      setProfile(u);
      setFirstName(String(u.first_name ?? ""));
      setLastName(String(u.last_name ?? ""));
      setPhone(String(u.phone ?? ""));
      setAddress(String(u.address ?? ""));
      setPostcode(String(u.postcode ?? ""));
      setDeliveryAddress(String(u.delivery_address ?? ""));
      return;
    }

    (async () => {
      try {
        const res = await api.get<UserProfile>("/accounts/auth/user/");
        setProfile(res.data);
        setFirstName(String(res.data.first_name ?? ""));
        setLastName(String(res.data.last_name ?? ""));
        setPhone(String(res.data.phone ?? ""));
        setAddress(String(res.data.address ?? ""));
        setPostcode(String(res.data.postcode ?? ""));
        setDeliveryAddress(String(res.data.delivery_address ?? ""));
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

    if (newPassword.trim() && newPassword !== confirmPassword) {
      setErr("Passwords do not match.");
      setSaving(false);
      return;
    }

    try {
      const payload: any = {
        first_name: firstName,
        last_name: lastName,
      };

      if (newPassword.trim()) payload.password = newPassword;

      await api.patch("/accounts/auth/user/", payload);

      const refreshed = await api.get<UserProfile>("/accounts/auth/user/");
      setProfile(refreshed.data);

      setNewPassword("");
      setConfirmPassword("");
      setEditMode(false);
      setMsg("Profile updated successfully.");
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
        "Failed to update profile";
      setErr(message);
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

      {/* ── Profile info ──────────────────────── */}
      <div style={{ marginTop: 16 }}>
        {"email" in profile && (
          <div style={row}>
            <div style={label}>Email</div>
            <div>{String(profile.email)}</div>
          </div>
        )}

        {"role" in profile && (
          <div style={row}>
            <div style={label}>Role</div>
            <div>{String(profile.role)}</div>
          </div>
        )}

        {"is_active" in profile && (
          <div style={row}>
            <div style={label}>Active</div>
            <div>{String(profile.is_active)}</div>
          </div>
        )}

        <div style={row}>
          <div style={label}>First name</div>
          {editMode ? (
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={inputStyle}
            />
          ) : (
            <div>{String(profile.first_name ?? "")}</div>
          )}
        </div>

        <div style={row}>
          <div style={label}>Last name</div>
          {editMode ? (
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={inputStyle}
            />
          ) : (
            <div>{String(profile.last_name ?? "")}</div>
          )}
        </div>

        {editMode && (
          <>
            <div style={row}>
              <div style={label}>New password</div>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                placeholder="Leave blank to keep current password"
                style={inputStyle}
              />
            </div>

            <div style={{ ...row, borderBottom: "none" }}>
              <div style={label}>Confirm password</div>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="Re-enter new password"
                style={inputStyle}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        {!editMode ? (
          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setErr(null);
              setNewPassword("");
              setConfirmPassword("");
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
                setErr(null);
                setMsg(null);
                setFirstName(String(profile.first_name ?? ""));
                setLastName(String(profile.last_name ?? ""));
                setNewPassword("");
                setConfirmPassword("");
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

      {/* ── Delivery Address ──────────────────── */}
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

      {/* ── My Orders link ────────────────────── */}
      {profile.role === "customer" && (
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

      {/* ── Footer actions ────────────────────── */}
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