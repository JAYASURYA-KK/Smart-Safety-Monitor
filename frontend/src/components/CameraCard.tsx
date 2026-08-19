import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Maximize2,
  AlertTriangle,
  Clock,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import type { CameraStatus } from '../types';
import { DynamicClassBadge } from './DynamicClassBadge';

interface CameraCardProps {
  camera: CameraStatus;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onReconnect: (id: string) => void;
  onExpand: (camera: CameraStatus) => void;
}

export const CameraCard: React.FC<CameraCardProps> = ({
  camera,
  onStart,
  onStop,
  onReconnect,
  onExpand,
}) => {
  const [streamError, setStreamError] = useState<boolean>(false);
  const [streamKey, setStreamKey] = useState<number>(Date.now());

  const isOnline = camera.status === 'online';

  useEffect(() => {
    if (isOnline) {
      setStreamError(false);
      setStreamKey(Date.now());
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOnline) {
        console.log(`[CameraCard ${camera.camera_id}] Tab became visible. Refreshing stream...`);
        setStreamError(false);
        setStreamKey(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [camera.status, isOnline, camera.camera_id]);

  const numId = camera.camera_id === 'CAM-01' ? '1' : '2';
  // Use direct backend port (8000) to prevent Vite dev server proxy buffering MJPEG streams
  const host = window.location.hostname || 'localhost';
  const streamUrl = `http://${host}:8000/api/cameras/${numId}/stream?t=${streamKey}`;

  const handleImgError = () => {
    console.warn(`[CameraCard ${camera.camera_id}] Stream img error encountered.`);
    setStreamError(true);
  };

  const handleImgLoad = () => {
    setStreamError(false);
  };

  const handleStartClick = () => {
    setStreamError(false);
    setStreamKey(Date.now());
    onStart(camera.camera_id);
  };

  const handleReconnectClick = () => {
    setStreamError(false);
    setStreamKey(Date.now());
    onReconnect(camera.camera_id);
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-xl">
      {/* Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`h-3 w-3 rounded-full ${
              isOnline ? 'bg-emerald-500 animate-pulse live-glow' : 'bg-slate-600'
            }`}
          />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-sm tracking-wide">
                {camera.name}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                {camera.camera_id}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
              Source: {camera.source_type === 'webcam' ? `Index ${camera.source_address}` : camera.source_address}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-800/80">
              <Radio className="h-3 w-3 animate-spin text-emerald-400" />
              <span>LIVE</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              OFFLINE
            </span>
          )}

          <button
            onClick={() => onExpand(camera)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Expand View"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Video Feed Area */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
        {isOnline && !streamError ? (
          <img
            key={streamKey}
            src={streamUrl}
            alt={camera.name}
            onError={handleImgError}
            onLoad={handleImgLoad}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-600">
              <Radio className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300">
                {isOnline ? 'Stream Initializing...' : 'Camera Stream Offline'}
              </p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                {camera.error_message ||
                  (isOnline
                    ? 'Connecting live YOLO stream...'
                    : 'Click "Start Camera" to initialize the video feed.')}
              </p>
            </div>

            {isOnline && streamError && (
              <button
                onClick={handleReconnectClick}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition"
              >
                Retry Stream Feed
              </button>
            )}
          </div>
        )}

        {/* Floating Telemetry Bar */}
        {isOnline && (
          <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 text-xs flex items-center space-x-3 text-slate-300 font-mono">
            <div>
              FPS: <span className="text-cyan-400 font-bold">{camera.fps}</span>
            </div>
            <div className="h-3 w-[1px] bg-slate-700" />
            <div>
              Detections: <span className="text-white font-bold">{camera.total_detections}</span>
            </div>
          </div>
        )}

        {/* Violations Warning Overlay */}
        {camera.violations_count > 0 && (
          <div className="absolute top-3 right-3 bg-rose-950/90 backdrop-blur-md border border-rose-800 text-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 alert-glow-critical">
            <AlertTriangle className="h-4 w-4 text-rose-400 animate-bounce" />
            <span>{camera.violations_count} VIOLATION(S)</span>
          </div>
        )}
      </div>

      {/* Dynamic Model Classes Breakdown Chips */}
      <div className="p-3 bg-slate-900/60 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Dynamic Model Detections (v2.pt)
          </span>
          {camera.last_inference_time && (
            <span className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono">
              <Clock className="h-3 w-3" />
              <span>{new Date(camera.last_inference_time).toLocaleTimeString()}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Object.keys(camera.class_counts).length > 0 ? (
            Object.entries(camera.class_counts).map(([cls, count]) => (
              <DynamicClassBadge key={cls} className={cls} count={count} />
            ))
          ) : (
            <span className="text-xs text-slate-500 italic py-0.5">
              No objects currently in frame
            </span>
          )}
        </div>
      </div>

      {/* Control Actions Bar */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {!isOnline ? (
            <button
              onClick={handleStartClick}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Start</span>
            </button>
          ) : (
            <button
              onClick={() => onStop(camera.camera_id)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700/80 text-xs font-bold transition"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={handleReconnectClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reconnect</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          {isOnline ? (
            <span className="text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Streaming active</span>
            </span>
          ) : (
            <span>Ready</span>
          )}
        </div>
      </div>
    </div>
  );
};
