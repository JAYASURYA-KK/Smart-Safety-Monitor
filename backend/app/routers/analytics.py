from typing import Optional
from fastapi import APIRouter
from ..services.event_service import event_service

router = APIRouter(prefix="/api", tags=["Analytics & Events"])

@router.get("/analytics")
def get_analytics():
    return event_service.get_analytics_summary()

@router.get("/events")
def get_events(
    search: Optional[str] = None,
    camera_id: Optional[str] = None,
    class_name: Optional[str] = None,
    severity: Optional[str] = None,
):
    return event_service.get_events(
        search=search,
        camera_id=camera_id,
        class_name=class_name,
        severity=severity,
    )
