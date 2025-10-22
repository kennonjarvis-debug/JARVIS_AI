# Wave 3 - Instance 2: Base Agent & Marketing Agent (Prompt 13)

**Assigned Component:** BaseAgent Abstract Class + Marketing Agent
**Estimated Time:** 5 hours
**Dependencies:** ✅ Decision Engine (P12 - Instance 1), ✅ Memory (P10), ✅ Buffer (P6), ✅ Email (P8), ✅ All Utilities
**Priority:** HIGH - Foundation for all other agents

---

## Your Task

Build the BaseAgent abstract class (shared functionality for all agents) and the MarketingAgent (first specialized agent for social media, content creation, and email campaigns).

---

## Context

**Prompt 13: Marketing Agent & Base Agent** - Agent foundation + marketing automation

**Already complete:** All Wave 1 & Wave 2, Decision Engine (Instance 1)

**You're building:**
1. **BaseAgent** - Abstract class with common agent functionality
2. **MarketingAgent** - Specialized agent for marketing operations

**Important:** BaseAgent will be extended by Sales, Support, and Operations agents (Instances 3-5)

---

## API Contract

See `JARVIS_DESIGN_AND_PROMPTS.md` sections:
- **"5. Agents: Base Agent Interface"**
- **"6. Agents: Marketing Agent"**

### BaseAgent Interface

```typescript
export interface AgentConfig {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  integrations: Record<string, any>;
  llmClient: Anthropic;
  decisionEngine: DecisionEngine;
  memory: MemorySystem;
  approvalQueue: ApprovalQueue;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  requiredIntegrations: string[];
}

export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected capabilities: AgentCapability[];
  protected integrations: Record<string, any>;
  protected llmClient: Anthropic;
  protected decisionEngine: DecisionEngine;
  protected memory: MemorySystem;
  protected approvalQueue: ApprovalQueue;
  protected logger: Logger;
  protected status: 'idle' | 'busy' | 'error';

  constructor(config: AgentConfig);

  // Abstract methods (must be implemented by subclasses)
  abstract getSupportedTaskTypes(): TaskType[];
  abstract canHandle(task: TaskRequest): boolean;
  abstract executeTask(task: TaskRequest): Promise<TaskResult>;

  // Common methods (implemented in BaseAgent)
  async execute(task: TaskRequest): Promise<TaskResult>;
  async requestApproval(task: TaskRequest, decision: DecisionResult): Promise<TaskResult>;
  getStatus(): AgentStatus;
  getCapabilities(): AgentCapability[];
  protected async generateContent(prompt: string, context?: any): Promise<string>;
  protected async logActivity(task: TaskRequest, result: TaskResult): Promise<void>;
}
```

### MarketingAgent Interface

```typescript
export interface SocialPostRequest {
  platform: 'twitter' | 'linkedin' | 'facebook';
  topic: string;
  targetAudience: string;
  tone?: 'professional' | 'casual' | 'humorous';
  hashtags?: string[];
  scheduledTime?: Date;
  includeLink?: string;
}

export interface ContentRequest {
  type: 'blog' | 'tutorial' | 'announcement' | 'case-study';
  topic: string;
  targetKeywords: string[];
  tone: 'professional' | 'casual' | 'technical';
  targetLength: number; // words
  targetAudience: string;
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
  async createSocialPost(request: SocialPostRequest): Promise<TaskResult>;
  async createContent(request: ContentRequest): Promise<TaskResult>;
  async createEmailCampaign(request: EmailCampaignRequest): Promise<TaskResult>;
  async analyzePerformance(timeRange: { start: Date; end: Date }): Promise<PerformanceReport>;

  // Overrides from BaseAgent
  getSupportedTaskTypes(): TaskType[];
  canHandle(task: TaskRequest): boolean;
  executeTask(task: TaskRequest): Promise<TaskResult>;
}
```

---

## Implementation

### 1. Create `src/agents/base-agent.ts`

