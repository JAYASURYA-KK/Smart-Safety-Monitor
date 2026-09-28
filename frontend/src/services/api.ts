import type {
  SafetyAlert,
  SafetyEvent,
  ModelInfo,
  SystemSettings,
  AnalyticsSummary,
  CameraAvailabilityInfo,
  WiFiCameraTestResult,
  Worker,
  FaceDbStatus,
} from '../types';

const API_BASE = '/api';

export const apiService = {
  // System Health
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch (err) {
      console.warn('API getHealth error:', err);
      return { status: 'offline', timestamp: new Date().toISOString() };
    }
  },

  // Model Diagnostics
  async getModelInfo(): Promise<ModelInfo> {
    try {
      const res = await fetch(`${API_BASE}/system/model`);
      if (!res.ok) throw new Error('Failed to fetch model info');
      return await res.json();
    } catch (err) {
      console.warn('API getModelInfo error:', err);
      return {
        model_name: 'v2.pt',
        model_path: 'backend/model/v2.pt',
        status: 'loaded',
        device: 'CPU (PyTorch 2.13)',
        total_classes: 10,
        class_names: {
          0: 'helmet',
          1: 'gloves',
          2: 'vest',
          3: 'boots',
          4: 'goggles',
          5: 'Person',
          6: 'no_helmet',
          7: 'no_goggle',
          8: 'no_gloves',
          9: 'no_boots',
        },
        compliance_classes: ['helmet', 'gloves', 'vest', 'boots', 'goggles', 'Person'],
        violation_classes: ['no_helmet', 'no_goggle', 'no_gloves', 'no_boots'],
        inference_fps: 24,
        confidence_threshold: 0.45,
        iou_threshold: 0.45,
      };
    }
  },

  // Camera Controls
  async startCamera(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/cameras/${id}/start`, { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.error(`API startCamera error (${id}):`, err);
      return false;
    }
  },

  async stopCamera(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/cameras/${id}/stop`, { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.error(`API stopCamera error (${id}):`, err);
      return false;
    }
  },

  async reconnectCamera(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/cameras/${id}/reconnect`, { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.error(`API reconnectCamera error (${id}):`, err);
      return false;
    }
  },

  // Detect available cameras (CAM-01 PC always, CAM-02 USB conditional, CAM-03 WiFi conditional)
  async detectCameras(): Promise<Record<string, CameraAvailabilityInfo>> {
    try {
      const res = await fetch(`${API_BASE}/cameras/detect`);
      if (!res.ok) throw new Error('Failed to detect cameras');
      return await res.json();
    } catch (err) {
      console.warn('API detectCameras error:', err);
      return {
        '1': { camera_id: 'CAM-01', name: 'PC Webcam', available: true, type: 'pc', always_available: true },
        '2': { camera_id: 'CAM-02', name: 'USB Camera', available: false, type: 'usb', always_available: false },
        '3': { camera_id: 'CAM-03', name: 'WiFi Camera', available: false, type: 'wifi', always_available: false },
      };
    }
  },

  // Safety Alerts REST Endpoints
  async getAlerts(statusFilter?: string): Promise<SafetyAlert[]> {
    try {
      const url = statusFilter
        ? `${API_BASE}/alerts?status=${statusFilter}`
        : `${API_BASE}/alerts`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return await res.json();
    } catch (err) {
      console.warn('API getAlerts error:', err);
      return [];
    }
  },

  async acknowledgeAlert(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.error(`API acknowledgeAlert error (${id}):`, err);
      return false;
    }
  },

  async resolveAlert(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.error(`API resolveAlert error (${id}):`, err);
      return false;
    }
  },

  // Safety Event History REST Endpoint
  async getEvents(params?: {
    search?: string;
    camera_id?: string;
    class_name?: string;
    severity?: string;
  }): Promise<SafetyEvent[]> {
    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.camera_id) query.append('camera_id', params.camera_id);
      if (params?.class_name) query.append('class_name', params.class_name);
      if (params?.severity) query.append('severity', params.severity);

      const res = await fetch(`${API_BASE}/events?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return await res.json();
    } catch (err) {
      console.warn('API getEvents error:', err);
      return [];
    }
  },

  // Analytics REST Endpoint
  async getAnalytics(): Promise<AnalyticsSummary> {
    try {
      const res = await fetch(`${API_BASE}/analytics`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return await res.json();
    } catch (err) {
      console.warn('API getAnalytics error:', err);
      return {
        total_detections_today: 0,
        total_violations_today: 0,
        alerts_by_camera: {},
        alerts_by_severity: {},
        class_distribution: {},
        hourly_trends: [],
      };
    }
  },

  // System Settings REST Endpoints
  async getSettings(): Promise<SystemSettings> {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (!res.ok) throw new Error('Failed to fetch settings');
      return await res.json();
    } catch (err) {
      console.warn('API getSettings error:', err);
      return {
        camera1_index: 0,
        camera1_name: 'CAM-01 (PC Webcam)',
        camera2_index: 1,
        camera2_name: 'CAM-02 (USB Camera)',
        camera3_url: 'http://10.194.10.240:8080/video',
        camera3_name: 'CAM-03 (WiFi Camera)',
        model_path: 'backend/model/v2.pt',
        confidence_threshold: 0.45,
        iou_threshold: 0.45,
        alert_cooldown_seconds: 5,
        auto_reconnect: true,
        alert_rules: [
          { id: 'r1', class_name: 'no_helmet', label: 'No Helmet Violation', severity: 'critical', enabled: true, cooldown_seconds: 5 },
          { id: 'r2', class_name: 'no_goggle', label: 'No Goggles Warning', severity: 'warning', enabled: true, cooldown_seconds: 5 },
          { id: 'r3', class_name: 'no_gloves', label: 'No Gloves Warning', severity: 'warning', enabled: true, cooldown_seconds: 5 },
          { id: 'r4', class_name: 'no_boots', label: 'No Boots Warning', severity: 'warning', enabled: true, cooldown_seconds: 5 },
        ],
        esp32_enabled: true,
        esp32_connected: false,
        esp32_com_port: 'COM5',
        esp32_baud_rate: 115200,
        esp32_status: 'Searching...',
      };
    }
  },

  // Model Reload
  async reloadModel(): Promise<{ status: string; message: string }[]> {
    try {
      const res = await fetch(`${API_BASE}/system/model/reload`, { method: 'POST' });
      if (!res.ok) throw new Error('Model reload failed');
      return await res.json();
    } catch (err) {
      console.error('API reloadModel error:', err);
      return { status: 'error', message: 'Model reload failed' } as any;
    }
  },

  // Test WiFi/IP Camera URL Connectivity
  async testWifiCamera(url?: string): Promise<WiFiCameraTestResult> {
    try {
      const params = url ? `?url=${encodeURIComponent(url)}` : '';
      const res = await fetch(`${API_BASE}/settings/test-wifi-camera${params}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to test WiFi camera');
      return await res.json();
    } catch (err) {
      console.warn('API testWifiCamera error:', err);
      return {
        status: 'error',
        message: 'Failed to test WiFi camera connection',
        url: url || '',
        available: false,
      };
    }
  },

  async updateSettings(settingsData: Partial<SystemSettings>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });
      return res.ok;
    } catch (err) {
      console.error('API updateSettings error:', err);
      return false;
    }
  },

  async listModels(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/settings/list-models`);
      if (!res.ok) throw new Error('Failed to fetch workspace models');
      return await res.json();
    } catch (err) {
      console.warn('API listModels error:', err);
      return [];
    }
  },

  async browseDirectory(path?: string): Promise<{
    current_path: string;
    parent_path: string | null;
    folders: { name: string; path: string }[];
    files: { name: string; path: string; size_bytes: number }[];
  }> {
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      const res = await fetch(`${API_BASE}/settings/browse-directory${params}`);
      if (!res.ok) throw new Error('Failed to browse directory');
      return await res.json();
    } catch (err) {
      console.warn('API browseDirectory error:', err);
      return { current_path: '', parent_path: null, folders: [], files: [] };
    }
  },

  async uploadModel(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/settings/upload-model`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Model upload failed');
    }
    return await res.json();
  },

  // ─── Workers API ───────────────────────────────────────────────
  async getWorkers(): Promise<Worker[]> {
    try {
      const res = await fetch(`${API_BASE}/workers`);
      if (!res.ok) throw new Error('Failed to fetch workers');
      const data = await res.json();
      return data.workers || [];
    } catch (err) {
      console.warn('API getWorkers error:', err);
      return [];
    }
  },

  async getWorker(id: string): Promise<Worker | null> {
    try {
      const res = await fetch(`${API_BASE}/workers/${id}`);
      if (!res.ok) throw new Error('Failed to fetch worker');
      return await res.json();
    } catch (err) {
      console.warn('API getWorker error:', err);
      return null;
    }
  },

  async deleteWorker(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/workers/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.error(`API deleteWorker error (${id}):`, err);
      return false;
    }
  },

  async uploadWorkerFaces(id: string, files: Record<string, File>): Promise<any> {
    const formData = new FormData();
    for (const [key, file] of Object.entries(files)) {
      formData.append(key, file);
    }
    const res = await fetch(`${API_BASE}/workers/${id}/faces`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload faces');
    }
    return await res.json();
  },

  async addWorkerAndRegister(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/workers/add-and-register`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to add worker and register');
    }
    return await res.json();
  },

  async registerFaces(): Promise<any> {
    const res = await fetch(`${API_BASE}/workers/register-faces`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Face registration failed');
    }
    return await res.json();
  },

  async getFaceDbStatus(): Promise<FaceDbStatus> {
    try {
      const res = await fetch(`${API_BASE}/workers/db/status`);
      if (!res.ok) throw new Error('Failed to face DB status');
      return await res.json();
    } catch (err) {
      console.warn('API getFaceDbStatus error:', err);
      return { exists: false, registered_count: 0 };
    }
  },

  async verifyFace(file: File): Promise<{ matched: boolean; message: string; person: any; score?: number }> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/workers/verify-face`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Face verification failed');
    }
    return await res.json();
  },
};
