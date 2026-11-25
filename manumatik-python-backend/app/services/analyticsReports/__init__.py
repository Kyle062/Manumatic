"""
Reports analytics package: one file per report feature.
The router imports every report function through this package.
"""

# 0.Dependencies - Pull each feature's function into one router entry point.
from .salesOverview import get_today_sales_analytics, get_period_sales_analytics
from .inventoryValue import get_inventory_valuation_analytics
from .topMovers import get_top_movers_analytics
from .reorderPriority import get_reorder_priority_report_analytics
from .stockForecast import get_stock_forecast_analytics
from .cashierStats import get_cashier_stats_analytics

# 1.Package(Reports) - Functions exposed to the report routes.
__all__ = [
    "get_today_sales_analytics",
    "get_period_sales_analytics",
    "get_inventory_valuation_analytics",
    "get_top_movers_analytics",
    "get_reorder_priority_report_analytics",
    "get_stock_forecast_analytics",
    "get_cashier_stats_analytics",
]
