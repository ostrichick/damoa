"""
Damoa Backend - Main FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

from database import init_db
from routers import resume, jobs

load_dotenv()

# ---------------------------------------------------------------------------
# CORS Origins
# ---------------------------------------------------------------------------
_raw_origins = os.getenv("CORS_ORIGINS", "*")
if _raw_origins == "*" or not _raw_origins:
    CORS_ORIGINS = ["*"]
    ALLOW_CREDENTIALS = False
else:
    CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    ALLOW_CREDENTIALS = True


# ---------------------------------------------------------------------------
# Lifespan – runs once on startup / shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize resources on startup and clean up on shutdown."""
    print("[START] Damoa backend starting up...")
    await init_db()
    print("[OK] Database initialized")
    yield
    print("[STOP] Damoa backend shutting down...")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
def create_app() -> FastAPI:
    app = FastAPI(
        title="Damoa – Job Recommendation API",
        description=(
            "AI-powered job recommendation system. "
            "Upload your resume and get personalised job matches."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # -----------------------------------------------------------------------
    # CORS
    # -----------------------------------------------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=ALLOW_CREDENTIALS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -----------------------------------------------------------------------
    # Routers
    # -----------------------------------------------------------------------
    app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
    app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])

    # -----------------------------------------------------------------------
    # Static files (optional – e.g. uploaded resume files)
    # -----------------------------------------------------------------------
    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    # -----------------------------------------------------------------------
    # Health check & Root
    # -----------------------------------------------------------------------
    @app.get("/", tags=["Root"])
    async def root() -> JSONResponse:
        """Root endpoint – friendly welcome status."""
        return JSONResponse(
            content={
                "status": "ok",
                "service": "Damoa Backend API",
                "version": "1.0.0",
                "message": "Damoa backend is running live!",
                "docs": "/docs",
                "health": "/health",
            }
        )

    @app.get("/health", tags=["Health"])
    async def health_check() -> JSONResponse:
        """Liveness probe – returns 200 when the server is running."""
        return JSONResponse(
            content={
                "status": "ok",
                "service": "damoa-backend",
                "version": "1.0.0",
            }
        )

    return app


app = create_app()


# ---------------------------------------------------------------------------
# Dev entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
