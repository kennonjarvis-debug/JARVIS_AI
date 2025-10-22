/**
 * Sales Agent
 *
 * Autonomous sales operations agent for lead qualification,
 * outreach, and CRM management.
 */

import { BaseAgent } from './base-agent.js';
import { CONFIG, RISK_THRESHOLDS } from '../config/tools.js';
import type { HubSpotAdapter } from '../integrations/hubspot.js';
import type { EmailAdapter } from '../integrations/email.js';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks.js';
import { JarvisError, ErrorCode } from '../utils/error-handler.js';

/**
 * Lead qualification result
 */
export interface LeadQualification {
  leadId: string;
  score: number;
  category: 'hot' | 'warm' | 'cold';
  reasoning: string;
  signals: {
    companySize?: number;
    jobTitleMatch: boolean;
    engagementLevel: 'high' | 'medium' | 'low';
    intentSignals: string[];
  };
  recommendedAction: 'immediate_outreach' | 'nurture' | 'low_priority';
}

/**
 * Outreach request
 */
export interface OutreachRequest {
  leadId: string;
  channel: 'email' | 'linkedin';
  personalizationData?: Record<string, any>;
}

/**
 * Deal update request
 */
export interface DealUpdate {
  dealId: string;
  stage?: string;
  amount?: number;
  closeDate?: Date;
  notes?: string;
}

/**
 * Sales Agent
 *
 * Handles lead qualification, personalized outreach, and deal management.
 */
export class SalesAgent extends BaseAgent {
  private hubspotAdapter: HubSpotAdapter;
  private emailAdapter: EmailAdapter;

