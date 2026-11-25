import axios from "axios";
import { store } from "../store";
import { auth } from "../firebase";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://saree-shop-server-8uuv.onrender.com",
});

// Interceptor to automatically add auth token into request headers
client.interceptors.request.use(
  async (config) => {
    // 1. Check token in Redux store
    let token = store.getState().profile.token;

    // 2. Fallback to localStorage
    if (!token) {
      token = localStorage.getItem("token") || "";
    }

    // 3. Fallback to Firebase current user token if available
    if (!token && auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch (err) {
        console.warn("Could not retrieve Firebase token:", err);
      }
    }

    // Attach token to Authorization and token headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["token"] = token;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
