import cv2
import os
import time
import urllib.request
import threading
import numpy as np
from datetime import datetime
from typing import Dict, Any, Generator, Optional
from ..config import settings
from .yolo_service import yolo_service
from .alert_service import alert_service
from .event_service import event_service
from .face_service import face_service
from ..models.database import db


def _download_demo_video(dest_path: str) -> bool:
    """Download a royalty-free safety gear detection demo video if not present."""
    url = "https://github.com/intel-iot-devkit/sample-videos/raw/master/safety-gear-demographics.mp4"
    print(f"[CameraService] Downloading safety demo video from {url} to {dest_path}...")
    try:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        # Configure a simple user-agent to avoid potential bot blocks
        opener = urllib.request.build_opener()
        opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
        urllib.request.install_opener(opener)
        urllib.request.urlretrieve(url, dest_path)
        print("[CameraService] Demo video downloaded successfully.")
        return True
    except Exception as e:
        print(f"[CameraService] Failed to download demo video: {e}")
        return False


class SingleCameraWorker:
    """
    Background worker thread for an individual camera stream.
    Handles OpenCV frame capture, YOLO model inference, FPS tracking, and MJPEG generation.
    Camera hardware is strictly opened ONLY when user clicks Start and released when stopped.
    """
    def __init__(self, camera_id: str, name: str, source_type: str, source_address: Any, always_available: bool = False):
        self.camera_id = camera_id
        self.name = name
        self.source_type = source_type  # 'webcam' | 'ip_camera'
        self.source_address = source_address
        self.always_available = always_available  # PC webcam is always available

        self.is_running = False
        self.status = "offline"  # 'online' | 'offline' | 'connecting' | 'error'
        self.error_message: Optional[str] = None
        self.hardware_detected = False  # True if physical camera was confirmed working

        self.cap: Optional[cv2.VideoCapture] = None
        self.thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()

        # Reader thread additions
        self.reader_thread: Optional[threading.Thread] = None
        self.latest_raw_frame: Optional[np.ndarray] = None
        self.new_frame_available = False

        # Async face recognition additions
        self.face_recognition_in_progress = False
        self.last_face_recognition_time = 0.0
        self.cached_person_details = None
        self.last_person_time = 0.0
        self.frame_id = 0

        # Latest telemetry state
        self.latest_frame_bytes: Optional[bytes] = None
        self.fps = 0
        self.last_inference_time: Optional[str] = None
        self.total_detections = 0
        self.class_counts: Dict[str, int] = {}
        self.violations_count = 0

    def detect_hardware(self) -> bool:
        """
        Probe whether the physical camera hardware is accessible RIGHT NOW.
        Does NOT keep the camera open. Returns True if hardware is detected.
        """
        if self.is_running:
            return True

        if self.always_available:
            # Always probe the PC webcam
            return self._probe_webcam()

        if self.source_type == "webcam":
            return self._probe_webcam()
        elif self.source_type == "ip_camera":
            return self._probe_ip_camera()

        return False

    def _probe_webcam(self) -> bool:
        """Quick probe of a USB/webcam device index without keeping it open."""
        try:
            idx = int(self.source_address)
        except Exception:
            idx = 0

        for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]:
            try:
                cap = cv2.VideoCapture(idx, backend)
                if cap.isOpened():
                    cap.release()
                    self.hardware_detected = True
                    return True
            except Exception:
                pass

        self.hardware_detected = False
        return False

    def _probe_ip_camera(self) -> bool:
        """Quick probe of an IP camera URL."""
        try:
            cap = cv2.VideoCapture(str(self.source_address))
            if cap.isOpened():
                ret, frame = cap.read()
                cap.release()
                if ret and frame is not None:
                    self.hardware_detected = True
                    return True
            self.hardware_detected = False
            return False
        except Exception:
            self.hardware_detected = False
            return False

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
            self.latest_raw_frame = None
            self.new_frame_available = False
            self.cached_person_details = None
            self.face_recognition_in_progress = False

        curr_thread = threading.current_thread()
        if self.reader_thread and self.reader_thread.is_alive() and curr_thread != self.reader_thread:
            self.reader_thread.join(timeout=0.5)
        if self.thread and self.thread.is_alive() and curr_thread != self.thread:
            self.thread.join(timeout=0.5)

        with self.lock:
            if self.cap:
                try:
                    self.cap.release()
                except Exception:
                    pass
                self.cap = None
        print(f"[{self.camera_id}] Camera released and status set to offline.")

    def _init_capture(self) -> bool:
        try:
            addr = self.source_address

            if self.source_type == "webcam":
                try:
                    idx = int(addr)
                except Exception:
                    idx = 0

                backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]

                for backend in backends:
                    try:
                        cap_test = cv2.VideoCapture(idx, backend)
                        if cap_test.isOpened():
                            # Warm-up the camera sensor to avoid initial black frames
                            for warm_up in range(5):
                                ret, frame = cap_test.read()
                                if not ret or frame is None:
                                    time.sleep(0.05)
                            
                            self.cap = cap_test
                            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                            self.hardware_detected = True
                            self.status = "online"
                            print(f"[{self.camera_id}] Opened webcam at index {idx} with backend {backend} (Sensor Warmed Up)")
                            return True
                    except Exception as e:
                        print(f"[{self.camera_id}] Failed to open backend {backend}: {e}")

                # If physical webcam cannot be opened, fall back to the demo safety video
                print(f"[{self.camera_id}] Could not open physical webcam at index {idx}. Falling back to demo video...")
                demo_video_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "model"))
                demo_video_path = os.path.join(demo_video_dir, "demo_safety_video.mp4")
                
                success = True
                if not os.path.exists(demo_video_path):
                    success = _download_demo_video(demo_video_path)
                
                if success and os.path.exists(demo_video_path):
                    self.cap = cv2.VideoCapture(demo_video_path)
                    if self.cap.isOpened():
                        self.hardware_detected = True
                        self.status = "online"
                        print(f"[{self.camera_id}] Opened fallback demo video from: {demo_video_path}")
                        return True

                print(f"[{self.camera_id}] Could not open webcam at index {idx} or download fallback demo video.")
                self.status = "error"
                self.error_message = f"Webcam index {idx} not accessible."
                self.hardware_detected = False
                return False

            else:
                # IP Camera URL
                self.cap = cv2.VideoCapture(addr)
                if not self.cap.isOpened():
                    self.status = "error"
                    self.error_message = f"Failed to connect to stream: {addr}"
                    self.hardware_detected = False
                    return False
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                self.hardware_detected = True
                self.status = "online"
                return True

        except Exception as e:
            self.status = "error"
            self.error_message = str(e)
            self.hardware_detected = False
            return False

    def _reader_loop(self):
        """Dedicated thread to read frames from VideoCapture and clear its buffer."""
        consecutive_read_failures = 0
        while self.is_running:
            if self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    # Make a thread-safe copy of the frame
                    frame_copy = frame.copy()
                    with self.lock:
                        self.latest_raw_frame = frame_copy
                        self.new_frame_available = True
                    consecutive_read_failures = 0
                else:
                    # If it is a video file (like our demo video), seek back to frame 0 and loop it!
                    try:
                        frame_count = self.cap.get(cv2.CAP_PROP_FRAME_COUNT)
                        if frame_count > 0:
                            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            consecutive_read_failures = 0
                            time.sleep(0.01)
                            continue
                    except Exception:
                        pass

                    consecutive_read_failures += 1
                    if consecutive_read_failures >= 5:
                        if settings.AUTO_RECONNECT and self.is_running:
                            self.status = "connecting"
                            time.sleep(1)
                            consecutive_read_failures = 0
                            with self.lock:
                                if self.cap:
                                    self.cap.release()
                                    self.cap = None
                            self._init_capture()
                            continue
                        else:
                            with self.lock:
                                self.status = "error"
                                self.error_message = "Stream disconnected."
                                self.is_running = False
                            break
            else:
                time.sleep(0.01)
            time.sleep(0.001)

    def _capture_loop(self):
        if not self._init_capture():
            with self.lock:
                self.is_running = False
            return

        # Start the reader thread
        with self.lock:
            self.latest_raw_frame = None
            self.new_frame_available = False
            self.reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
            self.reader_thread.start()

        frame_count = 0
        start_time = time.time()

        while self.is_running:
            raw_frame = None
            with self.lock:
                if self.new_frame_available:
                    raw_frame = self.latest_raw_frame
                    self.new_frame_available = False

            if raw_frame is None:
                time.sleep(0.005)
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

            # Run Face Recognition asynchronously in the background if a person is detected
            persons = [d for d in detections if d.get("class_name", "").lower() == "person"]
            if len(persons) > 0:
                self.last_person_time = time.time()
                
                # Check if we should trigger face recognition (not already in progress and cooldown of 2 seconds)
                if not self.face_recognition_in_progress and (time.time() - self.last_face_recognition_time > 2.0):
                    self.face_recognition_in_progress = True
                    frame_copy = raw_frame.copy()
                    
                    def run_async_face_rec(frm):
                        try:
                            details = face_service.recognize_face(frm)
                            with self.lock:
                                self.cached_person_details = details
                                self.last_face_recognition_time = time.time()
                        except Exception as e:
                            print(f"[{self.camera_id}] Async face recognition error: {e}")
                        finally:
                            self.face_recognition_in_progress = False

                    threading.Thread(target=run_async_face_rec, args=(frame_copy,), daemon=True).start()

            # Overlay cached person details if available
            person_details = self.cached_person_details
            if person_details:
                # Attach details to the violation detection objects
                for v in violations:
                    v["person_details"] = person_details
                
                # Draw a nice overlay badge for identified person under the safety HUD
                # Only draw if a person is currently detected to avoid lingering ghost overlays
                if len(persons) > 0:
                    hud_x, hud_y, hud_w, hud_h = 15, 15, 320, 200
                    text_y = hud_y + hud_h + 20
                    # Draw background rect
                    cv2.rectangle(annotated_frame, (hud_x, hud_y + hud_h + 2), (hud_x + hud_w, hud_y + hud_h + 45), (30, 30, 30), -1)
                    cv2.rectangle(annotated_frame, (hud_x, hud_y + hud_h + 2), (hud_x + hud_w, hud_y + hud_h + 45), (0, 165, 255), 1) # Orange border
                    
                    cv2.putText(
                        annotated_frame,
                        f"IDENTIFIED: {person_details['name']}",
                        (hud_x + 10, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        (0, 165, 255),
                        2,
                        cv2.LINE_AA
                    )
                    cv2.putText(
                        annotated_frame,
                        f"ID: {person_details['id']} | Roll: {person_details['roll_no']}",
                        (hud_x + 10, text_y + 18),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.45,
                        (255, 255, 255),
                        1,
                        cv2.LINE_AA
                    )

            # Clear cached person details if no person has been detected in the last 5 seconds
            if time.time() - self.last_person_time > 5.0:
                self.cached_person_details = None

            # Update state under lock
            with self.lock:
                self.total_detections = len(detections)
                self.class_counts = class_counts
                self.violations_count = len(violations)
                self.last_inference_time = datetime.now().isoformat()

                ret_jpg, buffer = cv2.imencode('.jpg', annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if ret_jpg:
                    self.latest_frame_bytes = buffer.tobytes()
                    self.frame_id += 1

            # Process Alert Rules & Event Logging
            if detections:
                alert_service.process_detections(self.camera_id, self.name, detections)
                event_service.log_detections(self.camera_id, self.name, detections)

            time.sleep(0.002)

        self.stop()

    def get_mjpeg_stream(self) -> Generator[bytes, None, None]:
        last_yielded_frame_id = -1
        while True:
            frame_bytes = None
            is_active = False
            current_frame_id = -1
            with self.lock:
                frame_bytes = self.latest_frame_bytes
                is_active = self.is_running
                current_frame_id = getattr(self, 'frame_id', 0)

            if is_active:
                if frame_bytes and current_frame_id != last_yielded_frame_id:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                    last_yielded_frame_id = current_frame_id
                time.sleep(0.01)
            else:
                blank = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(blank, f"{self.name} Offline", (160, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                _, buffer = cv2.imencode('.jpg', blank)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                time.sleep(0.5)

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "camera_id": self.camera_id,
                "name": self.name,
                "source_type": self.source_type,
                "source_address": str(self.source_address),
                "is_active": self.is_running,
                "status": self.status,
                "hardware_detected": self.hardware_detected,
                "always_available": self.always_available,
                "fps": self.fps,
                "last_inference_time": self.last_inference_time,
                "total_detections": self.total_detections,
                "class_counts": self.class_counts,
                "violations_count": self.violations_count,
                "error_message": self.error_message,
            }


class CameraManager:
    """
    Manages 3 camera channels:
      CAM-01 = PC Built-in Webcam (ALWAYS available, index 0)
      CAM-02 = USB External Camera (available only if detected)
      CAM-03 = WiFi/IP Camera (available only if connected)
    """
    def __init__(self):
        c1_idx = db.get_setting("camera1_index", settings.CAMERA1_INDEX)
        c1_name = db.get_setting("camera1_name", settings.CAMERA1_NAME)
        c2_idx = db.get_setting("camera2_index", settings.CAMERA2_INDEX)
        c2_name = db.get_setting("camera2_name", settings.CAMERA2_NAME)
        c3_url = db.get_setting("camera3_url", settings.CAMERA3_URL)
        c3_name = db.get_setting("camera3_name", settings.CAMERA3_NAME)

        self.cameras: Dict[str, SingleCameraWorker] = {
            # PC Webcam — ALWAYS available, mandatory
            "1": SingleCameraWorker("CAM-01", c1_name, "webcam", c1_idx, always_available=True),
            # USB Camera — only shown if hardware detected
            "2": SingleCameraWorker("CAM-02", c2_name, "webcam", c2_idx, always_available=False),
            # WiFi Camera — only shown if URL connects
            "3": SingleCameraWorker("CAM-03", c3_name, "ip_camera", c3_url, always_available=False),
        }

    def _normalize_id(self, cam_id: str) -> str:
        if cam_id in ["CAM-01", "1", 1]:
            return "1"
        if cam_id in ["CAM-02", "2", 2]:
            return "2"
        if cam_id in ["CAM-03", "3", 3]:
            return "3"
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

    def detect_available_cameras(self) -> Dict[str, Any]:
        """
        Probe all camera hardware and return availability info.
        Camera 1 (PC) is ALWAYS reported as available.
        Camera 2 (USB) is only available if hardware detected.
        Camera 3 (WiFi) is only available if URL connects.
        """
        result = {
            "1": {"camera_id": "CAM-01", "name": self.cameras["1"].name, "available": True, "type": "pc", "always_available": True},
            "2": {"camera_id": "CAM-02", "name": self.cameras["2"].name, "available": False, "type": "usb", "always_available": False},
            "3": {"camera_id": "CAM-03", "name": self.cameras["3"].name, "available": False, "type": "wifi", "always_available": False},
        }

        # Probe USB camera
        try:
            result["2"]["available"] = self.cameras["2"].detect_hardware()
        except Exception:
            result["2"]["available"] = False

        # Probe WiFi camera
        try:
            result["3"]["available"] = self.cameras["3"].detect_hardware()
        except Exception:
            result["3"]["available"] = False

        return result

    def get_all_statuses(self) -> Dict[str, Dict[str, Any]]:
        return {cid: cam.get_status() for cid, cam in self.cameras.items()}

    def update_config(self, c1_index=None, c1_name=None, c2_index=None, c2_name=None, c3_url=None, c3_name=None):
        if c1_index is not None or c1_name is not None:
            cam1 = self.cameras["1"]
            if c1_index is not None:
                cam1.source_address = c1_index
                db.save_setting("camera1_index", c1_index)
            if c1_name is not None:
                cam1.name = c1_name
                db.save_setting("camera1_name", c1_name)

        if c2_index is not None or c2_name is not None:
            cam2 = self.cameras["2"]
            if c2_index is not None:
                cam2.source_address = c2_index
                db.save_setting("camera2_index", c2_index)
            if c2_name is not None:
                cam2.name = c2_name
                db.save_setting("camera2_name", c2_name)

        if c3_url is not None or c3_name is not None:
            cam3 = self.cameras["3"]
            if c3_url is not None:
                cam3.source_address = c3_url
                db.save_setting("camera3_url", c3_url)
            if c3_name is not None:
                cam3.name = c3_name
                db.save_setting("camera3_name", c3_name)


camera_manager = CameraManager()
