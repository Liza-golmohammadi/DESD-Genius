import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import useAuth from "../context/useAuth";

type LoginFormData = {
  email: string;
  password: string;
};

const styles = {
  page: {
    minHeight: "calc(100vh - 120px)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "32px 16px",
  } as React.CSSProperties,
  card: {
    width: "100%",
    maxWidth: 520,
    border: "1px solid #eaeaea",
    borderRadius: 14,
    background: "#fff",
    padding: 22,
    boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
  } as React.CSSProperties,
  title: { margin: 0, fontSize: 24 } as React.CSSProperties,
  subtitle: { margin: "8px 0 0", opacity: 0.75 } as React.CSSProperties,
  form: { display: "grid", gap: 12, marginTop: 16 } as React.CSSProperties,
  label: { fontSize: 13, opacity: 0.8, marginBottom: 6 } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    outline: "none",
  } as React.CSSProperties,
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  } as React.CSSProperties,
  smallLink: { fontSize: 13, fontWeight: 700 } as React.CSSProperties,
  errorBox: {
    background: "#ffecec",
    border: "1px solid #ffc9c9",
    padding: 12,
    borderRadius: 12,
    color: "#8a1f1f",
  } as React.CSSProperties,
  button: (disabled: boolean) =>
    ({
      padding: "12px 14px",
      borderRadius: 12,
      border: "none",
      background: disabled ? "#777" : "#111",
      color: "#fff",
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
    }) as React.CSSProperties,
  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  } as React.CSSProperties,
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
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

      // If redirected here from a protected route, go back there
      const from = (location.state as any)?.from?.pathname as string | undefined;
      navigate(from || "/user", { replace: true });
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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Log in to continue.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <div style={styles.label}>Email</div>
            <input
              style={styles.input}
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
            <div style={styles.row}>
              <div style={styles.label}>Password</div>
              <button
                type="button"
                style={styles.ghostBtn}
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            <input
              style={styles.input}
              name="password"
              type={showPw ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button
            type="submit"
            style={styles.button(!canSubmit)}
            disabled={!canSubmit}
          >
            {loading ? "Logging in…" : "Log in"}
          </button>

          <div style={styles.row}>
            <span style={{ opacity: 0.8 }}>
              No account?{" "}
              <a href="/signup" style={styles.smallLink}>
                Sign up
              </a>
            </span>

            <a href="/" style={styles.smallLink}>
              Back to Home
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}