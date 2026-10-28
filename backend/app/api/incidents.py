import io
import os
import csv
import json
import uuid
import datetime
import random
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query, Response
from app.db.database import get_db
from app.auth.security import get_current_user
from app.core.config import settings
from app.schemas.schemas import (
    IncidentCreate, IncidentUpdate, IncidentResponse,
    EvidenceFileSummary, ColumnMappingOverride,
    ValidationSummaryResponse, AnalysisResultResponse,
    TimelineEventResponse, ServiceMapResponse
)
from app.analysis.normalizer import (
    sanitize_filename, parse_iso_timestamp, detect_column_mappings,
    detect_category, parse_csv_content, parse_json_content,
    parse_log_text_content, extract_zip_safely
)
from app.analysis.engine import analyze_incident_evidence

router = APIRouter(prefix="/api/incidents", tags=["Incidents & Investigations"])

def verify_incident_ownership(cursor, incident_id: str, user_id: str) -> dict:
    cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
    incident = cursor.fetchone()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    if incident["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You do not own this incident.")
    return dict(incident)

@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    service: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT i.*, 
               (SELECT COUNT(*) FROM evidence_files WHERE incident_id = i.id) as files_count,
               (SELECT COUNT(*) FROM evidence_records WHERE incident_id = i.id) as records_count,
               (SELECT COUNT(*) FROM analyses WHERE incident_id = i.id) as analyses_count
        FROM incidents i
        WHERE i.user_id = ?
        """
        params = [current_user["id"]]
        
        if severity:
            query += " AND i.severity = ?"
            params.append(severity)
        if status_filter:
            query += " AND i.status = ?"
            params.append(status_filter)
        if search:
            query += " AND (i.title LIKE ? OR i.incident_id_code LIKE ? OR i.description LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term])
            
        query += " ORDER BY i.created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            d = dict(r)
            try:
                aff = json.loads(d["affected_services"]) if d["affected_services"] else []
            except Exception:
                aff = []
            if service and service not in aff:
                continue
            d["affected_services"] = aff
            d["has_analysis"] = d.get("analyses_count", 0) > 0
            results.append(IncidentResponse(**d))
        return results

@router.post("", response_model=IncidentResponse)
def create_incident(inc_in: IncidentCreate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        inc_id = str(uuid.uuid4())
        inc_code = inc_in.incident_id_code
        if not inc_code:
            rand_code = random.randint(1000, 9999)
            inc_code = f"INC-{rand_code}"
            
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        aff_json = json.dumps(inc_in.affected_services)
        
        cursor.execute("""
        INSERT INTO incidents (
            id, user_id, title, incident_id_code, description,
            start_time, end_time, severity, affected_services,
            environment, symptoms, ticket_ref, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
        """, (
            inc_id, current_user["id"], inc_in.title, inc_code,
            inc_in.description, inc_in.start_time, inc_in.end_time,
            inc_in.severity, aff_json, inc_in.environment,
            inc_in.symptoms, inc_in.ticket_ref, now, now
        ))
        
        return IncidentResponse(
            id=inc_id,
            user_id=current_user["id"],
            title=inc_in.title,
            incident_id_code=inc_code,
            description=inc_in.description,
            start_time=inc_in.start_time,
            end_time=inc_in.end_time,
            severity=inc_in.severity,
            affected_services=inc_in.affected_services,
            environment=inc_in.environment,
            symptoms=inc_in.symptoms,
            ticket_ref=inc_in.ticket_ref,
            status="open",
            created_at=now,
            updated_at=now,
            files_count=0,
            records_count=0,
            has_analysis=False
        )

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        inc = verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        cursor.execute("SELECT COUNT(*) FROM evidence_files WHERE incident_id = ?", (incident_id,))
        files_cnt = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM evidence_records WHERE incident_id = ?", (incident_id,))
        rec_cnt = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM analyses WHERE incident_id = ?", (incident_id,))
        an_cnt = cursor.fetchone()[0]
        
        try:
            aff = json.loads(inc["affected_services"]) if inc["affected_services"] else []
        except Exception:
            aff = []
            
        inc["affected_services"] = aff
        inc["files_count"] = files_cnt
        inc["records_count"] = rec_cnt
        inc["has_analysis"] = an_cnt > 0
        return IncidentResponse(**inc)

@router.put("/{incident_id}", response_model=IncidentResponse)
def update_incident(incident_id: str, inc_update: IncidentUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        inc = verify_incident_ownership(cursor, incident_id, current_user["id"])
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        fields = []
        params = []
        for k, v in inc_update.model_dump(exclude_unset=True).items():
            if k == "affected_services" and v is not None:
                fields.append("affected_services = ?")
                params.append(json.dumps(v))
            elif v is not None:
                fields.append(f"{k} = ?")
                params.append(v)
                
        if fields:
            fields.append("updated_at = ?")
            params.append(now)
            params.append(incident_id)
            cursor.execute(f"UPDATE incidents SET {', '.join(fields)} WHERE id = ?", params)
            conn.commit()
            
    return get_incident(incident_id, current_user)

@router.delete("/{incident_id}")
def delete_incident(incident_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        verify_incident_ownership(cursor, incident_id, current_user["id"])
        cursor.execute("DELETE FROM incidents WHERE id = ?", (incident_id,))
        return {"message": "Incident deleted successfully."}

@router.post("/{incident_id}/uploads", response_model=List[EvidenceFileSummary])
def upload_evidence(
    incident_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    # 1. Read all file contents into memory first before acquiring DB lock
    uploaded_files_data = []
    for f in files:
        raw_name = f.filename or "uploaded_file"
        content = f.file.read()
        uploaded_files_data.append((raw_name, content))

    with get_db() as conn:
        cursor = conn.cursor()
        verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        uploaded_summaries = []
        
        # Helper to process single file buffer
        def process_raw_file(raw_name: str, content: bytes):
            clean_name = sanitize_filename(raw_name)
            file_ext = Path(clean_name).suffix.lower()
            
            if file_ext not in settings.ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported file format: {clean_name}. Accepted formats: .csv, .json, .jsonl, .log, .zip"
                )
                
            if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {clean_name} exceeds maximum file size limit (50MB)."
                )
                
            # Parse based on extension
            if file_ext == ".csv":
                records, cols, rejections = parse_csv_content(content, clean_name)
            elif file_ext in [".json", ".jsonl"]:
                records, cols, rejections = parse_json_content(content, clean_name)
            elif file_ext == ".log":
                records, cols, rejections = parse_log_text_content(content, clean_name)
            else:
                records, cols, rejections = [], [], [f"Unsupported parser for {file_ext}"]
                
            cat = detect_category(clean_name, cols, records[:5])
            mappings = detect_column_mappings(cols)
            
            file_id = str(uuid.uuid4())
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            cursor.execute("""
            INSERT INTO evidence_files (
                id, incident_id, file_name, file_type, file_size,
                record_count, detected_category, column_mappings,
                file_path, upload_status, warnings, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'parsed', ?, ?)
            """, (
                file_id, incident_id, clean_name, file_ext, len(content),
                len(records), cat, json.dumps(mappings),
                clean_name, json.dumps(rejections), now_iso
            ))
            
            # Insert individual records with full provenance
            records_to_insert = []
            for r in records:
                row_num = r.get("__row_number", 0)
                # Map fields
                ts_col = mappings.get("timestamp")
                ts_val = parse_iso_timestamp(r.get(ts_col) if ts_col else r.get("timestamp"))
                
                svc_col = mappings.get("service")
                svc_val = str(r.get(svc_col) or r.get("service") or "") if (svc_col or "service" in r) else None
                
                msg_col = mappings.get("message")
                msg_val = str(r.get(msg_col) or r.get("message") or "") if (msg_col or "message" in r) else None
                
                sev_col = mappings.get("severity")
                sev_val = str(r.get(sev_col) or r.get("severity") or r.get("level") or "") if (sev_col or "severity" in r or "level" in r) else None
                
                mname_col = mappings.get("metric_name")
                mname_val = str(r.get(mname_col) or r.get("metric_name") or "") if (mname_col or "metric_name" in r) else None
                
                mval_col = mappings.get("metric_value")
                mval_raw = r.get(mval_col) if mval_col else r.get("value")
                try:
                    mval_num = float(mval_raw) if mval_raw is not None and mval_raw != "" else None
                except (ValueError, TypeError):
                    mval_num = None
                    
                tr_col = mappings.get("trace_id")
                tr_val = str(r.get(tr_col) or r.get("trace_id") or "") if (tr_col or "trace_id" in r) else None
                
                sp_col = mappings.get("span_id")
                sp_val = str(r.get(sp_col) or r.get("span_id") or "") if (sp_col or "span_id" in r) else None
                
                dur_col = mappings.get("duration_ms")
                dur_raw = r.get(dur_col) if dur_col else r.get("duration_ms")
                try:
                    dur_num = float(dur_raw) if dur_raw is not None and dur_raw != "" else None
                except (ValueError, TypeError):
                    dur_num = None
                    
                clean_raw = {k: v for k, v in r.items() if not k.startswith("__")}
                
                records_to_insert.append((
                    incident_id, file_id, clean_name, row_num, ts_val,
                    svc_val, cat, sev_val, msg_val, mname_val, mval_num,
                    tr_val, sp_val, None, dur_num, json.dumps(clean_raw), now_iso
                ))
                
            if records_to_insert:
                cursor.executemany("""
                INSERT INTO evidence_records (
                    incident_id, file_id, file_name, row_number, timestamp,
                    service, category, severity, message, metric_name,
                    metric_value, trace_id, span_id, parent_span_id, duration_ms,
                    raw_data, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, records_to_insert)
                
            preview_clean = [{k: v for k, v in row.items() if not k.startswith("__")} for row in records[:6]]
            
            uploaded_summaries.append(EvidenceFileSummary(
                id=file_id,
                incident_id=incident_id,
                file_name=clean_name,
                file_type=file_ext,
                file_size=len(content),
                record_count=len(records),
                detected_category=cat,
                column_mappings=mappings,
                preview_rows=preview_clean,
                upload_status="parsed",
                warnings=rejections,
                created_at=now_iso
            ))

        for raw_name, content in uploaded_files_data:
            clean_name = sanitize_filename(raw_name)
            file_ext = Path(clean_name).suffix.lower()
            
            if file_ext == ".zip":
                extracted_list, zip_warnings = extract_zip_safely(content)
                if not extracted_list:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No valid evidence files (.csv, .json, .log) found in uploaded ZIP archive."
                    )
                for item_name, item_content in extracted_list:
                    process_raw_file(item_name, item_content)
            else:
                process_raw_file(clean_name, content)
                
        # Update incident status
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cursor.execute("UPDATE incidents SET status = 'investigating', updated_at = ? WHERE id = ?", (now_iso, incident_id))
        
        return uploaded_summaries

