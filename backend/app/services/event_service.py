import time
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..models.database import db

class EventService:
    """
    Logs all detection events (both compliance and violations) to Event History with a 3-second cooldown.
    """
    def __init__(self):
        self.cooldown_cache: Dict[tuple, float] = {}

    def log_detections(self, camera_id: str, camera_name: str, detections: List[Dict[str, Any]]):
        now_time = time.time()
        now_str = datetime.now().isoformat()
        
        for det in detections:
            cls_name = det["class_name"]
            is_vio = det["is_violation"]
            conf = det["confidence"]
            
            # Cooldown per (camera_id, class_name) to avoid database spamming every frame (3 sec cooldown)
            cache_key = (camera_id, cls_name)
            last_logged = self.cooldown_cache.get(cache_key, 0)
            
            if now_time - last_logged >= 3.0:
                self.cooldown_cache[cache_key] = now_time
                
                severity = "critical" if is_vio else "info"
                if cls_name in ["no_goggle", "no_gloves", "no_boots"]:
                    severity = "warning"
                elif not is_vio:
                    severity = "info"

                event_data = {
                    "id": f"EVT-{uuid.uuid4().hex[:6].upper()}",
                    "timestamp": now_str,
                    "camera_id": camera_id,
                    "camera_name": camera_name,
                    "class_name": cls_name,
                    "confidence": round(conf, 3),
                    "severity": severity,
                    "is_violation": is_vio,
                    "status": "RECORDED"
                }
                db.save_event(event_data)

    def get_events(self, search: Optional[str] = None, camera_id: Optional[str] = None, class_name: Optional[str] = None, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        return db.get_events(search=search, camera_id=camera_id, class_name=class_name, severity=severity)

    def get_analytics_summary(self) -> Dict[str, Any]:
        events = db.get_events()
        alerts = db.get_alerts()
        
        class_dist: Dict[str, int] = {}
        alerts_by_cam: Dict[str, int] = {}
        alerts_by_sev: Dict[str, int] = {}
        
        for ev in events:
            cls_name = ev["class_name"]
            class_dist[cls_name] = class_dist.get(cls_name, 0) + 1

        for alt in alerts:
            cam = alt["camera_id"]
            sev = alt["severity"]
            alerts_by_cam[cam] = alerts_by_cam.get(cam, 0) + 1
            alerts_by_sev[sev] = alerts_by_sev.get(sev, 0) + 1

        # Dynamic hourly trends calculation from actual database records (No hardcoding)
        hourly_map: Dict[str, Dict[str, int]] = {}
        for ev in events:
            try:
                ts_str = ev.get("timestamp", "")
                dt = datetime.fromisoformat(ts_str)
                hour_slot = dt.strftime("%H:00")
            except Exception:
                hour_slot = datetime.now().strftime("%H:00")
            
            if hour_slot not in hourly_map:
                hourly_map[hour_slot] = {"detections": 0, "violations": 0}
            
            hourly_map[hour_slot]["detections"] += 1
            if ev.get("is_violation"):
                hourly_map[hour_slot]["violations"] += 1

        sorted_hours = sorted(hourly_map.keys())
        hourly_trends = [
            {
                "hour": h,
                "detections": hourly_map[h]["detections"],
                "violations": hourly_map[h]["violations"]
            }
            for h in sorted_hours
        ]

        if not hourly_trends:
            now_h = datetime.now().hour
            slots = [f"{h:02d}:00" for h in range(max(0, now_h - 5), now_h + 1)]
            hourly_trends = [{"hour": h, "detections": 0, "violations": 0} for h in slots]

        return {
            "total_detections_today": len(events),
            "total_violations_today": len(alerts),
            "alerts_by_camera": alerts_by_cam,
            "alerts_by_severity": alerts_by_sev,
            "class_distribution": class_dist,
            "hourly_trends": hourly_trends
        }

event_service = EventService()
