import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class AppConfig(BaseModel):
    PROJECT_NAME: str = "Smart Construction Monitor"
    MODEL_PATH: str = os.getenv("MODEL_PATH", str(BASE_DIR / "model" / "v2.pt"))
    
    CAMERA1_INDEX: int = int(os.getenv("CAMERA1_INDEX", "0"))
    CAMERA1_NAME: str = os.getenv("CAMERA1_NAME", "CAM-01 (USB Webcam)")
    
    CAMERA2_URL: str = os.getenv("CAMERA2_URL", "http://192.168.1.50:8080/video")
    CAMERA2_NAME: str = os.getenv("CAMERA2_NAME", "CAM-02 (Mobile IP Stream)")
    
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
    IOU_THRESHOLD: float = float(os.getenv("IOU_THRESHOLD", "0.45"))
    ALERT_COOLDOWN_SECONDS: int = int(os.getenv("ALERT_COOLDOWN_SECONDS", "5"))
    AUTO_RECONNECT: bool = os.getenv("AUTO_RECONNECT", "true").lower() == "true"
    
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = AppConfig()
