export interface DetectionItem {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  is_violation: boolean;
}

export interface CameraStatus {
  camera_id: string;
  name: string;
  source_type: 'webcam' | 'ip_camera';
  source_address: string;
  is_active: boolean;
  status: 'online' | 'offline' | 'connecting' | 'error';
  fps: number;
  last_inference_time?: string;
  total_detections: number;
  class_counts: Record<string, number>;
  violations_count: number;
  error_message?: string;
}

export interface RealtimeTelemetry {
  timestamp: string;
  cameras: Record<string, CameraStatus>;
  system: {
    total_active_detections: number;
    total_active_violations: number;
    cameras_online: number;
    model_loaded: boolean;
    inference_fps: number;
    device: string;
    esp32_enabled: boolean;
    esp32_port: string;
    esp32_status: string;
  };
}

export interface AlertRule {
  id: string;
  class_name: string;
  label: string;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  cooldown_seconds: number;
}

export interface SafetyAlert {
  id: string;
  camera_id: string;
  camera_name: string;
  class_name: string;
  confidence: number;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  snapshot_url?: string;
}

export interface SafetyEvent {
  id: string;
  timestamp: string;
  camera_id: string;
  camera_name: string;
  class_name: string;
  confidence: number;
  severity: 'critical' | 'warning' | 'info';
  is_violation: boolean;
  status: string;
}

export interface ModelInfo {
  model_name: string;
  model_path: string;
  status: 'loaded' | 'error' | 'not_found';
  device: string;
  total_classes: number;
  class_names: Record<number, string>;
  compliance_classes: string[];
  violation_classes: string[];
  inference_fps: number;
  confidence_threshold: number;
  iou_threshold: number;
}

export interface SystemSettings {
  camera1_index: number;
  camera1_name: string;
  camera2_url: string;
  camera2_name: string;
  confidence_threshold: number;
  iou_threshold: number;
  alert_cooldown_seconds: number;
  auto_reconnect: boolean;
  alert_rules: AlertRule[];
  esp32_enabled: boolean;
  esp32_com_port: string;
  esp32_baud_rate: number;
  esp32_status?: string;
}

export interface AnalyticsSummary {
  total_detections_today: number;
  total_violations_today: number;
  alerts_by_camera: Record<string, number>;
  alerts_by_severity: Record<string, number>;
  class_distribution: Record<string, number>;
  hourly_trends: Array<{
    hour: string;
    detections: number;
    violations: number;
  }>;
}
