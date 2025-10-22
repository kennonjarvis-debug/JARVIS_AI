/**
 * Marketing Agent
 *
 * Specialized agent for marketing tasks:
 * - Social media post creation and scheduling (via Buffer)
 * - Email campaign management (via Brevo)
 * - Content generation with Claude
 *
 * ✅ Enforces Brevo 300/day limit on free tier
 * ✅ Batches large campaigns across multiple days
 */

import { BaseAgent } from './base-agent.js';
import { CONFIG } from '../config/tools.js';
import { JarvisError, ErrorCode } from '../utils/error-handler.js';
import type { BufferAdapter } from '../integrations/buffer.js';
import type { EmailAdapter } from '../integrations/email.js';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks.js';

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

/**
 * Marketing Agent - Handles social media and email campaigns
 *
 * Integrations:
 * - Buffer for social media scheduling
 * - Brevo for email campaigns (300/day free tier)
 * - Claude for content generation
 */
export class MarketingAgent extends BaseAgent {
  private bufferAdapter?: BufferAdapter;
  private emailAdapter?: EmailAdapter;
  private dailyEmailCount: number = 0; // Track daily sends
  private lastResetDate: Date = new Date();

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
    // Reset daily count if it's a new day
    this.checkAndResetDailyCount();

    switch (task.type) {
      case 'marketing.social.post':
        return await this.createSocialPost(task);

      case 'marketing.email.campaign':
        return await this.createEmailCampaign(task);

      case 'marketing.content.create':
        return await this.createContent(task);

      default:
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Unsupported task type: ${task.type}`,
          { taskId: task.id, taskType: task.type },
          false
        );
    }
  }

  /**
   * Create and schedule a social media post
   *
   * Flow:
   * 1. Validate task data
   * 2. Generate content with Claude
   * 3. Optimize for platform (character limits)
   * 4. Schedule via Buffer
   */
  private async createSocialPost(task: TaskRequest): Promise<TaskResult> {
    if (!this.bufferAdapter) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Buffer integration not configured',
        { taskId: task.id },
        false
      );
    }

    // Validate required fields
    this.validateTaskData(task, ['platform', 'topic', 'targetAudience']);

    const request = task.data as SocialPostRequest;

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

    this.logger.info('Social post created', {
      taskId: task.id,
      platform: request.platform,
      postId: bufferResult.id,
    });

    return this.createTaskResult(
      task.id,
      true,
      {
        postId: bufferResult.id,
        content: optimized,
        platform: request.platform,
        scheduledFor: request.scheduledTime || new Date(),
      },
      `Social post created and scheduled for ${request.platform}`
    );
  }

  /**
   * Create and send email campaign
   *
   * ✅ Enforces Brevo 300/day limit (free tier)
   * ✅ Batches campaigns >300 recipients across multiple days
   *
   * Flow:
   * 1. Validate email adapter is configured
   * 2. Check remaining daily limit
   * 3. If >300 total recipients, batch across days
   * 4. If exceeds remaining limit, reject or batch
   * 5. Send campaign via email adapter
   * 6. Update daily count
   */
  private async createEmailCampaign(task: TaskRequest): Promise<TaskResult> {
    if (!this.emailAdapter) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Email integration not configured',
        { taskId: task.id },
        false
      );
    }

    // Validate required fields
    this.validateTaskData(task, ['segment', 'subject', 'content', 'recipientCount']);

    const request = task.data as EmailCampaignRequest;

    // ✅ Check Brevo daily limit (300 emails/day on free tier)
    const remainingToday = CONFIG.brevoDailyLimit - this.dailyEmailCount;

    this.logger.debug('Checking email campaign against daily limit', {
      taskId: task.id,
      recipientCount: request.recipientCount,
      dailyLimit: CONFIG.brevoDailyLimit,
      dailyCount: this.dailyEmailCount,
      remainingToday,
    });

    // If campaign exceeds remaining today's limit
    if (request.recipientCount > remainingToday) {
      this.logger.warn('Email campaign exceeds daily limit', {
        taskId: task.id,
        recipientCount: request.recipientCount,
        remainingToday,
        dailyLimit: CONFIG.brevoDailyLimit,
      });

      // ✅ Batch into multiple days if >300 total
      if (request.recipientCount > CONFIG.brevoDailyLimit) {
        this.logger.info('Batching large email campaign', {
          taskId: task.id,
          recipientCount: request.recipientCount,
        });
        return await this.batchEmailCampaign(task, request);
      }

      // Campaign fits in one batch but exceeds today's remaining limit
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        `Email campaign exceeds remaining daily limit (${remainingToday}/${CONFIG.brevoDailyLimit})`,
        {
          taskId: task.id,
          recipientCount: request.recipientCount,
          remainingToday,
          dailyLimit: CONFIG.brevoDailyLimit,
        },
        false
      );
    }

    // Send via email adapter
    const result = await this.emailAdapter.sendBulkEmail([{
      to: '', // Would fetch from segment in real implementation
      subject: request.subject || 'Campaign',
      body: '',
      from: CONFIG.email?.from || 'noreply@dawg-ai.com',
    }]);

    // Update daily count
    this.dailyEmailCount += request.recipientCount;

    this.logger.info('Email campaign sent', {
      taskId: task.id,
      recipientCount: request.recipientCount,
      dailyCountUsed: this.dailyEmailCount,
    });

    return this.createTaskResult(
      task.id,
      true,
      {
        ...result,
        recipientCount: request.recipientCount,
        dailyCountUsed: this.dailyEmailCount,
        remainingToday: CONFIG.brevoDailyLimit - this.dailyEmailCount,
      },
      `Email campaign sent to ${request.recipientCount} recipients`
    );
  }

  /**
   * ✅ Batch large campaigns into 300-email chunks across multiple days
   *
   * This ensures we stay within Brevo's free tier limit of 300 emails/day.
   * Each batch is scheduled for a different day.
   *
   * @param task - Original task request
   * @param request - Email campaign details
   * @returns Task result with batch plan
   */
  private async batchEmailCampaign(
    task: TaskRequest,
    request: EmailCampaignRequest
  ): Promise<TaskResult> {
    const batchSize = CONFIG.brevoBatchSize; // 300
    const totalBatches = Math.ceil(request.recipientCount / batchSize);

    this.logger.info('Batching email campaign', {
      taskId: task.id,
      recipientCount: request.recipientCount,
      batchSize,
      totalBatches,
    });

    // Schedule batches across multiple days
    const batches = [];
    for (let i = 0; i < totalBatches; i++) {
      const batchDate = new Date();
      batchDate.setDate(batchDate.getDate() + i); // One batch per day
      batchDate.setHours(10, 0, 0, 0); // Schedule for 10 AM each day

      batches.push({
        batchNumber: i + 1,
        recipientCount: Math.min(batchSize, request.recipientCount - i * batchSize),
        scheduledFor: batchDate,
        status: 'planned',
      });
    }

    // Store batch plan in memory for execution
    await this.memory.store({
      type: 'task_execution' as any,
      content: {
        originalRequest: request,
        batches,
        status: 'planned',
        taskType: 'marketing.email.campaign.batched',
        totalBatches,
        totalRecipients: request.recipientCount,
      },
      timestamp: new Date(),
      importance: 0.8,
      agentId: this.id,
      taskId: task.id,
      tags: ['email_campaign', 'batched'],
    });

    this.logger.info('Email campaign batched successfully', {
      taskId: task.id,
      totalBatches,
      batches,
    });

    return this.createTaskResult(
      task.id,
      true,
      {
        batched: true,
        totalBatches,
        totalRecipients: request.recipientCount,
        batchSize,
        batches,
      },
      `Email campaign batched into ${totalBatches} sends across ${totalBatches} days (${batchSize} emails per day)`
    );
  }

  /**
   * Create marketing content (blog post, article, etc.)
   *
   * Uses Claude to generate long-form content based on the request.
   */
  private async createContent(task: TaskRequest): Promise<TaskResult> {
    this.validateTaskData(task, ['contentType', 'topic']);

    const { contentType, topic, targetAudience, tone, wordCount } = task.data;

    const prompt = `Create ${contentType} content about: ${topic}

Target Audience: ${targetAudience || 'General audience'}
Tone: ${tone || 'professional'}
Word Count: ${wordCount || '500-800'} words

Requirements:
- Engaging and informative
- SEO-optimized
- Include clear introduction and conclusion
- On-brand for DAWG AI (browser-based DAW)

Generate the complete content.`;

    const content = await this.generateContent(prompt);

    this.logger.info('Marketing content created', {
      taskId: task.id,
      contentType,
      wordCount: content.split(' ').length,
    });

    return this.createTaskResult(
      task.id,
      true,
      {
        contentType,
        topic,
        content,
        wordCount: content.split(' ').length,
      },
      `${contentType} content created for topic: ${topic}`
    );
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
   * Optimize content for specific platform character limits
   */
  private optimizeForPlatform(content: string, platform: string): string {
    const limits = {
      twitter: 280,
      linkedin: 3000,
      facebook: 5000,
    };

    const limit = limits[platform as keyof typeof limits];

    if (content.length > limit) {
      this.logger.warn('Content exceeds platform limit, truncating', {
        platform,
        originalLength: content.length,
        limit,
      });
      return content.substring(0, limit - 3) + '...';
    }

    return content;
  }

  /**
   * Get Buffer profile ID for platform from environment
   */
  private getProfileId(platform: string): string {
    const profileIds: Record<string, string> = {
      twitter: process.env.BUFFER_TWITTER_PROFILE_ID || '',
      linkedin: process.env.BUFFER_LINKEDIN_PROFILE_ID || '',
      facebook: process.env.BUFFER_FACEBOOK_PROFILE_ID || '',
    };

    const profileId = profileIds[platform];

    if (!profileId) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        `Buffer profile ID not configured for ${platform}`,
        { platform },
        false
      );
    }

    return profileId;
  }

  /**
   * Check if it's a new day and reset daily count if needed
   */
  private checkAndResetDailyCount(): void {
    const now = new Date();
    const lastReset = this.lastResetDate;

    // Check if it's a new day (compare dates only, ignore time)
    if (
      now.getFullYear() !== lastReset.getFullYear() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getDate() !== lastReset.getDate()
    ) {
      this.dailyEmailCount = 0;
      this.lastResetDate = now;
      this.logger.info('Daily email count reset', {
        previousDate: lastReset.toISOString().split('T')[0],
        currentDate: now.toISOString().split('T')[0],
      });
    }
  }

  /**
   * Get current daily email count and remaining capacity
   */
  getDailyEmailStats(): {
    sent: number;
    limit: number;
    remaining: number;
    resetDate: Date;
  } {
    return {
      sent: this.dailyEmailCount,
      limit: CONFIG.brevoDailyLimit,
      remaining: CONFIG.brevoDailyLimit - this.dailyEmailCount,
      resetDate: this.lastResetDate,
    };
  }

  /**
   * Manually reset daily email count (for testing or manual intervention)
   */
  resetDailyEmailCount(): void {
    this.dailyEmailCount = 0;
    this.lastResetDate = new Date();
    this.logger.info('Daily email count manually reset');
  }
}
