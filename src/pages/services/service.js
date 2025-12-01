import axios from "axios";

// ✅ Base API URL
export const BASE_URL = "https://demo-softwarebackend.onrender.com/";
// export const BASE_URL = "http://127.0.0.1:8000/";
// export const BASE_URL = "http://65.0.105.47/";

// ✅ Create an axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Token setup interceptor (adds token automatically if exists)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Auth Endpoints
export const authService = {
  login: (username, password) =>
    api.post("/api/token/", { username, password }),

  getProfile: () => api.get("/api/profile/"),
};


export default api;
