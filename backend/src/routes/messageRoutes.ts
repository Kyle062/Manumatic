import { Router } from "express";
import * as messageController from "../controllers/messageController";
import {
  authenticateToken,
  authorizeRole,
} from "../middleware/authMiddleware";

const router = Router();

// Admin and manager only; every request carries the JWT.
router.use(authenticateToken);
router.use(authorizeRole("admin", "manager"));

router.get("/contacts", messageController.listContacts);
router.get("/", messageController.listConversation);
router.post("/", messageController.createMessage);
router.patch("/:id/read", messageController.markRead);

export default router;
