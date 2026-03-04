import { Link } from "react-router";
import useAuth from "../context/useAuth";

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

const User = () => {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading...</p>;

  // Frontend-only guard: if there is no token, we are not "loading",
  // we are logged out.
  const access = localStorage.getItem("access");

  if (!access) {
    return (
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>You’re not logged in</h2>
        <p style={{ opacity: 0.8 }}>
          Please log in to view your account details.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/login">Go to Login</Link>
          <Link to="/signup">Create an account</Link>
        </div>
      </div>
    );
  }

  // If token exists but user is still null, show a loading state
  // (and avoid “forever loading” by giving the user an action).
  if (!user) {
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

  return (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>Your Account</h2>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Details returned by <code>/api/auth/user/</code>
      </p>

      <div style={{ marginTop: 16 }}>
        {"id" in user && (
          <div style={row}>
            <div style={label}>ID</div>
            <div>{String((user as any).id)}</div>
          </div>
        )}

        {"email" in user && (
          <div style={row}>
            <div style={label}>Email</div>
            <div>{String((user as any).email)}</div>
          </div>
        )}

        {"username" in user && (
          <div style={row}>
            <div style={label}>Username</div>
            <div>{String((user as any).username)}</div>
          </div>
        )}

        {"first_name" in user && (
          <div style={row}>
            <div style={label}>First name</div>
            <div>{String((user as any).first_name)}</div>
          </div>
        )}

        {"last_name" in user && (
          <div style={row}>
            <div style={label}>Last name</div>
            <div>{String((user as any).last_name)}</div>
          </div>
        )}

        {"role" in user && (
          <div style={row}>
            <div style={label}>Role</div>
            <div>{String((user as any).role)}</div>
          </div>
        )}

        {"is_active" in user && (
          <div style={{ ...row, borderBottom: "none" }}>
            <div style={label}>Active</div>
            <div>{String((user as any).is_active)}</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            window.location.href = "/login";
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Log out
        </button>

        <Link to="/">Back to Home</Link>
      </div>
    </div>
    
  );
};

export default User;