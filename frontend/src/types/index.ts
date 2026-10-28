export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_login?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Incident {
  id: string;
  user_id: string;
  title: string;
  incident_id_code: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affected_services: string[];
  environment: 'production' | 'staging' | 'development';
  symptoms?: string;
  ticket_ref?: string;
  status: 'open' | 'investigating' | 'analyzed' | 'resolved';
  created_at: string;
  updated_at: string;
  files_count: number;
  records_count: number;
  has_analysis: boolean;
}

export interface EvidenceFileSummary {
  id: string;
  incident_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  record_count: number;
  detected_category: 'logs' | 'metrics' | 'traces' | 'deployments' | 'dependencies';
  column_mappings: Record<string, string>;
  preview_rows: Record<string, any>[];
  upload_status: string;
  warnings: string[];
  created_at: string;
}

export interface ValidationSummary {
  total_files: number;
  total_records: number;
  total_rejected: number;
  rejection_reasons: string[];
  time_coverage: {
    earliest?: string | null;
    latest?: string | null;
  };
  services_discovered: string[];
  categories_detected: string[];
  missing_categories: string[];
  warnings: string[];
  can_analyze: boolean;
  limitation_notice?: string | null;
}

export interface EvidenceCitation {
  file_name: string;
  row_number: number;
  timestamp?: string;
  service?: string;
  category: string;
  summary: string;
  metric_value?: number;
  trace_id?: string;
}

export interface Hypothesis {
  rank: number;
  title: string;
  score: number;
  confidence_tier: 'High evidence support' | 'Moderate evidence support' | 'Low evidence support' | 'Insufficient evidence';
  explanation: string;
  score_formula_breakdown: {
    formula: string;
    inputs: Record<string, any>;
    interpretation: string;
  };
  supporting_evidence: EvidenceCitation[];
  contradicting_evidence: EvidenceCitation[];
  affected_services: string[];
  relevant_interval: {
    start?: string | null;
    end?: string | null;
  };
  alternative_explanations: string[];
  recommended_next_checks: string[];
  limitations: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  event_type: 'onset' | 'log_error' | 'metric_anomaly' | 'trace_failure' | 'deployment' | 'config_change' | 'recovery';
  service: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  source_file: string;
  source_row: number;
  record_id?: number | null;
  trace_id?: string | null;
  duration_ms?: number | null;
}

export interface ServiceDependencyNode {
  id: string;
  name: string;
  role: string;
  status: 'critical' | 'degraded' | 'healthy' | 'unknown';
  error_count: number;
  anomaly_detected: boolean;
}

export interface ServiceDependencyEdge {
  source: string;
  target: string;
  relationship?: string;
}

export interface ServiceMapData {
  nodes: ServiceDependencyNode[];
  edges: ServiceDependencyEdge[];
  has_uploaded_graph: boolean;
}

export interface AnalysisResult {
  id: string;
  incident_id: string;
  status: string;
  summary: string;
  is_abstention: boolean;
  ranked_hypotheses: Hypothesis[];
  timeline_events: TimelineEvent[];
  service_dependencies: ServiceMapData;
  metrics_summary: Record<string, any>;
  limitations: string[];
  next_checks: string[];
  data_quality_warnings: string[];
  created_at: string;
}

export interface EvidenceRecord {
  id: number;
  file_id: string;
  file_name: string;
  row_number: number;
  timestamp?: string;
  service?: string;
  category: string;
  severity?: string;
  message?: string;
  metric_name?: string;
  metric_value?: number;
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  duration_ms?: number;
  raw_data: Record<string, any>;
}

export interface OverviewStats {
  total_incidents: number;
  incidents_analyzed: number;
  critical_incidents: number;
  insufficient_evidence_incidents: number;
  implicated_services: { service: string; count: number }[];
  incident_trends: { date: string; count: number }[];
  severity_distribution: Record<string, number>;
  service_impact: { service: string; count: number }[];
  recent_incidents: Incident[];
  recent_investigations: any[];
  system_health: {
    status: string;
    api_server: string;
    database: string;
    analysis_engine: string;
    uptime_check: string;
    timestamp: string;
  };
}
