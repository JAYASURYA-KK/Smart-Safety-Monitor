import React from 'react';
import { X, Radio, Clock, AlertTriangle } from 'lucide-react';
import type { CameraStatus } from '../types';
import { DynamicClassBadge } from './DynamicClassBadge';

interface FullscreenCameraModalProps {
  camera: CameraStatus | null;
  onClose: () => void;
}

export const FullscreenCameraModal: React.FC<FullscreenCameraModalProps> = ({
  camera,
  onClose,
}) => {
  if (!camera) return null;

  const numId = camera.camera_id === 'CAM-01' ? '1' : '2';
  const host = window.location.hostname || 'localhost';
  const streamUrl = `http://${host}:8000/api/cameras/${numId}/stream`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-6xl glass-panel rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {camera.name} - Fullscreen Stream
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {camera.camera_id} • Source: {camera.source_address}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative bg-black flex-1 min-h-[480px] flex items-center justify-center overflow-hidden">
          {camera.status === 'online' ? (
            <img
              src={streamUrl}
              alt={camera.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-8 text-slate-500">
              Camera is currently offline
            </div>
          )}

          {/* Telemetry Overlay */}
          <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono flex items-center space-x-4 text-slate-200">
            <div>FPS: <span className="text-cyan-400 font-bold">{camera.fps}</span></div>
            <div className="h-4 w-[1px] bg-slate-700" />
            <div>Total Detections: <span className="text-white font-bold">{camera.total_detections}</span></div>
            <div className="h-4 w-[1px] bg-slate-700" />
            <div>Violations: <span className="text-rose-400 font-bold">{camera.violations_count}</span></div>
          </div>

          {camera.violations_count > 0 && (
            <div className="absolute top-4 right-4 bg-rose-950/90 border border-rose-800 text-rose-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 alert-glow-critical">
              <AlertTriangle className="h-5 w-5 text-rose-400 animate-bounce" />
              <span>SAFETY VIOLATIONS DETECTED</span>
            </div>
          )}
        </div>

        {/* Footer Model Class Breakdown */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Detected Classes:
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(camera.class_counts).map(([cls, count]) => (
                <DynamicClassBadge key={cls} className={cls} count={count} />
              ))}
            </div>
          </div>

          {camera.last_inference_time && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono">
              <Clock className="h-4 w-4" />
              <span>Last Inference: {new Date(camera.last_inference_time).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
