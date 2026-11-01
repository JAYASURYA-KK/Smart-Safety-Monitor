from typing import Optional, List
from fastapi import APIRouter
from ..models.database import db

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get("")
def get_events(
    search: Optional[str] = None,
    camera_id: Optional[str] = None,
    class_name: Optional[str] = None,
    severity: Optional[str] = None,
):
    """
    Fetch historical safety and detection events from SQLite storage.db.
    Supports search filtering by class name, event ID, camera, and severity.
    """
    return db.get_events(
        search=search,
        camera_id=camera_id,
        class_name=class_name,
        severity=severity,
    )
