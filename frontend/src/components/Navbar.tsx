import React from 'react';
import {
  ShieldAlert,
  Cpu,
  Video,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
} from 'lucide-react';
import type { RealtimeTelemetry } from '../types';

interface NavbarProps {
  telemetry: RealtimeTelemetry;
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ telemetry, wsConnected }) => {
  const { system } = telemetry;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
          <ShieldAlert className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-wider bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
              SMART CONSTRUCTION MONITOR
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded-full uppercase">
              AI Safety Engine
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time PPE Object Detection & IoT Alerting Platform
          </p>
        </div>
      </div>

      {/* System Status Indicators */}
      <div className="flex items-center space-x-3">
        {/* ESP32 Hardware Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <Zap className={`h-4 w-4 ${system.esp32_enabled ? 'text-amber-400' : 'text-slate-500'}`} />
          <div className="text-xs">
            <span className="text-slate-400">ESP32 IoT: </span>
            <span className="text-amber-300 font-mono font-medium">
              {system.esp32_enabled ? `${system.esp32_port || 'COM5'}` : 'Disabled'}
            </span>
          </div>
        </div>

        {/* WebSocket Stream Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <Radio className={`h-4 w-4 ${wsConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <div className="text-xs">
            <span className="text-slate-400">Stream: </span>
            <span className={wsConnected ? 'text-emerald-400 font-medium' : 'text-slate-400 font-medium'}>
              {wsConnected ? 'LIVE WS' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* AI Model Status */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <div className="text-xs">
            <span className="text-slate-400">Model: </span>
            <span className="text-cyan-300 font-mono font-medium">v2.pt</span>
          </div>
        </div>

        {/* Online Cameras */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <Video className="h-4 w-4 text-indigo-400" />
          <div className="text-xs">
            <span className="text-slate-400">Cameras: </span>
            <span className="text-indigo-300 font-bold">
              {system.cameras_online} / 2 Online
            </span>
          </div>
        </div>

        {/* Active Violations Indicator */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
          system.total_active_violations > 0
            ? 'bg-rose-950/60 border-rose-800 text-rose-300 alert-glow-critical'
            : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
        }`}>
          {system.total_active_violations > 0 ? (
            <AlertTriangle className="h-4 w-4 text-rose-400 animate-bounce" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          )}
          <div className="text-xs">
            <span className="font-semibold">
              {system.total_active_violations > 0
                ? `${system.total_active_violations} Active Violations`
                : 'Site Compliant'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
