import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  Video,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  Layers,
  Activity,
  ArrowUpRight,
  Monitor,
  Usb,
  Wifi,
  XCircle,
} from 'lucide-react';
import type { RealtimeTelemetry, SafetyAlert, CameraStatus, CameraAvailabilityInfo } from '../types';
import { StatsCard } from '../components/StatsCard';
import { CameraCard } from '../components/CameraCard';
import { apiService } from '../services/api';

interface OverviewProps {
  telemetry: RealtimeTelemetry;
  onNavigate: (page: string) => void;
  onExpandCamera: (camera: CameraStatus) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  telemetry,
  onNavigate,
  onExpandCamera,
}) => {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [cameraAvailability, setCameraAvailability] = useState<Record<string, CameraAvailabilityInfo>>({
    '1': { camera_id: 'CAM-01', name: 'PC Webcam', available: true, type: 'pc', always_available: true },
    '2': { camera_id: 'CAM-02', name: 'USB Camera', available: false, type: 'usb', always_available: false },
    '3': { camera_id: 'CAM-03', name: 'WiFi Camera', available: false, type: 'wifi', always_available: false },
  });

  const fetchCameraAvailability = useCallback(async () => {
    try {
      const data = await apiService.detectCameras();
      setCameraAvailability(data);
    } catch (err) {
      console.warn('Camera detection failed:', err);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const fetchedAlerts = await apiService.getAlerts('active');
      setAlerts(fetchedAlerts.slice(0, 5));
    };
    fetchData();
    fetchCameraAvailability();
  }, [fetchCameraAvailability]);

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

  // Determine visibility
  const cam1Available = true; // PC webcam ALWAYS shown
  const cam2Available = cameraAvailability['2']?.available === true || cam2.hardware_detected || cam2.status === 'online' || cam2.status === 'connecting';
  const cam3Available = cameraAvailability['3']?.available === true || cam3.hardware_detected || cam3.status === 'online' || cam3.status === 'connecting';

  const availableCount = [cam1Available, cam2Available, cam3Available].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="glass-panel p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <span>Site Safety Operations Center</span>
            <span className="px-3 py-1 text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-full">
              v2.pt Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time PPE inspection. 3-Camera system: PC (always), USB/WiFi (if detected).
          </p>
        </div>

        <button
          onClick={() => onNavigate('monitoring')}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/60 transition"
        >
          <Video className="h-4 w-4" />
          <span>Launch Live Monitoring</span>
        </button>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="PPE Compliance Signals"
          value={telemetry.system.total_active_detections}
          subtitle="Objects & workers detected in frame"
          icon={Layers}
          color="cyan"
          trend="Live YOLO"
        />

        <StatsCard
          title="Active Violations"
          value={telemetry.system.total_active_violations}
          subtitle="Unresolved PPE non-compliance alerts"
          icon={AlertTriangle}
          color={telemetry.system.total_active_violations > 0 ? 'rose' : 'emerald'}
          trend={telemetry.system.total_active_violations > 0 ? 'ACTION REQ' : 'Compliant'}
        />

        <StatsCard
          title="Cameras Online"
          value={`${telemetry.system.cameras_online} / ${availableCount}`}
          subtitle={`${availableCount} camera(s) available`}
          icon={Video}
          color="indigo"
          trend="Stream OK"
        />

        <StatsCard
          title="AI Model Status"
          value={telemetry.system.model_loaded ? 'Ready' : 'Initializing'}
          subtitle={`v2.pt (${telemetry.system.inference_fps} FPS on ${telemetry.system.device})`}
          icon={Cpu}
          color="purple"
          trend="YOLOv11"
        />
      </div>

      {/* Camera Availability Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Cameras:</span>
          <div className="flex items-center space-x-1.5">
            <Monitor className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-blue-300 font-semibold">CAM-01 (PC)</span>
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-400 text-[10px]">Always</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-700" />
          <div className="flex items-center space-x-1.5">
            <Usb className={`h-3.5 w-3.5 ${cam2Available ? 'text-emerald-400' : 'text-slate-600'}`} />
            <span className={cam2Available ? 'text-emerald-300 font-semibold' : 'text-slate-500'}>CAM-02 (USB)</span>
            {cam2Available ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-slate-600" />}
            <span className={cam2Available ? 'text-emerald-400 text-[10px]' : 'text-slate-600 text-[10px]'}>{cam2Available ? 'OK' : 'None'}</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-700" />
          <div className="flex items-center space-x-1.5">
            <Wifi className={`h-3.5 w-3.5 ${cam3Available ? 'text-purple-400' : 'text-slate-600'}`} />
            <span className={cam3Available ? 'text-purple-300 font-semibold' : 'text-slate-500'}>CAM-03 (WiFi)</span>
            {cam3Available ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-slate-600" />}
            <span className={cam3Available ? 'text-emerald-400 text-[10px]' : 'text-slate-600 text-[10px]'}>{cam3Available ? 'Connected' : 'None'}</span>
          </div>
        </div>
      </div>

      {/* Live Camera Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Video className="h-5 w-5 text-cyan-400" />
            <span>Live Camera Channels</span>
          </h2>
          <button
            onClick={() => onNavigate('monitoring')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <span>View Fullscreen Grid</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

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
      </div>

      {/* Two Column Layout: Recent Alerts & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts Feed */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Recent Safety Alerts</span>
            </h3>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs text-cyan-400 hover:underline font-medium"
            >
              View All Alerts
            </button>
          </div>

          {alerts.length > 0 ? (
            <div className="space-y-2.5">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs ${alert.severity === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{alert.class_name.replace('_', ' ').toUpperCase()}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">{alert.camera_id}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2 font-mono">
                        <span>Conf: {(alert.confidence * 100).toFixed(0)}%</span>
                        <span>•</span>
                        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => apiService.acknowledgeAlert(alert.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/60" />
              <p className="font-medium text-slate-400">No Active Violations</p>
              <p>All camera streams currently report PPE compliance.</p>
            </div>
          )}
        </div>

        {/* System Health Widget */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>System & Model Health</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-slate-400 flex justify-between">
                <span>Model File:</span>
                <span className="text-cyan-300 font-mono font-bold">v2.pt</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Trained Classes:</span>
                <span className="text-white font-mono font-bold">10 Classes</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Inference Device:</span>
                <span className="text-emerald-400 font-mono">{telemetry.system.device}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="text-slate-400 flex justify-between">
                <span className="flex items-center space-x-1"><Monitor className="h-3 w-3 text-blue-400" /><span>CAM-01 (PC):</span></span>
                <span className="text-blue-400 text-[10px] font-bold">ALWAYS ON</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span className="flex items-center space-x-1"><Usb className={`h-3 w-3 ${cam2Available ? 'text-emerald-400' : 'text-slate-600'}`} /><span>CAM-02 (USB):</span></span>
                <span className={cam2Available ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {cam2Available ? 'DETECTED' : 'NOT FOUND'}
                </span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span className="flex items-center space-x-1"><Wifi className={`h-3 w-3 ${cam3Available ? 'text-purple-400' : 'text-slate-600'}`} /><span>CAM-03 (WiFi):</span></span>
                <span className={cam3Available ? 'text-purple-400 font-bold' : 'text-slate-500'}>
                  {cam3Available ? 'CONNECTED' : 'NOT CONNECTED'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-slate-400 flex justify-between">
                <span>Alert Cooldown:</span>
                <span className="text-white font-mono">5 Seconds / Class</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>WebSocket Engine:</span>
                <span className="text-cyan-400 font-mono">/ws/live-data</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
