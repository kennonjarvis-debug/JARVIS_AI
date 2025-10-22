# Wave 3 - Instance 3: Sales Agent (Prompt 14 Part 1)

**Assigned Component:** Sales Agent for Lead Management
**Estimated Time:** 3 hours
**Dependencies:** ✅ BaseAgent (P13 - Instance 2), ✅ HubSpot (P7), ✅ Email (P8), ✅ Decision Engine (P12)
**Priority:** HIGH - Revenue-generating automation

---

## Your Task

Build the SalesAgent - specialized agent for autonomous lead qualification, outreach, follow-ups, and CRM management.

---

## Context

**Prompt 14 Part 1: Sales Agent** - Autonomous sales operations

**Already complete:** All Wave 1 & Wave 2, Decision Engine (Instance 1), BaseAgent (Instance 2)

**You're building:** Sales automation with lead scoring, personalized outreach, and CRM sync

**Note:** Instance 4 is building Support Agent in parallel

---

## API Contract

See `JARVIS_DESIGN_AND_PROMPTS.md` section **"7. Agents: Sales Agent"**

```typescript
export interface LeadQualification {
  leadId: string;
  score: number; // 0-100
  category: 'hot' | 'warm' | 'cold';
  reasoning: string;
  signals: {
    companySize: number;
    jobTitleMatch: boolean;
    engagementLevel: 'high' | 'medium' | 'low';
    intentSignals: string[];
  };
  recommendedAction: 'immediate_outreach' | 'nurture' | 'ignore';
}

export interface OutreachRequest {
  leadId: string;
  channel: 'email' | 'linkedin';
  personalizationData: Record<string, any>;
}

export interface DealUpdate {
  dealId: string;
  stage: string;
  amount?: number;
  closeDate?: Date;
  notes?: string;
}

export class SalesAgent extends BaseAgent {
  async qualifyLead(leadData: any): Promise<LeadQualification>;
  async sendOutreach(request: OutreachRequest): Promise<TaskResult>;
  async scheduleFollowUp(leadId: string, delay: number): Promise<void>;
  async updateDeal(update: DealUpdate): Promise<TaskResult>;
  async analyzePipeline(): Promise<PipelineReport>;

  // Overrides from BaseAgent
  getSupportedTaskTypes(): TaskType[];
  canHandle(task: TaskRequest): boolean;
  executeTask(task: TaskRequest): Promise<TaskResult>;
}
```

---

## Implementation

### 1. Create `src/agents/sales-agent.ts`

**Sales-specific automation:**

