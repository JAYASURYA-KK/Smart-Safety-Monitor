import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class AppConfig(BaseModel):
    PROJECT_NAME: str = "Smart Construction Monitor"
    MODEL_PATH: str = os.getenv("MODEL_PATH", str(BASE_DIR / "model" / "best6.pt"))
    
    # Camera 1: PC Built-in Webcam (ALWAYS AVAILABLE)
    CAMERA1_INDEX: int = int(os.getenv("CAMERA1_INDEX", "0"))
    CAMERA1_NAME: str = os.getenv("CAMERA1_NAME", "CAM-01 (PC Webcam)")
    
    # Camera 2: USB External Camera (AVAILABLE IF DETECTED)
    CAMERA2_INDEX: int = int(os.getenv("CAMERA2_INDEX", "1"))
    CAMERA2_NAME: str = os.getenv("CAMERA2_NAME", "CAM-02 (USB Camera)")
    
    # Camera 3: WiFi/IP Camera (AVAILABLE IF CONNECTED)
    CAMERA3_URL: str = os.getenv("CAMERA3_URL", "http://10.194.10.240:8080/video")
    CAMERA3_NAME: str = os.getenv("CAMERA3_NAME", "CAM-03 (WiFi Camera)")
    
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
    IOU_THRESHOLD: float = float(os.getenv("IOU_THRESHOLD", "0.45"))
    ALERT_COOLDOWN_SECONDS: int = int(os.getenv("ALERT_COOLDOWN_SECONDS", "5"))
    AUTO_RECONNECT: bool = os.getenv("AUTO_RECONNECT", "true").lower() == "true"
    
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = AppConfig()
