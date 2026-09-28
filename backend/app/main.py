import asyncio
import os
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import settings
from .routers import cameras, alerts, analytics, system, settings as settings_router, workers
from .websocket.manager import ws_manager
from .services.camera_service import camera_manager
from .services.yolo_service import yolo_service
from .services.esp32_service import esp32_service
from .models.database import db

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Real-time AI-powered Construction Site Safety Monitoring Backend",
)

# Secure CORS configuration
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-API-Key"],
)

# Include API Routers
app.include_router(cameras.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(system.router)
app.include_router(settings_router.router)
app.include_router(workers.router)

# Background async task for WebSocket Telemetry broadcasting
telemetry_task = None

async def telemetry_broadcast_loop():
    """
    Asynchronously broadcasts structured camera & system telemetry to all WebSocket clients.
    Frequency: ~2 Hz (every 500ms).
    """
    print("[Main] Telemetry WebSocket broadcast loop started.")
    while True:
        try:
            cam_statuses = camera_manager.get_all_statuses()
            
            total_active_detections = sum(s["total_detections"] for s in cam_statuses.values())
            total_active_violations = sum(s["violations_count"] for s in cam_statuses.values())
            cameras_online = sum(1 for s in cam_statuses.values() if s["status"] == "online")
            
            fps_list = [s["fps"] for s in cam_statuses.values() if s["fps"] > 0]
            avg_fps = int(sum(fps_list) / len(fps_list)) if fps_list else (20 if cameras_online > 0 else 0)

            # Auto-detect ESP32 hardware connection
            esp32_enabled = db.get_setting("esp32_enabled", True)
            esp32_port = db.get_setting("esp32_com_port", "COM7")
            esp32_detection = esp32_service.detect()
            esp32_connected = esp32_detection.get("connected", False)
            esp32_detected_port = esp32_detection.get("port", esp32_port)

            if esp32_enabled and esp32_connected:
                esp32_status_text = f"{esp32_detected_port or esp32_port} (Connected)"
            elif esp32_enabled:
                esp32_status_text = f"{esp32_port} (Searching)"
            else:
                esp32_status_text = "Disabled"

            telemetry_payload = {
                "timestamp": datetime.now().isoformat(),
                "cameras": cam_statuses,
                "system": {
                    "total_active_detections": total_active_detections,
                    "total_active_violations": total_active_violations,
                    "cameras_online": cameras_online,
                    "model_loaded": yolo_service.model is not None,
                    "inference_fps": avg_fps,
                    "device": yolo_service.device,
                    "esp32_enabled": esp32_enabled,
                    "esp32_connected": esp32_connected,
                    "esp32_port": esp32_detected_port or esp32_port,
                    "esp32_status": esp32_status_text,
                }
            }

            await ws_manager.broadcast(telemetry_payload)
        except Exception as e:
            print(f"[Main] Error in telemetry broadcast loop: {e}")
            
        await asyncio.sleep(0.5)

@app.on_event("startup")
async def on_startup():
    global telemetry_task
    print(f"[Main] Starting {settings.PROJECT_NAME} backend engine...")
    # Start background WebSocket broadcast task
    telemetry_task = asyncio.create_task(telemetry_broadcast_loop())

@app.on_event("shutdown")
async def on_shutdown():
    global telemetry_task
    print(f"[Main] Shutting down backend engine and cleaning camera resources...")
    if telemetry_task:
        telemetry_task.cancel()
    # Stop background camera workers
    for cam_id in list(camera_manager.cameras.keys()):
        camera_manager.stop_camera(cam_id)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "model_loaded": yolo_service.model is not None,
        "model_classes": yolo_service.class_names,
        "device": yolo_service.device,
        "timestamp": datetime.now().isoformat(),
    }

@app.websocket("/ws/live-data")
async def websocket_endpoint(websocket: WebSocket):
    # Origin Handshake Verification (Security Policy Enforcement)
    origin = websocket.headers.get("origin")
    if origin and origin not in ALLOWED_ORIGINS:
        print(f"[WebSocket Security Warning] Rejected connection attempt from unauthorized origin: {origin}")
        await websocket.close(code=1008)  # Policy Violation
        return

    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep WebSocket connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        ws_manager.disconnect(websocket)

# Serve frontend static assets in production if they are built
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist_path):
    print(f"[Main] Mounting frontend static files from: {frontend_dist_path}")
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="static")
else:
    print(f"[Main] Frontend static files directory not found at: {frontend_dist_path}. Skipping static file mount.")
