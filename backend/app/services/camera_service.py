import cv2
import time
import threading
import numpy as np
from datetime import datetime
from typing import Dict, Any, Generator, Optional
from ..config import settings
from .yolo_service import yolo_service
from .alert_service import alert_service
from .event_service import event_service
from ..models.database import db

class SingleCameraWorker:
    """
    Background worker thread for an individual camera stream.
    Handles OpenCV frame capture, YOLO model inference, FPS tracking, and MJPEG generation.
    Supports physical webcam, IP webcam URLs, local video files, and synthetic demo fallbacks.
    Camera hardware is strictly opened ONLY when user clicks Start and released when stopped.
    """
    def __init__(self, camera_id: str, name: str, source_type: str, source_address: Any):
        self.camera_id = camera_id
        self.name = name
        self.source_type = source_type  # 'webcam' | 'ip_camera' | 'file'
        self.source_address = source_address
        
        self.is_running = False
        self.status = "offline"  # 'online' | 'offline' | 'connecting' | 'error'
        self.error_message: Optional[str] = None
        
        self.cap: Optional[cv2.VideoCapture] = None
        self.thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()
        
        # Latest telemetry state
        self.latest_frame_bytes: Optional[bytes] = None
        self.fps = 0
        self.last_inference_time: Optional[str] = None
        self.total_detections = 0
        self.class_counts: Dict[str, int] = {}
        self.violations_count = 0
        self.use_simulated = False

    def start(self):
        with self.lock:
            if self.is_running:
                return
            self.is_running = True
            self.status = "connecting"
            self.error_message = None
            
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()

    def stop(self):
        with self.lock:
            self.is_running = False
            self.status = "offline"
            self.fps = 0
            self.latest_frame_bytes = None
            if self.cap:
                try:
                    self.cap.release()
                except Exception:
                    pass
                self.cap = None
        print(f"[{self.camera_id}] Camera released and status set to offline.")

    def _init_capture(self) -> bool:
        try:
            self.use_simulated = False
            addr = self.source_address
            
            if self.source_type == "webcam":
                try:
                    idx = int(addr)
                except Exception:
                    idx = 0
                
                # Try multiple camera indices (idx, 0, 1, 2) and backends on Windows
                backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]
                indices_to_try = [idx] + [i for i in range(4) if i != idx]
                
                opened = False
                for i in indices_to_try:
                    for backend in backends:
                        try:
                            cap_test = cv2.VideoCapture(i, backend)
                            if cap_test.isOpened():
                                # Retry up to 3 times to allow camera sensor warm-up
                                for retry in range(3):
                                    ret, frame = cap_test.read()
                                    if ret and frame is not None:
                                        self.cap = cap_test
                                        opened = True
                                        print(f"[{self.camera_id}] Opened physical webcam at index {i} with backend {backend}")
                                        break
                                    time.sleep(0.05)
                                if opened:
                                    break
                                cap_test.release()
                        except Exception:
                            pass
                    if opened:
                        break
                
                if not opened:
                    print(f"[{self.camera_id}] Could not open physical webcam (Index {addr}). Enabling AI Demo Stream Fallback.")
                    self.use_simulated = True
                    self.status = "online"
                    self.error_message = f"Webcam index {addr} not accessible. Using AI Demo Stream."
                    return True
                
                self.status = "online"
                return True
                
            else:
                # IP Camera URL or local file path
                self.cap = cv2.VideoCapture(str(addr))
                if not self.cap.isOpened():
                    self.status = "error"
                    self.error_message = f"Failed to open stream/file source: {addr}"
                    return False
                self.status = "online"
                return True
                
        except Exception as e:
            self.status = "error"
            self.error_message = str(e)
            return False

    def _generate_synthetic_frame(self, t: float) -> np.ndarray:
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.rectangle(frame, (0, 0), (640, 480), (30, 30, 35), -1)
        cv2.rectangle(frame, (20, 20), (620, 460), (45, 45, 50), -1)
        
        for y in range(40, 460, 60):
            cv2.line(frame, (20, y), (620, y), (55, 55, 60), 1)
            
        cv2.putText(frame, "SMART CONSTRUCTION MONITOR - AI DEMO CHANNEL", (40, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 255), 1)
        cv2.putText(frame, f"Channel: {self.name} | WebCam Fallback Engine", (40, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)

        # Worker 1 (Wearing Helmet & Vest)
        w1_x = int(120 + 80 * np.sin(t * 0.8))
        w1_y = 180
        cv2.rectangle(frame, (w1_x - 35, w1_y), (w1_x + 35, w1_y + 160), (200, 180, 160), -1)
        cv2.rectangle(frame, (w1_x - 40, w1_y + 40), (w1_x + 40, w1_y + 120), (20, 150, 230), -1)
        cv2.rectangle(frame, (w1_x - 45, w1_y - 30), (w1_x + 45, w1_y + 5), (30, 220, 255), -1)
        cv2.putText(frame, "WORKER 1 (COMPLIANT)", (w1_x - 60, w1_y - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 120), 1)

        # Worker 2 (No Helmet)
        w2_x = int(420 + 50 * np.cos(t * 0.6))
        w2_y = 200
        cv2.rectangle(frame, (w2_x - 35, w2_y), (w2_x + 35, w2_y + 160), (180, 150, 140), -1)
        cv2.circle(frame, (w2_x, w2_y - 15), 30, (120, 160, 200), -1)
        cv2.putText(frame, "WORKER 2 (NO HELMET)", (w2_x - 60, w2_y - 55), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (50, 50, 255), 1)

        return frame

    def _capture_loop(self):
        if not self._init_capture():
            self.is_running = False
            return

        frame_count = 0
        start_time = time.time()
        consecutive_read_failures = 0
        
        while self.is_running:
            raw_frame = None
            
            if self.use_simulated:
                t = time.time()
                raw_frame = self._generate_synthetic_frame(t)
            else:
                if self.cap and self.cap.isOpened():
                    ret, frame = self.cap.read()
                    if ret and frame is not None:
                        raw_frame = frame
                        consecutive_read_failures = 0
                    else:
                        consecutive_read_failures += 1
                        if consecutive_read_failures < 5:
                            time.sleep(0.03)
                            continue
                        
                        if self.source_type == "file":
                            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            consecutive_read_failures = 0
                            continue
                        elif settings.AUTO_RECONNECT and self.is_running:
                            self.status = "connecting"
                            time.sleep(1)
                            consecutive_read_failures = 0
                            self._init_capture()
                            continue
                        else:
                            self.status = "error"
                            self.error_message = "Stream disconnected."
                            break
                else:
                    break

            if raw_frame is None:
                time.sleep(0.05)
                continue

            # FPS calculation
            frame_count += 1
            now = time.time()
            if now - start_time >= 1.0:
                self.fps = int(frame_count / (now - start_time))
                frame_count = 0
                start_time = now

            # YOLO Inference
            annotated_frame, detections, class_counts = yolo_service.predict_and_annotate(raw_frame)
            violations = [d for d in detections if d.get("is_violation")]
            
            # Update state under lock
            with self.lock:
                self.total_detections = len(detections)
                self.class_counts = class_counts
                self.violations_count = len(violations)
                self.last_inference_time = datetime.now().isoformat()
                
                ret_jpg, buffer = cv2.imencode('.jpg', annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if ret_jpg:
                    self.latest_frame_bytes = buffer.tobytes()

            # Process Alert Rules & Event Logging for ALL DETECTED CLASSES
            if detections:
                alert_service.process_detections(self.camera_id, self.name, detections)
                event_service.log_detections(self.camera_id, self.name, detections)

            time.sleep(0.03)

        self.stop()

    def get_mjpeg_stream(self) -> Generator[bytes, None, None]:
        while True:
            frame_bytes = None
            is_active = False
            with self.lock:
                frame_bytes = self.latest_frame_bytes
                is_active = self.is_running
            
            if is_active and frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            else:
                blank = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(blank, f"{self.name} Offline", (160, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                _, buffer = cv2.imencode('.jpg', blank)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            
            time.sleep(0.08)

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "camera_id": self.camera_id,
                "name": self.name,
                "source_type": self.source_type,
                "source_address": str(self.source_address),
                "is_active": self.is_running,
                "status": self.status,
                "fps": self.fps,
                "last_inference_time": self.last_inference_time,
                "total_detections": self.total_detections,
                "class_counts": self.class_counts,
                "violations_count": self.violations_count,
                "error_message": self.error_message,
            }


class CameraManager:
    def __init__(self):
        c1_idx = db.get_setting("camera1_index", settings.CAMERA1_INDEX)
        c1_name = db.get_setting("camera1_name", settings.CAMERA1_NAME)
        c2_url = db.get_setting("camera2_url", settings.CAMERA2_URL)
        c2_name = db.get_setting("camera2_name", settings.CAMERA2_NAME)
        
        self.cameras: Dict[str, SingleCameraWorker] = {
            "1": SingleCameraWorker("CAM-01", c1_name, "webcam", c1_idx),
            "2": SingleCameraWorker("CAM-02", c2_name, "ip_camera", c2_url),
        }

    def _normalize_id(self, cam_id: str) -> str:
        if cam_id in ["CAM-01", "1", 1]:
            return "1"
        if cam_id in ["CAM-02", "2", 2]:
            return "2"
        return str(cam_id)

    def start_camera(self, cam_id: str) -> bool:
        key = self._normalize_id(cam_id)
        if key in self.cameras:
            self.cameras[key].start()
            return True
        return False

    def stop_camera(self, cam_id: str) -> bool:
        key = self._normalize_id(cam_id)
        if key in self.cameras:
            self.cameras[key].stop()
            return True
        return False

    def reconnect_camera(self, cam_id: str) -> bool:
        key = self._normalize_id(cam_id)
        if key in self.cameras:
            self.cameras[key].stop()
            time.sleep(0.5)
            self.cameras[key].start()
            return True
        return False

    def get_all_statuses(self) -> Dict[str, Dict[str, Any]]:
        return {cid: cam.get_status() for cid, cam in self.cameras.items()}

    def update_config(self, c1_index: int = None, c1_name: str = None, c2_url: str = None, c2_name: str = None):
        if c1_index is not None or c1_name is not None:
            cam1 = self.cameras["1"]
            if c1_index is not None:
                cam1.source_address = c1_index
                db.save_setting("camera1_index", c1_index)
            if c1_name is not None:
                cam1.name = c1_name
                db.save_setting("camera1_name", c1_name)
                
        if c2_url is not None or c2_name is not None:
            cam2 = self.cameras["2"]
            if c2_url is not None:
                cam2.source_address = c2_url
                db.save_setting("camera2_url", c2_url)
            if c2_name is not None:
                cam2.name = c2_name
                db.save_setting("camera2_name", c2_name)

camera_manager = CameraManager()
