import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import axios from "axios";
import useAuth from "../context/useAuth";

type UserType = "customer" | "producer";

type SignupFormData = {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
};

const Signup = () => {
  const [searchParams] = useSearchParams();
  const { registerUser } = useAuth();

  const [userType, setUserType] = useState<UserType>("customer");
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const type = searchParams.get("type");
    setUserType(type === "producer" ? "producer" : "customer");
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      alert("Passwords do not match");
      return;
    }

    try {
      await registerUser({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        role: userType,
      });

      alert("Signup successful");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        alert(JSON.stringify(data));
      } else {
        alert("Something went wrong");
      }
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.9rem 1rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
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
            onClick={() => setUserType("customer")}
            style={{
              padding: "0.9rem",
              borderRadius: "10px",
              border:
                userType === "customer"
                  ? "2px solid #1f4d3a"
                  : "1px solid #d1d5db",
              backgroundColor: userType === "customer" ? "#e8f3ee" : "#ffffff",
              color: "#1f4d3a",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Customer
          </button>

          <button
            type="button"
            onClick={() => setUserType("producer")}
            style={{
              padding: "0.9rem",
              borderRadius: "10px",
              border:
                userType === "producer"
                  ? "2px solid #1f4d3a"
                  : "1px solid #d1d5db",
              backgroundColor: userType === "producer" ? "#e8f3ee" : "#ffffff",
              color: "#1f4d3a",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Producer
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email address"
            style={inputStyle}
          />

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

          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            style={inputStyle}
          />

          <input
            name="confirm_password"
            type="password"
            value={formData.confirm_password}
            onChange={handleChange}
            placeholder="Confirm password"
            style={inputStyle}
          />

          <button
            type="submit"
            style={{
              marginTop: "0.5rem",
              padding: "1rem",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#1f4d3a",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;