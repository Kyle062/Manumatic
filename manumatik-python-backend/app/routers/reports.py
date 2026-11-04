from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from app.services import analytics, barcode
from app import schemas

router = APIRouter()

@router.get("/sales-overview", response_model=schemas.SalesOverviewResponse)
def get_sales_overview(range: str = Query("today")):
    return analytics.get_sales_overview_analytics(range)

@router.get("/top-movers", response_model=schemas.TopMoversResponse)
def get_top_movers(limit: int = Query(5)):
    return analytics.get_top_movers_analytics(limit)

# ✅ NEW ENDPOINT FOR BARCODE
@router.get("/barcode")
def get_barcode(part_number: str, name: str, price: float):
    barcode_buffer = barcode.generate_barcode_image(part_number, name, price)
    return StreamingResponse(barcode_buffer, media_type="image/png")