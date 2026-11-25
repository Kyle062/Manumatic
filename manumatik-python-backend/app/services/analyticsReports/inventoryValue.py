"""
Inventory valuation report: stock value overall and per category.
Each numbered block shows the database query and the Pandas work done on it.
"""

# 0.Dependencies - Pandas and the shared MySQL engine.
import pandas as pd
from app.database import engine


# 1.Reports(Inventory Valuation) - Showing how much the stock is worth.
def get_inventory_valuation_analytics():
    # 1.1 Reports(Inventory Valuation) - Fetch all parts with stock and price.
    query = "SELECT part_id, category, quantity, price, reorder_level FROM parts"

    # 1.2 Reports(Inventory Valuation) - Load the catalog into a DataFrame.
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

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
            "by_category": [],
        }

    # 1.5 Reports(Inventory Valuation) - Line value = units on hand × selling price.
    df["value"] = df["quantity"] * df["price"]

    # 1.6 Reports(Inventory Valuation) - Sum overall parts, units, and peso value.
    total_parts = int(df["part_id"].nunique())
    total_units = int(df["quantity"].sum())
    total_value = float(df["value"].sum())

    # 1.7 Reports(Inventory Valuation) - Group parts into categories by value.
    category_df = (
        df.groupby("category")
        .agg(part_count=("part_id", "count"), units=("quantity", "sum"), value=("value", "sum"))
        .reset_index()
        .sort_values("value", ascending=False)
    )
    by_category = []
    for row in category_df.to_dict(orient="records"):
        by_category.append(
            {
                "category": str(row["category"]),
                "part_count": int(row["part_count"]),
                "units": int(row["units"]),
                "value": float(row["value"]),
            }
        )

    # 1.8 Reports(Inventory Valuation) - Flag low-stock parts and their tied-up value.
    low_stock = df[df["quantity"] <= df["reorder_level"]]
    low_stock_count = int(len(low_stock))
    at_risk_value = float(low_stock["value"].sum())

    # 1.9 Reports(Inventory Valuation) - Final valuation payload for the report.
    return {
        "total_parts": total_parts,
        "total_units": total_units,
        "total_value": total_value,
        "low_stock_count": low_stock_count,
        "at_risk_value": at_risk_value,
        "by_category": by_category,
    }
