from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..services.camera_service import camera_manager

import time

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])

# Cooldown tracking dict for hardware toggle rate-limiting
_toggle_cooldowns = {}

def _check_cooldown(cam_id: str):
    now = time.time()
    last = _toggle_cooldowns.get(cam_id, 0)
    if now - last < 1.0:
        raise HTTPException(status_code=429, detail="Too many camera control requests. Please wait a second.")
    _toggle_cooldowns[cam_id] = now

@router.get("")
def get_cameras():
    return camera_manager.get_all_statuses()

@router.post("/{cam_id}/start")
def start_camera(cam_id: str):
    _check_cooldown(cam_id)
    success = camera_manager.start_camera(cam_id)
    if not success:
        raise HTTPException(status_code=404, detail="Camera channel not found.")
    return {"status": "started", "camera_id": cam_id}

@router.post("/{cam_id}/stop")
def stop_camera(cam_id: str):
    _check_cooldown(cam_id)
    success = camera_manager.stop_camera(cam_id)
    if not success:
        raise HTTPException(status_code=404, detail="Camera channel not found.")
    return {"status": "stopped", "camera_id": cam_id}

@router.post("/{cam_id}/reconnect")
def reconnect_camera(cam_id: str):
    _check_cooldown(cam_id)
    success = camera_manager.reconnect_camera(cam_id)
    if not success:
        raise HTTPException(status_code=404, detail="Camera channel not found.")
    return {"status": "reconnected", "camera_id": cam_id}

@router.get("/{cam_id}/stream")
def video_stream(cam_id: str):
    """
    Returns high-reliability MJPEG video stream with no-cache headers.
    Only opens camera hardware when explicitly started by user.
    """
    norm_id = camera_manager._normalize_id(cam_id)
    if norm_id not in camera_manager.cameras:
        raise HTTPException(status_code=404, detail="Camera stream channel not found.")
    
    worker = camera_manager.cameras[norm_id]
        
    return StreamingResponse(
        worker.get_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )
