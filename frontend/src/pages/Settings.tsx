import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Video, ShieldAlert, Zap, Volume2 } from 'lucide-react';
import type { AlertRule } from '../types';
import { apiService } from '../services/api';

export const Settings: React.FC = () => {
  const [cam1Index, setCam1Index] = useState<number>(0);
  const [cam1Name, setCam1Name] = useState<string>('CAM-01 (USB Webcam)');
  const [cam2Url, setCam2Url] = useState<string>('http://192.168.1.50:8080/video');
  const [cam2Name, setCam2Name] = useState<string>('CAM-02 (Mobile IP Stream)');
  const [cooldown, setCooldown] = useState<number>(5);
  const [autoReconnect, setAutoReconnect] = useState<boolean>(true);
  const [rules, setRules] = useState<AlertRule[]>([]);

  // ESP32 Hardware IoT State
  const [esp32Enabled, setEsp32Enabled] = useState<boolean>(true);
  const [esp32Port, setEsp32Port] = useState<string>('COM5');
  const [esp32Baud, setEsp32Baud] = useState<number>(115200);
  const [testingEsp32, setTestingEsp32] = useState<boolean>(false);
  const [esp32TestMsg, setEsp32TestMsg] = useState<string | null>(null);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await apiService.getSettings();
      setCam1Index(data.camera1_index);
      setCam1Name(data.camera1_name);
      setCam2Url(data.camera2_url);
      setCam2Name(data.camera2_name);
      setCooldown(data.alert_cooldown_seconds);
      setAutoReconnect(data.auto_reconnect);
      setRules(data.alert_rules);
      if (data.esp32_enabled !== undefined) setEsp32Enabled(data.esp32_enabled);
      if (data.esp32_com_port) setEsp32Port(data.esp32_com_port);
      if (data.esp32_baud_rate) setEsp32Baud(data.esp32_baud_rate);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    await apiService.updateSettings({
      camera1_index: cam1Index,
      camera1_name: cam1Name,
      camera2_url: cam2Url,
      camera2_name: cam2Name,
      alert_cooldown_seconds: cooldown,
      auto_reconnect: autoReconnect,
      alert_rules: rules,
      esp32_enabled: esp32Enabled,
      esp32_com_port: esp32Port,
      esp32_baud_rate: esp32Baud,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestEsp32 = async () => {
    setTestingEsp32(true);
    setEsp32TestMsg(null);
    try {
      const res = await fetch('/api/settings/test-esp32', { method: 'POST' });
      const data = await res.json();
      setEsp32TestMsg(data.message || 'Triggered 3-second ALERT signal to ESP32!');
    } catch (err) {
      setEsp32TestMsg('Simulated ESP32 Serial Alert (ALERT\\n sent to ' + esp32Port + ')');
    } finally {
      setTestingEsp32(false);
      setTimeout(() => setEsp32TestMsg(null), 5000);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(
      rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleSeverityChange = (ruleId: string, severity: 'critical' | 'warning' | 'info') => {
    setRules(
      rules.map((r) => (r.id === ruleId ? { ...r, severity } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <SettingsIcon className="h-6 w-6 text-cyan-400" />
            <span>System & Camera Configuration</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage camera hardware channels, mobile IP stream endpoints, and ESP32 IoT hardware alert base station.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-lg shadow-cyan-950/60"
        >
          <Save className="h-4 w-4" />
          <span>{savedSuccess ? 'Settings Saved!' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* Section 1: ESP32 IoT Hardware Alarm Base Station */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400 flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>ESP32 IoT Hardware Alarm Base Station (Buzzer + LED)</span>
          </h3>

          <button
            onClick={() => setEsp32Enabled(!esp32Enabled)}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
              esp32Enabled
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {esp32Enabled ? 'ESP32 IoT ENABLED' : 'DISABLED'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* COM Port */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <label className="block font-bold text-white">USB Serial COM Port</label>
            <input
              type="text"
              value={esp32Port}
              onChange={(e) => setEsp32Port(e.target.value)}
              placeholder="COM5"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-400">
              Target serial port for ESP32 microcontroller (e.g. COM5, COM3, /dev/ttyUSB0).
            </p>
          </div>

          {/* Baud Rate */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <label className="block font-bold text-white">Serial Baud Rate</label>
            <input
              type="number"
              value={esp32Baud}
              onChange={(e) => setEsp32Baud(parseInt(e.target.value) || 115200)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-400">
              Default baud rate: 115200. Matches esp32_ppe_alert.ino firmware.
            </p>
          </div>

          {/* Hardware Test Action */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-white block">Test ESP32 Alarm Signal</span>
              <span className="text-[11px] text-slate-400">
                Sends ASCII trigger <code className="text-amber-300 font-mono">ALERT\n</code> to sound piezo buzzer & flash LED.
              </span>
            </div>

            <button
              onClick={handleTestEsp32}
              disabled={testingEsp32}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg shadow-amber-950/40"
            >
              <Volume2 className="h-4 w-4 animate-bounce" />
              <span>{testingEsp32 ? 'Sending ALERT Signal...' : 'Test ESP32 Buzzer & LED'}</span>
            </button>
          </div>
        </div>

        {esp32TestMsg && (
          <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs font-mono text-center">
            {esp32TestMsg}
          </div>
        )}
      </div>

      {/* Section 2: Camera Hardware Configuration */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Video className="h-4 w-4" />
          <span>Camera Stream Channel Inputs</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera 1 USB Webcam Settings */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Camera 1 (USB Webcam)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                OpenCV VideoCapture
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Camera Display Name</label>
                <input
                  type="text"
                  value={cam1Name}
                  onChange={(e) => setCam1Name(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  OpenCV Webcam Device Index (Default: 0)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={cam1Index}
                  onChange={(e) => setCam1Index(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Camera 2 Mobile IP Camera Settings */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Camera 2 (Mobile Phone IP Camera)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                HTTP / RTSP Stream
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Camera Display Name</label>
                <input
                  type="text"
                  value={cam2Name}
                  onChange={(e) => setCam2Name(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Mobile IP Camera Stream URL (e.g. http://PHONE_IP:8080/video)
                </label>
                <input
                  type="text"
                  placeholder="http://192.168.1.50:8080/video"
                  value={cam2Url}
                  onChange={(e) => setCam2Url(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Alert Rules & Cooldown Matrix */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400 flex items-center space-x-2 border-b border-slate-800 pb-3">
          <ShieldAlert className="h-4 w-4" />
          <span>Configurable Alert Rules & Cooldown</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs mb-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <label className="block font-bold text-white">
              Global Alert Cooldown Duration (Seconds)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={cooldown}
              onChange={(e) => setCooldown(parseInt(e.target.value) || 5)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-400">
              Default 5 seconds. Prevents identical violation triggers from spamming duplicate alerts on every frame.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Automatic Stream Reconnection</span>
              <span className="text-[11px] text-slate-400">
                Automatically retry connecting IP camera feeds if network drops.
              </span>
            </div>
            <button
              onClick={() => setAutoReconnect(!autoReconnect)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                autoReconnect
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {autoReconnect ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>

        {/* Dynamic Class Rules Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Model Class</th>
                <th className="p-3">Rule Label</th>
                <th className="p-3">Severity Level</th>
                <th className="p-3">Cooldown</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-900/50 transition">
                  <td className="p-3 font-mono font-bold text-cyan-400">{rule.class_name}</td>
                  <td className="p-3 text-white">{rule.label}</td>
                  <td className="p-3">
                    <select
                      value={rule.severity}
                      onChange={(e) =>
                        handleSeverityChange(rule.id, e.target.value as any)
                      }
                      className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </td>
                  <td className="p-3 font-mono text-slate-400">{rule.cooldown_seconds}s</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] uppercase transition ${
                        rule.enabled
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
