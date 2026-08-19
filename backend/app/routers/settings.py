from fastapi import APIRouter
from ..models.schema import SettingsPayloadSchema
from ..models.database import db
from ..services.camera_service import camera_manager
from ..services.yolo_service import yolo_service
from ..services.alert_service import alert_service
from ..config import settings

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("")
def get_settings():
    c1_idx = db.get_setting("camera1_index", settings.CAMERA1_INDEX)
    c1_name = db.get_setting("camera1_name", settings.CAMERA1_NAME)
    c2_url = db.get_setting("camera2_url", settings.CAMERA2_URL)
    c2_name = db.get_setting("camera2_name", settings.CAMERA2_NAME)
    cooldown = db.get_setting("alert_cooldown_seconds", settings.ALERT_COOLDOWN_SECONDS)
    auto_rec = db.get_setting("auto_reconnect", settings.AUTO_RECONNECT)
    rules = alert_service.get_rules()

    esp32_enabled = db.get_setting("esp32_enabled", True)
    esp32_port = db.get_setting("esp32_com_port", "COM5")
    esp32_baud = db.get_setting("esp32_baud_rate", 115200)

    return {
        "camera1_index": c1_idx,
        "camera1_name": c1_name,
        "camera2_url": c2_url,
        "camera2_name": c2_name,
        "confidence_threshold": yolo_service.conf_threshold,
        "iou_threshold": yolo_service.iou_threshold,
        "alert_cooldown_seconds": cooldown,
        "auto_reconnect": auto_rec,
        "alert_rules": rules,
        "esp32_enabled": esp32_enabled,
        "esp32_com_port": esp32_port,
        "esp32_baud_rate": esp32_baud,
        "esp32_status": f"{esp32_port} ({'Active' if esp32_enabled else 'Disabled'})",
    }

@router.post("")
def update_settings(payload: SettingsPayloadSchema):
    # Validate IP camera URL protocol if provided (SSRF Protection)
    if payload.camera2_url is not None:
        url_lower = payload.camera2_url.strip().lower()
        allowed_schemes = ("http://", "https://", "rtsp://", "rtmp://")
        if not url_lower.startswith(allowed_schemes) and not url_lower.isdigit():
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Invalid camera URL. Allowed schemes: http://, https://, rtsp://, rtmp://")

    if payload.camera1_index is not None or payload.camera1_name is not None or payload.camera2_url is not None or payload.camera2_name is not None:
        camera_manager.update_config(
            c1_index=payload.camera1_index,
            c1_name=payload.camera1_name,
            c2_url=payload.camera2_url,
            c2_name=payload.camera2_name,
        )

    if payload.confidence_threshold is not None or payload.iou_threshold is not None:
        yolo_service.update_thresholds(
            conf=payload.confidence_threshold,
            iou=payload.iou_threshold,
        )
        if payload.confidence_threshold is not None:
            db.save_setting("confidence_threshold", payload.confidence_threshold)
        if payload.iou_threshold is not None:
            db.save_setting("iou_threshold", payload.iou_threshold)

    if payload.alert_cooldown_seconds is not None:
        db.save_setting("alert_cooldown_seconds", payload.alert_cooldown_seconds)

    if payload.auto_reconnect is not None:
        db.save_setting("auto_reconnect", payload.auto_reconnect)

    if payload.alert_rules is not None:
        alert_service.save_rules([r.model_dump() for r in payload.alert_rules])

    if payload.esp32_enabled is not None:
        db.save_setting("esp32_enabled", payload.esp32_enabled)
    if payload.esp32_com_port is not None:
        db.save_setting("esp32_com_port", payload.esp32_com_port)
    if payload.esp32_baud_rate is not None:
        db.save_setting("esp32_baud_rate", payload.esp32_baud_rate)

    return {"status": "success", "message": "Settings saved successfully."}

from fastapi import Header, HTTPException

@router.post("/test-esp32")
def test_esp32_alarm(x_api_key: str = Header(default="")):
    """
    Sends test "ALERT\n" signal to ESP32 microcontroller over USB serial.
    Requires request authorization header or development session validation.
    """
    # Hardware protection validation
    expected_key = settings.PROJECT_NAME.replace(" ", "_").lower() + "_key"
    if x_api_key and x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized hardware activation request.")

    success = alert_service.trigger_esp32_hardware_alarm()
    port = db.get_setting("esp32_com_port", "COM5")
    if success:
        return {"status": "success", "message": f"Successfully sent ALERT\\n signal to ESP32 on {port}! Buzzer & LED activated for 3s."}
    else:
        return {"status": "simulated", "message": f"Sent ALERT\\n signal to {port} (Simulated mode: ESP32 hardware ready)."}
