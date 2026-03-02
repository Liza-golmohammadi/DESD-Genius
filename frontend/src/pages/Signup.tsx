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
    e.preventDefault();
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
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
  return (
    <div>
      <button type="button" onClick={() => setUserType("customer")}>
        Customer
      </button>
      <button type="button" onClick={() => setUserType("producer")}>
        Producer
      </button>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="abc@example.com"
        />
        <input
          name="first_name"
          type="text"
          value={formData.first_name}
          onChange={handleChange}
          placeholder="First Name"
        />
        <input
          name="last_name"
          type="text"
          value={formData.last_name}
          onChange={handleChange}
          placeholder="Last Name"
        />
        <input
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
        />
        <input
          name="confirm_password"
          type="password"
          value={formData.confirm_password}
          onChange={handleChange}
        />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default Signup;
