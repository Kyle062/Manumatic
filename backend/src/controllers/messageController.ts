import { Response, NextFunction } from "express";
import * as messageService from "../services/messageService";
import { AuthRequest } from "../types";

// ============================================================
// GET /api/messages/contacts
// ============================================================

export const listContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }
    const contacts = await messageService.getContacts(req.user.user_id);
    res.json(contacts);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/messages?with=<user_id>
// ============================================================

export const listConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }
    const messages = await messageService.getConversation(
      req.user.user_id,
      req.query.with,
    );
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/messages
// ============================================================

export const createMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }
    const message = await messageService.sendMessage(req.user.user_id, req.body);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PATCH /api/messages/:id/read
// ============================================================

export const markRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }
    const result = await messageService.markRead(
      req.user.user_id,
      req.params.id,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};
