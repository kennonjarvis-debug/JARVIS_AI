# Jarvis: Autonomous AI Agent - Design, API Contracts & Parallel Development Prompts

**Version:** 1.0
**Date:** 2025-10-15
**Purpose:** Complete specification for building Jarvis with parallel Claude Code instances

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Contracts](#api-contracts)
3. [Parallel Development Prompts](#parallel-development-prompts)
4. [Integration Specifications](#integration-specifications)
5. [Testing Requirements](#testing-requirements)

---

## Architecture Overview

### System Design Principles

Jarvis is built as a modular, event-driven autonomous agent system with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator (Core)                       │
│  - Event routing                                             │
│  - Agent coordination                                        │
│  - Decision engine integration                               │
└───────────────┬─────────────────────────────────────────────┘
                │
        ┌───────┴───────┬───────────┬──────────┬──────────┐
        │               │           │          │          │
   ┌────▼────┐    ┌────▼────┐ ┌───▼────┐ ┌──▼─────┐ ┌──▼──────┐
   │Marketing│    │ Sales   │ │Operations│ │Support│ │Decision │
   │ Agent   │    │ Agent   │ │  Agent  │ │ Agent │ │ Engine  │
   └────┬────┘    └────┬────┘ └───┬────┘ └──┬─────┘ └──┬──────┘
        │              │           │          │          │
   ┌────▼──────────────▼───────────▼──────────▼──────────▼─────┐
   │              Integration Layer                              │
   │  Supabase | n8n | Buffer | HubSpot | Email | Discord       │
   └─────────────────────────────────────────────────────────────┘
```

### Component Dependencies

**Zero Dependencies (Build First in Parallel):**
- Logger utility
- Error handler
- Configuration loaders
- Type definitions

**Low Dependencies (Build Second in Parallel):**
- Integration adapters (each independent)
- Memory system
- Approval queue

**High Dependencies (Build Last Sequentially):**
- Decision engine (needs integrations, memory)
- Agents (need decision engine, integrations)
- Orchestrator (needs everything)

---

## API Contracts

### 1. Core: Orchestrator

**File:** `src/core/orchestrator.ts`

```typescript
/**
 * Central coordination system for all agents and workflows
 */

export interface OrchestratorConfig {
  agents: Agent[];
  integrations: Integration[];
  decisionEngine: DecisionEngine;
  approvalQueue: ApprovalQueue;
  memory: MemorySystem;
}

export interface TaskRequest {
  id: string;
  type: TaskType;
  priority: Priority;
  data: Record<string, any>;
  requestedBy: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TaskResult {
  taskId: string;
  status: 'completed' | 'failed' | 'pending_approval' | 'in_progress';
  result?: any;
  error?: Error;
  timestamp: Date;
  agentId: string;
}

export class Orchestrator {
  constructor(config: OrchestratorConfig);

  /**
   * Submit a task for autonomous execution
   * @returns Task ID for tracking
   */
  async submitTask(request: TaskRequest): Promise<string>;

  /**
   * Route task to appropriate agent based on type and context
   */
  async routeTask(taskId: string): Promise<void>;

  /**
   * Get current status of a task
   */
  async getTaskStatus(taskId: string): Promise<TaskResult>;

  /**
   * Cancel a pending or in-progress task
   */
  async cancelTask(taskId: string): Promise<void>;

  /**
   * Initialize orchestrator and all agents
   */
  async initialize(): Promise<void>;

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void>;
}

export enum TaskType {
  MARKETING_SOCIAL_POST = 'marketing.social.post',
  MARKETING_CONTENT_CREATE = 'marketing.content.create',
  MARKETING_EMAIL_CAMPAIGN = 'marketing.email.campaign',
  SALES_LEAD_QUALIFY = 'sales.lead.qualify',
  SALES_OUTREACH = 'sales.outreach',
  SALES_FOLLOW_UP = 'sales.follow_up',
  OPS_DATA_SYNC = 'ops.data.sync',
  OPS_ANALYTICS = 'ops.analytics',
  OPS_MONITORING = 'ops.monitoring',
  SUPPORT_TICKET_RESPOND = 'support.ticket.respond',
  SUPPORT_TICKET_ROUTE = 'support.ticket.route',
  SUPPORT_KB_UPDATE = 'support.kb.update',
}

export enum Priority {
  CRITICAL = 0,  // Handle immediately
  HIGH = 1,      // Handle within 5 minutes
  MEDIUM = 2,    // Handle within 1 hour
  LOW = 3,       // Handle within 24 hours
}
```

**Events Emitted:**
```typescript
interface OrchestratorEvents {
  'task:submitted': (taskId: string, request: TaskRequest) => void;
  'task:routed': (taskId: string, agentId: string) => void;
  'task:completed': (result: TaskResult) => void;
  'task:failed': (taskId: string, error: Error) => void;
  'task:needs_approval': (taskId: string, reason: string) => void;
  'agent:error': (agentId: string, error: Error) => void;
}
```

---

### 2. Core: Decision Engine

**File:** `src/core/decision-engine.ts`

```typescript
/**
 * Autonomous decision-making system with risk assessment
 */

export interface DecisionContext {
  taskType: TaskType;
  taskData: Record<string, any>;
  historicalData?: any[];
  userPreferences?: Record<string, any>;
  currentState?: Record<string, any>;
}

export interface DecisionResult {
  action: 'execute' | 'request_approval' | 'reject';
  confidence: number; // 0-1
  reasoning: string;
  riskLevel: RiskLevel;
  estimatedImpact?: {
    financial?: number;
    reputational?: 'low' | 'medium' | 'high';
    reversibility?: boolean;
  };
  alternatives?: Array<{
    action: string;
    reasoning: string;
  }>;
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface DecisionRule {
  id: string;
  taskTypes: TaskType[];
  condition: (context: DecisionContext) => boolean;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  description: string;
}

export class DecisionEngine {
  constructor(rules: DecisionRule[], llmClient: AnthropicClient);

  /**
   * Evaluate whether a task can be executed autonomously
   */
  async evaluate(context: DecisionContext): Promise<DecisionResult>;

  /**
   * Add a new decision rule dynamically
   */
  async addRule(rule: DecisionRule): Promise<void>;

  /**
   * Update existing rule
   */
  async updateRule(ruleId: string, updates: Partial<DecisionRule>): Promise<void>;

  /**
   * Get all rules for a specific task type
   */
  getRulesForTaskType(taskType: TaskType): DecisionRule[];

  /**
   * Learn from approved/rejected decisions to improve future decisions
   */
  async learnFromFeedback(
    taskId: string,
    decision: DecisionResult,
    humanFeedback: 'approved' | 'rejected',
    reason?: string
  ): Promise<void>;
}
```

**Decision Rules Configuration:**
```typescript
interface DecisionRulesConfig {
  // Financial thresholds
  autoApproveMaxSpend: number; // Default: 100 USD

  // Content approval
  requireApprovalForNewAudiences: boolean; // Default: true
  requireApprovalForControversialTopics: boolean; // Default: true

  // Sales thresholds
  autoApproveDiscountUpTo: number; // Default: 10%
  requireApprovalForCustomPricing: boolean; // Default: true

  // Support thresholds
  autoApproveRefundUpTo: number; // Default: 50 USD
  requireApprovalForDataDeletion: boolean; // Default: true
}
```

---

### 3. Core: Memory System

**File:** `src/core/memory.ts`

```typescript
/**
 * Context and history management for autonomous operation
 */

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: any;
  timestamp: Date;
  agentId?: string;
  taskId?: string;
  tags: string[];
  importance: number; // 0-1
}

export enum MemoryType {
  TASK_EXECUTION = 'task_execution',
  USER_FEEDBACK = 'user_feedback',
  DECISION_OUTCOME = 'decision_outcome',
  SYSTEM_STATE = 'system_state',
  LEARNED_PATTERN = 'learned_pattern',
  ERROR = 'error',
}

export interface QueryOptions {
  type?: MemoryType;
  agentId?: string;
  tags?: string[];
  since?: Date;
  limit?: number;
  minImportance?: number;
}

export class MemorySystem {
  constructor(supabaseClient: SupabaseClient);

  /**
   * Store a new memory entry
   */
  async store(entry: Omit<MemoryEntry, 'id'>): Promise<string>;

  /**
   * Retrieve memories matching query
   */
  async query(options: QueryOptions): Promise<MemoryEntry[]>;

  /**
   * Get full context for a specific task
   */
  async getTaskContext(taskId: string): Promise<{
    task: TaskRequest;
    relatedMemories: MemoryEntry[];
    previousSimilarTasks: TaskResult[];
  }>;

  /**
   * Update importance score (for learning)
   */
  async updateImportance(memoryId: string, importance: number): Promise<void>;

  /**
   * Cleanup old, low-importance memories
   */
  async prune(olderThan: Date, maxImportance: number): Promise<number>;

  /**
   * Get aggregate stats for analytics
   */
  async getStats(since?: Date): Promise<{
    totalEntries: number;
    byType: Record<MemoryType, number>;
    byAgent: Record<string, number>;
    averageImportance: number;
  }>;
}
```

---

### 4. Core: Approval Queue

**File:** `src/core/approval-queue.ts`

```typescript
/**
 * Human-in-the-loop approval workflow for high-risk tasks
 */

export interface ApprovalRequest {
  id: string;
  taskId: string;
  taskType: TaskType;
  requestedAction: string;
  reasoning: string;
  riskLevel: RiskLevel;
  estimatedImpact: {
    financial?: number;
    description: string;
  };
  alternatives?: Array<{
    action: string;
    reasoning: string;
  }>;
  requestedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface ApprovalResponse {
  requestId: string;
  decision: 'approved' | 'rejected' | 'modified';
  respondedBy: string;
  respondedAt: Date;
  feedback?: string;
  modifications?: Record<string, any>;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'discord' | 'webhook';
  config: Record<string, any>;
}

export class ApprovalQueue {
  constructor(
    supabaseClient: SupabaseClient,
    notificationChannels: NotificationChannel[]
  );

  /**
   * Add a task to approval queue
   */
  async requestApproval(request: Omit<ApprovalRequest, 'id' | 'requestedAt'>): Promise<string>;

  /**
   * Get all pending approvals
   */
  async getPending(): Promise<ApprovalRequest[]>;

  /**
   * Submit approval decision
   */
  async respond(response: Omit<ApprovalResponse, 'respondedAt'>): Promise<void>;

  /**
   * Get approval history for analysis
   */
  async getHistory(filters?: {
    taskType?: TaskType;
    decision?: 'approved' | 'rejected';
    since?: Date;
  }): Promise<Array<ApprovalRequest & ApprovalResponse>>;

  /**
   * Send notification about pending approval
   */
  async notifyPendingApproval(requestId: string): Promise<void>;

  /**
   * Auto-reject expired approvals
   */
  async processExpired(): Promise<number>;
}
```

---

### 5. Agents: Base Agent Interface

**File:** `src/agents/base-agent.ts`

```typescript
/**
 * Base interface all specialized agents implement
 */

export interface AgentCapability {
  taskType: TaskType;
  description: string;
  estimatedDuration?: number; // milliseconds
  requiredIntegrations: string[];
}

export interface AgentConfig {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  integrations: Record<string, Integration>;
  llmClient: AnthropicClient;
  decisionEngine: DecisionEngine;
  memory: MemorySystem;
}

export abstract class BaseAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig);

  /**
   * Check if this agent can handle a specific task
   */
  canHandle(taskType: TaskType): boolean;

  /**
   * Execute a task autonomously
   */
  abstract execute(task: TaskRequest): Promise<TaskResult>;

  /**
   * Get current agent status
   */
  getStatus(): {
    id: string;
    name: string;
    activeTasks: number;
    capabilities: AgentCapability[];
    isHealthy: boolean;
  };

  /**
   * Validate task data before execution
   */
  protected abstract validateTask(task: TaskRequest): Promise<void>;

  /**
   * Handle task execution errors
   */
  protected async handleError(taskId: string, error: Error): Promise<TaskResult>;
}
```

---

### 6. Agents: Marketing Agent

**File:** `src/agents/marketing-agent.ts`

```typescript
/**
 * Autonomous marketing operations agent
 */

export interface SocialPostRequest {
  platform: 'twitter' | 'linkedin' | 'facebook';
  content?: string; // If not provided, agent generates
  topic?: string;
  targetAudience?: string;
  includeMedia?: boolean;
  scheduledTime?: Date;
}

export interface ContentCreationRequest {
  type: 'blog' | 'case_study' | 'tutorial' | 'announcement';
  topic: string;
  targetKeywords?: string[];
  targetLength?: number; // words
  tone?: 'professional' | 'casual' | 'technical';
}

export interface EmailCampaignRequest {
  campaignType: 'onboarding' | 'engagement' | 'promotion' | 'newsletter';
  segment: string; // User segment from CRM
  subject?: string;
  content?: string;
  sendTime?: Date;
}

export class MarketingAgent extends BaseAgent {
  /**
   * Create and schedule social media post
   */
  async createSocialPost(request: SocialPostRequest): Promise<{
    postId: string;
    content: string;
    scheduledFor: Date;
    platform: string;
  }>;

  /**
   * Generate marketing content
   */
  async createContent(request: ContentCreationRequest): Promise<{
    content: string;
    metadata: {
      wordCount: number;
      readingTime: number;
      seoScore?: number;
    };
  }>;

  /**
   * Create and send email campaign
   */
  async createEmailCampaign(request: EmailCampaignRequest): Promise<{
    campaignId: string;
    recipientCount: number;
    scheduledFor: Date;
  }>;

  /**
   * Analyze marketing performance
   */
  async analyzePerformance(period: 'day' | 'week' | 'month'): Promise<{
    metrics: {
      socialEngagement: number;
      emailOpenRate: number;
      websiteTraffic: number;
      conversions: number;
    };
    insights: string[];
    recommendations: string[];
  }>;
}
```

---

### 7. Agents: Sales Agent

**File:** `src/agents/sales-agent.ts`

```typescript
/**
 * Autonomous sales operations agent
 */

export interface LeadQualificationRequest {
  leadId: string;
  source?: string;
}

export interface LeadScore {
  score: number; // 0-100
  category: 'hot' | 'warm' | 'cold';
  reasoning: string;
  recommendedAction: string;
  nextFollowUp?: Date;
}

export interface OutreachRequest {
  leadId: string;
  channel: 'email' | 'linkedin';
  context?: string;
}

export class SalesAgent extends BaseAgent {
  /**
   * Qualify and score incoming leads
   */
  async qualifyLead(request: LeadQualificationRequest): Promise<LeadScore>;

  /**
   * Send personalized outreach
   */
  async sendOutreach(request: OutreachRequest): Promise<{
    messageId: string;
    sentAt: Date;
    channel: string;
  }>;

  /**
   * Handle follow-up sequences
   */
  async scheduleFollowUp(leadId: string, delay: number): Promise<string>;

  /**
   * Update CRM with activity
   */
  async updateCRM(leadId: string, activity: {
    type: string;
    details: Record<string, any>;
  }): Promise<void>;

  /**
   * Generate sales insights
   */
  async analyzePipeline(): Promise<{
    totalLeads: number;
    byStage: Record<string, number>;
    conversionRates: Record<string, number>;
    projectedRevenue: number;
    insights: string[];
  }>;
}
```

---

### 8. Agents: Operations Agent

**File:** `src/agents/operations-agent.ts`

```typescript
/**
 * Autonomous operations and infrastructure agent
 */

export interface DataSyncRequest {
  source: string;
  destination: string;
  dataType: string;
  filters?: Record<string, any>;
}

export interface MonitoringAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export class OperationsAgent extends BaseAgent {
  /**
   * Sync data between systems
   */
  async syncData(request: DataSyncRequest): Promise<{
    recordsSynced: number;
    errors: any[];
    duration: number;
  }>;

  /**
   * Monitor system health
   */
  async checkSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    components: Array<{
      name: string;
      status: string;
      latency?: number;
    }>;
    alerts: MonitoringAlert[];
  }>;

  /**
   * Generate analytics reports
   */
  async generateAnalytics(period: 'day' | 'week' | 'month'): Promise<{
    metrics: Record<string, number>;
    trends: Array<{
      metric: string;
      direction: 'up' | 'down' | 'stable';
      change: number;
    }>;
    charts: Array<{
      type: string;
      data: any[];
    }>;
  }>;

  /**
   * Handle automated backups
   */
  async performBackup(targets: string[]): Promise<{
    backupId: string;
    size: number;
    duration: number;
  }>;

  /**
   * Respond to monitoring alerts
   */
  async handleAlert(alert: MonitoringAlert): Promise<{
    action: string;
    resolved: boolean;
    escalated: boolean;
  }>;
}
```

---

### 9. Agents: Support Agent

**File:** `src/agents/support-agent.ts`

```typescript
/**
 * Autonomous customer support agent
 */

export interface SupportTicket {
  id: string;
  customerId: string;
  channel: 'email' | 'chat' | 'discord';
  subject: string;
  message: string;
  priority: Priority;
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  tags: string[];
  createdAt: Date;
  assignedTo?: string;
}

export interface TicketResponse {
  ticketId: string;
  message: string;
  actionsTaken?: string[];
  resolved: boolean;
  escalated: boolean;
}

export class SupportAgent extends BaseAgent {
  /**
   * Categorize and route incoming ticket
   */
  async routeTicket(ticket: SupportTicket): Promise<{
    category: string;
    priority: Priority;
    assignTo: 'auto' | 'human';
    reasoning: string;
  }>;

  /**
   * Generate and send response to ticket
   */
  async respondToTicket(ticketId: string): Promise<TicketResponse>;

  /**
   * Search knowledge base for relevant articles
   */
  async searchKnowledgeBase(query: string): Promise<Array<{
    id: string;
    title: string;
    content: string;
    relevanceScore: number;
  }>>;

  /**
   * Create or update knowledge base article
   */
  async updateKnowledgeBase(article: {
    title: string;
    content: string;
    tags: string[];
    category: string;
  }): Promise<string>;

  /**
   * Analyze support metrics
   */
  async analyzeSupportMetrics(period: 'day' | 'week' | 'month'): Promise<{
    totalTickets: number;
    avgResponseTime: number; // minutes
    avgResolutionTime: number; // minutes
    satisfactionScore: number; // 0-5
    topIssues: Array<{
      category: string;
      count: number;
    }>;
    insights: string[];
  }>;
}
```

---

### 10. Integrations: Supabase Adapter

**File:** `src/integrations/supabase.ts`

```typescript
/**
 * Supabase integration for data persistence
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

export class SupabaseAdapter {
  constructor(config: SupabaseConfig);

  /**
   * Initialize database tables
   */
  async initializeTables(): Promise<void>;

  /**
   * Store task execution record
   */
  async storeTask(task: TaskRequest): Promise<void>;

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: TaskResult): Promise<void>;

  /**
   * Query tasks with filters
   */
  async queryTasks(filters: {
    type?: TaskType;
    status?: string;
    since?: Date;
    limit?: number;
  }): Promise<TaskResult[]>;

  /**
   * Store memory entry
   */
  async storeMemory(entry: MemoryEntry): Promise<string>;

  /**
   * Query memories
   */
  async queryMemories(options: QueryOptions): Promise<MemoryEntry[]>;

  /**
   * Store approval request
   */
  async storeApprovalRequest(request: ApprovalRequest): Promise<void>;

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<ApprovalRequest[]>;

  /**
   * Update approval with response
   */
  async updateApproval(requestId: string, response: ApprovalResponse): Promise<void>;
}
```

**Database Schema:**
```sql
-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  priority INTEGER NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL,
  result JSONB,
  error TEXT,
  agent_id TEXT,
  requested_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Memory table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  content JSONB NOT NULL,
  agent_id TEXT,
  task_id UUID REFERENCES tasks(id),
  tags TEXT[],
  importance DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approvals table
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id),
  task_type TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  estimated_impact JSONB,
  alternatives JSONB,
  decision TEXT,
  responded_by TEXT,
  feedback TEXT,
  modifications JSONB,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Decision rules table
