# Smart Safety Monitor - Project Overview

## 1. Introduction
The Smart Safety Monitor is an integrated hardware and software solution that performs real-time object detection to monitor safety (e.g., Personal Protective Equipment - PPE detection) using YOLO (Ultralytics) and OpenCV.

It can operate in two primary modes:
- **PC Camera Mode:** Uses the local webcam for detection without any external hardware.
- **ESP32 Mode:** Integrates with an ESP32 microcontroller over a serial/USB connection to trigger physical alerts based on detections.

## 2. System Architecture
The project is designed with a modern full-stack web architecture, alongside standalone Python scripts for local execution. It also provides containerization via Docker.

### 2.1 Backend (Python / FastAPI)
- **Framework:** FastAPI
- **Core Libraries:** Ultralytics (YOLO), OpenCV, WebSockets, Pydantic, NumPy.
- **Database:** SQLite (`storage.db`) with WAL mode enabled.
- **Entry Point:** `backend.app.main:app` (via Uvicorn)
- **Role:** Handles the API layer, video stream processing, object detection using the YOLO model, and WebSocket connections for live updates.

### 2.2 Frontend (React / Vite)
- **Framework:** React 19 (via Vite)
- **Styling:** TailwindCSS v4
- **UI Components & Charts:** Lucide-React (icons), Recharts (data visualization).
- **Tooling:** TypeScript, Oxlint.
- **Role:** Provides a user interface for monitoring the safety feed, viewing detection analytics, and managing system settings.

### 2.3 Hardware & Embedded (ESP32)
- **Code:** `esp32_ppe_alert.ino`
- **Role:** The ESP32 receives signals from the Python detection script over a serial connection to activate alarms or LEDs when safety violations occur.

### 2.4 Machine Learning
- **Model:** YOLO (`best.pt` is the primary weights file).
- **Training:** Jupyter Notebooks (`model_train.ipynb`, `model-train-kaggle.ipynb`) are used for training the models.
- **Versions:** Several iteration folders exist (`v1_models`, `v2_models`) along with Kaggle-related training directories (`kaggle_1` through `kaggle_4`).

## 3. Deployment & Containerization
- **Dockerfile:** A multi-stage Docker build is used.
  - **Stage 1 (Builder):** Node.js container builds the React frontend.
  - **Stage 2 (Runner):** Python 3.10 slim container installs OS-level OpenCV dependencies (ffmpeg, libgl1, etc.), Python requirements, and copies both the backend code and the built frontend static assets.
  - **Exposed Port:** `7860` (configured for platforms like Hugging Face Spaces).

## 4. Standalone Execution
For simple local usage without the web interface, two scripts are provided:
- `live_detect.py`: Runs detection using the PC webcam and displays it in an OpenCV window.
- `live_detect_esp32.py`: Runs detection and communicates with the ESP32 over a serial port.

## 5. Directory Structure Overview
- `/backend/`: FastAPI server, SQLite database, and ML logic.
- `/frontend/`: React/Vite source code.
- `/v1_models/`, `/v2_models/`: ML model weights iterations.
- `/project/`: Contains supplementary files like `persons.csv`.
- `live_detect*.py`: Standalone execution scripts.
- `esp32_ppe_alert.ino`: ESP32 Arduino code.
- `Dockerfile`: Multi-stage Docker configuration.
- `best.pt`: Currently active YOLO model weights.
- `README.md`: Basic setup and execution instructions.

## 6. Project Workflow & Processes

The system operates through several interconnected workflows that manage everything from real-time video inference to hardware alerting and worker database management.

### 6.1 Real-Time Detection Workflow (`YoloService`)
1. **Video Ingestion:** The system captures video frames from active cameras (PC Webcam, USB Cameras, or IP/WiFi Cameras).
2. **Model Inference:** Each frame is processed by the YOLOv8 model loaded into PyTorch.
3. **Threshold Filtering:** Detections are filtered using class-specific confidence thresholds (e.g., lower threshold for smaller objects like goggles/gloves, higher for helmets/persons).
4. **Classification:** Detected objects are categorized into:
   - **Compliance Classes:** e.g., `helmet`, `vest`, `goggles`.
   - **Violation Classes:** e.g., `no_helmet`, `no_goggle`, `no_gloves`.
5. **Logical Inference:** If PPE or violations are detected in a frame, but the `person` class is missed by the model, the system logically infers the presence of a person to maintain accurate tracking.
6. **Annotation:** The frame is annotated with bounding boxes and updated counts before being streamed to the frontend via WebSockets.

### 6.2 Hardware Alerting Workflow (`ESP32Service`)
1. **Auto-Detection:** The backend actively probes available serial (COM) ports to auto-detect a connected ESP32 device.
2. **Continuous Monitoring:** As frames are processed by the `YoloService`, the results are analyzed for violations based on configured system rules (e.g., "No Helmet Violation" set to critical).
3. **Signal Dispatch:**
   - **Alert State:** If a violation is detected and the cooldown period has elapsed, the system sends an `ALERT\n` signal over serial. The ESP32 receives this and activates a physical buzzer and LED for 3 seconds.
   - **Safe State:** If no violations are present, a `SAFE\n` signal is sent.

### 6.3 Worker & Face Recognition Workflow
1. **Worker Registration:** Administrators can register workers via the frontend interface, providing details and uploading face images.
2. **Face Database:** Uploaded images are processed and registered into a local face database for identity verification.
3. **Verification:** During operation, the system can perform face verification against the database to identify specific workers in the camera feed, linking safety compliance records to individual profiles.

### 6.4 Frontend-Backend Interaction
- **REST API:** The React frontend periodically polls the FastAPI backend for system health, current analytics, alert history, and model configuration.
- **Settings Management:** Users can dynamically update confidence thresholds, alert cooldowns, and camera preferences through the frontend, which posts to the backend and updates the active pipeline.
- **Model Reloading:** The frontend can trigger a live model reload if a new model weights file (`.pt`) is selected or uploaded, swapping the active inference engine without restarting the server.
