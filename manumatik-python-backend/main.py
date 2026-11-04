from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.reports import router as reports_router

app = FastAPI(title="Manumatik Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])


@app.get("/")
def read_root():
    return {"message": "Manumatik Python Analytics Backend is running!"}
