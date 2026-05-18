import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  // ✅ Removed withCredentials: true — not needed for JWT header auth.
  // It's only for cookie-based sessions and causes strict CORS preflight
  // failures when the backend throws any error before headers are set.
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;