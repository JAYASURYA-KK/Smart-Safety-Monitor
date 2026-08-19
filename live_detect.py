"""
Live Safety PPE Detection script with proper error handling and resource cleanup.
"""

import os
import cv2
import sys
from ultralytics import YOLO

# ---------- CONFIG ----------
MODEL_PATH = "best.pt"      # Path to trained model weights
CAMERA_INDEX = 0            # 0 = default webcam
CONF_THRESHOLD = 0.25       # Minimum confidence score
IMG_SIZE = 640              # Image inference resolution
# -----------------------------

def main():
    # 1. Validate Model File Path
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Error: Model file '{MODEL_PATH}' not found in working directory.")
        sys.exit(1)

    try:
        print(f"📦 Loading YOLO model from '{MODEL_PATH}'...")
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"❌ Error loading YOLO model: {e}")
        sys.exit(1)

    # 2. Open Hardware Video Device
    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print(f"❌ Could not open webcam at index {CAMERA_INDEX}.")
        sys.exit(1)

    print("✅ Webcam started successfully. Press 'q' in the window or Ctrl+C in terminal to exit.")

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                print("⚠️ Warning: Failed to grab frame from webcam. Retrying...")
                continue

            # 3. Safe Model Inference
            results = model.predict(
                source=frame,
                imgsz=IMG_SIZE,
                conf=CONF_THRESHOLD,
                verbose=False
            )

            # Safe check on results array
            if results and len(results) > 0:
                annotated_frame = results[0].plot()
            else:
                annotated_frame = frame

            # 4. Display Window
            cv2.imshow("Smart Safety Monitor - Live Camera", annotated_frame)

            # Press 'q' to quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        print("\n🛑 KeyboardInterrupt detected. Stopping stream...")
    except Exception as e:
        print(f"❌ Unexpected error in capture loop: {e}")
    finally:
        # 5. Guaranteed Resource Cleanup
        cap.release()
        cv2.destroyAllWindows()
        print("🔒 Webcam hardware released and windows closed.")

if __name__ == "__main__":
    main()
