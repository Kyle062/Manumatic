import { Router } from "express";
import * as inventoryController from "../controllers/inventoryController";
import {
  authenticateToken,
  authorizeRole
} from "../middleware/authMiddleware";
import { requireFields } from "../middleware/validateMiddleware";

const router = Router();

// All inventory routes require authentication
router.use(authenticateToken);

// ============================================================
// SPECIFIC ROUTES FIRST (before /:id)
// ============================================================

// GET /api/inventory/search
// Both admin and manager can search parts
router.get("/search", inventoryController.searchParts);

// GET /api/inventory/low-stock
// Both admin and manager can view low stock items
router.get("/low-stock", inventoryController.getLowStock);

// POST /api/inventory/adjust
// Both admin and manager can adjust stock
router.post(
  "/adjust",
  authorizeRole("admin", "manager"),
  requireFields("part_id", "type", "quantity"),
  inventoryController.adjustStock
);

// ============================================================
// GENERIC CRUD ROUTES
// ============================================================

// GET /api/inventory — both admin and manager
router.get("/", inventoryController.getAllParts);

// GET /api/inventory/:id — both admin and manager
router.get("/:id", inventoryController.getPartById);

// POST /api/inventory — both admin and manager
router.post(
  "/",
  authorizeRole("admin", "manager"),
  requireFields("part_number", "name", "category", "price"),
  inventoryController.createPart
);

// PUT /api/inventory/:id — both admin and manager
router.put(
  "/:id",
  authorizeRole("admin", "manager"),
  inventoryController.updatePart
);

// DELETE /api/inventory/:id — ADMIN ONLY
router.delete(
  "/:id",
  authorizeRole("admin"),
  inventoryController.deletePart
);

export default router;