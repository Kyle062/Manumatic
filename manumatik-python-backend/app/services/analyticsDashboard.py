"""
Dashboard analytics: sales overview, reordering, top sellers, and Dashboard cards.
Each numbered block shows the database query and the Pandas work done on it.
"""

# 0.Dependencies - Pandas, Manila timezone, context manager, numbers, typing, and the shared MySQL engine.
from contextlib import contextmanager
from datetime import datetime
from numbers import Number
from typing import Any, SupportsFloat, SupportsInt, cast

import pandas as pd
import pytz

from app.database import engine


# 0.0 Dependencies(Dashboard) - Convert pandas values with types Pyright accepts.
def _as_float(value: Any) -> float:
    return float(cast(SupportsFloat, value))


# 0.0.1 Dependencies(Dashboard) - Convert pandas values to a JSON-safe integer.
def _as_int(value: Any) -> int:
    return int(cast(SupportsInt, value))


# 0.1 Dependencies(Dashboard) - Read one scalar value for the headline cards.
def _scalar(query: str, conn) -> float:
    # 0.1.1 Dependencies(Dashboard) - pd.isna() can return an array, so check scalar first.
    value = pd.read_sql(query, conn).iloc[0, 0]
    if value is None or not pd.api.types.is_scalar(value) or pd.isna(value):
        return 0.0

    # 0.1.2 Dependencies(Dashboard) - `Number` includes NumPy ints/floats.
    if isinstance(value, Number):
        return _as_float(value)

    # 0.1.3 Dependencies(Dashboard) - Non-numeric SQL values count as zero.
    return 0.0


# 0.2 Dependencies(Dashboard) - Match Node's +08:00 MySQL session for CURDATE().
@contextmanager
def _mysql_connection():
    with engine.connect() as conn:
        conn.exec_driver_sql("SET time_zone = '+08:00'")
        yield conn


# 1.Analytics(Dashboard) - Showing the sales each day.
def get_sales_overview_analytics(range_type: str):
    # 1.1 Analytics(Dashboard) - Match MySQL's +08:00 so sales land on the right day.
    manila_tz = pytz.timezone("Asia/Manila")
    today = datetime.now(manila_tz)

    # 1.2 Analytics(Dashboard) - Choose today, the last 7 days, or the last 30 days.
    if range_type == "today":
        date_filter = f"DATE(s.sale_date) = '{today.strftime('%Y-%m-%d')}'"
    elif range_type == "week":
        start_of_week = (today - pd.Timedelta(days=6)).strftime("%Y-%m-%d")
        date_filter = f"DATE(s.sale_date) >= '{start_of_week}'"
    else:
        start_of_month = (today - pd.Timedelta(days=29)).strftime("%Y-%m-%d")
        date_filter = f"DATE(s.sale_date) >= '{start_of_month}'"

    # 1.3 Analytics(Dashboard) - Join sales to parts for readable part labels.
    query = f"""
        SELECT 
            s.receipt_no, s.sale_date, s.quantity, s.total_price, 
            p.part_id, p.name, p.part_number
        FROM sales s
        JOIN parts p ON s.part_id = p.part_id
        WHERE {date_filter}
    """

    # 1.4 Analytics(Dashboard) - Load rows into a DataFrame for fast grouping.
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    # 1.5 Analytics(Dashboard) - Return zeros so a new shop still renders charts.
    if df.empty:
        return {
            "range": range_type,
            "total_revenue": 0,
            "transaction_count": 0,
            "unique_parts_sold": 0,
            "avg_transaction": 0,
            "daily": [],
        }

    # 1.6 Analytics(Dashboard) - Count distinct receipts as transactions.
    total_revenue = _as_float(df["total_price"].sum())
    transaction_count = _as_int(df["receipt_no"].nunique())
    unique_parts_sold = _as_int(df["part_id"].nunique())

    # 1.7 Analytics(Dashboard) - Average sale uses receipt totals, not raw lines.
    transaction_totals = cast(
        pd.Series, df.groupby("receipt_no")["total_price"].sum()
    )
    avg_transaction = _as_float(transaction_totals.mean())

    # 1.8 Analytics(Dashboard) - Normalize timestamps into YYYY-MM-DD day keys.
    df["sale_date"] = pd.to_datetime(df["sale_date"])
    df["day"] = df["sale_date"].dt.strftime("%Y-%m-%d")

    # 1.9 Analytics(Dashboard) - Total revenue and receipts per calendar day.
    daily_stats = (
        df.groupby("day")
        .agg(revenue=("total_price", "sum"), transactions=("receipt_no", "nunique"))
        .reset_index()
    )

    # 1.10 Analytics(Dashboard) - Per-day, per-part totals for the drill-down.
    parts_by_day = (
        df.groupby(["day", "part_id", "name", "part_number"])
        .agg(quantity_sold=("quantity", "sum"), revenue=("total_price", "sum"))
        .reset_index()
    )

    # 1.11 Analytics(Dashboard) - Build one day entry with its parts nested inside.
    daily_data = []
    for _, row in daily_stats.iterrows():
        day_str = row["day"]

        # 1.12 Analytics(Dashboard) - Slice each day's parts once before nesting.
        day_parts_df = cast(pd.DataFrame, parts_by_day[parts_by_day["day"] == day_str])
        parts_list = cast(
            list[dict[str, Any]],
            cast(
                pd.DataFrame,
                day_parts_df[
                    ["part_id", "part_number", "name", "quantity_sold", "revenue"]
                ],
            ).to_dict(orient="records"),
        )

        # 1.13 Analytics(Dashboard) - Convert NumPy numbers so FastAPI can send JSON.
        for p in parts_list:
            p["part_id"] = _as_int(p["part_id"])
            p["quantity_sold"] = _as_int(p["quantity_sold"])
            p["revenue"] = _as_float(p["revenue"])

        daily_data.append(
            {
                "day": day_str,
                "revenue": _as_float(row["revenue"]),
                "transactions": _as_int(row["transactions"]),
                "parts_sold": parts_list,
            }
        )

    # 1.14 Analytics(Dashboard) - Final KPI payload matching the response schema.
    return {
        "range": range_type,
        "total_revenue": total_revenue,
        "transaction_count": transaction_count,
        "unique_parts_sold": unique_parts_sold,
        "avg_transaction": avg_transaction,
        "daily": daily_data,
    }


# 2.Needs reordering(Dashboard) - Showing what needs to be ordered by priority.
def get_reorder_priority_analytics(limit: int):
    # 2.1 Needs reordering(Dashboard) - Read parts whose stock is at/below reorder level.
    query = """
        SELECT part_id, part_number, name, category, quantity, reorder_level, price
        FROM parts
        WHERE quantity < reorder_level
    """

    # 2.2 Needs reordering(Dashboard) - Load those parts into a DataFrame.
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    # 2.3 Needs reordering(Dashboard) - Return an empty list when stock is healthy.
    if df.empty:
        return []

    # 2.4 Needs reordering(Dashboard) - Deficit = units that must be ordered.
    df["deficit"] = df["reorder_level"] - df["quantity"]

    # 2.5 Needs reordering(Dashboard) - Estimate the peso cost to restock each part.
    df["restock_cost"] = df["deficit"] * df["price"]

    # 2.6 Needs reordering(Dashboard) - Biggest shortages first, capped at limit.
    df = df.sort_values(by=["deficit", "restock_cost"], ascending=[False, False]).head(limit)

    # 2.7 Needs reordering(Dashboard) - Turn rows into records for the response.
    result = df.to_dict(orient="records")

    # 2.8 Needs reordering(Dashboard) - Convert NumPy/Decimal values to JSON-safe types.
    for item in result:
        item["part_id"] = int(item["part_id"])
        item["quantity"] = int(item["quantity"])
        item["reorder_level"] = int(item["reorder_level"])
        item["deficit"] = int(item["deficit"])
        item["price"] = float(item["price"])
        item["restock_cost"] = float(item["restock_cost"])

    # 2.9 Needs reordering(Dashboard) - Final prioritized reorder list.
    return result


# 3.Reports(Top Movers) - Showing the parts that sold the most.
def get_top_selling_analytics(limit: int, range_type: str = "week"):
    # 3.0 Reports(Top Movers) - Used by /api/reports/top-movers; Dashboard uses section 7.
    # 3.1 Reports(Top Movers) - Use Manila time to match stored sale dates.
    manila_tz = pytz.timezone("Asia/Manila")
    today = datetime.now(manila_tz)

    # 3.2 Reports(Top Movers) - Build the date window: today / 7 days / 30 days.
    if range_type == "today":
        date_filter = f"DATE(s.sale_date) = '{today.strftime('%Y-%m-%d')}'"
    elif range_type == "week":
        start_of_week = (today - pd.Timedelta(days=6)).strftime("%Y-%m-%d")
        date_filter = f"DATE(s.sale_date) >= '{start_of_week}'"
    else:
        start_of_month = (today - pd.Timedelta(days=29)).strftime("%Y-%m-%d")
        date_filter = f"DATE(s.sale_date) >= '{start_of_month}'"

    # 3.3 Reports(Top Movers) - Fetch sale lines joined to part details.
    query = f"""
        SELECT s.quantity, s.total_price,
               p.part_id, p.part_number, p.name, p.category
        FROM sales s
        JOIN parts p ON s.part_id = p.part_id
        WHERE {date_filter}
    """

    # 3.4 Reports(Top Movers) - Load the raw rows into a DataFrame.
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    # 3.5 Reports(Top Movers) - Return an empty list if there are no sales.
    if df.empty:
        return []

    # 3.6 Reports(Top Movers) - Sum units and revenue per part.
    top_df = (
        df.groupby(["part_id", "part_number", "name", "category"])
        .agg(units_sold=("quantity", "sum"), revenue=("total_price", "sum"))
        .reset_index()
    )

    # 3.7 Reports(Top Movers) - Rank by units sold, then revenue, keep top N.
    top_df = top_df.sort_values(
        by=["units_sold", "revenue"], ascending=[False, False]
    ).head(limit)

    # 3.8 Reports(Top Movers) - Convert rows to a JSON-ready list.
    result = top_df.to_dict(orient="records")
    for item in result:
        item["part_id"] = int(item["part_id"])
        item["units_sold"] = int(item["units_sold"])
        item["revenue"] = float(item["revenue"])

    # 3.9 Reports(Top Movers) - Final ranked list for the dashboard card.
    return result


