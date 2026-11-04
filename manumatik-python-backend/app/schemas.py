from pydantic import BaseModel
from typing import List

class SoldPart(BaseModel):
    part_id: int
    part_number: str
    name: str
    quantity_sold: int
    revenue: float

class DailyData(BaseModel):
    day: str
    revenue: float
    transactions: int
    parts_sold: List[SoldPart]

class SalesOverviewResponse(BaseModel):
    range: str
    total_revenue: float
    transaction_count: int
    unique_parts_sold: int
    avg_transaction: float
    daily: List[DailyData]

class TopMoverPart(BaseModel):
    part_id: int
    part_number: str
    name: str
    category: str
    units_sold: int
    revenue: float

class SlowMoverPart(BaseModel):
    part_id: int
    part_number: str
    name: str
    category: str
    current_stock: int
    units_sold: int

class TopMoversResponse(BaseModel):
    top: List[TopMoverPart]
    slow: List[SlowMoverPart]