"""
ESP32 IoT Hardware Detection Service
-------------------------------------
Automatically detects whether an ESP32 microcontroller is connected
to the configured serial port (e.g. COM5 at 115200 baud).

Instead of relying on a user-toggled boolean, this service probes the
actual serial port and reports real-time connection status.
"""

import time
import threading
import serial
import serial.tools.list_ports
from ..models.database import db

class ESP32Service:
    def __init__(self):
        self._connected = False
        self._detected_port = None
        self._last_check = 0
        self._check_interval = 5.0
        self._lock = threading.Lock()
        self.ser = None

    def _list_serial_ports(self):
        try:
            return [port.device for port in serial.tools.list_ports.comports()]
        except Exception:
            return []

    def _connect_port(self, port: str, baud: int) -> bool:
        if self.ser is not None and self.ser.is_open:
            if self.ser.port == port:
                return True
            else:
                self.ser.close()
        
        try:
            self.ser = serial.Serial(port, baud, timeout=1, dsrdtr=False, rtscts=False)
            print(f"[ESP32 IoT Serial] Connecting to {port} and waiting for boot...")
            time.sleep(2.0)  # Wait for ESP32 reset to finish
            return self.ser.is_open
        except (serial.SerialException, OSError):
            self.ser = None
            return False

    def detect(self) -> dict:
        now = time.time()
        if (now - self._last_check) < self._check_interval:
            with self._lock:
                return {
                    "connected": self._connected,
                    "port": self._detected_port,
                }

        self._last_check = now
        enabled = db.get_setting("esp32_enabled", True)
        com_port = db.get_setting("esp32_com_port", "COM5")
        baud = db.get_setting("esp32_baud_rate", 115200)
        available_ports = self._list_serial_ports()

        connected = False
        detected_port = None

        if enabled and available_ports:
            # Check if currently connected port is still valid
            if self.ser and self.ser.is_open and self.ser.port in available_ports:
                connected = True
                detected_port = self.ser.port
            else:
                # Try configured port
                if com_port in available_ports:
                    connected = self._connect_port(com_port, baud)
                    if connected:
                        detected_port = com_port
                
                # Try auto-detect
                if not connected:
                    for p in available_ports:
                        desc_lower = ""
                        try:
                            for port_info in serial.tools.list_ports.comports():
                                if port_info.device == p:
                                    desc_lower = (port_info.description or "").lower()
                                    break
                        except Exception:
                            pass
                        if "serial" in desc_lower or "cp210" in desc_lower or "ch340" in desc_lower or "esp" in desc_lower or "silicon" in desc_lower or "uart" in desc_lower:
                            connected = self._connect_port(p, baud)
                            if connected:
                                detected_port = p
                                break

        with self._lock:
            self._connected = connected
            self._detected_port = detected_port
            if not connected and self.ser:
                try:
                    self.ser.close()
                except:
                    pass
                self.ser = None

        return {
            "connected": connected,
            "port": detected_port or com_port,
            "baud_rate": baud,
            "available_ports": available_ports,
            "enabled": enabled,
        }

    @property
    def is_connected(self) -> bool:
        return self._connected

    def force_probe(self) -> dict:
        self._last_check = 0
        return self.detect()

    def send_safe_signal(self) -> bool:
        esp_status = self.detect()
        if not esp_status.get("connected") or not self.ser:
            return False

        try:
            self.ser.write(b"SAFE\n")
            self.ser.flush()
            print(f"[ESP32 IoT Serial] Sent 'SAFE\\n' signal to {self.ser.port} -> All PPE OK!")
            return True
        except Exception as e:
            print(f"[ESP32 IoT Serial] Failed to send SAFE signal ({e}).")
            self._last_check = 0 # Force reconnect next time
            return False

    def send_alert_signal(self) -> bool:
        esp_status = self.detect()
        if not esp_status.get("connected") or not self.ser:
            return False

        try:
            self.ser.write(b"ALERT\n")
            self.ser.flush()
            print(f"[ESP32 IoT Serial] Sent 'ALERT\\n' signal to {self.ser.port} -> Buzzer & LED Activated for 3s!")
            return True
        except Exception as e:
            print(f"[ESP32 IoT Serial] Failed to send ALERT signal ({e}).")
            self._last_check = 0 # Force reconnect next time
            return False

esp32_service = ESP32Service()
