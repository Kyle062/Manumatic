import axios from "axios";
import { User, Part, Sale, DashboardStats, LoginResponse } from "../types";

// ============================================================
// CONFIGURATION
// ============================================================

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// REQUEST INTERCEPTOR — Attach JWT token to every request
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================================
// RESPONSE INTERCEPTOR — Log errors but DON'T auto-logout
// ============================================================
//
// NOTE: We removed the aggressive auto-logout.
// If the backend returns 401/403, we log it to console so you
// can debug, but we DO NOT force a redirect. Individual pages
// (like RequireAuth) handle redirect logic safely.
//
// ============================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    if (status === 401 || status === 403) {
      console.warn(
        `⚠️ Auth error on ${url} (${status}):`,
        error.response?.data?.message || "No message",
      );
    }

    return Promise.reject(error);
  },
);

// Simulated delay (used only in mock mode)
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// AUTH
// ============================================================

export const loginUser = async (
  username: string,
  password: string,
): Promise<{ data: LoginResponse }> => {
  if (USE_MOCK) {
    await delay(500);

    const credentials = [
      { username: "admin", password: "admin123" },
      { username: "manager", password: "manager123" },
    ];

    const valid = credentials.find(
      (c) => c.username === username && c.password === password,
    );

    if (!valid) {
      throw {
        response: { data: { message: "Invalid username or password." } },
      };
    }

    const user: User =
      username === "admin"
        ? {
            user_id: 1,
            username: "admin",
            role: "admin",
            name: "System Admin",
            email: "admin@manumatik.com",
          }
        : {
            user_id: 2,
            username: "manager",
            role: "manager",
            name: "Store Manager",
            email: "manager@manumatik.com",
          };

    return {
      data: {
        message: "Login successful",
        token: `mock-token-${Date.now()}`,
        user,
      },
    };
  }

  // Real backend call
  return api.post("/auth/login", { username, password });
};

export const getCurrentUser = async () => {
  if (USE_MOCK) {
    await delay(200);
    const stored = localStorage.getItem("user");
    if (!stored) {
      throw { response: { data: { message: "Not authenticated." } } };
    }
    return { data: JSON.parse(stored) };
  }

  return api.get("/auth/me");
};

// ============================================================
// DASHBOARD
// ============================================================

export const getDashboardStats = async (): Promise<{
  data: DashboardStats;
}> => {
  if (USE_MOCK) {
    await delay(300);
    return {
      data: {
        todaySales: { total_sales: 4388.0, transaction_count: 1 },
        totalTransactions: 6,
        lowStockItems: 4,
        partsInCatalog: 12,
        unitsOnHand: 342,
      },
    };
  }

  return api.get("/dashboard/stats");
};

export const getDashboardTransactions = async (limit = 10) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return api.get(`/dashboard/transactions?limit=${limit}`);
};

export const getActivityLogs = async (limit = 8) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return api.get(`/dashboard/logs?limit=${limit}`);
};

export const getTopSelling = async (limit = 5) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return api.get(`/dashboard/top-selling?limit=${limit}`);
};

export const getSalesTrend = async () => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return api.get("/dashboard/sales-trend");
};

// ============================================================
// INVENTORY
// ============================================================

export const getAllParts = async (): Promise<{ data: Part[] }> => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return api.get("/inventory");
};

export const getPartById = async (id: number): Promise<{ data: Part }> => {
  if (USE_MOCK) {
    await delay(300);
    throw { response: { data: { message: "Mock mode: use real backend." } } };
  }

  return api.get(`/inventory/${id}`);
};

export const createPart = async (partData: any) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: use real backend.", part_id: 0 } };
  }

  return api.post("/inventory", partData);
};

export const updatePart = async (id: number, partData: any) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: use real backend." } };
  }

  return api.put(`/inventory/${id}`, partData);
};

export const deletePart = async (id: number) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: use real backend." } };
  }

  return api.delete(`/inventory/${id}`);
};

export const searchParts = async (q?: string, category?: string) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (category && category !== "all") params.append("category", category);

  const queryString = params.toString();
  return api.get(`/inventory/search${queryString ? "?" + queryString : ""}`);
};

export const getLowStockParts = async () => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return api.get("/inventory/low-stock");
};

// ============================================================
// SALES (for future POS module)
// ============================================================

export const getAllSales = async () => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return api.get("/sales");
};

export const createSale = async (saleData: any) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: use real backend.", sale: null } };
  }

  return api.post("/sales", saleData);
};
