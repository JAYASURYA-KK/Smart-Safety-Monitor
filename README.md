# Smart Safety Monitor

This project is a comprehensive safety monitoring system that uses **YOLO (Ultralytics)** and **OpenCV** for real-time Personal Protective Equipment (PPE) detection, alongside a facial recognition system. It includes a web dashboard, an API backend, and an optional ESP32 hardware alert integration.

---

## Project Structure

The repository is organized into the following main components:

* **`backend/`**: Contains the FastAPI application. This handles the YOLO v8 object detection, the Face Recognition engine (`backend/face/`), the SQLite database, and the API endpoints for the frontend.
* **`frontend/`**: Contains the React-based web interface for live monitoring, alerts, and settings.
* **`esp32/`**: Contains the Arduino `.ino` code (`esp32_ppe_alert.ino`) and wiring diagrams for the physical ESP32 hardware alert system.
* **`simple_test/`**: Contains standalone Python scripts (`live_detect.py` and `live_detect_esp32.py`) to test the YOLO models and ESP32 serial connections without launching the full web stack.
* **`model_train/`**: Contains the Jupyter notebooks used for training the custom YOLO models (e.g. on Kaggle).
* **`Dockerfile`**: Docker configuration for building and deploying the full stack application.

---

## Getting Started

### 1. Simple Testing Mode (No Web UI)
If you just want to test the camera or the ESP32 connection quickly:

1. Navigate to the `simple_test` directory.
2. Ensure you have the dependencies installed (`ultralytics`, `opencv-python`, `pyserial`).
3. Run the PC-only detection:
   ```bash
   python simple_test/live_detect.py
   ```
4. Or run the ESP32 integration script (make sure your COM port is configured correctly):
   ```bash
   python simple_test/live_detect_esp32.py
   ```

### 2. Full Application (Web UI + Backend)
To run the full Smart Safety Monitor application:

1. **Backend**: Navigate to the `backend/` folder, activate your virtual environment (`backend/.venv`), install dependencies via `requirements.txt`, and start the FastAPI server.
2. **Frontend**: Navigate to the `frontend/` folder, run `npm install`, and then `npm run dev` to start the React dashboard.

---

## Hardware Integration (ESP32)

If you are using the ESP32 hardware for physical alerts (LEDs, buzzers):
1. Flash the `esp32_ppe_alert.ino` script (found in the `esp32/` folder) to your ESP32 device using the Arduino IDE.
2. Follow the `esp32_connection_diagram.png` in the `esp32/` folder for wiring instructions.
3. Connect the ESP32 via USB and ensure the COM port matches the settings in your backend or simple test scripts.
