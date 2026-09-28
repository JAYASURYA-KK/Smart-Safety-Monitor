"""
Live Webcam PPE Detection using trained YOLO model (best.pt)
--------------------------------------------------------------
Run in VS Code terminal:  python live_detect.py
Press 'q' to quit the window.
"""

import cv2
import numpy as np
from ultralytics import YOLO

# ---------- CONFIG ----------
MODEL_PATH = "best.pt"      # path to your trained model
CAMERA_INDEX = 0            # 0 = default webcam, try 1/2 if you have multiple cameras
CONF_THRESHOLD = 0.25       # minimum confidence to show a detection
IMG_SIZE = 640              # should match training imgsz
# -----------------------------

def main():
    # Load the trained model
    try:
        model = YOLO(MODEL_PATH)
        print("✅ YOLO model loaded successfully.")
    except Exception as e:
        print(f"❌ Failed to load model from {MODEL_PATH}: {e}")
        return

    # Open webcam
    cap = cv2.VideoCapture(CAMERA_INDEX)

    if not cap.isOpened():
        print("❌ Could not open webcam. Try changing CAMERA_INDEX to 1 or 2.")
        return

    print("✅ Webcam started. Press 'q' to quit.")

    # Get class names from model
    class_names = model.names
    print(f"Tracking classes: {class_names}")

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

        # Count classes detected in this frame
        counts = {name: 0 for name in class_names.values()}
        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            cls_name = class_names[cls_id]
            counts[cls_name] += 1

        # Determine safety violation status
        # Violation classes in our dataset: no_helmet, no_goggle, no_gloves, no_boots
        violations = []
        if counts.get("no_helmet", 0) > 0:
            violations.append("Helmet Missing")
        if counts.get("no_goggle", 0) > 0:
            violations.append("Goggles Missing")
        if counts.get("no_gloves", 0) > 0:
            violations.append("Gloves Missing")
        if counts.get("no_boots", 0) > 0:
            violations.append("Boots Missing")

        violation_found = len(violations) > 0

        # Draw a premium semi-transparent HUD overlay on the frame
        # Set HUD dimensions
        hud_x, hud_y = 15, 15
        hud_w, hud_h = 320, 200
        
        # Create transparent overlay layer
        overlay = annotated_frame.copy()
        cv2.rectangle(overlay, (hud_x, hud_y), (hud_x + hud_w, hud_y + hud_h), (30, 30, 30), -1) # Dark grey background
        # Blend the overlay with the original frame for alpha transparency
        alpha = 0.75
        cv2.addWeighted(overlay, alpha, annotated_frame, 1 - alpha, 0, annotated_frame)

        # Draw a colored safety banner at the top of the HUD
        banner_h = 35
        banner_color = (0, 0, 180) if violation_found else (0, 150, 0) # Red/Green
        cv2.rectangle(annotated_frame, (hud_x, hud_y), (hud_x + hud_w, hud_y + banner_h), banner_color, -1)
        
        status_text = "WARNING: VIOLATION!" if violation_found else "PPE COMPLIANCE: OK"
        cv2.putText(
            annotated_frame,
            status_text,
            (hud_x + 10, hud_y + 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2,
            cv2.LINE_AA
        )

        # Write detection details in the HUD body
        y_offset = hud_y + banner_h + 25
        
        # 1. Person & Helmet status
        person_count = counts.get("Person", 0)
        helmet_ok = counts.get("helmet", 0)
        cv2.putText(
            annotated_frame,
            f"People: {person_count} | Helmets: {helmet_ok}",
            (hud_x + 15, y_offset),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )
        y_offset += 22

        # 2. Vests & other equipment detected
        vest_count = counts.get("vest", 0)
        cv2.putText(
            annotated_frame,
            f"Safety Vests: {vest_count}",
            (hud_x + 15, y_offset),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )
        y_offset += 22

        # 3. Violation alerts listing
        if violation_found:
            cv2.putText(
                annotated_frame,
                "Violations:",
                (hud_x + 15, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 0, 255),
                1,
                cv2.LINE_AA
            )
            y_offset += 18
            for violation in violations[:3]: # Limit to 3 lines
                cv2.putText(
                    annotated_frame,
                    f"- {violation}",
                    (hud_x + 25, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    (50, 50, 255),
                    1,
                    cv2.LINE_AA
                )
                y_offset += 16
        else:
            cv2.putText(
                annotated_frame,
                "All PPE worn correctly.",
                (hud_x + 15, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                1,
                cv2.LINE_AA
            )

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
