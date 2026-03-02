import { useState } from "react";

import axios from "axios";
import useAuth from "../context/useAuth";
import { NavLink } from "react-router";

type LoginFormData = {
  email: string;
  password: string;
};

const Login = () => {
  const { loginUser } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

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

    try {
      await loginUser({ email: formData.email, password: formData.password });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        alert(JSON.stringify(data));
      } else {
        alert("Login failed");
      }
    }
  };
  return (
    <div>
      <form onSubmit={handleSubmit}>
      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="abc@example.com"
      />
      <input
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
      />
      <button type="submit">Log In</button>
    </form>
    <NavLink to="/signup">Sign Up</NavLink>
    </div>
  );
};

export default Login;
