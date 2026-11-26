# 0.Dependencies - FastAPI, CORS, and the three feature routers.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.routers.dashboard as dashboard_module
import app.routers.reports as reports_module
import app.routers.scanner as scanner_module


# 1.App - Create the API and allow the React dev server origins.
app = FastAPI(title="Manumatik Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2.Routes - Mount dashboard, reports, and scanner under /api.
app.include_router(dashboard_module.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(reports_module.router, prefix="/api/reports", tags=["Reports"])
app.include_router(scanner_module.router, prefix="/api/scanner", tags=["Scanner"])


# 3.Health - Simple checks used by the dev watcher and browser status bridge.
@app.get("/")
def read_root():
    return {"message": "Manumatik Python Backend is running!"}


@app.get("/health")
def health():
    return {"status": "OK", "service": "Manumatik Python API"}