CREATE TABLE decision_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_types TEXT[],
  condition JSONB NOT NULL,
  risk_level TEXT NOT NULL,
  requires_approval BOOLEAN NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_task_id ON memories(task_id);
CREATE INDEX idx_memories_created_at ON memories(created_at);
CREATE INDEX idx_approvals_task_id ON approvals(task_id);
CREATE INDEX idx_approvals_decision ON approvals(decision);
CREATE INDEX idx_approvals_requested_at ON approvals(requested_at);
```

---

### 11. Integrations: n8n Workflow Adapter

**File:** `src/integrations/n8n.ts`

```typescript
/**
 * n8n workflow integration for complex automations
 */

export interface N8nConfig {
  apiUrl: string;
  apiKey: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  data?: any;
  startedAt: Date;
  finishedAt?: Date;
}

export class N8nAdapter {
  constructor(config: N8nConfig);

  /**
   * Trigger a workflow
   */
  async triggerWorkflow(workflowId: string, data: Record<string, any>): Promise<WorkflowExecution>;

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution>;

  /**
   * List available workflows
   */
  async listWorkflows(): Promise<Array<{
    id: string;
    name: string;
    active: boolean;
  }>>;

  /**
   * Create webhook for event-driven triggers
   */
  async createWebhook(workflowId: string, path: string): Promise<{
    url: string;
    webhookId: string;
  }>;
}
```

**Pre-built Workflows to Create in n8n:**
1. `social-media-posting` - Post content to Twitter, LinkedIn, Facebook
2. `email-campaign-sender` - Send email campaigns via SendGrid/Mailgun
3. `lead-enrichment` - Enrich lead data from multiple sources
4. `crm-sync` - Sync data between HubSpot and Supabase
5. `support-ticket-routing` - Route tickets based on classification
6. `analytics-aggregation` - Aggregate analytics from multiple sources
7. `backup-automation` - Automated backup workflows

---

### 12. Integrations: Buffer Adapter

**File:** `src/integrations/buffer.ts`

```typescript
/**
 * Buffer integration for social media management
 */

