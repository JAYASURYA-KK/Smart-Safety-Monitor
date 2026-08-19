import type {
  SafetyAlert,
  SafetyEvent,
  ModelInfo,
  SystemSettings,
  AnalyticsSummary,
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
        camera1_name: 'CAM-01 (USB Webcam)',
        camera2_url: 'http://192.168.1.50:8080/video',
        camera2_name: 'CAM-02 (Mobile IP Stream)',
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
        esp32_com_port: 'COM5',
        esp32_baud_rate: 115200,
        esp32_status: 'Simulated / Ready',
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
};
