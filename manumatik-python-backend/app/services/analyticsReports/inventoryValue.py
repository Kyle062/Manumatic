"""
Inventory valuation report: stock value overall and per category.
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


# 1.Reports(Inventory Valuation) - Showing how much the stock is worth.
def get_inventory_valuation_analytics(range_type: str = "today"):
    # 1.1 Reports(Inventory Valuation) - Apply the selected range to sales movement.
    date_filter = get_range_filter(range_type)

    # 1.2 Reports(Inventory Valuation) - Fetch all parts with stock and price.
    with mysql_connection() as conn:
        df = pd.read_sql(
            "SELECT part_id, category, quantity, price, reorder_level FROM parts",
            conn,
        )

        # 1.2.1 Reports(Inventory Valuation) - Range sales become category movement.
        sales_df = pd.read_sql(
            f"""
            SELECT p.category,
                   SUM(s.quantity)     AS units_sold,
                   SUM(s.total_price)  AS sold_revenue
            FROM sales s
            JOIN parts p ON s.part_id = p.part_id
            WHERE {date_filter}
            GROUP BY p.category
            """,
            conn,
        )

    # 1.3 Reports(Inventory Valuation) - Convert Decimal prices to plain floats.
    df["price"] = df["price"].astype(float)

    # 1.4 Reports(Inventory Valuation) - Return zeros for an empty catalog.
    if df.empty:
        return {
            "total_parts": 0,
            "total_units": 0,
            "total_value": 0.0,
            "low_stock_count": 0,
            "at_risk_value": 0.0,
            "range_units_sold": 0,
            "range_revenue": 0.0,
            "by_category": [],
        }

    # 1.5 Reports(Inventory Valuation) - Line value = units on hand × selling price.
    df["value"] = df["quantity"] * df["price"]

    # 1.6 Reports(Inventory Valuation) - Sum overall parts, units, and peso value.
    total_parts = as_int(df["part_id"].nunique())
    total_units = as_int(df["quantity"].sum())
    total_value = as_float(df["value"].sum())

    # 1.7 Reports(Inventory Valuation) - Index range movement by category.
    movement_by_category = {}
    for row in sales_df.to_dict(orient="records"):
        movement_by_category[str(row["category"])] = {
            "units_sold": as_int(row["units_sold"]),
            "sold_revenue": as_float(row["sold_revenue"]),
        }

    range_units_sold = sum(
        item["units_sold"] for item in movement_by_category.values()
    )
    range_revenue = sum(item["sold_revenue"] for item in movement_by_category.values())

    # 1.8 Reports(Inventory Valuation) - Group parts into categories by value.
    category_df = (
        df.groupby("category")
        .agg(
            part_count=("part_id", "count"),
            units=("quantity", "sum"),
            value=("value", "sum"),
        )
        .reset_index()
        .sort_values("value", ascending=False)
    )

    by_category = []
    for row in category_df.to_dict(orient="records"):
        movement = movement_by_category.get(
            str(row["category"]), {"units_sold": 0, "sold_revenue": 0.0}
        )
        by_category.append(
            {
                "category": str(row["category"]),
                "part_count": as_int(row["part_count"]),
                "units": as_int(row["units"]),
                "value": as_float(row["value"]),
                "units_sold": movement["units_sold"],
                "sold_revenue": movement["sold_revenue"],
            }
        )

    # 1.9 Reports(Inventory Valuation) - Flag low-stock parts and their tied-up value.
    low_stock = df[df["quantity"] <= df["reorder_level"]]
    low_stock_count = as_int(len(low_stock))
    at_risk_value = as_float(low_stock["value"].sum())

    # 1.10 Reports(Inventory Valuation) - Final valuation payload for the report.
    return {
        "total_parts": total_parts,
        "total_units": total_units,
        "total_value": total_value,
        "low_stock_count": low_stock_count,
        "at_risk_value": at_risk_value,
        "range_units_sold": range_units_sold,
        "range_revenue": range_revenue,
        "by_category": by_category,
    }
