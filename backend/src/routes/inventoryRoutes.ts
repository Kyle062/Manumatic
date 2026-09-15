import { Router } from "express";
import * as inventoryController from "../controllers/inventoryController";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
import { requireFields } from "../middleware/validateMiddleware";

const router = Router();

// All inventory routes require authentication
router.use(authenticateToken);


// GET /api/inventory/search?q=&category=
router.get("/search", inventoryController.searchParts);

// GET /api/inventory/low-stock
router.get("/low-stock", inventoryController.getLowStock);

// POST /api/inventory/adjust  (Admin + Manager)
router.post(
  "/adjust",
  authorizeRole("admin", "manager"),
  requireFields("part_id", "type", "quantity"),
  inventoryController.adjustStock,
);

// ============================================================
// GENERIC CRUD ROUTES
// ============================================================

// GET /api/inventory
router.get("/", inventoryController.getAllParts);

// GET /api/inventory/:id
router.get("/:id", inventoryController.getPartById);

// POST /api/inventory  (Admin + Manager)
router.post(
  "/",
  authorizeRole("admin", "manager"),
  requireFields("part_number", "name", "category", "price"),
  inventoryController.createPart,
);

// PUT /api/inventory/:id  (Admin + Manager)
router.put(
  "/:id",
  authorizeRole("admin", "manager"),
  inventoryController.updatePart,
);

// DELETE /api/inventory/:id  (Admin only)
router.delete("/:id", authorizeRole("admin"), inventoryController.deletePart);

export default router;
