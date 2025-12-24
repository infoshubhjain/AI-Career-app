"""
AI Career App - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api import health
from contextlib import asynccontextmanager

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="AI Career App Backend API",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"📚 API docs available at: /docs")

    yield  # App runs here

    # Shutdown logic
    print(f"👋 Shutting down {settings.APP_NAME}")


@app.on_event("startup")
async def startup_event():
    """
    Application startup event handler.
    Initialize connections, load resources, etc.
    """
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"📚 API docs available at: /docs")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown event handler.
    Clean up resources, close connections, etc.
    """
    print(f"👋 Shutting down {settings.APP_NAME}")


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - returns basic API information.
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }

