"""
Dashboard analytics: reordering priority, top selling parts, and daily sales.
Each numbered block shows the database query and the Pandas work done on it.
"""

# 0.Dependencies - Pandas, Manila timezone, and the shared MySQL engine.
import pandas as pd
from datetime import datetime
import pytz
from app.database import engine


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
    total_revenue = float(df["total_price"].sum())
    transaction_count = int(df["receipt_no"].nunique())
    unique_parts_sold = int(df["part_id"].nunique())

    # 1.7 Analytics(Dashboard) - Average sale uses receipt totals, not raw lines.
    transaction_totals = df.groupby("receipt_no")["total_price"].sum()
    avg_transaction = float(transaction_totals.mean())

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
        day_parts_df = parts_by_day[parts_by_day["day"] == day_str]
        parts_list = day_parts_df[
            ["part_id", "part_number", "name", "quantity_sold", "revenue"]
        ].to_dict(orient="records")

        # 1.13 Analytics(Dashboard) - Convert NumPy numbers so FastAPI can send JSON.
        for p in parts_list:
            p["part_id"] = int(p["part_id"])
            p["quantity_sold"] = int(p["quantity_sold"])
            p["revenue"] = float(p["revenue"])

        daily_data.append(
            {
                "day": day_str,
                "revenue": float(row["revenue"]),
                "transactions": int(row["transactions"]),
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
        WHERE quantity <= reorder_level
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
    df["estimated_cost"] = df["deficit"] * df["price"]

    # 2.6 Needs reordering(Dashboard) - Biggest shortages first, capped at limit.
    df = df.sort_values(by=["deficit", "estimated_cost"], ascending=[False, False]).head(limit)

    # 2.7 Needs reordering(Dashboard) - Turn rows into records for the response.
    result = df.to_dict(orient="records")

    # 2.8 Needs reordering(Dashboard) - Convert NumPy/Decimal values to JSON-safe types.
    for item in result:
        item["part_id"] = int(item["part_id"])
        item["quantity"] = int(item["quantity"])
        item["reorder_level"] = int(item["reorder_level"])
        item["deficit"] = int(item["deficit"])
        item["price"] = float(item["price"])
        item["estimated_cost"] = float(item["estimated_cost"])

    # 2.9 Needs reordering(Dashboard) - Final prioritized reorder list.
    return result


# 3.Top selling parts(Dashboard) - Showing the parts that sold the most.
def get_top_selling_analytics(limit: int, range_type: str = "week"):
    # 3.1 Top selling parts(Dashboard) - Use Manila time to match stored sale dates.
    manila_tz = pytz.timezone("Asia/Manila")
    today = datetime.now(manila_tz)

    # 3.2 Top selling parts(Dashboard) - Build the date window: today / 7 days / 30 days.
    if range_type == "today":
        date_filter = f"DATE(s.sale_date) = '{today.strftime('%Y-%m-%d')}'"
    elif range_type == "week":
        start_of_week = (today - pd.Timedelta(days=6)).strftime("%Y-%m-%d")
        date_filter = f"DATE(s.sale_date) >= '{start_of_week}'"
    else:
        start_of_month = (today - pd.Timedelta(days=29)).strftime("%Y-%m-%d")
        date_filter = f"DATE(s.sale_date) >= '{start_of_month}'"

    # 3.3 Top selling parts(Dashboard) - Fetch sale lines joined to part details.
    query = f"""
        SELECT s.quantity, s.total_price,
               p.part_id, p.part_number, p.name, p.category
        FROM sales s
        JOIN parts p ON s.part_id = p.part_id
        WHERE {date_filter}
    """

    # 3.4 Top selling parts(Dashboard) - Load the raw rows into a DataFrame.
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    # 3.5 Top selling parts(Dashboard) - Return an empty list if there are no sales.
    if df.empty:
        return []

    # 3.6 Top selling parts(Dashboard) - Sum units and revenue per part.
    top_df = (
        df.groupby(["part_id", "part_number", "name", "category"])
        .agg(units_sold=("quantity", "sum"), revenue=("total_price", "sum"))
        .reset_index()
    )

    # 3.7 Top selling parts(Dashboard) - Rank by units sold, then revenue, keep top N.
    top_df = top_df.sort_values(
        by=["units_sold", "revenue"], ascending=[False, False]
    ).head(limit)

    # 3.8 Top selling parts(Dashboard) - Convert rows to a JSON-ready list.
    result = top_df.to_dict(orient="records")
    for item in result:
        item["part_id"] = int(item["part_id"])
        item["units_sold"] = int(item["units_sold"])
        item["revenue"] = float(item["revenue"])

    # 3.9 Top selling parts(Dashboard) - Final ranked list for the dashboard card.
    return result


