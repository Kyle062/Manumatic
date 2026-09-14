import pool from "../config/database";
import { Sale, SaleWithDetails } from "../types";

// ============================================================
// CREATE SALE
// ============================================================

export interface CreateSaleInput {
  user_id: number;
  part_id: number;
  quantity: number;
  total_price: number;
  payment_type: string;
  receipt_no: string;
}

export const create = async (data: CreateSaleInput): Promise<number> => {
  const [result] = await pool.execute(
    `INSERT INTO sales
      (user_id, part_id, quantity, total_price, payment_type, receipt_no)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.user_id,
      data.part_id,
      data.quantity,
      data.total_price,
      data.payment_type,
      data.receipt_no
    ]
  );

  return (result as any).insertId;
};

// ============================================================
// GET ALL SALES
// ============================================================

export const findAll = async (): Promise<SaleWithDetails[]> => {
  const [rows] = await pool.execute(
    `SELECT s.*, p.name AS part_name, u.name AS user_name
     FROM sales s
     JOIN parts p ON s.part_id = p.part_id
     JOIN users u ON s.user_id = u.user_id
     ORDER BY s.sale_date DESC`
  );
  return rows as SaleWithDetails[];
};

// ============================================================
// GET SALE BY ID
// ============================================================

export const findById = async (
  saleId: number
): Promise<SaleWithDetails | null> => {
  const [rows] = await pool.execute(
    `SELECT s.*, p.name AS part_name, u.name AS user_name
     FROM sales s
     JOIN parts p ON s.part_id = p.part_id
     JOIN users u ON s.user_id = u.user_id
     WHERE s.sale_id = ?
     LIMIT 1`,
    [saleId]
  );

  const sales = rows as SaleWithDetails[];
  return sales.length > 0 ? sales[0] : null;
};

// ============================================================
// RECENT TRANSACTIONS
// ============================================================

export const findRecent = async (limit = 10): Promise<SaleWithDetails[]> => {
  const [rows] = await pool.execute(
    `SELECT s.*, p.name AS part_name, u.name AS user_name
     FROM sales s
     JOIN parts p ON s.part_id = p.part_id
     JOIN users u ON s.user_id = u.user_id
     ORDER BY s.sale_date DESC
     LIMIT ?`,
    [limit]
  );
  return rows as SaleWithDetails[];
};

// ============================================================
// DASHBOARD STATS
// ============================================================

export const getTodayStats = async (): Promise<{
  total_sales: number;
  transaction_count: number;
}> => {
  const [rows] = await pool.execute(
    `SELECT
       COALESCE(SUM(total_price), 0) AS total_sales,
       COUNT(*) AS transaction_count
     FROM sales
     WHERE DATE(sale_date) = CURDATE()`
  );

  const row = (rows as any[])[0];

  return {
    total_sales: Number(row.total_sales),
    transaction_count: Number(row.transaction_count)
  };
};

export const countSales = async (): Promise<number> => {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM sales"
  );
  return Number((rows as any[])[0].total);
};

// ============================================================
// TOP SELLING PARTS
// ============================================================

export interface TopSellingRow {
  part_id: number;
  name: string;
  sold: number;
  revenue: number;
}

export const getTopSelling = async (
  limit = 5
): Promise<TopSellingRow[]> => {
  const [rows] = await pool.execute(
    `SELECT
       p.part_id,
       p.name,
       SUM(s.quantity)   AS sold,
       SUM(s.total_price) AS revenue
     FROM sales s
     JOIN parts p ON s.part_id = p.part_id
     GROUP BY p.part_id, p.name
     ORDER BY sold DESC
     LIMIT ?`,
    [limit]
  );

  return (rows as any[]).map((r) => ({
    part_id: r.part_id,
    name: r.name,
    sold: Number(r.sold),
    revenue: Number(r.revenue)
  }));
};

// ============================================================
// SALES TREND (last 7 days)
// ============================================================

export const getSalesTrend = async (): Promise<
  Array<{ day: string; sales: number }>
> => {
  const [rows] = await pool.execute(
    `SELECT
       DATE(sale_date) AS day,
       SUM(total_price) AS sales
     FROM sales
     WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(sale_date)
     ORDER BY day ASC`
  );

  const raw = rows as any[];

  // Map DB rows by ISO date string
  const map = new Map<string, number>();
  for (const row of raw) {
    const d = new Date(row.day);
    const key = d.toISOString().split("T")[0];
    map.set(key, Number(row.sales));
  }

  // Fill missing days with 0
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const out: Array<{ day: string; sales: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    out.push({
      day: dayNames[date.getDay()],
      sales: map.get(key) ?? 0
    });
  }

  return out;
};

// ============================================================
// GENERATE RECEIPT NUMBER
// ============================================================

export const generateReceiptNo = async (): Promise<string> => {
  const date = new Date();
  const datePart = date.toISOString().split("T")[0].replace(/-/g, "");

  // Count today's sales to get sequence
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM sales WHERE DATE(sale_date) = CURDATE()"
  );

  const count = Number((rows as any[])[0].total) + 1;
  const seq = String(count).padStart(3, "0");

  return `RCP-${datePart}-${seq}`;
};