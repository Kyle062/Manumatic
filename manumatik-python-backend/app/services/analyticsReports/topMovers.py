"""
Top movers report: fastest and slowest selling parts.
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


# 1.Reports(Top Movers) - Showing which parts sell fastest and slowest.
def get_top_movers_analytics(limit: int, range_type: str = "all"):
    # 1.1 Reports(Top Movers) - Apply the selected date range to the sales lines.
    date_filter = get_range_filter(range_type)

    # 1.2 Reports(Top Movers) - Load range sales lines and the full parts catalog.
    with mysql_connection() as conn:
        sales_df = pd.read_sql(
            f"""
            SELECT p.part_id, p.part_number, p.name, p.category,
                   s.quantity, s.total_price
            FROM sales s
            JOIN parts p ON s.part_id = p.part_id
            WHERE {date_filter}
            """,
            conn,
        )

        # 1.3 Reports(Top Movers) - Rename stock so the merge stays unambiguous.
        parts_df = pd.read_sql(
            "SELECT part_id, part_number, name, category, quantity as current_stock FROM parts",
            conn,
        )

    # 1.4 Reports(Top Movers) - Sum units/revenue and keep the top N sellers.
    if not sales_df.empty:
        top_df = (
            sales_df.groupby(["part_id", "part_number", "name", "category"])
            .agg(units_sold=("quantity", "sum"), revenue=("total_price", "sum"))
            .reset_index()
            .sort_values(by="units_sold", ascending=False)
            .head(limit)
        )
        top_list = top_df.to_dict(orient="records")
    else:
        top_list = []

    # 1.5 Reports(Top Movers) - Left join keeps never-sold parts as slow movers.
    merged = pd.merge(
        parts_df, sales_df, on="part_id", how="left", suffixes=("", "_sold")
    )

    # 1.6 Reports(Top Movers) - Missing sales become zero units for those parts.
    merged["quantity"] = merged["quantity"].fillna(0)

    # 1.7 Reports(Top Movers) - Fewest sales first; most stock on hand breaks ties.
    slow_df = (
        merged.groupby(
            ["part_id", "part_number", "name", "category", "current_stock"]
        )
        .agg(units_sold=("quantity", "sum"))
        .reset_index()
        .sort_values(by=["units_sold", "current_stock"], ascending=[True, False])
        .head(limit)
    )
    slow_list = slow_df.to_dict(orient="records")

    # 1.8 Reports(Top Movers) - Convert NumPy numbers so FastAPI can send JSON.
    for item in top_list:
        item["part_id"] = as_int(item["part_id"])
        item["units_sold"] = as_int(item["units_sold"])
        item["revenue"] = as_float(item["revenue"])

    for item in slow_list:
        item["part_id"] = as_int(item["part_id"])
        item["units_sold"] = as_int(item["units_sold"])
        item["current_stock"] = as_int(item["current_stock"])

    # 1.9 Reports(Top Movers) - Final top/slow payload for the Reports page.
    return {"top": top_list, "slow": slow_list}
