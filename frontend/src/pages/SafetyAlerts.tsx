import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, Clock, SlidersHorizontal } from 'lucide-react';
import type { SafetyAlert, AlertRule } from '../types';
import { apiService } from '../services/api';

export const SafetyAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchAlerts = async () => {
    try {
      const data = await apiService.getAlerts(filterStatus === 'all' ? undefined : filterStatus);
      setAlerts(data);
      const settings = await apiService.getSettings();
      setRules(settings.alert_rules || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterStatus]);

  const handleAcknowledge = async (id: string) => {
    await apiService.acknowledgeAlert(id);
    fetchAlerts();
  };

  const handleResolve = async (id: string) => {
    await apiService.resolveAlert(id);
    fetchAlerts();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <ShieldAlert className="h-6 w-6 text-rose-500" />
            <span>Safety Alerts & Violations</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time alert dispatch based on dynamic rules and 5-second cooldown protection.
          </p>
        </div>

        {/* Filter Tab Buttons */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          {['all', 'active', 'acknowledged', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                filterStatus === st
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Alerts List */}
      <div className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`glass-panel p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                alert.status === 'active'
                  ? 'border-rose-800/80 bg-slate-900/90 alert-glow-critical'
                  : alert.status === 'acknowledged'
                  ? 'border-amber-800/60 bg-slate-900/70'
                  : 'border-slate-800 bg-slate-900/40 opacity-75'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    alert.severity === 'critical'
                      ? 'bg-rose-950 text-rose-400 border-rose-800'
                      : alert.severity === 'warning'
                      ? 'bg-amber-950 text-amber-400 border-amber-800'
                      : 'bg-blue-950 text-blue-400 border-blue-800'
                  }`}
                >
                  <AlertTriangle className="h-6 w-6" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      {alert.class_name.replace('_', ' ').toUpperCase()} VIOLATION
                    </h3>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        alert.severity === 'critical'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {alert.severity}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {alert.camera_name || alert.camera_id}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                    <span>Alert ID: <strong className="text-slate-200">{alert.id}</strong></span>
                    <span>•</span>
                    <span>Confidence: <strong className="text-cyan-400">{(alert.confidence * 100).toFixed(1)}%</strong></span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                {alert.status === 'active' && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-lg shadow-amber-950/40"
                  >
                    Acknowledge
                  </button>
                )}

                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40"
                  >
                    Resolve
                  </button>
                )}

                {alert.status === 'resolved' && (
                  <span className="flex items-center space-x-1 text-xs text-emerald-400 font-semibold px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Resolved</span>
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel p-12 rounded-3xl text-center space-y-3 border border-slate-800">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Safety Alerts Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no alerts matching the selected filter ({filterStatus}).
            </p>
          </div>
        )}
      </div>

      {/* Active Rules Configuration Summary Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
            <span>Configured Alert Rules Matrix</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Cooldown: 5 Seconds / Camera + Class
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {rules.map((r) => (
            <div
              key={r.id}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-mono">{r.class_name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r.severity === 'critical'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {r.severity}
                </span>
              </div>
              <p className="text-slate-400">{r.label}</p>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono border-t border-slate-800/80 pt-1.5">
                <span>Rule Enabled: {r.enabled ? 'YES' : 'NO'}</span>
                <span>{r.cooldown_seconds}s cooldown</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
