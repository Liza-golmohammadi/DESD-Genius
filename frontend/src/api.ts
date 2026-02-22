import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000", //import.meta.env.VITE_API_URL
});

//interceptors
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem("refresh");
      if (!refresh) {
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(
          "http://127.0.0.1:8000/api/token/refresh/",
          { refresh },
        );
        localStorage.setItem("access", res.data.access);
        error.config.headers.Authorization = `Bearer ${res.data.access}`;

        return axios(error.config);
      } catch {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");

        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
