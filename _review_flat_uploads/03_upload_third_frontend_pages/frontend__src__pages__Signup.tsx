import { useState } from "react";
import { Navigate, Link } from "react-router";
import axios from "axios";
import useAuth from "../context/useAuth";

interface SignupFormData {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  accepted_terms: boolean;
  customer_role: string;
  postcode: string;
  store_name: string;
  store_description: string;
  store_contact: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.9rem 1rem",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
};


const Signup = () => {
  const { user, registerCustomer, registerProducer } = useAuth();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isProducer, setIsProducer] = useState<boolean>(false);

  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    accepted_terms: false,
    customer_role: "individual",
    postcode: "",
    store_name: "",
    store_description: "",
    store_contact: "",
  });

  if (user) return <Navigate to="/" replace />;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (isProducer) {
        await registerProducer({
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          accepted_terms: formData.accepted_terms,
          store_name: formData.store_name,
          store_description: formData.store_description,
          store_contact: formData.store_contact,
        });
      } else {
        await registerCustomer({
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          accepted_terms: formData.accepted_terms,
          customer_role: formData.customer_role,
          postcode: formData.postcode,
        });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, string[]> | undefined;
        if (data) {
          const messages = Object.entries(data)
            .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
            .join("\n");
          setError(messages);
        } else {
          setError("Registration failed");
        }
      } else {
        setError((err as Error).message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
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
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "2rem", color: "#1f4d3a" }}>
            Create Account
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              marginBottom: 0,
              color: "#4b5563",
              lineHeight: "1.6",
            }}
          >
            Sign up as a customer or producer to join the Bristol Regional Food
            Network platform.
          </p>
        </div>

        {/* Customer / Producer Toggle */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => setIsProducer(false)}
            style={{
              padding: "0.9rem",
              borderRadius: "10px",
              border: !isProducer ? "2px solid #1f4d3a" : "1px solid #d1d5db",
              backgroundColor: !isProducer ? "#e8f3ee" : "#ffffff",
              color: "#1f4d3a",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setIsProducer(true)}
            style={{
              padding: "0.9rem",
              borderRadius: "10px",
              border: isProducer ? "2px solid #1f4d3a" : "1px solid #d1d5db",
              backgroundColor: isProducer ? "#e8f3ee" : "#ffffff",
              color: "#1f4d3a",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Producer
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>

          {/* Email */}
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email address"
            required
            style={inputStyle}
          />

          {/* First / Last name */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <input
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First name"
              style={inputStyle}
            />
            <input
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last name"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password (min 4 characters)"
            required
            minLength={4}
            style={inputStyle}
          />
          <input
            name="confirm_password"
            type="password"
            value={formData.confirm_password}
            onChange={handleChange}
            placeholder="Confirm password"
            required
            style={inputStyle}
          />

          {/* Customer fields */}
          {!isProducer && (
            <input
              name="postcode"
              type="text"
              value={formData.postcode}
              onChange={handleChange}
              placeholder="Postcode (e.g. BS1 4DJ)"
              style={inputStyle}
            />
          )}

          {!isProducer && (
            <select
              name="customer_role"
              value={formData.customer_role}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="individual">Individual</option>
              <option value="community_group">Community Group</option>
              <option value="restaurant">Restaurant</option>
            </select>
          )}

          {/* Producer fields */}
          {isProducer && (
            <>
              <input
                name="store_name"
                type="text"
                value={formData.store_name}
                onChange={handleChange}
                placeholder="Store name"
                required
                style={inputStyle}
              />
              <textarea
                name="store_description"
                value={formData.store_description}
                onChange={handleChange}
                placeholder="Store description — tell customers what makes your store unique."
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <input
                name="store_contact"
                type="text"
                value={formData.store_contact}
                onChange={handleChange}
                placeholder="Store contact (phone or email)"
                style={inputStyle}
              />
            </>
          )}

          {/* Terms */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
              color: "#4b5563",
              cursor: "pointer",
            }}
          >
            <input
              name="accepted_terms"
              type="checkbox"
              checked={formData.accepted_terms}
              onChange={handleChange}
              required
            />
            I agree to the Terms and Conditions
          </label>

          {/* Error */}
          {error && (
            <p
              style={{
                margin: 0,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "0.9rem",
                whiteSpace: "pre-line",
              }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.5rem",
              padding: "1rem",
              borderRadius: "10px",
              border: "none",
              backgroundColor: loading ? "#4b7a65" : "#1f4d3a",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        {/* Login link */}
        <p
          style={{
            marginTop: "1.25rem",
            marginBottom: 0,
            textAlign: "center",
            color: "#4b5563",
            fontSize: "0.9rem",
          }}
        >
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#1f4d3a", fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
