# Wave 3 - Instance 4: Support Agent (Prompt 14 Part 2)

**Assigned Component:** Support Agent for Customer Service
**Estimated Time:** 3 hours
**Dependencies:** ✅ BaseAgent (P13 - Instance 2), ✅ HubSpot (P7), ✅ Email (P8), ✅ Supabase (P4), ✅ Decision Engine (P12)
**Priority:** HIGH - Customer satisfaction automation

---

## Your Task

Build the SupportAgent - specialized agent for autonomous ticket routing, knowledge base management, and automated customer support responses.

---

## Context

**Prompt 14 Part 2: Support Agent** - Autonomous customer support

**Already complete:** All Wave 1 & Wave 2, Decision Engine (Instance 1), BaseAgent (Instance 2)

**You're building:** Support automation with ticket routing, KB search, and automated responses

**Note:** Instance 3 is building Sales Agent in parallel

---

## API Contract

See `JARVIS_DESIGN_AND_PROMPTS.md` section **"9. Agents: Support Agent"**

```typescript
export interface TicketRouting {
  ticketId: string;
  assignTo: 'auto' | 'human' | string; // team/person
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'bug' | 'billing' | 'feature_request' | 'general';
  reasoning: string;
  suggestedResponse?: string;
}

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  relevanceScore?: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  customerId: string;
  customerEmail: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  createdAt: Date;
}

export class SupportAgent extends BaseAgent {
  async routeTicket(ticket: SupportTicket): Promise<TicketRouting>;
  async respondToTicket(ticketId: string): Promise<TaskResult>;
  async searchKnowledgeBase(query: string): Promise<KBArticle[]>;
  async createKBArticle(article: Omit<KBArticle, 'id'>): Promise<string>;
  async escalateTicket(ticketId: string, reason: string): Promise<void>;
  async getSupportMetrics(timeRange: { start: Date; end: Date }): Promise<SupportMetrics>;

  // Overrides from BaseAgent
  getSupportedTaskTypes(): TaskType[];
  canHandle(task: TaskRequest): boolean;
  executeTask(task: TaskRequest): Promise<TaskResult>;
}
```

---

## Implementation

### 1. Create `src/agents/support-agent.ts`

**Support-specific automation:**