**Common functionality for all agents:**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import { DecisionEngine } from '../core/decision-engine';
import { MemorySystem } from '../core/memory';
import { ApprovalQueue } from '../core/approval-queue';
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
  protected llmClient: Anthropic;
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
    this.llmClient = config.llmClient;
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
        historicalData: await this.memory.getRelevantContext(task.type, task.data),
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

      // 5. Log activity
      await this.logActivity(task, result);

      // 6. Store in memory
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
   * Generate content using Claude
   */
  protected async generateContent(
    prompt: string,
    context?: any
  ): Promise<string> {
    this.logger.debug('Generating content with Claude', {
      promptLength: prompt.length,
    });

    try {
      const response = await this.llmClient.messages.create({
        model: 'claude-sonnet-4-20250514',
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

  /**
   * Log activity to Supabase
   */
  protected async logActivity(
    task: TaskRequest,
    result: TaskResult
  ): Promise<void> {
    // Store in memory system (which uses Supabase)
    // Already handled in execute() method
    this.logger.info('Activity logged', {
      taskId: task.id,
      success: result.success,
    });
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStatus {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      capabilities: this.capabilities,
      lastActive: new Date(),
    };
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapability[] {
    return this.capabilities;
  }
}
```

---

### 2. Create `src/agents/marketing-agent.ts`

**Marketing-specific implementation:**

```typescript
import { BaseAgent } from './base-agent';
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

export interface ContentRequest {
  type: 'blog' | 'tutorial' | 'announcement' | 'case-study';
  topic: string;
  targetKeywords: string[];
  tone: 'professional' | 'casual' | 'technical';
  targetLength: number;
  targetAudience: string;
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
  private bufferAdapter: BufferAdapter;
  private emailAdapter: EmailAdapter;

  constructor(config: any) {
    super(config);

    if (!config.integrations.buffer) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'MarketingAgent requires Buffer integration',
        { agentId: config.id },
        false
      );
    }

    if (!config.integrations.email) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'MarketingAgent requires Email integration',
        { agentId: config.id },
        false
      );
    }

    this.bufferAdapter = config.integrations.buffer;
    this.emailAdapter = config.integrations.email;
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'marketing.social.post' as TaskType,
      'marketing.content.create' as TaskType,
      'marketing.email.campaign' as TaskType,
      'marketing.analytics' as TaskType,
    ];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    this.logger.info('Executing marketing task', { taskId: task.id, type: task.type });

    switch (task.type) {
      case 'marketing.social.post':
        return await this.createSocialPost(task.data as SocialPostRequest);

      case 'marketing.content.create':
        return await this.createContent(task.data as ContentRequest);

      case 'marketing.email.campaign':
        return await this.createEmailCampaign(task.data as EmailCampaignRequest);

      case 'marketing.analytics':
        return await this.analyzePerformance(task.data);

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
   * Create long-form content
   */
  async createContent(request: ContentRequest): Promise<TaskResult> {
    const prompt = this.buildContentPrompt(request);
    const content = await this.generateContent(prompt);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: {
        content,
        type: request.type,
        wordCount: content.split(/\s+/).length,
        keywords: request.targetKeywords,
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: `${request.type} content created (${content.split(/\s+/).length} words)`,
    };
  }

  /**
   * Create and send email campaign
   */
  async createEmailCampaign(request: EmailCampaignRequest): Promise<TaskResult> {
    // Use template if provided, otherwise use content
    if (request.templateId) {
      // Send using template (bulk)
      const result = await this.emailAdapter.sendBulkEmail({
        templateId: request.templateId,
        recipients: [], // Would fetch from segment
        variables: request.variables || {},
        scheduledAt: request.scheduledTime,
      });

      return {
        taskId: crypto.randomUUID(),
        success: true,
        status: 'completed',
        data: result,
        timestamp: new Date(),
        executedBy: this.id,
        message: `Email campaign sent to ${request.recipientCount} recipients`,
      };
    }

    // Send individual emails
    // ... implementation

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { sent: request.recipientCount },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Email campaign sent to ${request.recipientCount} recipients`,
    };
  }

  /**
   * Analyze marketing performance
   */
  async analyzePerformance(timeRange: { start: Date; end: Date }): Promise<TaskResult> {
    // Fetch Buffer analytics
    const socialAnalytics = await this.bufferAdapter.getAnalytics(
      this.getProfileId('twitter'),
      timeRange.start,
      timeRange.end
    );

    // Aggregate metrics
    const report = {
      social: {
        posts: socialAnalytics.postsCount,
        reach: socialAnalytics.totalReach,
        engagement: socialAnalytics.totalEngagement,
      },
      // Would add email metrics here
    };

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: report,
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Performance report generated',
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
- Engaging and on-brand
- Clear call-to-action
- Optimized for ${request.platform}
- Stay under ${platformLimits[request.platform]} characters

Generate only the post content, no additional commentary.`;
  }

  /**
   * Build prompt for content generation
   */
  private buildContentPrompt(request: ContentRequest): string {
    return `Create ${request.type} content about: ${request.topic}

Target Audience: ${request.targetAudience}
Target Length: ${request.targetLength} words
Tone: ${request.tone}
SEO Keywords to include: ${request.targetKeywords.join(', ')}

Requirements:
- Engaging introduction
- Well-structured with headings
- Include target keywords naturally
- Clear conclusions/takeaways
- ${request.tone} tone throughout

Generate the complete content.`;
  }

  /**
   * Optimize content for specific platform
   */
  private optimizeForPlatform(content: string, platform: string): string {
    // Truncate if needed, add hashtags, etc.
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
    // Would come from config
    const profileIds: Record<string, string> = {
      twitter: process.env.BUFFER_TWITTER_PROFILE_ID || '',
      linkedin: process.env.BUFFER_LINKEDIN_PROFILE_ID || '',
      facebook: process.env.BUFFER_FACEBOOK_PROFILE_ID || '',
    };

    return profileIds[platform];
  }
}
```

---

### 3. Create Tests

**`src/agents/base-agent.test.ts`:**
- Constructor initialization
- execute() method with decision engine
- requestApproval() workflow
- generateContent() with Claude
- Error handling
- Status reporting

**`src/agents/marketing-agent.test.ts`:**
- Social post creation
- Content generation
- Email campaign sending
- Performance analytics
- Platform-specific optimizations
- Integration with Buffer and Email

---

### 4. Create `docs/agents-overview.md`

**Documentation covering:**
- Agent architecture
- BaseAgent implementation
- How to create new agents
- MarketingAgent features
- Integration patterns
- Best practices

---

## Output Files

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/agents/base-agent.ts` | Abstract base class | ~400 |
| `src/agents/marketing-agent.ts` | Marketing agent impl | ~500 |
| `src/agents/base-agent.test.ts` | Base tests | ~300 |
| `src/agents/marketing-agent.test.ts` | Marketing tests | ~400 |
| `docs/agents-overview.md` | Documentation | ~300 |

**Total:** ~1,900 lines

---

## Acceptance Criteria

- [ ] BaseAgent abstract class complete
- [ ] MarketingAgent extends BaseAgent
- [ ] All task types supported
- [ ] Claude integration for content generation
- [ ] Buffer integration for social posts
- [ ] Email integration for campaigns
- [ ] Decision engine integration
- [ ] Approval queue integration
- [ ] Memory system integration
- [ ] Test coverage >80%
- [ ] Documentation complete

---

## Testing Commands

```bash
npm test src/agents/
npm run test:coverage -- src/agents/
npm run typecheck
npm run build
```

---

**Start Time:** After Instance 1 (Decision Engine) is 50% complete
**Expected Completion:** 5 hours
**Next Steps:** Sales & Support agents (Instances 3-4) can extend BaseAgent

---

🎨 **Build the foundation for all agents!**