export interface BufferConfig {
  accessToken: string;
  profileIds: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

export interface SocialPost {
  text: string;
  media?: Array<{
    url: string;
    alt?: string;
  }>;
  scheduledAt?: Date;
  profiles: string[]; // Profile IDs to post to
}

export class BufferAdapter {
  constructor(config: BufferConfig);

  /**
   * Create a post
   */
  async createPost(post: SocialPost): Promise<{
    id: string;
    profileIds: string[];
    scheduledAt: Date;
  }>;

  /**
   * Get post analytics
   */
  async getPostAnalytics(postId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    reach: number;
  }>;

  /**
   * List scheduled posts
   */
  async getScheduledPosts(profileId: string): Promise<Array<{
    id: string;
    text: string;
    scheduledAt: Date;
  }>>;

  /**
   * Delete scheduled post
   */
  async deletePost(postId: string): Promise<void>;
}
```

---

### 13. Integrations: HubSpot CRM Adapter

**File:** `src/integrations/hubspot.ts`

```typescript
/**
 * HubSpot CRM integration for lead and customer management
 */

export interface HubSpotConfig {
  accessToken: string;
  portalId: string;
}

export interface Contact {
  id?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  phone?: string;
  lifecyclestage?: 'lead' | 'opportunity' | 'customer';
  properties?: Record<string, any>;
}

export interface Deal {
  id?: string;
  dealname: string;
  amount: number;
  dealstage: string;
  closedate?: Date;
  contactId?: string;
}

export class HubSpotAdapter {
  constructor(config: HubSpotConfig);

  /**
   * Create or update contact
   */
  async upsertContact(contact: Contact): Promise<string>;

  /**
   * Get contact by email
   */
  async getContactByEmail(email: string): Promise<Contact | null>;

  /**
   * Create deal
   */
  async createDeal(deal: Deal): Promise<string>;

  /**
   * Update deal stage
   */
  async updateDealStage(dealId: string, stage: string): Promise<void>;

  /**
   * Log activity
   */
  async logActivity(contactId: string, activity: {
    type: 'email' | 'call' | 'meeting' | 'note';
    subject: string;
    body: string;
    timestamp?: Date;
  }): Promise<string>;

  /**
   * Get contact activities
   */
  async getContactActivities(contactId: string): Promise<Array<{
    type: string;
    subject: string;
    timestamp: Date;
  }>>;

  /**
   * Search contacts
   */
  async searchContacts(filters: {
    lifecyclestage?: string;
    createdate_gte?: Date;
    limit?: number;
  }): Promise<Contact[]>;
}
```

---

### 14. Integrations: Email Adapter

**File:** `src/integrations/email.ts`

```typescript
/**
 * Email integration (SendGrid or similar)
 */

export interface EmailConfig {
  provider: 'sendgrid' | 'mailgun' | 'ses';
  apiKey: string;
  fromAddress: string;
  fromName: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    type?: string;
  }>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

export class EmailAdapter {
  constructor(config: EmailConfig);

  /**
   * Send single email
   */
  async sendEmail(message: EmailMessage): Promise<{
    messageId: string;
    status: 'sent' | 'failed';
  }>;

  /**
   * Send bulk emails
   */
  async sendBulkEmail(messages: EmailMessage[]): Promise<{
    sent: number;
    failed: number;
    results: Array<{ email: string; status: string; error?: string }>;
  }>;

  /**
   * Send email from template
   */
  async sendTemplatedEmail(
    templateId: string,
    to: string,
    variables: Record<string, string>
  ): Promise<{ messageId: string }>;

  /**
   * Get email analytics
   */
  async getEmailStats(messageId: string): Promise<{
    delivered: boolean;
    opened: boolean;
    clicked: boolean;
    bounced: boolean;
    timestamp: Date;
  }>;
}
```

---

### 15. Utilities: Logger

**File:** `src/utils/logger.ts`

```typescript
/**
 * Structured logging utility
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  agentId?: string;
  taskId?: string;
  error?: Error;
}

export class Logger {
  constructor(serviceName: string);

  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): Logger;

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void;
}
```

---

### 16. Utilities: Error Handler

**File:** `src/utils/error-handler.ts`

```typescript
/**
 * Centralized error handling
 */

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  DECISION_ERROR = 'DECISION_ERROR',
  TASK_EXECUTION_ERROR = 'TASK_EXECUTION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class JarvisError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'JarvisError';
  }
}

export class ErrorHandler {
  constructor(logger: Logger);

