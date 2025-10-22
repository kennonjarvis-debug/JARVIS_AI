# Instance 2: BaseAgent + Marketing Agent (Wave 3, Prompt 13)

**Your Role:** Instance 2 - Building agent foundation + first specialized agent
**Time Estimate:** 5 hours
**Depends On:** Instance 1 at 50% (Decision Engine partially complete)

---

## 🎯 Your Mission

Build **BaseAgent** (foundation for all agents) and **MarketingAgent** (first specialized agent for social media, content, and email campaigns).

---

## 📋 What You're Building

```typescript
src/agents/base-agent.ts           (~400 lines)
src/agents/marketing-agent.ts      (~500 lines)
src/agents/base-agent.test.ts      (~300 lines)
src/agents/marketing-agent.test.ts (~400 lines)
docs/agents-overview.md            (~300 lines)
```

**Total Output:** ~1,900 lines

---

## ✅ Production Fixes Applied

**IMPORTANT:** These fixes are already baked in:

1. **Anthropic Model:** Use centralized `DEFAULT_MODEL` from `src/integrations/anthropic.ts`
2. **Brevo Limits:** Enforce 300/day limit in email campaigns
3. **Risk Thresholds:** Check against `RISK_THRESHOLDS` from config
4. **ESM Imports:** Use `import` not `require`

---

## 🚀 Implementation

### Step 1: Create Anthropic Integration Helper

```typescript
// src/integrations/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from '../config/tools';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ✅ Centralized model config - single source of truth
export const DEFAULT_MODEL = CONFIG.anthropicModel;
```

---

### Step 2: Create `src/agents/base-agent.ts`

```typescript
import { anthropic, DEFAULT_MODEL } from '../integrations/anthropic';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import type { DecisionEngine } from '../core/decision-engine';
import type { MemorySystem } from '../core/memory';
import type { ApprovalQueue } from '../core/approval-queue';
import type {
  AgentConfig,
  AgentCapability,
  AgentStatus,
} from '../types/agents';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks';
import type { DecisionResult } from '../types/decisions';

export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected capabilities: AgentCapability[];
  protected integrations: Record<string, any>;
  protected decisionEngine: DecisionEngine;
  protected memory: MemorySystem;
  protected approvalQueue: ApprovalQueue;
  protected logger: Logger;
  protected status: 'idle' | 'busy' | 'error';

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.capabilities = config.capabilities;
    this.integrations = config.integrations;
    this.decisionEngine = config.decisionEngine;
    this.memory = config.memory;
    this.approvalQueue = config.approvalQueue;
    this.logger = new Logger(`Agent:${this.name}`);
    this.status = 'idle';
  }

  // Abstract methods (must be implemented by subclasses)
  abstract getSupportedTaskTypes(): TaskType[];
  abstract canHandle(task: TaskRequest): boolean;
  abstract executeTask(task: TaskRequest): Promise<TaskResult>;

  /**
   * Main execution method with decision engine integration
   */
  async execute(task: TaskRequest): Promise<TaskResult> {
    this.status = 'busy';
    this.logger.info('Executing task', { taskId: task.id, type: task.type });

    try {
      // 1. Check if agent can handle this task
      if (!this.canHandle(task)) {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Agent ${this.name} cannot handle task type ${task.type}`,
          { taskId: task.id, agentId: this.id },
          false
        );
      }

      // 2. Get decision from decision engine
      const decision = await this.decisionEngine.evaluate({
        task,
        historicalData: await this.memory.getRelevantContext(task.type, task.data, 10),
        rules: [], // Rules already loaded in DecisionEngine
        agentCapabilities: this.capabilities,
      });

      // 3. Handle based on decision
      if (decision.action === 'reject') {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Task rejected by decision engine: ${decision.reasoning}`,
          { taskId: task.id, decision },
          false
        );
      }

      if (decision.requiresApproval) {
        return await this.requestApproval(task, decision);
      }

      // 4. Execute task
      const result = await this.executeTask(task);

      // 5. Store in memory
      await this.memory.storeEntry({
        id: crypto.randomUUID(),
        type: 'task_execution',
        content: { task, result, decision },
        timestamp: new Date(),
        importance: 0.5,
        metadata: {
          agentId: this.id,
          taskType: task.type,
          success: result.success,
        },
      });

      this.status = 'idle';
      return result;
    } catch (error) {
      this.status = 'error';
      this.logger.error('Task execution failed', { taskId: task.id, error });
      throw error;
    }
  }

  /**
   * Request human approval for a task
   */
  async requestApproval(
    task: TaskRequest,
    decision: DecisionResult
  ): Promise<TaskResult> {
    this.logger.info('Requesting approval for task', {
      taskId: task.id,
      riskLevel: decision.riskLevel,
    });

    const requestId = await this.approvalQueue.requestApproval({
      taskId: task.id,
      taskType: task.type,
      requestedAction: JSON.stringify(task.data),
      reasoning: decision.reasoning,
      riskLevel: decision.riskLevel,
      estimatedImpact: decision.estimatedImpact,
      alternatives: decision.alternatives,
      metadata: {
        agentId: this.id,
        confidence: decision.confidence,
      },
    });

    return {
      taskId: task.id,
      success: false,
      status: 'awaiting_approval',
      data: { requestId },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Task requires approval. Request ID: ${requestId}`,
    };
  }

  /**
   * Generate content using Claude - ✅ Using centralized model config
   */
  protected async generateContent(
    prompt: string,
    context?: any
  ): Promise<string> {
    this.logger.debug('Generating content with Claude', {
      promptLength: prompt.length,
    });

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL,  // ✅ Use centralized model config
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Unexpected response type from Claude',
        { responseType: content.type },
        true
      );
    } catch (error) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to generate content with Claude',
        { error, prompt: prompt.substring(0, 100) },
        true
      );
    }
  }

  getStatus(): AgentStatus {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      capabilities: this.capabilities,
      lastActive: new Date(),
    };
  }

  getCapabilities(): AgentCapability[] {
    return this.capabilities;
  }
}
```

---

### Step 3: Create `src/agents/marketing-agent.ts`

```typescript
import { BaseAgent } from './base-agent';
import { CONFIG, RISK_THRESHOLDS } from '../config/tools';
import type { BufferAdapter } from '../integrations/buffer';
import type { EmailAdapter } from '../integrations/email';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks';
import { JarvisError, ErrorCode } from '../utils/error-handler';

