"""
Stock forecast report: parts at risk of running out in the near future.
Each numbered block shows the database query and the Pandas work done on it.
"""

# 0.Dependencies - Pandas, Manila timezone, and the shared MySQL engine.
import pandas as pd
from datetime import datetime
import pytz
from app.database import engine


# 1.Reports(Stock Forecast) - Showing when parts are likely to run out.
def get_stock_forecast_analytics():
    # 1.1 Reports(Stock Forecast) - Work out the 30-day sales window in Manila time.
    manila_tz = pytz.timezone("Asia/Manila")
    start_date = (
        datetime.now(manila_tz) - pd.Timedelta(days=29)
    ).strftime("%Y-%m-%d")

    # 1.2 Reports(Stock Forecast) - Fetch every part and its recent sale lines.
    with engine.connect() as conn:
        parts_df = pd.read_sql(
            """
            SELECT part_id, part_number, name, category,
                   quantity AS current_stock, reorder_level
            FROM parts
            """,
            conn,
        )
        sales_df = pd.read_sql(
            f"SELECT part_id, quantity FROM sales WHERE sale_date >= '{start_date}'",
            conn,
        )

    # 1.3 Reports(Stock Forecast) - Return an empty list for an empty catalog.
    if parts_df.empty:
        return []

    # 1.4 Reports(Stock Forecast) - Sum units sold in the last 30 days per part.
    if sales_df.empty:
        recent_df = pd.DataFrame(columns=["part_id", "units_30d"])
    else:
        recent_df = (
            sales_df.groupby("part_id")["quantity"]
            .sum()
            .rename("units_30d")
            .reset_index()
        )

    # 1.5 Reports(Stock Forecast) - Merge recent demand onto the full catalog.
    merged = parts_df.merge(recent_df, on="part_id", how="left")
    merged["units_30d"] = merged["units_30d"].fillna(0)

    # 1.6 Reports(Stock Forecast) - Average daily sales = 30-day units ÷ 30.
    merged["avg_daily_sales"] = merged["units_30d"] / 30

    # 1.7 Reports(Stock Forecast) - Estimate days of stock left at that pace.
    def days_left(row):
        if row["avg_daily_sales"] <= 0:
            return None
        return int(row["current_stock"] // row["avg_daily_sales"])

    merged["days_until_stockout"] = merged.apply(days_left, axis=1)

    # 1.8 Reports(Stock Forecast) - Classify risk by days remaining.
    def set_status(days):
        if days is None:
            return "no_sales"
        if days <= 3:
            return "critical"
        if days <= 7:
            return "warning"
        if days <= 14:
            return "watch"
        return "safe"

    merged["stockout_status"] = merged["days_until_stockout"].apply(set_status)

    # 1.9 Reports(Stock Forecast) - Drop safe parts and parts with no sales.
    forecast = merged[~merged["stockout_status"].isin(["safe", "no_sales"])]

    # 1.10 Reports(Stock Forecast) - Soonest stockouts first.
    forecast = forecast.assign(
        _sort=forecast["days_until_stockout"].fillna(9999)
    ).sort_values("_sort").drop(columns="_sort")

    # 1.11 Reports(Stock Forecast) - Convert rows to JSON-safe records.
    result = forecast.to_dict(orient="records")
    for item in result:
        item["part_id"] = int(item["part_id"])
        item["current_stock"] = int(item["current_stock"])
        item["reorder_level"] = int(item["reorder_level"])
        item["units_last_30d"] = int(item.pop("units_30d"))
        item["avg_daily_sales"] = round(float(item["avg_daily_sales"]), 2)
        days = item["days_until_stockout"]
        item["days_until_stockout"] = None if pd.isna(days) else int(days)

    # 1.12 Reports(Stock Forecast) - Final at-risk stockout list.
    return result
