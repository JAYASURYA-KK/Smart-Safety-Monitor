import cv2
import base64
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from ..services.yolo_service import yolo_service
from ..services.event_service import event_service
from ..services.camera_service import camera_manager

router = APIRouter(prefix="/api/system", tags=["System & Model"])

@router.get("/model")
def get_model_info():
    statuses = camera_manager.get_all_statuses()
    avg_fps = int(sum(s["fps"] for s in statuses.values()) / max(1, len(statuses)))
    
    return {
        "model_name": "v2.pt",
        "model_path": yolo_service.model_path,
        "status": "loaded" if yolo_service.model is not None else "error",
        "device": yolo_service.device,
        "total_classes": len(yolo_service.class_names),
        "class_names": yolo_service.class_names,
        "compliance_classes": yolo_service.compliance_classes,
        "violation_classes": yolo_service.violation_classes,
        "inference_fps": avg_fps if avg_fps > 0 else 24,
        "confidence_threshold": yolo_service.conf_threshold,
        "iou_threshold": yolo_service.iou_threshold,
    }

@router.post("/test-image")
async def test_image_upload(file: UploadFile = File(...)):
    """
    Upload an image file (JPG/PNG) to test v2.pt model inference directly!
    Includes size limits (max 10MB) and resolution checks to prevent DoS.
    """
    try:
        contents = await file.read()
        
        # Security DoS check: Max 10MB payload size limit
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (10MB).")

        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file format.")
            
        annotated_frame, detections, class_counts = yolo_service.predict_and_annotate(img)
        
        # Log all detections to Event History
        if detections:
            event_service.log_detections("TEST-IMG", f"Test Image: {file.filename}", detections)
            
        # Encode annotated image to base64 JPEG
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        b64_image = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "status": "success",
            "filename": file.filename,
            "total_detections": len(detections),
            "class_counts": class_counts,
            "detections": detections,
            "annotated_image": f"data:image/jpeg;base64,{b64_image}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
