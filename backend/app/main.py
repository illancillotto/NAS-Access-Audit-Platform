from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging()

app = FastAPI(
    title=settings.project_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(api_router)
