import { Router } from "express";
import * as userController from "../controllers/userController";
import {
  authenticateToken,
  authorizeRole
} from "../middleware/authMiddleware";

const router = Router();

// All user routes require authentication AND admin role
router.use(authenticateToken);
router.use(authorizeRole("admin"));

router.get("/", userController.listUsers);
router.post("/", userController.createUser);
router.put("/:id/password", userController.resetPassword);
router.put("/:id/active", userController.toggleActive);

export default router;