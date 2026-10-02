import { Router } from "express";
import * as reportsController from "../controllers/reportsController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// All report routes require authentication (both admin + manager)
router.use(authenticateToken);

// ============================================================
// Report endpoints
// ============================================================
router.get("/sales-overview", reportsController.getSalesOverview);
router.get("/inventory-valuation", reportsController.getInventoryValuation);
router.get("/top-movers", reportsController.getTopMovers);
router.get("/reorder-priority", reportsController.getReorderPriority);
router.get("/low-stock-forecast", reportsController.getLowStockForecast);
router.get("/cashier-performance", reportsController.getCashierPerformance);

export default router;