import { useEffect, useState } from "react";
import api from "../api";

type UserRecord = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
};

const roleBadge = (role: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; fg: string }> = {
    admin:    { bg: "#fce4ec", fg: "#b71c1c" },
    producer: { bg: "#e8f5e9", fg: "#2e7d32" },
    customer: { bg: "#e3f2fd", fg: "#1565c0" },
  };
  const c = colors[role] || { bg: "#f5f5f5", fg: "#333" };
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 6,
    fontSize: "0.8rem",
    fontWeight: 700,
    background: c.bg,
    color: c.fg,
    textTransform: "capitalize",
  };
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = roleFilter ? `?role=${roleFilter}` : "";
    api
      .get<UserRecord[]>(`/api/admin/users/${params}`)
      .then((res) => setUsers(res.data))
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [roleFilter]);

  if (loading)
    return <p style={{ padding: 20, opacity: 0.6 }}>Loading users…</p>;
  if (error) return <p style={{ padding: 20, color: "#b71c1c" }}>{error}</p>;

  return (
    <div>
      {/* Filter row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["", "customer", "producer", "admin"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: roleFilter === r ? "2px solid #1f4d3a" : "1px solid #ddd",
              background: roleFilter === r ? "#e8f5e9" : "#fff",
              fontWeight: roleFilter === r ? 700 : 400,
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            {r === "" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1) + "s"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.9rem",
          }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              <th style={{ padding: "10px 12px" }}>Name</th>
              <th style={{ padding: "10px 12px" }}>Email</th>
              <th style={{ padding: "10px 12px" }}>Role</th>
              <th style={{ padding: "10px 12px" }}>Active</th>
              <th style={{ padding: "10px 12px" }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                <td style={{ padding: "10px 12px" }}>
                  {u.first_name} {u.last_name}
                </td>
                <td style={{ padding: "10px 12px" }}>{u.email}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={roleBadge(u.role)}>{u.role}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {u.is_active ? "Yes" : "No"}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {new Date(u.date_joined).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: "0.82rem", opacity: 0.5 }}>
        Showing {users.length} user{users.length !== 1 && "s"}
      </p>
    </div>
  );
}