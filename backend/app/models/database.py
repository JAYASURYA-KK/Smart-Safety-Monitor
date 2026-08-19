import sqlite3
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional

DB_FILE = Path(__file__).resolve().parent.parent.parent / "storage.db"

class DatabaseManager:
    """
    Local SQLite / JSON storage manager.
    Designed with abstract interfaces so Firebase/Firestore can be swapped in seamlessly later.
    """
    def __init__(self, db_path: str = str(DB_FILE)):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        return conn

    def _init_db(self):
        # Restrict file permissions on DB file for security (user read/write only)
        if os.path.exists(self.db_path) and hasattr(os, "chmod"):
            try:
                os.chmod(self.db_path, 0o600)
            except Exception:
                pass

        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Settings table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)
            # Alerts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    camera_id TEXT NOT NULL,
                    camera_name TEXT NOT NULL,
                    class_name TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    severity TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT NOT NULL
                )
            """)
            # Events table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    camera_id TEXT NOT NULL,
                    camera_name TEXT NOT NULL,
                    class_name TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    severity TEXT NOT NULL,
                    is_violation INTEGER NOT NULL,
                    status TEXT NOT NULL
                )
            """)
            conn.commit()

    # Settings Storage API
    def save_setting(self, key: str, value: Any):
        val_str = json.dumps(value) if not isinstance(value, str) else value
        with self._get_connection() as conn:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, val_str))
            conn.commit()

    def get_setting(self, key: str, default: Any = None) -> Any:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            if not row:
                return default
            try:
                return json.loads(row["value"])
            except Exception:
                return row["value"]

    # Alerts API
    def save_alert(self, alert_data: Dict[str, Any]):
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO alerts (id, camera_id, camera_name, class_name, confidence, severity, timestamp, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert_data["id"],
                alert_data["camera_id"],
                alert_data["camera_name"],
                alert_data["class_name"],
                alert_data["confidence"],
                alert_data["severity"],
                alert_data["timestamp"],
                alert_data["status"],
            ))
            conn.commit()

    def get_alerts(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if status_filter:
                cursor.execute("SELECT * FROM alerts WHERE status = ? ORDER BY timestamp DESC LIMIT 100", (status_filter,))
            else:
                cursor.execute("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 100")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def update_alert_status(self, alert_id: str, new_status: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE alerts SET status = ? WHERE id = ?", (new_status, alert_id))
            conn.commit()
            return cursor.rowcount > 0

    # Events API
    def save_event(self, event_data: Dict[str, Any]):
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO events (id, timestamp, camera_id, camera_name, class_name, confidence, severity, is_violation, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_data["id"],
                event_data["timestamp"],
                event_data["camera_id"],
                event_data["camera_name"],
                event_data["class_name"],
                event_data["confidence"],
                event_data["severity"],
                1 if event_data.get("is_violation") else 0,
                event_data.get("status", "RECORDED"),
            ))
            conn.commit()

    def get_events(self, search: Optional[str] = None, camera_id: Optional[str] = None, class_name: Optional[str] = None, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM events WHERE 1=1"
        params = []
        if search:
            query += " AND (class_name LIKE ? OR id LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        if camera_id:
            query += " AND camera_id = ?"
            params.append(camera_id)
        if class_name:
            query += " AND class_name = ?"
            params.append(class_name)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        query += " ORDER BY timestamp DESC LIMIT 200"

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["is_violation"] = bool(d["is_violation"])
                result.append(d)
            return result

    def prune_records(self, max_alerts: int = 2000, max_events: int = 5000):
        """
        Automatic storage retention policy.
        Prunes old records beyond maximum caps to prevent infinite SQLite disk bloat.
        """
        try:
            with self._get_connection() as conn:
                # Prune old alerts
                conn.execute("""
                    DELETE FROM alerts WHERE id NOT IN (
                        SELECT id FROM alerts ORDER BY timestamp DESC LIMIT ?
                    )
                """, (max_alerts,))
                # Prune old events
                conn.execute("""
                    DELETE FROM events WHERE id NOT IN (
                        SELECT id FROM events ORDER BY timestamp DESC LIMIT ?
                    )
                """, (max_events,))
                conn.commit()
        except Exception as e:
            print(f"[DB Retention Prune Error]: {e}")

db = DatabaseManager()
