import React, { useState, useEffect, useCallback } from 'react';
import { Video, RefreshCw, Wifi, Monitor, Usb, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { RealtimeTelemetry, CameraStatus, CameraAvailabilityInfo } from '../types';
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
  const [cameraAvailability, setCameraAvailability] = useState<Record<string, CameraAvailabilityInfo>>({
    '1': { camera_id: 'CAM-01', name: 'PC Webcam', available: true, type: 'pc', always_available: true },
    '2': { camera_id: 'CAM-02', name: 'USB Camera', available: false, type: 'usb', always_available: false },
    '3': { camera_id: 'CAM-03', name: 'WiFi Camera', available: false, type: 'wifi', always_available: false },
  });
  const [scanning, setScanning] = useState<boolean>(false);

  const scanCameras = useCallback(async () => {
    setScanning(true);
    try {
      const data = await apiService.detectCameras();
      setCameraAvailability(data);
    } catch (err) {
      console.warn('Failed to detect cameras:', err);
    } finally {
      setScanning(false);
    }
  }, []);

  // Scan for available cameras on mount
  useEffect(() => {
    scanCameras();
  }, [scanCameras]);

  // Default camera statuses
  const getDefaultCam = (id: string, name: string, sourceType: 'webcam' | 'ip_camera', address: string): CameraStatus => ({
    camera_id: id,
    name,
    source_type: sourceType,
    source_address: address,
    is_active: false,
    status: 'offline',
    hardware_detected: false,
    always_available: id === 'CAM-01',
    fps: 0,
    total_detections: 0,
    class_counts: {},
    violations_count: 0,
  });

  const cam1 = telemetry.cameras['1'] || getDefaultCam('CAM-01', 'CAM-01 (PC Webcam)', 'webcam', '0');
  const cam2 = telemetry.cameras['2'] || getDefaultCam('CAM-02', 'CAM-02 (USB Camera)', 'webcam', '1');
  const cam3 = telemetry.cameras['3'] || getDefaultCam('CAM-03', 'CAM-03 (WiFi Camera)', 'ip_camera', 'http://10.194.10.240:8080/video');

  // Determine visibility: CAM-01 always, CAM-02 only if USB detected, CAM-03 only if WiFi connected
  const cam1Available = true; // PC webcam ALWAYS shown
  const cam2Available = cameraAvailability['2']?.available === true || cam2.hardware_detected || cam2.status === 'online' || cam2.status === 'connecting';
  const cam3Available = cameraAvailability['3']?.available === true || cam3.hardware_detected || cam3.status === 'online' || cam3.status === 'connecting';

  const availableCount = [cam1Available, cam2Available, cam3Available].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <Video className="h-6 w-6 text-cyan-400" />
            <span>Live Camera Monitoring</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time YOLO AI inspection. PC camera always active. USB/WiFi shown only when detected. Model: <code className="text-cyan-300 font-mono">v2.pt</code>.
          </p>
        </div>

        <button
          onClick={scanCameras}
          disabled={scanning}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`h-4 w-4 text-cyan-400 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning...' : 'Refresh Cameras'}</span>
        </button>
      </div>

      {/* Camera Availability Status Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center flex-wrap gap-x-5 gap-y-2 text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Cameras:</span>

          {/* CAM-01 PC — always available */}
          <div className="flex items-center space-x-1.5">
            <Monitor className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-blue-300 font-semibold">CAM-01 (PC)</span>
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-400 text-[10px]">Always Available</span>
          </div>

          <div className="h-3 w-[1px] bg-slate-700" />

          {/* CAM-02 USB — conditional */}
          <div className="flex items-center space-x-1.5">
            <Usb className={`h-3.5 w-3.5 ${cam2Available ? 'text-emerald-400' : 'text-slate-600'}`} />
            <span className={cam2Available ? 'text-emerald-300 font-semibold' : 'text-slate-500'}>
              CAM-02 (USB)
            </span>
            {cam2Available ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            ) : (
              <XCircle className="h-3 w-3 text-slate-600" />
            )}
            <span className={cam2Available ? 'text-emerald-400 text-[10px]' : 'text-slate-600 text-[10px]'}>
              {cam2Available ? 'Detected' : 'Not Detected'}
            </span>
          </div>

          <div className="h-3 w-[1px] bg-slate-700" />

          {/* CAM-03 WiFi — conditional */}
          <div className="flex items-center space-x-1.5">
            <Wifi className={`h-3.5 w-3.5 ${cam3Available ? 'text-purple-400' : 'text-slate-600'}`} />
            <span className={cam3Available ? 'text-purple-300 font-semibold' : 'text-slate-500'}>
              CAM-03 (WiFi)
            </span>
            {cam3Available ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            ) : (
              <XCircle className="h-3 w-3 text-slate-600" />
            )}
            <span className={cam3Available ? 'text-emerald-400 text-[10px]' : 'text-slate-600 text-[10px]'}>
              {cam3Available ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
      </div>

      {/* Camera Grid — dynamic based on availability */}
      <div className={`grid gap-6 ${
        availableCount >= 3 ? 'grid-cols-1 lg:grid-cols-3' :
        availableCount === 2 ? 'grid-cols-1 lg:grid-cols-2' :
        'grid-cols-1'
      }`}>
        {/* CAM-01 — PC Webcam (ALWAYS SHOWN) */}
        {cam1Available && (
          <CameraCard
            camera={cam1}
            onStart={(id) => apiService.startCamera(id)}
            onStop={(id) => apiService.stopCamera(id)}
            onReconnect={(id) => apiService.reconnectCamera(id)}
            onExpand={onExpandCamera}
          />
        )}

        {/* CAM-02 — USB Camera (only if detected) */}
        {cam2Available && (
          <CameraCard
            camera={cam2}
            onStart={(id) => apiService.startCamera(id)}
            onStop={(id) => apiService.stopCamera(id)}
            onReconnect={(id) => apiService.reconnectCamera(id)}
            onExpand={onExpandCamera}
          />
        )}

        {/* CAM-03 — WiFi Camera (only if connected) */}
        {cam3Available && (
          <CameraCard
            camera={cam3}
            onStart={(id) => apiService.startCamera(id)}
            onStop={(id) => apiService.stopCamera(id)}
            onReconnect={(id) => apiService.reconnectCamera(id)}
            onExpand={onExpandCamera}
          />
        )}
      </div>

      {/* Only PC camera info if USB & WiFi not available */}
      {!cam2Available && !cam3Available && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div className="text-xs text-slate-400">
            <span className="text-amber-400 font-semibold">Note:</span> Only PC webcam is active. Connect a USB camera or configure a WiFi camera URL in{' '}
            <span className="text-cyan-400 font-semibold">Settings</span> to enable additional camera channels.
          </div>
        </div>
      )}

      {/* Channel Info */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
          Camera Channel Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* CAM-01 Info */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center space-x-2">
                <Monitor className="h-4 w-4 text-blue-400" />
                <span>CAM-01 (PC)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono">
                Index 0
              </span>
            </div>
            <p className="text-slate-400">
              Built-in PC webcam. Always available. OpenCV VideoCapture(0) with DirectShow/MSMF backend.
            </p>
            <span className="inline-flex items-center space-x-1 text-emerald-400 text-[10px] font-bold">
              <CheckCircle2 className="h-3 w-3" />
              <span>ALWAYS ACTIVE</span>
            </span>
          </div>

          {/* CAM-02 Info */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            cam2Available ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-950/50 border-slate-900 opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center space-x-2">
                <Usb className={`h-4 w-4 ${cam2Available ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>CAM-02 (USB)</span>
              </span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-mono ${
                cam2Available ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-900 text-slate-600 border-slate-800'
              }`}>
                {cam2Available ? 'DETECTED' : 'NOT DETECTED'}
              </span>
            </div>
            <p className="text-slate-400">
              External USB camera. Only shown when hardware is physically connected and working.
            </p>
          </div>

          {/* CAM-03 Info */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            cam3Available ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-950/50 border-slate-900 opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center space-x-2">
                <Wifi className={`h-4 w-4 ${cam3Available ? 'text-purple-400' : 'text-slate-600'}`} />
                <span>CAM-03 (WiFi)</span>
              </span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-mono ${
                cam3Available ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-slate-900 text-slate-600 border-slate-800'
              }`}>
                {cam3Available ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
            </div>
            <p className="text-slate-400">
              WiFi IP camera stream. Only shown when URL connects successfully. Configurable in Settings.
            </p>
            {cam3Available && (
              <span className="text-[10px] text-purple-400 font-mono break-all">
                {cam3.source_address}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
