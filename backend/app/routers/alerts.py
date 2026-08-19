from typing import Optional, List
from fastapi import APIRouter, HTTPException
from ..models.database import db
from ..services.alert_service import alert_service

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("")
def get_alerts(status: Optional[str] = None):
    return db.get_alerts(status_filter=status)

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    success = db.update_alert_status(alert_id, "acknowledged")
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found.")
    return {"status": "acknowledged", "id": alert_id}

@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    success = db.update_alert_status(alert_id, "resolved")
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found.")
    return {"status": "resolved", "id": alert_id}

@router.get("/rules")
def get_alert_rules():
    return alert_service.get_rules()

@router.post("/rules")
def update_alert_rules(rules: List[dict]):
    alert_service.save_rules(rules)
    return {"status": "updated", "rules": rules}
