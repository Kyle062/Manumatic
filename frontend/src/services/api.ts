import axios from "axios";
import { User, Part, DashboardStats, LoginResponse } from "../types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
// Relative URLs keep requests on the Vite origin, which proxies to Node/Python.
const API_URL = import.meta.env.VITE_API_URL || "/api";
export const PYTHON_API_URL =
  import.meta.env.VITE_PYTHON_API_URL || "/python-api";

// Standard Node.js API (Auth, Inventory, Sales)
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Read-only analytics come from the Python service so .py edits show up live.
const pythonApi = axios.create({
  baseURL: PYTHON_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to API requests
const attachToken = (config: any) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(attachToken, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    if (status === 401 || status === 403) {
      console.warn(
        `Auth error on ${url} (${status}):`,
        error.response?.data?.message || "No message",
      );
    }

    return Promise.reject(error);
  },
);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const loginUser = async (
  username: string,
  password: string,
  role: "admin" | "manager",
): Promise<{ data: LoginResponse }> => {
  if (USE_MOCK) {
    await delay(500);

    const credentials = [
      { username: "admin", password: "admin123", role: "admin" },
      { username: "manager", password: "manager123", role: "manager" },
    ];

    const valid = credentials.find(
      (c) =>
        c.username === username && c.password === password && c.role === role,
    );

    if (!valid) {
      throw {
        response: {
          data: { message: "Invalid credentials or wrong role selected." },
        },
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

  return api.post("/auth/login", { username, password, role });
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

  return pythonApi.get("/dashboard/stats");
};

export const getDashboardTransactions = async (limit = 10) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return pythonApi.get(`/dashboard/transactions?limit=${limit}`);
};

export const getActivityLogs = async (limit = 8) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return pythonApi.get(`/dashboard/logs?limit=${limit}`);
};

export const getTopSelling = async (limit = 5, range = "week") => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }
  return pythonApi.get(`/dashboard/top-selling?limit=${limit}&range=${range}`);
};

export const getSalesTrend = async () => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }

  return pythonApi.get("/dashboard/sales-trend");
};

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

  return pythonApi.get("/dashboard/low-stock");
};

export const adjustStock = async (data: {
  part_id: number;
  type: "in" | "out";
  quantity: number;
  reason?: string;
  notes?: string;
}) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: use real backend." } };
  }

  return api.post("/inventory/adjust", data);
};

export const receiveStock = async (data: {
  part_id: number;
  quantity: number;
  cost_per_unit: number;
  markup_percent: number;
  manual_price?: number;
  supplier?: string;
}) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: use real backend." } };
  }

  return api.post("/inventory/receive", data);
};

export const listUsers = async () => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }
  return api.get("/users");
};

export const createUser = async (data: {
  username: string;
  password: string;
  role: "admin" | "manager";
  name: string;
  email: string;
}) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: use real backend." } };
  }
  return api.post("/users", data);
};

export const resetUserPassword = async (
  id: number,
  adminPassword: string,
  newPassword: string,
) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: use real backend." } };
  }

  return api.put(`/users/${id}/password`, {
    admin_password: adminPassword,
    new_password: newPassword,
  });
};

export const toggleUserActive = async (id: number, is_active: boolean) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: use real backend." } };
  }

  return api.put(`/users/${id}/active`, { is_active });
};

export const checkout = async (data: {
  items: Array<{ part_id: number; quantity: number }>;
  payment_type: string;
}) => {
  if (USE_MOCK) {
    await delay(500);
    return {
      data: {
        message: "Mock mode: use real backend.",
        receipt_no: "RCP-MOCK-" + Date.now(),
        total: 0,
        item_count: 0,
      },
    };
  }

  return api.post("/inventory/checkout", data);
};

// ============================================================
// REPORTS
// These read from the Python API so .py edits show up on the page.
// ============================================================

export const getSalesOverview = async (range: string = "today") => {
  if (USE_MOCK) {
    await delay(300);
    return { data: {} };
  }
  return pythonApi.get(`/reports/sales-overview?range=${range}`);
};

export const getInventoryValuation = async (range: string = "today") => {
  if (USE_MOCK) {
    await delay(300);
    return { data: {} };
  }
  return pythonApi.get(`/reports/inventory-valuation?range=${range}`);
};

export const getTopMovers = async (
  limit: number = 5,
  range: string = "all",
) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { top: [], slow: [] } };
  }
  return pythonApi.get(
    `/reports/top-movers?limit=${limit}&range=${range}`,
  );
};

export const getReorderPriority = async (
  limit: number = 5,
  range: string = "month",
) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }
  return pythonApi.get(
    `/reports/reorder-priority?limit=${limit}&range=${range}`,
  );
};

export const getLowStockForecast = async (range: string = "month") => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }
  return pythonApi.get(`/reports/low-stock-forecast?range=${range}`);
};

export const getCashierPerformance = async (range: string = "all") => {
  if (USE_MOCK) {
    await delay(300);
    return { data: [] };
  }
  return pythonApi.get(`/reports/cashier-performance?range=${range}`);
};

// ============================================================
// MESSAGES
// Auth-backed chat between the admin and manager accounts.
// ============================================================

export const getMessageContacts = async () => {
  if (USE_MOCK) {
    await delay(200);
    return { data: [] };
  }
  return api.get("/messages/contacts");
};

export const getMessages = async (withUserId: number) => {
  if (USE_MOCK) {
    await delay(200);
    return { data: [] };
  }
  return api.get(`/messages?with=${withUserId}`);
};

export const sendMessage = async (data: {
  to_user_id: number;
  body: string;
  due_at?: string | null;
}) => {
  if (USE_MOCK) {
    await delay(300);
    return { data: { message: "Mock mode: message not sent." } };
  }
  return api.post("/messages", data);
};

export const markMessageRead = async (messageId: number) => {
  if (USE_MOCK) {
    await delay(200);
    return { data: {} };
  }
  return api.patch(`/messages/${messageId}/read`);
};
