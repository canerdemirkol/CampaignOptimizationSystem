"""
Health check endpoints
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy", "service": "campaign-optimization"}


@router.get("/ready")
async def readiness_check():
    """Readiness check - verify service is ready to handle requests"""
    return {"status": "ready", "service": "campaign-optimization"}
