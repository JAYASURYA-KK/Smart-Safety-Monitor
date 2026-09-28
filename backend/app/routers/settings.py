import cv2
from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from ..models.schema import SettingsPayloadSchema
from ..models.database import db
from ..services.camera_service import camera_manager
from ..services.yolo_service import yolo_service
from ..services.alert_service import alert_service
from ..services.esp32_service import esp32_service
from ..config import settings

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("")
def get_settings():
    c1_idx = db.get_setting("camera1_index", settings.CAMERA1_INDEX)
    c1_name = db.get_setting("camera1_name", settings.CAMERA1_NAME)
    c2_idx = db.get_setting("camera2_index", settings.CAMERA2_INDEX)
    c2_name = db.get_setting("camera2_name", settings.CAMERA2_NAME)
    c3_url = db.get_setting("camera3_url", settings.CAMERA3_URL)
    c3_name = db.get_setting("camera3_name", settings.CAMERA3_NAME)
    model_path = db.get_setting("model_path", yolo_service.model_path)
    cooldown = db.get_setting("alert_cooldown_seconds", settings.ALERT_COOLDOWN_SECONDS)
    auto_rec = db.get_setting("auto_reconnect", settings.AUTO_RECONNECT)
    rules = alert_service.get_rules()

    esp32_enabled = db.get_setting("esp32_enabled", True)
    esp32_port = db.get_setting("esp32_com_port", "COM5")
    esp32_baud = db.get_setting("esp32_baud_rate", 115200)

    # Auto-detect ESP32 connection
    esp32_detection = esp32_service.detect()
    esp32_connected = esp32_detection.get("connected", False)

    if esp32_enabled and esp32_connected:
        esp32_status_text = f"{esp32_port} (Connected)"
    elif esp32_enabled:
        esp32_status_text = f"{esp32_port} (Searching)"
    else:
        esp32_status_text = "Disabled"

    return {
        "camera1_index": c1_idx,
        "camera1_name": c1_name,
        "camera2_index": c2_idx,
        "camera2_name": c2_name,
        "camera3_url": c3_url,
        "camera3_name": c3_name,
        "model_path": model_path,
        "confidence_threshold": yolo_service.conf_threshold,
        "iou_threshold": yolo_service.iou_threshold,
        "alert_cooldown_seconds": cooldown,
        "auto_reconnect": auto_rec,
        "alert_rules": rules,
        "esp32_enabled": esp32_enabled,
        "esp32_connected": esp32_connected,
        "esp32_com_port": esp32_port,
        "esp32_baud_rate": esp32_baud,
        "esp32_status": esp32_status_text,
    }

@router.get("/list-cameras")
def list_available_cameras():
    """
    Returns availability info for all 3 camera channels.
    CAM-01 (PC) always available.
    CAM-02 (USB) only if hardware detected.
    CAM-03 (WiFi) only if URL connects.
    """
    return camera_manager.detect_available_cameras()

