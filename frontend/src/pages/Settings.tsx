import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Video,
  ShieldAlert,
  Zap,
  Volume2,
  Cpu,
  Sliders,
  FolderOpen,
  RefreshCw,
  Camera,
  Wifi,
  Monitor,
  Usb,
  CheckCircle,
  XCircle,
  Loader2,
  Folder,
  File,
  ArrowLeft,
  Upload,
} from 'lucide-react';
import type { AlertRule, CameraAvailabilityInfo } from '../types';
import { apiService } from '../services/api';

export const Settings: React.FC = () => {
  // CAM-01: PC Webcam (always available)
  const [cam1Index, setCam1Index] = useState<number>(0);
  const [cam1Name, setCam1Name] = useState<string>('CAM-01 (PC Webcam)');

  // CAM-02: USB Camera (available if detected)
  const [cam2Index, setCam2Index] = useState<number>(1);
  const [cam2Name, setCam2Name] = useState<string>('CAM-02 (USB Camera)');

  // CAM-03: WiFi Camera (available if connected)
  const [cam3Url, setCam3Url] = useState<string>('http://10.194.10.240:8080/video');
  const [cam3Name, setCam3Name] = useState<string>('CAM-03 (WiFi Camera)');

  const [cooldown, setCooldown] = useState<number>(5);
  const [autoReconnect, setAutoReconnect] = useState<boolean>(true);
  const [rules, setRules] = useState<AlertRule[]>([]);

  // Model Configuration State
  const [modelPath, setModelPath] = useState<string>('backend/model/v2.pt');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.45);
  const [iouThreshold, setIouThreshold] = useState<number>(0.45);
  const [reloadingModel, setReloadingModel] = useState<boolean>(false);
  const [modelReloadMsg, setModelReloadMsg] = useState<string | null>(null);

  // Model Browse & Upload State
  const [showBrowseModal, setShowBrowseModal] = useState<boolean>(false);
  const [activeBrowseTab, setActiveBrowseTab] = useState<'workspace' | 'explorer' | 'upload'>('workspace');
  
  // Workspace models list
  const [workspaceModels, setWorkspaceModels] = useState<any[]>([]);
  const [loadingWorkspaceModels, setLoadingWorkspaceModels] = useState<boolean>(false);
  
  // File Explorer state
  const [explorerData, setExplorerData] = useState<{
    current_path: string;
    parent_path: string | null;
    folders: { name: string; path: string }[];
    files: { name: string; path: string; size_bytes: number }[];
  }>({ current_path: '', parent_path: null, folders: [], files: [] });
  const [loadingExplorer, setLoadingExplorer] = useState<boolean>(false);
  
  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Camera Detection State
  const [scanningCameras, setScanningCameras] = useState<boolean>(false);
  const [cameraAvailability, setCameraAvailability] = useState<Record<string, CameraAvailabilityInfo>>({
    '1': { camera_id: 'CAM-01', name: 'PC Webcam', available: true, type: 'pc', always_available: true },
    '2': { camera_id: 'CAM-02', name: 'USB Camera', available: false, type: 'usb', always_available: false },
    '3': { camera_id: 'CAM-03', name: 'WiFi Camera', available: false, type: 'wifi', always_available: false },
  });

  // WiFi Camera Test State
  const [testingWifi, setTestingWifi] = useState<boolean>(false);
  const [wifiTestResult, setWifiTestResult] = useState<{ status: string; message: string } | null>(null);

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
      setCam2Index(data.camera2_index);
      setCam2Name(data.camera2_name);
      setCam3Url(data.camera3_url);
      setCam3Name(data.camera3_name);
      setModelPath(data.model_path || 'backend/model/v2.pt');
      setConfidenceThreshold(data.confidence_threshold);
      setIouThreshold(data.iou_threshold);
      setCooldown(data.alert_cooldown_seconds);
      setAutoReconnect(data.auto_reconnect);
      setRules(data.alert_rules);
      if (data.esp32_enabled !== undefined) setEsp32Enabled(data.esp32_enabled);
      if (data.esp32_com_port) setEsp32Port(data.esp32_com_port);
      if (data.esp32_baud_rate) setEsp32Baud(data.esp32_baud_rate);
    };
    fetchSettings();
  }, []);

  // Load workspace models
  const loadWorkspaceModels = async () => {
    setLoadingWorkspaceModels(true);
    try {
      const data = await apiService.listModels();
      setWorkspaceModels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWorkspaceModels(false);
    }
  };

  // Load filesystem directory
  const loadDirectory = async (path?: string) => {
    setLoadingExplorer(true);
    try {
      const data = await apiService.browseDirectory(path);
      setExplorerData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExplorer(false);
    }
  };

  useEffect(() => {
    if (showBrowseModal) {
      if (activeBrowseTab === 'workspace') {
        loadWorkspaceModels();
      } else if (activeBrowseTab === 'explorer') {
        loadDirectory(explorerData.current_path || undefined);
      }
    }
  }, [showBrowseModal, activeBrowseTab]);

  const handleSelectModel = (path: string) => {
    setModelPath(path);
    setShowBrowseModal(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const res = await apiService.uploadModel(uploadFile);
      setUploadSuccess(`Uploaded to: ${res.relative_path}`);
      // Auto select the uploaded file
      setModelPath(res.absolute_path);
      // Wait a moment and close modal
      setTimeout(() => {
        setShowBrowseModal(false);
        setUploadSuccess(null);
        setUploadFile(null);
      }, 1500);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    await apiService.updateSettings({
      camera1_index: cam1Index,
      camera1_name: cam1Name,
      camera2_index: cam2Index,
      camera2_name: cam2Name,
      camera3_url: cam3Url,
      camera3_name: cam3Name,
      model_path: modelPath,
      confidence_threshold: confidenceThreshold,
      iou_threshold: iouThreshold,
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

  const handleReloadModel = async () => {
    setReloadingModel(true);
    setModelReloadMsg(null);
    try {
      const res = await apiService.reloadModel() as any;
      setModelReloadMsg(res.message || 'Model reloaded successfully.');
    } catch (err) {
      setModelReloadMsg('Model reload failed. Check file path.');
    } finally {
      setReloadingModel(false);
      setTimeout(() => setModelReloadMsg(null), 5000);
    }
  };

  const handleScanCameras = async () => {
    setScanningCameras(true);
    try {
      const data = await apiService.detectCameras();
      setCameraAvailability(data);
    } catch (err) {
      console.warn('Camera scan failed:', err);
    } finally {
      setScanningCameras(false);
    }
  };

  const handleTestWifiCamera = async () => {
    if (!cam3Url.trim()) {
      setWifiTestResult({ status: 'error', message: 'Please enter a WiFi camera URL' });
      return;
    }
    setTestingWifi(true);
    setWifiTestResult(null);
    try {
      const result = await apiService.testWifiCamera(cam3Url);
      setWifiTestResult({ status: result.status, message: result.message });
    } catch (err) {
      setWifiTestResult({ status: 'error', message: 'Failed to test WiFi camera' });
    } finally {
      setTestingWifi(false);
      setTimeout(() => setWifiTestResult(null), 5000);
    }
  };

  const handleTestEsp32 = async () => {
    setTestingEsp32(true);
    setEsp32TestMsg(null);
    try {
      const res = await fetch('/api/settings/test-esp32', { method: 'POST' });
      const data = await res.json();
      setEsp32TestMsg(data.message || 'Triggered 3-second ALERT signal to ESP32!');
    } catch (err) {
      setEsp32TestMsg('ESP32 test request failed. Check serial connection.');
    } finally {
      setTestingEsp32(false);
      setTimeout(() => setEsp32TestMsg(null), 5000);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleSeverityChange = (ruleId: string, severity: 'critical' | 'warning' | 'info') => {
    setRules(rules.map((r) => (r.id === ruleId ? { ...r, severity } : r)));
  };

  const handleCooldownChange = (ruleId: string, cooldownSec: number) => {
    setRules(rules.map((r) => (r.id === ruleId ? { ...r, cooldown_seconds: cooldownSec } : r)));
  };

  const cam2Available = cameraAvailability['2']?.available ?? false;
  const cam3Available = cameraAvailability['3']?.available ?? false;

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
            3-Camera system: CAM-01 PC (always), CAM-02 USB (if detected), CAM-03 WiFi (if connected).
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-lg shadow-cyan-950/60"
        >
          <Save className="h-4 w-4" />
          <span>{savedSuccess ? '✓ Settings Saved!' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* Camera Availability Overview */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center flex-wrap gap-x-5 gap-y-2 text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Camera Status:</span>
          <div className="flex items-center space-x-1.5">
            <Monitor className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-blue-300 font-semibold">CAM-01 (PC)</span>
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-400 text-[10px]">Always Available</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-700" />
          <div className="flex items-center space-x-1.5">
            <Usb className={`h-3.5 w-3.5 ${cam2Available ? 'text-emerald-400' : 'text-slate-600'}`} />
            <span className={cam2Available ? 'text-emerald-300 font-semibold' : 'text-slate-500'}>CAM-02 (USB)</span>
            {cam2Available ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-slate-600" />}
            <span className={cam2Available ? 'text-emerald-400 text-[10px]' : 'text-slate-600 text-[10px]'}>{cam2Available ? 'Detected' : 'Not Detected'}</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-700" />
          <div className="flex items-center space-x-1.5">
            <Wifi className={`h-3.5 w-3.5 ${cam3Available ? 'text-purple-400' : 'text-slate-600'}`} />
            <span className={cam3Available ? 'text-purple-300 font-semibold' : 'text-slate-500'}>CAM-03 (WiFi)</span>
            {cam3Available ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-slate-600" />}
            <span className={cam3Available ? 'text-emerald-400 text-[10px]' : 'text-slate-600 text-[10px]'}>{cam3Available ? 'Connected' : 'Not Connected'}</span>
          </div>
          <button
            onClick={handleScanCameras}
            disabled={scanningCameras}
            className="ml-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-900/80 hover:bg-cyan-800 text-cyan-300 border border-cyan-800 text-xs font-bold transition"
          >
            <Camera className={`h-3.5 w-3.5 ${scanningCameras ? 'animate-pulse' : ''}`} />
            <span>{scanningCameras ? 'Scanning...' : 'Refresh Detection'}</span>
          </button>
        </div>
      </div>

      {/* Section 1: YOLO Model Configuration */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-2">
            <Cpu className="h-4 w-4" />
            <span>YOLO AI Model Configuration</span>
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">v2.pt</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 md:col-span-2">
            <label className="block font-bold text-white flex items-center space-x-2">
              <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
              <span>Model File Path (.pt)</span>
            </label>
            <div className="flex space-x-2">
              <input type="text" value={modelPath} onChange={(e) => setModelPath(e.target.value)} placeholder="backend/model/v2.pt" className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-purple-500" />
              <button
                type="button"
                onClick={() => setShowBrowseModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-300 border border-purple-800 text-xs font-bold transition flex items-center space-x-1.5 shrink-0"
              >
                <FolderOpen className="h-4 w-4" />
                <span>Browse...</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Full path or relative path to the YOLO .pt model file.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-white block">Reload Model</span>
              <span className="text-[11px] text-slate-400">Reloads model into GPU/CPU memory without restart.</span>
            </div>
            <button onClick={handleReloadModel} disabled={reloadingModel} className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition">
              <RefreshCw className={`h-4 w-4 ${reloadingModel ? 'animate-spin' : ''}`} />
              <span>{reloadingModel ? 'Reloading...' : 'Reload Model'}</span>
            </button>
          </div>
        </div>

        {modelReloadMsg && (
          <div className={`p-3 rounded-xl text-xs font-mono text-center ${modelReloadMsg.includes('success') ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200' : 'bg-rose-950/80 border border-rose-800 text-rose-200'}`}>
            {modelReloadMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <label className="block font-bold text-white flex items-center space-x-2">
              <Sliders className="h-3.5 w-3.5 text-cyan-400" />
              <span>Confidence Threshold</span>
              <span className="ml-auto font-mono text-cyan-400 text-sm">{confidenceThreshold.toFixed(2)}</span>
            </label>
            <input type="range" min="0.05" max="0.95" step="0.01" value={confidenceThreshold} onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
            <div className="flex justify-between text-[10px] text-slate-500"><span>0.05 (Sensitive)</span><span>0.95 (Strict)</span></div>
          </div>
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <label className="block font-bold text-white flex items-center space-x-2">
              <Sliders className="h-3.5 w-3.5 text-amber-400" />
              <span>IOU Threshold (NMS)</span>
              <span className="ml-auto font-mono text-amber-400 text-sm">{iouThreshold.toFixed(2)}</span>
            </label>
            <input type="range" min="0.1" max="0.9" step="0.01" value={iouThreshold} onChange={(e) => setIouThreshold(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
            <div className="flex justify-between text-[10px] text-slate-500"><span>0.1 (Keep more)</span><span>0.9 (Aggressive NMS)</span></div>
          </div>
        </div>
      </div>

      {/* Section 2: ESP32 IoT */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400 flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>ESP32 IoT Hardware Alarm Base Station</span>
          </h3>
          <button onClick={() => setEsp32Enabled(!esp32Enabled)} className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${esp32Enabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
            {esp32Enabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <label className="block font-bold text-white">USB Serial COM Port</label>
            <input type="text" value={esp32Port} onChange={(e) => setEsp32Port(e.target.value)} placeholder="COM5" className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500" />
          </div>
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <label className="block font-bold text-white">Serial Baud Rate</label>
            <input type="number" value={esp32Baud} onChange={(e) => setEsp32Baud(parseInt(e.target.value) || 115200)} className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500" />
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-white block">Test ESP32 Alarm</span>
              <span className="text-[11px] text-slate-400">Sends ALERT signal to buzzer &amp; LED.</span>
            </div>
            <button onClick={handleTestEsp32} disabled={testingEsp32} className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition">
              <Volume2 className="h-4 w-4 animate-bounce" />
              <span>{testingEsp32 ? 'Sending...' : 'Test ESP32'}</span>
            </button>
          </div>
        </div>
        {esp32TestMsg && (
          <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs font-mono text-center">{esp32TestMsg}</div>
        )}
      </div>

      {/* Section 3: 3-Camera Configuration */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
            <Video className="h-4 w-4" />
            <span>3-Camera Channel Configuration</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CAM-01: PC Webcam — ALWAYS AVAILABLE */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border-2 border-blue-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center space-x-2">
                <Monitor className="h-4 w-4 text-blue-400" />
                <span>CAM-01 (PC)</span>
              </span>
              <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                <span>ALWAYS ON</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Built-in PC webcam. Always available and shown. Index 0.</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Display Name</label>
                <input type="text" value={cam1Name} onChange={(e) => setCam1Name(e.target.value)} className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Device Index</label>
                <input type="number" min="0" max="10" value={cam1Index} onChange={(e) => setCam1Index(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* CAM-02: USB Camera — CONDITIONAL */}
          <div className={`p-5 rounded-2xl border-2 space-y-4 ${cam2Available ? 'bg-slate-900/80 border-emerald-800/60' : 'bg-slate-950/50 border-slate-800 opacity-70'}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center space-x-2">
                <Usb className={`h-4 w-4 ${cam2Available ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>CAM-02 (USB)</span>
              </span>
              <span className={`flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded border ${cam2Available ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>
                {cam2Available ? <><CheckCircle className="h-3 w-3 text-emerald-400" /><span>DETECTED</span></> : <><XCircle className="h-3 w-3 text-slate-600" /><span>NOT FOUND</span></>}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">External USB camera. Only shown when physically connected and detected.</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Display Name</label>
                <input type="text" value={cam2Name} onChange={(e) => setCam2Name(e.target.value)} disabled={!cam2Available} className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Device Index</label>
                <input type="number" min="0" max="10" value={cam2Index} onChange={(e) => setCam2Index(parseInt(e.target.value) || 1)} disabled={!cam2Available} className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* CAM-03: WiFi Camera — CONDITIONAL */}
          <div className={`p-5 rounded-2xl border-2 space-y-4 ${cam3Available ? 'bg-slate-900/80 border-purple-800/60' : 'bg-slate-950/50 border-slate-800 opacity-70'}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center space-x-2">
                <Wifi className={`h-4 w-4 ${cam3Available ? 'text-purple-400' : 'text-slate-600'}`} />
                <span>CAM-03 (WiFi)</span>
              </span>
              <span className={`flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded border ${cam3Available ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>
                {cam3Available ? <><CheckCircle className="h-3 w-3 text-emerald-400" /><span>CONNECTED</span></> : <><XCircle className="h-3 w-3 text-slate-600" /><span>NOT CONNECTED</span></>}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">WiFi IP camera. Only shown when URL connects. Configurable below.</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Display Name</label>
                <input type="text" value={cam3Name} onChange={(e) => setCam3Name(e.target.value)} className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">WiFi Camera URL</label>
                <div className="flex space-x-2">
                  <input type="text" placeholder="http://10.194.10.240:8080/video" value={cam3Url} onChange={(e) => setCam3Url(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-purple-500" />
                  <button onClick={handleTestWifiCamera} disabled={testingWifi || !cam3Url.trim()} className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition disabled:opacity-50">
                    {testingWifi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                    <span>{testingWifi ? 'Testing...' : 'Test'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Supports HTTP, HTTPS, RTSP, RTMP URLs.</p>
              </div>
              {wifiTestResult && (
                <div className={`p-2 rounded-lg text-xs font-mono flex items-center space-x-2 ${wifiTestResult.status === 'success' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200' : 'bg-rose-950/80 border border-rose-800 text-rose-200'}`}>
                  {wifiTestResult.status === 'success' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                  <span>{wifiTestResult.message}</span>
                </div>
              )}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <label className="block text-slate-400 font-semibold text-[11px]">Quick URL Presets</label>
                <div className="flex flex-wrap gap-2">
                  {['http://10.194.10.240:8080/video', 'http://192.168.1.100:8080/video', 'http://192.168.43.1:8080/video', 'rtsp://192.168.1.100:554/stream'].map((preset) => (
                    <button key={preset} onClick={() => setCam3Url(preset)} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-mono hover:bg-purple-900 hover:text-purple-300 hover:border-purple-700 transition">
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Alert Rules */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400 flex items-center space-x-2 border-b border-slate-800 pb-3">
          <ShieldAlert className="h-4 w-4" />
          <span>Alert Rules & Cooldown</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs mb-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <label className="block font-bold text-white">Global Alert Cooldown (Seconds)</label>
            <input type="number" min="1" max="60" value={cooldown} onChange={(e) => setCooldown(parseInt(e.target.value) || 5)} className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Auto Reconnect</span>
              <span className="text-[11px] text-slate-400">Retry IP camera feeds on network drop.</span>
            </div>
            <button onClick={() => setAutoReconnect(!autoReconnect)} className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${autoReconnect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
              {autoReconnect ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Class</th>
                <th className="p-3">Label</th>
                <th className="p-3">Severity</th>
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
                    <select value={rule.severity} onChange={(e) => handleSeverityChange(rule.id, e.target.value as any)} className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500">
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input type="number" min="1" max="60" value={rule.cooldown_seconds} onChange={(e) => handleCooldownChange(rule.id, parseInt(e.target.value) || 5)} className="w-16 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-slate-200 font-mono text-center focus:outline-none focus:border-cyan-500" />
                    <span className="text-slate-500 ml-1">s</span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleToggleRule(rule.id)} className={`px-3 py-1 rounded-lg font-bold text-[11px] uppercase transition ${rule.enabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Browse Modal */}
      {showBrowseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <FolderOpen className="h-5 w-5 text-purple-400" />
                <span>Select YOLO Model File (.pt)</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowBrowseModal(false)}
                className="p-1 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
              {[
                { id: 'workspace', label: 'Workspace Scan' },
                { id: 'explorer', label: 'File Explorer' },
                { id: 'upload', label: 'Upload Model' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveBrowseTab(tab.id as any)}
                  className={`py-3.5 px-4 font-semibold text-xs border-b-2 transition -mb-px ${
                    activeBrowseTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950/30 min-h-[300px]">
              {activeBrowseTab === 'workspace' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Discovered PyTorch weights (.pt) files in the current repository:
                  </p>
                  {loadingWorkspaceModels ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                      <span className="text-xs text-slate-400 font-mono">Scanning workspace...</span>
                    </div>
                  ) : workspaceModels.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-500 text-xs">
                      No .pt files found in workspace root. Use File Explorer or Upload options.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {workspaceModels.map((model) => (
                        <div
                          key={model.relative_path}
                          onClick={() => handleSelectModel(model.absolute_path)}
                          className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 hover:bg-purple-950/30 border border-slate-800/80 hover:border-purple-500/50 transition cursor-pointer group"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="p-2 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 text-purple-400">
                              <File className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block font-bold text-white text-xs truncate">
                                {model.name}
                              </span>
                              <span className="block font-mono text-[10px] text-slate-500 truncate mt-0.5">
                                {model.relative_path}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 ml-4 shrink-0">
                            <span className="text-[10px] font-mono text-slate-400">
                              {(model.size_bytes / (1024 * 1024)).toFixed(2)} MB
                            </span>
                            <span className="px-3 py-1 rounded-lg bg-purple-900/50 group-hover:bg-purple-600 text-purple-300 group-hover:text-white text-[10px] font-bold transition">
                              Select
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeBrowseTab === 'explorer' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300">
                    <span className="truncate flex-1">
                      Path: {explorerData.current_path || 'Loading...'}
                    </span>
                    {explorerData.parent_path && (
                      <button
                        type="button"
                        onClick={() => loadDirectory(explorerData.parent_path!)}
                        className="ml-3 flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-sans font-semibold text-slate-200 transition"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        <span>Up</span>
                      </button>
                    )}
                  </div>

                  {loadingExplorer ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                      <span className="text-xs text-slate-400 font-mono">Reading files...</span>
                    </div>
                  ) : (
                    <div className="grid gap-2 border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/20 max-h-[350px] overflow-y-auto">
                      {explorerData.folders.length === 0 && explorerData.files.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs">
                          Empty directory.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800/60">
                          {/* Folders */}
                          {explorerData.folders.map((folder) => (
                            <div
                              key={folder.path}
                              onClick={() => loadDirectory(folder.path)}
                              className="flex items-center space-x-3 p-3 hover:bg-slate-900/60 text-xs cursor-pointer transition text-slate-300 hover:text-white"
                            >
                              <Folder className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                              <span className="truncate font-medium">{folder.name}/</span>
                            </div>
                          ))}
                          {/* Files (.pt) */}
                          {explorerData.files.map((file) => (
                            <div
                              key={file.path}
                              onClick={() => handleSelectModel(file.path)}
                              className="flex items-center justify-between p-3 hover:bg-purple-950/20 text-xs cursor-pointer transition group"
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <File className="h-4.5 w-4.5 text-purple-400 shrink-0" />
                                <span className="truncate text-slate-300 group-hover:text-white font-medium">
                                  {file.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 shrink-0 ml-4">
                                <span className="text-[10px] font-mono text-slate-500">
                                  {(file.size_bytes / (1024 * 1024)).toFixed(2)} MB
                                </span>
                                <span className="text-[10px] font-bold text-purple-400 group-hover:underline">
                                  Select
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeBrowseTab === 'upload' && (
                <form onSubmit={handleUpload} className="space-y-5">
                  <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:border-purple-500/50 bg-slate-900/20 hover:bg-slate-900/40 transition relative">
                    <input
                      type="file"
                      accept=".pt"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                        <Upload className="h-8 w-8" />
                      </div>
                      <div>
                        <span className="block font-bold text-white text-xs">
                          {uploadFile ? uploadFile.name : 'Select PyTorch Model File'}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-1">
                          {uploadFile
                            ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`
                            : 'Drag and drop or click to choose model weights (.pt)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-mono text-center">
                      {uploadError}
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-mono text-center">
                      {uploadSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="w-full flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-650 hover:bg-purple-500 text-white font-bold text-xs transition disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span>{uploading ? 'Uploading weights...' : 'Upload and Select Model'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowBrowseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