  /**
   * Handle and log error
   */
  handle(error: Error | JarvisError, context?: Record<string, any>): void;

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: Error): boolean;

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: Error): string;

  /**
   * Report critical errors
   */
  reportCritical(error: Error, context: Record<string, any>): Promise<void>;
}
```

---

## Parallel Development Prompts

### Overview

The following prompts are designed to be executed **in parallel** by different Claude Code instances. Each prompt is self-contained with clear inputs/outputs and minimal dependencies.

**Execution Strategy:**
1. **Wave 1** (Zero Dependencies - Run First): Prompts 1-5
2. **Wave 2** (Low Dependencies - Run Second): Prompts 6-11
3. **Wave 3** (High Dependencies - Run Last): Prompts 12-15

---

### PROMPT 1: Initialize Project Structure & Configuration

**File:** `prompts/01-init-structure.md`

```markdown
# Prompt 1: Initialize Project Structure & Configuration

## Context
You are building Jarvis, an autonomous AI agent for DAWG AI. This is the foundation setup.

## Task
Initialize the complete project structure with TypeScript, configuration files, and utilities.

## Steps

1. Create directory structure:
```
/Jarvis-v0
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── CLAUDE.md
├── README.md
├── src/
│   ├── core/
│   ├── agents/
│   ├── integrations/
│   ├── utils/
│   └── types/
├── config/
├── docs/
└── tests/
```

2. Initialize Node.js project with these dependencies:
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "@supabase/supabase-js": "^2.48.0",
    "axios": "^1.7.0",
    "dotenv": "^16.4.0",
    "winston": "^3.17.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "tsx": "^4.21.0",
    "vitest": "^2.1.0"
  }
}
```

3. Create TypeScript configuration:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

4. Create `.env.example` with all required environment variables:
- ANTHROPIC_API_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY
- N8N_API_URL
- N8N_API_KEY
- BUFFER_ACCESS_TOKEN
- HUBSPOT_ACCESS_TOKEN
- SENDGRID_API_KEY
- LOG_LEVEL

5. Create comprehensive CLAUDE.md with:
- Project overview
- Architecture principles
- Decision framework
- Code conventions
- Security guidelines

## Output
- Fully initialized project structure
- All configuration files
- package.json with scripts (dev, build, test, lint)
- .gitignore with appropriate exclusions
- CLAUDE.md for future development context

## Acceptance Criteria
- [ ] Project structure matches specification
- [ ] TypeScript compiles without errors
- [ ] All dependencies install successfully
- [ ] .env.example contains all required variables
- [ ] CLAUDE.md is comprehensive (>500 words)
```

---

### PROMPT 2: Build Logger Utility

**File:** `prompts/02-logger-utility.md`

```markdown
# Prompt 2: Build Logger Utility

## Context
Jarvis needs structured logging for audit trails and debugging. This utility has zero dependencies on other Jarvis components.

## Task
Implement a production-ready logging system using Winston with structured output.

## API Contract Reference
See API Contracts section: "15. Utilities: Logger"

## Implementation Requirements

1. Create `src/utils/logger.ts` implementing the Logger class
2. Features:
   - Console and file transports
   - JSON structured logging
   - Log levels: DEBUG, INFO, WARN, ERROR
   - Contextual logging (agentId, taskId, etc.)
   - Child logger support
   - Log rotation (daily, max 14 days)

3. Output format:
```json
{
  "timestamp": "2025-10-15T12:00:00.000Z",
  "level": "info",
  "service": "jarvis",
  "message": "Task completed successfully",
  "context": {
    "taskId": "abc123",
    "agentId": "marketing-agent",
    "duration": 1234
  }
}
```

4. Create `src/utils/logger.test.ts` with tests:
   - Log level filtering
   - Context propagation
   - Child logger inheritance
   - File writing (mock filesystem)

## Example Usage
```typescript
import { Logger, LogLevel } from './utils/logger';

const logger = new Logger('orchestrator');
logger.info('Starting task', { taskId: '123' });

const childLogger = logger.child({ agentId: 'marketing' });
childLogger.debug('Processing request');
childLogger.error('Failed to execute', new Error('API timeout'));
```

## Output Files
- src/utils/logger.ts (complete implementation)
- src/utils/logger.test.ts (comprehensive tests)
- logs/ directory with .gitkeep

## Acceptance Criteria
- [ ] All methods from API contract implemented
- [ ] Logs to both console and file
- [ ] JSON format for production, pretty for development
- [ ] Test coverage >90%
- [ ] No external Jarvis dependencies
```

---

### PROMPT 3: Build Error Handler Utility

**File:** `prompts/03-error-handler.md`

```markdown
# Prompt 3: Build Error Handler Utility

## Context
Centralized error handling for Jarvis with categorization and recovery strategies.

## Task
Implement error handling system with custom error types and recovery logic.

## API Contract Reference
See API Contracts section: "16. Utilities: Error Handler"

## Implementation Requirements

1. Create `src/utils/error-handler.ts`:
   - JarvisError class with error codes
   - ErrorHandler class
   - Error code enumeration
   - Recovery strategies

2. Error Categories:
```typescript
VALIDATION_ERROR - Input validation failures (recoverable)
INTEGRATION_ERROR - External API failures (recoverable with retry)
DECISION_ERROR - Decision engine failures (escalate to human)
TASK_EXECUTION_ERROR - Task execution failures (depends on cause)
RATE_LIMIT_ERROR - API rate limits (recoverable with backoff)
AUTHENTICATION_ERROR - Auth failures (not recoverable)
NOT_FOUND - Resource not found (depends on context)
INTERNAL_ERROR - Unexpected errors (not recoverable)
```

3. Features:
   - Error wrapping with context
   - User-friendly messages
   - Recovery strategy determination
   - Integration with Logger
   - Error reporting for critical issues

4. Create tests for:
   - Error creation and properties
   - Recoverable vs non-recoverable detection
   - User message generation
   - Context preservation

## Example Usage
```typescript
import { JarvisError, ErrorCode, ErrorHandler } from './utils/error-handler';
import { Logger } from './utils/logger';

const logger = new Logger('test');
const errorHandler = new ErrorHandler(logger);

try {
  throw new JarvisError(
    ErrorCode.INTEGRATION_ERROR,
    'Failed to post to Buffer',
    { platform: 'twitter', retries: 3 },
    true // recoverable
  );
} catch (error) {
  errorHandler.handle(error, { taskId: '123' });

  if (errorHandler.isRecoverable(error)) {
    // Implement retry logic
  }
}
```

## Output Files
- src/utils/error-handler.ts
- src/utils/error-handler.test.ts
- src/types/errors.ts (type definitions)

## Acceptance Criteria
- [ ] All error codes defined
- [ ] JarvisError class implemented
- [ ] ErrorHandler class implemented
- [ ] Integration with Logger
- [ ] Test coverage >85%
- [ ] Clear documentation for each error code
```

---

### PROMPT 4: Build Supabase Integration

**File:** `prompts/04-supabase-integration.md`

```markdown
# Prompt 4: Build Supabase Integration

## Context
Supabase is the primary data store for Jarvis. This adapter handles all database operations.

## Task
Implement Supabase adapter with schema creation and CRUD operations.

## API Contract Reference
See API Contracts section: "10. Integrations: Supabase Adapter"

## Implementation Requirements

1. Create `src/integrations/supabase.ts`:
   - SupabaseAdapter class
   - Connection management
   - Schema initialization
   - CRUD operations for tasks, memories, approvals

2. Create database schema:
   - Use the SQL schema provided in API contract
   - Add migration files in `migrations/`
   - Create indexes for performance

3. Implement methods:
   - initializeTables()
   - storeTask(), updateTaskStatus(), queryTasks()
   - storeMemory(), queryMemories()
   - storeApprovalRequest(), getPendingApprovals(), updateApproval()

4. Features:
   - Connection pooling
   - Retry logic for transient failures
   - Query result pagination
   - Type-safe queries using TypeScript

5. Create `config/supabase-schema.sql` with complete schema

6. Create tests (use Supabase local dev):
   - Schema creation
   - CRUD operations
   - Query filtering
   - Error handling

## Example Usage
```typescript
import { SupabaseAdapter } from './integrations/supabase';

const supabase = new SupabaseAdapter({
  url: process.env.SUPABASE_URL!,
  anonKey: process.env.SUPABASE_ANON_KEY!,
});

await supabase.initializeTables();

await supabase.storeTask({
  id: '123',
  type: TaskType.MARKETING_SOCIAL_POST,
  priority: Priority.MEDIUM,
  data: { platform: 'twitter', content: 'Hello world' },
  requestedBy: 'system',
  timestamp: new Date(),
});

const tasks = await supabase.queryTasks({
  type: TaskType.MARKETING_SOCIAL_POST,
  limit: 10,
});
```

## Output Files
- src/integrations/supabase.ts
- src/integrations/supabase.test.ts
- config/supabase-schema.sql
- migrations/001_initial_schema.sql

## Acceptance Criteria
- [ ] All methods from API contract implemented
- [ ] Schema matches specification
- [ ] Proper error handling
- [ ] Connection pooling configured
- [ ] Tests use Supabase local instance
- [ ] Migration scripts executable
```

