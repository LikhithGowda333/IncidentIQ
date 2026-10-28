import pytest
from app.analysis.engine import analyze_incident_evidence
from app.analysis.patterns import detect_log_patterns, detect_metric_anomalies
from app.analysis.correlator import build_timeline_events, resolve_service_topology
from app.analysis.scorer import compute_heuristic_score

def test_heuristic_scorer_formula():
    score, tier, formula = compute_heuristic_score(
        base=0.15,
        temporal_match=0.9,
        error_density=0.8,
        causal_link=0.85,
        contradiction_penalty=0.1
    )
    assert 0.70 <= score <= 0.95
    assert tier == "High evidence support"
    assert "formula" in formula
    assert formula["inputs"]["computed_score"] == score

def test_timeline_ordering_and_provenance():
    records = [
        {"category": "logs", "service": "api", "timestamp": "2026-10-28T10:05:00Z", "severity": "ERROR", "message": "Late error", "file_name": "log.csv", "row_number": 50},
        {"category": "deployments", "service": "api", "timestamp": "2026-10-28T10:00:00Z", "version": "v2.0", "message": "Deploy v2.0", "file_name": "dep.csv", "row_number": 2},
        {"category": "logs", "service": "api", "timestamp": "2026-10-28T10:01:00Z", "severity": "ERROR", "message": "Early error", "file_name": "log.csv", "row_number": 10}
    ]
    timeline = build_timeline_events(records, incident_start="2026-10-28T09:59:00Z")
    assert len(timeline) == 4
    timestamps = [e["timestamp"] for e in timeline]
    assert timestamps == sorted(timestamps)
    # Check provenance
    assert timeline[1]["source_file"] == "dep.csv"
    assert timeline[1]["source_row"] == 2

def test_analysis_with_deployment_and_database_errors():
    incident = {
        "title": "Checkout DB Latency Spike",
        "start_time": "2026-10-28T10:00:00Z",
        "affected_services": ["checkout-service", "database"]
    }
    records = [
        # Deployment
        {"category": "deployments", "service": "checkout-service", "version": "v2.4.1", "timestamp": "2026-10-28T10:00:30Z", "file_name": "deploy.csv", "row_number": 2},
        # Database errors in logs
        {"category": "logs", "service": "checkout-service", "severity": "ERROR", "message": "Database connection pool exhausted timeout", "timestamp": "2026-10-28T10:01:00Z", "file_name": "checkout.log", "row_number": 12},
        {"category": "logs", "service": "checkout-service", "severity": "CRITICAL", "message": "Deadlock detected during checkout", "timestamp": "2026-10-28T10:01:30Z", "file_name": "checkout.log", "row_number": 15},
        # High CPU metric
        {"category": "metrics", "service": "checkout-service", "metric_name": "cpu_utilization", "metric_value": 92.4, "timestamp": "2026-10-28T10:02:00Z", "file_name": "metrics.csv", "row_number": 4},
        # Healthy database server metric (acting as contradiction/clarification)
        {"category": "metrics", "service": "database", "metric_name": "cpu_utilization", "metric_value": 18.0, "timestamp": "2026-10-28T10:02:00Z", "file_name": "metrics.csv", "row_number": 5}
    ]
    
    result = analyze_incident_evidence(incident, records)
    assert result["status"] == "completed"
    assert result["is_abstention"] is False
    assert len(result["ranked_hypotheses"]) >= 1
    
    top_h = result["ranked_hypotheses"][0]
    assert top_h["score"] >= 0.50
    assert len(top_h["supporting_evidence"]) > 0
    assert len(top_h["recommended_next_checks"]) > 0
    
    # Evidence citation integrity
    cit = top_h["supporting_evidence"][0]
    assert cit["file_name"] in ["deploy.csv", "checkout.log"]
    assert cit["row_number"] > 0

def test_analysis_abstention_on_insufficient_evidence():
    incident = {
        "title": "Low Signal Incident",
        "start_time": "2026-10-28T12:00:00Z",
        "affected_services": ["edge-proxy"]
    }
    # Only 2 benign log lines with zero errors
    records = [
        {"category": "logs", "service": "edge-proxy", "severity": "INFO", "message": "Health check ok", "timestamp": "2026-10-28T12:00:00Z", "file_name": "proxy.log", "row_number": 1},
        {"category": "logs", "service": "edge-proxy", "severity": "INFO", "message": "Connection closed", "timestamp": "2026-10-28T12:00:10Z", "file_name": "proxy.log", "row_number": 2}
    ]
    result = analyze_incident_evidence(incident, records)
    assert result["is_abstention"] is True
    assert "insufficient evidence" in result["ranked_hypotheses"][0]["title"].lower()
    assert result["ranked_hypotheses"][0]["score"] <= 0.25
    assert len(result["next_checks"]) > 0
