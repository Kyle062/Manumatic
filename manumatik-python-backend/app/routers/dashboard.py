# 0.Dependencies - Router, query params, and the merged dashboard analytics.
from fastapi import APIRouter, Query

from app.services import analyticsDashboard

router = APIRouter()


# 1.Dashboard(Stats) - Serving the top KPI cards.
@router.get("/stats")
def get_stats():
    return analyticsDashboard.get_dashboard_stats()


# 2.Dashboard(Transactions) - Serving the recent sales table.
@router.get("/transactions")
def get_transactions(limit: int = Query(6, ge=1, le=50)):
    return analyticsDashboard.get_dashboard_transactions(limit)


# 3.Dashboard(Activity Logs) - Serving the cashier activity feed.
@router.get("/logs")
def get_logs(limit: int = Query(6, ge=1, le=50)):
    return analyticsDashboard.get_dashboard_logs(limit)


# 4.Dashboard(Top Selling) - Serving the best-sellers ranking.
@router.get("/top-selling")
def get_top_selling(limit: int = Query(5, ge=1, le=20), range: str = "week"):
    return analyticsDashboard.get_dashboard_top_selling(limit, range)


# 5.Dashboard(Sales Trend) - Serving the area chart series.
@router.get("/sales-trend")
def get_sales_trend():
    return analyticsDashboard.get_dashboard_sales_trend()


# 6.Dashboard(Low Stock) - Serving the urgent restock card.
@router.get("/low-stock")
def get_low_stock(limit: int = Query(10, ge=1, le=50)):
    return analyticsDashboard.get_dashboard_low_stock(limit)
