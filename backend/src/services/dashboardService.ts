import * as partModel from "../models/partModel";
import * as saleModel from "../models/saleModel";
import {
  DashboardStats,
  ActivityLog,
  TopSellingPart,
  SalesTrendPoint,
} from "../types";

// ============================================================
// GET DASHBOARD STATS
// ============================================================

export const getStats = async (): Promise<DashboardStats> => {
  const [
    todayStats,
    totalTransactions,
    lowStockItems,
    partsInCatalog,
    unitsOnHand,
  ] = await Promise.all([
    saleModel.getTodayStats(),
    saleModel.countSales(),
    partModel.countLowStock(),
    partModel.countParts(),
    partModel.sumQuantity(),
  ]);

  return {
    todaySales: {
      total_sales: todayStats.total_sales,
      transaction_count: todayStats.transaction_count,
    },
    totalTransactions,
    lowStockItems,
    partsInCatalog,
    unitsOnHand,
  };
};

// ============================================================
// GET RECENT TRANSACTIONS
// ============================================================

export const getRecentTransactions = async (limit = 10) => {
  return saleModel.findRecent(limit);
};

// ============================================================
// GET ACTIVITY LOGS
// ============================================================
// FIXED: Force Asia/Manila timezone so times match local clock
// ============================================================

export const getActivityLogs = async (limit = 8): Promise<ActivityLog[]> => {
  const recent = await saleModel.findRecent(limit);

  return recent.map((sale) => {
    const date = new Date(sale.sale_date);
    const time = date.toLocaleTimeString("en-PH", {
      timeZone: "Asia/Manila", // ← FIX: Force Manila timezone
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return {
      time,
      text: `${sale.user_name} processed sale ${sale.receipt_no} — ${sale.part_name}`,
    };
  });
};

// ============================================================
// GET TOP SELLING PARTS
// ============================================================

export const getTopSellingParts = async (
  limit = 5,
): Promise<TopSellingPart[]> => {
  return saleModel.getTopSelling(limit);
};

// ============================================================
// GET SALES TREND (last 7 days)
// ============================================================

export const getSalesTrend = async (): Promise<SalesTrendPoint[]> => {
  return saleModel.getSalesTrend();
};

// ============================================================
// GET LOW STOCK PARTS (for "Needs Reordering" card)
// ============================================================

export const getLowStockParts = async () => {
  return partModel.findLowStock();
};
