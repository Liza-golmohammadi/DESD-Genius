import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const baseURL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL,
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = localStorage.getItem("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // If no response or not 401, just reject
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Avoid infinite loops
    if (originalRequest?._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // If refresh already in progress, wait
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) return reject(error);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    // Do refresh
    isRefreshing = true;
    try {
      const refreshRes = await axios.post(
        `${baseURL}/api/token/refresh/`,
        { refresh },
        { headers: { "Content-Type": "application/json" } }
      );

      const newAccess = (refreshRes.data as any)?.access;
      if (!newAccess) throw new Error("No access token returned from refresh");

      localStorage.setItem("access", newAccess);
      flushQueue(newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (e) {
      flushQueue(null);
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      window.location.href = "/login";
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;