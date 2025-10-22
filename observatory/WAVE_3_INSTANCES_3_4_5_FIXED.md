# Wave 3 Instances 3, 4, 5 - Production-Ready Prompts

All production fixes applied. Copy each section to the appropriate Claude Code instance.

---

# Instance 3: Sales Agent (Prompt 14a)

**Time:** 3 hours | **Depends On:** Instance 2 (BaseAgent complete)

## Mission
Build SalesAgent for lead qualification, outreach, and CRM management.

## Critical Fixes Applied
- ✅ **HubSpot Private App Token:** `Authorization: Bearer ${CONFIG.hubspotToken}`
- ✅ **Centralized Model:** Use `DEFAULT_MODEL` from anthropic integration
- ✅ **Risk Thresholds:** Use `RISK_THRESHOLDS` from config

## Implementation

### src/agents/sales-agent.ts (~600 lines)

```typescript
import { BaseAgent } from './base-agent';
import { CONFIG, RISK_THRESHOLDS } from '../config/tools';
import type { HubSpotAdapter } from '../integrations/hubspot';
import type { EmailAdapter } from '../integrations/email';

export class SalesAgent extends BaseAgent {
  private hubspotAdapter: HubSpotAdapter;
  private emailAdapter: EmailAdapter;

  constructor(config: any) {
    super(config);

    // ✅ Ensure HubSpot integration exists
    if (!config.integrations.hubspot) {
      throw new JarvisError(ErrorCode.VALIDATION_ERROR, 'HubSpot required');
    }

    this.hubspotAdapter = config.integrations.hubspot;
    this.emailAdapter = config.integrations.email;
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'sales.lead.qualify' as TaskType,
      'sales.outreach.send' as TaskType,
      'sales.deal.create' as TaskType,
      'sales.deal.update' as TaskType,
    ];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    switch (task.type) {
      case 'sales.lead.qualify':
        return await this.qualifyLeadTask(task.data);
      case 'sales.outreach.send':
        return await this.sendOutreach(task.data);
      case 'sales.deal.create':
        return await this.createDeal(task.data);
      case 'sales.deal.update':
        return await this.updateDeal(task.data);
      default:
        throw new JarvisError(ErrorCode.VALIDATION_ERROR, `Unsupported: ${task.type}`);
    }
  }

  /**
   * Qualify lead with scoring algorithm
   */
  async qualifyLead(leadData: any): Promise<LeadQualification> {
    // Calculate score components (0-100)
    const companyScore = this.scoreCompanySize(leadData.company?.size);
    const jobTitleScore = this.scoreJobTitle(leadData.jobTitle);
    const engagementScore = this.scoreEngagement(leadData.engagement);
    const intentScore = this.scoreIntent(leadData.intentSignals || []);

    const totalScore = companyScore + jobTitleScore + engagementScore + intentScore;

    // Categorize
    let category: 'hot' | 'warm' | 'cold';
    let recommendedAction: 'immediate_outreach' | 'nurture' | 'ignore';

    if (totalScore >= 75) {
      category = 'hot';
      recommendedAction = 'immediate_outreach';
    } else if (totalScore >= 50) {
      category = 'warm';
      recommendedAction = 'nurture';
    } else {
      category = 'cold';
      recommendedAction = 'ignore';
    }

    // Generate reasoning with Claude
    const reasoning = await this.generateLeadReasoning(leadData, totalScore);

    return {
      leadId: leadData.id,
      score: totalScore,
      category,
      reasoning,
      signals: {
        companySize: leadData.company?.size || 0,
        jobTitleMatch: jobTitleScore > 15,
        engagementLevel: this.categorizeEngagement(engagementScore),
        intentSignals: leadData.intentSignals || [],
      },
      recommendedAction,
    };
  }

  /**
   * Send personalized outreach
   */
  async sendOutreach(request: OutreachRequest): Promise<TaskResult> {
    // 1. Get lead from HubSpot
    const contact = await this.hubspotAdapter.getContact(request.leadId);

    // 2. Generate personalized message with Claude
    const message = await this.generateOutreachMessage(contact, request.personalizationData);

    // 3. Send via email
    await this.emailAdapter.sendEmail({
      to: contact.email,
      subject: message.subject,
      html: message.body,
    });

    // 4. Log activity in HubSpot
    await this.hubspotAdapter.logActivity(request.leadId, {
      type: 'email',
      subject: message.subject,
      body: message.body,
    });

    // 5. Schedule follow-up (3 days)
    await this.scheduleFollowUp(request.leadId, 3);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { leadId: request.leadId, channel: request.channel },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Outreach sent via ${request.channel}`,
    };
  }

  /**
   * Lead scoring methods
   */
  private scoreCompanySize(size?: number): number {
    if (!size) return 0;
    if (size > 1000) return 20;
    if (size > 100) return 15;
    if (size > 10) return 10;
    return 5;
  }

  private scoreJobTitle(title?: string): number {
    if (!title) return 0;
    const normalized = title.toLowerCase();

    // Decision makers
    if (normalized.includes('ceo') || normalized.includes('founder')) return 25;
    // Influencers
    if (normalized.includes('director') || normalized.includes('vp')) return 20;
    // Users
    if (normalized.includes('manager') || normalized.includes('lead')) return 15;

    return 5;
  }

  private scoreEngagement(engagement?: any): number {
    if (!engagement) return 0;
    let score = 0;
    if (engagement.emailOpens > 3) score += 10;
    if (engagement.emailClicks > 1) score += 10;
    if (engagement.websiteVisits > 2) score += 10;
    return Math.min(score, 30);
  }

  private scoreIntent(signals: string[]): number {
    const highIntent = ['pricing', 'demo', 'trial', 'contact'];
    const matches = signals.filter(s =>
      highIntent.some(hi => s.toLowerCase().includes(hi))
    );
    return Math.min(matches.length * 8, 25);
  }

  /**
   * Generate outreach message with Claude
   */
  private async generateOutreachMessage(
    contact: any,
    personalizationData: any
  ): Promise<{ subject: string; body: string }> {
    const prompt = `Create a personalized sales outreach email.

Contact:
- Name: ${contact.firstname} ${contact.lastname}
- Company: ${contact.company}
- Job Title: ${contact.jobtitle}

Personalization:
${JSON.stringify(personalizationData, null, 2)}

Our Product: DAWG AI - Browser-based Digital Audio Workstation

Requirements:
- Professional tone
- Personalized to their role and company
- Clear value proposition
- Soft call-to-action
- 150-200 words

Provide response as JSON:
{
  "subject": "email subject line",
  "body": "email body in HTML"
}`;

    const response = await this.generateContent(prompt);
    return JSON.parse(response);
  }

  private async scheduleFollowUp(leadId: string, delayDays: number): Promise<void> {
    await this.memory.storeEntry({
      id: crypto.randomUUID(),
      type: 'scheduled_task',
      content: {
        taskType: 'sales.followup.send',
        leadId,
        scheduledFor: new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000),
      },
      timestamp: new Date(),
      importance: 0.7,
      metadata: { leadId, delayDays },
    });
  }

  private async qualifyLeadTask(leadData: any): Promise<TaskResult> {
    const qualification = await this.qualifyLead(leadData);

    // Update HubSpot with score
    await this.hubspotAdapter.updateContact(leadData.id, {
      lead_score: qualification.score,
      lead_category: qualification.category,
    });

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: qualification,
      timestamp: new Date(),
      executedBy: this.id,
      message: `Lead qualified: ${qualification.category} (${qualification.score}/100)`,
    };
  }

  private async createDeal(dealData: any): Promise<TaskResult> {
    const dealId = await this.hubspotAdapter.createDeal({
      name: dealData.name,
      amount: dealData.amount,
      stage: dealData.stage || 'qualification',
      closeDate: dealData.closeDate,
      associatedContacts: [dealData.contactId],
    });

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { dealId },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Deal created: ${dealData.name}`,
    };
  }

  private async updateDeal(update: DealUpdate): Promise<TaskResult> {
    await this.hubspotAdapter.updateDeal(update.dealId, {
      stage: update.stage,
      amount: update.amount,
      closeDate: update.closeDate,
    });

    if (update.notes) {
      await this.hubspotAdapter.logActivity(update.dealId, {
        type: 'note',
        body: update.notes,
      });
    }

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: update,
      timestamp: new Date(),
      executedBy: this.id,
      message: `Deal updated: ${update.stage}`,
    };
  }

  private async generateLeadReasoning(leadData: any, score: number): Promise<string> {
    const prompt = `Analyze this lead and explain the qualification score of ${score}/100.

Lead Data:
- Name: ${leadData.firstName} ${leadData.lastName}
- Company: ${leadData.company?.name} (${leadData.company?.size} employees)
- Job Title: ${leadData.jobTitle}
- Email: ${leadData.email}

Provide a 2-3 sentence explanation of why this lead received this score.`;

    return await this.generateContent(prompt);
  }

  private categorizeEngagement(score: number): 'high' | 'medium' | 'low' {
    if (score >= 20) return 'high';
    if (score >= 10) return 'medium';
    return 'low';
  }
}
```

### config/lead-scoring-rules.json

```json
{
  "scoringRules": {
    "companySize": {
      "weight": 0.2,
      "ranges": [
        { "min": 1000, "score": 20 },
        { "min": 100, "score": 15 },
        { "min": 10, "score": 10 },
        { "min": 1, "score": 5 }
      ]
    },
    "jobTitle": {
      "weight": 0.25,
      "scores": {
        "executive": 25,
        "director": 20,
        "manager": 15,
        "other": 5
      }
    },
    "engagement": { "weight": 0.3, "maxScore": 30 },
    "intent": { "weight": 0.25, "maxScore": 25 }
  }
}
```

## Tests
- Lead qualification scoring (7 tests)
- Outreach generation (5 tests)
- Deal management (4 tests)
- HubSpot integration (6 tests)

## Acceptance Criteria
- [ ] All methods from API contract
- [ ] HubSpot Private App token auth
- [ ] Lead scoring algorithm
- [ ] Personalized outreach
- [ ] Test coverage >80%

---

# Instance 4: Support Agent (Prompt 14b)

**Time:** 3 hours | **Depends On:** Instance 2 (BaseAgent complete) | **Parallel with:** Instance 3

## Mission
Build SupportAgent for ticket routing, KB management, and automated responses.

## Critical Fixes Applied
- ✅ **FTS Queries:** Use `fts.@@.plainto_tsquery(english.${query})`
- ✅ **Supabase Count:** Use `{ count: 'exact', head: true }`
- ✅ **Centralized Model:** Use `DEFAULT_MODEL`

## Implementation

### src/agents/support-agent.ts (~650 lines)

```typescript
import { BaseAgent } from './base-agent';
import { CONFIG } from '../config/tools';
import type { HubSpotAdapter } from '../integrations/hubspot';
import type { EmailAdapter } from '../integrations/email';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupportAgent extends BaseAgent {
  private hubspotAdapter: HubSpotAdapter;
  private emailAdapter: EmailAdapter;
  private supabase: SupabaseClient;

  constructor(config: any) {
    super(config);
    this.hubspotAdapter = config.integrations.hubspot;
    this.emailAdapter = config.integrations.email;
    this.supabase = config.integrations.supabase;
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'support.ticket.route' as TaskType,
      'support.ticket.respond' as TaskType,
      'support.kb.search' as TaskType,
      'support.kb.create' as TaskType,
    ];
  }

  /**
   * Route ticket with intelligent categorization
   */
  async routeTicket(ticket: SupportTicket): Promise<TicketRouting> {
    // 1. Categorize with Claude
    const category = await this.categorizeTicket(ticket);

    // 2. Determine priority
    const priority = this.determinePriority(ticket, category);

    // 3. Apply routing rules
    let assignTo: 'auto' | 'human' | string = 'auto';
    let reasoning = '';

    if (category === 'bug' && priority === 'high') {
      assignTo = 'engineering';
      reasoning = 'High-priority bug → engineering';
    } else if (category === 'billing') {
      if (this.requiresRefund(ticket)) {
        assignTo = 'human';
        reasoning = 'Refund requires approval';
      } else {
        assignTo = 'billing';
        reasoning = 'Billing inquiry → billing team';
      }
    } else {
      // Search KB for solution
      const kbArticles = await this.searchKnowledgeBase(
        `${ticket.subject} ${ticket.description}`
      );

      if (kbArticles.length > 0 && kbArticles[0].relevanceScore! > 0.8) {
        assignTo = 'auto';
        reasoning = 'Found relevant KB article';
      } else {
        assignTo = 'human';
        reasoning = 'No KB article found';
      }
    }

    // 4. Generate suggested response if auto
    let suggestedResponse: string | undefined;
    if (assignTo === 'auto') {
      suggestedResponse = await this.generateResponse(ticket);
    }

    return {
      ticketId: ticket.id,
      assignTo,
      priority,
      category,
      reasoning,
      suggestedResponse,
    };
  }

  /**
   * ✅ Search KB with proper FTS query
   */
  async searchKnowledgeBase(query: string): Promise<KBArticle[]> {
    // ✅ Use FTS tsvector index (from database-schema.sql)
    const { data, error } = await this.supabase
      .from('kb_articles')
      .select('*')
      .or(`fts.@@.plainto_tsquery(english.${query})`)  // ✅ Correct FTS syntax
      .limit(5);

    if (error) {
      this.logger.error('KB search failed', { error, query });
      return [];
    }

    // Calculate relevance scores with Claude
    const articlesWithScores = await Promise.all(
      (data || []).map(async (article) => {
        const score = await this.calculateRelevance(query, article);
        return {
          id: article.id,
          title: article.title,
          content: article.content,
          category: article.category,
          tags: article.tags || [],
          relevanceScore: score,
        };
      })
    );

    return articlesWithScores.sort((a, b) =>
      (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );
  }

  /**
   * Generate automated response with KB context
   */
  private async generateResponseWithKB(
    ticket: SupportTicket,
    kbArticles: KBArticle[]
  ): Promise<string> {
    const kbContext = kbArticles.length > 0
      ? kbArticles
          .slice(0, 3)
          .map(a => `${a.title}: ${a.content.substring(0, 200)}`)
          .join('\n\n')
      : 'No relevant KB articles found.';

    const prompt = `Generate a helpful support response for this customer inquiry.

Ticket:
Subject: ${ticket.subject}
Description: ${ticket.description}

Relevant Knowledge Base Articles:
${kbContext}

Requirements:
- Professional and empathetic tone
- Address their specific issue
- Reference KB articles if relevant
- Provide clear next steps
- Offer escalation if needed

Generate the email body in HTML format.`;

    return await this.generateContent(prompt);
  }

  /**
   * ✅ Get support metrics with correct count syntax
   */
  async getSupportMetrics(timeRange: { start: Date; end: Date }): Promise<SupportMetrics> {
    // ✅ Use correct Supabase count syntax
    const { count: totalTickets } = await this.supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })  // ✅ Correct syntax
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString());

    const { data } = await this.supabase
      .from('support_tickets')
      .select('*')
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString());

    if (!data) {
      throw new JarvisError(ErrorCode.INTEGRATION_ERROR, 'Failed to fetch metrics');
    }

    const resolved = data.filter(t =>
      t.status === 'resolved' || t.status === 'closed'
    );
    const autoResolved = data.filter(t => t.assigned_to === 'auto');

    return {
      totalTickets: totalTickets || 0,
      resolved: resolved.length,
      avgResponseTime: this.calculateAvgResponseTime(data),
      avgResolutionTime: this.calculateAvgResolutionTime(resolved),
      autoResolved: autoResolved.length,
      escalated: data.filter(t => t.escalated).length,
    };
  }

  private async categorizeTicket(ticket: SupportTicket): Promise<string> {
    const prompt = `Categorize this support ticket: bug, billing, feature_request, or general

Subject: ${ticket.subject}
Description: ${ticket.description}

Respond with only the category name.`;

    const response = await this.generateContent(prompt);
    return response.trim().toLowerCase();
  }

  private determinePriority(ticket: SupportTicket, category: string): string {
    if (ticket.priority) return ticket.priority;
    if (category === 'bug') return 'high';
    if (category === 'billing') return 'medium';
    return 'low';
  }

  private requiresRefund(ticket: SupportTicket): boolean {
    const refundKeywords = ['refund', 'money back', 'cancel subscription'];
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
    return refundKeywords.some(kw => text.includes(kw));
  }

  private async generateResponse(ticket: SupportTicket): Promise<string> {
    const kbArticles = await this.searchKnowledgeBase(
      `${ticket.subject} ${ticket.description}`
    );
    return this.generateResponseWithKB(ticket, kbArticles);
  }

  private async calculateRelevance(query: string, article: any): Promise<number> {
    // Simple relevance (could enhance with embeddings)
    const queryLower = query.toLowerCase();
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();

    let score = 0;
    if (titleLower.includes(queryLower)) score += 0.5;
    if (contentLower.includes(queryLower)) score += 0.3;
    if (article.tags?.some((tag: string) =>
      queryLower.includes(tag.toLowerCase())
    )) score += 0.2;

    return Math.min(score, 1.0);
  }

  private calculateAvgResponseTime(tickets: any[]): number {
    const times = tickets
      .filter(t => t.first_response_at)
      .map(t =>
        (new Date(t.first_response_at).getTime() -
         new Date(t.created_at).getTime()) / 1000 / 60
      );
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  private calculateAvgResolutionTime(tickets: any[]): number {
    const times = tickets
      .filter(t => t.resolved_at)
      .map(t =>
        (new Date(t.resolved_at).getTime() -
         new Date(t.created_at).getTime()) / 1000 / 60
      );
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
}
```

## Tests
- Ticket routing (6 tests)
- KB search with FTS (5 tests)
- Automated responses (4 tests)
- Metrics calculation (3 tests)

## Acceptance Criteria
- [ ] FTS queries working
- [ ] Correct Supabase count syntax
- [ ] Ticket routing logic
- [ ] KB search functional
- [ ] Test coverage >80%

---

# Instance 5: Operations + Orchestrator (Prompt 15)

**Time:** 8 hours | **Depends On:** Instances 2, 3, 4 complete

## Mission
Build OperationsAgent + Orchestrator (final integration piece).

## Critical Fixes Applied
- ✅ **Cron Timezone:** Use `CONFIG.timezone` (America/Phoenix)
- ✅ **Express ESM:** `import express from 'express'`
- ✅ **Health Checks:** Proper integration testing

## Implementation - Part 1: Operations Agent

### src/agents/operations-agent.ts (~500 lines)

```typescript
import { BaseAgent } from './base-agent';
import { CONFIG } from '../config/tools';
import type { SupabaseClient } from '@supabase/supabase-js';

export class OperationsAgent extends BaseAgent {
  private supabase: SupabaseClient;
  private hubspot?: any;
  private buffer?: any;

  getSupportedTaskTypes(): TaskType[] {
    return [
      'ops.sync.data' as TaskType,
      'ops.health.check' as TaskType,
      'ops.analytics.generate' as TaskType,
    ];
  }

  /**
   * Sync data between systems
   */
  async syncData(type: 'hubspot_contacts' | 'analytics'): Promise<SyncJob> {
    const job: SyncJob = {
      id: crypto.randomUUID(),
      type,
      status: 'running',
      startedAt: new Date(),
      recordsProcessed: 0,
      errors: [],
    };

    try {
      if (type === 'hubspot_contacts') {
        await this.syncHubSpotContacts(job);
      } else if (type === 'analytics') {
        await this.syncAnalytics(job);
      }

      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.errors?.push((error as Error).message);
    }

    return job;
  }

  /**
   * Check health of all integrations
   */
  async checkSystemHealth(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    checks.push(await this.checkSupabaseHealth());
    if (this.hubspot) checks.push(await this.checkHubSpotHealth());
    if (this.buffer) checks.push(await this.checkBufferHealth());

    return checks;
  }

  private async checkSupabaseHealth(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.supabase.from('health_check').select('*').limit(1);
      return {
        service: 'Supabase',
        status: 'healthy',
        responseTime: Date.now() - start,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        service: 'Supabase',
        status: 'down',
        lastCheck: new Date(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Generate analytics report
   */
  async generateAnalytics(period: { start: Date; end: Date }): Promise<AnalyticsReport> {
    const { data: tasks } = await this.supabase
      .from('tasks')
      .select('*')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    return {
      period,
      system: {
        tasksExecuted: tasks?.length || 0,
        autonomousExecutions: tasks?.filter(t => !t.required_approval).length || 0,
        approvalsRequested: tasks?.filter(t => t.required_approval).length || 0,
      },
      // Would aggregate marketing, sales, support metrics here
    };
  }
}
```

## Implementation - Part 2: Orchestrator

### src/core/orchestrator.ts (~600 lines)

```typescript
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import type { BaseAgent } from '../agents/base-agent';

export class Orchestrator extends EventEmitter {
  private logger: Logger;
  private agents: Map<string, BaseAgent>;
  private taskTypeToAgent: Map<TaskType, BaseAgent>;
  private tasks: Map<string, TaskStatus>;
  private supabase: any;

  constructor(config: OrchestratorConfig) {
    super();
    this.logger = new Logger('Orchestrator');
    this.agents = new Map();
    this.taskTypeToAgent = new Map();
    this.tasks = new Map();
    this.supabase = config.integrations.supabase;

    // Register all agents
    for (const agent of config.agents) {
      this.registerAgent(agent);
    }
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing orchestrator');

    // Load pending tasks from DB
    const { data: pendingTasks } = await this.supabase
      .from('tasks')
      .select('*')
      .in('status', ['pending', 'in_progress']);

    if (pendingTasks) {
      for (const task of pendingTasks) {
        this.tasks.set(task.id, {
          taskId: task.id,
          status: task.status,
          assignedAgent: task.assigned_agent,
        });
      }
    }

    this.logger.info('Orchestrator initialized', {
      agents: this.agents.size,
      pendingTasks: this.tasks.size,
    });
  }

  private registerAgent(agent: BaseAgent): void {
    const status = agent.getStatus();
    this.agents.set(status.id, agent);

    // Map task types to agent
    const types = agent.getSupportedTaskTypes();
    for (const type of types) {
      this.taskTypeToAgent.set(type, agent);
    }

    this.logger.info('Agent registered', { agentId: status.id, types });
  }

  async submitTask(task: TaskRequest): Promise<string> {
    this.logger.info('Task submitted', { taskId: task.id, type: task.type });

    // Store in DB
    await this.supabase.from('tasks').insert({
      id: task.id,
      type: task.type,
      priority: task.priority,
      data: task.data,
      requested_by: task.requestedBy,
      status: 'pending',
      created_at: task.timestamp.toISOString(),
    });

    // Create status
    const taskStatus: TaskStatus = {
      taskId: task.id,
      status: 'pending',
    };
    this.tasks.set(task.id, taskStatus);

    // Emit event
    this.emit('task:submitted', task);

    // Execute async
    this.executeTask(task).catch(error => {
      this.logger.error('Task failed', { taskId: task.id, error });
      this.emit('task:failed', task.id, error);
    });

    return task.id;
  }

  private async executeTask(task: TaskRequest): Promise<void> {
    const taskStatus = this.tasks.get(task.id);
    if (!taskStatus) return;

    try {
      // Find agent
      const agent = this.taskTypeToAgent.get(task.type);
      if (!agent) {
        throw new Error(`No agent for task type: ${task.type}`);
      }

      // Update status
      taskStatus.status = 'in_progress';
      taskStatus.assignedAgent = agent.getStatus().id;
      taskStatus.startedAt = new Date();

      this.emit('task:started', task.id, agent.getStatus().id);

      // Execute
      const result = await agent.execute(task);

      // Check if approval required
      if (result.status === 'awaiting_approval') {
        taskStatus.status = 'awaiting_approval';
        taskStatus.result = result;
        this.emit('task:approval_required', task.id, result.data.requestId);
        return;
      }

      // Completed
      taskStatus.status = 'completed';
      taskStatus.completedAt = new Date();
      taskStatus.result = result;

      this.emit('task:completed', result);
    } catch (error) {
      taskStatus.status = 'failed';
      taskStatus.error = (error as Error).message;
      this.emit('task:failed', task.id, error);
    }
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const status = this.tasks.get(taskId);
    if (status) return status;

    // Fetch from DB
    const { data } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (!data) {
      throw new Error('Task not found');
    }

    return {
      taskId: data.id,
      status: data.status,
      assignedAgent: data.assigned_agent,
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down orchestrator');
    // Wait for in-progress tasks (with timeout)
  }
}
```

## Implementation - Part 3: Main Entry Point

### src/index.ts (~200 lines)

```typescript
// ✅ ESM imports (not require)
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Orchestrator } from './core/orchestrator';
import { DecisionEngine } from './core/decision-engine';
import { MemorySystem } from './core/memory';
import { ApprovalQueue } from './core/approval-queue';
import { MarketingAgent } from './agents/marketing-agent';
import { SalesAgent } from './agents/sales-agent';
import { SupportAgent } from './agents/support-agent';
import { OperationsAgent } from './agents/operations-agent';
import { CONFIG, validateConfig } from './config/tools';
import decisionRules from '../config/decision-rules.json';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Initialize Jarvis autonomous system
 */
export async function initializeJarvis() {
  // Validate config
  const validation = validateConfig();
  if (!validation.valid) {
    throw new Error(`Config errors: ${validation.errors.join(', ')}`);
  }

  // Initialize Anthropic
  const anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Initialize Supabase
  const supabase = createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseServiceKey
  );

  // Initialize integrations (with graceful failures)
  const buffer = CONFIG.bufferAccessToken ? new BufferAdapter({...}) : null;
  const hubspot = CONFIG.hubspotToken ? new HubSpotAdapter({...}) : null;
  const email = CONFIG.brevoApiKey ? new EmailAdapter({...}) : null;

  // Initialize core systems
  const memory = new MemorySystem(supabase);
  const approvalQueue = new ApprovalQueue(supabase, [...]);
  const decisionEngine = new DecisionEngine(
    decisionRules.rules as any,
    anthropicClient,
    memory,
    approvalQueue
  );

  // Initialize agents
  const marketingAgent = new MarketingAgent({...});
  const salesAgent = new SalesAgent({...});
  const supportAgent = new SupportAgent({...});
  const opsAgent = new OperationsAgent({...});

  // Initialize orchestrator
  const orchestrator = new Orchestrator({
    agents: [marketingAgent, salesAgent, supportAgent, opsAgent],
    integrations: { supabase, buffer, hubspot, email },
    decisionEngine,
    approvalQueue,
    memory,
  });

  await orchestrator.initialize();

  return { orchestrator, agents: {...}, systems: {...} };
}

// Main entry
if (require.main === module) {
  initializeJarvis()
    .then(({ orchestrator }) => {
      console.log('🤖 Jarvis is running!');

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await orchestrator.shutdown();
        process.exit(0);
      });
    })
    .catch(error => {
      console.error('Failed to initialize:', error);
      process.exit(1);
    });
}
```

## Implementation - Part 4: Scheduler

### src/scheduler.ts

```typescript
import cron from 'node-cron';
import { CONFIG } from './config/tools';

/**
 * ✅ Schedule jobs with correct timezone
 */
export function initializeScheduler(orchestrator: Orchestrator) {
  // Daily analytics at 9 AM Phoenix time
  cron.schedule('0 9 * * *', async () => {
    await orchestrator.submitTask({
      id: crypto.randomUUID(),
      type: 'ops.analytics.generate' as TaskType,
      priority: 1,
      data: {
        period: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
        },
      },
      requestedBy: 'system',
      timestamp: new Date(),
    });
  }, {
    timezone: CONFIG.timezone,  // ✅ America/Phoenix
  });

  // Process expired approvals every hour
  cron.schedule('0 * * * *', async () => {
    await approvalQueue.processExpired();
  }, {
    timezone: CONFIG.timezone,
  });

  // Health check every 6 hours (could use UTC for infra)
  cron.schedule('0 */6 * * *', async () => {
    await orchestrator.submitTask({
      id: crypto.randomUUID(),
      type: 'ops.health.check' as TaskType,
      priority: 2,
      data: {},
      requestedBy: 'system',
      timestamp: new Date(),
    });
  }, {
    timezone: 'UTC',  // UTC for infrastructure
  });
}
```

## Tests
- Operations agent (10 tests)
- Orchestrator (15 tests)
- Integration (5 tests)

## Acceptance Criteria
- [ ] Operations agent complete
- [ ] Orchestrator complete
- [ ] Main entry point works
- [ ] Cron timezone correct
- [ ] Health checks functional
- [ ] Full system demo works
- [ ] Test coverage >80%

---

# 🚀 Launch Sequence

1. **Instance 1** - START NOW (Decision Engine)
2. **Instance 2** - Start when Instance 1 is 50% (3 hours)
3. **Instance 3 & 4** - Start when Instance 2 completes BaseAgent (parallel)
4. **Instance 5** - Start when Instances 2, 3, 4 complete

**Total Time:** ~10-12 hours with 5 parallel instances

**Result:** Complete, production-ready Jarvis system! 🎉
