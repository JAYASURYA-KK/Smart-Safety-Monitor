"""
Live Webcam PPE Detection + ESP32 Buzzer/LED Alert (via USB Serial)
---------------------------------------------------------------------
When a "no_helmet" / "no_vest" / "no_gloves" / "no_boots" / "no_goggle"
class is detected above CONF_THRESHOLD, sends "ALERT\n" to the ESP32
over USB serial. The ESP32 then turns on buzzer + LED for ~3 seconds.

Install:  pip install ultralytics opencv-python pyserial
Run:      python live_detect_esp32.py
Press 'q' to quit.
"""

import cv2
import time
import serial
from ultralytics import YOLO

# ---------- CONFIG ----------
MODEL_PATH = "best.pt"
CAMERA_INDEX = 0                 # 0 = laptop webcam, or use phone IP URL like "http://192.168.1.5:8080/video"
CONF_THRESHOLD = 0.5
IMG_SIZE = 640

SERIAL_PORT = "COM5"             # Windows e.g. "COM5"  |  Mac/Linux e.g. "/dev/ttyUSB0" or "/dev/cu.usbserial-0001"
BAUD_RATE = 115200

ALERT_COOLDOWN_SEC = 5           # don't spam alerts; wait this long between triggers

# Class names that count as a "violation" (edit to match your data.yaml order)
VIOLATION_CLASSES = {"no_helmet", "no_gloves", "no_boots", "no_goggle"}
# -----------------------------


def connect_serial():
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        time.sleep(2)  # wait for ESP32 to reset after serial connect
        print(f"✅ Connected to ESP32 on {SERIAL_PORT}")
        return ser
    except Exception as e:
        print(f"❌ Could not connect to ESP32 on {SERIAL_PORT}: {e}")
        print("   Check the COM port name and that the ESP32 is plugged in via USB.")
        return None


def main():
    model = YOLO(MODEL_PATH)
    cap = cv2.VideoCapture(CAMERA_INDEX)
    ser = connect_serial()

    if not cap.isOpened():
        print("❌ Could not open camera.")
        return

    last_alert_time = 0
    print("✅ Detection started. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Failed to grab frame.")
            break

        results = model.predict(source=frame, imgsz=IMG_SIZE, conf=CONF_THRESHOLD, verbose=False)
        annotated_frame = results[0].plot()

        # Check detected classes for violations
        violation_found = False
        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            cls_name = model.names[cls_id]
            if cls_name in VIOLATION_CLASSES:
                violation_found = True
                break

        # Trigger ESP32 alert (with cooldown so it doesn't spam every frame)
        now = time.time()
        if violation_found and ser and (now - last_alert_time > ALERT_COOLDOWN_SEC):
            ser.write(b"ALERT\n")
            print("🚨 Violation detected -> ALERT sent to ESP32")
            last_alert_time = now

        # Show status text on screen
        status_text = "VIOLATION!" if violation_found else "PPE OK"
        status_color = (0, 0, 255) if violation_found else (0, 255, 0)
        cv2.putText(annotated_frame, status_text, (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)

        cv2.imshow("PPE Detection - Live", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    if ser:
        ser.close()
    print("🛑 Stopped.")


if __name__ == "__main__":
    main()
