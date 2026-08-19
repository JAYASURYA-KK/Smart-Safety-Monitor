import React from 'react';
import { Video, RefreshCw } from 'lucide-react';
import type { RealtimeTelemetry, CameraStatus } from '../types';
import { CameraCard } from '../components/CameraCard';
import { apiService } from '../services/api';

interface LiveMonitoringProps {
  telemetry: RealtimeTelemetry;
  onExpandCamera: (camera: CameraStatus) => void;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({
  telemetry,
  onExpandCamera,
}) => {
  const cam1 = telemetry.cameras['1'] || {
    camera_id: 'CAM-01',
    name: 'CAM-01 (USB Webcam)',
    source_type: 'webcam',
    source_address: '0',
    is_active: false,
    status: 'offline',
    fps: 0,
    total_detections: 0,
    class_counts: {},
    violations_count: 0,
  };

  const cam2 = telemetry.cameras['2'] || {
    camera_id: 'CAM-02',
    name: 'CAM-02 (Mobile IP Stream)',
    source_type: 'ip_camera',
    source_address: 'http://192.168.1.50:8080/video',
    is_active: false,
    status: 'offline',
    fps: 0,
    total_detections: 0,
    class_counts: {},
    violations_count: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <Video className="h-6 w-6 text-cyan-400" />
            <span>Dual Live Camera Monitoring</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-stream YOLO AI inspection. Annotations rendered dynamically from model <code className="text-cyan-300 font-mono">v2.pt</code>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              apiService.reconnectCamera('CAM-01');
              apiService.reconnectCamera('CAM-02');
            }}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className="h-4 w-4 text-cyan-400" />
            <span>Reconnect All Channels</span>
          </button>
        </div>
      </div>

      {/* Grid Layout of Two Main Cameras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CameraCard
          camera={cam1}
          onStart={(id) => apiService.startCamera(id)}
          onStop={(id) => apiService.stopCamera(id)}
          onReconnect={(id) => apiService.reconnectCamera(id)}
          onExpand={onExpandCamera}
        />
        <CameraCard
          camera={cam2}
          onStart={(id) => apiService.startCamera(id)}
          onStop={(id) => apiService.stopCamera(id)}
          onReconnect={(id) => apiService.reconnectCamera(id)}
          onExpand={onExpandCamera}
        />
      </div>

      {/* Channel Diagnostics & Stream Info */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
          Camera Channel & Pipeline Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Camera 1 (Local USB Webcam)</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                MJPEG /api/cameras/1/stream
              </span>
            </div>
            <p className="text-slate-400">
              Captures live USB video frame buffers via OpenCV VideoCapture(0). Frame worker passes numpy array to v2.pt model and sends annotated JPEG stream over FastAPI.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Camera 2 (Mobile IP Stream)</span>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono">
                MJPEG /api/cameras/2/stream
              </span>
            </div>
            <p className="text-slate-400">
              Connects to mobile phone IP Camera application endpoint (HTTP/RTSP). Configurable URL from Settings page. Automatically reconnects upon network glitch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