  constructor(config: any) {
    super(config);

    // ✅ Ensure HubSpot integration exists
    if (!config.integrations.hubspot) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'HubSpot integration required for Sales Agent',
        { agentId: config.id },
        false
      );
    }

    this.hubspotAdapter = config.integrations.hubspot;
    this.emailAdapter = config.integrations.email;

    this.logger.info('SalesAgent initialized with HubSpot integration');
  }

  // ========================================================================
  // Required BaseAgent implementations
  // ========================================================================

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
    this.logger.info('Executing sales task', { taskType: task.type });

    switch (task.type) {
      case 'sales.lead.qualify':
        return await this.qualifyLeadTask(task.data);

      case 'sales.outreach.send':
        return await this.sendOutreach(task.data);

      case 'sales.deal.create':
        return await this.createDealTask(task.data);

      case 'sales.deal.update':
        return await this.updateDealTask(task.data);

      default:
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Unsupported task type: ${task.type}`,
          { taskId: task.id, taskType: task.type },
          false
        );
    }
  }

  // ========================================================================
  // Core sales methods
  // ========================================================================

  /**
   * Qualify lead with scoring algorithm
   *
   * Scores lead 0-100 based on:
   * - Company size (20 points)
   * - Job title (25 points)
   * - Engagement (30 points)
   * - Intent signals (25 points)
   */
  async qualifyLead(leadData: any): Promise<LeadQualification> {
    this.logger.info('Qualifying lead', { leadId: leadData.id });

    // Calculate score components (0-100 total)
    const companyScore = this.scoreCompanySize(leadData.company?.size);
    const jobTitleScore = this.scoreJobTitle(leadData.jobTitle);
    const engagementScore = this.scoreEngagement(leadData.engagement);
    const intentScore = this.scoreIntent(leadData.intentSignals || []);

    const totalScore = companyScore + jobTitleScore + engagementScore + intentScore;

    // Categorize based on score
    let category: 'hot' | 'warm' | 'cold';
    let recommendedAction: 'immediate_outreach' | 'nurture' | 'low_priority';

    if (totalScore >= 75) {
      category = 'hot';
      recommendedAction = 'immediate_outreach';
    } else if (totalScore >= 50) {
      category = 'warm';
      recommendedAction = 'nurture';
    } else {
      category = 'cold';
      recommendedAction = 'low_priority';
    }

    // Generate reasoning with Claude
    const reasoning = await this.generateLeadReasoning(leadData, totalScore);

    const qualification: LeadQualification = {
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

    this.logger.info('Lead qualified', {
      leadId: leadData.id,
      score: totalScore,
      category,
    });

    return qualification;
  }

  /**
   * Send personalized outreach
   *
   * 1. Gets lead from HubSpot
   * 2. Generates personalized message with Claude
   * 3. Sends via email
   * 4. Logs activity in HubSpot
   * 5. Schedules follow-up
   */
  async sendOutreach(request: OutreachRequest): Promise<TaskResult> {
    this.logger.info('Sending outreach', {
      leadId: request.leadId,
      channel: request.channel,
    });

    try {
      // 1. Get lead from HubSpot
      const contact = await this.hubspotAdapter.getContactByEmail(request.leadId);
      if (!contact) {
        throw new JarvisError(
          ErrorCode.NOT_FOUND,
          `Contact not found: ${request.leadId}`,
          { leadId: request.leadId },
          false
        );
      }

      // 2. Generate personalized message with Claude
      const message = await this.generateOutreachMessage(
        contact,
        request.personalizationData || {}
      );

      // 3. Send via email
      await this.emailAdapter.sendEmail({
        to: contact.email,
        subject: message.subject,
        html: message.body,
      });

      // 4. Log activity in HubSpot
      await this.hubspotAdapter.logActivity(contact.id!, {
        type: 'email',
        subject: message.subject,
        body: message.body,
      });

      // 5. Schedule follow-up (3 days)
      await this.scheduleFollowUp(request.leadId, 3);

      return this.createTaskResult(
        crypto.randomUUID(),
        true,
        {
          leadId: request.leadId,
          channel: request.channel,
          subject: message.subject,
        },
        `Outreach sent via ${request.channel}`
      );
    } catch (error) {
      this.logger.error('Failed to send outreach', error as Error, {
        leadId: request.leadId,
      });
      throw error;
    }
  }

  /**
   * Create deal in HubSpot
   */
  async createDeal(dealData: any): Promise<string> {
    this.logger.info('Creating deal', { dealName: dealData.name });

    const dealId = await this.hubspotAdapter.createDeal({
      dealname: dealData.name,
      amount: dealData.amount,
      dealstage: dealData.stage || 'qualification',
      closedate: dealData.closeDate,
      contactId: dealData.contactId,
    });

    this.logger.info('Deal created', { dealId, dealName: dealData.name });
    return dealId;
  }

  /**
   * Update deal in HubSpot
   */
  async updateDeal(update: DealUpdate): Promise<void> {
    this.logger.info('Updating deal', {
      dealId: update.dealId,
      stage: update.stage,
    });

    await this.hubspotAdapter.updateDealStage(
      update.dealId,
      update.stage || 'qualification'
    );

    if (update.notes) {
      await this.hubspotAdapter.logActivity(update.dealId, {
        type: 'note',
        subject: 'Deal Update',
        body: update.notes,
      });
    }

    this.logger.info('Deal updated', { dealId: update.dealId });
  }

  // ========================================================================
  // Lead scoring helpers
  // ========================================================================

  /**
   * Score company size (0-20 points)
   */
  private scoreCompanySize(size?: number): number {
    if (!size) return 0;
    if (size >= 1000) return 20; // Enterprise
    if (size >= 100) return 15;  // Mid-market
    if (size >= 10) return 10;   // SMB
    return 5;                     // Micro
  }

  /**
   * Score job title (0-25 points)
   */
  private scoreJobTitle(title?: string): number {
    if (!title) return 0;
    const normalized = title.toLowerCase();

    // Helper to check for word boundaries
    const hasWord = (text: string, word: string) => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(text);
    };

    // Influencers (Directors, VPs) - check BEFORE executive to catch "vice president"
    if (
      normalized.includes('director') ||
      hasWord(normalized, 'vp') ||
      normalized.includes('vice president') ||
      normalized.includes('head of') ||
      hasWord(normalized, 'chief')
    ) {
      return 20;
    }

    // Decision makers (C-level, founders) - check AFTER to avoid "vice president" matching "president"
    if (
      hasWord(normalized, 'ceo') ||
      hasWord(normalized, 'cto') ||
      hasWord(normalized, 'cfo') ||
      hasWord(normalized, 'coo') ||
      normalized.includes('founder') ||
      normalized.includes('co-founder') ||
      hasWord(normalized, 'president') ||
      hasWord(normalized, 'owner')
    ) {
      return 25;
    }

    // Users (Managers, Leads)
    if (
      normalized.includes('manager') ||
      hasWord(normalized, 'lead') ||
      normalized.includes('supervisor') ||
      normalized.includes('coordinator')
    ) {
      return 15;
    }

    return 5; // Individual contributor
  }

  /**
   * Score engagement (0-30 points)
   */
  private scoreEngagement(engagement?: any): number {
    if (!engagement) return 0;

    let score = 0;

    if (engagement.emailOpens > 3) score += 10;
    if (engagement.emailClicks > 1) score += 10;
    if (engagement.websiteVisits > 2) score += 10;

    return Math.min(score, 30);
  }

  /**
   * Score intent signals (0-25 points)
   */
  private scoreIntent(signals: string[]): number {
    const highIntent = [
      'pricing',
      'demo',
      'trial',
      'contact',
      'buy',
      'purchase',
      'quote',
      'upgrade',
    ];

    const matches = signals.filter((s) =>
      highIntent.some((hi) => s.toLowerCase().includes(hi))
    );

    return Math.min(matches.length * 8, 25);
  }

  /**
   * Categorize engagement score
   */
  private categorizeEngagement(score: number): 'high' | 'medium' | 'low' {
    if (score >= 20) return 'high';
    if (score >= 10) return 'medium';
    return 'low';
  }

  // ========================================================================
  // AI-powered content generation
  // ========================================================================

  /**
   * Generate personalized outreach message with Claude
   */
  private async generateOutreachMessage(
    contact: any,
    personalizationData: any
  ): Promise<{ subject: string; body: string }> {
    const prompt = `Create a personalized sales outreach email.

Contact Information:
- Name: ${contact.firstname} ${contact.lastname}
- Company: ${contact.company || 'Unknown'}
- Job Title: ${contact.lifecyclestage || 'Unknown'}

Personalization Data:
${JSON.stringify(personalizationData, null, 2)}

Our Product: DAWG AI - Browser-based Digital Audio Workstation

Requirements:
- Professional and personalized tone
- Tailored to their role and company
- Clear value proposition for music producers
- Soft call-to-action (demo or trial)
- 150-200 words
- Include specific benefits relevant to their situation

Provide response as JSON:
{
  "subject": "email subject line (under 60 chars)",
  "body": "email body in HTML format"
}`;

    try {
      return await this.generateJSON<{ subject: string; body: string }>(prompt);
    } catch (error) {
      this.logger.error('Failed to generate outreach message', error as Error);
      // Fallback to generic message
      return {
        subject: 'Introducing DAWG AI - Browser-based Music Production',
        body: `<p>Hi ${contact.firstname},</p><p>I wanted to reach out about DAWG AI, a browser-based digital audio workstation that's changing how music producers work.</p><p>Would you be interested in a quick demo?</p><p>Best regards,<br>DAWG AI Team</p>`,
      };
    }
  }

  /**
   * Generate lead qualification reasoning with Claude
   */
  private async generateLeadReasoning(leadData: any, score: number): Promise<string> {
    const prompt = `Analyze this lead and explain the qualification score of ${score}/100.

Lead Data:
- Name: ${leadData.firstName} ${leadData.lastName}
- Company: ${leadData.company?.name} (${leadData.company?.size || 'unknown'} employees)
- Job Title: ${leadData.jobTitle}
- Email: ${leadData.email}
- Engagement: ${JSON.stringify(leadData.engagement || {})}
- Intent Signals: ${(leadData.intentSignals || []).join(', ') || 'none'}

Provide a concise 2-3 sentence explanation of why this lead received this score.
Focus on the key factors that influenced the score.`;

    try {
      return await this.generateContent(prompt);
    } catch (error) {
      this.logger.error('Failed to generate reasoning', error as Error);
      return `Lead scored ${score}/100 based on company size, job title, engagement level, and intent signals.`;
    }
  }

  /**
   * Schedule follow-up task
   */
  private async scheduleFollowUp(leadId: string, delayDays: number): Promise<void> {
    this.logger.debug('Scheduling follow-up', { leadId, delayDays });

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

  // ========================================================================
  // Task wrapper methods
  // ========================================================================

  /**
   * Qualify lead task wrapper
   */
  private async qualifyLeadTask(leadData: any): Promise<TaskResult> {
    const qualification = await this.qualifyLead(leadData);

    // Update HubSpot with score
    if (this.hubspotAdapter && leadData.id) {
      try {
        await this.hubspotAdapter.upsertContact({
          email: leadData.email,
          properties: {
            lead_score: qualification.score,
            lead_category: qualification.category,
          },
        });
      } catch (error) {
        this.logger.warn('Failed to update HubSpot with lead score', {
          leadId: leadData.id,
        });
      }
    }

    return this.createTaskResult(
      crypto.randomUUID(),
      true,
      qualification,
      `Lead qualified: ${qualification.category} (${qualification.score}/100)`
    );
  }

  /**
   * Create deal task wrapper
   */
  private async createDealTask(dealData: any): Promise<TaskResult> {
    const dealId = await this.createDeal(dealData);

    return this.createTaskResult(
      crypto.randomUUID(),
      true,
      { dealId },
      `Deal created: ${dealData.name}`
    );
  }

  /**
   * Update deal task wrapper
   */
  private async updateDealTask(update: DealUpdate): Promise<TaskResult> {
    await this.updateDeal(update);

    return this.createTaskResult(
      crypto.randomUUID(),
      true,
      update,
      `Deal updated: ${update.stage || 'stage changed'}`
    );
  }
}
