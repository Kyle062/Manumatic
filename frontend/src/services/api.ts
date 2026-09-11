import axios from "axios";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// AUTH
// ============================================================
export const loginUser = async (username: string, password: string) => {
  if (USE_MOCK) {
    await delay(500);

    const credentials = [
      { username: "admin", password: "admin123" },
      { username: "manager", password: "manager123" }
    ];

    const valid = credentials.find(
      (c) => c.username === username && c.password === password
    );

    if (!valid) {
      throw {
        response: {
          data: { message: "Invalid username or password." }
        }
      };
    }

    const user =
      username === "admin"
        ? {
            user_id: 1,
            username: "admin",
            role: "admin" as const,
            name: "System Admin",
            email: "admin@manumatik.com"
          }
        : {
            user_id: 2,
            username: "manager",
            role: "manager" as const,
            name: "Store Manager",
            email: "manager@manumatik.com"
          };

    return {
      data: {
        message: "Login successful",
        token: `mock-token-${user.user_id}-${Date.now()}`,
        user
      }
    };
  }

  return api.post("/auth/login", { username, password });
};