---

### PROMPT 5: Build Type Definitions

**File:** `prompts/05-type-definitions.md`

```markdown
# Prompt 5: Build Type Definitions

## Context
Centralized TypeScript type definitions for type safety across Jarvis.

## Task
Create comprehensive type definitions for all major interfaces and enums.

## Implementation Requirements

1. Create `src/types/index.ts` with exports from all type files

2. Create `src/types/tasks.ts`:
   - TaskRequest interface
   - TaskResult interface
   - TaskType enum
   - Priority enum

3. Create `src/types/agents.ts`:
   - AgentCapability interface
   - AgentConfig interface
   - Agent status types

4. Create `src/types/decisions.ts`:
   - DecisionContext interface
   - DecisionResult interface
   - DecisionRule interface
   - RiskLevel enum

5. Create `src/types/memory.ts`:
   - MemoryEntry interface
   - MemoryType enum
   - QueryOptions interface

6. Create `src/types/approvals.ts`:
   - ApprovalRequest interface
   - ApprovalResponse interface
   - NotificationChannel interface

7. Create `src/types/integrations.ts`:
   - Integration base interface
   - Platform-specific types (Buffer, HubSpot, etc.)

8. Use Zod for runtime validation:
   - Create Zod schemas for all major types
   - Export both TypeScript types and Zod schemas

## Example Structure
```typescript
// src/types/tasks.ts
import { z } from 'zod';

export enum TaskType {
  MARKETING_SOCIAL_POST = 'marketing.social.post',
  // ... other types
}

export const TaskRequestSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(TaskType),
  priority: z.number().min(0).max(3),
  data: z.record(z.any()),
  requestedBy: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
});

export type TaskRequest = z.infer<typeof TaskRequestSchema>;
```

## Output Files
- src/types/index.ts
- src/types/tasks.ts
- src/types/agents.ts
- src/types/decisions.ts
- src/types/memory.ts
- src/types/approvals.ts
- src/types/integrations.ts
- src/types/errors.ts

## Acceptance Criteria
- [ ] All types from API contracts defined
- [ ] Zod schemas for runtime validation
- [ ] Proper TypeScript strict mode compliance
- [ ] JSDoc comments for all interfaces
- [ ] Exported from src/types/index.ts
- [ ] No circular dependencies
```

---

### PROMPT 6: Build Buffer Integration

**File:** `prompts/06-buffer-integration.md`

```markdown
# Prompt 6: Build Buffer Integration

## Context
Buffer integration for social media posting automation.

## Dependencies
- Logger utility (Prompt 2)
- Error handler (Prompt 3)
- Type definitions (Prompt 5)

## Task
Implement Buffer API adapter for social media management.

## API Contract Reference
See API Contracts section: "12. Integrations: Buffer Adapter"

## Implementation Requirements

1. Create `src/integrations/buffer.ts`:
   - BufferAdapter class
   - API client with authentication
   - Post creation and scheduling
   - Analytics retrieval

2. Features:
   - Create posts with media
   - Schedule posts for specific times
   - Get post analytics
   - List scheduled posts
   - Delete/update posts

3. API Endpoints to implement:
   - POST /updates/create.json
   - GET /updates/:id.json
   - POST /updates/:id/destroy.json
   - GET /profiles/:id/updates/scheduled.json

4. Error handling:
   - Rate limiting (10 calls/min)
   - Invalid profile errors
   - Media upload failures

5. Create tests with mocked Buffer API:
   - Post creation success/failure
   - Scheduling logic
   - Analytics retrieval
   - Rate limit handling

## Example Usage
```typescript
import { BufferAdapter } from './integrations/buffer';

const buffer = new BufferAdapter({
  accessToken: process.env.BUFFER_ACCESS_TOKEN!,
  profileIds: {
    twitter: 'xxx',
    linkedin: 'yyy',
  },
});

const result = await buffer.createPost({
  text: 'Check out our new DAW features!',
  profiles: ['xxx', 'yyy'],
  scheduledAt: new Date('2025-10-16T10:00:00Z'),
});

console.log(`Posted to ${result.profileIds.length} profiles`);
```

## Output Files
- src/integrations/buffer.ts
- src/integrations/buffer.test.ts
- docs/buffer-setup.md (setup instructions)

## Acceptance Criteria
- [ ] All methods from API contract implemented
- [ ] Proper authentication
- [ ] Rate limiting handled
- [ ] Media upload support
- [ ] Error handling with JarvisError
- [ ] Comprehensive logging
- [ ] Test coverage >85%
```

---

### PROMPT 7: Build HubSpot Integration

**File:** `prompts/07-hubspot-integration.md`

```markdown
# Prompt 7: Build HubSpot Integration

## Context
HubSpot CRM integration for lead and customer management.

## Dependencies
- Logger utility (Prompt 2)
- Error handler (Prompt 3)
- Type definitions (Prompt 5)

## Task
Implement HubSpot API adapter for CRM operations.

## API Contract Reference
See API Contracts section: "13. Integrations: HubSpot CRM Adapter"

## Implementation Requirements

1. Create `src/integrations/hubspot.ts`:
   - HubSpotAdapter class
   - Contact management
   - Deal management
   - Activity logging

2. Features:
   - Create/update contacts
   - Search contacts
   - Create deals
   - Update deal stages
   - Log activities (emails, calls, notes)
   - Get contact history

3. API Endpoints:
   - POST /crm/v3/objects/contacts
   - PATCH /crm/v3/objects/contacts/:id
   - POST /crm/v3/objects/contacts/search
   - POST /crm/v3/objects/deals
   - POST /crm/v3/engagements
   - GET /crm/v3/objects/contacts/:id/associations

4. Error handling:
   - Rate limiting (100 calls/10 seconds)
   - Duplicate contact detection
   - Invalid property errors

5. Create tests with mocked HubSpot API

## Example Usage
```typescript
import { HubSpotAdapter } from './integrations/hubspot';

const hubspot = new HubSpotAdapter({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: 'your-portal-id',
});

const contactId = await hubspot.upsertContact({
  email: 'user@example.com',
  firstname: 'John',
  lastname: 'Doe',
  lifecyclestage: 'lead',
});

await hubspot.logActivity(contactId, {
  type: 'email',
  subject: 'Welcome to DAWG AI',
  body: 'Thanks for signing up!',
});
```

## Output Files
- src/integrations/hubspot.ts
- src/integrations/hubspot.test.ts
- docs/hubspot-setup.md

## Acceptance Criteria
- [ ] Contact CRUD operations
- [ ] Deal management
- [ ] Activity logging
- [ ] Search functionality
- [ ] Rate limiting handled
- [ ] Test coverage >85%
```

---

### PROMPT 8: Build Email Integration

**File:** `prompts/08-email-integration.md`

```markdown
# Prompt 8: Build Email Integration

## Context
Email sending adapter supporting SendGrid (primary) with fallback support for other providers.

## Dependencies
- Logger utility (Prompt 2)
- Error handler (Prompt 3)
- Type definitions (Prompt 5)

## Task
Implement email adapter with template support.

## API Contract Reference
See API Contracts section: "14. Integrations: Email Adapter"

## Implementation Requirements

1. Create `src/integrations/email.ts`:
   - EmailAdapter class
   - SendGrid API client
   - Template management
   - Bulk sending

2. Features:
   - Send single email
   - Send bulk emails (up to 1000 recipients)
   - Template-based emails
   - Attachment support
   - Email tracking (opens, clicks)

3. SendGrid API:
   - POST /v3/mail/send
   - POST /v3/mail/batch
   - GET /v3/messages/:id

4. Template system:
   - Support for dynamic variables
   - HTML and plain text versions
   - Template validation

5. Error handling:
   - Invalid email addresses
   - Rate limiting
   - Bounce handling

6. Create tests with mocked SendGrid API

## Example Usage
```typescript
import { EmailAdapter } from './integrations/email';

const email = new EmailAdapter({
  provider: 'sendgrid',
  apiKey: process.env.SENDGRID_API_KEY!,
  fromAddress: 'noreply@dawgai.com',
  fromName: 'DAWG AI',
});

await email.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to DAWG AI!',
  html: '<h1>Welcome!</h1><p>Get started with your free account.</p>',
});

// Template-based email
await email.sendTemplatedEmail(
  'welcome-template',
  'user@example.com',
  { firstName: 'John', trialDays: '14' }
);
```

## Output Files
- src/integrations/email.ts
- src/integrations/email.test.ts
- config/email-templates.json
- docs/email-setup.md

## Acceptance Criteria
- [ ] Single and bulk sending
- [ ] Template support
- [ ] Attachment handling
- [ ] Tracking integration
- [ ] Error handling
- [ ] Test coverage >85%
```

---

### PROMPT 9: Build n8n Integration

**File:** `prompts/09-n8n-integration.md`

