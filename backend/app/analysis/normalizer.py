import io
import os
import json
import csv
import zipfile
import re
import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from app.core.config import settings

TIMESTAMP_ALIASES = ["timestamp", "@timestamp", "time", "date", "datetime", "ts", "start_time", "logged_at", "created_at"]
SERVICE_ALIASES = ["service", "service_name", "app", "application", "microservice", "component", "target_service"]
LEVEL_ALIASES = ["level", "severity", "log_level", "type", "status_level"]
MESSAGE_ALIASES = ["message", "msg", "log", "error", "description", "details", "text"]
METRIC_NAME_ALIASES = ["metric_name", "metric", "name", "measurement", "metric_id"]
METRIC_VALUE_ALIASES = ["value", "val", "count", "measurement_value", "metric_value"]
TRACE_ID_ALIASES = ["trace_id", "traceid", "trace", "request_id", "req_id", "correlation_id"]
SPAN_ID_ALIASES = ["span_id", "spanid", "span"]
PARENT_SPAN_ID_ALIASES = ["parent_span_id", "parent_span", "parent_id"]
DURATION_ALIASES = ["duration_ms", "duration", "latency_ms", "latency", "elapsed_ms", "response_time"]
OPERATION_ALIASES = ["operation", "operation_name", "action", "endpoint", "method", "span_name"]
VERSION_ALIASES = ["version", "release", "commit", "build"]
CHANGE_TYPE_ALIASES = ["change_type", "type", "action", "event_type"]

def sanitize_filename(filename: str) -> str:
    """Sanitize uploaded filename to avoid path traversal and invalid characters."""
    clean_name = os.path.basename(filename)
    clean_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', clean_name)
    if not clean_name:
        clean_name = "uploaded_file"
    return clean_name