@router.get("/{incident_id}/evidence", response_model=List[EvidenceFileSummary])
def list_evidence_files(incident_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        cursor.execute("SELECT * FROM evidence_files WHERE incident_id = ? ORDER BY created_at ASC", (incident_id,))
        files = cursor.fetchall()
        
        results = []
        for f in files:
            d = dict(f)
            # Fetch preview records
            cursor.execute("SELECT raw_data FROM evidence_records WHERE file_id = ? LIMIT 5", (d["id"],))
            raw_rows = [json.loads(r[0]) for r in cursor.fetchall()]
            
            results.append(EvidenceFileSummary(
                id=d["id"],
                incident_id=d["incident_id"],
                file_name=d["file_name"],
                file_type=d["file_type"],
                file_size=d["file_size"],
                record_count=d["record_count"],
                detected_category=d["detected_category"],
                column_mappings=json.loads(d["column_mappings"]) if d["column_mappings"] else {},
                preview_rows=raw_rows,
                upload_status=d["upload_status"],
                warnings=json.loads(d["warnings"]) if d["warnings"] else [],
                created_at=d["created_at"]
            ))
        return results

@router.get("/{incident_id}/validation", response_model=ValidationSummaryResponse)
def get_validation_summary(incident_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        cursor.execute("SELECT COUNT(*) FROM evidence_files WHERE incident_id = ?", (incident_id,))
        file_cnt = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM evidence_records WHERE incident_id = ?", (incident_id,))
        record_cnt = cursor.fetchone()[0]
        
        cursor.execute("SELECT DISTINCT service FROM evidence_records WHERE incident_id = ? AND service IS NOT NULL AND service != ''", (incident_id,))
        services = [r[0] for r in cursor.fetchall()]
        
        cursor.execute("SELECT DISTINCT detected_category FROM evidence_files WHERE incident_id = ?", (incident_id,))
        categories = [r[0] for r in cursor.fetchall()]
        
        all_possible_categories = ["logs", "metrics", "traces", "deployments", "dependencies"]
        missing = [c for c in all_possible_categories if c not in categories]
        
        cursor.execute("SELECT MIN(timestamp), MAX(timestamp) FROM evidence_records WHERE incident_id = ? AND timestamp IS NOT NULL", (incident_id,))
        t_min, t_max = cursor.fetchone()
        
        cursor.execute("SELECT warnings FROM evidence_files WHERE incident_id = ?", (incident_id,))
        all_warnings = []
        for r in cursor.fetchall():
            if r[0]:
                try:
                    all_warnings.extend(json.loads(r[0]))
                except Exception:
                    pass
                    
        can_analyze = record_cnt > 0
        limitations = None
        if "traces" in missing and "metrics" in missing:
            limitations = "Investigation will rely primarily on application logs. Downstream RPC tracing and resource saturation analysis will be limited."
        elif missing:
            limitations = f"Missing evidence categories: {', '.join(missing)}. Analysis can proceed with partial evidence, but confidence will reflect data gaps."
            
        return ValidationSummaryResponse(
            total_files=file_cnt,
            total_records=record_cnt,
            total_rejected=len(all_warnings),
            rejection_reasons=all_warnings[:10],
            time_coverage={"earliest": t_min, "latest": t_max},
            services_discovered=services,
            categories_detected=categories,
            missing_categories=missing,
            warnings=all_warnings,
            can_analyze=can_analyze,
            limitation_notice=limitations
        )

@router.post("/{incident_id}/analyze", response_model=AnalysisResultResponse)
def trigger_analysis(incident_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        inc = verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        cursor.execute("SELECT * FROM evidence_records WHERE incident_id = ?", (incident_id,))
        raw_records = cursor.fetchall()
        
        if not raw_records:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot analyze incident without evidence. Please upload logs, metrics, or traces first."
            )
            
        records = []
        for r in raw_records:
            d = dict(r)
            try:
                d["raw_data"] = json.loads(d["raw_data"]) if d["raw_data"] else {}
            except Exception:
                d["raw_data"] = {}
            records.append(d)
            
        # Run transparent analysis pipeline
        result = analyze_incident_evidence(inc, records)
        
        analysis_id = str(uuid.uuid4())
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Save analysis run
        cursor.execute("""
        INSERT INTO analyses (
            id, incident_id, user_id, status, summary,
            ranked_hypotheses, timeline_events, service_dependencies,
            metrics_summary, limitations, next_checks, data_quality_warnings, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            analysis_id, incident_id, current_user["id"], result["status"],
            result["summary"], json.dumps(result["ranked_hypotheses"]),
            json.dumps(result["timeline_events"]), json.dumps(result["service_dependencies"]),
            json.dumps(result["metrics_summary"]), json.dumps(result["limitations"]),
            json.dumps(result["next_checks"]), json.dumps(result["data_quality_warnings"]),
            now_iso
        ))
        
        # Update incident status
        cursor.execute("UPDATE incidents SET status = 'analyzed', updated_at = ? WHERE id = ?", (now_iso, incident_id))
        
        result["id"] = analysis_id
        result["incident_id"] = incident_id
        result["created_at"] = now_iso
        return AnalysisResultResponse(**result)

@router.get("/{incident_id}/analysis", response_model=AnalysisResultResponse)
def get_analysis_result(incident_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        cursor.execute("SELECT * FROM analyses WHERE incident_id = ? ORDER BY created_at DESC LIMIT 1", (incident_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No analysis results found for this incident. Please trigger an analysis first."
            )
            
        d = dict(row)
        return AnalysisResultResponse(
            id=d["id"],
            incident_id=d["incident_id"],
            status=d["status"],
            summary=d["summary"],
            is_abstention="insufficient" in d["summary"].lower() or "abstention" in d["summary"].lower(),
            ranked_hypotheses=json.loads(d["ranked_hypotheses"]),
            timeline_events=json.loads(d["timeline_events"]),
            service_dependencies=json.loads(d["service_dependencies"]),
            metrics_summary=json.loads(d["metrics_summary"]),
            limitations=json.loads(d["limitations"]),
            next_checks=json.loads(d["next_checks"]),
            data_quality_warnings=json.loads(d["data_quality_warnings"]),
            created_at=d["created_at"]
        )

@router.get("/{incident_id}/timeline", response_model=List[TimelineEventResponse])
def get_incident_timeline(incident_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        cursor.execute("SELECT timeline_events FROM analyses WHERE incident_id = ? ORDER BY created_at DESC LIMIT 1", (incident_id,))
        row = cursor.fetchone()
        if not row:
            # Fallback to building directly from records
            cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
            inc = dict(cursor.fetchone())
            cursor.execute("SELECT * FROM evidence_records WHERE incident_id = ?", (incident_id,))
            recs = [dict(r) for r in cursor.fetchall()]
            from app.analysis.correlator import build_timeline_events
            return [TimelineEventResponse(**e) for e in build_timeline_events(recs, inc.get("start_time"))]
            
        events = json.loads(row[0])
        return [TimelineEventResponse(**e) for e in events]

@router.get("/{incident_id}/services", response_model=ServiceMapResponse)
def get_incident_services(incident_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        cursor.execute("SELECT service_dependencies FROM analyses WHERE incident_id = ? ORDER BY created_at DESC LIMIT 1", (incident_id,))
        row = cursor.fetchone()
        if row and row[0]:
            return ServiceMapResponse(**json.loads(row[0]))
            
        # Fallback calculation
        cursor.execute("SELECT * FROM evidence_records WHERE incident_id = ?", (incident_id,))
        recs = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT * FROM evidence_records WHERE incident_id = ? AND category = 'dependencies'", (incident_id,))
        deps = [dict(r) for r in cursor.fetchall()]
        from app.analysis.correlator import resolve_service_topology
        return ServiceMapResponse(**resolve_service_topology(deps, recs))

@router.get("/{incident_id}/records")
def get_evidence_records(
    incident_id: str,
    service: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    with get_db() as conn:
        cursor = conn.cursor()
        verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        query = "SELECT * FROM evidence_records WHERE incident_id = ?"
        params = [incident_id]
        
        if service:
            query += " AND service = ?"
            params.append(service)
        if category:
            query += " AND category = ?"
            params.append(category)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if search:
            query += " AND (message LIKE ? OR metric_name LIKE ? OR trace_id LIKE ?)"
            s = f"%{search}%"
            params.extend([s, s, s])
            
        # Count total matching
        count_q = f"SELECT COUNT(*) FROM ({query})"
        cursor.execute(count_q, params)
        total_matching = cursor.fetchone()[0]
        
        query += " ORDER BY id ASC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        items = []
        for r in rows:
            d = dict(r)
            try:
                d["raw_data"] = json.loads(d["raw_data"]) if d["raw_data"] else {}
            except Exception:
                d["raw_data"] = {}
            items.append(d)
            
        return {
            "total": total_matching,
            "limit": limit,
            "offset": offset,
            "items": items
        }

@router.get("/{incident_id}/report")
def export_incident_report(
    incident_id: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    current_user: dict = Depends(get_current_user)
):
    with get_db() as conn:
        cursor = conn.cursor()
        inc = verify_incident_ownership(cursor, incident_id, current_user["id"])
        
        cursor.execute("SELECT * FROM analyses WHERE incident_id = ? ORDER BY created_at DESC LIMIT 1", (incident_id,))
        analysis_row = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) FROM evidence_files WHERE incident_id = ?", (incident_id,))
        file_cnt = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM evidence_records WHERE incident_id = ?", (incident_id,))
        rec_cnt = cursor.fetchone()[0]
        
        analysis_data = {}
        if analysis_row:
            d = dict(analysis_row)
            analysis_data = {
                "id": d["id"],
                "summary": d["summary"],
                "ranked_hypotheses": json.loads(d["ranked_hypotheses"]),
                "limitations": json.loads(d["limitations"]),
                "next_checks": json.loads(d["next_checks"]),
                "data_quality_warnings": json.loads(d["data_quality_warnings"]),
                "created_at": d["created_at"]
            }
            
        report_payload = {
            "platform": "IncidentIQ — AI-Powered Incident Investigation Platform",
            "version": settings.APP_VERSION,
            "export_time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "incident": {
                "id": inc["id"],
                "incident_id_code": inc["incident_id_code"],
                "title": inc["title"],
                "description": inc["description"],
                "severity": inc["severity"],
                "environment": inc["environment"],
                "start_time": inc["start_time"],
                "end_time": inc["end_time"],
                "symptoms": inc["symptoms"],
                "ticket_ref": inc["ticket_ref"],
                "status": inc["status"],
                "created_at": inc["created_at"]
            },
            "evidence_summary": {
                "total_files": file_cnt,
                "total_records": rec_cnt
            },
            "investigation": analysis_data
        }
        
        if format == "json":
            return report_payload
            
        # CSV Export
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["IncidentIQ Investigation Report"])
        writer.writerow(["Incident Code", inc["incident_id_code"]])
        writer.writerow(["Title", inc["title"]])
        writer.writerow(["Severity", inc["severity"]])
        writer.writerow(["Status", inc["status"]])
        writer.writerow(["Time Window", f"{inc['start_time']} to {inc['end_time']}"])
        writer.writerow([])
        writer.writerow(["Rank", "Hypothesis", "Score", "Confidence Tier", "Affected Services"])
        
        hypotheses = analysis_data.get("ranked_hypotheses", [])
        for h in hypotheses:
            writer.writerow([
                h.get("rank"),
                h.get("title"),
                h.get("score"),
                h.get("confidence_tier"),
                ", ".join(h.get("affected_services", []))
            ])
            
        writer.writerow([])
        writer.writerow(["Recommended Next Checks"])
        for check in analysis_data.get("next_checks", []):
            writer.writerow([check])
            
        writer.writerow([])
        writer.writerow(["Limitations"])
        for lim in analysis_data.get("limitations", []):
            writer.writerow([lim])
            
        content = output.getvalue()
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=report_{inc['incident_id_code']}.csv"}
        )
