import React, { useState, useEffect } from 'react';
import { Cpu, Sliders, Layers, Upload, Image as ImageIcon } from 'lucide-react';
import type { ModelInfo } from '../types';
import { apiService } from '../services/api';

export const SystemModel: React.FC = () => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [conf, setConf] = useState<number>(0.45);
  const [iou, setIou] = useState<number>(0.45);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Test Image Upload State
  const [uploading, setUploading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      const data = await apiService.getModelInfo();
      setModelInfo(data);
      setConf(data.confidence_threshold);
      setIou(data.iou_threshold);
    };
    fetchInfo();
  }, []);

  const handleSaveThresholds = async () => {
    await apiService.updateSettings({
      confidence_threshold: conf,
      iou_threshold: iou,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setTestResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/system/test-image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to run YOLO inference on test image');
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error('Image test upload error:', err);
      alert('Failed to process image through v2.pt YOLO model.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-3">
          <Cpu className="h-6 w-6 text-cyan-400" />
          <span>System & YOLO Model Diagnostics</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Deep diagnostic view of model weights <code className="text-cyan-300 font-mono">v2.pt</code> and inference hardware execution.
        </p>
      </div>

      {/* Primary Model Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Model Binary Name</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              LOADED
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">v2.pt</p>
          <p className="text-xs text-slate-500">Path: backend/model/v2.pt (Copied from best.pt)</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Inference Device</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
              ACTIVE
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {modelInfo?.device || 'CPU (Torch 2.13)'}
          </p>
          <p className="text-xs text-slate-500">PyTorch 2.13.0 + Ultralytics 8.4.121</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Trained Model Classes</span>
            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-bold">
              10 TOTAL
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {modelInfo?.total_classes || 10} Classes
          </p>
          <p className="text-xs text-slate-500">6 Compliance / 4 Violation classes</p>
        </div>
      </div>

      {/* NEW: Test Image Inference Studio */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <ImageIcon className="h-4 w-4 text-emerald-400" />
            <span>YOLO Test Image Inference Studio (best.pt)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Upload Image & Log to Event History
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Upload Input Area */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-cyan-400">
              <Upload className="h-8 w-8" />
            </div>

            <div>
              <p className="text-sm font-bold text-white">Upload Test Image (Helmet / Vest / Workers)</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Test your trained <code className="text-cyan-300 font-mono">best.pt</code> model directly with any JPG/PNG image file. Detected objects will be recorded in Event History.
              </p>
            </div>

            <label className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer transition shadow-lg shadow-cyan-950/60">
              <Upload className="h-4 w-4" />
              <span>{uploading ? 'Processing Image...' : 'Choose Image File'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Test Result Display Area */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 min-h-[220px] flex flex-col justify-center">
            {testResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                  <span className="font-bold text-white">{testResult.filename}</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {testResult.total_detections} Detections (Logged to Event History)
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-700 max-h-[300px]">
                  <img
                    src={testResult.annotated_image}
                    alt="YOLO Result"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(testResult.class_counts).map(([cls, count]) => {
                    const c = count as number;
                    if (c === 0) return null;
                    const isVio = cls.toLowerCase().startsWith('no_');
                    return (
                      <span
                        key={cls}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                          isVio
                            ? 'bg-rose-950 text-rose-300 border-rose-800 font-bold'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {cls.replace('_', ' ').toUpperCase()}: {c}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-slate-500 text-xs">
                Upload an image to view real-time YOLO bounding boxes and confirm Event History logging.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actual Classes Extracted Dynamic Grid */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span>Extracted Class Names from v2.pt</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Directly Querying model.names
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {modelInfo?.class_names ? (
            Object.entries(modelInfo.class_names).map(([id, name]) => {
              const isViolation = name.toLowerCase().startsWith('no_');
              return (
                <div
                  key={id}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1 transition ${
                    isViolation
                      ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-mono text-slate-500">ID: {id}</span>
                  <span className="font-bold text-xs tracking-wide">
                    {name.replace('_', ' ').toUpperCase()}
                  </span>
                  <span
                    className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      isViolation
                        ? 'bg-rose-900/80 text-rose-200'
                        : 'bg-emerald-950 text-emerald-300'
                    }`}
                  >
                    {isViolation ? 'Violation' : 'Compliant'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="col-span-5 text-center text-slate-500 py-4">
              Loading model metadata...
            </div>
          )}
        </div>
      </div>

      {/* Threshold Controls */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <span>Inference Hyperparameter Thresholds</span>
          </h3>

          <button
            onClick={handleSaveThresholds}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-md shadow-cyan-950/50"
          >
            {isSaved ? 'Saved!' : 'Save Thresholds'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white">Confidence Threshold (conf)</span>
              <span className="font-mono text-cyan-400 font-bold">{conf.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.95"
              step="0.05"
              value={conf}
              onChange={(e) => setConf(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <p className="text-[11px] text-slate-400">
              Minimum probability required to classify an object bounding box.
            </p>
          </div>

          <div className="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white">IoU Threshold (NMS)</span>
              <span className="font-mono text-cyan-400 font-bold">{iou.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.95"
              step="0.05"
              value={iou}
              onChange={(e) => setIou(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <p className="text-[11px] text-slate-400">
              Intersection-over-Union threshold for Non-Maximum Suppression duplicate box removal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
