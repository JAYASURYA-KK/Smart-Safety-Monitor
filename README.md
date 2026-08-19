# Smart Safety Monitor 🦺🤖
> **Real-time AI-Powered Construction Site Safety & PPE Monitoring System**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
![React](https://img.shields.io/badge/React-18.0-cyan)
![FastAPI](https://img.shields.io/badge/FastAPI-0.116-green)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-orange)

---

## 📌 Project Overview

**Smart Safety Monitor** is a real-time computer vision and IoT safety platform designed to monitor construction sites and industrial environments for Personal Protective Equipment (PPE) compliance. Powered by a fine-tuned **YOLOv8 model (`v2.pt`)**, **FastAPI**, **React + TypeScript**, and **ESP32 IoT Serial Hardware Alarms**, the system detects workers, safety compliance, and safety violations in real time.

---

## ✨ Key Features

- 🎥 **Dual-Stream Monitoring**: Supports physical USB Webcams (`CAM-01`) and Mobile IP/RTSP Camera Streams (`CAM-02`).
- 🧠 **YOLO Real-time Inference Engine**: Detects 10 classes (`helmet`, `gloves`, `vest`, `boots`, `goggles`, `Person`, `no_helmet`, `no_goggle`, `no_gloves`, `no_boots`).
- ⚡ **Physical IoT Alarm Integration**: Triggers physical ESP32 Base Station (Buzzer & High-Power LED) over USB Serial upon critical safety violations.
- 📊 **Dynamic Telemetry & Analytics**: Live WebSocket telemetry broadcasting, hourly trend graphs, and violation breakdowns powered by SQLite WAL storage.
- 🛡️ **Enterprise Security Hardened**: CORS protection, rate-limiting on camera controls, WebSocket origin handshake verification, and non-blocking asynchronous hardware triggers.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Lucide Icons, Recharts |
| **Backend** | Python 3.13, FastAPI, Uvicorn, SQLite (WAL mode), WebSockets |
| **AI / ML** | PyTorch, Ultralytics YOLOv8, OpenCV |
| **IoT Hardware** | ESP32 Microcontroller (USB Serial 115200 baud) |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Activate environment (Windows: .venv\Scripts\activate, Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📷 Standalone Live Camera Detection
To run live webcam detection directly via Python OpenCV window:
```bash
python live_detect.py
```
Press `q` in the OpenCV window to exit cleanly.

---

## 📜 License
This project is open-source under the [MIT License](LICENSE).
