import pool from "../config/database";
import { Sale, SaleWithDetails } from "../types";

// ============================================================
// CREATE SALE (single row — legacy)
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
      data.receipt_no,
    ],
  );

  return (result as any).insertId;
};

// ============================================================
// CREATE SALE WITH ITEMS (transaction + stock deduction)
// ============================================================

export interface CreateSalePayload {
  user_id: number;
  items: Array<{
    part_id: number;
    quantity: number;
    unit_price: number;
  }>;
  payment_type: string;
  receipt_no: string;
}

export const createSaleWithItems = async (
  payload: CreateSalePayload,
): Promise<{ sale_ids: number[]; total: number }> => {
  const connection = await pool.getConnection();

  try {
    // Ensure Manila time on this connection too
    await connection.query("SET time_zone = '+08:00'");
    await connection.beginTransaction();

    const saleIds: number[] = [];
    let grandTotal = 0;

    for (const item of payload.items) {
      const [partRows] = await connection.execute(
        "SELECT name, quantity FROM parts WHERE part_id = ? FOR UPDATE",
        [item.part_id],
      );

      const parts = partRows as any[];
      if (parts.length === 0) {
        throw { status: 404, message: `Part ID ${item.part_id} not found.` };
      }

      const part = parts[0];

      if (part.quantity < item.quantity) {
        throw {
          status: 400,
          message: `Insufficient stock for "${part.name}". Only ${part.quantity} available.`,
        };
      }

      const lineTotal = item.quantity * item.unit_price;
      grandTotal += lineTotal;

      const [result] = await connection.execute(
        `INSERT INTO sales
           (user_id, part_id, quantity, total_price, payment_type, receipt_no)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          payload.user_id,
          item.part_id,
          item.quantity,
          lineTotal,
          payload.payment_type,
          payload.receipt_no,
        ],
      );

      saleIds.push((result as any).insertId);

      await connection.execute(
        "UPDATE parts SET quantity = quantity - ? WHERE part_id = ?",
        [item.quantity, item.part_id],
      );
    }

    await connection.commit();
    return { sale_ids: saleIds, total: grandTotal };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
     ORDER BY s.sale_date DESC`,
  );
  return rows as SaleWithDetails[];
};

// ============================================================
// GET SALE BY ID
// ============================================================

export const findById = async (
  saleId: number,
): Promise<SaleWithDetails | null> => {
  const [rows] = await pool.execute(
    `SELECT s.*, p.name AS part_name, u.name AS user_name
     FROM sales s
     JOIN parts p ON s.part_id = p.part_id
     JOIN users u ON s.user_id = u.user_id
     WHERE s.sale_id = ?
     LIMIT 1`,
    [saleId],
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
    [limit],
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
       COUNT(DISTINCT receipt_no) AS transaction_count
     FROM sales
     WHERE DATE(sale_date) = CURDATE()`,
  );

  const row = (rows as any[])[0];

  return {
    total_sales: Number(row.total_sales),
    transaction_count: Number(row.transaction_count),
  };
};

export const countSales = async (): Promise<number> => {
  const [rows] = await pool.execute(
    "SELECT COUNT(DISTINCT receipt_no) AS total FROM sales",
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

export const getTopSelling = async (limit = 5): Promise<TopSellingRow[]> => {
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
    [limit],
  );

  return (rows as any[]).map((r) => ({
    part_id: r.part_id,
    name: r.name,
    sold: Number(r.sold),
    revenue: Number(r.revenue),
  }));
};

// ============================================================
// SALES TREND (last 7 days — Manila timezone)
// ============================================================
// FIXED: Uses MySQL's own date functions so the day boundaries
// match Manila calendar. No JS Date conversion which caused
// the "1-day late" bug.
// ============================================================

export const getSalesTrend = async (): Promise<
  Array<{ day: string; sales: number }>
> => {
  // Group actual sales by Manila date string
  const [salesRows] = await pool.execute(
    `SELECT
       DATE_FORMAT(sale_date, '%Y-%m-%d') AS day_iso,
       SUM(total_price) AS sales
     FROM sales
     WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(sale_date)`,
  );

  const sales = salesRows as any[];

  const salesMap = new Map<string, number>();
  for (const s of sales) {
    salesMap.set(s.day_iso, Number(s.sales));
  }

  // Generate the last 7 days in Manila time via MySQL
  const [daysRows] = await pool.execute(
    `SELECT
       DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n DAY), '%Y-%m-%d') AS day_iso,
       DAYNAME(DATE_SUB(CURDATE(), INTERVAL n DAY)) AS day_name
     FROM (
       SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
       UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
     ) AS numbers
     ORDER BY n DESC`,
  );

  const days = daysRows as any[];

  return days.map((d) => ({
    day: String(d.day_name).slice(0, 3),
    sales: salesMap.get(d.day_iso) ?? 0,
  }));
};

// ============================================================
// GENERATE RECEIPT NUMBER
// ============================================================

export const generateReceiptNo = async (): Promise<string> => {
  const date = new Date();
  const datePart = date.toISOString().split("T")[0].replace(/-/g, "");

  const [rows] = await pool.execute(
    `SELECT COUNT(DISTINCT receipt_no) AS total
     FROM sales
     WHERE DATE(sale_date) = CURDATE()`,
  );

  const count = Number((rows as any[])[0].total) + 1;
  const seq = String(count).padStart(3, "0");

  return `RCP-${datePart}-${seq}`;
};
