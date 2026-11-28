import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { env } from "./config/env";
import { testConnection } from "./config/database";
import { notFoundHandler, errorHandler } from "./middleware/errorMiddleware";

import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import userRoutes from "./routes/userRoutes";
import reportRoutes from "./routes/reportRoutes";
import messageRoutes from "./routes/messageRoutes";
import { initializeMessageTable } from "./models/messageModel";
// Load env vars
dotenv.config();

const app = express();

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(","),
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger (development only)
if (env.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    service: "MANUMATIK API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// ROUTES
// ============================================================
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/messages", messageRoutes);
// ============================================================
// ERROR HANDLERS (must be last)
// ============================================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
const startServer = async (): Promise<void> => {
  try {
    // Test DB connection first
    await testConnection();

    // Chat table is created on boot so no manual migration is needed.
    try {
      await initializeMessageTable();
    } catch (error) {
      console.warn("⚠️  Could not initialize messages table:", error);
    }

    app.listen(env.PORT, () => {
      console.log("");
      console.log("╔═══════════════════════════════════════════════════╗");
      console.log("║                                                   ║");
      console.log("║          MANUMATIK API SERVER STARTED             ║");
      console.log("║                                                   ║");
      console.log("╠═══════════════════════════════════════════════════╣");
      console.log(`║  🚀  http://localhost:${env.PORT}                      ║`);
      console.log(`║  🌱  Env:   ${env.NODE_ENV.padEnd(35)}║`);
      console.log(`║  📦  DB:    ${env.DB_NAME.padEnd(35)}║`);
      console.log(`║  🌐  CORS:  ${env.CORS_ORIGIN.padEnd(35)}║`);
      console.log("╚═══════════════════════════════════════════════════╝");
      console.log("");
      console.log("Available routes:");
      console.log("  GET    /api/health");
      console.log("  POST   /api/auth/login");
      console.log("  GET    /api/auth/me");
      console.log("  GET    /api/dashboard/stats");
      console.log("  GET    /api/dashboard/transactions");
      console.log("  GET    /api/dashboard/logs");
      console.log("  GET    /api/dashboard/top-selling");
      console.log("  GET    /api/dashboard/sales-trend");
      console.log("  GET    /api/dashboard/low-stock");
      console.log("  GET    /api/inventory");
      console.log("  GET    /api/inventory/search");
      console.log("  GET    /api/inventory/low-stock");
      console.log("  GET    /api/inventory/:id");
      console.log("  POST   /api/inventory");
      console.log("  PUT    /api/inventory/:id");
      console.log("  DELETE /api/inventory/:id");
      console.log("  GET    /api/messages/contacts");
      console.log("  GET    /api/messages?with=<user_id>");
      console.log("  POST   /api/messages");
      console.log("  PATCH  /api/messages/:id/read");
      console.log("");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();