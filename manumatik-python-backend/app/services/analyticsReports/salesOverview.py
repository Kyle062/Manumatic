"""
Sales overview reports: today's receipts and the last 7/30 days of sales.
Each numbered block shows the database query and the Pandas work done on it.
"""

# 0.Dependencies - Pandas, Manila timezone, and the shared MySQL engine.
import pandas as pd
from datetime import datetime
import pytz
from app.database import engine


# 1.Today sells(Reports) - Showing every sale made today, grouped by receipt.
def get_today_sales_analytics():
    # 1.1 Today sells(Reports) - Work out today's date in the shop's Manila timezone.
    manila_tz = pytz.timezone("Asia/Manila")
    today_str = datetime.now(manila_tz).strftime("%Y-%m-%d")

    # 1.2 Today sells(Reports) - Select today's sale lines with their part labels.
    query = f"""
        SELECT s.receipt_no, s.sale_date, s.quantity, s.total_price,
               p.part_id, p.part_number, p.name
        FROM sales s
        JOIN parts p ON s.part_id = p.part_id
        WHERE DATE(s.sale_date) = '{today_str}'
        ORDER BY s.sale_date, s.receipt_no
    """

    # 1.3 Today sells(Reports) - Fetch the rows into a DataFrame.
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    # 1.4 Today sells(Reports) - Return an empty report when there are no sales yet.
    if df.empty:
        return {
            "date": today_str,
            "transactions": 0,
            "total_revenue": 0.0,
            "receipts": [],
        }

    # 1.5 Today sells(Reports) - Format each line's timestamp for display.
    df["sold_at"] = pd.to_datetime(df["sale_date"]).dt.strftime("%Y-%m-%d %H:%M:%S")

    # 1.6 Today sells(Reports) - Summarize each receipt: first time and total amount.
    receipt_summary = (
        df.groupby("receipt_no")
        .agg(sold_at=("sold_at", "first"), total=("total_price", "sum"))
        .reset_index()
    )

    # 1.7 Today sells(Reports) - Nest the purchased parts inside each receipt.
    receipts = []
    for _, receipt in receipt_summary.iterrows():
        # 1.8 Today sells(Reports) - Pull just this receipt's lines from the DataFrame.
        lines = df[df["receipt_no"] == receipt["receipt_no"]]
        items = lines[
            ["part_id", "part_number", "name", "quantity", "total_price"]
        ].to_dict(orient="records")

        # 1.9 Today sells(Reports) - Convert NumPy/Decimal numbers to JSON-safe types.
        for item in items:
            item["part_id"] = int(item["part_id"])
            item["quantity"] = int(item["quantity"])
            item["total_price"] = float(item["total_price"])

        receipts.append(
            {
                "receipt_no": str(receipt["receipt_no"]),
                "sold_at": str(receipt["sold_at"]),
                "items": items,
                "total": float(receipt["total"]),
            }
        )

    # 1.10 Today sells(Reports) - Add headline totals for the report header.
    return {
        "date": today_str,
        "transactions": int(len(receipt_summary)),
        "total_revenue": float(df["total_price"].sum()),
        "receipts": receipts,
    }


# 2.Reports(Sales last 7 & 30 days) - Showing sales totals for the chosen window.
def get_period_sales_analytics(range_type: str = "week"):
    # 2.1 Reports(Sales last 7 & 30 days) - Use Manila time to match stored dates.
    manila_tz = pytz.timezone("Asia/Manila")
    today = datetime.now(manila_tz)

    # 2.2 Reports(Sales last 7 & 30 days) - Week = 7 days, month = 30 days.
    days = 7 if range_type == "week" else 30
    start_date = (today - pd.Timedelta(days=days - 1)).strftime("%Y-%m-%d")

    # 2.3 Reports(Sales last 7 & 30 days) - Fetch every sale line in the window.
    query = f"""
        SELECT s.receipt_no, s.sale_date, s.quantity, s.total_price, p.part_id
        FROM sales s
        JOIN parts p ON s.part_id = p.part_id
        WHERE DATE(s.sale_date) >= '{start_date}'
    """

    # 2.4 Reports(Sales last 7 & 30 days) - Load the rows into a DataFrame.
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    # 2.5 Reports(Sales last 7 & 30 days) - Return zeros when nothing sold yet.
    if df.empty:
        return {
            "range": range_type,
            "days": days,
            "total_revenue": 0.0,
            "transaction_count": 0,
            "units_sold": 0,
            "avg_transaction": 0.0,
            "daily": [],
        }

    # 2.6 Reports(Sales last 7 & 30 days) - Turn timestamps into day keys.
    df["day"] = pd.to_datetime(df["sale_date"]).dt.strftime("%Y-%m-%d")

    # 2.7 Reports(Sales last 7 & 30 days) - Compute headline revenue/units/receipts.
    total_revenue = float(df["total_price"].sum())
    transaction_count = int(df["receipt_no"].nunique())
    units_sold = int(df["quantity"].sum())

    # 2.8 Reports(Sales last 7 & 30 days) - Average sale is per receipt, not per line.
    receipt_totals = df.groupby("receipt_no")["total_price"].sum()
    avg_transaction = float(receipt_totals.mean())

    # 2.9 Reports(Sales last 7 & 30 days) - Aggregate revenue/units/receipts by day.
    daily_df = (
        df.groupby("day")
        .agg(
            revenue=("total_price", "sum"),
            transactions=("receipt_no", "nunique"),
            units_sold=("quantity", "sum"),
        )
        .reset_index()
        .sort_values("day")
    )

    # 2.10 Reports(Sales last 7 & 30 days) - Convert each day to JSON-safe values.
    daily_data = []
    for row in daily_df.to_dict(orient="records"):
        daily_data.append(
            {
                "day": str(row["day"]),
                "revenue": float(row["revenue"]),
                "transactions": int(row["transactions"]),
                "units_sold": int(row["units_sold"]),
            }
        )

    # 2.11 Reports(Sales last 7 & 30 days) - Final window summary for the report.
    return {
        "range": range_type,
        "days": days,
        "total_revenue": total_revenue,
        "transaction_count": transaction_count,
        "units_sold": units_sold,
        "avg_transaction": avg_transaction,
        "daily": daily_data,
    }
