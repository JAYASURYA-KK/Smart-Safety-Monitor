import { useState, useEffect, useRef } from 'react';
import type { RealtimeTelemetry } from '../types';

const INITIAL_TELEMETRY: RealtimeTelemetry = {
  timestamp: new Date().toISOString(),
  cameras: {
    '1': {
      camera_id: 'CAM-01',
      name: 'CAM-01 (PC Webcam)',
      source_type: 'webcam',
      source_address: '0',
      is_active: false,
      status: 'offline',
      hardware_detected: true,
      always_available: true,
      fps: 0,
      total_detections: 0,
      class_counts: {},
      violations_count: 0,
    },
    '2': {
      camera_id: 'CAM-02',
      name: 'CAM-02 (USB Camera)',
      source_type: 'webcam',
      source_address: '1',
      is_active: false,
      status: 'offline',
      hardware_detected: false,
      always_available: false,
      fps: 0,
      total_detections: 0,
      class_counts: {},
      violations_count: 0,
    },
    '3': {
      camera_id: 'CAM-03',
      name: 'CAM-03 (WiFi Camera)',
      source_type: 'ip_camera',
      source_address: 'http://10.194.10.240:8080/video',
      is_active: false,
      status: 'offline',
      hardware_detected: false,
      always_available: false,
      fps: 0,
      total_detections: 0,
      class_counts: {},
      violations_count: 0,
    },
  },
  system: {
    total_active_detections: 0,
    total_active_violations: 0,
    cameras_online: 0,
    model_loaded: true,
    inference_fps: 0,
    device: 'CPU (PyTorch 2.13)',
    esp32_enabled: true,
    esp32_connected: false,
    esp32_port: 'COM5',
    esp32_status: 'Searching...',
  },
};

export function useWebSocket() {
  const [telemetry, setTelemetry] = useState<RealtimeTelemetry>(INITIAL_TELEMETRY);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live-data`;

    let socket: WebSocket | null = null;
    let reconnectTimeout: number | null = null;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
          console.log('[WebSocket] Connected to live telemetry stream');
        };

        socket.onmessage = (event) => {
          try {
            const data: RealtimeTelemetry = JSON.parse(event.data);
            setTelemetry(data);
          } catch (err) {
            console.error('[WebSocket] JSON Parse error:', err);
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          console.log('[WebSocket] Connection closed. Retrying in 3s...');
          reconnectTimeout = window.setTimeout(connect, 3000);
        };

        socket.onerror = (err) => {
          setIsConnected(false);
          console.warn('[WebSocket] Error encountered:', err);
        };
      } catch (err) {
        console.warn('[WebSocket] Connection failed, retrying...', err);
        reconnectTimeout = window.setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (socket) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return { telemetry, isConnected };
}
