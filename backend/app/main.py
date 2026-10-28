import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.database import init_db
from app.api.auth import router as auth_router
from app.api.incidents import router as incidents_router
from app.api.overview import router as overview_router

app = FastAPI(
    title="IncidentIQ API",
    description="AI-Powered Incident Investigation & Root Cause Analysis Platform",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database schema and seed demo account on startup
@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/health", tags=["Health"])
def health_check():
    """Real health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database": "sqlite",
        "capabilities": [
            "log_parsing",
            "metric_anomaly_detection",
            "trace_bottleneck_analysis",
            "deployment_correlation",
            "causal_hypothesis_ranking",
            "evidence_provenance"
        ]
    }

# Include API Routers
app.include_router(auth_router)
app.include_router(incidents_router)
app.include_router(overview_router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected server error occurred.",
            "error_type": type(exc).__name__,
            "message": str(exc)
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
