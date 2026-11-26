# 0.Dependencies - Pydantic shapes and validates the JSON sent to the frontend.
from pydantic import BaseModel
from typing import List, Optional


# 1.Schemas(Sales Overview) - One part's contribution to a day's sales.
class SoldPart(BaseModel):
    part_id: int
    part_number: str
    name: str
    quantity_sold: int
    revenue: float


# 2.Schemas(Sales Overview) - Per-day totals with the parts sold that day.
class DailyData(BaseModel):
    day: str
    revenue: float
    transactions: int
    parts_sold: List[SoldPart]


# 3.Schemas(Sales Overview) - Full response for the daily sales chart.
class SalesOverviewResponse(BaseModel):
    range: str
    total_revenue: float
    transaction_count: int
    unique_parts_sold: int
    avg_transaction: float
    daily: List[DailyData]


# 4.Schemas(Top Movers) - A fast-selling part and the revenue it produced.
class TopMoverPart(BaseModel):
    part_id: int
    part_number: str
    name: str
    category: str
    units_sold: int
    revenue: float


# 5.Schemas(Top Movers) - A slow-moving part and how much stock it still holds.
class SlowMoverPart(BaseModel):
    part_id: int
    part_number: str
    name: str
    category: str
    current_stock: int
    units_sold: int


# 6.Schemas(Top Movers) - Paired top and slow lists for the Reports page.
class TopMoversResponse(BaseModel):
    top: List[TopMoverPart]
    slow: List[SlowMoverPart]


# 7.Schemas(Needs Reordering) - One low-stock part with its order deficit.
class ReorderPriorityItem(BaseModel):
    part_id: int
    part_number: str
    name: str
    category: str
    quantity: int
    reorder_level: int
    deficit: int
    price: float
    restock_cost: float


# 8.Schemas(Top Selling Parts) - A ranked part from the dashboard best-sellers card.
class TopSellingPart(BaseModel):
    part_id: int
    part_number: str
    name: str
    category: str
    units_sold: int
    revenue: float


# 9.Schemas(Today Sells) - One purchased part line inside a receipt.
class TodaySaleItem(BaseModel):
    part_id: int
    part_number: str
    name: str
    quantity: int
    total_price: float


# 10.Schemas(Today Sells) - One receipt with its line items and total.
class TodayReceipt(BaseModel):
    receipt_no: str
    sold_at: str
    items: List[TodaySaleItem]
    total: float


# 11.Schemas(Today Sells) - Today's receipts plus the report headline totals.
class TodaySalesResponse(BaseModel):
    date: str
    transactions: int
    total_revenue: float
    receipts: List[TodayReceipt]


# 12.Schemas(Sales last 7 & 30 days) - One day inside the selected sales window.
class PeriodSalesDay(BaseModel):
    day: str
    revenue: float
    transactions: int
    units_sold: int


# 13.Schemas(Sales last 7 & 30 days) - Window totals plus the daily series.
class PeriodSalesResponse(BaseModel):
    range: str
    days: int
    total_revenue: float
    transaction_count: int
    units_sold: int
    avg_transaction: float
    daily: List[PeriodSalesDay]


# 14.Schemas(Inventory Valuation) - Stock value totals for one category.
class CategoryValuation(BaseModel):
    category: str
    part_count: int
    units: int
    value: float


# 15.Schemas(Inventory Valuation) - Warehouse totals, risk value, category breakdown.
class InventoryValuationResponse(BaseModel):
    total_parts: int
    total_units: int
    total_value: float
    low_stock_count: int
    at_risk_value: float
    by_category: List[CategoryValuation]


# 16.Schemas(Reorder Priority) - A low-stock part with demand and urgency.
class ReorderPriorityReportItem(BaseModel):
    part_id: int
    part_number: str
    name: str
    category: str
    quantity: int
    reorder_level: int
    deficit: int
    price: float
    recent_sales: int
    restock_cost: float
    urgency: str


# 17.Schemas(Stock Forecast) - A part at risk of running out of stock.
class StockForecastItem(BaseModel):
    part_id: int
    part_number: str
    name: str
    category: str
    current_stock: int
    reorder_level: int
    units_last_30d: int
    avg_daily_sales: float
    days_until_stockout: Optional[int]
    stockout_status: str


# 18.Schemas(Cashier Stats) - Sales performance for one cashier.
class CashierStatItem(BaseModel):
    user_id: int
    name: str
    role: str
    total_sales: int
    total_revenue: float
    avg_transaction: float
    last_sale: Optional[str]
