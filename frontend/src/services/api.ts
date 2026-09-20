export interface LeadScore {
  id: string;
  currentScore: number;
  fitScore: number;
  engagementScore: number;
  tier: 'HOT' | 'WARM' | 'COLD';
  lastComputedAt: string;
}

export interface ScoreHistoryItem {
  id: string;
  leadId: string;
  previousScore: number;
  newScore: number;
  delta: number;
  reason: string;
  triggerEvent: string;
  breakdown: any;
  createdAt: string;
}

export interface EmailEvent {
  id: string;
  eventType: 'DELIVERED' | 'OPENED' | 'CLICKED' | 'REPLIED' | 'UNSUBSCRIBED' | 'BOUNCED';
  messageId?: string;
  payload?: any;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  sizeRange: string;
  region: string;
  website?: string;
  description?: string;
  signals?: any;
}

export interface Lead {
  id: string;
  companyId: string;
  company: Company;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  sourceUrl: string;
  status: 'DISCOVERED' | 'CONTACTED' | 'OPENED' | 'REPLIED' | 'UNSUBSCRIBED' | 'BOUNCED';
  trackingToken: string;
  researchNotes?: any;
  score?: LeadScore;
  scoreHistory?: ScoreHistoryItem[];
  events?: EmailEvent[];
  suppression?: any;
  createdAt: string;
}

export interface PipelineMetrics {
  totalLeads: number;
  byStatus: {
    discovered: number;
    contacted: number;
    opened: number;
    replied: number;
    unsubscribed: number;
  };
  byTier: {
    hot: number;
    warm: number;
    cold: number;
  };
  rates: {
    openRatePercent: number;
    replyRatePercent: number;
    averageScore: number;
  };
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('stylesense_jwt');
  }

  public setToken(token: string) {
    this.token = token;
    localStorage.setItem('stylesense_jwt', token);
  }

  public getToken(): string | null {
    return this.token;
  }

  public clearToken() {
    this.token = null;
    localStorage.removeItem('stylesense_jwt');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    // Auto-login for demo if token is missing
    if (!this.token && !endpoint.includes('/api/auth/')) {
      try {
        const demoRes = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const demoData = await demoRes.json();
        if (demoData.token) {
          this.setToken(demoData.token);
        }
      } catch (e) {
        console.error('Failed to auto-authenticate with demo token', e);
      }
    }

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    // If token expired, clear and re-try once
    if (response.status === 401 && !endpoint.includes('/api/auth/')) {
      this.clearToken();
      const demoRes = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const demoData = await demoRes.json();
      if (demoData.token) {
        this.setToken(demoData.token);
        headers.set('Authorization', `Bearer ${demoData.token}`);
        const retryRes = await fetch(endpoint, { ...options, headers });
        const retryData = await retryRes.json();
        if (!retryRes.ok) throw retryData;
        return retryData;
      }
    }

    const data = await response.json();
    if (!response.ok) {
      throw data;
    }

    return data;
  }

  public async demoLogin() {
    const data = await this.request<{ success: boolean; token: string; user: any }>('/api/auth/demo-login', {
      method: 'POST'
    });
    this.setToken(data.token);
    return data;
  }

  public async getMetrics(): Promise<PipelineMetrics> {
    const res = await this.request<{ success: boolean; data: PipelineMetrics }>('/api/leads/metrics');
    return res.data;
  }

  public async getLeads(params: {
    page?: number;
    limit?: number;
    status?: string;
    tier?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status) query.set('status', params.status);
    if (params.tier) query.set('tier', params.tier);
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    return this.request<{
      success: boolean;
      data: Lead[];
      pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>(`/api/leads?${query.toString()}`);
  }

  public async getLead(id: string): Promise<Lead> {
    const res = await this.request<{ success: boolean; data: Lead }>(`/api/leads/${id}`);
    return res.data;
  }

  public async previewEmail(id: string) {
    return this.request<{
      success: boolean;
      data: {
        leadId: string;
        recipientEmail: string;
        rendered: {
          subject: string;
          bodyText: string;
          bodyHtml: string;
        };
        groundingCheck: any;
      };
    }>(`/api/leads/${id}/preview-email`, {
      method: 'POST'
    });
  }

  public async sendEmail(id: string) {
    return this.request<{
      success: boolean;
      data: {
        sendResult: any;
        lead: Lead;
      };
    }>(`/api/leads/${id}/send`, {
      method: 'POST'
    });
  }

  public async simulateOpen(id: string) {
    return this.request<{ success: boolean; message: string; scoreResult: any }>(
      `/api/tracking/simulate-open/${id}`,
      { method: 'POST' }
    );
  }

  public async simulateReply(leadId: string, replyText: string) {
    return this.request<{
      success: boolean;
      data: {
        classification: {
          intent: string;
          confidence: number;
          extractedSignals: string[];
          suggestedAction: string;
          draftedResponse: { subject: string; body: string };
        };
        newStatus: string;
        newScore: number;
        scoreDelta: number;
        scoreBreakdown: any;
      };
    }>('/api/agent/simulate-reply', {
      method: 'POST',
      body: JSON.stringify({ leadId, replyText })
    });
  }

  public async discoverLeads(icp: {
    industry: string;
    region: string;
    companySize: string;
    targetTitles: string[];
  }) {
    return this.request<{ success: boolean; leadsFound: number; leads: Lead[] }>(
      '/api/agent/discover',
      {
        method: 'POST',
        body: JSON.stringify(icp)
      }
    );
  }

  public async recomputeScore(id: string) {
    return this.request<{ success: boolean; data: { lead: Lead; scoreResult: any } }>(
      `/api/leads/${id}/recompute-score`,
      { method: 'POST' }
    );
  }

  public async recomputeAll() {
    return this.request<{ success: boolean; message: string; data: any }>(
      '/api/leads/recompute-all',
      { method: 'POST' }
    );
  }
}

export const api = new ApiClient();