export interface SocialPostRequest {
  platform: 'twitter' | 'linkedin' | 'facebook';
  topic: string;
  targetAudience: string;
  tone?: 'professional' | 'casual' | 'humorous';
  hashtags?: string[];
  scheduledTime?: Date;
  includeLink?: string;
}

export interface EmailCampaignRequest {
  segment: string;
  subject: string;
  content: string;
  recipientCount: number;
  scheduledTime?: Date;
  templateId?: string;
  variables?: Record<string, any>;
}

export class MarketingAgent extends BaseAgent {
  private bufferAdapter?: BufferAdapter;
  private emailAdapter?: EmailAdapter;
  private dailyEmailCount: number = 0; // Track daily sends

  constructor(config: any) {
    super(config);
    this.bufferAdapter = config.integrations.buffer;
    this.emailAdapter = config.integrations.email;
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'marketing.social.post' as TaskType,
      'marketing.content.create' as TaskType,
      'marketing.email.campaign' as TaskType,
    ];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    switch (task.type) {
      case 'marketing.social.post':
        return await this.createSocialPost(task.data as SocialPostRequest);

      case 'marketing.email.campaign':
        return await this.createEmailCampaign(task.data as EmailCampaignRequest);

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
   * Create and schedule a social media post
   */
  async createSocialPost(request: SocialPostRequest): Promise<TaskResult> {
    if (!this.bufferAdapter) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Buffer integration not configured',
        {},
        false
      );
    }

    // 1. Generate content with Claude
    const prompt = this.buildSocialPostPrompt(request);
    const content = await this.generateContent(prompt);

    // 2. Optimize for platform
    const optimized = this.optimizeForPlatform(content, request.platform);

