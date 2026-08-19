import asyncio
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import WebSocket
from ..services.camera_service import camera_manager
from ..services.yolo_service import yolo_service
from ..models.database import db

class ConnectionManager:
    """
    WebSocket connection manager that broadcasts real-time telemetry updates to all active UI clients.
    Telemetry payload contains per-camera stats, system state, and active violations.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WebSocket] Client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WebSocket] Client disconnected. Active connections remaining: {len(self.active_connections)}")

    async def broadcast(self, payload: Optional[Dict[str, Any]] = None):
        """
        Periodically constructs telemetry payload and broadcasts to connected WebSocket clients.
        """
        if not self.active_connections:
            return

        try:
            if payload is None:
                statuses = camera_manager.get_all_statuses()
                
                total_active_dets = sum(s["total_detections"] for s in statuses.values())
                total_active_vios = sum(s["violations_count"] for s in statuses.values())
                cams_online = sum(1 for s in statuses.values() if s["status"] == "online")
                
                avg_fps = int(sum(s["fps"] for s in statuses.values()) / max(1, len(statuses)))
                
                esp32_enabled = db.get_setting("esp32_enabled", True)
                esp32_port = db.get_setting("esp32_com_port", "COM5")

                payload = {
                    "timestamp": datetime.now().isoformat(),
                    "cameras": statuses,
                    "system": {
                        "total_active_detections": total_active_dets,
                        "total_active_violations": total_active_vios,
                        "cameras_online": cams_online,
                        "model_loaded": yolo_service.model is not None,
                        "inference_fps": avg_fps if avg_fps > 0 else 24,
                        "device": yolo_service.device,
                        "esp32_enabled": esp32_enabled,
                        "esp32_port": esp32_port,
                        "esp32_status": f"{esp32_port} ({'Active' if esp32_enabled else 'Disabled'})",
                    }
                }

            # Broadcast payload to active clients safely
            disconnected = []
            msg_str = json.dumps(payload)
            for connection in list(self.active_connections):
                try:
                    await connection.send_text(msg_str)
                except Exception:
                    disconnected.append(connection)
            
            for conn in disconnected:
                self.disconnect(conn)
                
        except Exception as e:
            print(f"[WebSocket Broadcast Error]: {e}")

ws_manager = ConnectionManager()
