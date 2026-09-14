import { Request, Response, NextFunction } from "express";

// ============================================================
// VALIDATE REQUIRED FIELDS IN REQUEST BODY
// ============================================================

export const requireFields = (...fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing: string[] = [];

    for (const field of fields) {
      const value = req.body[field];
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      res.status(400).json({
        message: `Missing required field(s): ${missing.join(", ")}`
      });
      return;
    }

    next();
  };
};

// ============================================================
// VALIDATE NUMERIC FIELD
// ============================================================

export const requirePositiveNumber = (field: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = Number(req.body[field]);

    if (isNaN(value) || value <= 0) {
      res.status(400).json({
        message: `${field} must be a positive number.`
      });
      return;
    }

    req.body[field] = value;
    next();
  };
};