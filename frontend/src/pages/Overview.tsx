import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Video,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  Layers,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import type { RealtimeTelemetry, SafetyAlert, CameraStatus } from '../types';
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

  useEffect(() => {
    const fetchData = async () => {
      const fetchedAlerts = await apiService.getAlerts('active');
      setAlerts(fetchedAlerts.slice(0, 5));
    };
    fetchData();
  }, []);

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
            Real-time automated PPE inspection & safety compliance monitoring engine.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('monitoring')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/60 transition"
          >
            <Video className="h-4 w-4" />
            <span>Launch Live Monitoring</span>
          </button>
        </div>
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
          value={`${telemetry.system.cameras_online} / 2`}
          subtitle="Active dual video channels"
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

      {/* Dual Camera Live Preview Cards */}
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
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                        alert.severity === 'critical'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">
                          {alert.class_name.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {alert.camera_id}
                        </span>
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
                <span className="text-cyan-300 font-mono font-bold">backend/model/v2.pt</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Trained Classes:</span>
                <span className="text-white font-mono font-bold">10 Classes</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Inference Device:</span>
                <span className="text-emerald-400 font-mono">CPU (Torch 2.13)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-slate-400 flex justify-between">
                <span>Camera 1 (Webcam):</span>
                <span className={cam1.status === 'online' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {cam1.status.toUpperCase()}
                </span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Camera 2 (Mobile IP):</span>
                <span className={cam2.status === 'online' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {cam2.status.toUpperCase()}
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
