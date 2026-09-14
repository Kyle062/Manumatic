import { Router } from "express";
import * as authController from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireFields } from "../middleware/validateMiddleware";

const router = Router();

// ============================================================
// POST /api/auth/login
// ============================================================
router.post(
  "/login",
  requireFields("username", "password"),
  authController.login
);

// ============================================================
// GET /api/auth/me
// ============================================================
router.get("/me", authenticateToken, authController.getMe);

export default router;