# Smart Safety Monitor

This project uses **YOLO (Ultralytics)** and **OpenCV** for real-time object detection. It can run in two modes:

* **PC Camera Mode** (No ESP32 required)
* **ESP32 Mode** (ESP32 connected to the PC via USB)

---

## Requirements

* Python 3.10 or later
* Webcam
* (Optional) ESP32 with USB connection

---

## Step 1: Install Dependencies

Install the required Python packages:

```bash
pip install ultralytics opencv-python
pip install pyserial
```

---

## Step 2: Run the Project

### Option 1: PC Camera Only (No ESP32)

Run the following command:

```bash
python live_detect.py
```

This starts real-time object detection using your computer's webcam.

---

### Option 2: ESP32 + PC

1. Connect the ESP32 to your computer using a USB cable.
2. Ensure the correct COM port is configured in the Python script.
3. Run:

```bash
python live_detect_esp32.py
```

The Python application will communicate with the ESP32 over the serial (USB) connection while performing real-time object detection.

---

## Project Structure

```text
Smart-Safety-Monitor/
│
├── live_detect.py
├── live_detect_esp32.py
├── requirements.txt
└── README.md
```

---

## Features

* Real-time object detection using YOLO
* Live webcam monitoring
* Optional ESP32 serial communication
* Easy setup and execution

---

## Notes

* Make sure your webcam is connected and accessible.
* If using ESP32, verify the correct COM port before running the program.
* Close other applications that may be using the webcam or serial port.

---
