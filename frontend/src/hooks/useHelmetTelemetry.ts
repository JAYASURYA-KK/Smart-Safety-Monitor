import { useState, useEffect, useRef, useCallback } from 'react';
import { firebaseHelmetService } from '../services/firebase';
import type { HelmetSensorData, HelmetHistoryItem } from '../types';
import type { User } from 'firebase/auth';

export interface UseHelmetTelemetryReturn {
  data: HelmetSensorData | null;
  history: HelmetHistoryItem[];
  isOnline: boolean;
  lastSeenSeconds: number;
  pitchDeg: number;
  rollDeg: number;
  totalG: number;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isDemoMode: boolean;
  invertPitch: boolean;
  invertRoll: boolean;
  pitchOffset: number;
  rollOffset: number;
  setDemoMode: (val: boolean) => void;
  setInvertPitch: (val: boolean | ((prev: boolean) => boolean)) => void;
  setInvertRoll: (val: boolean | ((prev: boolean) => boolean)) => void;
  calibrateLevel: () => void;
  resetCalibration: () => void;
  triggerDemoImpact: () => void;
  triggerDemoGas: () => void;
  triggerDemoSOS: () => void;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useHelmetTelemetry(): UseHelmetTelemetryReturn {
  const [data, setData] = useState<HelmetSensorData | null>(null);
  const [history, setHistory] = useState<HelmetHistoryItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastSeenSeconds, setLastSeenSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Calibration & Orientation settings
  const [pitchOffset, setPitchOffset] = useState<number>(0);
  const [rollOffset, setRollOffset] = useState<number>(0);
  const [invertPitch, setInvertPitch] = useState<boolean>(false);
  const [invertRoll, setInvertRoll] = useState<boolean>(false);

  // Demo simulation mode
  const [isDemoMode, setDemoMode] = useState<boolean>(false);
  const demoAlertsRef = useRef<{ impact: boolean; gas: boolean; sos: boolean }>({ impact: false, gas: false, sos: false });

  // Heartbeat tracking
  const lastUptimeRef = useRef<number | null>(null);
  const lastChangeTimeRef = useRef<number>(0);

  // Raw orientation values from latest telemetry
  const rawOrientationRef = useRef<{ pitch: number; roll: number }>({ pitch: 0, roll: 0 });

  // Update online heartbeat status every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (isDemoMode) {
        setIsOnline(true);
        setLastSeenSeconds(0);
        return;
      }
      if (!lastChangeTimeRef.current) {
        setIsOnline(false);
        setLastSeenSeconds(999);
        return;
      }
      const age = Math.max(0, (Date.now() - lastChangeTimeRef.current) / 1000);
      setLastSeenSeconds(Math.round(age));
      setIsOnline(age < 12);
    }, 1000);
    return () => clearInterval(timer);
  }, [isDemoMode]);

  // Auth listener
  useEffect(() => {
    return firebaseHelmetService.onAuthChange((u) => {
      setUser(u);
    });
  }, []);

  // Firebase Realtime Database subscriptions
  useEffect(() => {
    if (isDemoMode) return;

    if (!user) {
      setIsLoading(true);
      firebaseHelmetService.autoSignIn().catch(() => {});
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubLatest = firebaseHelmetService.subscribeToLatest(
      (latestData) => {
        setData(latestData);
        setIsLoading(false);
        setError(null);

        // Check uptime change for online status
        const up = typeof latestData.uptime_s === 'number'
          ? latestData.uptime_s
          : typeof latestData.uptime_ms === 'number'
          ? latestData.uptime_ms / 1000
          : 0;

        if (up !== lastUptimeRef.current) {
          lastUptimeRef.current = up;
          lastChangeTimeRef.current = Date.now();
          setIsOnline(true);
          setLastSeenSeconds(0);
        }

        // Compute raw pitch & roll
        if (latestData.mpu_ok !== false) {
          const ax = latestData.accel_x ?? 0;
          const ay = latestData.accel_y ?? 0;
          const az = latestData.accel_z ?? 1;
          const rawP = Math.atan2(-ax, Math.hypot(ay, az));
          const rawR = Math.atan2(ay, az);
          rawOrientationRef.current = { pitch: rawP, roll: rawR };
        }
      },
      (err) => {
        setError(err.message || 'Firebase read error');
        setIsLoading(false);
      }
    );

    const unsubHistory = firebaseHelmetService.subscribeToHistory(
      40,
      (historyData) => {
        setHistory(historyData);
      },
      (err) => {
        console.warn('History read warning:', err);
      }
    );

    return () => {
      unsubLatest();
      unsubHistory();
    };
  }, [user, isDemoMode]);

  // Demo Mode Simulation Loop
  useEffect(() => {
    if (!isDemoMode) return;

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const t = step * 0.15;
      // Gentle realistic tilting motion
      const tiltPitch = Math.sin(t * 0.8) * 0.35;
      const tiltRoll = Math.cos(t * 0.6) * 0.25;

      const ax = -Math.sin(tiltPitch);
      const ay = Math.sin(tiltRoll);
      const az = Math.cos(tiltPitch);

      const hasImpact = demoAlertsRef.current.impact;
      const hasGas = demoAlertsRef.current.gas;
      const hasSos = demoAlertsRef.current.sos;

      const simData: HelmetSensorData = {
        temperature: 28.5 + Math.sin(t * 0.1) * 2.2,
        humidity: 62.0 + Math.cos(t * 0.1) * 3.5,
        dht_ok: true,
        gas_alert: hasGas,
        high_temp_alert: false,
        impact_alert: hasImpact,
        sos_alert: hasSos,
        any_alert: hasGas || hasImpact || hasSos,
        mpu_ok: true,
        mq7_do: hasGas ? 0 : 1,
        peak_g: hasImpact ? 3.42 : 1.05 + Math.abs(Math.sin(t * 1.5)) * 0.4,
        mpu_temperature: 32.1,
        uptime_s: step * 2,
        accel_x: parseFloat((ax + (hasImpact ? 1.8 : 0)).toFixed(2)),
        accel_y: parseFloat((ay + (hasImpact ? -1.2 : 0)).toFixed(2)),
        accel_z: parseFloat((az).toFixed(2)),
        gyro_x: parseFloat((Math.cos(t) * 0.8).toFixed(2)),
        gyro_y: parseFloat((Math.sin(t) * 0.6).toFixed(2)),
        gyro_z: parseFloat((Math.sin(t * 0.5) * 0.4).toFixed(2)),
      };

      rawOrientationRef.current = { pitch: tiltPitch, roll: tiltRoll };
      setData(simData);

      // Append to simulated history
      setHistory((prev) => {
        const next = [
          ...prev.slice(-39),
          {
            ...simData,
            label: `${step * 2}s`,
          },
        ];
        return next;
      });

      // Clear impact after 3 seconds
      if (hasImpact) {
        setTimeout(() => {
          demoAlertsRef.current.impact = false;
        }, 3000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemoMode]);

  // Orientation Calculations with Inversions and Offsets
  const radToDeg = (rad: number) => (rad * 180) / Math.PI;

  const currentRawP = rawOrientationRef.current.pitch;
  const currentRawR = rawOrientationRef.current.roll;

  const signP = invertPitch ? -1 : 1;
  const signR = invertRoll ? -1 : 1;

  const computedPitchRad = signP * (currentRawP - pitchOffset);
  const computedRollRad = signR * (currentRawR - rollOffset);

  const pitchDeg = Math.round(radToDeg(computedPitchRad));
  const rollDeg = Math.round(radToDeg(computedRollRad));

  const ax = data?.accel_x ?? 0;
  const ay = data?.accel_y ?? 0;
  const az = data?.accel_z ?? 1;
  const totalG = parseFloat(Math.hypot(ax, ay, az).toFixed(2));

  // Calibration functions
  const calibrateLevel = useCallback(() => {
    setPitchOffset(currentRawP);
    setRollOffset(currentRawR);
  }, [currentRawP, currentRawR]);

  const resetCalibration = useCallback(() => {
    setPitchOffset(0);
    setRollOffset(0);
    setInvertPitch(false);
    setInvertRoll(false);
  }, []);

  const triggerDemoImpact = useCallback(() => {
    demoAlertsRef.current.impact = true;
  }, []);

  const triggerDemoGas = useCallback(() => {
    demoAlertsRef.current.gas = !demoAlertsRef.current.gas;
  }, []);

  const triggerDemoSOS = useCallback(() => {
    demoAlertsRef.current.sos = !demoAlertsRef.current.sos;
  }, []);

  const signIn = useCallback(async (email: string, pass: string) => {
    await firebaseHelmetService.signIn(email, pass);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseHelmetService.logout();
  }, []);

  return {
    data,
    history,
    isOnline,
    lastSeenSeconds,
    pitchDeg,
    rollDeg,
    totalG,
    user,
    isLoading,
    error,
    isDemoMode,
    invertPitch,
    invertRoll,
    pitchOffset,
    rollOffset,
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
  };
}
