import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  query,
  limitToLast,
  type Database,
  type Unsubscribe,
} from 'firebase/database';
import type { HelmetSensorData, HelmetHistoryItem } from '../types';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
};

export const DEFAULT_HELMET_CREDENTIALS = {
  email: import.meta.env.VITE_FIREBASE_AUTH_EMAIL || '',
  password: import.meta.env.VITE_FIREBASE_AUTH_PASSWORD || '',
};

class FirebaseHelmetService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Database | null = null;
  private currentUser: User | null = null;
  private authListeners: Array<(user: User | null) => void> = [];
  private isAutoSigningIn = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!getApps().length) {
        this.app = initializeApp(DEFAULT_FIREBASE_CONFIG);
      } else {
        this.app = getApps()[0];
      }
      this.auth = getAuth(this.app);
      this.db = getDatabase(this.app);

      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        this.authListeners.forEach((cb) => cb(user));
      });

      // Automatically sign in on startup using saved or default credentials
      this.autoSignIn().catch((err) => {
        console.warn('Auto sign-in initial attempt notice:', err?.message || err);
      });
    } catch (err) {
      console.error('Failed to initialize Firebase for Smart Helmet:', err);
    }
  }

  public getAuthInstance(): Auth | null {
    return this.auth;
  }

  public getDatabaseInstance(): Database | null {
    return this.db;
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public onAuthChange(callback: (user: User | null) => void): () => void {
    this.authListeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.authListeners = this.authListeners.filter((cb) => cb !== callback);
    };
  }

  public async autoSignIn(): Promise<User | null> {
    if (!this.auth) return null;
    if (this.currentUser) return this.currentUser;
    if (this.isAutoSigningIn) return null;

    this.isAutoSigningIn = true;
    try {
      let email = DEFAULT_HELMET_CREDENTIALS.email;
      let pass = DEFAULT_HELMET_CREDENTIALS.password;

      try {
        const stored = localStorage.getItem('smart_helmet_creds');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.email && parsed.pass) {
            email = parsed.email;
            pass = parsed.pass;
          }
        }
      } catch (e) {
        // Fallback to default
      }

      const cred = await signInWithEmailAndPassword(this.auth, email.trim(), pass);
      this.currentUser = cred.user;
      return cred.user;
    } catch (err) {
      console.warn('Firebase autoSignIn could not complete automatically:', err);
      return null;
    } finally {
      this.isAutoSigningIn = false;
    }
  }

  public async signIn(email: string, pass: string): Promise<User> {
    if (!this.auth) throw new Error('Firebase Auth is not initialized');
    const cred = await signInWithEmailAndPassword(this.auth, email.trim(), pass);
    this.currentUser = cred.user;

    // Persist credentials for seamless reconnection
    try {
      localStorage.setItem('smart_helmet_creds', JSON.stringify({ email: email.trim(), pass }));
    } catch (e) {
      // Ignore storage errors
    }

    return cred.user;
  }

  public async logout(): Promise<void> {
    if (!this.auth) return;
    try {
      localStorage.removeItem('smart_helmet_creds');
    } catch (e) {
      // Ignore
    }
    await signOut(this.auth);
    this.currentUser = null;
  }

  public subscribeToLatest(
    onData: (data: HelmetSensorData) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!this.db) {
      onError?.(new Error('Firebase Database not initialized'));
      return () => {};
    }
    const latestRef = ref(this.db, '/sensors/latest');
    return onValue(
      latestRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val) {
          onData(val as HelmetSensorData);
        }
      },
      (err) => {
        console.warn('Firebase /sensors/latest read error:', err);
        onError?.(err);
      }
    );
  }

  public subscribeToHistory(
    limit: number = 40,
    onData: (items: HelmetHistoryItem[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!this.db) {
      onError?.(new Error('Firebase Database not initialized'));
      return () => {};
    }
    const historyQuery = query(ref(this.db, '/sensors/history'), limitToLast(limit));
    return onValue(
      historyQuery,
      (snapshot) => {
        const rows: HelmetHistoryItem[] = [];
        snapshot.forEach((child) => {
          const val = child.val();
          if (val) {
            const up = typeof val.uptime_s === 'number'
              ? val.uptime_s
              : typeof val.uptime_ms === 'number'
              ? val.uptime_ms / 1000
              : 0;
            rows.push({
              ...val,
              label: `${Math.round(up)}s`,
            });
          }
        });
        onData(rows);
      },
      (err) => {
        console.warn('Firebase /sensors/history read error:', err);
        onError?.(err);
      }
    );
  }
}

export const firebaseHelmetService = new FirebaseHelmetService();
