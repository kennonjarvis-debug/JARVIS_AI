# Jarvis API Quick Reference

**Fast lookup for interfaces, types, and method signatures while coding**

---

## Core Types

### Task Types
```typescript
enum TaskType {
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

enum Priority {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
```

### Task Request/Result
```typescript
interface TaskRequest {
  id: string;
  type: TaskType;
  priority: Priority;
  data: Record<string, any>;
  requestedBy: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface TaskResult {
  taskId: string;
  status: 'completed' | 'failed' | 'pending_approval' | 'in_progress';
  result?: any;
  error?: Error;
  timestamp: Date;
  agentId: string;
}
```

---

## Orchestrator

```typescript
class Orchestrator {
  constructor(config: OrchestratorConfig);

  async submitTask(request: TaskRequest): Promise<string>;
  async routeTask(taskId: string): Promise<void>;
  async getTaskStatus(taskId: string): Promise<TaskResult>;
  async cancelTask(taskId: string): Promise<void>;
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
}
```

**Events:**
- `task:submitted`
- `task:routed`
- `task:completed`
- `task:failed`
- `task:needs_approval`

---

## Decision Engine

```typescript
interface DecisionContext {
  taskType: TaskType;
  taskData: Record<string, any>;
  historicalData?: any[];
  userPreferences?: Record<string, any>;
  currentState?: Record<string, any>;
}

interface DecisionResult {
  action: 'execute' | 'request_approval' | 'reject';
  confidence: number; // 0-1
  reasoning: string;
  riskLevel: RiskLevel;
  estimatedImpact?: {
    financial?: number;
    reputational?: 'low' | 'medium' | 'high';
    reversibility?: boolean;
  };
  alternatives?: Array<{ action: string; reasoning: string }>;
}

class DecisionEngine {
  constructor(rules: DecisionRule[], llmClient: AnthropicClient);

  async evaluate(context: DecisionContext): Promise<DecisionResult>;
  async addRule(rule: DecisionRule): Promise<void>;
  async updateRule(ruleId: string, updates: Partial<DecisionRule>): Promise<void>;
  getRulesForTaskType(taskType: TaskType): DecisionRule[];
  async learnFromFeedback(
    taskId: string,
    decision: DecisionResult,
    humanFeedback: 'approved' | 'rejected',
    reason?: string
  ): Promise<void>;
}
```

---

## Memory System

```typescript
enum MemoryType {
  TASK_EXECUTION = 'task_execution',
  USER_FEEDBACK = 'user_feedback',
  DECISION_OUTCOME = 'decision_outcome',
  SYSTEM_STATE = 'system_state',
  LEARNED_PATTERN = 'learned_pattern',
  ERROR = 'error',
}

interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: any;
  timestamp: Date;
  agentId?: string;
  taskId?: string;
  tags: string[];
  importance: number; // 0-1
}

class MemorySystem {
  constructor(supabaseClient: SupabaseClient);

  async store(entry: Omit<MemoryEntry, 'id'>): Promise<string>;
  async query(options: QueryOptions): Promise<MemoryEntry[]>;
  async getTaskContext(taskId: string): Promise<{
    task: TaskRequest;
    relatedMemories: MemoryEntry[];
    previousSimilarTasks: TaskResult[];
  }>;
  async updateImportance(memoryId: string, importance: number): Promise<void>;
  async prune(olderThan: Date, maxImportance: number): Promise<number>;
}
```

---

## Approval Queue

```typescript
interface ApprovalRequest {
  id: string;
  taskId: string;
  taskType: TaskType;
  requestedAction: string;
  reasoning: string;
  riskLevel: RiskLevel;
  estimatedImpact: { financial?: number; description: string };
  alternatives?: Array<{ action: string; reasoning: string }>;
  requestedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

interface ApprovalResponse {
  requestId: string;
  decision: 'approved' | 'rejected' | 'modified';
  respondedBy: string;
  respondedAt: Date;
  feedback?: string;
  modifications?: Record<string, any>;
}

class ApprovalQueue {
  constructor(
    supabaseClient: SupabaseClient,
    notificationChannels: NotificationChannel[]
  );

  async requestApproval(request: Omit<ApprovalRequest, 'id' | 'requestedAt'>): Promise<string>;
  async getPending(): Promise<ApprovalRequest[]>;
  async respond(response: Omit<ApprovalResponse, 'respondedAt'>): Promise<void>;
  async getHistory(filters?: {...}): Promise<Array<ApprovalRequest & ApprovalResponse>>;
  async notifyPendingApproval(requestId: string): Promise<void>;
  async processExpired(): Promise<number>;
}
```

---

## Base Agent

```typescript
interface AgentConfig {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  integrations: Record<string, Integration>;
  llmClient: AnthropicClient;
  decisionEngine: DecisionEngine;
  memory: MemorySystem;
}

abstract class BaseAgent {
  constructor(config: AgentConfig);

  canHandle(taskType: TaskType): boolean;
  abstract execute(task: TaskRequest): Promise<TaskResult>;
  getStatus(): {
    id: string;
    name: string;
    activeTasks: number;
    capabilities: AgentCapability[];
    isHealthy: boolean;
  };
  protected abstract validateTask(task: TaskRequest): Promise<void>;
  protected async handleError(taskId: string, error: Error): Promise<TaskResult>;
}
```

---

## Marketing Agent

```typescript
class MarketingAgent extends BaseAgent {
  async createSocialPost(request: SocialPostRequest): Promise<{
    postId: string;
    content: string;
    scheduledFor: Date;
    platform: string;
  }>;

  async createContent(request: ContentCreationRequest): Promise<{
    content: string;
    metadata: {
      wordCount: number;
      readingTime: number;
      seoScore?: number;
    };
  }>;

  async createEmailCampaign(request: EmailCampaignRequest): Promise<{
    campaignId: string;
    recipientCount: number;
    scheduledFor: Date;
  }>;

  async analyzePerformance(period: 'day' | 'week' | 'month'): Promise<{
    metrics: { ... };
    insights: string[];
    recommendations: string[];
  }>;
}

interface SocialPostRequest {
  platform: 'twitter' | 'linkedin' | 'facebook';
  content?: string;
  topic?: string;
  targetAudience?: string;
  includeMedia?: boolean;
  scheduledTime?: Date;
}
```

---

## Sales Agent

```typescript
class SalesAgent extends BaseAgent {
  async qualifyLead(request: LeadQualificationRequest): Promise<LeadScore>;
  async sendOutreach(request: OutreachRequest): Promise<{
    messageId: string;
    sentAt: Date;
    channel: string;
  }>;
  async scheduleFollowUp(leadId: string, delay: number): Promise<string>;
  async updateCRM(leadId: string, activity: {...}): Promise<void>;
  async analyzePipeline(): Promise<{ ... }>;
}

interface LeadScore {
  score: number; // 0-100
  category: 'hot' | 'warm' | 'cold';
  reasoning: string;
  recommendedAction: string;
  nextFollowUp?: Date;
}
```

---

## Support Agent

```typescript
class SupportAgent extends BaseAgent {
  async routeTicket(ticket: SupportTicket): Promise<{
    category: string;
    priority: Priority;
    assignTo: 'auto' | 'human';
    reasoning: string;
  }>;

  async respondToTicket(ticketId: string): Promise<TicketResponse>;

  async searchKnowledgeBase(query: string): Promise<Array<{
    id: string;
    title: string;
    content: string;
    relevanceScore: number;
  }>>;

  async updateKnowledgeBase(article: {...}): Promise<string>;
  async analyzeSupportMetrics(period: 'day' | 'week' | 'month'): Promise<{ ... }>;
}

interface SupportTicket {
  id: string;
  customerId: string;
  channel: 'email' | 'chat' | 'discord';
  subject: string;
  message: string;
  priority: Priority;
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  tags: string[];
  createdAt: Date;
}
```

---

## Operations Agent

```typescript
class OperationsAgent extends BaseAgent {
  async syncData(request: DataSyncRequest): Promise<{
    recordsSynced: number;
    errors: any[];
    duration: number;
  }>;

  async checkSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    components: Array<{ name: string; status: string; latency?: number }>;
    alerts: MonitoringAlert[];
  }>;

  async generateAnalytics(period: 'day' | 'week' | 'month'): Promise<{ ... }>;
  async performBackup(targets: string[]): Promise<{ ... }>;
  async handleAlert(alert: MonitoringAlert): Promise<{ ... }>;
}
```

---

## Supabase Adapter

```typescript
class SupabaseAdapter {
  constructor(config: SupabaseConfig);

  async initializeTables(): Promise<void>;
  async storeTask(task: TaskRequest): Promise<void>;
  async updateTaskStatus(taskId: string, status: TaskResult): Promise<void>;
  async queryTasks(filters: {...}): Promise<TaskResult[]>;
  async storeMemory(entry: MemoryEntry): Promise<string>;
  async queryMemories(options: QueryOptions): Promise<MemoryEntry[]>;
  async storeApprovalRequest(request: ApprovalRequest): Promise<void>;
  async getPendingApprovals(): Promise<ApprovalRequest[]>;
  async updateApproval(requestId: string, response: ApprovalResponse): Promise<void>;
}
```

---

## Buffer Adapter

```typescript
class BufferAdapter {
  constructor(config: BufferConfig);

  async createPost(post: SocialPost): Promise<{
    id: string;
    profileIds: string[];
    scheduledAt: Date;
  }>;

  async getPostAnalytics(postId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    reach: number;
  }>;

  async getScheduledPosts(profileId: string): Promise<Array<{ ... }>>;
  async deletePost(postId: string): Promise<void>;
}

interface SocialPost {
  text: string;
  media?: Array<{ url: string; alt?: string }>;
  scheduledAt?: Date;
  profiles: string[];
}
```

---

## HubSpot Adapter

```typescript
class HubSpotAdapter {
  constructor(config: HubSpotConfig);

  async upsertContact(contact: Contact): Promise<string>;
  async getContactByEmail(email: string): Promise<Contact | null>;
  async createDeal(deal: Deal): Promise<string>;
  async updateDealStage(dealId: string, stage: string): Promise<void>;
  async logActivity(contactId: string, activity: {...}): Promise<string>;
  async getContactActivities(contactId: string): Promise<Array<{ ... }>>;
  async searchContacts(filters: {...}): Promise<Contact[]>;
}

interface Contact {
  id?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  phone?: string;
  lifecyclestage?: 'lead' | 'opportunity' | 'customer';
  properties?: Record<string, any>;
}
```

---

## Email Adapter

```typescript
class EmailAdapter {
  constructor(config: EmailConfig);

  async sendEmail(message: EmailMessage): Promise<{
    messageId: string;
    status: 'sent' | 'failed';
  }>;

  async sendBulkEmail(messages: EmailMessage[]): Promise<{
    sent: number;
    failed: number;
    results: Array<{ ... }>;
  }>;

  async sendTemplatedEmail(
    templateId: string,
    to: string,
    variables: Record<string, string>
  ): Promise<{ messageId: string }>;

  async getEmailStats(messageId: string): Promise<{ ... }>;
}

interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{ ... }>;
}
```

---

## n8n Adapter

```typescript
class N8nAdapter {
  constructor(config: N8nConfig);

  async triggerWorkflow(workflowId: string, data: Record<string, any>): Promise<WorkflowExecution>;
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution>;
  async listWorkflows(): Promise<Array<{
    id: string;
    name: string;
    active: boolean;
  }>>;
  async createWebhook(workflowId: string, path: string): Promise<{
    url: string;
    webhookId: string;
  }>;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  data?: any;
  startedAt: Date;
  finishedAt?: Date;
}
```

---

## Logger

```typescript
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  constructor(serviceName: string);

  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  child(context: Record<string, any>): Logger;
  setLevel(level: LogLevel): void;
}
```

---

## Error Handler

```typescript
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  DECISION_ERROR = 'DECISION_ERROR',
  TASK_EXECUTION_ERROR = 'TASK_EXECUTION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

class JarvisError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>,
    public recoverable: boolean = true
  );
}

class ErrorHandler {
  constructor(logger: Logger);

  handle(error: Error | JarvisError, context?: Record<string, any>): void;
  isRecoverable(error: Error): boolean;
  getUserMessage(error: Error): string;
  reportCritical(error: Error, context: Record<string, any>): Promise<void>;
}
```

---

## Environment Variables

```bash
# Core
NODE_ENV=production
LOG_LEVEL=info

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_KEY=eyJhb...

# n8n
N8N_API_URL=https://your-instance.com/api/v1
N8N_API_KEY=n8n_api_...

# Buffer
BUFFER_ACCESS_TOKEN=1/xxx...
BUFFER_PROFILE_TWITTER=xxx
BUFFER_PROFILE_LINKEDIN=yyy

# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-na1-...
HUBSPOT_PORTAL_ID=12345678

# SendGrid
SENDGRID_API_KEY=SG.xxx...
SENDGRID_FROM_EMAIL=noreply@dawgai.com
SENDGRID_FROM_NAME=DAWG AI

# Approvals
APPROVAL_EMAIL=admin@dawgai.com
APPROVAL_EXPIRE_HOURS=24
```

---

## Common Patterns

### Task Submission
```typescript
const taskId = await orchestrator.submitTask({
  id: crypto.randomUUID(),
  type: TaskType.MARKETING_SOCIAL_POST,
  priority: Priority.MEDIUM,
  data: { platform: 'twitter', topic: 'New feature' },
  requestedBy: 'system',
  timestamp: new Date(),
});
```

### Decision Evaluation
```typescript
const decision = await decisionEngine.evaluate({
  taskType: TaskType.MARKETING_EMAIL_CAMPAIGN,
  taskData: { recipientCount: 5000 },
  historicalData: pastCampaigns,
});

if (decision.action === 'execute') {
  // Execute
} else if (decision.action === 'request_approval') {
  await approvalQueue.requestApproval({ ... });
}
```

### Memory Storage
```typescript
await memory.store({
  type: MemoryType.TASK_EXECUTION,
  content: { result: 'success', metrics: { ... } },
  taskId: '123',
  agentId: 'marketing-agent',
  tags: ['social', 'twitter'],
  importance: 0.7,
});
```

### Agent Execution
```typescript
const agent = new MarketingAgent(config);
const result = await agent.execute(task);

if (result.status === 'completed') {
  console.log('Success:', result.result);
} else if (result.status === 'failed') {
  console.error('Error:', result.error);
}
```

---

## Testing Patterns

### Unit Test
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MarketingAgent', () => {
  it('should create social post', async () => {
    const agent = new MarketingAgent(mockConfig);
    const result = await agent.createSocialPost({
      platform: 'twitter',
      content: 'Test post',
    });
    expect(result.postId).toBeDefined();
  });
});
```

### Integration Test
```typescript
describe('End-to-end task flow', () => {
  it('should execute task from submission to completion', async () => {
    const taskId = await orchestrator.submitTask(testTask);
    await sleep(1000); // Wait for processing
    const status = await orchestrator.getTaskStatus(taskId);
    expect(status.status).toBe('completed');
  });
});
```

---

**Keep this reference open while coding for quick lookups!**
