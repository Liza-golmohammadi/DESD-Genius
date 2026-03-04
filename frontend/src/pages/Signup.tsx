import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Role = "customer" | "producer";
const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  producer: "Producer",
};

// Common backend variants to try if validation fails
const ROLE_CANDIDATES: Record<Role, string[]> = {
  customer: ["customer", "Customer", "CUSTOMER"],
  producer: ["producer", "Producer", "PRODUCER"],
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
  tabsRow: { display: "flex", gap: 10, marginTop: 16 } as React.CSSProperties,
  tab: (active: boolean) =>
    ({
      flex: 1,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #e6e6e6",
      cursor: "pointer",
      background: active ? "#111" : "#fff",
      color: active ? "#fff" : "#111",
      fontWeight: 600,
    }) as React.CSSProperties,
  form: { display: "grid", gap: 12, marginTop: 16 } as React.CSSProperties,
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  } as React.CSSProperties,
  label: { fontSize: 13, opacity: 0.8, marginBottom: 6 } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    outline: "none",
  } as React.CSSProperties,
  errorBox: {
    background: "#ffecec",
    border: "1px solid #ffc9c9",
    padding: 12,
    borderRadius: 12,
    color: "#8a1f1f",
  } as React.CSSProperties,
  successBox: {
    background: "#ecfff2",
    border: "1px solid #bff0cf",
    padding: 12,
    borderRadius: 12,
    color: "#145a2a",
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
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
    flexWrap: "wrap",
  } as React.CSSProperties,
};

export default function Signup() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("customer");
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passwordMismatch = useMemo(() => {
    return (
      form.password.length > 0 &&
      form.confirmPassword.length > 0 &&
      form.password !== form.confirmPassword
    );
  }, [form.password, form.confirmPassword]);

  const canSubmit =
    form.email.trim() !== "" &&
    form.password.trim() !== "" &&
    !passwordMismatch &&
    !loading;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function postRegister(payload: any) {
    const res = await fetch("http://127.0.0.1:8000/api/auth/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (data as any)?.detail ||
        Object.entries(data || {})
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
          .join(" | ") ||
        `Register failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit) {
      if (passwordMismatch) setError("Passwords do not match.");
      else setError("Please fill in required fields.");
      return;
    }

    setLoading(true);

    const basePayload: any = {
      email: form.email.trim(),
      password: form.password,
      role: ROLE_CANDIDATES[role][0],
    };

    if (form.first_name.trim()) basePayload.first_name = form.first_name.trim();
    if (form.last_name.trim()) basePayload.last_name = form.last_name.trim();

    try {
      await postRegister(basePayload);
      setSuccess("Account created. Redirecting to login…");
      setTimeout(() => navigate("/login"), 800);
    } catch (err: any) {
      const message = String(err?.message || "Register failed");

      // If backend complains about role choice, try common variants automatically
      if (message.toLowerCase().includes("role") && message.toLowerCase().includes("valid choice")) {
        let lastErr: any = err;

        for (const candidate of ROLE_CANDIDATES[role]) {
          try {
            await postRegister({ ...basePayload, role: candidate });
            setSuccess("Account created. Redirecting to login…");
            setTimeout(() => navigate("/login"), 800);
            setLoading(false);
            return;
          } catch (e: any) {
            lastErr = e;
          }
        }
        setError(String(lastErr?.message || message));
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.subtitle}>
          Sign up as a <b>{ROLE_LABEL[role]}</b>. You can log in immediately after.
        </p>

        <div style={styles.tabsRow}>
          <button
            type="button"
            style={styles.tab(role === "customer")}
            onClick={() => setRole("customer")}
          >
            Customer
          </button>
          <button
            type="button"
            style={styles.tab(role === "producer")}
            onClick={() => setRole("producer")}
          >
            Producer
          </button>
        </div>

        <form onSubmit={onSubmit} style={styles.form}>
          <div>
            <div style={styles.label}>Email *</div>
            <input
              style={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="abc@example.com"
              required
            />
          </div>

          <div style={styles.grid2}>
            <div>
              <div style={styles.label}>First name</div>
              <input
                style={styles.input}
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <div style={styles.label}>Last name</div>
              <input
                style={styles.input}
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div>
              <div style={styles.label}>Password *</div>
              <input
                style={styles.input}
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <div style={styles.label}>Confirm password *</div>
              <input
                style={styles.input}
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {passwordMismatch && <div style={styles.errorBox}>Passwords do not match.</div>}

          {error && <div style={styles.errorBox}>{error}</div>}
          {success && <div style={styles.successBox}>{success}</div>}

          <button type="submit" style={styles.button(!canSubmit)} disabled={!canSubmit}>
            {loading ? "Creating account…" : "Create account"}
          </button>

          <div style={styles.footerRow}>
            <span style={{ opacity: 0.8 }}>
              Already have an account?{" "}
              <a href="/login" style={{ fontWeight: 700 }}>
                Login
              </a>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}