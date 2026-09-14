import { Request, Response, NextFunction } from "express";

// ============================================================
// 404 NOT FOUND
// ============================================================

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("❌ Server error:", err);

  // MySQL: duplicate entry (e.g., unique constraint)
  if (err.code === "ER_DUP_ENTRY") {
    res.status(400).json({
      message: "A record with that value already exists."
    });
    return;
  }

  // MySQL: cannot delete — referenced by foreign key
  if (err.code === "ER_ROW_IS_REFERENCED_2") {
    res.status(400).json({
      message: "Cannot delete — this record is referenced by other data."
    });
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    res.status(403).json({ message: "Invalid token." });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(403).json({ message: "Token expired. Please log in again." });
    return;
  }

  // Default
  res.status(err.status || 500).json({
    message: err.message || "Internal server error."
  });
};