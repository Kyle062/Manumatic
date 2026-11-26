# 0.Dependencies - Router, query params, PNG streaming, split analytics, schemas.
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from typing import List
from app.services import analyticsDashboard, analyticsReports, barcode
from app import schemas

router = APIRouter()


# 1.Reports(Sales Overview) - Serving the daily sales chart data.
@router.get("/sales-overview", response_model=schemas.SalesOverviewResponse)
def get_sales_overview(range: str = Query("today")):
    return analyticsDashboard.get_sales_overview_analytics(range)


# 2.Reports(Top Movers) - Serving the fastest and slowest selling parts.
@router.get("/top-movers", response_model=schemas.TopMoversResponse)
def get_top_movers(limit: int = Query(5)):
    return analyticsReports.get_top_movers_analytics(limit)


# 3.Reports(Reorder Priority) - Serving the urgent restock list from Reports analytics.
@router.get("/reorder-priority", response_model=List[schemas.ReorderPriorityReportItem])
def get_reorder_priority(limit: int = Query(5)):
    return analyticsReports.get_reorder_priority_report_analytics(limit)


# 4.Reports(Top Selling Parts) - Serving the dashboard best-sellers ranking.
@router.get("/top-selling", response_model=List[schemas.TopSellingPart])
def get_top_selling(limit: int = Query(5), range: str = Query("week")):
    return analyticsDashboard.get_top_selling_analytics(limit, range)


# 5.Reports(Today Sells) - Serving today's receipts for the Reports page.
@router.get("/today-sales", response_model=schemas.TodaySalesResponse)
def get_today_sales():
    return analyticsReports.get_today_sales_analytics()


# 6.Reports(Barcode Labels) - Streaming a printable PNG label for one part.
@router.get("/barcode")
def get_barcode(part_number: str, name: str, price: float):
    barcode_buffer = barcode.generate_barcode_image(part_number, name, price)
    return StreamingResponse(barcode_buffer, media_type="image/png")


# 7.Reports(Sales last 7 & 30 days) - Serving the period sales comparison.
@router.get("/period-sales", response_model=schemas.PeriodSalesResponse)
def get_period_sales(range: str = Query("week")):
    return analyticsReports.get_period_sales_analytics(range)


# 8.Reports(Inventory Valuation) - Serving the stock value and category breakdown.
@router.get("/inventory-valuation", response_model=schemas.InventoryValuationResponse)
def get_inventory_valuation():
    return analyticsReports.get_inventory_valuation_analytics()


# 9.Reports(Stock Forecast) - Serving the parts closest to running out.
@router.get("/stock-forecast", response_model=List[schemas.StockForecastItem])
def get_stock_forecast():
    return analyticsReports.get_stock_forecast_analytics()


# 10.Reports(Cashier Stats) - Serving the ranked cashier performance list.
@router.get("/cashier-stats", response_model=List[schemas.CashierStatItem])
def get_cashier_stats():
    return analyticsReports.get_cashier_stats_analytics()


# 11.Reports(Low Stock Forecast) - Serving the forecast under the frontend's route name.
@router.get("/low-stock-forecast", response_model=List[schemas.StockForecastItem])
def get_low_stock_forecast():
    return analyticsReports.get_stock_forecast_analytics()


# 12.Reports(Cashier Performance) - Serving cashier stats under the frontend's route name.
@router.get("/cashier-performance", response_model=List[schemas.CashierStatItem])
def get_cashier_performance():
    return analyticsReports.get_cashier_stats_analytics()
