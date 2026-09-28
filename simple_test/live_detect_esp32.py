"""
PPE Detection + ESP32 LED Alert

When a "no_helmet" / "no_gloves" / "no_boots" / "no_goggle"
class is detected above CONF_THRESHOLD, sends "ALERT\n" to the ESP32
over USB serial.

The ESP32 then turns ON the LED for about 3 seconds.

Install:
    pip install ultralytics opencv-python pyserial

Run:
    python live_detect_esp32.py

Press 'q' to quit.
"""

import cv2
import time
import serial
import serial.tools.list_ports
from ultralytics import YOLO

# ---------- CONFIG ----------

MODEL_PATH = "best.pt"
#CAMERA_INDEX = "http://10.194.10.240:8080/video"    
CAMERA_INDEX = 0        # Laptop webcam (or IP camera URL)
CONF_THRESHOLD = 0.5
IMG_SIZE = 640

SERIAL_PORT = "COM5"      # Change if your ESP32 uses another COM port
BAUD_RATE = 115200

ALERT_COOLDOWN_SEC = 5    # Prevent repeated alerts

# Classes that trigger an alert
VIOLATION_CLASSES = {
    "no_helmet",
    "no_gloves",
    "no_boots",
    "no_goggle"
}

# ----------------------------


def connect_serial():
    available_ports = list(serial.tools.list_ports.comports())
    available_devices = [port.device for port in available_ports]

    if SERIAL_PORT not in available_devices:
        print(f"❌ Configured port {SERIAL_PORT} is not available.")
        if available_ports:
            print("Available serial ports:")
            for port in available_ports:
                print(f"  {port.device} - {port.description}")
            port_to_try = available_ports[0].device
            print(f"ℹ️ Attempting to connect to {port_to_try} instead.")
        else:
            print("No serial ports detected. Please connect the ESP32 and retry.")
            return None
    else:
        port_to_try = SERIAL_PORT

    try:
        ser = serial.Serial(port_to_try, BAUD_RATE, timeout=1)
        time.sleep(2)   # Wait for ESP32 reset
        print(f"✅ Connected to ESP32 on {port_to_try}")
        return ser
    except Exception as e:
        print(f"❌ Could not connect to ESP32 on {port_to_try}")
        print(e)
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

        results = model.predict(
            source=frame,
            imgsz=IMG_SIZE,
            conf=CONF_THRESHOLD,
            verbose=False
        )

        annotated_frame = results[0].plot()

        violation_found = False

        for box in results[0].boxes:

            cls_id = int(box.cls[0])
            cls_name = model.names[cls_id]

            if cls_name in VIOLATION_CLASSES:
                violation_found = True
                break

        now = time.time()

        if (
            violation_found
            and ser
            and (now - last_alert_time > ALERT_COOLDOWN_SEC)
        ):
            ser.write(b"ALERT\n")
            print("🚨 Violation detected -> ALERT sent to ESP32")
            last_alert_time = now

        status_text = "VIOLATION!" if violation_found else "PPE OK"
        status_color = (0, 0, 255) if violation_found else (0, 255, 0)

        cv2.putText(
            annotated_frame,
            status_text,
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            status_color,
            2,
        )

        cv2.imshow("PPE Detection - Live", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()

    cv2.destroyAllWindows()

    if ser:
        ser.close()

    print("🛑 Program stopped.")


if __name__ == "__main__":
    main()