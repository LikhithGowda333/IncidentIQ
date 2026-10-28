import io
import zipfile
import pytest
from app.analysis.normalizer import (
    parse_csv_content, parse_json_content, parse_log_text_content,
    extract_zip_safely, detect_category, detect_column_mappings,
    sanitize_filename, parse_iso_timestamp
)

def test_sanitize_filename():
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("safe_log-2026.10.csv") == "safe_log-2026.10.csv"

def test_parse_iso_timestamp():
    # ISO string
    assert parse_iso_timestamp("2026-10-28T10:00:00Z") is not None
    # Unix epoch seconds
    assert parse_iso_timestamp(1730109600) is not None
    # Date format
    assert parse_iso_timestamp("2026-10-28 10:00:00") is not None
    # Invalid / empty
    assert parse_iso_timestamp("invalid-date") is None
    assert parse_iso_timestamp(None) is None

def test_parse_csv_content_and_provenance():
    csv_bytes = (
        "timestamp,service,level,message,trace_id\n"
        "2026-10-28T10:00:00Z,checkout,INFO,Started transaction,tr-01\n"
        "2026-10-28T10:00:05Z,checkout,ERROR,Failed transaction,tr-02\n"
    ).encode("utf-8")
    records, cols, rejections = parse_csv_content(csv_bytes, "checkout.csv")
    assert len(records) == 2
    assert records[0]["__row_number"] == 2  # Row 1 is header
    assert records[1]["__row_number"] == 3
    assert "timestamp" in cols
    assert "message" in cols
    assert len(rejections) == 0

def test_parse_json_and_jsonl_content():
    json_bytes = b'[{"service": "auth", "metric_name": "cpu", "value": 92.5}]'
    records, cols, rejections = parse_json_content(json_bytes, "metrics.json")
    assert len(records) == 1
    assert records[0]["service"] == "auth"
    assert records[0]["__row_number"] == 1
    
    # JSONL test
    jsonl_bytes = b'{"timestamp": "2026-10-28T10:00:00Z", "level": "INFO"}\n{"timestamp": "2026-10-28T10:01:00Z", "level": "ERROR"}'
    records_l, cols_l, rejections_l = parse_json_content(jsonl_bytes, "app.jsonl")
    assert len(records_l) == 2
    assert records_l[1]["level"] == "ERROR"

def test_parse_log_text_content():
    log_bytes = (
        "[2026-10-28T10:00:00Z] [ERROR] [payment-gateway] Connection refused by peer\n"
        "[2026-10-28T10:00:05Z] [INFO] [payment-gateway] Retrying connection\n"
    ).encode("utf-8")
    records, cols, rejections = parse_log_text_content(log_bytes, "payment.log")
    assert len(records) == 2
    assert records[0]["level"] == "ERROR"
    assert records[0]["service"] == "payment-gateway"

def test_zip_archive_safety():
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("safe_logs.csv", "timestamp,service,level,message\n2026-10-28T10:00:00Z,api,INFO,ok\n")
        # Attempt malicious path inside zip
        z.writestr("../../etc/cron.d/malicious.sh", "echo evil")
    
    extracted, warnings = extract_zip_safely(zip_buf.getvalue())
    assert len(extracted) == 1
    assert extracted[0][0] == "safe_logs.csv"
    assert any("Blocked" in w or "Skipped" in w for w in warnings)

def test_category_and_mapping_detection():
    cat_dep = detect_category("service_dependencies.json", ["source", "target"], [])
    assert cat_dep == "dependencies"
    
    cat_logs = detect_category("server.log", ["timestamp", "level", "message"], [])
    assert cat_logs == "logs"
    
    cat_metrics = detect_category("system_stats.csv", ["timestamp", "metric_name", "value"], [])
    assert cat_metrics == "metrics"
    
    mappings = detect_column_mappings(["@timestamp", "app", "msg", "log_level"])
    assert mappings["timestamp"] == "@timestamp"
    assert mappings["service"] == "app"
    assert mappings["message"] == "msg"
    assert mappings["severity"] == "log_level"

def test_upload_evidence_endpoint():
    from app.db.database import init_db, get_db
    from app.api.incidents import create_incident, upload_evidence, get_validation_summary
    from app.schemas.schemas import IncidentCreate
    from fastapi import UploadFile
    import uuid
    import datetime

    init_db()
    uid = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute("INSERT OR REPLACE INTO users (id, email, password_hash, full_name, created_at) VALUES (?, ?, ?, ?, ?)",
                     (uid, f"u_{uid[:6]}@test.local", "hash", "Test User", now))
    user = {"id": uid, "email": f"u_{uid[:6]}@test.local", "full_name": "Test User"}

    inc = create_incident(IncidentCreate(title="Test Upload Inc", severity="high"), current_user=user)

    csv_bytes = b"timestamp,service,level,message\n2026-10-28T14:15:00Z,checkout,INFO,test log\n"
    up_csv = UploadFile(filename="test_logs.csv", file=io.BytesIO(csv_bytes))

    summaries = upload_evidence(inc.id, files=[up_csv], current_user=user)
    assert len(summaries) == 1
    assert summaries[0].file_name == "test_logs.csv"
    assert summaries[0].detected_category == "logs"
    assert len(summaries[0].preview_rows) == 1

    val = get_validation_summary(inc.id, current_user=user)
    assert val.total_files == 1
    assert val.total_records == 1
    assert val.can_analyze is True