def parse_iso_timestamp(val: Any) -> Optional[str]:
    """Parse various timestamp representations into a standardized UTC ISO string."""
    if val is None or val == "" or str(val).lower() == "none" or str(val).lower() == "unknown":
        return None
    
    val_str = str(val).strip()
    
    # Try numeric unix epoch (seconds or milliseconds)
    try:
        if val_str.replace(".", "", 1).isdigit():
            epoch_num = float(val_str)
            if epoch_num > 1e11: # milliseconds
                dt = datetime.datetime.fromtimestamp(epoch_num / 1000.0, tz=datetime.timezone.utc)
            else:
                dt = datetime.datetime.fromtimestamp(epoch_num, tz=datetime.timezone.utc)
            return dt.isoformat()
    except Exception:
        pass
    
    # Try standard ISO strings
    for fmt in (
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.datetime.strptime(val_str.replace("Z", "+0000"), fmt.replace("Z", "%z"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=datetime.timezone.utc)
            return dt.isoformat()
        except Exception:
            continue
            
    # Python 3.11+ fromisoformat fallback
    try:
        clean_iso = val_str.replace("Z", "+00:00")
        dt = datetime.datetime.fromisoformat(clean_iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.isoformat()
    except Exception:
        return None

def detect_column_mappings(columns: List[str]) -> Dict[str, str]:
    """Map source columns to normalized schema attributes."""
    mapping = {}
    col_lower = {c.lower(): c for c in columns}
    
    def match_alias(aliases: List[str], target: str):
        for alias in aliases:
            if alias.lower() in col_lower:
                mapping[target] = col_lower[alias.lower()]
                return
    
    match_alias(TIMESTAMP_ALIASES, "timestamp")
    match_alias(SERVICE_ALIASES, "service")
    match_alias(LEVEL_ALIASES, "severity")
    match_alias(MESSAGE_ALIASES, "message")
    match_alias(METRIC_NAME_ALIASES, "metric_name")
    match_alias(METRIC_VALUE_ALIASES, "metric_value")
    match_alias(TRACE_ID_ALIASES, "trace_id")
    match_alias(SPAN_ID_ALIASES, "span_id")
    match_alias(PARENT_SPAN_ID_ALIASES, "parent_span_id")
    match_alias(DURATION_ALIASES, "duration_ms")
    match_alias(OPERATION_ALIASES, "operation")
    match_alias(VERSION_ALIASES, "version")
    match_alias(CHANGE_TYPE_ALIASES, "change_type")
    
    return mapping

def detect_category(file_name: str, columns: List[str], sample_data: List[Dict[str, Any]]) -> str:
    """Classify file into logs, metrics, traces, deployments, or dependencies."""
    name_lower = file_name.lower()
    cols_set = {c.lower() for c in columns}
    
    # 1. Dependency graph check
    if any(k in name_lower for k in ["depend", "topology", "service_map", "graph"]):
        return "dependencies"
    if "dependencies" in cols_set or ("source" in cols_set and "target" in cols_set):
        return "dependencies"
    
    # 2. Deployment / config check
    if any(k in name_lower for k in ["deploy", "release", "config", "change", "migration"]):
        return "deployments"
    if "change_type" in cols_set or "version" in cols_set or "actor" in cols_set:
        return "deployments"
        
    # 3. Traces check
    if any(k in name_lower for k in ["trace", "span", "telemetry"]):
        return "traces"
    if "trace_id" in cols_set or "span_id" in cols_set:
        return "traces"
        
    # 4. Metrics check
    if any(k in name_lower for k in ["metric", "cpu", "memory", "latency", "rps", "stat"]):
        return "metrics"
    if "metric_name" in cols_set or "metric" in cols_set or "unit" in cols_set:
        return "metrics"
        
    # 5. Logs check
    if any(k in name_lower for k in ["log", "error", "event"]):
        return "logs"
    if "message" in cols_set or "msg" in cols_set or "level" in cols_set or "severity" in cols_set:
        return "logs"
        
    # Fallback inspection of fields
    for row in sample_data[:3]:
        for k in row.keys():
            if k.lower() in ["trace_id", "span_id"]:
                return "traces"
            if k.lower() in ["metric_name", "metric"]:
                return "metrics"
            if k.lower() in ["message", "msg", "level"]:
                return "logs"
                
    return "logs" # default observability record

def parse_csv_content(content_bytes: bytes, file_name: str) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    """Parse CSV text with robust delimiter detection and error tracking."""
    text = content_bytes.decode("utf-8", errors="replace")
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return [], [], ["File is completely empty."]
    
    sample = "\n".join(lines[:10])
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except Exception:
        dialect = csv.excel
        
    reader = csv.DictReader(lines, dialect=dialect)
    columns = reader.fieldnames or []
    records = []
    rejections = []
    
    for row_idx, row in enumerate(reader, start=2): # 1 is header
        if row_idx - 1 > settings.MAX_RECORDS_PER_FILE:
            rejections.append(f"Row {row_idx}: Exceeded maximum record limit ({settings.MAX_RECORDS_PER_FILE}).")
            break
        # Clean row keys and values
        clean_row = {str(k).strip(): str(v).strip() for k, v in row.items() if k is not None}
        if any(clean_row.values()): # not all empty
            clean_row["__row_number"] = row_idx
            records.append(clean_row)
            
    return records, columns, rejections

def parse_json_content(content_bytes: bytes, file_name: str) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    """Parse JSON or JSON-Lines content safely."""
    text = content_bytes.decode("utf-8", errors="replace").strip()
    if not text:
        return [], [], ["File is completely empty."]
        
    rejections = []
    records = []
    columns = set()
    
    # Try parsing as standard JSON first
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            for idx, item in enumerate(parsed, start=1):
                if idx > settings.MAX_RECORDS_PER_FILE:
                    rejections.append(f"Record {idx}: Exceeded maximum record limit ({settings.MAX_RECORDS_PER_FILE}).")
                    break
                if isinstance(item, dict):
                    item["__row_number"] = idx
                    records.append(item)
                    columns.update(item.keys())
        elif isinstance(parsed, dict):
            # Check for service dependency graph or nested records
            if "dependencies" in parsed and "services" in parsed:
                # Service dependency graph JSON
                parsed["__row_number"] = 1
                records.append(parsed)
                columns.update(["services", "dependencies"])
            elif "records" in parsed and isinstance(parsed["records"], list):
                for idx, item in enumerate(parsed["records"], start=1):
                    if isinstance(item, dict):
                        item["__row_number"] = idx
                        records.append(item)
                        columns.update(item.keys())
            elif "items" in parsed and isinstance(parsed["items"], list):
                for idx, item in enumerate(parsed["items"], start=1):
                    if isinstance(item, dict):
                        item["__row_number"] = idx
                        records.append(item)
                        columns.update(item.keys())
            else:
                parsed["__row_number"] = 1
                records.append(parsed)
                columns.update(parsed.keys())
        return records, list(columns - {"__row_number"}), rejections
    except Exception:
        pass
        
    # Try parsing line-by-line (JSONL / NDJSON)
    lines = [l for l in text.splitlines() if l.strip()]
    for idx, line in enumerate(lines, start=1):
        if idx > settings.MAX_RECORDS_PER_FILE:
            rejections.append(f"Line {idx}: Exceeded maximum record limit ({settings.MAX_RECORDS_PER_FILE}).")
            break
        try:
            item = json.loads(line)
            if isinstance(item, dict):
                item["__row_number"] = idx
                records.append(item)
                columns.update(item.keys())
        except Exception as e:
            rejections.append(f"Line {idx}: Invalid JSON syntax ({str(e)}).")
            
    return records, list(columns - {"__row_number"}), rejections

def parse_log_text_content(content_bytes: bytes, file_name: str) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    """Parse raw .log text using common regex formats (timestamp, level, service, message)."""
    text = content_bytes.decode("utf-8", errors="replace")
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return [], [], ["File is completely empty."]
        
    records = []
    rejections = []
    
    # Common log regex: [TIMESTAMP] [LEVEL] [SERVICE] MESSAGE
    pattern1 = re.compile(r'^\[(?P<timestamp>[^\]]+)\]\s+\[(?P<level>[^\]]+)\]\s+(?:\[(?P<service>[^\]]+)\]\s+)?(?P<message>.*)$')
    # Common log regex: TIMESTAMP LEVEL SERVICE: MESSAGE
    pattern2 = re.compile(r'^(?P<timestamp>\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(?P<level>[A-Z]+)\s+(?:(?P<service>[\w\-]+):\s+)?(?P<message>.*)$')
    
    for idx, line in enumerate(lines, start=1):
        if idx > settings.MAX_RECORDS_PER_FILE:
            rejections.append(f"Line {idx}: Exceeded maximum record limit.")
            break
        m = pattern1.match(line) or pattern2.match(line)
        if m:
            d = m.groupdict()
            d["__row_number"] = idx
            records.append(d)
        else:
            # Fallback simple record
            records.append({
                "timestamp": None,
                "level": "INFO",
                "message": line,
                "__row_number": idx
            })
            
    return records, ["timestamp", "level", "service", "message"], rejections

def extract_zip_safely(zip_bytes: bytes) -> Tuple[List[Tuple[str, bytes]], List[str]]:
    """
    Safely extract files from a ZIP archive:
    - Protect against ZIP bombs (max decompressed size, max files, high compression ratio)
    - Protect against path traversal (reject ../ or absolute paths)
    - Ignore non-supported file extensions
    """
    extracted_files = []
    warnings = []
    
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            total_uncompressed = 0
            file_count = 0
            
            for info in z.infolist():
                if info.is_dir():
                    continue
                file_count += 1
                if file_count > 25:
                    warnings.append("ZIP archive contains more than 25 files; only the first 25 were processed.")
                    break
                    
                # Path traversal check
                clean_name = os.path.basename(info.filename)
                if ".." in info.filename or info.filename.startswith(("/", "\\")):
                    warnings.append(f"Blocked insecure path in ZIP: {info.filename}")
                    continue
                    
                # ZIP bomb checks
                total_uncompressed += info.file_size
                if total_uncompressed > 100 * 1024 * 1024: # 100 MB max
                    warnings.append("ZIP decompression exceeded safety limit (100MB). Remaining files skipped.")
                    break
                    
                if info.compress_size > 0 and (info.file_size / info.compress_size > 100):
                    warnings.append(f"Suspicious compression ratio on {clean_name}. Skipped.")
                    continue
                    
                ext = Path(clean_name).suffix.lower()
                if ext in settings.ALLOWED_EXTENSIONS and ext != ".zip":
                    data = z.read(info.filename)
                    extracted_files.append((clean_name, data))
                else:
                    warnings.append(f"Skipped unsupported file type in ZIP: {clean_name}")
                    
    except Exception as e:
        warnings.append(f"Failed to read ZIP archive: {str(e)}")
        
    return extracted_files, warnings
