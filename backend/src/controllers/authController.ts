import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";
import { AuthRequest, LoginBody } from "../types";

// ============================================================
// POST /api/auth/login
// ============================================================

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, password } = req.body as LoginBody;

    const result = await authService.login(username, password);

    res.json({
      message: "Login successful",
      token: result.token,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/auth/me
// ============================================================

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const user = await authService.getCurrentUser(req.user.user_id);

    res.json(user);
  } catch (error) {
    next(error);
  }
};