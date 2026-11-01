# Smart Safety Monitor: Comprehensive System Architecture & Engineering Documentation

> **Complete End-to-End Technical Documentation for the Smart Safety Monitor Platform**  
> *Version: 2.0.0 | Architecture: Full-Stack Computer Vision + IoT Cyber-Physical System*

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Complete Technology Stacks](#2-complete-technology-stacks)
   - [2.1 Backend Stack (Python / FastAPI)](#21-backend-stack-python--fastapi)
   - [2.2 Frontend Stack (React / TypeScript / Vite)](#22-frontend-stack-react--typescript--vite)
   - [2.3 Computer Vision & AI / ML Pipeline](#23-computer-vision--ai--ml-pipeline)
   - [2.4 Face Recognition & Biometrics Pipeline](#24-face-recognition--biometrics-pipeline)
   - [2.5 Embedded & Hardware IoT Systems](#25-embedded--hardware-iot-systems)
   - [2.6 Database, State & Storage Architecture](#26-database-state--storage-architecture)
   - [2.7 Containerization & Deployment Architecture](#27-containerization--deployment-architecture)
3. [System Architecture & Data Flow Workflows](#3-system-architecture--data-flow-workflows)
   - [3.1 High-Level Architecture Diagram](#31-high-level-architecture-diagram)
   - [3.2 Multi-Camera Ingestion & Buffer Management Pipeline](#32-multi-camera-ingestion--buffer-management-pipeline)
   - [3.3 Real-Time YOLO Inference & Person Inference Bug Fix](#33-real-time-yolo-inference--person-inference-bug-fix)
   - [3.4 Asynchronous Facial Identification & Metadata Attribution](#34-asynchronous-facial-identification--metadata-attribution)
   - [3.5 Safety Rule Evaluation & Dual-Alert Dispatch Workflow](#35-safety-rule-evaluation--dual-alert-dispatch-workflow)
   - [3.6 Real-Time Telemetry Broadcasting (WebSocket Engine)](#36-real-time-telemetry-broadcasting-websocket-engine)
   - [3.7 Smart Helmet IoT Wearable & Firebase Realtime Cloud Workflow](#37-smart-helmet-iot-wearable--firebase-realtime-cloud-workflow)
4. [Database & Schema Architecture](#4-database--schema-architecture)
   - [4.1 SQLite Storage Engine (`storage.db`)](#41-sqlite-storage-engine-storagedb)
   - [4.2 Data Dictionaries (`alerts`, `events`, `settings`)](#42-data-dictionaries-alerts-events-settings)
   - [4.3 Face Vector Database (`face_database.pkl` & `persons.csv`)](#43-face-vector-database-face_databasepkl--personscsv)
   - [4.4 Firebase Realtime Database Structure (`/sensors/latest` & `/sensors/history`)](#44-firebase-realtime-database-structure-sensorslatest--sensorshistory)
5. [Frontend Dashboard Pages & Feature Breakdown](#5-frontend-dashboard-pages--feature-breakdown)
   - [5.1 Navigation & Master Shell (`Navbar`, `Sidebar`, `App.tsx`)](#51-navigation--master-shell-navbar-sidebar-apptsx)
   - [5.2 Page 1: Overview Dashboard (`Overview.tsx`)](#52-page-1-overview-dashboard-overviewtsx)
   - [5.3 Page 2: Live Camera Monitoring (`LiveMonitoring.tsx` & `CameraCard.tsx`)](#53-page-2-live-camera-monitoring-livemonitoringtsx--cameracardtsx)
   - [5.4 Page 3: Smart Helmet IoT Digital Twin (`HelmetIoT.tsx` & `Helmet3DViewer.tsx`)](#54-page-3-smart-helmet-iot-digital-twin-helmetiottsx--helmet3dviewertsx)
   - [5.5 Page 4: Safety Alerts & Violations (`SafetyAlerts.tsx`)](#55-page-4-safety-alerts--violations-safetyalertstsx)
   - [5.6 Page 5: Safety Analytics & Telemetry (`Analytics.tsx`)](#56-page-5-safety-analytics--telemetry-analyticstsx)
   - [5.7 Page 6: Event History & Audit Logs (`EventHistory.tsx`)](#57-page-6-event-history--audit-logs-eventhistorytsx)
   - [5.8 Page 7: Worker Registry & Face Recognition (`Workers.tsx`)](#58-page-7-worker-registry--face-recognition-workerstsx)
   - [5.9 Page 8: System & Model Diagnostics (`SystemModel.tsx`)](#59-page-8-system--model-diagnostics-systemmodeltsx)
   - [5.10 Page 9: System Configuration & Explorer (`Settings.tsx`)](#510-page-9-system-configuration--explorer-settingstsx)
6. [Complete Backend API & WebSocket Reference](#6-complete-backend-api--websocket-reference)
   - [6.1 Cameras API (`/api/cameras`)](#61-cameras-api-apicameras)
   - [6.2 Safety Alerts API (`/api/alerts`)](#62-safety-alerts-api-apialerts)
   - [6.3 Safety Events API (`/api/events`)](#63-safety-events-api-apievents)
   - [6.4 Analytics API (`/api/analytics`)](#64-analytics-api-apianalytics)
   - [6.5 System & Diagnostic API (`/api/system`)](#65-system--diagnostic-api-apisystem)
   - [6.6 Settings API (`/api/settings`)](#66-settings-api-apisettings)
   - [6.7 Worker Management API (`/api/workers`)](#67-worker-management-api-apiworkers)
   - [6.8 Real-Time Telemetry WebSocket (`/ws/live-data`)](#68-real-time-telemetry-websocket-wslive-data)
7. [Embedded Hardware Firmware & Pinout Guides](#7-embedded-hardware-firmware--pinout-guides)
   - [7.1 ESP32 Base Station (`esp32_ppe_alert.ino`)](#71-esp32-base-station-esp32_ppe_alertino)
   - [7.2 ESP32 Smart Helmet Node (`construction_safety_wifimanager.ino`)](#72-esp32-smart-helmet-node-construction_safety_wifimanagerino)
8. [Installation, Setup & Deployment Operations](#8-installation-setup--deployment-operations)
   - [8.1 Prerequisites](#81-prerequisites)
   - [8.2 Automated Startup Scripts](#82-automated-startup-scripts)
   - [8.3 Docker Container Deployment](#83-docker-container-deployment)
   - [8.4 Troubleshooting & Operational Runbook](#84-troubleshooting--operational-runbook)

---

## 1. Executive Summary

The **Smart Safety Monitor** is an enterprise-grade cyber-physical safety intelligence platform designed for construction zones, industrial manufacturing plants, hazardous sites, and oil & gas facilities.

The platform solves two critical industrial challenges concurrently:
1. **Visual Compliance Enforcement (AI Edge Vision):** Continuous non-intrusive surveillance using YOLOv8/v11 deep learning to audit Personal Protective Equipment (PPE) compliance across multi-camera streams, with automatic identification of violators using InsightFace biometrics.
2. **Worker Biological & Physical Hazard Sensing (Smart Helmet IoT):** Continuous telemetry collection from wearable smart helmets measuring heat stress, toxic carbon monoxide leaks, fall impacts, worker immobility, and emergency SOS alerts, synchronized in real time to the cloud and visualized as an interactive 3D digital twin.

```
+---------------------------------------------------------------------------------------------------+
|                                  SMART SAFETY MONITOR ECOSYSTEM                                   |
+------------------------------------+----------------------------------+---------------------------+
|        AI Computer Vision          |      Hardware Cyber-Physical     |     Cloud & Dashboard     |
| - 3-Channel Multi-Stream Capture   | - ESP32 Physical Base Station    | - 9 Dashboard Pages       |
| - Custom YOLOv8/v11 (10 Classes)   |   (Buzzer + Strobe Alarm)        | - Interactive 3D Helmet   |
| - InsightFace Biometric Identity   | - ESP32 Smart Helmet Wearable    |   Digital Twin (Three.js) |
| - Dynamic Per-Class Thresholds     |   (MPU6050, MQ-7, DHT22, SOS)    | - Real-Time WebSockets    |
| - Rate-Limited Alert Engine        | - Captive Hotspot Portal         | - SQLite WAL Database     |
+------------------------------------+----------------------------------+---------------------------+
```

---

## 2. Complete Technology Stacks

### 2.1 Backend Stack (Python / FastAPI)
- **Language / Runtime:** Python 3.10+ (tested on Python 3.10 & 3.11 with virtualenv `.venv`)
- **Web & API Framework:** [FastAPI](https://fastapi.tiangolo.com/) (`>=0.116.0`)
- **ASGI Production Server:** [Uvicorn](https://www.uvicorn.org/) (`uvicorn[standard]>=0.35.0`)
- **Data Validation & Typing:** [Pydantic v2](https://docs.pydantic.dev/) (`pydantic>=2.11.0`)
- **Computer Vision Runtime:** [OpenCV Python](https://opencv.org/) (`opencv-python>=4.7.0`)
- **Deep Learning Framework:** [PyTorch](https://pytorch.org/) & [Ultralytics YOLO](https://github.com/ultralytics/ultralytics) (`ultralytics>=8.4.0`)
- **Facial Recognition & Vector Extraction:** [InsightFace](https://github.com/deepinsight/insightface) (`buffalo_l` model on ONNX Runtime)
- **Hardware Serial Communications:** [PySerial](https://pythonhosted.org/pyserial/) (`pyserial>=3.5`)
- **Real-Time Bidirectional Comms:** [WebSockets](https://websockets.readthedocs.io/) (`websockets>=17.0.0`)
- **Environment Management:** [python-dotenv](https://pypi.org/project/python-dotenv/) (`python-dotenv>=1.1.0`)
- **Scientific Computing & Linear Algebra:** [NumPy](https://numpy.org/) (`numpy>=2.0.0`), [Pandas](https://pandas.pydata.org/) (`pandas>=2.0.0`)
- **Image Processing Utilities:** [Pillow](https://python-pillow.org/) (`pillow>=11.0.0`)

### 2.2 Frontend Stack (React / TypeScript / Vite)
- **UI Library:** [React 19](https://react.dev/) (`react@19.2.8`, `react-dom@19.2.8`)
- **Build Tool & Dev Server:** [Vite 8](https://vitejs.dev/) (`vite@8.2.0`, `@vitejs/plugin-react@6.0.4`)
- **Type Safety & Compiler:** [TypeScript](https://www.typescriptlang.org/) (`~6.0.2`, `@types/node@24.13.3`, `@types/react@19.2.17`)
- **CSS Styling Framework:** [TailwindCSS v4](https://tailwindcss.com/) (`tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`)
- **3D Graphics & WebGL Rendering:** [Three.js](https://threejs.org/) (`three@0.186.1`, `@types/three@0.186.0`)
- **Data Visualization & Charts:** [Recharts](https://recharts.org/) (`recharts@3.10.1`)
- **Iconography:** [Lucide React](https://lucide.dev/) (`lucide-react@1.32.0`)
- **Cloud Realtime Client:** [Firebase JavaScript SDK](https://firebase.google.com/) (`firebase@13.0.0`)
- **Linter & Code Quality:** [Oxlint](https://oxc.rs/) (`oxlint@1.75.0`)

### 2.3 Computer Vision & AI / ML Pipeline
- **Primary Model Weights:** `backend/model/best6.pt` (and root `best.pt`, 22.5 MB)
- **Model Architecture:** YOLOv8 / YOLOv11 small/nano architecture fine-tuned for construction safety equipment.
- **Inference Classes (10 Total):**
  - **Compliance Classes (6):** `helmet`, `gloves`, `vest`, `boots`, `goggles`, `person`
  - **Violation Classes (4):** `no_helmet`, `no_goggle`, `no_gloves`, `no_boots`
- **Dynamic Class Normalization:** Automates translation of diverse labeling conventions (e.g. `no-hardhat` $\to$ `no_helmet`, `safety-vest` $\to$ `vest`).
- **Per-Class Thresholding Engine:**
  - Standard items (`helmet`, `person`, `no_helmet`): `0.35`
  - Torso and Footwear (`vest`, `boots`, `no_boots`): `0.25`
  - Micro-objects (`goggles`, `no_goggle`, `gloves`, `no_gloves`): `0.20`
- **Logical Person Presence Inference:** Automatic compensation for camera occlusion where PPE or violations are recognized, but the human body box was partially clipped.

### 2.4 Face Recognition & Biometrics Pipeline
- **Model:** InsightFace `buffalo_l` (Detection: RetinaFace; Recognition: ArcFace / ResNet 512-dimensional vector embedding).
- **Inference Execution:** Local ONNX Runtime (`CPUExecutionProvider` or CUDA).
- **Matching Metric:** Cosine similarity ($S_c = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \|\mathbf{b}\|}$) against `face_database.pkl`.
- **Match Threshold:** `0.45` (tuned for high recall in industrial environments).
- **Debounce / Performance Optimization:** Asynchronous background worker execution with a 2-second debounce and a 5-second TTL cache for face identification overlays.

### 2.5 Embedded & Hardware IoT Systems
1. **Physical Alert Base Station:**
   - **Microcontroller:** ESP32 DevKit V1 (ESP-WROOM-32).
   - **Interface:** USB Serial UART at 115200 baud (`COM5`, `COM7`, or auto-detected).
   - **Actuators:** Pin 2 (Visual Alert LED Indicator), Pin 4 / Pin 25 (Audible Piezo Buzzer).
   - **Protocol:** ASCII text commands (`ALERT\n` for 3-second alarm, `SAFE\n` for all-clear).
2. **Smart Helmet Wearable IoT Node:**
   - **Microcontroller:** ESP32 with integrated 802.11 b/g/n Wi-Fi.
   - **Sensors:**
     - **Inertial Measurement Unit (IMU):** MPU-6050 (3-axis accelerometer $\pm 8g$ + 3-axis gyroscope $\pm 1000^\circ/s$ over I2C on GPIO 21 SDA & GPIO 22 SCL).
     - **Temperature & Humidity:** DHT22 / AM2302 (GPIO 4).
     - **Toxic Gas Sensor:** MQ-7 Carbon Monoxide Sensor (Digital DO on GPIO 27).
     - **Emergency SOS Trigger:** Tactile Push Button with internal pull-up (GPIO 26).
     - **Audible Warning:** Active Piezo Buzzer on GPIO 25.
   - **Provisioning:** Captive portal hotspot via `WiFiManager` (`Helmet-Setup` at `192.168.4.1`, factory reset via BOOT pin held for 5 seconds).
   - **Cloud Sync:** Firebase Realtime Database Client Library by Mobizt.

### 2.6 Database, State & Storage Architecture
- **Primary Embedded Database:** SQLite 3 (`backend/storage.db`).
- **Concurrency Mode:** Write-Ahead Logging (`PRAGMA journal_mode=WAL;`) with 5-second busy timeout.
- **Security:** Restrictive OS permissions (`chmod 0o600`) restricting access to the server process.
- **Automated Retention Engine:** Prunes records to prevent disk bloat (retains top 2,000 alerts and 5,000 detection events).
- **Vector Embedding Store:** Pickled Python dictionary (`face_database.pkl`) containing numpy arrays indexed by worker IDs.
- **Worker Demographics:** Flat CSV registry (`persons.csv`) containing IDs, names, roll numbers, departments, and telephone contacts.
- **Cloud Realtime Database:** Google Firebase RTDB (`https://esp32-live-monitor-31ea3-default-rtdb.firebaseio.com/`).

### 2.7 Containerization & Deployment Architecture
- **Multi-Stage Dockerfile:**
  - **Stage 1 (Node.js 20-slim):** Compiles React 19 / TypeScript application into static distribution bundle (`/app/frontend/dist`).
  - **Stage 2 (Python 3.10-slim-buster):** Installs Linux OpenCV graphics libraries (`libgl1-mesa-glx`, `libglib2.0-0`, `ffmpeg`, `libsm6`, `libxext6`), installs Python wheels, mounts frontend assets, and exposes port `7860`.
- **Local Multi-Process Launchers:**
  - Windows Batch script: `start_system.bat`
  - Windows PowerShell script: `start_system.ps1`

---

## 3. System Architecture & Data Flow Workflows

### 3.1 High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Video_Ingestion["Video Ingestion Layer"]
        CAM1["CAM-01: PC Built-in Webcam (Index 0)"]
        CAM2["CAM-02: USB External Camera (Index 1)"]
        CAM3["CAM-03: WiFi / IP Camera (RTSP / HTTP)"]
    end

    subgraph Backend_Processing["FastAPI Backend Processing Engine"]
        CW["SingleCameraWorkers (Buffer Dropping Thread)"]
        YOLO["YOLOv8/v11 Inference Service (best6.pt)"]
        FR["InsightFace Biometric Identifier (buffalo_l)"]
        RULE["Safety Alert & Cooldown Engine (5s Cooldown)"]
        EVENT["Safety Event Logger (3s Cooldown)"]
        DB[(SQLite WAL Engine: storage.db)]
        WS_MGR["WebSocket Broadcast Manager"]
        ESP_SER["ESP32 Serial Driver (Auto-Detect COM)"]
    end

    subgraph Hardware_Layer["Physical Actuators"]
        ESP32_HW["ESP32 Physical Base Station (LED + Buzzer)"]
    end

    subgraph Wearable_IoT["Smart Helmet Wearable Node"]
        HELMET_ESP["ESP32 Helmet Node (MPU6050, MQ7, DHT22)"]
        FB_RTDB[("Firebase Realtime Cloud Database")]
    end

    subgraph Frontend_App["React 19 / Vite Frontend Dashboard"]
        UI_WS["useWebSocket Hook (/ws/live-data)"]
        UI_FB["useHelmetTelemetry Hook (Firebase SDK)"]
        PAGES["9 Dashboard Pages & 3D Three.js Digital Twin"]
    end

    CAM1 & CAM2 & CAM3 --> CW
    CW --> YOLO
    YOLO --> FR
    YOLO --> RULE
    YOLO --> EVENT
    RULE --> DB
    EVENT --> DB
    RULE -->|ALERT / SAFE Serial Signal| ESP_SER
    ESP_SER --> ESP32_HW
    CW & RULE & YOLO --> WS_MGR
    WS_MGR -->|Telemetry Broadcast ~2Hz| UI_WS
    UI_WS --> PAGES

    HELMET_ESP -->|WiFi Telemetry (3s)| FB_RTDB
    FB_RTDB -->|Realtime Value Sync| UI_FB
    UI_FB --> PAGES
```

---

### 3.2 Multi-Camera Ingestion & Buffer Management Pipeline
In typical OpenCV multi-camera applications, `cv2.VideoCapture.read()` is blocking and buffers frames internally, resulting in latency (1-3 seconds behind real-time) when inference is slower than the camera FPS.

`SingleCameraWorker` eliminates this latency through a **two-tier multi-threaded architecture**:
1. **Dedicated Reader Loop Thread (`_reader_loop`):**
   - Continuously flushes the hardware buffer (`cv2.CAP_PROP_BUFFERSIZE = 1`).
   - Copies the newest raw frame into `self.latest_raw_frame` under an instantaneous mutex lock.
   - If a stream disconnects or encounters consecutive read errors, it triggers automated reconnect logic (with fallback to an offline demo video loop if hardware webcam is unavailable).
2. **Dedicated Capture Loop Thread (`_capture_loop`):**
   - Consumes only the latest frame available at inference time, dropping all intermediate backlog frames.
   - Calculates real-time FPS via a rolling second counter.
   - Encodes the annotated inference frame directly to a byte stream for MJPEG transmission.
3. **On-Demand Camera Hardware Lifecycle:**
   - Physical USB or webcam hardware is **never** locked open when cameras are stopped. Devices are opened strictly on `/api/cameras/{id}/start` and cleanly released on `/api/cameras/{id}/stop`.

---

### 3.3 Real-Time YOLO Inference & Person Inference Bug Fix
The inference cycle is managed by `YoloService`:
1. **Frame Ingestion:** Frame is passed to `model.predict()` with `conf=0.20` base threshold, `iou=0.45`, `imgsz=640`.
2. **Selective Threshold Enforcement:** Detections are filtered dynamically against `PER_CLASS_THRESHOLDS`:
   - Helmet: `conf >= 0.35`
   - Goggles: `conf >= 0.20`
   - Gloves: `conf >= 0.20`
   - Vest: `conf >= 0.25`
   - Boots: `conf >= 0.25`
3. **Bounding Box Classification:** Class names starting with `no_` are tagged `is_violation = True`.
4. **Logical Inference Bug Fix:** 
   ```python
   # Fix: If PPE or violations exist but person was partially clipped or occluded
   person_key = next((k for k in class_counts.keys() if k.lower() == "person"), "Person")
   total_ppe = sum(count for cls, count in class_counts.items() if cls.lower() != "person")
   if total_ppe > 0 and class_counts.get(person_key, 0) == 0:
       class_counts[person_key] = 1
   ```

---

### 3.4 Asynchronous Facial Identification & Metadata Attribution
To prevent heavy biometrics from slowing down the 24 FPS YOLO inference pipeline:
1. When a `person` bounding box is detected, the camera worker tests two conditions:
   - Is another face recognition routine currently executing?
   - Has the 2-second debounce interval elapsed?
2. If true, the worker spawns an asynchronous worker thread (`run_async_face_rec`) passing a snapshot copy of the raw frame.
3. InsightFace locates the largest face crop, extracts its 512-dimensional embedding, and performs cosine similarity against all stored embeddings in `face_database.pkl`.
4. If similarity $\ge 0.45$, the person's profile is loaded from `persons.csv` (`id`, `name`, `roll_no`, `department`, `phone`).
5. The result is cached under `self.cached_person_details` with a 5-second TTL.
6. The video rendering pipeline overlays a dedicated **Identified Violator HUD Badge** with neon border and attaches the profile to any concurrent violation alerts.

---

### 3.5 Safety Rule Evaluation & Dual-Alert Dispatch Workflow
When violations are identified:
1. `AlertService` inspects the active alert rules stored in SQLite.
2. Checks the `cooldown_cache` keyed by `(camera_id, class_name)`.
3. If elapsed time exceeds `cooldown_seconds` (default: 5 seconds):
   - Generates a persistent alert record (`ALT-XXXXXX`) with severity (`critical` or `warning`).
   - If facial identification details exist, they are written directly to the alert's database row.
   - **Physical Hardware Signal:** Dispatches a non-blocking thread to send `ALERT\n` over serial to the connected ESP32 base station. The ESP32 triggers its strobe LED and piezo alarm buzzer for 3 seconds.
4. **Safe State Signal:** If all workers are fully compliant and detections are present, a `SAFE\n` signal is sent to the ESP32 (rate-limited to once every 10 seconds).

---

### 3.6 Real-Time Telemetry Broadcasting (WebSocket Engine)
FastAPI maintains an asynchronous background loop running at 2 Hz (every 500ms):
- Collects per-camera stats: status, FPS, total detections, class counts, and violation counts.
- Probes physical serial ports for ESP32 hardware presence (`COM5`, `COM7`, etc.).
- Compiles a unified JSON telemetry packet and broadcasts it to all connected frontend clients via `/ws/live-data`.
- Enforces origin validation to protect against Cross-Site WebSocket Hijacking (CSWSH).

---

### 3.7 Smart Helmet IoT Wearable & Firebase Realtime Cloud Workflow
The construction safety helmet functions as an independent Cyber-Physical edge device:
1. **Sensor Acquisition Loop:**
   - **MPU-6050:** Sampled every 20ms. Computes $G_{\text{total}} = \sqrt{a_x^2 + a_y^2 + a_z^2}$. If $G_{\text{total}} \ge 2.5g$, triggers impact state for 5,000ms.
   - **MQ-7:** Polled continuously. If digital out is pulled LOW, triggers toxic gas alert.
   - **DHT22:** Sampled every 2,000ms. If temperature $\ge 35^\circ\text{C}$, triggers high-temperature warning.
   - **SOS Switch:** If pulled to ground (GPIO 26), latches an emergency distress signal for 3,000ms.
2. **Local Audio-Visual Alert:** The onboard piezo buzzer immediately sounds if gas, impact, SOS, or extreme temperature occurs—even if Wi-Fi is completely down.
3. **Cloud Synchronization:**
   - Synchronizes telemetry every 3,000ms to Firebase RTDB node `/sensors/latest`.
   - On new alert onset or every 30,000ms, pushes an immutable historical snapshot to `/sensors/history`.
4. **Digital Twin Visualization:**
   - The React frontend subscribes to `/sensors/latest` using the Firebase JavaScript SDK.
   - Calculates Pitch and Roll angles in degrees.
   - Updates the Three.js 3D safety helmet model in real time.

---

## 4. Database & Schema Architecture

### 4.1 SQLite Storage Engine (`storage.db`)
Located at `backend/storage.db`, the database uses SQLite with Write-Ahead Logging (`WAL`).

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```

---

### 4.2 Data Dictionaries

#### Table 1: `alerts`
Stores actionable safety non-compliance violations.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique alert ID, e.g., `ALT-9F3B21` |
| `camera_id` | TEXT | NOT NULL | Camera channel ID, e.g., `CAM-01` |
| `camera_name` | TEXT | NOT NULL | Friendly display name |
| `class_name` | TEXT | NOT NULL | Detected class, e.g., `no_helmet`, `no_goggle` |
| `confidence` | REAL | NOT NULL | AI detection confidence score (0.0 to 1.0) |
| `severity` | TEXT | NOT NULL | Alert priority: `critical`, `warning`, `info` |
| `timestamp` | TEXT | NOT NULL | ISO-8601 timestamp |
| `status` | TEXT | NOT NULL | Workflow state: `active`, `acknowledged`, `resolved` |
| `person_id` | TEXT | NULLABLE | Identified worker ID (from biometrics) |
| `person_name` | TEXT | NULLABLE | Identified worker full name |
| `person_roll_no`| TEXT | NULLABLE | Worker badge / roll number |
| `person_dept` | TEXT | NULLABLE | Worker department |
| `person_phone` | TEXT | NULLABLE | Worker emergency telephone contact |

#### Table 2: `events`
High-frequency inspection event log recording both compliance signals and violations.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique event ID, e.g., `EVT-481A0C` |
| `timestamp` | TEXT | NOT NULL | ISO-8601 timestamp |
| `camera_id` | TEXT | NOT NULL | Associated camera ID |
| `camera_name` | TEXT | NOT NULL | Associated camera friendly name |
| `class_name` | TEXT | NOT NULL | Detected class name |
| `confidence` | REAL | NOT NULL | Detection confidence score |
| `severity` | TEXT | NOT NULL | Severity classification |
| `is_violation` | INTEGER | NOT NULL | `1` for violation, `0` for compliance |
| `status` | TEXT | NOT NULL | Record status (`RECORDED`) |

#### Table 3: `settings`
Key-value store holding runtime configuration parameters as JSON strings.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `key` | TEXT | PRIMARY KEY | Setting key, e.g., `alert_rules`, `model_path` |
| `value` | TEXT | NOT NULL | JSON serialized payload |

---

### 4.3 Face Vector Database (`face_database.pkl` & `persons.csv`)
- **`backend/face/face_database.pkl`:**
  Serialized Python dictionary mapping string person IDs to lists of 512-dimensional floating-point vectors:
  ```python
  {
      "101": [
          np.ndarray(shape=(512,), dtype=float32),  # Front angle
          np.ndarray(shape=(512,), dtype=float32),  # Front up
          np.ndarray(shape=(512,), dtype=float32),  # Front down
          np.ndarray(shape=(512,), dtype=float32),  # Right profile
          np.ndarray(shape=(512,), dtype=float32),  # Left profile
          np.ndarray(shape=(512,), dtype=float32)   # Test validation
      ]
  }
  ```
- **`backend/face/persons.csv`:**
  ```csv
  id,name,roll_no,department,phone
  101,JAYASURYA K,24CSR114,CSE,9080418085
  ```

---

### 4.4 Firebase Realtime Database Structure
- **`/sensors/latest`:**
  ```json
  {
    "temperature": 29.4,
    "humidity": 58.2,
    "dht_ok": true,
    "high_temp_alert": false,
    "mq7_do": 1,
    "gas_alert": false,
    "sos_alert": false,
    "mpu_ok": true,
    "impact_alert": false,
    "peak_g": 1.08,
    "accel_x": 0.02,
    "accel_y": 0.12,
    "accel_z": 0.98,
    "gyro_x": 0.01,
    "gyro_y": -0.02,
    "gyro_z": 0.00,
    "mpu_temperature": 33.1,
    "any_alert": false,
    "uptime_s": 1420
  }
  ```
- **`/sensors/history`:**
  List of historical timestamped objects structured identically to `/sensors/latest` for longitudinal chart rendering.

---

## 5. Frontend Dashboard Pages & Feature Breakdown

### 5.1 Navigation & Master Shell (`Navbar`, `Sidebar`, `App.tsx`)
- **`Navbar.tsx`:**
  - Displays platform branding and active model indicator pill (`v2.pt Active`).
  - Real-time WebSocket connection state indicator (pulsing green "System Live" or red "Reconnecting").
  - System clock showing ISO-8601 local time.
  - Active violation badge showing count of unresolved safety events.
  - Hardware status pill displaying ESP32 connection state (`Connected`, `Searching`, or `Disabled`).
- **`Sidebar.tsx`:**
  - Sleek collapsible sidebar with icons for all 9 dashboard pages.
  - Dynamic alert badge with real-time counter on the "Safety Alerts" navigation tab.
  - System specs footer displaying running versions and hardware acceleration mode.

---

### 5.2 Page 1: Overview Dashboard (`Overview.tsx`)
The operational command center for safety managers:
- **Top Banner:** High-level status overview, model descriptor, and quick-launch button for Live Monitoring.
- **KPI Metrics Cards (4):**
  1. *PPE Compliance Signals:* Total active bounding box detections.
  2. *Active Violations:* Critical count of safety infractions.
  3. *Cameras Online:* Active camera channels vs. physically detected cameras.
  4. *AI Inference Engine:* Active model name, inference FPS, and execution hardware (CUDA / CPU).
- **Camera Availability Status Bar:** Visual health indicators for CAM-01 (PC), CAM-02 (USB), and CAM-03 (WiFi).
- **Smart Helmet Wearable IoT Status Banner:**
  - Online/Offline status badge with ping heartbeat tracker.
  - Real-time hazard warning pills (SOS active, gas leak, fall impact).
  - Live environmental summary (Temperature, Humidity, Peak G, Tilt angles).
  - Quick-launch button into the 3D Helmet View.
- **Live Camera Channels Preview:** Compact multi-card video feeds with controls to start/stop channels or open fullscreen modals.
- **Recent Safety Alerts Feed:** Real-time stream of the 5 most recent violations with one-click "Acknowledge" buttons.
- **System & Model Health Widget:** Diagnostics overview including model weights, total classes, and alert cooldown settings.

---

### 5.3 Page 2: Live Camera Monitoring (`LiveMonitoring.tsx` & `CameraCard.tsx`)
Multi-stream surveillance dashboard:
- **Stream Auto-Discovery:** "Refresh Cameras" button probes all USB ports and network endpoints.
- **Conditional Visibility:**
  - `CAM-01 (PC Webcam)`: Always shown.
  - `CAM-02 (USB Camera)`: Automatically revealed when a physical external camera is connected.
  - `CAM-03 (WiFi/IP Camera)`: Automatically revealed when an RTSP/HTTP camera URL is reachable.
- **Interactive Camera Cards (`CameraCard.tsx`):**
  - Live low-latency MJPEG video stream with bounding boxes and compliance overlays.
  - Start, Stop, and Reconnect camera controls with anti-spam cooldown protection.
  - Resolution and channel type badges (PC, USB, WiFi).
  - Live FPS and violation counter badge.
  - Detection summary chips showing active object counts (Helmets, Vests, Goggles, Persons).
- **Fullscreen Modal (`FullscreenCameraModal.tsx`):**
  - Expands any camera feed to a high-definition fullscreen modal.
  - Displays detection lists with confidence percentages and timestamps.

---

### 5.4 Page 3: Smart Helmet IoT Digital Twin (`HelmetIoT.tsx` & `Helmet3DViewer.tsx`)
A cyber-physical 3D digital twin dashboard:
- **Interactive 3D Helmet Model (`Helmet3DViewer.tsx`):**
  - Custom WebGL rendering pipeline built on Three.js.
  - Renders a hard hat geometry complete with crown ribs, brim, suspension mounts, and sensor module casings.
  - Rotates dynamically in 3D space matching the real-time Pitch, Roll, and Yaw angles received from the MPU-6050 gyroscope and accelerometer.
  - OrbitControls allow manual mouse rotation, pan, and zoom inspection.
  - Dynamic hazard lighting: the helmet glows warning yellow during alerts and flashes emergency red during impact or SOS states.
- **Orientation & Calibration Controls:**
  - Pitch & Roll digital gauges with degree measurements.
  - Total G-force digital accelerometer readout.
  - *Calibrate Level:* Sets current helmet angle as the baseline horizon ($0^\circ, 0^\circ$).
  - *Invert Pitch / Roll:* Toggles axis inversion for custom sensor mounting orientations.
  - *Reset Calibration:* Restores factory defaults.
- **Environmental & Hazard Sensor Grid:**
  - Temperature meter with high-temperature alert threshold ($>35^\circ\text{C}$).
  - Relative humidity percentage gauge.
  - MQ-7 Carbon Monoxide hazard monitor (PPM threshold detection).
  - Impact force shockwave meter with peak hold memory ($>2.5g$ threshold).
  - Emergency SOS worker distress status pill.
  - MPU-6050 & DHT22 sensor diagnostic health indicators.
  - Device uptime counter (hours, minutes, seconds).
- **Interactive Hardware Demo Simulation:**
  - Toggles a simulated data generator when physical hardware is not on site.
  - Generates realistic tilting motions.
  - Test buttons for simulated Impact Shockwaves ($3.42g$), Toxic Gas leaks, and Emergency SOS calls.
- **Longitudinal Telemetry Charts (Recharts):**
  - *Temperature & Humidity Trend:* Double-line chart with a $35^\circ\text{C}$ critical threshold reference line.
  - *G-Force Acceleration Trend:* Tracks real-time Total G and Peak G with a $2.5g$ impact reference line.

---

### 5.5 Page 4: Safety Alerts & Violations (`SafetyAlerts.tsx`)
Auditing and compliance resolution center:
- **Status Filter Tabs:** Filter alerts across `All`, `Active`, `Acknowledged`, and `Resolved` states.
- **Polling Loop:** Automatically refreshes records every 2,000ms.
- **Alert Card Elements:**
  - Severity indicator icon (Critical: Red, Warning: Amber, Info: Blue).
  - Violation title (e.g., `NO HELMET VIOLATION`, `NO GOGGLE WARNING`).
  - Source camera badge and alert ID (`ALT-XXXXXX`).
  - Confidence percentage score and localized timestamp.
  - **Identified Violator Card:** When facial biometrics match a worker, displays their full name, ID, roll number, department, and phone number.
  - **Action Buttons:** "Acknowledge" button to signal manager review; "Resolve" button to archive the violation once corrected.

---

### 5.6 Page 5: Safety Analytics & Telemetry (`Analytics.tsx`)
Business intelligence dashboard powered by Recharts:
- **Detection & Violation Hourly Timeline:** Area chart plotting overall detections vs. safety infractions across 24-hour time slots.
- **PPE Class Distribution:** Horizontal bar chart comparing counts for all 10 detected classes.
- **Alert Severity Breakdown:** Donut pie chart detailing proportions of Critical vs. Warning infractions.
- **Alerts by Camera Channel:** Comparative bar chart highlighting infraction density across site locations.

---

### 5.7 Page 6: Event History & Audit Logs (`EventHistory.tsx`)
Forensic compliance inspection log:
- **Search & Filter Controls:**
  - Free-text search matching event IDs or class names.
  - Camera channel selector (`All`, `CAM-01`, `CAM-02`, `CAM-03`).
  - PPE class selector (`All`, `helmet`, `no_helmet`, `vest`, `no_vest`, etc.).
  - Severity filter (`All`, `critical`, `warning`, `info`).
- **Comprehensive Audit Log Table:** Displays timestamp, event ID, camera name, detected class badge, confidence score, and violation status.
- **CSV Export Engine:** Generates and downloads a clean CSV report (`safety_events_YYYY-MM-DD.csv`) for site audits and regulatory compliance.

---

### 5.8 Page 7: Worker Registry & Face Recognition (`Workers.tsx`)
Personnel biometric management portal:
- **Worker Registry Directory:**
  - Tabular roster listing Worker ID, Name, Roll/Badge Number, Department, and Contact Phone.
  - Biometric Registration Status Badge (e.g., `6 Embeddings` or `No Face Data`).
  - Expandable row preview showing thumbnails of all registered face angles.
- **Add Worker & Register Face Modal:**
  - Profile metadata input fields.
  - **6-Angle Facial Photo Upload Dropzones:**
    1. *Front Angle* (Straight neutral)
    2. *Front Up* (Tilted upwards)
    3. *Front Down* (Tilted downwards)
    4. *Right Profile* (Turned right)
    5. *Left Profile* (Turned left)
    6. *Test Validation Photo*
  - Live image preview with remove/replace controls.
  - **All-in-One Submission:** Uploads images, saves metadata to `persons.csv`, extracts InsightFace vectors, and rebuilds `face_database.pkl` in one action.
- **Biometric Test Verification Modal:**
  - Upload any candidate image or camera capture.
  - Runs face detection and compares embeddings against the database.
  - Returns a verification badge displaying the matched worker, similarity confidence percentage score, or an "Unknown Person" flag.
- **Database Maintenance:** "Rebuild Face Database" button triggers batch re-indexing of all worker photo folders.

---

### 5.9 Page 8: System & Model Diagnostics (`SystemModel.tsx`)
AI runtime and execution diagnostics:
- **Diagnostics Overview Cards:** Model filename, absolute filesystem path, execution hardware (`CPUExecutionProvider` or CUDA GPU), and active inference FPS.
- **Class Configuration Badges:** Lists compliance classes (green) and violation classes (red).
- **Global Threshold Sliders:**
  - Confidence Threshold Slider ($0.10$ to $0.90$).
  - Intersection-over-Union (IoU) NMS Slider ($0.10$ to $0.90$).
  - One-click "Save Thresholds" button persists settings to SQLite.
- **Hot Model Reload:** One-click button swaps active model weights from disk without restarting the FastAPI server.
- **Interactive Inference Test Bench:**
  - Drag-and-drop test bench for single JPG/PNG images (with a 10MB file size limit for security).
  - Displays annotated image with bounding boxes, labels, and confidence ratings.
  - Lists detected object counts and logs findings to Event History.

---

### 5.10 Page 9: System Configuration & Explorer (`Settings.tsx`)
Central system settings and hardware manager:
- **Camera Channel Configuration:**
  - CAM-01 (PC Webcam): Device index and custom name.
  - CAM-02 (USB Camera): Device index and custom name.
  - CAM-03 (WiFi/IP Camera): RTSP/HTTP stream URL, custom name, and an interactive "Test Connection" button that checks network reachability and reports stream resolution ($W \times H$).
- **AI Model Explorer & Weights Browser:**
  - *Workspace Models Tab:* Scans repository recursively for all `.pt` files, displaying relative paths and file sizes in MB.
  - *File Explorer Tab:* Interactive folder navigator that traverses server directories to select `.pt` weights anywhere on disk.
  - *Upload Model Tab:* Uploads new `.pt` model files directly into `backend/model/`.
- **ESP32 Cyber-Physical Alarm Configuration:**
  - Hardware alarm toggle (Enable/Disable).
  - COM Port selector (`COM1` through `COM12` or auto-detection).
  - Baud rate configuration (default: `115200`).
  - Real-time connection status pill.
  - "Test Hardware Alarm" button sends an immediate `ALERT\n` signal over USB serial to trigger the physical buzzer and LED strobe for 3 seconds.
- **Alert Rules Engine Configuration:**
  - Interactive table of safety rules (`no_helmet`, `no_goggle`, `no_gloves`, `no_boots`).
  - Enable/disable toggles per rule.
  - Severity level selector (`Critical`, `Warning`, `Info`).
  - Global alert cooldown period (seconds).
  - Auto-reconnect camera toggle.

---

## 6. Complete Backend API & WebSocket Reference

### 6.1 Cameras API (`/api/cameras`)
| Method | Endpoint | Description | Request / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/cameras` | Retrieves status for all 3 camera channels | None | `Record<string, CameraStatus>` |
| `GET` | `/api/cameras/detect` | Probes hardware and reports camera availability | None | `Record<string, CameraAvailabilityInfo>` |
| `POST` | `/api/cameras/{cam_id}/start` | Starts background capture and inference worker | None | `{"status": "started", "camera_id": str}` |
| `POST` | `/api/cameras/{cam_id}/stop` | Stops worker and releases hardware camera lock | None | `{"status": "stopped", "camera_id": str}` |
| `POST` | `/api/cameras/{cam_id}/reconnect` | Recycles connection for a specific camera | None | `{"status": "reconnected", "camera_id": str}` |
| `GET` | `/api/cameras/{cam_id}/stream` | Streams real-time annotated MJPEG video | None | `multipart/x-mixed-replace` |

---

### 6.2 Safety Alerts API (`/api/alerts`)
| Method | Endpoint | Description | Request / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/alerts` | Fetches safety alerts (limit 100) | `status` (optional) | `List<SafetyAlert>` |
| `POST` | `/api/alerts/{id}/acknowledge` | Marks an alert as acknowledged | None | `{"status": "acknowledged", "id": str}` |
| `POST` | `/api/alerts/{id}/resolve` | Marks an alert as resolved | None | `{"status": "resolved", "id": str}` |
| `GET` | `/api/alerts/rules` | Retrieves active alert rules | None | `List<AlertRule>` |
| `POST` | `/api/alerts/rules` | Updates and saves alert rules | `List<AlertRule>` | `{"status": "updated", "rules": list}` |

---

### 6.3 Safety Events API (`/api/events`)
| Method | Endpoint | Description | Request / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/events` | Queries safety inspection events | `search`, `camera_id`, `class_name`, `severity` | `List<SafetyEvent>` |

---

### 6.4 Analytics API (`/api/analytics`)
| Method | Endpoint | Description | Request / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/analytics` | Generates summary KPIs, trends, and distributions | None | `AnalyticsSummary` |

---

### 6.5 System & Diagnostic API (`/api/system`)
| Method | Endpoint | Description | Request / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/health` | System health check and model loading state | None | `{"status": str, "timestamp": str}` |
| `GET` | `/api/system/model` | Model metadata, classes, and inference FPS | None | `ModelInfo` |
| `POST` | `/api/system/model/reload` | Reloads model weights from disk | None | `{"status": str, "message": str}` |
| `POST` | `/api/system/test-image` | Uploads an image to run YOLO inference | Multipart file | `{"annotated_image": base64, "detections": list}` |
| `GET` | `/api/system/face-diagnostics` | Diagnostic status for InsightFace biometrics | None | Face DB status JSON |

---

### 6.6 Settings API (`/api/settings`)
| Method | Endpoint | Description | Request / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/settings` | Fetches all system settings and hardware states | None | `SystemSettings` |
| `POST` | `/api/settings` | Updates system settings | `SettingsPayloadSchema` | `{"status": "success", "message": str}` |
| `POST` | `/api/settings/test-esp32` | Sends test `ALERT\n` signal to ESP32 base station | Optional `X-API-Key` | `{"status": str, "message": str}` |
| `POST` | `/api/settings/test-wifi-camera`| Tests connection to a WiFi/IP camera URL | `url` query string | `WiFiCameraTestResult` |
| `GET` | `/api/settings/list-models` | Scans workspace for all `.pt` model files | None | `List<{name, relative_path, size_bytes}>` |
| `GET` | `/api/settings/browse-directory`| Browses server directories for model files | `path` query string | Directory contents JSON |
| `POST` | `/api/settings/upload-model` | Uploads a new `.pt` model file to the server | Multipart `.pt` file | Upload summary JSON |

---

### 6.7 Worker Management API (`/api/workers`)
| Method | Endpoint | Description | Request / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/workers` | Lists all registered workers | None | `{"workers": list, "total": int}` |
| `GET` | `/api/workers/{id}` | Fetches worker profile and registered photos | None | Worker object |
| `POST` | `/api/workers` | Registers a new worker in `persons.csv` | `WorkerCreate` JSON | `{"message": str, "worker": dict}` |
| `DELETE` | `/api/workers/{id}` | Deletes worker and removes face photo folder | None | `{"message": str}` |
| `POST` | `/api/workers/{id}/faces` | Uploads face angle photos for a worker | Multipart photos | `{"saved": list}` |
| `POST` | `/api/workers/register-faces`| Runs batch embedding generation script | None | `{"registered_count": int}` |
| `POST` | `/api/workers/add-and-register`| All-in-one worker creation and face registration | Multipart form | Full registration summary |
| `POST` | `/api/workers/verify-face` | Matches uploaded face against database | Multipart photo | `{"matched": bool, "person": dict, "score": float}` |
| `GET` | `/api/workers/{id}/face-image`| Returns a specific face angle photo | `name` query string | Image binary file |
| `GET` | `/api/workers/db/status` | Reports face database status and vector counts | None | `FaceDbStatus` |

---

### 6.8 Real-Time Telemetry WebSocket (`/ws/live-data`)
- **Protocol:** `ws://<host>:8000/ws/live-data`
- **Security:** Validates `Origin` header against `ALLOWED_ORIGINS` (rejects unauthorized origins with policy code `1008`).
- **Frequency:** Broadcasts every 500ms (~2 Hz).
- **Payload Schema:**
```json
{
  "timestamp": "2026-10-20T12:00:00.000000",
  "cameras": {
    "1": {
      "camera_id": "CAM-01",
      "name": "CAM-01 (PC Webcam)",
      "source_type": "webcam",
      "source_address": "0",
      "is_active": true,
      "status": "online",
      "hardware_detected": true,
      "always_available": true,
      "fps": 24,
      "last_inference_time": "2026-10-20T12:00:00.000000",
      "total_detections": 3,
      "class_counts": { "helmet": 1, "vest": 1, "Person": 1, "no_helmet": 0 },
      "violations_count": 0,
      "error_message": null
    }
  },
  "system": {
    "total_active_detections": 3,
    "total_active_violations": 0,
    "cameras_online": 1,
    "model_loaded": true,
    "inference_fps": 24,
    "device": "cpu",
    "esp32_enabled": true,
    "esp32_connected": true,
    "esp32_port": "COM5",
    "esp32_status": "COM5 (Connected)"
  }
}
```

---

## 7. Embedded Hardware Firmware & Pinout Guides

### 7.1 ESP32 Base Station (`esp32_ppe_alert.ino`)
- **Location:** `esp32/esp32_ppe_alert.ino`
- **Purpose:** Physical alarm receiver connected to the host PC via USB.
- **Pinout:**
  - `GPIO 2`: High-brightness alert LED indicator.
  - `GND`: Common ground.
- **Firmware Logic:**
  - Initializes UART Serial at `115200` baud.
  - Listens for newline-terminated strings.
  - When `ALERT` is received, pulls `GPIO 2` HIGH for 3,000ms (`ALERT_DURATION_MS`), then resets to LOW.

---

### 7.2 ESP32 Smart Helmet Node (`construction_safety_wifimanager.ino`)
- **Location:** `esp32/advance_level/construction_safety_wifimanager.ino`
- **Purpose:** Wearable IoT safety helmet with multi-sensor environmental and physiological hazard detection.
- **Pinout & Wiring Guide:**
  | Component | Sensor Pin | ESP32 GPIO | Operating Voltage | Function |
  |---|---|---|---|---|
  | **DHT22** | DATA | `GPIO 4` | 3.3V / 5V | Temperature & Humidity sampling |
  | **MQ-7** | Digital Out (DO) | `GPIO 27` | 5.0V | Carbon Monoxide leak detection |
  | **MPU-6050**| SDA | `GPIO 21` | 3.3V | I2C Data (Acceleration & Gyro) |
  | **MPU-6050**| SCL | `GPIO 22` | 3.3V | I2C Clock |
  | **SOS Button**| Pin 1 / Pin 2 | `GPIO 26` to `GND` | Internal Pull-Up | Worker emergency distress switch |
  | **Piezo Buzzer**| (+) Pin | `GPIO 25` | 3.3V / 5V | Audible hazard siren |
  | **Boot Button**| Built-in | `GPIO 0` | Internal Pull-Up | Hold for 5s to reset Wi-Fi settings |

---

## 8. Installation, Setup & Deployment Operations

### 8.1 Prerequisites
1. **Operating System:** Windows 10/11, Ubuntu 20.04+, or macOS.
2. **Python:** Version 3.10 or 3.11 with `pip` and virtual environment support.
3. **Node.js:** Version 18.x or 20.x with `npm`.
4. **Hardware (Optional):** ESP32 DevKit V1 board, USB cable, sensors (MPU-6050, DHT22, MQ-7).

---

### 8.2 Automated Startup Scripts

#### Windows (Single Command)
Execute the provided batch launcher from the repository root:
```cmd
start_system.bat
```
*Or via PowerShell:*
```powershell
.\start_system.ps1
```

#### Manual Step-by-Step Setup

1. **Backend Initialization:**
   ```bash
   cd backend
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate

   pip install --upgrade pip
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Frontend Initialization:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Accessing the Platform:**
   - **Frontend Dashboard:** `http://localhost:5173/`
   - **Interactive API Swagger Docs:** `http://localhost:8000/docs`
   - **Backend Health Check:** `http://localhost:8000/api/health`

---

### 8.3 Docker Container Deployment
Build and run the unified multi-stage container:
```bash
# Build Docker image
docker build -t smart-safety-monitor:latest .

# Run container (mapping port 7860 to host)
docker run -d -p 7860:7860 --name safety_monitor smart-safety-monitor:latest
```
Access the application at `http://localhost:7860/`.

---

### 8.4 Troubleshooting & Operational Runbook

| Issue / Symptom | Potential Cause | Remediation Procedure |
|---|---|---|
| **Webcam shows "Webcam not accessible"** | Another process (Teams, Zoom, Discord) is locking camera index 0. | Close conflicting video software. The system will automatically fall back to the demo safety video stream. |
| **ESP32 reports "Searching..."** | Serial drivers missing or wrong port configured in Settings. | Install CH340 or CP210x USB-to-UART bridge VCP drivers. Open *Settings* $\to$ *ESP32 Hardware IoT* and confirm COM port. |
| **Model inference running slowly on CPU** | Thread contention across OpenBLAS and OpenCV. | `main.py` configures `OPENBLAS_NUM_THREADS=1` and `OMP_NUM_THREADS=1`. For GPU acceleration, install CUDA-enabled PyTorch (`torch torchvision --index-url https://download.pytorch.org/whl/cu118`). |
| **Face recognition reports "Service Unavailable"** | `insightface` or ONNX model files are not installed. | Run `pip install insightface onnxruntime`. Open *Workers* and click "Rebuild Face Database". |
| **Smart Helmet 3D model not responding** | Firebase authentication or network connectivity issue. | Verify credentials in `services/firebase.ts`. Use the "Demo Mode" toggle on the Helmet IoT page to test full 3D functionality offline. |