    // 3. Schedule via Buffer
    const bufferResult = await this.bufferAdapter.createPost({
      text: optimized,
      profiles: [this.getProfileId(request.platform)],
      scheduledAt: request.scheduledTime,
      media: [],
    });

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: {
        postId: bufferResult.id,
        content: optimized,
        platform: request.platform,
        scheduledFor: request.scheduledTime,
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Social post created and scheduled for ${request.platform}`,
    };
  }

  /**
   * Create and send email campaign - ✅ With Brevo limit enforcement
   */
  async createEmailCampaign(request: EmailCampaignRequest): Promise<TaskResult> {
    if (!this.emailAdapter) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Email integration not configured',
        {},
        false
      );
    }

    // ✅ Check Brevo daily limit (300 emails/day on free tier)
    const remainingToday = CONFIG.brevoDailyLimit - this.dailyEmailCount;

    if (request.recipientCount > remainingToday) {
      this.logger.warn('Email campaign exceeds daily limit', {
        recipientCount: request.recipientCount,
        remainingToday,
        dailyLimit: CONFIG.brevoDailyLimit,
      });

      // Batch into multiple days if >300
      if (request.recipientCount > CONFIG.brevoDailyLimit) {
        return await this.batchEmailCampaign(request);
      }

      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        `Email campaign exceeds remaining daily limit (${remainingToday}/${CONFIG.brevoDailyLimit})`,
        { recipientCount: request.recipientCount, remainingToday },
        false
      );
    }

    // Send via email adapter
    const result = await this.emailAdapter.sendBulkEmail({
      templateId: request.templateId,
      recipients: [], // Would fetch from segment
      variables: request.variables || {},
      scheduledAt: request.scheduledTime,
    });

    // Update daily count
    this.dailyEmailCount += request.recipientCount;

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: {
        ...result,
        recipientCount: request.recipientCount,
        dailyCountUsed: this.dailyEmailCount,
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Email campaign sent to ${request.recipientCount} recipients`,
    };
  }

  /**
   * ✅ Batch large campaigns into 300-email chunks across multiple days
   */
  private async batchEmailCampaign(request: EmailCampaignRequest): Promise<TaskResult> {
    const batchSize = CONFIG.brevoBatchSize; // 300
    const totalBatches = Math.ceil(request.recipientCount / batchSize);

    this.logger.info('Batching email campaign', {
      recipientCount: request.recipientCount,
      batchSize,
      totalBatches,
    });

    // Schedule batches across multiple days
    const batches = [];
    for (let i = 0; i < totalBatches; i++) {
      const batchDate = new Date();
      batchDate.setDate(batchDate.getDate() + i); // One batch per day

      batches.push({
        batchNumber: i + 1,
        recipientCount: Math.min(batchSize, request.recipientCount - i * batchSize),
        scheduledFor: batchDate,
      });
    }

    // Store batch plan in memory for execution
    await this.memory.storeEntry({
      id: crypto.randomUUID(),
      type: 'scheduled_task',
      content: {
        originalRequest: request,
        batches,
        status: 'planned',
      },
      timestamp: new Date(),
      importance: 0.8,
      metadata: {
        taskType: 'marketing.email.campaign.batched',
        totalBatches,
      },
    });

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: {
        batched: true,
        totalBatches,
        batches,
        message: `Campaign split into ${totalBatches} batches of ${batchSize} emails each`,
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Email campaign batched into ${totalBatches} sends across ${totalBatches} days`,
    };
  }

  /**
   * Build prompt for social post generation
   */
  private buildSocialPostPrompt(request: SocialPostRequest): string {
    const platformLimits = {
      twitter: 280,
      linkedin: 3000,
      facebook: 5000,
    };

    return `Create a ${request.tone || 'professional'} social media post for ${request.platform}.

Topic: ${request.topic}
Target Audience: ${request.targetAudience}
Character Limit: ${platformLimits[request.platform]}
${request.hashtags ? `Hashtags to include: ${request.hashtags.join(', ')}` : ''}
${request.includeLink ? `Include this link: ${request.includeLink}` : ''}

Requirements:
- Engaging and on-brand for DAWG AI (browser-based DAW)
- Clear call-to-action
- Optimized for ${request.platform}
- Stay under ${platformLimits[request.platform]} characters

Generate only the post content, no additional commentary.`;
  }

  /**
   * Optimize content for specific platform
   */
  private optimizeForPlatform(content: string, platform: string): string {
    const limits = { twitter: 280, linkedin: 3000, facebook: 5000 };
    const limit = limits[platform as keyof typeof limits];

    if (content.length > limit) {
      return content.substring(0, limit - 3) + '...';
    }

    return content;
  }

  /**
   * Get Buffer profile ID for platform
   */
  private getProfileId(platform: string): string {
    const profileIds: Record<string, string> = {
      twitter: process.env.BUFFER_TWITTER_PROFILE_ID || '',
      linkedin: process.env.BUFFER_LINKEDIN_PROFILE_ID || '',
      facebook: process.env.BUFFER_FACEBOOK_PROFILE_ID || '',
    };

    return profileIds[platform];
  }

  /**
   * Reset daily email count (should be called at midnight)
   */
  resetDailyEmailCount(): void {
    this.dailyEmailCount = 0;
    this.logger.info('Daily email count reset');
  }
}
```

---

### Step 4: Create Tests

```typescript
// src/agents/base-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseAgent } from './base-agent';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks';

// Create concrete test implementation
class TestAgent extends BaseAgent {
  getSupportedTaskTypes(): TaskType[] {
    return ['test.task' as TaskType];
  }

  canHandle(task: TaskRequest): boolean {
    return task.type === 'test.task';
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    return {
      taskId: task.id,
      success: true,
      status: 'completed',
      data: { message: 'Test executed' },
      timestamp: new Date(),
      executedBy: this.id,
    };
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let mockDecisionEngine: any;
  let mockMemory: any;
  let mockApprovalQueue: any;

  beforeEach(() => {
    mockDecisionEngine = {
      evaluate: vi.fn().mockResolvedValue({
        action: 'execute',
        confidence: 0.9,
        reasoning: 'Safe to execute',
        riskLevel: 'low',
        estimatedImpact: { description: 'Minimal' },
        requiresApproval: false,
      }),
    };

    mockMemory = {
      getRelevantContext: vi.fn().mockResolvedValue([]),
      storeEntry: vi.fn().mockResolvedValue(undefined),
    };

    mockApprovalQueue = {
      requestApproval: vi.fn().mockResolvedValue('req-123'),
    };

    agent = new TestAgent({
      id: 'test-agent',
      name: 'Test Agent',
      capabilities: [],
      integrations: {},
      decisionEngine: mockDecisionEngine,
      memory: mockMemory,
      approvalQueue: mockApprovalQueue,
    });
  });

  describe('execute', () => {
    it('should execute task when decision engine approves', async () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.execute(task);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(mockDecisionEngine.evaluate).toHaveBeenCalled();
    });

    it('should request approval when required', async () => {
      mockDecisionEngine.evaluate.mockResolvedValueOnce({
        action: 'request_approval',
        confidence: 0.6,
        reasoning: 'Needs approval',
        riskLevel: 'high',
        estimatedImpact: { description: 'Significant' },
        requiresApproval: true,
      });

      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.execute(task);

      expect(result.status).toBe('awaiting_approval');
      expect(mockApprovalQueue.requestApproval).toHaveBeenCalled();
    });

    it('should throw error when decision engine rejects', async () => {
      mockDecisionEngine.evaluate.mockResolvedValueOnce({
        action: 'reject',
        confidence: 0.9,
        reasoning: 'Too risky',
        riskLevel: 'critical',
        estimatedImpact: { description: 'Severe' },
        requiresApproval: false,
      });

      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agent.execute(task)).rejects.toThrow();
    });
  });
});
```

```typescript
// src/agents/marketing-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketingAgent } from './marketing-agent';

describe('MarketingAgent', () => {
  let agent: MarketingAgent;
  let mockBuffer: any;
  let mockEmail: any;

  beforeEach(() => {
    mockBuffer = {
      createPost: vi.fn().mockResolvedValue({
        id: 'post-123',
        status: 'scheduled',
      }),
    };

    mockEmail = {
      sendBulkEmail: vi.fn().mockResolvedValue({
        sent: 100,
        messageIds: ['msg-1'],
      }),
    };

    agent = new MarketingAgent({
      id: 'marketing-agent',
      name: 'Marketing Agent',
      capabilities: [],
      integrations: {
        buffer: mockBuffer,
        email: mockEmail,
      },
      decisionEngine: { evaluate: vi.fn() },
      memory: { storeEntry: vi.fn(), getRelevantContext: vi.fn() },
      approvalQueue: {},
    });
  });

  describe('createEmailCampaign', () => {
    it('should send campaign when under daily limit', async () => {
      const request = {
        segment: 'active_users',
        subject: 'Test',
        content: 'Test content',
        recipientCount: 100,
      };

      const result = await agent.createEmailCampaign(request);

      expect(result.success).toBe(true);
      expect(mockEmail.sendBulkEmail).toHaveBeenCalled();
    });

    it('should batch campaign when exceeds daily limit', async () => {
      const request = {
        segment: 'all_users',
        subject: 'Big Campaign',
        content: 'Test content',
        recipientCount: 1000, // Exceeds 300/day limit
      };

      const result = await agent.createEmailCampaign(request);

      expect(result.data.batched).toBe(true);
      expect(result.data.totalBatches).toBeGreaterThan(1);
    });
  });
});
```

---

## ✅ Acceptance Criteria

- [ ] BaseAgent abstract class complete
- [ ] MarketingAgent extends BaseAgent
- [ ] Centralized Anthropic model config used
- [ ] Brevo 300/day limit enforced
- [ ] Email batching implemented
- [ ] Test coverage >80%
- [ ] All tests passing
- [ ] Documentation complete

---

## 🚀 When to Start

**Start when:** Instance 1 (Decision Engine) is 50% complete (~3 hours in)

**Notify:** Instance 1 coordinator when BaseAgent is complete - Instances 3 & 4 can start

---

**Let's build the agent foundation! 🤖**