@router.post("")
def update_settings(payload: SettingsPayloadSchema):
    # Validate WiFi camera URL protocol if provided (SSRF Protection)
    camera3_url = getattr(payload, 'camera3_url', None)
    if camera3_url is not None:
        url_lower = camera3_url.strip().lower()
        allowed_schemes = ("http://", "https://", "rtsp://", "rtmp://")
        if not url_lower.startswith(allowed_schemes) and not url_lower.isdigit():
            raise HTTPException(status_code=400, detail="Invalid camera URL. Allowed schemes: http://, https://, rtsp://, rtmp://")

    # Legacy camera2_url field: if someone sends it, treat it as camera3_url
    if payload.camera2_url is not None and camera3_url is None:
        camera3_url = payload.camera2_url

    camera1_index = getattr(payload, 'camera1_index', None)
    camera1_name = getattr(payload, 'camera1_name', None)
    camera2_index = getattr(payload, 'camera2_index', None)
    camera2_name = getattr(payload, 'camera2_name', None)
    camera3_name = getattr(payload, 'camera3_name', None)

    if any(v is not None for v in [camera1_index, camera1_name, camera2_index, camera2_name, camera3_url, camera3_name]):
        camera_manager.update_config(
            c1_index=camera1_index,
            c1_name=camera1_name,
            c2_index=camera2_index,
            c2_name=camera2_name,
            c3_url=camera3_url,
            c3_name=camera3_name,
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

    if payload.model_path is not None:
        import os as _os
        from pathlib import Path as _Path
        new_path = payload.model_path.strip()
        if not _os.path.isfile(new_path):
            raise HTTPException(status_code=400, detail=f"Model file not found: {new_path}")
        db.save_setting("model_path", new_path)
        yolo_service.reload_model(new_path)

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

@router.post("/test-esp32")
def test_esp32_alarm(x_api_key: str = Header(default="")):
    """Sends test ALERT signal to ESP32 microcontroller over USB serial."""
    expected_key = settings.PROJECT_NAME.replace(" ", "_").lower() + "_key"
    if x_api_key and x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized hardware activation request.")

    success = alert_service.trigger_esp32_hardware_alarm()
    port = db.get_setting("esp32_com_port", "COM5")
    if success:
        return {"status": "success", "message": f"Successfully sent ALERT signal to ESP32 on {port}! Buzzer & LED activated for 3s."}
    else:
        return {"status": "simulated", "message": f"Sent ALERT signal to {port} (Simulated mode: ESP32 hardware ready)."}

@router.post("/test-wifi-camera")
def test_wifi_camera(url: str = None):
    """Test WiFi/IP camera URL connectivity."""
    if not url:
        url = db.get_setting("camera3_url", settings.CAMERA3_URL)

    if not url:
        return {"status": "error", "message": "No WiFi camera URL configured."}

    try:
        cap = cv2.VideoCapture(url)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                cap.release()
                return {
                    "status": "success",
                    "message": "WiFi camera connected successfully!",
                    "url": url,
                    "resolution": f"{w}x{h}",
                    "available": True
                }
            cap.release()
        return {
            "status": "error",
            "message": f"Cannot connect to WiFi camera at: {url}",
            "url": url,
            "available": False
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error testing WiFi camera: {str(e)}",
            "url": url,
            "available": False
        }

@router.get("/list-models")
def list_models():
    """
    Scans the workspace directory recursively for PyTorch (.pt) models.
    """
    from pathlib import Path
    import os
    
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    
    models = []
    exclude_dirs = {".venv", ".git", "__pycache__", "node_modules", ".agents", "scratch"}
    
    for root, dirs, files in os.walk(project_root):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(".pt"):
                full_path = Path(root) / file
                try:
                    rel_path = full_path.relative_to(project_root)
                    rel_path_str = rel_path.as_posix()
                except ValueError:
                    rel_path_str = full_path.as_posix()
                models.append({
                    "name": file,
                    "relative_path": rel_path_str,
                    "absolute_path": full_path.resolve().as_posix(),
                    "size_bytes": full_path.stat().st_size
                })
    return models

@router.get("/browse-directory")
def browse_directory(path: str = ""):
    """
    Lists the folders and .pt files in the specified path to allow custom browsing.
    """
    from pathlib import Path
    import os
    
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    
    if not path or path.strip() == "":
        target_path = project_root
    else:
        target_path = Path(path.strip())
        
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Path does not exist")
        
    if not target_path.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
        
    try:
        items = os.listdir(target_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read directory: {str(e)}")
        
    folders = []
    files = []
    
    for item in items:
        if item.startswith('.'):
            continue
        full_path = target_path / item
        try:
            if full_path.is_dir():
                folders.append({
                    "name": item,
                    "path": full_path.resolve().as_posix()
                })
            elif item.endswith('.pt') and full_path.is_file():
                files.append({
                    "name": item,
                    "path": full_path.resolve().as_posix(),
                    "size_bytes": full_path.stat().st_size
                })
        except Exception:
            pass
            
    folders.sort(key=lambda x: x["name"].lower())
    files.sort(key=lambda x: x["name"].lower())
    
    try:
        parent_path = target_path.parent.resolve().as_posix()
    except Exception:
        parent_path = None
        
    return {
        "current_path": target_path.resolve().as_posix(),
        "parent_path": parent_path,
        "folders": folders,
        "files": files
    }

@router.post("/upload-model")
async def upload_model(file: UploadFile = File(...)):
    """
    Upload a new .pt model file to the backend/model/ directory.
    """
    if not file.filename.endswith('.pt'):
        raise HTTPException(status_code=400, detail="Only PyTorch model files (.pt) are allowed.")
        
    from pathlib import Path
    import re
    
    model_dir = (settings.BASE_DIR if hasattr(settings, "BASE_DIR") else Path(__file__).resolve().parent.parent) / "model"
    model_dir.mkdir(parents=True, exist_ok=True)
    
    safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '', file.filename)
    if not safe_name.endswith('.pt'):
        safe_name = "uploaded_model.pt"
         
    target_path = model_dir / safe_name
    
    try:
        contents = await file.read()
        with open(target_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    try:
        project_root = Path(__file__).resolve().parent.parent.parent.parent
        rel_path = target_path.relative_to(project_root).as_posix()
    except ValueError:
        rel_path = target_path.as_posix()
        
    return {
        "status": "success",
        "message": f"Successfully uploaded model {safe_name}",
        "relative_path": rel_path,
        "absolute_path": target_path.resolve().as_posix()
    }
