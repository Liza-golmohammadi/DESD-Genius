import { useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import api from "../api";

type LoginFormData = {
  email: string;
  password: string;
};

type LoginResponse = {
  access: string;
  response: string;
};

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await api.post<LoginResponse>("/api/auth/login/", {
        email: formData.email,
        password: formData.password,
      });

	  localStorage.setItem("access", res.data.access);
	  localStorage.setItem("refresh", res.data.response);
	  alert("Successful")
	  navigate("/")
      
    } catch (err) {
      if (axios.isAxiosError(err)) {
			const data = err.response?.data;
			alert(JSON.stringify(data))
		} else {
			alert("Login failed")
		}
    }
  };
  return (
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
  );
};

export default Login;
