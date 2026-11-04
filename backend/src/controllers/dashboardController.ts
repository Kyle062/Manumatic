import { Response, NextFunction } from "express";
import * as dashboardService from "../services/dashboardService";
import { AuthRequest } from "../types";

export const getStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const transactions = await dashboardService.getRecentTransactions(10);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

export const getLogs = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const logs = await dashboardService.getActivityLogs(8);
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

export const getTopSelling = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 5;
    const range = (req.query.range as string) || "week";

    const top = await dashboardService.getTopSellingParts(limit, range);
    res.json(top);
  } catch (error) {
    next(error);
  }
};

export const getSalesTrend = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const trend = await dashboardService.getSalesTrend();
    res.json(trend);
  } catch (error) {
    next(error);
  }
};

export const getLowStock = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parts = await dashboardService.getLowStockParts();
    res.json(parts);
  } catch (error) {
    next(error);
  }
};