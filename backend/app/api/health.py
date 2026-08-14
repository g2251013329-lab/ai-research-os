"""Health check endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from ..core.config import settings

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "version": settings.version}
