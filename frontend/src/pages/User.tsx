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

export default function User() {
  const { user, loading } = useAuth();
  const access = localStorage.getItem("access");

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Logged out guard
  if (!access) {
    return (
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>You’re not logged in</h2>
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
      setProfile(user as any);
      setFirstName(String((user as any).first_name ?? ""));
      setLastName(String((user as any).last_name ?? ""));
      return;
    }

    (async () => {
      try {
        const res = await api.get<UserProfile>("/api/auth/user/");
        setProfile(res.data);
        setFirstName(String(res.data.first_name ?? ""));
        setLastName(String(res.data.last_name ?? ""));
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

    // Validate passwords only if user is trying to change password
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

      await api.patch("/api/auth/user/", payload);

      const refreshed = await api.get<UserProfile>("/api/auth/user/");
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

  return (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>Your Account</h2>

      {msg && <div style={successBox}>{msg}</div>}
      {err && <div style={errorBox}>{err}</div>}

      <div style={{ marginTop: 16 }}>
        {"email" in profile && (
          <div style={row}>
            <div style={label}>Email</div>
            <div>{String((profile as any).email)}</div>
          </div>
        )}

        {"role" in profile && (
          <div style={row}>
            <div style={label}>Role</div>
            <div>{String((profile as any).role)}</div>
          </div>
        )}

        {"is_active" in profile && (
          <div style={row}>
            <div style={label}>Active</div>
            <div>{String((profile as any).is_active)}</div>
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
            <div>{String((profile as any).first_name ?? "")}</div>
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
            <div>{String((profile as any).last_name ?? "")}</div>
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

          // Clear any old password inputs before editing
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

            // Reset fields back to current profile values
            setFirstName(String((profile as any).first_name ?? ""));
            setLastName(String((profile as any).last_name ?? ""));

            // Clear password fields
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