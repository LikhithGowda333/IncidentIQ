import sqlite3
import json
import uuid
import datetime
from pathlib import Path
from contextlib import contextmanager
from typing import Generator, Any, Dict, List, Optional
from app.core.config import settings

DB_FILE = Path(settings.DATABASE_PATH)

def get_connection() -> sqlite3.Connection:
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_FILE), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_login TEXT
        )
        """)
        
        # 2. Incidents table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            incident_id_code TEXT NOT NULL,
            description TEXT,
            start_time TEXT,
            end_time TEXT,
            severity TEXT NOT NULL DEFAULT 'high',
            affected_services TEXT NOT NULL DEFAULT '[]',
            environment TEXT NOT NULL DEFAULT 'production',
            symptoms TEXT,
            ticket_ref TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)
        
        # 3. Evidence Files table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS evidence_files (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            record_count INTEGER NOT NULL DEFAULT 0,
            detected_category TEXT NOT NULL,
            column_mappings TEXT NOT NULL DEFAULT '{}',
            file_path TEXT NOT NULL,
            upload_status TEXT NOT NULL DEFAULT 'parsed',
            warnings TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            FOREIGN KEY(incident_id) REFERENCES incidents(id) ON DELETE CASCADE
        )
        """)
        
        # 4. Evidence Records table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS evidence_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL,
            file_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            row_number INTEGER NOT NULL,
            timestamp TEXT,
            service TEXT,
            category TEXT NOT NULL,
            severity TEXT,
            message TEXT,
            metric_name TEXT,
            metric_value REAL,
            trace_id TEXT,
            span_id TEXT,
            parent_span_id TEXT,
            duration_ms REAL,
            raw_data TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY(incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
            FOREIGN KEY(file_id) REFERENCES evidence_files(id) ON DELETE CASCADE
        )
        """)
        
        # Indices for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_incident ON evidence_records(incident_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_service ON evidence_records(service)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_category ON evidence_records(category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_timestamp ON evidence_records(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_user ON incidents(user_id)")
        
        # 5. Analyses table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'completed',
            summary TEXT NOT NULL,
            ranked_hypotheses TEXT NOT NULL DEFAULT '[]',
            timeline_events TEXT NOT NULL DEFAULT '[]',
            service_dependencies TEXT NOT NULL DEFAULT '{}',
            metrics_summary TEXT NOT NULL DEFAULT '{}',
            limitations TEXT NOT NULL DEFAULT '[]',
            next_checks TEXT NOT NULL DEFAULT '[]',
            data_quality_warnings TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            FOREIGN KEY(incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_analyses_incident ON analyses(incident_id)")
        
        # Seed local demo user if not present
        cursor.execute("SELECT id FROM users WHERE email = 'demo@incidentiq.local'")
        if not cursor.fetchone():
            from app.auth.security import hash_password
            demo_id = str(uuid.uuid4())
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
            INSERT INTO users (id, email, password_hash, full_name, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (demo_id, "demo@incidentiq.local", hash_password("Demo1234!"), "Demo SRE Engineer", now))
            print("[INFO] Seeded demo account: demo@incidentiq.local / Demo1234!")
