from fastapi import APIRouter, Query
from app.services import analytics
from app import schemas

router = APIRouter()

@router.get("/sales-overview", response_model=schemas.SalesOverviewResponse)
def get_sales_overview(range: str = Query("today")):
    return analytics.get_sales_overview_analytics(range)


@router.get("/top-movers", response_model=schemas.TopMoversResponse)
def get_top_movers(limit: int = Query(5)):
    return analytics.get_top_movers_analytics(limit)