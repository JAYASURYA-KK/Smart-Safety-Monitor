import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ScanFace,
  Trash2,
  X,
  Upload,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Database,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { apiService } from '../services/api';
import type { Worker, FaceDbStatus } from '../types';

const FACE_SLOTS = [
  { key: 'front', label: 'Front', accept: '.jpg,.jpeg,.png' },
  { key: 'front_up', label: 'Front Up', accept: '.jpg,.jpeg,.png' },
  { key: 'front_down', label: 'Front Down', accept: '.jpg,.jpeg,.png' },
  { key: 'right', label: 'Right', accept: '.jpg,.jpeg,.png' },
  { key: 'left', label: 'Left', accept: '.jpg,.jpeg,.png' },
  { key: 'test', label: 'Test', accept: '.jpg,.jpeg,.png' },
] as const;

interface WorkerFormData {
  id: string;
  name: string;
  roll_no: string;
  department: string;
  phone: string;
}

const emptyForm: WorkerFormData = { id: '', name: '', roll_no: '', department: '', phone: '' };

interface VerifyResult {
  matched: boolean;
  message: string;
  person: any;
  score?: number;
}

export function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [faceDb, setFaceDb] = useState<FaceDbStatus>({ exists: false, registered_count: 0 });
  const [loading, setLoading] = useState(true);

  // Add Worker Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<WorkerFormData>(emptyForm);
  const [faceFiles, setFaceFiles] = useState<Record<string, File | null>>({});
  const [facePreviews, setFacePreviews] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState<Worker | null>(null);

  // Verify Face
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPreview, setVerifyPreview] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Result messages
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [registering, setRegistering] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [w, db] = await Promise.all([apiService.getWorkers(), apiService.getFaceDbStatus()]);
    setWorkers(w);
    setFaceDb(db);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFileChange = (key: string, file: File | null) => {
    setFaceFiles((prev) => ({ ...prev, [key]: file }));
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setFacePreviews((prev) => ({ ...prev, [key]: e.target?.result as string }));
      reader.readAsDataURL(file);
    } else {
      setFacePreviews((prev) => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  const handleSubmit = async () => {
    if (!formData.id.trim() || !formData.name.trim()) {
      setResultMsg({ type: 'error', text: 'ID and Name are required' });
      return;
    }
    setSubmitting(true);
    setResultMsg(null);
    try {
      const fd = new FormData();
      fd.append('id', formData.id.trim());
      fd.append('name', formData.name.trim());
      fd.append('roll_no', formData.roll_no.trim());
      fd.append('department', formData.department.trim());
      fd.append('phone', formData.phone.trim());
      for (const [key, file] of Object.entries(faceFiles)) {
        if (file) fd.append(key, file);
      }
      const res = await apiService.addWorkerAndRegister(fd);
      setResultMsg({ type: 'success', text: res.message || 'Worker added & faces registered!' });
      setFormData(emptyForm);
      setFaceFiles({});
      setFacePreviews({});
      fetchData();
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || 'Failed to add worker' });
    }
    setSubmitting(false);
  };

  const handleRegisterFaces = async () => {
    setRegistering(true);
    setResultMsg(null);
    try {
      const res = await apiService.registerFaces();
      setResultMsg({ type: 'success', text: res.message || `Registered ${res.registered_count} persons` });
      fetchData();
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || 'Registration failed' });
    }
    setRegistering(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete worker ${id}? This will also remove their face images.`)) return;
    setDeleting(id);
    try {
      await apiService.deleteWorker(id);
      fetchData();
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const handleVerifyFileChange = (file: File | null) => {
    setVerifyFile(file);
    setVerifyResult(null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setVerifyPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setVerifyPreview('');
    }
  };

  const handleVerify = async () => {
    if (!verifyFile) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await apiService.verifyFace(verifyFile);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyResult({ matched: false, message: err.message || 'Verification failed', person: null });
    }
    setVerifying(false);
  };

  const openVerifyModal = () => {
    setShowVerifyModal(true);
    setVerifyFile(null);
    setVerifyPreview('');
    setVerifyResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-cyan-400" />
            Workers Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Register workers & face recognition data for PPE compliance tracking
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openVerifyModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition text-sm font-medium"
          >
            <ShieldCheck className="h-4 w-4" />
            Verify Face
          </button>
          <button
            onClick={handleRegisterFaces}
            disabled={registering}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 transition text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${registering ? 'animate-spin' : ''}`} />
            {registering ? 'Registering...' : 'Re-Register All Faces'}
          </button>
          <button
            onClick={() => { setShowAddModal(true); setResultMsg(null); setFormData(emptyForm); setFaceFiles({}); setFacePreviews({}); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 transition text-sm font-medium"
          >
            <UserPlus className="h-4 w-4" />
            Add Worker
          </button>
        </div>
      </div>

      {/* Result message */}
      {resultMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
          resultMsg.type === 'success' ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
        }`}>
          {resultMsg.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>{resultMsg.text}</span>
          <button onClick={() => setResultMsg(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <Users className="h-3.5 w-3.5" /> Total Workers
          </div>
          <div className="text-2xl font-bold text-slate-100">{workers.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <ScanFace className="h-3.5 w-3.5" /> Face DB Registered
          </div>
          <div className="text-2xl font-bold text-cyan-400">{faceDb.registered_count}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <Database className="h-3.5 w-3.5" /> DB File Size
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {faceDb.db_size_bytes ? `${(faceDb.db_size_bytes / 1024).toFixed(1)} KB` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Workers Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Registered Workers</h2>
          <button onClick={fetchData} className="text-slate-400 hover:text-slate-200 transition">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading workers...</div>
        ) : workers.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">No workers registered yet. Click "Add Worker" to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="px-4 py-3 font-medium">Photo</th>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Roll No</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Faces</th>
                  <th className="px-4 py-3 font-medium">Embeddings</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => {
                  const isExpanded = expandedRow === w.id;
                  const faceCount = faceDb.embeddings_per_person?.[w.id] || 0;
                  return (
                    <>
                      <tr key={w.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <img
                              src={`/api/workers/${w.id}/face-image?name=front`}
                              alt={w.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-cyan-300">{w.id}</td>
                        <td className="px-4 py-3 text-slate-100 font-medium">{w.name}</td>
                        <td className="px-4 py-3 text-slate-300">{w.roll_no}</td>
                        <td className="px-4 py-3 text-slate-300">{w.department}</td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{w.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            w.has_faces ? 'bg-emerald-600/20 text-emerald-300' : 'bg-slate-700/50 text-slate-500'
                          }`}>
                            <ScanFace className="h-3 w-3" />
                            {w.has_faces ? 'Uploaded' : 'None'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                            faceCount > 0 ? 'bg-cyan-600/20 text-cyan-300' : 'bg-slate-700/50 text-slate-500'
                          }`}>
                            {faceCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {faceCount > 0 ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> Ready</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-400"><AlertTriangle className="h-3 w-3" /> No faces</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setShowDetailModal(w)}
                              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-cyan-300 transition"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(w.id)}
                              disabled={deleting === w.id}
                              className="p-1.5 rounded-lg hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition disabled:opacity-50"
                              title="Delete Worker"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${w.id}-detail`} className="bg-slate-800/20">
                          <td colSpan={10} className="px-8 py-4">
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                              {FACE_SLOTS.map((slot) => (
                                <div key={slot.key} className="text-center">
                                  <div className="w-20 h-20 mx-auto rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                                    <img
                                      src={`/api/workers/${w.id}/face-image?name=${slot.key}`}
                                      alt={slot.label}
                                      className="w-full h-full object-cover"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">{slot.label}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Add Worker Modal ──────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                Add New Worker
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Worker Details */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Worker Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'id', label: 'Worker ID *', placeholder: 'e.g. 101' },
                    { key: 'name', label: 'Full Name *', placeholder: 'e.g. Jayasurya K' },
                    { key: 'roll_no', label: 'Roll No', placeholder: 'e.g. 24CSR114' },
                    { key: 'department', label: 'Department', placeholder: 'e.g. CSE' },
                    { key: 'phone', label: 'Phone', placeholder: 'e.g. 9080418085' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{field.label}</label>
                      <input
                        type="text"
                        value={(formData as any)[field.key]}
                        onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Face Images - 6 slots */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Face Images (6 angles)</h4>
                <p className="text-xs text-slate-500 mb-3">Upload photos for face recognition. Front image is required.</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {FACE_SLOTS.map((slot) => (
                    <label
                      key={slot.key}
                      className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer aspect-square overflow-hidden"
                    >
                      {facePreviews[slot.key] ? (
                        <img src={facePreviews[slot.key]} alt={slot.label} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-slate-500 group-hover:text-cyan-400 transition mb-1" />
                          <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition text-center leading-tight">{slot.label}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept={slot.accept}
                        className="hidden"
                        onChange={(e) => handleFileChange(slot.key, e.target.files?.[0] || null)}
                      />
                      {facePreviews[slot.key] && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleFileChange(slot.key, null); }}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      )}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-500">
                  <span>front.jpg</span>
                  <span>front_up.jpg</span>
                  <span>front_down.jpg</span>
                  <span>right.jpg</span>
                  <span>left.jpg</span>
                  <span>test.jpg</span>
                </div>
              </div>

              {/* Submit Result */}
              {resultMsg && showAddModal && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                  resultMsg.type === 'success' ? 'bg-emerald-600/20 text-emerald-300' : 'bg-rose-600/20 text-rose-300'
                }`}>
                  {resultMsg.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                  {resultMsg.text}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 transition text-sm font-medium disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
                {submitting ? 'Registering...' : 'Submit & Register Faces'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Worker Detail Modal ───────────────────────────────────── */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowDetailModal(null)}>
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">Worker Details</h3>
              <button onClick={() => setShowDetailModal(null)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Front image + info side by side */}
              <div className="flex items-start gap-5">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 border-2 border-cyan-500/30 shrink-0">
                  <img
                    src={`/api/workers/${showDetailModal.id}/face-image?name=front`}
                    alt={showDetailModal.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'ID', value: showDetailModal.id, mono: true, color: 'text-cyan-300' },
                    { label: 'Name', value: showDetailModal.name, bold: true },
                    { label: 'Roll No', value: showDetailModal.roll_no },
                    { label: 'Department', value: showDetailModal.department },
                    { label: 'Phone', value: showDetailModal.phone, mono: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-800/50">
                      <span className="text-xs text-slate-400">{item.label}</span>
                      <span className={`text-sm ${item.color || 'text-slate-100'} ${item.bold ? 'font-semibold' : 'font-medium'} ${item.mono ? 'font-mono' : ''}`}>
                        {item.value || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All 6 face images */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Face Images (6 angles)</h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {FACE_SLOTS.map((slot) => (
                    <div key={slot.key} className="text-center">
                      <div className={`w-full aspect-square rounded-xl bg-slate-800 border flex items-center justify-center overflow-hidden ${
                        slot.key === 'front' ? 'border-cyan-500/40' : 'border-slate-700'
                      }`}>
                        <img
                          src={`/api/workers/${showDetailModal.id}/face-image?name=${slot.key}`}
                          alt={slot.label}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                            const parent = el.parentElement;
                            if (parent && !parent.querySelector('.fallback-icon')) {
                              const icon = document.createElement('div');
                              icon.className = 'fallback-icon flex items-center justify-center';
                              icon.innerHTML = '<svg class="h-5 w-5 text-slate-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z"/></svg>';
                              parent.appendChild(icon);
                            }
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{slot.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Face Database Status</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Embeddings registered:</span>
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-600/20 px-2 py-0.5 rounded-full">
                    {faceDb.embeddings_per_person?.[showDetailModal.id] || 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end p-5 border-t border-slate-800">
              <button
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Verify Face Modal ─────────────────────────────────────── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowVerifyModal(false)}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                Verify Face
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">Upload a photo to test if the face matches any registered worker.</p>

              {/* Upload area */}
              <label className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer overflow-hidden">
                {verifyPreview ? (
                  <img src={verifyPreview} alt="Test" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-500 mb-2" />
                    <span className="text-sm text-slate-400">Click to upload test image</span>
                    <span className="text-xs text-slate-600 mt-1">.jpg, .jpeg, .png</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => handleVerifyFileChange(e.target.files?.[0] || null)}
                />
              </label>

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={!verifyFile || verifying}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition text-sm font-medium disabled:opacity-50"
              >
                {verifying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
                {verifying ? 'Verifying...' : 'Verify Face'}
              </button>

              {/* Verify Result */}
              {verifyResult && (
                <div className={`p-4 rounded-xl border ${
                  verifyResult.matched
                    ? 'bg-emerald-600/10 border-emerald-500/30'
                    : 'bg-rose-600/10 border-rose-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verifyResult.matched ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ShieldX className="h-5 w-5 text-rose-400" />
                    )}
                    <span className={`text-sm font-semibold ${verifyResult.matched ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {verifyResult.matched ? 'MATCH FOUND' : 'NO MATCH'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-2">{verifyResult.message}</p>
                  {verifyResult.person && (
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {verifyResult.person.id && verifyResult.person.id !== 'UNKNOWN' && (
                        <>
                          <span className="text-slate-400">ID:</span>
                          <span className="text-slate-200 font-mono">{verifyResult.person.id}</span>
                          <span className="text-slate-400">Name:</span>
                          <span className="text-slate-200">{verifyResult.person.name}</span>
                          <span className="text-slate-400">Dept:</span>
                          <span className="text-slate-200">{verifyResult.person.department}</span>
                        </>
                      )}
                      <span className="text-slate-400">Score:</span>
                      <span className={`font-mono ${verifyResult.matched ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {verifyResult.score ? verifyResult.score.toFixed(4) : '-'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end p-5 border-t border-slate-800">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
