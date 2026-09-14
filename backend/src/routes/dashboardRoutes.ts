import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// ============================================================
// GET /api/dashboard/stats
// ============================================================
router.get("/stats", dashboardController.getStats);

// ============================================================
// GET /api/dashboard/transactions
// ============================================================
router.get("/transactions", dashboardController.getTransactions);

// ============================================================
// GET /api/dashboard/logs
// ============================================================
router.get("/logs", dashboardController.getLogs);

// ============================================================
// GET /api/dashboard/top-selling
// ============================================================
router.get("/top-selling", dashboardController.getTopSelling);

// ============================================================
// GET /api/dashboard/sales-trend
// ============================================================
router.get("/sales-trend", dashboardController.getSalesTrend);

// ============================================================
// GET /api/dashboard/low-stock
// ============================================================
router.get("/low-stock", dashboardController.getLowStock);

export default router;