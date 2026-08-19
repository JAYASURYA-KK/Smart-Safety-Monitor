import os
import cv2
import torch
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Any
from ultralytics import YOLO
from ..config import settings

class YoloService:
    """
    Singleton YOLO Inference Engine.
    Loads v2.pt model efficiently into memory once.
    Extracts class names dynamically from model.names.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(YoloService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self.model_path = settings.MODEL_PATH
        self.model = None
        self.class_names: Dict[int, str] = {}
        self.compliance_classes: List[str] = []
        self.violation_classes: List[str] = []
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.conf_threshold = settings.CONFIDENCE_THRESHOLD
        self.iou_threshold = settings.IOU_THRESHOLD
        
        self.load_model()
        self._initialized = True

    def load_model(self):
        print(f"[YoloService] Loading PyTorch YOLO model from {self.model_path} on device {self.device}...")
        try:
            if not os.path.exists(self.model_path):
                # Fallback check if best.pt exists at project root
                root_best = Path(self.model_path).resolve().parent.parent.parent / "best.pt"
                if root_best.exists():
                    os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
                    import shutil
                    shutil.copy(root_best, self.model_path)
                    print(f"[YoloService] Copied {root_best} to {self.model_path}")
            
            self.model = YOLO(self.model_path)
            # Dynamically extract exact class names from model.names
            self.class_names = self.model.names if hasattr(self.model, 'names') else {}
            
            self.compliance_classes = []
            self.violation_classes = []
            for _, name in self.class_names.items():
                if name.lower().startswith("no_"):
                    self.violation_classes.append(name)
                else:
                    self.compliance_classes.append(name)

            print(f"[YoloService] Model loaded successfully! Total Classes: {len(self.class_names)}")
            print(f"[YoloService] Detected Classes Dict: {self.class_names}")
            print(f"[YoloService] Compliance Classes: {self.compliance_classes}")
            print(f"[YoloService] Violation Classes: {self.violation_classes}")
        except Exception as e:
            print(f"[YoloService] ERROR loading model: {e}")
            self.model = None

    def update_thresholds(self, conf: float = None, iou: float = None):
        if conf is not None:
            self.conf_threshold = conf
        if iou is not None:
            self.iou_threshold = iou

    def predict_and_annotate(self, frame: np.ndarray) -> Tuple[np.ndarray, List[Dict[str, Any]], Dict[str, int]]:
        """
        Processes a single BGR OpenCV frame.
        Annotates frame with bounding boxes & labels.
        Returns:
            annotated_frame: np.ndarray
            detections: List of detection dicts
            class_counts: Dict mapping class_name -> count
        """
        if self.model is None or frame is None:
            return frame, [], {}

        try:
            # Per-class confidence threshold overrides for small/hard classes
            PER_CLASS_THRESHOLDS = {
                "goggles": 0.20,
                "no_goggle": 0.20,
                "gloves": 0.20,
                "no_gloves": 0.20,
                "vest": 0.25,
                "boots": 0.25,
                "no_boots": 0.25,
                "helmet": 0.35,
                "no_helmet": 0.35,
                "person": 0.35,
            }

            # Run inference with lowest base threshold to capture small items
            results = self.model.predict(
                source=frame,
                conf=0.20,
                iou=self.iou_threshold,
                verbose=False
            )
            
            annotated_frame = frame.copy()
            detections = []
            class_counts: Dict[str, int] = {}
            
            # Initialize 0 counts for all known classes for consistency
            for name in self.class_names.values():
                class_counts[name] = 0

            if results and len(results) > 0:
                boxes = results[0].boxes
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    cls_name = self.class_names.get(cls_id, f"class_{cls_id}")
                    conf = float(box.conf[0].item())
                    
                    # Apply per-class confidence threshold check
                    req_threshold = PER_CLASS_THRESHOLDS.get(cls_name.lower(), self.conf_threshold)
                    if conf < req_threshold:
                        continue

                    xyxy = box.xyxy[0].cpu().numpy().astype(int) # [x1, y1, x2, y2]
                    
                    is_violation = cls_name.lower().startswith("no_")
                    
                    # Update counts
                    class_counts[cls_name] = class_counts.get(cls_name, 0) + 1
                    
                    detections.append({
                        "class_id": cls_id,
                        "class_name": cls_name,
                        "confidence": conf,
                        "bbox": xyxy.tolist(),
                        "is_violation": is_violation
                    })
                    
                    # Color selection
                    if is_violation:
                        color = (50, 50, 240)  # Bright Red for violations
                        label_bg = (30, 30, 180)
                    elif cls_name.lower() == "person":
                        color = (240, 160, 50)  # Cyan/Blue for Person
                        label_bg = (180, 120, 30)
                    else:
                        color = (50, 200, 50)   # Green for PPE compliant
                        label_bg = (30, 150, 30)
                    
                    x1, y1, x2, y2 = xyxy
                    # Draw bounding box
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                    
                    # Draw label badge
                    label_text = f"{cls_name.upper()} {int(conf*100)}%"
                    (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(annotated_frame, (x1, max(0, y1 - th - 8)), (x1 + tw + 6, max(th + 8, y1)), label_bg, -1)
                    cv2.putText(annotated_frame, label_text, (x1 + 3, max(th + 2, y1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

            # Fix Bug: Logical Person presence inference when PPE or violations are detected
            person_key = next((k for k in class_counts.keys() if k.lower() == "person"), "Person")
            total_ppe_detections = sum(count for cls, count in class_counts.items() if cls.lower() != "person")
            if total_ppe_detections > 0 and class_counts.get(person_key, 0) == 0:
                class_counts[person_key] = 1

            return annotated_frame, detections, class_counts

        except Exception as e:
            print(f"[YoloService] Predict error: {e}")
            return frame, [], {}

yolo_service = YoloService()
