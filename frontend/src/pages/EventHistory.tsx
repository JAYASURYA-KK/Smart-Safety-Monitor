import React, { useState, useEffect } from 'react';
import { History, Search, Download } from 'lucide-react';
import type { SafetyEvent } from '../types';
import { apiService } from '../services/api';

export const EventHistory: React.FC = () => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const loadEvents = async () => {
    const data = await apiService.getEvents({
      search: search || undefined,
      camera_id: selectedCamera === 'all' ? undefined : selectedCamera,
      class_name: selectedClass === 'all' ? undefined : selectedClass,
      severity: selectedSeverity === 'all' ? undefined : selectedSeverity,
    });
    setEvents(data);
  };

  useEffect(() => {
    loadEvents();
  }, [search, selectedCamera, selectedClass, selectedSeverity]);

  const exportCSV = () => {
    if (events.length === 0) return;
    const headers = ['Event ID', 'Timestamp', 'Camera ID', 'Camera Name', 'Class Name', 'Confidence', 'Severity', 'Is Violation'];
    const rows = events.map((e) => [
      e.id,
      e.timestamp,
      e.camera_id,
      `"${e.camera_name}"`,
      e.class_name,
      (e.confidence * 100).toFixed(1) + '%',
      e.severity,
      e.is_violation ? 'YES' : 'NO',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `safety_events_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <History className="h-6 w-6 text-cyan-400" />
            <span>Event History & Inspection Logs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search and query historical detection events stored by the backend engine.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <Download className="h-4 w-4 text-cyan-400" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search class or event ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Camera Filter */}
        <select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Cameras</option>
          <option value="CAM-01">CAM-01 (USB Webcam)</option>
          <option value="CAM-02">CAM-02 (Mobile IP)</option>
        </select>

        {/* Class Filter */}
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Classes</option>
          <option value="no_helmet">No Helmet</option>
          <option value="no_goggle">No Goggles</option>
          <option value="no_gloves">No Gloves</option>
          <option value="no_boots">No Boots</option>
          <option value="helmet">Helmet</option>
          <option value="vest">Vest</option>
          <option value="Person">Person</option>
        </select>

        {/* Severity Filter */}
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Event ID</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Camera</th>
                <th className="p-4">Detected Class</th>
                <th className="p-4">Confidence</th>
                <th className="p-4">Severity</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
              {events.length > 0 ? (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-900/60 transition">
                    <td className="p-4 font-mono font-bold text-cyan-400">{ev.id}</td>
                    <td className="p-4 font-mono text-slate-400">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono">{ev.camera_id}</td>
                    <td className="p-4 font-bold text-white">
                      {ev.class_name.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="p-4 font-mono text-cyan-300">
                      {(ev.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ev.severity === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : ev.severity === 'warning'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {ev.severity}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-400">
                      {ev.status || 'RECORDED'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No historical events match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
