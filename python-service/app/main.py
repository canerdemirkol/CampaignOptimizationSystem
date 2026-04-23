"""
FastAPI Main Application
Master Prompt Section 1.3 - Python Hesaplama Servisi
"""
import logging
import time
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.endpoints import optimization, health
from app.utils.logging_config import setup_logging

# Load environment variables from .env file
load_dotenv()

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("Starting Campaign Optimization Service...")
    yield
    logger.info("Shutting down Campaign Optimization Service...")


app = FastAPI(
    title="Campaign Optimization Service",
    description="FastAPI service for campaign optimization using PySCIPOpt",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    """Add correlation ID to requests for tracing"""
    correlation_id = request.headers.get("X-Correlation-ID", f"gen-{int(time.time() * 1000)}")
    request.state.correlation_id = correlation_id

    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Process-Time"] = str(process_time)

    logger.info(
        "Request completed",
        extra={
            "trace.id": correlation_id,
            "http.request.method": request.method,
            "url.path": request.url.path,
            "event.duration": int(process_time * 1_000_000_000),  # seconds to nanoseconds (ECS)
            "http.response.status_code": response.status_code,
        }
    )

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={"trace.id": correlation_id, "error.message": str(exc)},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "correlation_id": correlation_id,
        },
    )


# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(optimization.router, prefix="/optimization", tags=["Optimization"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
