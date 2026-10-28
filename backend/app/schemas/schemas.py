from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# --- Auth Schemas ---
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    password: str = Field(..., min_length=6, max_length=128)

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: str
    last_login: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user: UserResponse

# --- Incident Schemas ---
class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    incident_id_code: Optional[str] = None
    description: Optional[str] = ""
    start_time: Optional[str] = None  # ISO format or "Unknown"
    end_time: Optional[str] = None    # ISO format or "Unknown"
    severity: str = Field("high", pattern="^(critical|high|medium|low)$")
    affected_services: List[str] = Field(default_factory=list)
    environment: str = Field("production", pattern="^(production|staging|development)$")
    symptoms: Optional[str] = ""
    ticket_ref: Optional[str] = ""

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    severity: Optional[str] = None
    affected_services: Optional[List[str]] = None
    environment: Optional[str] = None
    symptoms: Optional[str] = None
    ticket_ref: Optional[str] = None
    status: Optional[str] = None

class IncidentResponse(BaseModel):
    id: str
    user_id: str
    title: str
    incident_id_code: str
    description: Optional[str]
    start_time: Optional[str]
    end_time: Optional[str]
    severity: str
    affected_services: List[str]
    environment: str
    symptoms: Optional[str]
    ticket_ref: Optional[str]
    status: str
    created_at: str
    updated_at: str
    files_count: int = 0
    records_count: int = 0
    has_analysis: bool = False

# --- Evidence & Upload Schemas ---
class EvidenceFileSummary(BaseModel):
    id: str
    incident_id: str
    file_name: str
    file_type: str
    file_size: int
    record_count: int
    detected_category: str
    column_mappings: Dict[str, str]
    preview_rows: List[Dict[str, Any]] = []
    upload_status: str
    warnings: List[str]
    created_at: str

class ColumnMappingOverride(BaseModel):
    file_id: str
    column_mappings: Dict[str, str]

class ValidationSummaryResponse(BaseModel):
    total_files: int
    total_records: int
    total_rejected: int
    rejection_reasons: List[str]
    time_coverage: Dict[str, Optional[str]] # {"earliest": ..., "latest": ...}
    services_discovered: List[str]
    categories_detected: List[str]
    missing_categories: List[str]
    warnings: List[str]
    can_analyze: bool
    limitation_notice: Optional[str] = None

class EvidenceRecordResponse(BaseModel):
    id: int
    file_id: str
    file_name: str
    row_number: int
    timestamp: Optional[str]
    service: Optional[str]
    category: str
    severity: Optional[str]
    message: Optional[str]
    metric_name: Optional[str]
    metric_value: Optional[float]
    trace_id: Optional[str]
    span_id: Optional[str]
    parent_span_id: Optional[str]
    duration_ms: Optional[float]
    raw_data: Dict[str, Any]

# --- Analysis Schemas ---
class EvidenceCitation(BaseModel):
    file_name: str
    row_number: int
    timestamp: Optional[str]
    service: Optional[str]
    category: str
    summary: str
    metric_value: Optional[float] = None
    trace_id: Optional[str] = None

class HypothesisResponse(BaseModel):
    rank: int
    title: str
    score: float # 0.0 - 1.0 (heuristic, transparently explained)
    confidence_tier: str # "High evidence support", "Moderate evidence support", "Low evidence support", "Insufficient evidence"
    explanation: str
    score_formula_breakdown: Dict[str, Any]
    supporting_evidence: List[EvidenceCitation]
    contradicting_evidence: List[EvidenceCitation]
    affected_services: List[str]
    relevant_interval: Dict[str, Optional[str]]
    alternative_explanations: List[str]
    recommended_next_checks: List[str]
    limitations: List[str]

class TimelineEventResponse(BaseModel):
    id: str
    timestamp: str
    event_type: str # "onset", "log_error", "metric_anomaly", "trace_failure", "deployment", "config_change", "recovery"
    service: str
    title: str
    description: str
    severity: str # "critical", "warning", "info", "success"
    source_file: str
    source_row: int
    record_id: Optional[int] = None
    trace_id: Optional[str] = None
    duration_ms: Optional[float] = None

class ServiceDependencyNode(BaseModel):
    id: str
    name: str
    role: str
    status: str # "critical", "degraded", "healthy", "unknown"
    error_count: int = 0
    anomaly_detected: bool = False

class ServiceDependencyEdge(BaseModel):
    source: str
    target: str
    relationship: Optional[str] = "calls"

class ServiceMapResponse(BaseModel):
    nodes: List[ServiceDependencyNode]
    edges: List[ServiceDependencyEdge]
    has_uploaded_graph: bool

class AnalysisResultResponse(BaseModel):
    id: str
    incident_id: str
    status: str
    summary: str
    is_abstention: bool = False
    ranked_hypotheses: List[HypothesisResponse]
    timeline_events: List[TimelineEventResponse]
    service_dependencies: ServiceMapResponse
    metrics_summary: Dict[str, Any]
    limitations: List[str]
    next_checks: List[str]
    data_quality_warnings: List[str]
    created_at: str

class OverviewStats(BaseModel):
    total_incidents: int
    incidents_analyzed: int
    critical_incidents: int
    insufficient_evidence_incidents: int
    implicated_services: List[Dict[str, Any]]
    incident_trends: List[Dict[str, Any]]
    severity_distribution: Dict[str, int]
    service_impact: List[Dict[str, Any]]
    recent_incidents: List[IncidentResponse]
    recent_investigations: List[Dict[str, Any]]
    system_health: Dict[str, Any]
