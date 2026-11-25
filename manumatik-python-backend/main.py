from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.routers.reports as reports_module
import app.routers.scanner as scanner_module  # ✅ Add this

app = FastAPI(title="Manumatik Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports_module.router, prefix="/api/reports", tags=["Reports"])
app.include_router(scanner_module.router, prefix="/api/scanner", tags=["Scanner"]) # ✅ Add this

@app.get("/")
def read_root():
    return {"message": "Manumatik Python Backend is running!"}

@app.get("/health")
def health():
    return {"status": "OK", "service": "Manumatik Python API"}