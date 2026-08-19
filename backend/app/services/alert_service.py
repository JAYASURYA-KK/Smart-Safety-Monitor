import time
import uuid
import serial
import threading
from datetime import datetime
from typing import List, Dict, Any, Tuple
from ..models.schema import AlertRuleSchema
from ..models.database import db

class AlertService:
    """
    Configurable Safety Alert Engine with Physical ESP32 IoT Microcontroller Integration.
    Evaluates detections against configured rules.
    Enforces a 5-second cooldown per (camera_id, class_name) to avoid alert spamming.
    Sends "ALERT\n" over USB Serial (115200 baud) to trigger physical ESP32 Buzzer + LED.
    """
    def __init__(self):
        self.default_rules = [
            AlertRuleSchema(id="r1", class_name="no_helmet", label="No Helmet Violation", severity="critical", enabled=True, cooldown_seconds=5),
            AlertRuleSchema(id="r2", class_name="no_goggle", label="No Goggles Warning", severity="warning", enabled=True, cooldown_seconds=5),
            AlertRuleSchema(id="r3", class_name="no_gloves", label="No Gloves Warning", severity="warning", enabled=True, cooldown_seconds=5),
            AlertRuleSchema(id="r4", class_name="no_boots", label="No Boots Warning", severity="warning", enabled=True, cooldown_seconds=5),
        ]
        self._init_rules()
        self.cooldown_cache: Dict[Tuple[str, str], float] = {}

    def _init_rules(self):
        saved_rules = db.get_setting("alert_rules")
        if not saved_rules:
            db.save_setting("alert_rules", [r.model_dump() for r in self.default_rules])

    def get_rules(self) -> List[Dict[str, Any]]:
        rules = db.get_setting("alert_rules")
        if not rules:
            return [r.model_dump() for r in self.default_rules]
        return rules

    def save_rules(self, rules: List[Dict[str, Any]]):
        db.save_setting("alert_rules", rules)

    def trigger_esp32_hardware_alarm(self) -> bool:
        """
        Sends "ALERT\n" signal over USB Serial (e.g. COM5, 115200 baud) to ESP32 Base Station.
        Triggers Pin 4 (Piezo Buzzer) & Pin 2 (LED) for 3 seconds.
        """
        enabled = db.get_setting("esp32_enabled", True)
        if not enabled:
            return False

        com_port = db.get_setting("esp32_com_port", "COM5")
        baud = db.get_setting("esp32_baud_rate", 115200)

        try:
            with serial.Serial(com_port, baud, timeout=1) as ser:
                ser.write(b"ALERT\n")
                print(f"[ESP32 IoT Serial] Sent 'ALERT\\n' signal to {com_port} ({baud} baud) -> Buzzer & LED Activated for 3s!")
                return True
        except Exception as e:
            print(f"[ESP32 IoT Serial] Physical hardware at {com_port} not connected ({e}). Simulated 'ALERT\\n' trigger sent to logs.")
            return False

    def process_detections(self, camera_id: str, camera_name: str, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        rules = self.get_rules()
        rule_map = {r["class_name"]: r for r in rules if r.get("enabled", True)}
        
        now = time.time()
        generated_alerts = []

        for det in detections:
            cls_name = det["class_name"]
            conf = det["confidence"]
            
            if cls_name in rule_map:
                rule = rule_map[cls_name]
                cache_key = (camera_id, cls_name)
                cooldown_sec = rule.get("cooldown_seconds", 5)
                
                last_triggered = self.cooldown_cache.get(cache_key, 0)
                if now - last_triggered >= cooldown_sec:
                    self.cooldown_cache[cache_key] = now
                    
                    alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
                    timestamp = datetime.now().isoformat()
                    severity = rule.get("severity", "critical")
                    
                    alert_data = {
                        "id": alert_id,
                        "camera_id": camera_id,
                        "camera_name": camera_name,
                        "class_name": cls_name,
                        "confidence": round(conf, 3),
                        "severity": severity,
                        "timestamp": timestamp,
                        "status": "active"
                    }
                    
                    db.save_alert(alert_data)
                    generated_alerts.append(alert_data)
                    
                    # Trigger physical ESP32 Alarm Hardware Signal asynchronously (non-blocking)
                    threading.Thread(target=self.trigger_esp32_hardware_alarm, daemon=True).start()

        return generated_alerts

alert_service = AlertService()
