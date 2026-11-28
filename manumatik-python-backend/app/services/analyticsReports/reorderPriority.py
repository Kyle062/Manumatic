"""
Reorder priority report: low-stock parts ranked by shortage and demand.
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


# 1.Reports(Reorder Priority) - Showing what to restock first and how urgently.
def get_reorder_priority_report_analytics(
    limit: int = 5, range_type: str = "month"
):
    # 1.1 Reports(Reorder Priority) - Use the selected range for demand ranking.
    date_filter = get_range_filter(range_type)

    # 1.2 Reports(Reorder Priority) - Fetch parts that are at or below reorder level.
    with mysql_connection() as conn:
        parts_df = pd.read_sql(
            """
            SELECT part_id, part_number, name, category, quantity, reorder_level, price
            FROM parts
            WHERE quantity <= reorder_level
            """,
            conn,
        )

        # 1.3 Reports(Reorder Priority) - Fetch sales to rank by range demand.
        sales_df = pd.read_sql(
            f"SELECT s.part_id, s.quantity FROM sales s WHERE {date_filter}",
            conn,
        )

    # 1.4 Reports(Reorder Priority) - Return an empty list when stock is healthy.
    if parts_df.empty:
        return []

    # 1.5 Reports(Reorder Priority) - Sum range units sold per part.
    if sales_df.empty:
        recent_df = pd.DataFrame(columns=["part_id", "recent_sales"])
    else:
        recent_df = (
            sales_df.groupby("part_id")["quantity"]
            .sum()
            .rename("recent_sales")
            .reset_index()
        )

    # 1.6 Reports(Reorder Priority) - Left join keeps parts with zero recent sales.
    merged = parts_df.merge(recent_df, on="part_id", how="left")
    merged["recent_sales"] = merged["recent_sales"].fillna(0)

    # 1.7 Reports(Reorder Priority) - Deficit = units to order; cost = deficit × price.
    merged["deficit"] = merged["reorder_level"] - merged["quantity"]
    merged["price"] = merged["price"].astype(float)
    merged["restock_cost"] = merged["deficit"] * merged["price"]

    # 1.8 Reports(Reorder Priority) - Label urgency from stock and shortage size.
    def set_urgency(row):
        if row["quantity"] == 0:
            return "critical"
        if row["deficit"] > 5:
            return "high"
        return "medium"

    merged["urgency"] = merged.apply(set_urgency, axis=1)

    # 1.9 Reports(Reorder Priority) - Biggest shortage and demand go first.
    merged = merged.sort_values(
        by=["deficit", "recent_sales"], ascending=[False, False]
    ).head(limit)

    # 1.10 Reports(Reorder Priority) - Convert rows to JSON-safe records.
    result = merged.to_dict(orient="records")
    for item in result:
        item["part_id"] = as_int(item["part_id"])
        item["quantity"] = as_int(item["quantity"])
        item["reorder_level"] = as_int(item["reorder_level"])
        item["deficit"] = as_int(item["deficit"])
        item["recent_sales"] = as_int(item["recent_sales"])
        item["price"] = as_float(item["price"])
        item["restock_cost"] = as_float(item["restock_cost"])

    # 1.11 Reports(Reorder Priority) - Final prioritized restock list.
    return result
