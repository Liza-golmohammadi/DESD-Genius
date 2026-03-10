import { useMemo, useState } from "react";
import { Link } from "react-router";
import axios from "axios";
import useAuth from "../context/useAuth";

type LoginFormData = {
  email: string;
  password: string;
};

export default function Login() {
  const { loginUser } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      formData.email.trim().length > 0 &&
      formData.password.trim().length > 0 &&
      !loading
    );
  }, [formData.email, formData.password, loading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        const msg =
          (data && (data.detail || data.message)) ||
          (data && typeof data === "object"
            ? Object.entries(data)
                .map(([k, v]) =>
                  `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`
                )
                .join(" | ")
            : null) ||
          `Login failed (${err.response?.status ?? "unknown"})`;

        setError(msg);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.95rem 1rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7f4",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem 1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "2rem",
              color: "#1f4d3a",
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              marginBottom: 0,
              color: "#4b5563",
              lineHeight: "1.6",
            }}
          >
            Log in to continue to your account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "0.45rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Email
            </label>
            <input
              id="email"
              style={inputStyle}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="abc@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.45rem",
                gap: "1rem",
              }}
            >
              <label
                htmlFor="password"
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Password
              </label>

              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#1f4d3a",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            <input
              id="password"
              style={inputStyle}
              name="password"
              type={showPw ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "0.9rem 1rem",
                borderRadius: "10px",
                fontSize: "0.95rem",
                lineHeight: "1.5",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              marginTop: "0.5rem",
              padding: "1rem",
              borderRadius: "10px",
              border: "none",
              backgroundColor: canSubmit ? "#1f4d3a" : "#9ca3af",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginTop: "0.5rem",
            }}
          >
            <span style={{ color: "#4b5563" }}>
              No account?{" "}
              <Link
                to="/signup"
                style={{
                  color: "#1f4d3a",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Sign up
              </Link>
            </span>

            <Link
              to="/"
              style={{
                color: "#1f4d3a",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Back to Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}