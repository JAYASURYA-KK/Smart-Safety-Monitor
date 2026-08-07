"""
Live Webcam PPE Detection using trained YOLO model (best.pt)
--------------------------------------------------------------
Run in VS Code terminal:  python live_detect.py
Press 'q' to quit the window.
"""

import cv2
from ultralytics import YOLO

# ---------- CONFIG ----------
MODEL_PATH = "best.pt"      # path to your trained model
CAMERA_INDEX = 0         # 0 = default webcam, try 1/2 if you have multiple cameras
CONF_THRESHOLD = 0.5        # minimum confidence to show a detection
IMG_SIZE = 640               # should match training imgsz
# -----------------------------

def main():
    # Load the trained model
    model = YOLO(MODEL_PATH)

    # Open webcam
    cap = cv2.VideoCapture(CAMERA_INDEX)

    if not cap.isOpened():
        print("❌ Could not open webcam. Try changing CAMERA_INDEX to 1 or 2.")
        return

    print("✅ Webcam started. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Failed to grab frame from webcam.")
            break

        # Run YOLO inference on the current frame
        results = model.predict(
            source=frame,
            imgsz=IMG_SIZE,
            conf=CONF_THRESHOLD,
            verbose=False
        )

        # Draw bounding boxes + labels on the frame
        annotated_frame = results[0].plot()

        # Show the live prediction window
        cv2.imshow("PPE Detection - Live Camera", annotated_frame)

        # Press 'q' to exit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("🛑 Webcam stopped.")


if __name__ == "__main__":
    main()