```typescript
import { BaseAgent } from './base-agent';
import type { HubSpotAdapter } from '../integrations/hubspot';
import type { EmailAdapter } from '../integrations/email';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks';
import { JarvisError, ErrorCode } from '../utils/error-handler';

export interface TicketRouting {
  ticketId: string;
  assignTo: 'auto' | 'human' | string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'bug' | 'billing' | 'feature_request' | 'general';
  reasoning: string;
  suggestedResponse?: string;
}

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  relevanceScore?: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  customerId: string;
  customerEmail: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  createdAt: Date;
}

export interface SupportMetrics {
  totalTickets: number;
  resolved: number;
  avgResponseTime: number; // minutes
  avgResolutionTime: number; // minutes
  autoResolved: number;
  escalated: number;
  satisfactionScore?: number;
}

export class SupportAgent extends BaseAgent {
  private hubspotAdapter: HubSpotAdapter;
  private emailAdapter: EmailAdapter;
  private supabase: SupabaseClient;
  private routingRules: any;

  constructor(config: any) {
    super(config);

    if (!config.integrations.hubspot) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'SupportAgent requires HubSpot integration',
        { agentId: config.id },
        false
      );
    }

    if (!config.integrations.email) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'SupportAgent requires Email integration',
        { agentId: config.id },
        false
      );
    }

    if (!config.integrations.supabase) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'SupportAgent requires Supabase integration',
        { agentId: config.id },
        false
      );
    }

    this.hubspotAdapter = config.integrations.hubspot;
    this.emailAdapter = config.integrations.email;
    this.supabase = config.integrations.supabase;
    this.routingRules = config.routingRules || this.getDefaultRoutingRules();
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'support.ticket.route' as TaskType,
      'support.ticket.respond' as TaskType,
      'support.kb.search' as TaskType,
      'support.kb.create' as TaskType,
      'support.metrics' as TaskType,
    ];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    this.logger.info('Executing support task', {
      taskId: task.id,
      type: task.type,
    });

    switch (task.type) {
      case 'support.ticket.route':
        return await this.routeTicketTask(task.data as SupportTicket);

      case 'support.ticket.respond':
        return await this.respondToTicket(task.data.ticketId);

      case 'support.kb.search':
        return await this.searchKBTask(task.data.query);

      case 'support.kb.create':
        return await this.createKBArticleTask(task.data);

      case 'support.metrics':
        return await this.getMetricsTask(task.data.timeRange);

      default:
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Unsupported task type: ${task.type}`,
          { taskId: task.id },
          false
        );
    }
  }

  /**
   * Route ticket to appropriate handler
   */
  async routeTicket(ticket: SupportTicket): Promise<TicketRouting> {
    this.logger.info('Routing ticket', { ticketId: ticket.id });

    // 1. Categorize ticket using Claude
    const category = await this.categorizeTicket(ticket);

    // 2. Determine priority
    const priority = this.determinePriority(ticket, category);

    // 3. Apply routing rules
    let assignTo: 'auto' | 'human' | string = 'auto';
    let reasoning = '';

    if (category === 'bug' && priority === 'high') {
      assignTo = 'engineering';
      reasoning = 'High-priority bug reports go to engineering team';
    } else if (category === 'billing') {
      if (this.requiresRefund(ticket)) {
        assignTo = 'human';
        reasoning = 'Refund requests require approval';
      } else {
        assignTo = 'billing';
        reasoning = 'Billing inquiries go to billing team';
      }
    } else if (category === 'feature_request') {
      assignTo = 'product';
      reasoning = 'Feature requests go to product team';
    } else {
      // Search KB for existing solution
      const kbArticles = await this.searchKnowledgeBase(
        `${ticket.subject} ${ticket.description}`
      );

      if (kbArticles.length > 0 && kbArticles[0].relevanceScore! > 0.8) {
        assignTo = 'auto';
        reasoning = 'Found relevant KB article, can auto-respond';
      } else {
        assignTo = 'human';
        reasoning = 'No KB article found, needs human review';
      }
    }

    // 4. Generate suggested response if auto-assignable
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
   * Route ticket and return task result
   */
  private async routeTicketTask(ticket: SupportTicket): Promise<TaskResult> {
    const routing = await this.routeTicket(ticket);

    // Store ticket in Supabase
    await this.supabase.from('support_tickets').insert({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      customer_id: ticket.customerId,
      customer_email: ticket.customerEmail,
      status: ticket.status,
      priority: routing.priority,
      category: routing.category,
      assigned_to: routing.assignTo,
      created_at: ticket.createdAt.toISOString(),
    });

    // If auto, send response immediately
    if (routing.assignTo === 'auto' && routing.suggestedResponse) {
      await this.sendResponse(ticket, routing.suggestedResponse);
    }

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: routing,
      timestamp: new Date(),
      executedBy: this.id,
      message: `Ticket routed to ${routing.assignTo}`,
    };
  }

  /**
   * Generate and send automated response
   */
  async respondToTicket(ticketId: string): Promise<TaskResult> {
    this.logger.info('Responding to ticket', { ticketId });

    // 1. Fetch ticket
    const { data: ticket, error } = await this.supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      throw new JarvisError(
        ErrorCode.NOT_FOUND,
        'Ticket not found',
        { ticketId },
        false
      );
    }

    // 2. Search KB
    const kbArticles = await this.searchKnowledgeBase(
      `${ticket.subject} ${ticket.description}`
    );

    // 3. Generate response using Claude + KB context
    const response = await this.generateResponseWithKB(
      ticket as SupportTicket,
      kbArticles
    );

    // 4. Send response
    await this.sendResponse(ticket as SupportTicket, response);

    // 5. Update ticket status
    await this.supabase
      .from('support_tickets')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', ticketId);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { ticketId, response },
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Automated response sent',
    };
  }

  /**
   * Search knowledge base
   */
  async searchKnowledgeBase(query: string): Promise<KBArticle[]> {
    // Search in Supabase
    const { data, error } = await this.supabase
      .from('kb_articles')
      .select('*')
      .textSearch('fts', query)
      .limit(5);

    if (error) {
      this.logger.error('KB search failed', { error, query });
      return [];
    }

    // Calculate relevance scores using Claude
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

    // Sort by relevance
    return articlesWithScores.sort(
      (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );
  }

  /**
   * Search KB and return task result
   */
  private async searchKBTask(query: string): Promise<TaskResult> {
    const articles = await this.searchKnowledgeBase(query);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { articles, count: articles.length },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Found ${articles.length} relevant articles`,
    };
  }

  /**
   * Create new KB article
   */
  async createKBArticle(article: Omit<KBArticle, 'id'>): Promise<string> {
    const id = crypto.randomUUID();

    const { error } = await this.supabase.from('kb_articles').insert({
      id,
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to create KB article',
        { error },
        true
      );
    }

    this.logger.info('KB article created', { id, title: article.title });
    return id;
  }

  /**
   * Create KB article and return task result
   */
  private async createKBArticleTask(
    article: Omit<KBArticle, 'id'>
  ): Promise<TaskResult> {
    const id = await this.createKBArticle(article);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { articleId: id },
      timestamp: new Date(),
      executedBy: this.id,
      message: `KB article created: ${article.title}`,
    };
  }

  /**
   * Escalate ticket to human
   */
  async escalateTicket(ticketId: string, reason: string): Promise<void> {
    await this.supabase
      .from('support_tickets')
      .update({
        assigned_to: 'human',
        escalated: true,
        escalation_reason: reason,
      })
      .eq('id', ticketId);

    this.logger.warn('Ticket escalated', { ticketId, reason });
  }

  /**
   * Get support metrics
   */
  async getSupportMetrics(timeRange: {
    start: Date;
    end: Date;
  }): Promise<SupportMetrics> {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .select('*')
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString());

    if (error || !data) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to fetch support metrics',
        { error },
        true
      );
    }

    const resolved = data.filter((t) => t.status === 'resolved' || t.status === 'closed');
    const autoResolved = data.filter((t) => t.assigned_to === 'auto');
    const escalated = data.filter((t) => t.escalated);

    // Calculate average times
    const responseTimes = data
      .filter((t) => t.first_response_at)
      .map(
        (t) =>
          (new Date(t.first_response_at).getTime() -
            new Date(t.created_at).getTime()) /
          1000 /
          60
      );

    const resolutionTimes = resolved
      .filter((t) => t.resolved_at)
      .map(
        (t) =>
          (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) /
          1000 /
          60
      );

    return {
      totalTickets: data.length,
      resolved: resolved.length,
      avgResponseTime:
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,
      avgResolutionTime:
        resolutionTimes.length > 0
          ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
          : 0,
      autoResolved: autoResolved.length,
      escalated: escalated.length,
    };
  }

  /**
   * Get metrics and return task result
   */
  private async getMetricsTask(timeRange: {
    start: Date;
    end: Date;
  }): Promise<TaskResult> {
    const metrics = await this.getSupportMetrics(timeRange);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: metrics,
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Support metrics calculated',
    };
  }

  /**
   * Helper methods
   */

  private async categorizeTicket(
    ticket: SupportTicket
  ): Promise<'bug' | 'billing' | 'feature_request' | 'general'> {
    const prompt = `Categorize this support ticket into one of: bug, billing, feature_request, general

Subject: ${ticket.subject}
Description: ${ticket.description}

Respond with only the category name.`;

    const response = await this.generateContent(prompt);
    return response.trim().toLowerCase() as any;
  }

  private determinePriority(
    ticket: SupportTicket,
    category: string
  ): 'low' | 'medium' | 'high' | 'urgent' {
    // Use existing priority if set
    if (ticket.priority) return ticket.priority;

    // Bugs are high priority
    if (category === 'bug') return 'high';

    // Billing issues are medium
    if (category === 'billing') return 'medium';

    // Default to low
    return 'low';
  }

  private requiresRefund(ticket: SupportTicket): boolean {
    const refundKeywords = ['refund', 'money back', 'cancel subscription'];
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
    return refundKeywords.some((keyword) => text.includes(keyword));
  }

  private async generateResponse(ticket: SupportTicket): Promise<string> {
    // Search KB first
    const kbArticles = await this.searchKnowledgeBase(
      `${ticket.subject} ${ticket.description}`
    );

    return this.generateResponseWithKB(ticket, kbArticles);
  }

  private async generateResponseWithKB(
    ticket: SupportTicket,
    kbArticles: KBArticle[]
  ): Promise<string> {
    const kbContext =
      kbArticles.length > 0
        ? kbArticles
            .slice(0, 3)
            .map((a) => `${a.title}: ${a.content.substring(0, 200)}`)
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

  private async sendResponse(
    ticket: SupportTicket,
    response: string
  ): Promise<void> {
    await this.emailAdapter.sendEmail({
      to: ticket.customerEmail,
      subject: `Re: ${ticket.subject}`,
      html: response,
    });

    // Log in HubSpot if contact exists
    try {
      const contact = await this.hubspotAdapter.searchContacts({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: ticket.customerEmail,
              },
            ],
          },
        ],
      });

      if (contact.results.length > 0) {
        await this.hubspotAdapter.logActivity(contact.results[0].id, {
          type: 'email',
          subject: `Re: ${ticket.subject}`,
          body: response,
        });
      }
    } catch (error) {
      this.logger.warn('Failed to log support response in HubSpot', { error });
    }

    // Update ticket with first response time
    await this.supabase
      .from('support_tickets')
      .update({ first_response_at: new Date().toISOString() })
      .eq('id', ticket.id)
      .is('first_response_at', null);
  }

  private async calculateRelevance(
    query: string,
    article: any
  ): Promise<number> {
    // Simple relevance calculation
    // Could enhance with embedding similarity in the future
    const queryLower = query.toLowerCase();
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();

    let score = 0;

    // Title match is worth more
    if (titleLower.includes(queryLower)) score += 0.5;

    // Content match
    if (contentLower.includes(queryLower)) score += 0.3;

    // Tag match
    if (article.tags?.some((tag: string) => queryLower.includes(tag.toLowerCase()))) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private getDefaultRoutingRules(): any {
    return {
      bug: { assignTo: 'engineering', priority: 'high' },
      billing: { assignTo: 'billing', priority: 'medium' },
      feature_request: { assignTo: 'product', priority: 'low' },
      general: { assignTo: 'auto', priority: 'low' },
    };
  }
}
```

---

### 2. Create `config/ticket-routing-rules.json`

```json
{
  "routingRules": {
    "bug": {
      "assignTo": "engineering",
      "priority": "high",
      "requiresApproval": false,
      "keywords": ["error", "crash", "broken", "not working", "bug"]
    },
    "billing": {
      "assignTo": "billing",
      "priority": "medium",
      "requiresApproval": true,
      "keywords": ["refund", "charge", "payment", "invoice", "subscription"],
      "escalateIf": ["refund", "cancel"]
    },
    "feature_request": {
      "assignTo": "product",
      "priority": "low",
      "requiresApproval": false,
      "keywords": ["feature", "request", "suggestion", "enhancement"]
    },
    "general": {
      "assignTo": "auto",
      "priority": "low",
      "requiresApproval": false,
      "tryAutoResponse": true
    }
  },
  "escalationTriggers": [
    "refund > $50",
    "customer sentiment negative",
    "repeated issue (>3 tickets)",
    "legal/compliance keywords"
  ]
}
```

---

### 3. Create `src/agents/support-agent.test.ts`

**Test coverage (>80%):**
- Ticket routing logic
- KB search functionality
- Automated response generation
- KB article creation
- Escalation workflow
- Metrics calculation
- Integration with Supabase
- Integration with Email
- Error scenarios

---

### 4. Create `docs/support-automation.md`

**Documentation covering:**
- Support agent capabilities
- Ticket routing rules
- KB management
- Auto-response system
- Escalation workflow
- Metrics and reporting
- Configuration guide

---

## Output Files

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/agents/support-agent.ts` | Support agent impl | ~650 |
| `src/agents/support-agent.test.ts` | Test suite | ~450 |
| `config/ticket-routing-rules.json` | Routing config | ~40 |
| `docs/support-automation.md` | Documentation | ~250 |

**Total:** ~1,390 lines

---

## Acceptance Criteria

- [ ] SupportAgent extends BaseAgent
- [ ] Ticket routing with categorization
- [ ] KB search and relevance scoring
- [ ] Automated response generation
- [ ] KB article creation
- [ ] Ticket escalation
- [ ] Support metrics calculation
- [ ] Supabase integration
- [ ] Email integration
- [ ] Test coverage >80%
- [ ] Documentation complete

---

## Testing Commands

```bash
npm test src/agents/support-agent.test.ts
npm run test:coverage -- src/agents/support-agent.test.ts
npm run typecheck
npm run build
```

---

**Start Time:** After Instance 2 (BaseAgent) is complete
**Expected Completion:** 3 hours
**Runs in Parallel with:** Instance 3 (Sales Agent)

---

🎫 **Build the customer happiness engine!**
