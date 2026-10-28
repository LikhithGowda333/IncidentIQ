import json
import uuid
import datetime
import pytest
from app.db.database import init_db, get_db
from app.api.incidents import create_incident, list_incidents, get_incident, update_incident, delete_incident, export_incident_report
from app.schemas.schemas import IncidentCreate, IncidentUpdate
from app.auth.security import hash_password
from fastapi import HTTPException

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def mock_user_1():
    uid = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute("INSERT OR REPLACE INTO users (id, email, password_hash, full_name, created_at) VALUES (?, ?, ?, ?, ?)",
                     (uid, f"user_{uid[:8]}@incidentiq.local", hash_password("pass123"), "SRE 1", now))
    return {"id": uid, "email": f"user_{uid[:8]}@incidentiq.local", "full_name": "SRE 1"}

@pytest.fixture
def mock_user_2():
    uid = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute("INSERT OR REPLACE INTO users (id, email, password_hash, full_name, created_at) VALUES (?, ?, ?, ?, ?)",
                     (uid, f"user_{uid[:8]}@incidentiq.local", hash_password("pass123"), "SRE 2", now))
    return {"id": uid, "email": f"user_{uid[:8]}@incidentiq.local", "full_name": "SRE 2"}

def test_incident_lifecycle_and_ownership(mock_user_1, mock_user_2):
    # User 1 creates an incident
    inc_in = IncidentCreate(
        title="Payment Gateway Latency",
        severity="critical",
        affected_services=["payment-service", "bank-api"],
        environment="production",
        description="P99 latency exceeding 4000ms"
    )
    inc = create_incident(inc_in, current_user=mock_user_1)
    assert inc.id is not None
    assert inc.incident_id_code.startswith("INC-")
    assert inc.affected_services == ["payment-service", "bank-api"]
    
    # User 1 can view incident
    fetched = get_incident(inc.id, current_user=mock_user_1)
    assert fetched.title == "Payment Gateway Latency"
    
    # User 2 attempts to view User 1's incident -> must be 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        get_incident(inc.id, current_user=mock_user_2)
    assert exc_info.value.status_code == 403
    
    # User 1 updates incident
    updated = update_incident(inc.id, IncidentUpdate(status="investigating"), current_user=mock_user_1)
    assert updated.status == "investigating"
    
    # User 2 attempts to delete User 1's incident -> must be 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        delete_incident(inc.id, current_user=mock_user_2)
    assert exc_info.value.status_code == 403
    
    # User 1 deletes incident
    del_res = delete_incident(inc.id, current_user=mock_user_1)
    assert "deleted" in del_res["message"].lower()

def test_report_export_json_and_csv(mock_user_1):
    inc = create_incident(IncidentCreate(
        title="Report Test Incident",
        severity="high",
        affected_services=["search-service"]
    ), current_user=mock_user_1)
    
    # JSON report export
    json_rep = export_incident_report(inc.id, format="json", current_user=mock_user_1)
    assert json_rep["incident"]["id"] == inc.id
    assert "platform" in json_rep
    
    # CSV report export
    csv_rep = export_incident_report(inc.id, format="csv", current_user=mock_user_1)
    assert csv_rep.status_code == 200
    assert "IncidentIQ Investigation Report" in csv_rep.body.decode("utf-8")
