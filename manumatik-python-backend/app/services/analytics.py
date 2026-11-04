import pandas as pd
from app.database import engine


def get_sales_overview_analytics(range_type: str):
    if range_type == "today":
        date_filter = "DATE(s.sale_date) = CURDATE()"
    elif range_type == "week":
        date_filter = "s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)"
    else:
        date_filter = "s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)"

    query = f"""
        SELECT 
            s.receipt_no, s.sale_date, s.quantity, s.total_price, 
            p.part_id, p.name, p.part_number
        FROM sales s
        JOIN parts p ON s.part_id = p.part_id
        WHERE {date_filter}
    """

    # Use a raw connection directly from the engine
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    if df.empty:
        return {
            "range": range_type,
            "total_revenue": 0,
            "transaction_count": 0,
            "unique_parts_sold": 0,
            "avg_transaction": 0,
            "daily": [],
        }

    total_revenue = float(df["total_price"].sum())
    transaction_count = int(df["receipt_no"].nunique())
    unique_parts_sold = int(df["part_id"].nunique())

    transaction_totals = df.groupby("receipt_no")["total_price"].sum()
    avg_transaction = float(transaction_totals.mean())

    df["sale_date"] = pd.to_datetime(df["sale_date"])
    df["day"] = df["sale_date"].dt.strftime("%Y-%m-%d")

    daily_stats = (
        df.groupby("day")
        .agg(revenue=("total_price", "sum"), transactions=("receipt_no", "nunique"))
        .reset_index()
    )

    parts_by_day = (
        df.groupby(["day", "part_id", "name", "part_number"])
        .agg(quantity_sold=("quantity", "sum"), revenue=("total_price", "sum"))
        .reset_index()
    )

    daily_data = []
    for _, row in daily_stats.iterrows():
        day_str = row["day"]
        day_parts_df = parts_by_day[parts_by_day["day"] == day_str]
        parts_list = day_parts_df[
            ["part_id", "part_number", "name", "quantity_sold", "revenue"]
        ].to_dict(orient="records")

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

    return {
        "range": range_type,
        "total_revenue": total_revenue,
        "transaction_count": transaction_count,
        "unique_parts_sold": unique_parts_sold,
        "avg_transaction": avg_transaction,
        "daily": daily_data,
    }


def get_top_movers_analytics(limit: int):
    with engine.connect() as conn:
        sales_df = pd.read_sql(
            """
            SELECT p.part_id, p.part_number, p.name, p.category, s.quantity, s.total_price
            FROM sales s JOIN parts p ON s.part_id = p.part_id
            """,
            conn,
        )

        parts_df = pd.read_sql(
            "SELECT part_id, part_number, name, category, quantity as current_stock FROM parts",
            conn,
        )

    top_df = (
        sales_df.groupby(["part_id", "part_number", "name", "category"])
        .agg(units_sold=("quantity", "sum"), revenue=("total_price", "sum"))
        .reset_index()
        .sort_values(by="units_sold", ascending=False)
        .head(limit)
    )

    merged = pd.merge(parts_df, sales_df, on="part_id", how="left").fillna(0)
    slow_df = (
        merged.groupby(["part_id", "part_number", "name", "category", "current_stock"])
        .agg(units_sold=("quantity", "sum"))
        .reset_index()
        .sort_values(by=["units_sold", "current_stock"], ascending=[True, False])
        .head(limit)
    )

    top_list = top_df.to_dict(orient="records")
    slow_list = slow_df.to_dict(orient="records")

    for item in top_list:
        item["part_id"] = int(item["part_id"])
        item["units_sold"] = int(item["units_sold"])
        item["revenue"] = float(item["revenue"])

    for item in slow_list:
        item["part_id"] = int(item["part_id"])
        item["units_sold"] = int(item["units_sold"])
        item["current_stock"] = int(item["current_stock"])

    return {"top": top_list, "slow": slow_list}