```typescript
import { BaseAgent } from './base-agent';
import type { HubSpotAdapter } from '../integrations/hubspot';
import type { EmailAdapter } from '../integrations/email';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks';
import { JarvisError, ErrorCode } from '../utils/error-handler';

export interface LeadQualification {
  leadId: string;
  score: number;
  category: 'hot' | 'warm' | 'cold';
  reasoning: string;
  signals: {
    companySize: number;
    jobTitleMatch: boolean;
    engagementLevel: 'high' | 'medium' | 'low';
    intentSignals: string[];
  };
  recommendedAction: 'immediate_outreach' | 'nurture' | 'ignore';
}

export interface OutreachRequest {
  leadId: string;
  channel: 'email' | 'linkedin';
  personalizationData: Record<string, any>;
}

export interface DealUpdate {
  dealId: string;
  stage: string;
  amount?: number;
  closeDate?: Date;
  notes?: string;
}

export class SalesAgent extends BaseAgent {
  private hubspotAdapter: HubSpotAdapter;
  private emailAdapter: EmailAdapter;
  private leadScoringRules: any;

  constructor(config: any) {
    super(config);

    if (!config.integrations.hubspot) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'SalesAgent requires HubSpot integration',
        { agentId: config.id },
        false
      );
    }

    if (!config.integrations.email) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'SalesAgent requires Email integration',
        { agentId: config.id },
        false
      );
    }

    this.hubspotAdapter = config.integrations.hubspot;
    this.emailAdapter = config.integrations.email;
    this.leadScoringRules = config.leadScoringRules || this.getDefaultScoringRules();
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'sales.lead.qualify' as TaskType,
      'sales.outreach.send' as TaskType,
      'sales.deal.create' as TaskType,
      'sales.deal.update' as TaskType,
      'sales.pipeline.analyze' as TaskType,
    ];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    this.logger.info('Executing sales task', { taskId: task.id, type: task.type });

    switch (task.type) {
      case 'sales.lead.qualify':
        return await this.qualifyLeadTask(task.data);

      case 'sales.outreach.send':
        return await this.sendOutreach(task.data as OutreachRequest);

      case 'sales.deal.create':
        return await this.createDeal(task.data);

      case 'sales.deal.update':
        return await this.updateDeal(task.data as DealUpdate);

      case 'sales.pipeline.analyze':
        return await this.analyzePipeline();

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
   * Qualify a lead with scoring algorithm
   */
  async qualifyLead(leadData: any): Promise<LeadQualification> {
    this.logger.info('Qualifying lead', { leadId: leadData.id });

    // 1. Calculate score components
    const companyScore = this.scoreCompanySize(leadData.company?.size);
    const jobTitleScore = this.scoreJobTitle(leadData.jobTitle);
    const engagementScore = this.scoreEngagement(leadData.engagement);
    const intentScore = this.scoreIntent(leadData.intentSignals || []);

    // 2. Total score (0-100)
    const totalScore =
      companyScore + jobTitleScore + engagementScore + intentScore;

    // 3. Categorize
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

    // 4. Generate reasoning with Claude
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
   * Qualify lead and return task result
   */
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

  /**
   * Send personalized outreach
   */
  async sendOutreach(request: OutreachRequest): Promise<TaskResult> {
    this.logger.info('Sending outreach', {
      leadId: request.leadId,
      channel: request.channel,
    });

    // 1. Get lead details from HubSpot
    const contact = await this.hubspotAdapter.getContact(request.leadId);

    // 2. Generate personalized message with Claude
    const message = await this.generateOutreachMessage(
      contact,
      request.personalizationData
    );

    // 3. Send via appropriate channel
    if (request.channel === 'email') {
      await this.emailAdapter.sendEmail({
        to: contact.email,
        subject: message.subject,
        html: message.body,
      });
    } else if (request.channel === 'linkedin') {
      // Would integrate with LinkedIn API (placeholder)
      this.logger.info('LinkedIn outreach (placeholder)', {
        leadId: request.leadId,
      });
    }

    // 4. Log activity in HubSpot
    await this.hubspotAdapter.logActivity(request.leadId, {
      type: 'email',
      subject: message.subject,
      body: message.body,
    });

    // 5. Schedule first follow-up (3 days)
    await this.scheduleFollowUp(request.leadId, 3);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: {
        leadId: request.leadId,
        channel: request.channel,
        sentAt: new Date(),
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Outreach sent via ${request.channel}`,
    };
  }

  /**
   * Schedule follow-up email
   */
  async scheduleFollowUp(leadId: string, delayDays: number): Promise<void> {
    // Store follow-up task in memory for future execution
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

    this.logger.info('Follow-up scheduled', { leadId, delayDays });
  }

  /**
   * Create deal in HubSpot
   */
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

  /**
   * Update deal stage/details
   */
  async updateDeal(update: DealUpdate): Promise<TaskResult> {
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

  /**
   * Analyze sales pipeline
   */
  async analyzePipeline(): Promise<TaskResult> {
    // Fetch deals from HubSpot
    const deals = await this.hubspotAdapter.searchDeals({
      properties: ['amount', 'stage', 'closedate'],
      filters: [],
    });

    // Aggregate by stage
    const pipeline = deals.reduce((acc: any, deal: any) => {
      const stage = deal.properties.stage;
      if (!acc[stage]) {
        acc[stage] = { count: 0, value: 0 };
      }
      acc[stage].count += 1;
      acc[stage].value += parseFloat(deal.properties.amount || '0');
      return acc;
    }, {});

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: {
        pipeline,
        totalValue: Object.values(pipeline).reduce(
          (sum: number, stage: any) => sum + stage.value,
          0
        ),
        totalDeals: deals.length,
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Pipeline analysis complete',
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
    const normalizedTitle = title.toLowerCase();

    // Decision makers
    if (
      normalizedTitle.includes('ceo') ||
      normalizedTitle.includes('founder') ||
      normalizedTitle.includes('president')
    ) {
      return 25;
    }

    // Influencers
    if (
      normalizedTitle.includes('director') ||
      normalizedTitle.includes('vp') ||
      normalizedTitle.includes('head of')
    ) {
      return 20;
    }

    // Users
    if (normalizedTitle.includes('manager') || normalizedTitle.includes('lead')) {
      return 15;
    }

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
    if (!signals || signals.length === 0) return 0;

    // High-intent signals
    const highIntent = ['pricing', 'demo', 'trial', 'contact'];
    const matches = signals.filter((s) =>
      highIntent.some((hi) => s.toLowerCase().includes(hi))
    );

    return Math.min(matches.length * 8, 25);
  }

  private categorizeEngagement(score: number): 'high' | 'medium' | 'low' {
    if (score >= 20) return 'high';
    if (score >= 10) return 'medium';
    return 'low';
  }

  /**
   * Generate lead reasoning with Claude
   */
  private async generateLeadReasoning(
    leadData: any,
    score: number
  ): Promise<string> {
    const prompt = `Analyze this lead and explain the qualification score of ${score}/100.

Lead Data:
- Name: ${leadData.firstName} ${leadData.lastName}
- Company: ${leadData.company?.name} (${leadData.company?.size} employees)
- Job Title: ${leadData.jobTitle}
- Email: ${leadData.email}
- Engagement: ${JSON.stringify(leadData.engagement || {})}
- Intent Signals: ${(leadData.intentSignals || []).join(', ')}

Provide a 2-3 sentence explanation of why this lead received this score and what action we should take.`;

    return await this.generateContent(prompt);
  }

  /**
   * Generate personalized outreach message
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

  /**
   * Default lead scoring rules
   */
  private getDefaultScoringRules(): any {
    return {
      companySize: { weight: 0.2, min: 0, max: 20 },
      jobTitle: { weight: 0.25, min: 0, max: 25 },
      engagement: { weight: 0.3, min: 0, max: 30 },
      intent: { weight: 0.25, min: 0, max: 25 },
    };
  }
}
```

---

### 2. Create `config/lead-scoring-rules.json`

```json
{
  "scoringRules": {
    "companySize": {
      "weight": 0.2,
      "ranges": [
        { "min": 1000, "max": 999999, "score": 20 },
        { "min": 100, "max": 999, "score": 15 },
        { "min": 10, "max": 99, "score": 10 },
        { "min": 1, "max": 9, "score": 5 }
      ]
    },
    "jobTitle": {
      "weight": 0.25,
      "keywords": {
        "executive": ["ceo", "cto", "cfo", "founder", "president"],
        "director": ["director", "vp", "head of"],
        "manager": ["manager", "lead", "coordinator"]
      },
      "scores": {
        "executive": 25,
        "director": 20,
        "manager": 15,
        "other": 5
      }
    },
    "engagement": {
      "weight": 0.3,
      "metrics": {
        "emailOpens": { "threshold": 3, "score": 10 },
        "emailClicks": { "threshold": 1, "score": 10 },
        "websiteVisits": { "threshold": 2, "score": 10 }
      }
    },
    "intent": {
      "weight": 0.25,
      "highIntentSignals": ["pricing", "demo", "trial", "contact", "buy"],
      "scorePerSignal": 8,
      "maxScore": 25
    }
  },
  "followUpSequence": [
    { "day": 0, "type": "initial" },
    { "day": 3, "type": "first_followup" },
    { "day": 7, "type": "second_followup" },
    { "day": 14, "type": "final_followup" }
  ]
}
```

---

### 3. Create `src/agents/sales-agent.test.ts`

**Test coverage (>80%):**
- Lead qualification scoring
- Outreach message generation
- Follow-up scheduling
- Deal creation and updates
- Pipeline analysis
- HubSpot integration
- Email integration
- Error scenarios

---

### 4. Create `docs/sales-automation.md`

**Documentation covering:**
- Sales agent capabilities
- Lead scoring algorithm
- Outreach sequences
- CRM integration
- Best practices
- Configuration guide

---

## Output Files

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/agents/sales-agent.ts` | Sales agent impl | ~600 |
| `src/agents/sales-agent.test.ts` | Test suite | ~400 |
| `config/lead-scoring-rules.json` | Scoring config | ~60 |
| `docs/sales-automation.md` | Documentation | ~250 |

**Total:** ~1,310 lines

---

## Acceptance Criteria

- [ ] SalesAgent extends BaseAgent
- [ ] Lead qualification with scoring
- [ ] Personalized outreach generation
- [ ] Follow-up sequencing
- [ ] Deal management (CRUD)
- [ ] Pipeline analysis
- [ ] HubSpot integration
- [ ] Email integration
- [ ] Test coverage >80%
- [ ] Documentation complete

---

## Testing Commands

```bash
npm test src/agents/sales-agent.test.ts
npm run test:coverage -- src/agents/sales-agent.test.ts
npm run typecheck
npm run build
```

---

**Start Time:** After Instance 2 (BaseAgent) is complete
**Expected Completion:** 3 hours
**Runs in Parallel with:** Instance 4 (Support Agent)

---

💰 **Build the revenue engine!**
