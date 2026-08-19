from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class DetectionItemSchema(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    is_violation: bool

class CameraStatusSchema(BaseModel):
    camera_id: str
    name: str
    source_type: str  # 'webcam' | 'ip_camera'
    source_address: str
    is_active: bool
    status: str  # 'online' | 'offline' | 'connecting' | 'error'
    fps: int
    last_inference_time: Optional[str] = None
    total_detections: int
    class_counts: Dict[str, int]
    violations_count: int
    error_message: Optional[str] = None

class AlertRuleSchema(BaseModel):
    id: str
    class_name: str
    label: str
    severity: str  # 'critical' | 'warning' | 'info'
    enabled: bool
    cooldown_seconds: int

class SafetyAlertSchema(BaseModel):
    id: str
    camera_id: str
    camera_name: str
    class_name: str
    confidence: float
    severity: str
    timestamp: str
    status: str  # 'active' | 'acknowledged' | 'resolved'
    snapshot_url: Optional[str] = None

class SettingsPayloadSchema(BaseModel):
    camera1_index: Optional[int] = None
    camera1_name: Optional[str] = None
    camera2_url: Optional[str] = None
    camera2_name: Optional[str] = None
    confidence_threshold: Optional[float] = None
    iou_threshold: Optional[float] = None
    alert_cooldown_seconds: Optional[int] = None
    auto_reconnect: Optional[bool] = None
    alert_rules: Optional[List[AlertRuleSchema]] = None
    esp32_enabled: Optional[bool] = None
    esp32_com_port: Optional[str] = None
    esp32_baud_rate: Optional[int] = None