# 4.Dashboard(Stats) - Showing the headline cards at the top of the page.
def get_dashboard_stats():
    # 4.1 Dashboard(Stats) - Use MySQL's CURDATE() in +08:00, exactly like Node.
    with _mysql_connection() as conn:
        # 4.2 Dashboard(Stats) - Read today's revenue and distinct receipts.
        today_row = pd.read_sql(
            """
            SELECT
                COALESCE(SUM(total_price), 0) AS total_sales,
                COUNT(DISTINCT receipt_no)    AS transaction_count
            FROM sales
            WHERE DATE(sale_date) = CURDATE()
            """,
            conn,
        ).iloc[0]

        # 4.3 Dashboard(Stats) - Read all-time receipts and stock counts.
        total_transactions = _scalar(
            "SELECT COUNT(DISTINCT receipt_no) FROM sales", conn
        )
        low_stock_items = _scalar(
            "SELECT COUNT(*) FROM parts WHERE quantity <= reorder_level", conn
        )
        parts_in_catalog = _scalar("SELECT COUNT(*) FROM parts", conn)
        units_on_hand = _scalar("SELECT COALESCE(SUM(quantity), 0) FROM parts", conn)

    # 4.4 Dashboard(Stats) - Convert NumPy values to plain numbers for FastAPI.
    return {
        "todaySales": {
            "total_sales": float(today_row["total_sales"] or 0),
            "transaction_count": int(today_row["transaction_count"] or 0),
        },
        "totalTransactions": int(total_transactions),
        "lowStockItems": int(low_stock_items),
        "partsInCatalog": int(parts_in_catalog),
        "unitsOnHand": int(units_on_hand),
    }


# 5.Dashboard(Transactions) - Showing the latest sales table rows.
def get_dashboard_transactions(limit: int = 6):
    # 5.1 Dashboard(Transactions) - Cap the limit before placing it in SQL.
    safe_limit = max(1, min(int(limit), 50))

    # 5.2 Dashboard(Transactions) - Join sales, parts, and cashiers for readable rows.
    with engine.connect() as conn:
        df = pd.read_sql(
            f"""
            SELECT s.sale_id, s.receipt_no, p.name AS part_name, s.sale_date,
                   s.total_price, u.name AS user_name
            FROM sales s
            JOIN parts p ON s.part_id = p.part_id
            JOIN users u ON s.user_id = u.user_id
            ORDER BY s.sale_date DESC
            LIMIT {safe_limit}
            """,
            conn,
        )

    # 5.3 Dashboard(Transactions) - Convert timestamps and numbers to JSON-safe values.
    result = []
    for row in df.to_dict(orient="records"):
        sold_at = pd.to_datetime(row["sale_date"])
        result.append(
            {
                "sale_id": int(row["sale_id"]),
                "receipt_no": str(row["receipt_no"]),
                "part_name": str(row["part_name"]),
                "sale_date": "" if pd.isna(sold_at) else sold_at.isoformat(),
                "total_price": float(row["total_price"]),
                "user_name": str(row["user_name"]),
            }
        )

    # 5.4 Dashboard(Transactions) - Final recent-sale list for the dashboard table.
    return result


# 6.Dashboard(Activity Logs) - Turning recent sales into timeline text.
def get_dashboard_logs(limit: int = 6):
    # 6.1 Dashboard(Activity Logs) - Reuse transactions so text matches the table.
    logs = []
    for txn in get_dashboard_transactions(limit):
        timestamp = pd.to_datetime(txn["sale_date"])
        time = "" if pd.isna(timestamp) else timestamp.strftime("%H:%M")

        # 6.2 Dashboard(Activity Logs) - Build the short cashier activity sentence.
        logs.append(
            {
                "time": time,
                "text": (
                    f'{txn["user_name"]} processed sale '
                    f'{txn["receipt_no"]} - {txn["part_name"]}'
                ),
            }
        )

    # 6.3 Dashboard(Activity Logs) - Final ordered activity feed.
    return logs


