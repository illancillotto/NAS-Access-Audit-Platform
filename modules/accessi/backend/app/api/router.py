from fastapi import APIRouter

from app.api.routes import audit, auth, catasto, health, permissions, sync
from app.api.routes.admin_users import router as admin_users_router
from app.api.routes.section_permissions import (
    admin_permissions_router,
    auth_permissions_router,
    sections_router,
)

api_router = APIRouter()
api_router.include_router(audit.router)
api_router.include_router(auth.router)
api_router.include_router(catasto.router)
api_router.include_router(health.router, tags=["health"])
api_router.include_router(permissions.router)
api_router.include_router(sync.router)
api_router.include_router(admin_users_router)
api_router.include_router(auth_permissions_router)
api_router.include_router(sections_router)
api_router.include_router(admin_permissions_router)
