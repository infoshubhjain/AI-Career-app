"""
Health check endpoint for monitoring and load balancers.
"""

from datetime import datetime
from fastapi import APIRouter, status
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: str
    version: str
    app_name: str


class DetailedHealthResponse(HealthResponse):
    """Detailed health check response with service statuses."""
    services: dict


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Basic health check endpoint for load balancers and monitoring.",
)
async def health_check() -> HealthResponse:
    """
    Basic health check endpoint.
    Returns the application status, version, and current timestamp.
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version=settings.APP_VERSION,
        app_name=settings.APP_NAME,
    )


@router.get(
    "/health/detailed",
    response_model=DetailedHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Detailed Health Check",
    description="Detailed health check including service connectivity status.",
)
async def detailed_health_check() -> DetailedHealthResponse:
    """
    Detailed health check endpoint.
    Checks connectivity to external services (Supabase, etc.).
    """
    services = {
        "supabase": await check_supabase_connection(),
    }
    
    # Overall status is healthy only if all services are healthy
    overall_status = "healthy" if all(
        s["status"] == "healthy" for s in services.values()
    ) else "degraded"
    
    return DetailedHealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow().isoformat(),
        version=settings.APP_VERSION,
        app_name=settings.APP_NAME,
        services=services,
    )


async def check_supabase_connection() -> dict:
    """
    Check Supabase connection status.
    Returns service status dictionary.
    """
    # TODO: Implement actual Supabase connection check
    # For now, just check if credentials are configured
    if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
        return {
            "status": "healthy",
            "message": "Credentials configured",
        }
    else:
        return {
            "status": "unconfigured",
            "message": "Supabase credentials not set",
        }


