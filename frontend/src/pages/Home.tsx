import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";

const styles = {
  wrap: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "24px 0",
  } as React.CSSProperties,
  card: {
    border: "1px solid #eaeaea",
    borderRadius: 14,
    padding: 20,
    background: "#fff",
    boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
  } as React.CSSProperties,
  title: { margin: 0, fontSize: 22 } as React.CSSProperties,
  subtitle: { margin: "8px 0 0", opacity: 0.75 } as React.CSSProperties,
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  } as React.CSSProperties,
  action: {
    display: "inline-block",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    textDecoration: "none",
    fontWeight: 700,
  } as React.CSSProperties,
};

export default function Home() {
  const { user } = useAuth();
  const isAuthed = !!localStorage.getItem("access") || !!user;

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Home</h1>
        <p style={styles.subtitle}>
          This is the landing page. Use the navigation above to access features.
        </p>

        <div style={styles.actions}>
          {isAuthed ? (
            <>
              <Link to="/user" style={styles.action}>
                Your Account
              </Link>
              <Link to="/logout" style={styles.action}>
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.action}>
                Login
              </Link>
              <Link to="/signup" style={styles.action}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}