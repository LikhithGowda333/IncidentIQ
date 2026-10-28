import {
  AuthResponse, User, Incident, EvidenceFileSummary,
  ValidationSummary, AnalysisResult, TimelineEvent,
  ServiceMapData, OverviewStats, EvidenceRecord
} from '../types';

const API_BASE = 'https://incidentiq-ce2j.onrender.com/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('incidentiq_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('incidentiq_token');
    localStorage.removeItem('incidentiq_user');
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }

  if (!res.ok) {
    let errMessage = `Error ${res.status}: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.detail) {
        errMessage = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errMessage);
  }

  return res.json();
}

export const api = {
  // --- Auth ---
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('incidentiq_token', data.access_token);
    localStorage.setItem('incidentiq_user', JSON.stringify(data.user));
    return data;
  },

  async register(full_name: string, email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password })
    });
    localStorage.setItem('incidentiq_token', data.access_token);
    localStorage.setItem('incidentiq_user', JSON.stringify(data.user));
    return data;
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('incidentiq_token');
      localStorage.removeItem('incidentiq_user');
    }
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  // --- Health ---
  async checkHealth(): Promise<any> {
    return request<any>('/health');
  },

  // --- Overview ---
  async getOverviewStats(): Promise<OverviewStats> {
    return request<OverviewStats>('/overview/stats');
  },

  // --- Incidents ---
  async getIncidents(params: { severity?: string; status?: string; service?: string; search?: string } = {}): Promise<Incident[]> {
    const query = new URLSearchParams();
    if (params.severity) query.append('severity', params.severity);
    if (params.status) query.append('status', params.status);
    if (params.service) query.append('service', params.service);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return request<Incident[]>(`/incidents${qs ? `?${qs}` : ''}`);
  },

  async getIncident(id: string): Promise<Incident> {
    return request<Incident>(`/incidents/${id}`);
  },

  async createIncident(payload: Partial<Incident>): Promise<Incident> {
    return request<Incident>('/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  async updateIncident(id: string, payload: Partial<Incident>): Promise<Incident> {
    return request<Incident>(`/incidents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  async deleteIncident(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/incidents/${id}`, { method: 'DELETE' });
  },

  async uploadEvidenceFiles(incidentId: string, files: File[]): Promise<EvidenceFileSummary[]> {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const token = localStorage.getItem('incidentiq_token');
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      let err = `Upload failed (${res.status})`;
      try {
        const d = await res.json();
        if (d.detail) err = d.detail;
      } catch {}
      throw new Error(err);
    }
    return res.json();
  },

  async getEvidenceFiles(incidentId: string): Promise<EvidenceFileSummary[]> {
    return request<EvidenceFileSummary[]>(`/incidents/${incidentId}/evidence`);
  },

  async getValidationSummary(incidentId: string): Promise<ValidationSummary> {
    return request<ValidationSummary>(`/incidents/${incidentId}/validation`);
  },

  async analyzeIncident(incidentId: string): Promise<AnalysisResult> {
    return request<AnalysisResult>(`/incidents/${incidentId}/analyze`, { method: 'POST' });
  },

  async getAnalysisResult(incidentId: string): Promise<AnalysisResult> {
    return request<AnalysisResult>(`/incidents/${incidentId}/analysis`);
  },

  async getTimeline(incidentId: string): Promise<TimelineEvent[]> {
    return request<TimelineEvent[]>(`/incidents/${incidentId}/timeline`);
  },

  async getServiceMap(incidentId: string): Promise<ServiceMapData> {
    return request<ServiceMapData>(`/incidents/${incidentId}/services`);
  },

  async getEvidenceRecords(incidentId: string, params: { service?: string; category?: string; severity?: string; search?: string; limit?: number; offset?: number } = {}): Promise<{ total: number; limit: number; offset: number; items: EvidenceRecord[] }> {
    const query = new URLSearchParams();
    if (params.service) query.append('service', params.service);
    if (params.category) query.append('category', params.category);
    if (params.severity) query.append('severity', params.severity);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());
    const qs = query.toString();
    return request(`/incidents/${incidentId}/records${qs ? `?${qs}` : ''}`);
  },

  getReportDownloadUrl(incidentId: string, format: 'json' | 'csv'): string {
    const token = localStorage.getItem('incidentiq_token') || '';
    return `${API_BASE}/incidents/${incidentId}/report?format=${format}&token=${token}`;
  },

  async getReportJson(incidentId: string): Promise<any> {
    return request(`/incidents/${incidentId}/report?format=json`);
  }
};