```markdown
# Prompt 9: Build n8n Integration

## Context
n8n workflow automation integration for complex multi-step workflows.

## Dependencies
- Logger utility (Prompt 2)
- Error handler (Prompt 3)
- Type definitions (Prompt 5)

## Task
Implement n8n API adapter for workflow triggering and monitoring.

## API Contract Reference
See API Contracts section: "11. Integrations: n8n Workflow Adapter"

## Implementation Requirements

1. Create `src/integrations/n8n.ts`:
   - N8nAdapter class
   - Workflow triggering
   - Execution monitoring
   - Webhook management

2. Features:
   - Trigger workflows with data
   - Monitor execution status
   - List available workflows
   - Create webhooks for event-driven triggers

3. n8n API endpoints:
   - POST /webhook/:path (trigger workflow)
   - GET /executions/:id
   - GET /workflows
   - POST /workflows

4. Pre-built workflow specifications:
   - Document required workflows in `docs/n8n-workflows.md`
   - Include JSON workflow definitions
   - Setup instructions

5. Error handling:
   - Workflow not found
   - Execution failures
   - Timeout handling

6. Create tests with mocked n8n API

## Example Usage
```typescript
import { N8nAdapter } from './integrations/n8n';

const n8n = new N8nAdapter({
  apiUrl: process.env.N8N_API_URL!,
  apiKey: process.env.N8N_API_KEY!,
});

const execution = await n8n.triggerWorkflow('social-media-posting', {
  platform: 'twitter',
  content: 'New feature released!',
});

// Check status
const status = await n8n.getExecutionStatus(execution.id);
console.log(status.status); // 'success'
```

## Output Files
- src/integrations/n8n.ts
- src/integrations/n8n.test.ts
- docs/n8n-workflows.md
- config/n8n-workflows/ (JSON workflow definitions)

## Acceptance Criteria
- [ ] Workflow triggering
- [ ] Execution monitoring
- [ ] Webhook creation
- [ ] Workflow documentation
- [ ] Error handling
- [ ] Test coverage >80%
```

---

### PROMPT 10: Build Memory System

**File:** `prompts/10-memory-system.md`

```markdown
# Prompt 10: Build Memory System

## Context
Memory system for context retention and learning from past executions.

## Dependencies
- Supabase integration (Prompt 4)
- Logger utility (Prompt 2)
- Error handler (Prompt 3)
- Type definitions (Prompt 5)

## Task
Implement memory storage and retrieval with intelligent querying.

## API Contract Reference
See API Contracts section: "3. Core: Memory System"

## Implementation Requirements

1. Create `src/core/memory.ts`:
   - MemorySystem class
   - Storage and retrieval
   - Context aggregation
   - Importance scoring

2. Features:
   - Store typed memory entries
   - Query with flexible filters
   - Get task context (task + related memories)
   - Update importance dynamically
   - Prune old low-importance memories
   - Aggregate statistics

3. Memory importance scoring:
   - User feedback: 1.0
   - Decision outcomes: 0.8
   - Errors: 0.9
   - Task executions: 0.5
   - System state: 0.3

4. Context aggregation:
   - Gather related memories for decision-making
   - Find similar past tasks
   - Extract learned patterns

5. Create tests:
   - Storage and retrieval
   - Filtering logic
   - Context aggregation
   - Pruning logic
   - Statistics calculation

## Example Usage
```typescript
import { MemorySystem } from './core/memory';

const memory = new MemorySystem(supabaseClient);

// Store memory
await memory.store({
  type: MemoryType.TASK_EXECUTION,
  content: {
    taskType: 'marketing.social.post',
    result: 'success',
    engagement: { likes: 45, shares: 12 },
  },
  taskId: '123',
  agentId: 'marketing-agent',
  tags: ['social', 'twitter', 'success'],
  importance: 0.7,
});

// Query memories
const memories = await memory.query({
  type: MemoryType.TASK_EXECUTION,
  tags: ['social'],
  minImportance: 0.5,
  limit: 10,
});

// Get full context
const context = await memory.getTaskContext('123');
```

## Output Files
- src/core/memory.ts
- src/core/memory.test.ts
- docs/memory-system.md

## Acceptance Criteria
- [ ] All methods implemented
- [ ] Importance scoring system
- [ ] Context aggregation
- [ ] Query optimization
- [ ] Pruning logic
- [ ] Test coverage >85%
```

---

### PROMPT 11: Build Approval Queue

**File:** `prompts/11-approval-queue.md`

```markdown
# Prompt 11: Build Approval Queue

## Context
Human-in-the-loop approval workflow for high-risk autonomous decisions.

## Dependencies
- Supabase integration (Prompt 4)
- Email integration (Prompt 8)
- Logger utility (Prompt 2)
- Error handler (Prompt 3)
- Type definitions (Prompt 5)

## Task
Implement approval queue with notifications and expiration handling.

## API Contract Reference
See API Contracts section: "4. Core: Approval Queue"

## Implementation Requirements

1. Create `src/core/approval-queue.ts`:
   - ApprovalQueue class
   - Request submission
   - Notification sending
   - Response handling
   - Expiration management

2. Features:
   - Submit approval requests
   - Get pending approvals
   - Submit responses (approve/reject/modify)
   - Get approval history
   - Multi-channel notifications (email, Discord, webhook)
   - Auto-reject expired approvals

3. Notification channels:
   - Email (primary)
   - Discord webhook (optional)
   - Custom webhook (optional)

4. Approval UI considerations:
   - Generate approval links for email
   - Include context and alternatives
   - Show risk level and impact

5. Create tests:
   - Request submission
   - Notification delivery
   - Response handling
   - Expiration processing
   - History queries

## Example Usage
```typescript
import { ApprovalQueue } from './core/approval-queue';

const queue = new ApprovalQueue(supabaseClient, [
  { type: 'email', config: { /* ... */ } },
  { type: 'discord', config: { webhookUrl: '...' } },
]);

// Request approval
const requestId = await queue.requestApproval({
  taskId: '123',
  taskType: TaskType.MARKETING_EMAIL_CAMPAIGN,
  requestedAction: 'Send email to 5000 users',
  reasoning: 'New feature announcement',
  riskLevel: RiskLevel.MEDIUM,
  estimatedImpact: {
    financial: 0,
    description: 'May increase engagement or cause unsubscribes',
  },
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  metadata: { segment: 'active_users' },
});

// Get pending
const pending = await queue.getPending();

// Respond
await queue.respond({
  requestId,
  decision: 'approved',
  respondedBy: 'admin@dawgai.com',
  feedback: 'Looks good, timing is right',
});
```

## Output Files
- src/core/approval-queue.ts
- src/core/approval-queue.test.ts
- config/notification-templates.json
- docs/approval-workflow.md

## Acceptance Criteria
- [ ] All methods implemented
- [ ] Multi-channel notifications
- [ ] Expiration handling
- [ ] History tracking
- [ ] Email templates
- [ ] Test coverage >85%
```

---

### PROMPT 12: Build Decision Engine

**File:** `prompts/12-decision-engine.md`

```markdown
# Prompt 12: Build Decision Engine

## Context
Core decision-making system that determines if tasks can be executed autonomously.

## Dependencies
- Memory system (Prompt 10)
- Approval queue (Prompt 11)
- All integrations (Prompts 4, 6-9)
- Type definitions (Prompt 5)

## Task
Implement decision engine with Claude integration and learning capabilities.

## API Contract Reference
See API Contracts section: "2. Core: Decision Engine"

## Implementation Requirements

1. Create `src/core/decision-engine.ts`:
   - DecisionEngine class
   - Rule-based evaluation
   - LLM-assisted decision making
   - Learning from feedback

2. Features:
   - Evaluate task against rules
   - Use Claude for complex decisions
   - Calculate confidence scores
   - Estimate impact (financial, reputational)
   - Suggest alternatives
   - Learn from human feedback

3. Decision rules configuration:
   - Load from `config/decision-rules.json`
   - Dynamic rule updates
   - Rule priority/ordering

4. Claude integration:
   - Use Claude Sonnet for decision evaluation
   - Structured prompts with context
   - Parse Claude responses into DecisionResult

5. Learning mechanism:
   - Track approved/rejected decisions
   - Adjust confidence thresholds
   - Update rules based on patterns

6. Create tests:
   - Rule evaluation
   - Claude integration (mocked)
   - Learning from feedback
   - Confidence calculation

## Decision Prompt Template
```
You are an autonomous decision-making system for DAWG AI.

Task Type: {taskType}
Task Data: {JSON.stringify(taskData)}

Historical Context:
{pastSimilarTasks}

Decision Rules:
{applicableRules}

Evaluate whether this task should be:
1. EXECUTE - Safe to execute automatically
2. REQUEST_APPROVAL - Needs human approval
3. REJECT - Should not be executed

Provide:
- Action (execute/request_approval/reject)
- Confidence (0-1)
- Reasoning (2-3 sentences)
- Risk level (low/medium/high/critical)
- Estimated impact
- Alternative approaches if applicable

Response format: JSON
```

## Example Usage
```typescript
import { DecisionEngine } from './core/decision-engine';

