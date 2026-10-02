import { Response, NextFunction } from "express";
import pool from "../config/database";
import { AuthRequest } from "../types";

// ============================================================
// GET /api/reports/sales-overview?range=today|week|month
// ============================================================

export const getSalesOverview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const range = (req.query.range as string) || "today";

    let dateFilter = "";
    switch (range) {
      case "today":
        dateFilter = "DATE(sale_date) = CURDATE()";
        break;
      case "week":
        dateFilter =
          "sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)";
        break;
      case "month":
        dateFilter =
          "sale_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)";
        break;
      default:
        dateFilter = "DATE(sale_date) = CURDATE()";
    }

    // Main stats
    const [statsRows] = await pool.execute(
      `SELECT
         COALESCE(SUM(total_price), 0) AS total_revenue,
         COUNT(*)                      AS transaction_count,
         COUNT(DISTINCT part_id)       AS unique_parts_sold,
         COALESCE(AVG(total_price), 0) AS avg_transaction
       FROM sales
       WHERE ${dateFilter}`
    );

    const stats = (statsRows as any[])[0];

    // Per-day breakdown for the range
    const [dailyRows] = await pool.execute(
      `SELECT
         DATE(sale_date) AS day,
         SUM(total_price) AS revenue,
         COUNT(*) AS transactions
       FROM sales
       WHERE ${dateFilter}
       GROUP BY DATE(sale_date)
       ORDER BY day ASC`
    );

    res.json({
      range,
      total_revenue: Number(stats.total_revenue),
      transaction_count: Number(stats.transaction_count),
      unique_parts_sold: Number(stats.unique_parts_sold),
      avg_transaction: Number(stats.avg_transaction),
      daily: (dailyRows as any[]).map((d) => ({
        day: new Date(d.day).toISOString().split("T")[0],
        revenue: Number(d.revenue),
        transactions: Number(d.transactions)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/reports/inventory-valuation
// ============================================================

export const getInventoryValuation = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Overall totals
    const [totalsRows] = await pool.execute(
      `SELECT
         COUNT(*)                        AS total_parts,
         COALESCE(SUM(quantity), 0)      AS total_units,
         COALESCE(SUM(quantity * price), 0) AS total_value
       FROM parts`
    );

    const totals = (totalsRows as any[])[0];

    // Per-category breakdown
    const [categoryRows] = await pool.execute(
      `SELECT
         category,
         COUNT(*)                         AS part_count,
         COALESCE(SUM(quantity), 0)       AS units,
         COALESCE(SUM(quantity * price), 0) AS value
       FROM parts
       GROUP BY category
       ORDER BY value DESC`
    );

    // Low stock value (at risk)
    const [riskRows] = await pool.execute(
      `SELECT
         COUNT(*) AS low_stock_count,
         COALESCE(SUM(quantity * price), 0) AS at_risk_value
       FROM parts
       WHERE quantity <= reorder_level`
    );

    const risk = (riskRows as any[])[0];

    res.json({
      total_parts: Number(totals.total_parts),
      total_units: Number(totals.total_units),
      total_value: Number(totals.total_value),
      low_stock_count: Number(risk.low_stock_count),
      at_risk_value: Number(risk.at_risk_value),
      by_category: (categoryRows as any[]).map((c) => ({
        category: c.category,
        part_count: Number(c.part_count),
        units: Number(c.units),
        value: Number(c.value)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/reports/top-movers
// ============================================================

export const getTopMovers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 5;

    // Best sellers
    const [topRows] = await pool.execute(
      `SELECT
         p.part_id,
         p.part_number,
         p.name,
         p.category,
         SUM(s.quantity)    AS units_sold,
         SUM(s.total_price) AS revenue
       FROM sales s
       JOIN parts p ON s.part_id = p.part_id
       GROUP BY p.part_id, p.part_number, p.name, p.category
       ORDER BY units_sold DESC
       LIMIT ?`,
      [limit]
    );

    // Slow movers (parts with least or no sales)
    const [slowRows] = await pool.execute(
      `SELECT
         p.part_id,
         p.part_number,
         p.name,
         p.category,
         p.quantity AS current_stock,
         COALESCE(SUM(s.quantity), 0) AS units_sold
       FROM parts p
       LEFT JOIN sales s ON s.part_id = p.part_id
       GROUP BY p.part_id, p.part_number, p.name, p.category, p.quantity
       ORDER BY units_sold ASC, current_stock DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      top: (topRows as any[]).map((r) => ({
        part_id: r.part_id,
        part_number: r.part_number,
        name: r.name,
        category: r.category,
        units_sold: Number(r.units_sold),
        revenue: Number(r.revenue)
      })),
      slow: (slowRows as any[]).map((r) => ({
        part_id: r.part_id,
        part_number: r.part_number,
        name: r.name,
        category: r.category,
        current_stock: Number(r.current_stock),
        units_sold: Number(r.units_sold)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/reports/reorder-priority
// ============================================================

export const getReorderPriority = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Score: parts below reorder level, ranked by urgency
    const [rows] = await pool.execute(
      `SELECT
         p.part_id,
         p.part_number,
         p.name,
         p.category,
         p.quantity,
         p.reorder_level,
         p.price,
         (p.reorder_level - p.quantity) AS deficit,
         COALESCE(SUM(s.quantity), 0)   AS recent_sales
       FROM parts p
       LEFT JOIN sales s ON s.part_id = p.part_id
         AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       WHERE p.quantity <= p.reorder_level
       GROUP BY p.part_id, p.part_number, p.name, p.category,
                p.quantity, p.reorder_level, p.price
       ORDER BY
         (p.reorder_level - p.quantity) DESC,
         recent_sales DESC`
    );

    res.json(
      (rows as any[]).map((r) => ({
        part_id: r.part_id,
        part_number: r.part_number,
        name: r.name,
        category: r.category,
        quantity: Number(r.quantity),
        reorder_level: Number(r.reorder_level),
        deficit: Number(r.deficit),
        price: Number(r.price),
        recent_sales: Number(r.recent_sales),
        restock_cost: Number(r.deficit) * Number(r.price),
        urgency:
          Number(r.quantity) === 0
            ? "critical"
            : Number(r.deficit) > 5
            ? "high"
            : "medium"
      }))
    );
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/reports/low-stock-forecast
// ============================================================

export const getLowStockForecast = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Calculate sales velocity over last 30 days
    const [rows] = await pool.execute(
      `SELECT
         p.part_id,
         p.part_number,
         p.name,
         p.category,
         p.quantity AS current_stock,
         p.reorder_level,
         COALESCE(SUM(CASE
           WHEN s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           THEN s.quantity ELSE 0 END), 0) AS units_30d
       FROM parts p
       LEFT JOIN sales s ON s.part_id = p.part_id
       GROUP BY p.part_id, p.part_number, p.name, p.category,
                p.quantity, p.reorder_level`
    );

    const forecast = (rows as any[])
      .map((r) => {
        const unitsPerDay = Number(r.units_30d) / 30;
        const daysLeft =
          unitsPerDay > 0
            ? Math.floor(Number(r.current_stock) / unitsPerDay)
            : null;

        return {
          part_id: r.part_id,
          part_number: r.part_number,
          name: r.name,
          category: r.category,
          current_stock: Number(r.current_stock),
          reorder_level: Number(r.reorder_level),
          units_last_30d: Number(r.units_30d),
          avg_daily_sales: Number(unitsPerDay.toFixed(2)),
          days_until_stockout: daysLeft,
          stockout_status:
            daysLeft === null
              ? "no_sales"
              : daysLeft <= 3
              ? "critical"
              : daysLeft <= 7
              ? "warning"
              : daysLeft <= 14
              ? "watch"
              : "safe"
        };
      })
      .filter((f) => f.stockout_status !== "safe" && f.stockout_status !== "no_sales")
      .sort((a, b) => {
        if (a.days_until_stockout === null) return 1;
        if (b.days_until_stockout === null) return -1;
        return a.days_until_stockout - b.days_until_stockout;
      });

    res.json(forecast);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/reports/cashier-performance
// ============================================================

export const getCashierPerformance = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [rows] = await pool.execute(
      `SELECT
         u.user_id,
         u.name,
         u.role,
         COUNT(s.sale_id) AS total_sales,
         COALESCE(SUM(s.total_price), 0) AS total_revenue,
         COALESCE(AVG(s.total_price), 0) AS avg_transaction,
         MAX(s.sale_date) AS last_sale
       FROM users u
       LEFT JOIN sales s ON s.user_id = u.user_id
       GROUP BY u.user_id, u.name, u.role
       ORDER BY total_revenue DESC`
    );

    res.json(
      (rows as any[]).map((r) => ({
        user_id: r.user_id,
        name: r.name,
        role: r.role,
        total_sales: Number(r.total_sales),
        total_revenue: Number(r.total_revenue),
        avg_transaction: Number(r.avg_transaction),
        last_sale: r.last_sale
      }))
    );
  } catch (error) {
    next(error);
  }
};