# 7.Dashboard(Top Selling) - Showing the best sellers with the original Node windows.
def get_dashboard_top_selling(limit: int = 5, range_type: str = "week"):
    # 7.0 Dashboard(Top Selling) - Used by /api/dashboard/top-selling; section 3 serves Reports.
    # 7.1 Dashboard(Top Selling) - Cap the limit before placing it in SQL.
    safe_limit = max(1, min(int(limit), 20))

    # 7.2 Dashboard(Top Selling) - Match Node: today / 7-day / 30-day windows.
    if range_type == "today":
        date_filter = "WHERE DATE(s.sale_date) = CURDATE()"
    elif range_type == "month":
        date_filter = "WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
    else:
        date_filter = "WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"

    # 7.3 Dashboard(Top Selling) - Group by part and rank by units sold, like Node.
    with _mysql_connection() as conn:
        df = pd.read_sql(
            f"""
            SELECT p.part_id, p.name,
                   SUM(s.quantity)    AS sold,
                   SUM(s.total_price) AS revenue
            FROM sales s
            JOIN parts p ON s.part_id = p.part_id
            {date_filter}
            GROUP BY p.part_id, p.name
            ORDER BY sold DESC
            LIMIT {safe_limit}
            """,
            conn,
        )

    # 7.4 Dashboard(Top Selling) - Convert rows to JSON-safe values for the card.
    result = []
    for row in df.to_dict(orient="records"):
        result.append(
            {
                "part_id": int(row["part_id"]),
                "name": str(row["name"]),
                "sold": int(row["sold"]),
                "revenue": float(row["revenue"]),
            }
        )

    # 7.5 Dashboard(Top Selling) - Final ranked list for the dashboard card.
    return result


# 8.Dashboard(Sales Trend) - Showing the last 7 Manila days with short day labels.
def get_dashboard_sales_trend():
    # 8.0 Dashboard(Sales Trend) - Used by /api/dashboard/sales-trend for the 7-day chart.
    # 8.1 Dashboard(Sales Trend) - Match Node's +08:00 session for CURDATE().
    with _mysql_connection() as conn:
        # 8.2 Dashboard(Sales Trend) - Total revenue per calendar day, like Node.
        sales_df = pd.read_sql(
            """
            SELECT DATE_FORMAT(sale_date, '%%Y-%%m-%%d') AS day_iso,
                   SUM(total_price) AS sales
            FROM sales
            WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(sale_date)
            """,
            conn,
        )

        # 8.3 Dashboard(Sales Trend) - Build all seven days, oldest to newest.
        days_df = pd.read_sql(
            """
            SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n DAY), '%%Y-%%m-%%d') AS day_iso,
                   DAYNAME(DATE_SUB(CURDATE(), INTERVAL n DAY)) AS day_name
            FROM (
                SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
                UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
            ) AS numbers
            ORDER BY n DESC
            """,
            conn,
        )

    # 8.4 Dashboard(Sales Trend) - Map revenue by ISO day; missing days stay zero.
    sales_by_day = dict(zip(sales_df["day_iso"], sales_df["sales"]))

    # 8.5 Dashboard(Sales Trend) - Return `Mon`/`Tue` labels the chart expects.
    return [
        {
            "day": str(row["day_name"])[:3],
            "sales": float(sales_by_day.get(row["day_iso"], 0) or 0),
        }
        for _, row in days_df.iterrows()
    ]


# 9.Dashboard(Low Stock) - Showing the parts nearest their reorder level.
def get_dashboard_low_stock(limit: int = 10):
    # 9.0 Dashboard(Low Stock) - Used by /api/dashboard/low-stock for reorder card and bell.
    # 9.1 Dashboard(Low Stock) - Cap the limit before placing it in SQL.
    safe_limit = max(1, min(int(limit), 50))

    # 9.2 Dashboard(Low Stock) - Match Node: lowest stock first.
    with engine.connect() as conn:
        df = pd.read_sql(
            f"""
            SELECT *
            FROM parts
            WHERE quantity <= reorder_level
            ORDER BY quantity ASC
            LIMIT {safe_limit}
            """,
            conn,
        )

    # 9.3 Dashboard(Low Stock) - Convert rows to JSON-safe values for the card.
    result = []
    for row in df.to_dict(orient="records"):
        result.append(
            {
                "part_id": int(row["part_id"]),
                "part_number": str(row["part_number"]),
                "name": str(row["name"]),
                "category": str(row["category"]),
                "quantity": int(row["quantity"]),
                "reorder_level": int(row["reorder_level"]),
            }
        )

    # 9.4 Dashboard(Low Stock) - Final low-stock list for the dashboard.
    return result