import React, { useState } from 'react';
import {
  HardHat,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  LogIn,
  LogOut,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useHelmetTelemetry } from '../hooks/useHelmetTelemetry';
import { Helmet3DViewer } from '../components/Helmet3DViewer';
import { DEFAULT_HELMET_CREDENTIALS } from '../services/firebase';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export const HelmetIoT: React.FC = () => {
  const {
    data,
    history,
    isOnline,
    lastSeenSeconds,
    pitchDeg,
    rollDeg,
    totalG,
    user,
    error,
    isDemoMode,
    invertPitch,
    invertRoll,
    setDemoMode,
    setInvertPitch,
    setInvertRoll,
    calibrateLevel,
    resetCalibration,
    triggerDemoImpact,
    triggerDemoGas,
    triggerDemoSOS,
    signIn,
    signOut,
  } = useHelmetTelemetry();

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>(DEFAULT_HELMET_CREDENTIALS.email);
  const [authPassword, setAuthPassword] = useState<string>(DEFAULT_HELMET_CREDENTIALS.password);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signIn(authEmail, authPassword);
      setShowAuthModal(false);
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Firebase login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // Sensor extraction & formatting
  const dhtOk = data?.dht_ok !== false;
  const mpuOk = data?.mpu_ok !== false;
  const gasAlert = data?.gas_alert === true;
  const impactAlert = data?.impact_alert === true || (data?.peak_g ?? 0) > 2.5;
  const highTempAlert = data?.high_temp_alert === true || (data?.temperature ?? 0) > 35;
  const sosAlert = data?.sos_alert === true;

  const fmt = (v?: number, d = 2) => (typeof v === 'number' ? v.toFixed(d) : '--');

  const formatUptime = (seconds?: number) => {
    if (typeof seconds !== 'number') return '--';
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  const uptimeSec = typeof data?.uptime_s === 'number'
    ? data.uptime_s
    : typeof data?.uptime_ms === 'number'
    ? data.uptime_ms / 1000
    : 0;

  // Master alert message composition
  const alertMessages: string[] = [];
  if (sosAlert) alertMessages.push('🚨 WORKER EMERGENCY SOS SIGNAL ACTIVATED (Pin G26 Triggered)');
  if (gasAlert) alertMessages.push('CO Gas Hazard Detected (MQ-7 DO Pin LOW)');
  if (impactAlert) alertMessages.push(`Fall / High Impact Detected (${fmt(data?.peak_g, 2)} g)`);
  if (highTempAlert) alertMessages.push(`Thermal Hazard Alert (${fmt(data?.temperature, 1)} °C)`);
  if (!mpuOk) alertMessages.push('MPU6050 Motion Sensor Offline');
  if (!dhtOk) alertMessages.push('DHT22 Sensor Reading Error');

  const hasCriticalAlarm = gasAlert || impactAlert || sosAlert;
  const hasWarning = highTempAlert || !mpuOk || !dhtOk;

  return (
    <div className="space-y-6">
      {/* Top Header & Connection Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-950/50">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-3">
                <span>Smart Safety Helmet IoT Monitor</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Firebase RTDB
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Wearable hardware node • ESP32 • SOS Switch (G26) • MPU6050 (6-DoF) • MQ-7 CO Gas • DHT22 Environmental
              </p>
            </div>
          </div>
        </div>

        {/* Right Status Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Device Online/Offline Pill */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold backdrop-blur-md ${
              isOnline
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/80 border-rose-800 text-rose-300'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>{isOnline ? 'Device Online' : 'Device Offline'}</span>
            <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">
              {isOnline ? `${lastSeenSeconds}s ago` : 'No signal'}
            </span>
          </div>

          {/* Demo Mode Toggle Button */}
          <button
            onClick={() => setDemoMode(!isDemoMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              isDemoMode
                ? 'bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-950/60'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            <span>{isDemoMode ? 'Demo Mode Active' : 'Test / Demo Mode'}</span>
          </button>

          {/* Firebase Auth Button */}
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-800/80 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-300 font-bold max-w-[150px] truncate">{user.email}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs transition"
                title="Sign Out"
              >
                <LogOut className="h-3 w-3" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-950/50"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In as Surya</span>
            </button>
          )}
        </div>
      </div>

      {/* Auth / Connection Notice */}
      {!user && !isDemoMode && (
        <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Firebase Authentication Required: Connecting as <strong>{DEFAULT_HELMET_CREDENTIALS.email}</strong>...</span>
          </div>
          <button
            onClick={() => signIn(DEFAULT_HELMET_CREDENTIALS.email, DEFAULT_HELMET_CREDENTIALS.password)}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition shrink-0 self-start sm:self-auto"
          >
            Authenticate Now
          </button>
        </div>
      )}

      {/* Connection Notice / Error */}
      {error && (
        <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300 font-mono flex items-center justify-between">
          <span>Firebase Connection: {error}</span>
          <span className="text-[10px] text-rose-400">Click &quot;Test / Demo Mode&quot; to test sensors offline</span>
        </div>
      )}

      {/* Master Alert Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
          hasCriticalAlarm
            ? 'bg-rose-950/80 border-rose-700 text-rose-200 alert-glow-critical'
            : hasWarning
            ? 'bg-amber-950/80 border-amber-700 text-amber-200'
            : 'bg-emerald-950/70 border-emerald-800/80 text-emerald-200'
        }`}
      >
        <div className="flex items-center space-x-3">
          {hasCriticalAlarm ? (
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 animate-bounce" />
          ) : hasWarning ? (
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
          )}

          <div>
            <p className="text-sm font-bold">
              {alertMessages.length > 0
                ? `ACTIVE ALARM: ${alertMessages.join(' • ')}`
                : 'ALL CLEAR: Smart Helmet telemetry within safe operating parameters.'}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              Target Node: <code className="font-mono text-cyan-300">ESP32-HELMET-01</code> | Realtime RTDB Feed: <code className="font-mono text-cyan-300">/sensors/latest</code>
            </p>
          </div>
        </div>

        {isDemoMode && (
          <div className="flex items-center space-x-2">
            <button
              onClick={triggerDemoSOS}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm animate-pulse"
            >
              Trigger SOS
            </button>
            <button
              onClick={triggerDemoImpact}
              className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition shadow-sm"
            >
              Trigger Impact
            </button>
            <button
              onClick={triggerDemoGas}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm"
            >
              Trigger Gas
            </button>
          </div>
        )}
      </div>

      {/* 6 Primary Telemetry Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Worker Emergency SOS (G26) */}
        <div
          className={`glass-panel p-5 rounded-3xl border transition-all ${
            sosAlert
              ? 'border-rose-500 bg-rose-950/70 shadow-lg shadow-rose-950/70 alert-glow-critical'
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium uppercase tracking-wider">Worker SOS</span>
            <Radio className={`h-4 w-4 ${sosAlert ? 'text-rose-400 animate-ping' : 'text-slate-500'}`} />
          </div>
          <div className="mt-3">
            <span
              className={`text-xl font-extrabold font-mono tracking-tight ${
                sosAlert ? 'text-rose-300 animate-pulse font-black' : 'text-emerald-400'
              }`}
            >
              {sosAlert ? 'EMERGENCY SOS' : 'STANDBY'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span className={sosAlert ? 'text-rose-400 font-bold' : 'text-slate-500'}>
              {sosAlert ? 'SWITCH TRIGGERED' : 'Pin G26 Switch'}
            </span>
            <span className="font-mono text-slate-500">Hold 3s</span>
          </div>
        </div>
        {/* Card 1: Temperature */}
        <div
          className={`glass-panel p-5 rounded-3xl border transition-all ${
            highTempAlert
              ? 'border-rose-600 bg-rose-950/40 shadow-lg shadow-rose-950/40'
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium uppercase tracking-wider">Temperature</span>
            <Thermometer className={`h-4 w-4 ${highTempAlert ? 'text-rose-400' : 'text-amber-400'}`} />
          </div>
          <div className="mt-3 flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-white font-mono">
              {dhtOk ? fmt(data?.temperature, 1) : '--'}
            </span>
            <span className="text-sm text-slate-400 font-bold">°C</span>
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between">
            <span className={highTempAlert ? 'text-rose-400 font-bold' : 'text-slate-400'}>
              {highTempAlert ? 'HIGH TEMP ALERT' : dhtOk ? 'DHT22 Normal' : 'DHT Failed'}
            </span>
            <span className="font-mono text-slate-500">Max 40°C</span>
          </div>
        </div>

        {/* Card 2: Humidity */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium uppercase tracking-wider">Humidity</span>
            <Droplets className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-white font-mono">
              {dhtOk ? fmt(data?.humidity, 1) : '--'}
            </span>
            <span className="text-sm text-slate-400 font-bold">%</span>
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between">
            <span className="text-emerald-400 font-medium">Comfort Index</span>
            <span className="font-mono text-slate-500">DHT22 RH</span>
          </div>
        </div>

        {/* Card 3: Gas & CO MQ-7 */}
        <div
          className={`glass-panel p-5 rounded-3xl border transition-all ${
            gasAlert
              ? 'border-rose-600 bg-rose-950/40 shadow-lg shadow-rose-950/50'
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium uppercase tracking-wider">CO Gas (MQ-7)</span>
            <Wind className={`h-4 w-4 ${gasAlert ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className="mt-3">
            <span
              className={`text-xl font-extrabold font-mono tracking-tight ${
                gasAlert ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
              }`}
            >
              {gasAlert ? 'GAS DETECTED' : 'Air Normal'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>DO Pin: <code className="text-cyan-300 font-mono font-bold">{data?.mq7_do ?? '--'}</code></span>
            <span className="text-[10px] text-slate-500">LOW = Gas Alert</span>
          </div>
        </div>

        {/* Card 4: Fall / Impact MPU6050 */}
        <div
          className={`glass-panel p-5 rounded-3xl border transition-all ${
            impactAlert
              ? 'border-rose-600 bg-rose-950/40 shadow-lg shadow-rose-950/50'
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium uppercase tracking-wider">Fall / Impact</span>
            <Activity className={`h-4 w-4 ${impactAlert ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className="mt-3">
            <span
              className={`text-xl font-extrabold font-mono tracking-tight ${
                impactAlert ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
              }`}
            >
              {impactAlert ? 'IMPACT DETECTED' : 'Normal'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Peak: <code className="text-amber-400 font-mono font-bold">{fmt(data?.peak_g, 2)} g</code></span>
            <span className="text-[10px] text-slate-500">Limit: 2.5 g</span>
          </div>
        </div>

        {/* Card 5: Core Board Temp & Uptime */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium uppercase tracking-wider">MPU Board Temp</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-white font-mono">
              {mpuOk ? fmt(data?.mpu_temperature, 1) : '--'}
            </span>
            <span className="text-sm text-slate-400 font-bold">°C</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Uptime:</span>
            <span className="font-mono text-cyan-300 font-medium">{formatUptime(uptimeSec)}</span>
          </div>
        </div>
      </div>

      {/* Main Centerpiece: Realistic 3D Helmet Motion Viewer */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <HardHat className="h-5 w-5 text-amber-400" />
              <span>Real-Time 3D Helmet Kinematics (E:\Smart-Safety-Monitor\frontend\public\construction_helmet.glb)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive 3D model orientation directly driven by MPU6050 accelerometer vector & Three.js PBR lighting.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Tilt Vector:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300">
              P: {pitchDeg}° | R: {rollDeg}°
            </span>
          </div>
        </div>

        {/* 3D Helmet Canvas Component */}
        <Helmet3DViewer
          accelX={data?.accel_x}
          accelY={data?.accel_y}
          accelZ={data?.accel_z}
          impactAlert={impactAlert}
          gasAlert={gasAlert}
          sosAlert={sosAlert}
          highTempAlert={highTempAlert}
          peakG={data?.peak_g}
          pitchDeg={pitchDeg}
          rollDeg={rollDeg}
          totalG={totalG}
          invertPitch={invertPitch}
          invertRoll={invertRoll}
          onCalibrate={calibrateLevel}
          onToggleInvertPitch={() => setInvertPitch(!invertPitch)}
          onToggleInvertRoll={() => setInvertRoll(!invertRoll)}
          onResetCalibration={resetCalibration}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 pt-1">
          <p>
            • Tilt calculation: <code className="text-slate-400 font-mono">atan2(-Ax, hypot(Ay, Az))</code> for Pitch and <code className="text-slate-400 font-mono">atan2(Ay, Az)</code> for Roll.
          </p>
          <p>
            • Interactive: Click & drag to rotate 360°, scroll to zoom, or use the bottom action bar to calibrate level.
          </p>
        </div>
      </div>

      {/* Motion Vectors Grid: Accelerometer & Gyroscope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accelerometer */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>3-Axis Accelerometer (MPU6050)</span>
            </h3>
            <span className="text-xs font-mono text-cyan-300">Unit: g</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { axis: 'X', val: data?.accel_x, color: 'text-rose-400' },
              { axis: 'Y', val: data?.accel_y, color: 'text-emerald-400' },
              { axis: 'Z', val: data?.accel_z, color: 'text-cyan-400' },
            ].map(({ axis, val, color }) => (
              <div
                key={axis}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center space-y-1"
              >
                <span className="text-xs font-mono text-slate-400 font-semibold">{axis}-AXIS</span>
                <span className={`text-2xl font-extrabold font-mono ${color}`}>
                  {fmt(val, 2)}
                </span>
                <span className="text-[10px] text-slate-500">Acceleration</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Acceleration Magnitude:</span>
            <span className="font-mono font-bold text-white">{totalG.toFixed(2)} g</span>
          </div>
        </div>

        {/* Gyroscope */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-purple-400" />
              <span>3-Axis Gyroscope (MPU6050)</span>
            </h3>
            <span className="text-xs font-mono text-purple-300">Unit: rad/s</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { axis: 'X', val: data?.gyro_x, color: 'text-purple-400' },
              { axis: 'Y', val: data?.gyro_y, color: 'text-pink-400' },
              { axis: 'Z', val: data?.gyro_z, color: 'text-indigo-400' },
            ].map(({ axis, val, color }) => (
              <div
                key={axis}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center space-y-1"
              >
                <span className="text-xs font-mono text-slate-400 font-semibold">{axis}-AXIS</span>
                <span className={`text-2xl font-extrabold font-mono ${color}`}>
                  {fmt(val, 2)}
                </span>
                <span className="text-[10px] text-slate-500">Angular Rate</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Angular Velocity Vector:</span>
            <span className="font-mono font-bold text-purple-300">
              {Math.hypot(data?.gyro_x ?? 0, data?.gyro_y ?? 0, data?.gyro_z ?? 0).toFixed(2)} rad/s
            </span>
          </div>
        </div>
      </div>

      {/* Historical Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environmental Trends Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Thermometer className="h-4 w-4 text-amber-400" />
              <span>Environmental History (Last 40 Readings)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Temp & Humidity</span>
          </div>

          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature (°C)"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity (%)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Waiting for historical readings from Firebase...
              </div>
            )}
          </div>
        </div>

        {/* Acceleration Dynamics Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>Kinematics & Impact History (Last 40 Readings)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">3-Axis Accel & Peak G</span>
          </div>

          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[-3, 4]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <ReferenceLine
                    y={2.5}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: 'Impact Limit 2.5g', fill: '#ef4444', fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accel_x"
                    name="Accel X (g)"
                    stroke="#f87171"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="accel_y"
                    name="Accel Y (g)"
                    stroke="#4ade80"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="accel_z"
                    name="Accel Z (g)"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="peak_g"
                    name="Peak G"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Waiting for kinematics readings from Firebase...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Firebase Sign In Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700 bg-slate-900 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <LogIn className="h-5 w-5 text-cyan-400" />
                <span>Firebase Authentication</span>
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Sign in with your Firebase Authentication user to authenticate with Realtime Database.
            </p>

            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="worker@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300 font-mono">
                  {authError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-950/50 disabled:opacity-50"
                >
                  {authLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
