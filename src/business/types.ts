/**
 * Business Assistant Module Types
 *
 * Shared types and interfaces for all business capabilities:
 * - Marketing
 * - CRM
 * - Customer Support
 * - Analytics
 * - Business Automation
 */

/**
 * Base interface for all external integrations
 */
export interface IExternalIntegration {
  name: string;
  connect(): Promise<boolean>;
  test(): Promise<{ healthy: boolean; message: string }>;
  disconnect(): Promise<void>;
}

/**
 * Marketing Types
 */
export interface MarketingCampaign {
  id: string;
  name: string;
  type: 'email' | 'social' | 'ads' | 'content';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  metrics: {
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    converted?: number;
    cost?: number;
    revenue?: number;
  };
  platform: 'mailchimp' | 'hubspot' | 'sendgrid' | 'facebook' | 'google' | 'custom';
  metadata?: Record<string, any>;
}

export interface CampaignInsight {
  campaignId: string;
  campaignName: string;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  roi: number;
  suggestions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * CRM Types
 */
export interface CRMLead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  source: string;
  value?: number;
  createdAt: Date;
  updatedAt: Date;
  customFields?: Record<string, any>;
  enrichment?: {
    linkedinProfile?: string;
    companySize?: string;
    industry?: string;
    aiSummary?: string;
  };
}

export interface CRMContact {
  id: string;
  email: string;
  name: string;
  company?: string;
  role?: string;
  tags: string[];
  interactions: CRMInteraction[];
  score?: number; // Lead score 0-100
}

export interface CRMInteraction {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  date: Date;
  summary: string;
  outcome?: string;
}

/**
 * Customer Support Types
 */
export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customer: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  sentiment?: {
    score: number; // -1 to 1
    label: 'negative' | 'neutral' | 'positive';
    confidence: number;
  };
  aiSuggestions?: {
    suggestedReply?: string;
    similarTickets?: string[];
    escalate?: boolean;
    reason?: string;
  };
}

export interface SupportInsight {
  totalTickets: number;
  openTickets: number;
  avgResponseTime: number; // minutes
  avgResolutionTime: number; // hours
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topIssues: Array<{
    category: string;
    count: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
  escalationRate: number;
}

/**
 * Analytics Types
 */
export interface BusinessMetrics {
  timeframe: {
    start: Date;
    end: Date;
  };
  operations: {
    aiUsage: {
      totalRequests: number;
      totalCost: number;
      byProvider: Record<string, { requests: number; cost: number }>;
    };
    systemHealth: {
      uptime: number; // percentage
      incidents: number;
      mttr: number; // mean time to recovery in minutes
    };
  };
  marketing: {
    campaigns: number;
    avgOpenRate: number;
    avgClickRate: number;
    avgConversionRate: number;
    totalRevenue: number;
    totalCost: number;
    roi: number;
  };
  sales: {
    leads: number;
    qualified: number;
    won: number;
    revenue: number;
    avgDealSize: number;
    conversionRate: number;
  };
  support: {
    tickets: number;
    resolved: number;
    avgSatisfaction: number;
    avgResponseTime: number;
    escalationRate: number;
  };
}

export interface AnalyticsTrend {
  metric: string;
  current: number;
  previous: number;
  change: number; // percentage
  trend: 'up' | 'down' | 'stable';
  forecast?: number[];
}

/**
 * Business Automation Types
 */
export interface BusinessAutomation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggers: AutomationTrigger[];
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  schedule?: {
    type: 'cron' | 'interval' | 'event';
    value: string;
  };
  metadata?: {
    lastRun?: Date;
    runCount?: number;
    successCount?: number;
    failureCount?: number;
  };
}

export interface AutomationTrigger {
  type: 'event' | 'schedule' | 'webhook' | 'manual';
  event?: string; // e.g., 'new_lead_created', 'ticket_closed', 'campaign_completed'
  source?: string;
  filters?: Record<string, any>;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface AutomationAction {
  type: 'notify' | 'create_task' | 'send_email' | 'update_crm' | 'webhook' | 'ai_analyze';
  config: {
    // For 'notify'
    channel?: string; // e.g., '#sales', 'email:team@company.com'
    message?: string;

    // For 'create_task'
    domain?: string;
    taskType?: string;
    parameters?: Record<string, any>;

    // For 'send_email'
    to?: string | string[];
    subject?: string;
    template?: string;

    // For 'update_crm'
    contactId?: string;
    updates?: Record<string, any>;

    // For 'webhook'
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: Record<string, any>;

    // For 'ai_analyze'
    prompt?: string;
    model?: 'gpt-4' | 'claude-3' | 'gemini-pro';
    saveResult?: string; // Field to save AI response
  };
}

/**
 * Integration Configuration
 */
export interface IntegrationConfig {
  marketing?: {
    mailchimp?: {
      apiKey: string;
      serverPrefix: string;
    };
    hubspot?: {
      apiKey: string;
      portalId: string;
    };
    sendgrid?: {
      apiKey: string;
    };
  };
  crm?: {
    hubspot?: {
      apiKey: string;
      portalId: string;
    };
    salesforce?: {
      clientId: string;
      clientSecret: string;
      instanceUrl: string;
    };
  };
  support?: {
    zendesk?: {
      subdomain: string;
      email: string;
      apiToken: string;
    };
    intercom?: {
      accessToken: string;
    };
  };
  analytics?: {
    googleAnalytics?: {
      viewId: string;
      serviceAccountKey: string;
    };
    mixpanel?: {
      projectToken: string;
      apiSecret: string;
    };
  };
}

/**
 * Business Event Types
 */
export enum BusinessEvent {
  // Marketing events
  CAMPAIGN_CREATED = 'campaign_created',
  CAMPAIGN_STARTED = 'campaign_started',
  CAMPAIGN_COMPLETED = 'campaign_completed',
  CAMPAIGN_PAUSED = 'campaign_paused',

  // CRM events
  LEAD_CREATED = 'lead_created',
  LEAD_QUALIFIED = 'lead_qualified',
  LEAD_CONVERTED = 'lead_converted',
  LEAD_LOST = 'lead_lost',
  CONTACT_UPDATED = 'contact_updated',
  CONTACT_ENRICHED = 'contact_enriched',

  // Support events
  TICKET_CREATED = 'ticket_created',
  TICKET_UPDATED = 'ticket_updated',
  TICKET_RESOLVED = 'ticket_resolved',
  TICKET_ESCALATED = 'ticket_escalated',
  NEGATIVE_SENTIMENT_DETECTED = 'negative_sentiment_detected',

  // Analytics events
  METRICS_CALCULATED = 'metrics_calculated',
  TREND_DETECTED = 'trend_detected',
  ANOMALY_DETECTED = 'anomaly_detected',

  // Automation events
  AUTOMATION_TRIGGERED = 'automation_triggered',
  AUTOMATION_COMPLETED = 'automation_completed',
  AUTOMATION_FAILED = 'automation_failed'
}

/**
 * All types are already exported above with individual export declarations
 */
