import { Response, NextFunction } from "express";
import * as dashboardService from "../services/dashboardService";
import { AuthRequest } from "../types";

// ============================================================
// GET /api/dashboard/stats
// ============================================================

export const getStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/dashboard/transactions
// ============================================================

export const getTransactions = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const transactions = await dashboardService.getRecentTransactions(10);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/dashboard/logs
// ============================================================

export const getLogs = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logs = await dashboardService.getActivityLogs(8);
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/dashboard/top-selling
// ============================================================

export const getTopSelling = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const top = await dashboardService.getTopSellingParts(5);
    res.json(top);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/dashboard/sales-trend
// ============================================================

export const getSalesTrend = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trend = await dashboardService.getSalesTrend();
    res.json(trend);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/dashboard/low-stock
// ============================================================

export const getLowStock = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parts = await dashboardService.getLowStockParts();
    res.json(parts);
  } catch (error) {
    next(error);
  }
};