import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, ShieldAlert, Layers, Video } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import type { AnalyticsSummary } from '../types';
import { apiService } from '../services/api';

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#3b82f6'];

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const result = await apiService.getAnalytics();
      setData(result);
    };
    fetchAnalytics();
  }, []);

  const classData = data?.class_distribution
    ? Object.entries(data.class_distribution).map(([name, count]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        count,
      }))
    : [];

  const severityData = data?.alerts_by_severity
    ? Object.entries(data.alerts_by_severity).map(([sev, count]) => ({
        name: sev.toUpperCase(),
        value: count,
      }))
    : [];

  const timelineData = data?.hourly_trends?.length
    ? data.hourly_trends
    : [
        { hour: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), detections: 0, violations: 0 },
      ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 text-cyan-400" />
          <span>Safety Analytics & AI Telemetry</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Historical and session analysis derived from real-time YOLO object detection events.
        </p>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Detection Timeline Trend */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span>Detection & Violation Timeline</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Today's Hourly Trend</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorDet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="detections"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDet)"
                  name="Detections"
                />
                <Area
                  type="monotone"
                  dataKey="violations"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVio)"
                  name="Violations"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Detection Count by Class */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span>Detections by Trained Class (v2.pt)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Class Frequency</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Alerts by Severity */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Alert Severity Distribution</span>
            </h3>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {severityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Camera Channel Comparison */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Video className="h-4 w-4 text-indigo-400" />
              <span>Camera Channel Performance</span>
            </h3>
          </div>

          <div className="space-y-4 text-xs pt-2">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span>CAM-01 (USB Webcam)</span>
                <span className="text-cyan-400 font-mono">Live Channel</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-[100%]" />
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Total Recorded Alerts</span>
                <span className="font-bold text-white">{data?.alerts_by_camera?.['CAM-01'] || data?.alerts_by_camera?.['1'] || 0} Alert(s)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span>CAM-02 (Mobile IP Stream)</span>
                <span className="text-purple-400 font-mono">Network Stream</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[100%]" />
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Total Recorded Alerts</span>
                <span className="font-bold text-white">{data?.alerts_by_camera?.['CAM-02'] || data?.alerts_by_camera?.['2'] || 0} Alert(s)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