const engine = new DecisionEngine(rules, anthropicClient);

const decision = await engine.evaluate({
  taskType: TaskType.MARKETING_EMAIL_CAMPAIGN,
  taskData: {
    segment: 'all_users',
    recipientCount: 5000,
    subject: 'New Feature!',
  },
  historicalData: pastCampaigns,
});

if (decision.action === 'execute') {
  // Execute task
} else if (decision.action === 'request_approval') {
  // Send to approval queue
}

// After human feedback
await engine.learnFromFeedback('task-123', decision, 'approved');
```

## Output Files
- src/core/decision-engine.ts
- src/core/decision-engine.test.ts
- config/decision-rules.json
- docs/decision-framework.md

## Acceptance Criteria
- [ ] Rule-based evaluation
- [ ] Claude integration
- [ ] Confidence scoring
- [ ] Impact estimation
- [ ] Learning mechanism
- [ ] Test coverage >80%
```

---

### PROMPT 13: Build Base Agent & Marketing Agent

**File:** `prompts/13-marketing-agent.md`

```markdown
# Prompt 13: Build Base Agent & Marketing Agent

## Context
Base agent interface and first specialized agent for marketing operations.

## Dependencies
- Decision engine (Prompt 12)
- Memory system (Prompt 10)
- Buffer integration (Prompt 6)
- Email integration (Prompt 8)
- All utilities and types

## Task
Implement BaseAgent abstract class and MarketingAgent with full automation capabilities.

## API Contract Reference
See API Contracts section: "5. Agents: Base Agent Interface" and "6. Agents: Marketing Agent"

## Implementation Requirements

1. Create `src/agents/base-agent.ts`:
   - BaseAgent abstract class
   - Common agent functionality
   - Error handling patterns
   - Status reporting

2. Create `src/agents/marketing-agent.ts`:
   - MarketingAgent extending BaseAgent
   - Social media posting
   - Content creation
   - Email campaigns
   - Performance analysis

3. Social media features:
   - Generate post content using Claude
   - Optimize for platform (Twitter 280 chars, LinkedIn longer)
   - Schedule posts via Buffer
   - Track engagement

4. Content creation:
   - Blog posts, tutorials, announcements
   - SEO optimization
   - Tone consistency
   - Target keyword integration

5. Email campaigns:
   - Segment selection
   - Subject line generation (A/B test ideas)
   - Content personalization
   - Send time optimization

6. Create tests:
   - BaseAgent functionality
   - Each MarketingAgent method
   - Integration with Buffer/Email
   - Error scenarios

## Example Usage
```typescript
import { MarketingAgent } from './agents/marketing-agent';

const agent = new MarketingAgent({
  id: 'marketing-agent',
  name: 'Marketing Agent',
  capabilities: [/* ... */],
  integrations: {
    buffer: bufferAdapter,
    email: emailAdapter,
  },
  llmClient: anthropicClient,
  decisionEngine,
  memory,
});

// Create social post
const post = await agent.createSocialPost({
  platform: 'twitter',
  topic: 'New MIDI import feature',
  targetAudience: 'music producers',
  scheduledTime: new Date('2025-10-16T14:00:00Z'),
});

// Create content
const content = await agent.createContent({
  type: 'blog',
  topic: 'Getting started with DAWG AI',
  targetKeywords: ['browser DAW', 'online music production'],
  tone: 'casual',
});
```

## Output Files
- src/agents/base-agent.ts
- src/agents/marketing-agent.ts
- src/agents/base-agent.test.ts
- src/agents/marketing-agent.test.ts
- docs/agents-overview.md

## Acceptance Criteria
- [ ] BaseAgent with all common functionality
- [ ] MarketingAgent with all features
- [ ] Claude integration for content
- [ ] Buffer integration for social
- [ ] Email integration for campaigns
- [ ] Test coverage >80%
```

---

### PROMPT 14: Build Sales & Support Agents

**File:** `prompts/14-sales-support-agents.md`

```markdown
# Prompt 14: Build Sales & Support Agents

## Context
Sales and support agents for autonomous lead management and customer service.

## Dependencies
- BaseAgent (Prompt 13)
- Decision engine (Prompt 12)
- HubSpot integration (Prompt 7)
- Email integration (Prompt 8)

## Task
Implement SalesAgent and SupportAgent with full automation.

## API Contract Reference
See API Contracts section: "7. Agents: Sales Agent" and "9. Agents: Support Agent"

## Implementation Requirements

### SalesAgent

1. Create `src/agents/sales-agent.ts`:
   - Lead qualification with scoring
   - Automated outreach
   - Follow-up sequences
   - CRM updates
   - Pipeline analysis

2. Lead scoring algorithm:
   - Company size (20 points)
   - Job title match (25 points)
   - Engagement level (30 points)
   - Intent signals (25 points)
   - Total: 0-100 score

3. Outreach personalization:
   - Use Claude for message generation
   - Reference company/role
   - Highlight relevant features
   - Clear call-to-action

4. Follow-up logic:
   - Day 1: Initial outreach
   - Day 3: First follow-up (if no response)
   - Day 7: Second follow-up
   - Day 14: Final follow-up
   - Stop if any response received

### SupportAgent

1. Create `src/agents/support-agent.ts`:
   - Ticket routing
   - Automated responses
   - Knowledge base search
   - KB article creation
   - Support metrics

2. Ticket routing rules:
   - Bug reports → High priority, engineering team
   - Billing issues → High priority, require approval for refunds
   - Feature requests → Low priority, product team
   - General questions → Auto-respond if KB article exists

3. Automated responses:
   - Search KB for relevant articles
   - Generate response using Claude + KB context
   - Include links to relevant documentation
   - Offer escalation if not helpful

4. KB management:
   - Identify common questions
   - Generate new KB articles
   - Update existing articles
   - Tag and categorize

5. Create tests for both agents

## Example Usage
```typescript
// Sales Agent
const salesAgent = new SalesAgent(config);

const leadScore = await salesAgent.qualifyLead({
  leadId: 'lead-123',
  source: 'website-signup',
});

if (leadScore.category === 'hot') {
  await salesAgent.sendOutreach({
    leadId: 'lead-123',
    channel: 'email',
  });
}

// Support Agent
const supportAgent = new SupportAgent(config);

const routing = await supportAgent.routeTicket(ticket);

if (routing.assignTo === 'auto') {
  const response = await supportAgent.respondToTicket(ticket.id);
}
```

## Output Files
- src/agents/sales-agent.ts
- src/agents/support-agent.ts
- src/agents/sales-agent.test.ts
- src/agents/support-agent.test.ts
- config/lead-scoring-rules.json
- config/ticket-routing-rules.json
- docs/sales-automation.md
- docs/support-automation.md

## Acceptance Criteria
- [ ] SalesAgent with lead scoring
- [ ] Automated outreach sequences
- [ ] SupportAgent with routing
- [ ] Automated responses
- [ ] KB management
- [ ] Test coverage >80%
```

---

### PROMPT 15: Build Operations Agent & Orchestrator

**File:** `prompts/15-operations-orchestrator.md`

```markdown
# Prompt 15: Build Operations Agent & Orchestrator

## Context
Operations agent for system management and orchestrator for coordinating all agents.

## Dependencies
- All agents (Prompts 13-14)
- Decision engine (Prompt 12)
- All integrations (Prompts 4, 6-11)

## Task
Implement OperationsAgent and Orchestrator to complete the Jarvis system.

## API Contract Reference
See API Contracts section: "1. Core: Orchestrator" and "8. Agents: Operations Agent"

## Implementation Requirements

### OperationsAgent

1. Create `src/agents/operations-agent.ts`:
   - Data synchronization
   - System health monitoring
   - Analytics generation
   - Backup automation
   - Alert handling

2. Data sync capabilities:
   - Supabase ↔ HubSpot contact sync
   - Analytics aggregation from Buffer, Email, HubSpot
   - Daily/weekly sync schedules

3. Monitoring:
   - API health checks
   - Error rate monitoring
   - Performance metrics
   - Alert generation

4. Analytics:
   - Aggregate metrics across systems
   - Trend analysis
   - Chart data generation
   - Report creation

### Orchestrator

1. Create `src/core/orchestrator.ts`:
   - Central coordination system
   - Task routing to agents
   - Event-driven architecture
   - Agent lifecycle management

2. Features:
   - Accept task submissions
   - Route to appropriate agent
   - Track task status
   - Handle agent errors
   - Coordinate multi-agent tasks

3. Task routing logic:
```typescript
TaskType.MARKETING_* → MarketingAgent
TaskType.SALES_* → SalesAgent
TaskType.OPS_* → OperationsAgent
TaskType.SUPPORT_* → SupportAgent
```

4. Event system:
   - Use EventEmitter
   - Emit events for all major actions
   - Allow external listeners

5. Graceful shutdown:
   - Complete in-progress tasks
   - Save state
   - Close connections

6. Create comprehensive tests

## Example Usage
```typescript
import { Orchestrator } from './core/orchestrator';
import { MarketingAgent, SalesAgent, SupportAgent, OperationsAgent } from './agents';

