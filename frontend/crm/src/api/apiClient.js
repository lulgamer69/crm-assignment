import axios from "axios";
import { clearAuthToken, getAuthToken } from "./authStorage";

// Keep API calls on one client so protected requests share the same token logic.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://crm-assignment-j0bd.onrender.com/api",
});

API.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestPath = error.config?.url?.split("?")[0] || "";
    const isProtectedRequest =
      /(?:^|\/)leads(?:\/|$)/.test(requestPath) ||
      /(?:^|\/)notifications(?:\/|$)/.test(requestPath) ||
      /(?:^|\/)auth\/me(?:\/|$)/.test(requestPath);
    const isUnauthorized = error.response?.status === 401;

    if (isProtectedRequest && isUnauthorized && getAuthToken()) {
      // The auth store notifies route guards, which handle the SPA redirect once.
      clearAuthToken();
    }

    return Promise.reject(error);
  }
);

export default API;
