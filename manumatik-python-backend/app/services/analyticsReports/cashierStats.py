"""
Cashier stats report: sales performance for each user.
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


# 1.Reports(Cashier Stats) - Showing how each cashier is performing.
def get_cashier_stats_analytics(range_type: str = "all"):
    # 1.1 Reports(Cashier Stats) - Use the selected range inside the sales join.
    date_filter = get_range_filter(range_type)

    # 1.2 Reports(Cashier Stats) - Fetch users with their sales, keeping idle users.
    query = f"""
        SELECT u.user_id, u.name, u.role, s.receipt_no, s.total_price, s.sale_date
        FROM users u
        LEFT JOIN sales s ON s.user_id = u.user_id AND ({date_filter})
    """

    # 1.3 Reports(Cashier Stats) - Load the joined rows into a DataFrame.
    with mysql_connection() as conn:
        df = pd.read_sql(query, conn)

    # 1.4 Reports(Cashier Stats) - Return an empty list when there are no users.
    if df.empty:
        return []

    # 1.5 Reports(Cashier Stats) - Group per cashier: receipts, revenue, average, last sale.
    stats = (
        df.groupby(["user_id", "name", "role"])
        .agg(
            total_sales=("receipt_no", "nunique"),
            total_revenue=("total_price", "sum"),
            avg_transaction=("total_price", "mean"),
            last_sale=("sale_date", "max"),
        )
        .reset_index()
    )

    # 1.6 Reports(Cashier Stats) - Missing sales must become zero, not NaN.
    stats["total_revenue"] = stats["total_revenue"].fillna(0)
    stats["avg_transaction"] = stats["avg_transaction"].fillna(0)

    # 1.7 Reports(Cashier Stats) - Rank cashiers by revenue earned.
    stats = stats.sort_values("total_revenue", ascending=False)

    # 1.8 Reports(Cashier Stats) - Convert rows to JSON-safe records.
    result = []
    for row in stats.to_dict(orient="records"):
        last = row["last_sale"]
        result.append(
            {
                "user_id": as_int(row["user_id"]),
                "name": str(row["name"]),
                "role": str(row["role"]),
                "total_sales": as_int(row["total_sales"]),
                "total_revenue": as_float(row["total_revenue"]),
                "avg_transaction": as_float(row["avg_transaction"]),
                "last_sale": None if pd.isna(last) else str(last),
            }
        )

    # 1.9 Reports(Cashier Stats) - Final ranked cashier performance list.
    return result
