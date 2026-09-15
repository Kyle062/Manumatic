import { Response, NextFunction } from "express";
import * as userService from "../services/userService";
import { AuthRequest } from "../types";

// ============================================================
// GET /api/users
// ============================================================

export const listUsers = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/users
// ============================================================

export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await userService.createUser(req.body);
    res.status(201).json({
      message: "User created successfully.",
      user_id: result.user_id,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PUT /api/users/:id/password
// ============================================================

export const resetPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid user ID." });
      return;
    }

    await userService.resetPassword(id, req.body.password);
    res.json({ message: "Password reset successfully." });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PUT /api/users/:id/active
// ============================================================

export const toggleActive = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid user ID." });
      return;
    }

    await userService.toggleActive(id, Boolean(req.body.is_active));
    res.json({ message: "User status updated." });
  } catch (error) {
    next(error);
  }
};