const orchestrator = new Orchestrator({
  agents: [marketingAgent, salesAgent, supportAgent, opsAgent],
  integrations: { /* ... */ },
  decisionEngine,
  approvalQueue,
  memory,
});

await orchestrator.initialize();

// Submit task
const taskId = await orchestrator.submitTask({
  id: crypto.randomUUID(),
  type: TaskType.MARKETING_SOCIAL_POST,
  priority: Priority.MEDIUM,
  data: {
    platform: 'twitter',
    topic: 'New feature release',
  },
  requestedBy: 'system',
  timestamp: new Date(),
});

// Track status
const status = await orchestrator.getTaskStatus(taskId);

// Listen for events
orchestrator.on('task:completed', (result) => {
  console.log(`Task ${result.taskId} completed`);
});
```

## Output Files
- src/agents/operations-agent.ts
- src/core/orchestrator.ts
- src/agents/operations-agent.test.ts
- src/core/orchestrator.test.ts
- src/index.ts (main entry point)
- docs/orchestration.md

## Acceptance Criteria
- [ ] OperationsAgent with all features
- [ ] Orchestrator with routing
- [ ] Event system functional
- [ ] Lifecycle management
- [ ] Integration tests
- [ ] Main entry point created
- [ ] Test coverage >80%
```

---

## Integration Specifications

### Environment Variables

Complete `.env` file structure:

```bash
# Core
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_KEY=eyJhb...

# n8n
N8N_API_URL=https://your-n8n-instance.com/api/v1
N8N_API_KEY=n8n_api_...

# Buffer
BUFFER_ACCESS_TOKEN=1/xxx...
BUFFER_PROFILE_TWITTER=xxx
BUFFER_PROFILE_LINKEDIN=yyy
BUFFER_PROFILE_FACEBOOK=zzz

# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-na1-...
HUBSPOT_PORTAL_ID=12345678

# SendGrid
SENDGRID_API_KEY=SG.xxx...
SENDGRID_FROM_EMAIL=noreply@dawgai.com
SENDGRID_FROM_NAME=DAWG AI

# Discord (optional, for notifications)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Approval notifications
APPROVAL_EMAIL=admin@dawgai.com
APPROVAL_EXPIRE_HOURS=24
```

---

### Configuration Files

#### config/decision-rules.json

```json
{
  "version": "1.0",
  "rules": [
    {
      "id": "low-cost-auto-approve",
      "taskTypes": ["*"],
      "condition": {
        "type": "financial_threshold",
        "maxAmount": 100
      },
      "riskLevel": "low",
      "requiresApproval": false,
      "description": "Auto-approve tasks with financial impact under $100"
    },
    {
      "id": "social-scheduled-auto",
      "taskTypes": ["marketing.social.post"],
      "condition": {
        "type": "scheduled",
        "minDelayHours": 2
      },
      "riskLevel": "low",
      "requiresApproval": false,
      "description": "Auto-approve scheduled social posts with 2+ hour delay"
    },
    {
      "id": "bulk-email-require-approval",
      "taskTypes": ["marketing.email.campaign"],
      "condition": {
        "type": "recipient_threshold",
        "minRecipients": 1000
      },
      "riskLevel": "medium",
      "requiresApproval": true,
      "description": "Require approval for bulk emails to 1000+ recipients"
    },
    {
      "id": "refund-approval-threshold",
      "taskTypes": ["support.refund"],
      "condition": {
        "type": "financial_threshold",
        "maxAmount": 50
      },
      "riskLevel": "medium",
      "requiresApproval": true,
      "description": "Require approval for refunds over $50"
    }
  ],
  "thresholds": {
    "autoApproveMaxSpend": 100,
    "bulkEmailMinRecipients": 1000,
    "autoRefundMax": 50,
    "discountMax": 10
  }
}
```

---

## Testing Requirements

### Test Structure

```
tests/
├── unit/
│   ├── utils/
│   ├── integrations/
│   ├── core/
│   └── agents/
├── integration/
│   ├── orchestrator.test.ts
│   ├── end-to-end-flows.test.ts
│   └── multi-agent.test.ts
└── fixtures/
    ├── mock-tasks.ts
    ├── mock-api-responses.ts
    └── test-data.ts
```

### Test Coverage Requirements

- Unit tests: >85% coverage
- Integration tests: All major workflows
- Mock external APIs (Buffer, HubSpot, SendGrid, n8n)
- Use Vitest for testing framework

### Key Test Scenarios

1. **Orchestrator Tests**:
   - Task routing to correct agent
   - Event emission
   - Error handling
   - Concurrent task execution

2. **Decision Engine Tests**:
   - Rule evaluation accuracy
   - Confidence scoring
   - Learning from feedback
   - Edge cases (missing data, invalid tasks)

3. **Agent Tests**:
   - Each capability independently
   - Integration with external APIs
   - Error recovery
   - Task validation

4. **Integration Tests**:
   - Full task flow: submission → routing → execution → completion
   - Approval workflow: task → needs approval → human approval → execution
   - Multi-agent coordination
   - Data synchronization across systems

5. **Memory System Tests**:
   - Storage and retrieval
   - Context aggregation
   - Pruning logic
   - Query performance

---

## Deployment & Operations

### Local Development Setup

```bash
# 1. Clone and install
git clone <repository>
cd Jarvis-v0
npm install

# 2. Setup Supabase (local)
npx supabase init
npx supabase start
npx supabase db reset

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Run migrations
npm run migrate

# 5. Start development server
npm run dev
```

### Production Deployment (Free/Low-Cost)

**Recommended Stack:**
- **Compute**: Railway.app (free tier: $5/month)
- **Database**: Supabase (free tier)
- **n8n**: n8n.cloud (free tier)
- **Monitoring**: UptimeRobot (free tier)

**Total Cost**: ~$5-10/month

### Monitoring & Logging

1. **Log aggregation**: Store logs in Supabase
2. **Error tracking**: Use logger with error levels
3. **Metrics**: Track via OperationsAgent analytics
4. **Alerts**: Discord webhooks for critical errors

---

## Success Metrics

### Week 1-2 (Foundation)
- [ ] All prompts 1-5 completed
- [ ] Project structure initialized
- [ ] Core utilities tested

### Week 3-4 (Integrations)
- [ ] All prompts 6-11 completed
- [ ] All integrations functional
- [ ] Memory and approval queue working

### Week 5-6 (Agents)
- [ ] All prompts 12-14 completed
- [ ] All agents implemented
- [ ] Decision engine operational

### Week 7-8 (Orchestration)
- [ ] Prompt 15 completed
- [ ] Full system integration
- [ ] End-to-end testing passed

### Week 9-10 (Refinement)
- [ ] Production deployment
- [ ] Monitoring configured
- [ ] Documentation complete
- [ ] First autonomous tasks executed

---

## Next Steps

1. **Prepare for parallel execution**:
   - Create separate directories/branches for each prompt
   - Assign prompts to different Claude Code instances
   - Set up shared repository for integration

2. **Wave 1 execution** (Start immediately):
   - Run prompts 1-5 in parallel
   - These have zero dependencies
   - Estimated time: 2-4 hours per prompt

3. **Wave 2 execution** (After Wave 1):
   - Run prompts 6-11 in parallel
   - Wait for completion of dependencies
   - Estimated time: 3-6 hours per prompt

4. **Wave 3 execution** (After Wave 2):
   - Run prompts 12-15 sequentially or in pairs
   - Requires most dependencies
   - Estimated time: 4-8 hours per prompt

5. **Integration phase**:
   - Combine all modules
   - Run integration tests
   - Fix any interface mismatches
   - Deploy and test end-to-end

---

## Appendix: Quick Reference

### Task Types by Agent

**MarketingAgent**:
- MARKETING_SOCIAL_POST
- MARKETING_CONTENT_CREATE
- MARKETING_EMAIL_CAMPAIGN

**SalesAgent**:
- SALES_LEAD_QUALIFY
- SALES_OUTREACH
- SALES_FOLLOW_UP

**OperationsAgent**:
- OPS_DATA_SYNC
- OPS_ANALYTICS
- OPS_MONITORING

**SupportAgent**:
- SUPPORT_TICKET_RESPOND
- SUPPORT_TICKET_ROUTE
- SUPPORT_KB_UPDATE

### Priority Levels

- **CRITICAL (0)**: Handle immediately (security, outages)
- **HIGH (1)**: Handle within 5 minutes (support tickets, hot leads)
- **MEDIUM (2)**: Handle within 1 hour (scheduled posts, analytics)
- **LOW (3)**: Handle within 24 hours (KB updates, reports)

### Risk Levels

- **LOW**: Fully automated, no approval needed
- **MEDIUM**: Automated with notification
- **HIGH**: Requires approval before execution
- **CRITICAL**: Requires approval + additional verification

---

**End of Design Document**
