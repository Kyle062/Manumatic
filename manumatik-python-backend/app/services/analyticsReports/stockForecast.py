"""
Stock forecast report: parts at risk of running out in the near future.
Each numbered block shows the database query and the Pandas work done on it.
"""

# 0.Dependencies - Pandas, shared date windows, and the shared MySQL engine.
import pandas as pd

from app.services.analyticsDashboard import (
    as_float,
    as_int,
    get_range_filter,
    mysql_connection,
)


# 1.Reports(Stock Forecast) - Showing when parts are likely to run out.
def get_stock_forecast_analytics(range_type: str = "month"):
    # 1.1 Reports(Stock Forecast) - Apply the selected range to the sales window.
    date_filter = get_range_filter(range_type)
    window_days = {
        "today": 1,
        "week": 7,
        "month": 30,
        "year": 365,
    }.get(range_type, 30)

    with mysql_connection() as conn:
        # 1.1.1 Reports(Stock Forecast) - All time uses the full sales history span.
        if range_type == "all":
            span_df = pd.read_sql(
                """
                SELECT COALESCE(DATEDIFF(CURDATE(), MIN(sale_date)) + 1, 30)
                       AS window_days
                FROM sales
                """,
                conn,
            )
            window_days = max(1, as_int(span_df.iloc[0, 0]))

        # 1.2 Reports(Stock Forecast) - Fetch every part and its range sale lines.
        parts_df = pd.read_sql(
            """
            SELECT part_id, part_number, name, category,
                   quantity AS current_stock, reorder_level
            FROM parts
            """,
            conn,
        )
        sales_df = pd.read_sql(
            f"SELECT s.part_id, s.quantity FROM sales s WHERE {date_filter}",
            conn,
        )

    # 1.3 Reports(Stock Forecast) - Return an empty list for an empty catalog.
    if parts_df.empty:
        return []

    # 1.4 Reports(Stock Forecast) - Sum selected-range units sold per part.
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

    # 1.6 Reports(Stock Forecast) - Average daily sales uses the selected window.
    merged["avg_daily_sales"] = merged["units_30d"] / window_days

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
        item["part_id"] = as_int(item["part_id"])
        item["current_stock"] = as_int(item["current_stock"])
        item["reorder_level"] = as_int(item["reorder_level"])
        item["units_last_30d"] = as_int(item.pop("units_30d"))
        item["avg_daily_sales"] = round(as_float(item["avg_daily_sales"]), 2)
        days = item["days_until_stockout"]
        item["days_until_stockout"] = None if pd.isna(days) else as_int(days)

    # 1.12 Reports(Stock Forecast) - Final at-risk stockout list.
    return result
