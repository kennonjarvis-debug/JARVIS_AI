/**
 * Approval Queue System
 * Human-in-the-loop approval workflow for high-risk autonomous decisions
 * @module core/approval-queue
 */

import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import {
  ApprovalRequest,
  ApprovalResponse,
  ApprovalDecision,
  NotificationChannel,
  ApprovalRecord,
  ApprovalHistoryFilter,
  ApprovalQueueStatus,
  isApprovalExpired,
  EmailNotificationConfig,
  DiscordNotificationConfig,
  WebhookNotificationConfig,
} from '../types/approvals';

/**
 * Approval Queue for managing human-in-the-loop approval workflows
 *
 * Features:
 * - Multi-channel notifications (email, Discord, webhook)
 * - Automatic expiration handling
 * - Approval history tracking
 * - Response validation
 * - Analytics and reporting
 */
export class ApprovalQueue {
  private supabase: SupabaseClient;
  private logger: Logger;
  private notificationChannels: NotificationChannel[];
  private defaultExpirationMs: number;

  /**
   * Create a new ApprovalQueue instance
   * @param supabaseClient - Supabase client for data storage
   * @param notificationChannels - Configured notification channels
   * @param defaultExpirationMs - Default expiration time in milliseconds (default: 24 hours)
   */
  constructor(
    supabaseClient: SupabaseClient,
    notificationChannels: NotificationChannel[] = [],
    defaultExpirationMs: number = 24 * 60 * 60 * 1000 // 24 hours
  ) {
    this.supabase = supabaseClient;
    this.notificationChannels = notificationChannels.filter((ch) => ch.enabled !== false);
    this.defaultExpirationMs = defaultExpirationMs;
    this.logger = new Logger('ApprovalQueue');

    // Sort channels by priority (lower number = higher priority)
    this.notificationChannels.sort((a, b) => (a.priority || 100) - (b.priority || 100));

    this.logger.info('ApprovalQueue initialized', {
      channelCount: this.notificationChannels.length,
      channels: this.notificationChannels.map((ch) => ch.type),
      defaultExpirationHours: defaultExpirationMs / (60 * 60 * 1000),
    });
  }

  /**
   * Request approval for a high-risk task
   * @param request - Approval request details (without id and requestedAt)
   * @returns The unique request ID
   */
  async requestApproval(request: Omit<ApprovalRequest, 'id' | 'requestedAt'>): Promise<string> {
    try {
      // Generate unique ID
      const id = crypto.randomUUID();
      const requestedAt = new Date();

      // Set default expiration if not provided
      const expiresAt =
        request.expiresAt || new Date(Date.now() + this.defaultExpirationMs);

      const fullRequest: ApprovalRequest = {
        ...request,
        id,
        requestedAt,
        expiresAt,
      };

      this.logger.info('Creating approval request', {
        id,
        taskId: request.taskId,
        taskType: request.taskType,
        riskLevel: request.riskLevel,
        expiresAt,
      });

      // Store in database
      const { error } = await this.supabase.from('approvals').insert({
        id: fullRequest.id,
        task_id: fullRequest.taskId,
        task_type: fullRequest.taskType,
        requested_action: fullRequest.requestedAction,
        reasoning: fullRequest.reasoning,
        risk_level: fullRequest.riskLevel,
        estimated_impact: fullRequest.estimatedImpact,
        alternatives: fullRequest.alternatives || null,
        requested_at: fullRequest.requestedAt.toISOString(),
        expires_at: fullRequest.expiresAt?.toISOString() || null,
        metadata: fullRequest.metadata,
        status: 'pending',
      });

      if (error) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to store approval request',
          { error: error.message, requestId: id },
          true
        );
      }

      this.logger.info('Approval request created successfully', { requestId: id });

      // Send notifications
      await this.notifyPendingApproval(id);

      return id;
    } catch (error) {
      if (error instanceof JarvisError) {
        throw error;
      }

      this.logger.error('Failed to create approval request', error as Error);
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create approval request',
        { error: (error as Error).message },
        false
      );
    }
  }

  /**
   * Get all pending approval requests
   * @returns Array of pending approval requests
   */
  async getPending(): Promise<ApprovalRequest[]> {
    try {
      this.logger.debug('Fetching pending approval requests');

      const { data, error } = await this.supabase
        .from('approvals')
        .select('*')
        .eq('status', 'pending')
        .is('responded_at', null)
        .order('requested_at', { ascending: true });

      if (error) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to fetch pending approvals',
          { error: error.message },
          true
        );
      }

      const requests = (data || []).map((row) => this.mapRowToRequest(row));

      this.logger.info('Fetched pending approval requests', { count: requests.length });

      return requests;
    } catch (error) {
      if (error instanceof JarvisError) {
        throw error;
      }

      this.logger.error('Failed to fetch pending approvals', error as Error);
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch pending approvals',
        { error: (error as Error).message },
        false
      );
    }
  }

  /**
   * Submit an approval decision
   * @param response - Approval response (without respondedAt)
   */
  async respond(response: Omit<ApprovalResponse, 'respondedAt'>): Promise<void> {
    try {
      const respondedAt = new Date();

      this.logger.info('Processing approval response', {
        requestId: response.requestId,
        decision: response.decision,
        respondedBy: response.respondedBy,
      });

      // Validate request exists and is pending
      const { data: existingRequest, error: fetchError } = await this.supabase
        .from('approvals')
        .select('*')
        .eq('id', response.requestId)
        .single();

      if (fetchError || !existingRequest) {
        throw new JarvisError(
          ErrorCode.NOT_FOUND,
          'Approval request not found',
          { requestId: response.requestId },
          false
        );
      }

      if (existingRequest.status !== 'pending') {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          'Approval request has already been responded to',
          {
            requestId: response.requestId,
            currentStatus: existingRequest.status,
          },
          false
        );
      }

      // Check if expired
      if (existingRequest.expires_at) {
        const expiresAt = new Date(existingRequest.expires_at);
        if (isApprovalExpired({ ...existingRequest, expiresAt } as ApprovalRequest)) {
          throw new JarvisError(
            ErrorCode.VALIDATION_ERROR,
            'Approval request has expired',
            { requestId: response.requestId, expiresAt },
            false
          );
        }
      }

      // Update database with response
      const { error: updateError } = await this.supabase
        .from('approvals')
        .update({
          status: response.decision,
          responded_by: response.respondedBy,
          responded_at: respondedAt.toISOString(),
          feedback: response.feedback || null,
          modifications: response.modifications || null,
        })
        .eq('id', response.requestId);

      if (updateError) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to update approval request',
          { error: updateError.message, requestId: response.requestId },
          true
        );
      }

      this.logger.info('Approval response recorded successfully', {
        requestId: response.requestId,
        decision: response.decision,
      });

      // Send confirmation notification
      await this.notifyApprovalResponse(response.requestId, response.decision);
    } catch (error) {
      if (error instanceof JarvisError) {
        throw error;
      }

      this.logger.error('Failed to process approval response', error as Error);
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to process approval response',
        { error: (error as Error).message },
        false
      );
    }
  }

  /**
   * Get approval history with optional filters
   * @param filters - Optional filters for history query
   * @returns Array of approval records with responses
   */
  async getHistory(filters?: ApprovalHistoryFilter): Promise<ApprovalRecord[]> {
    try {
      this.logger.debug('Fetching approval history', filters);

      let query = this.supabase.from('approvals').select('*').not('responded_at', 'is', null);

      // Apply filters
      if (filters?.taskType) {
        query = query.eq('task_type', filters.taskType);
      }
      if (filters?.decision) {
        query = query.eq('status', filters.decision);
      }
      if (filters?.since) {
        query = query.gte('requested_at', filters.since.toISOString());
      }
      if (filters?.until) {
        query = query.lte('requested_at', filters.until.toISOString());
      }
      if (filters?.riskLevel) {
        query = query.eq('risk_level', filters.riskLevel);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      query = query.order('requested_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to fetch approval history',
          { error: error.message },
          true
        );
      }

      const records = (data || []).map((row) => this.mapRowToRecord(row));

      this.logger.info('Fetched approval history', { count: records.length });

      return records;
    } catch (error) {
      if (error instanceof JarvisError) {
        throw error;
      }

      this.logger.error('Failed to fetch approval history', error as Error);
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch approval history',
        { error: (error as Error).message },
        false
      );
    }
  }

  /**
   * Send notification about pending approval request
   * @param requestId - Approval request ID
   */
  async notifyPendingApproval(requestId: string): Promise<void> {
    try {
      // Fetch request details
      const { data, error } = await this.supabase
        .from('approvals')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !data) {
        throw new JarvisError(
          ErrorCode.NOT_FOUND,
          'Approval request not found for notification',
          { requestId },
          false
        );
      }

      const request = this.mapRowToRequest(data);

      this.logger.info('Sending approval request notifications', {
        requestId,
        channelCount: this.notificationChannels.length,
      });

      // Send notifications through all configured channels
      const notificationPromises = this.notificationChannels.map((channel) =>
        this.sendNotification(channel, request, 'pending')
      );

      // Wait for all notifications (but don't fail if some fail)
      const results = await Promise.allSettled(notificationPromises);

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failureCount = results.filter((r) => r.status === 'rejected').length;

      this.logger.info('Approval notifications sent', {
        requestId,
        successCount,
        failureCount,
      });

      if (successCount === 0 && this.notificationChannels.length > 0) {
        this.logger.warn('All notification channels failed', { requestId });
      }
    } catch (error) {
      // Don't throw - notification failure shouldn't block approval request creation
      this.logger.error('Failed to send approval notifications', error as Error, {
        requestId,
      });
    }
  }

  /**
   * Send notification about approval response
   * @param requestId - Approval request ID
   * @param decision - The decision made
   */
  private async notifyApprovalResponse(
    requestId: string,
    decision: ApprovalDecision
  ): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('approvals')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !data) {
        this.logger.warn('Could not fetch request for response notification', { requestId });
        return;
      }

      const request = this.mapRowToRequest(data);

      this.logger.debug('Sending approval response notifications', {
        requestId,
        decision,
      });

      const notificationPromises = this.notificationChannels.map((channel) =>
        this.sendNotification(channel, request, decision)
      );

      await Promise.allSettled(notificationPromises);
    } catch (error) {
      this.logger.error('Failed to send response notifications', error as Error, {
        requestId,
      });
    }
  }

  /**
   * Send notification through a specific channel
   */
  private async sendNotification(
    channel: NotificationChannel,
    request: ApprovalRequest,
    status: 'pending' | ApprovalDecision
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(
            channel.config as EmailNotificationConfig,
            request,
            status
          );
          break;
        case 'discord':
          await this.sendDiscordNotification(
            channel.config as DiscordNotificationConfig,
            request,
            status
          );
          break;
        case 'webhook':
          await this.sendWebhookNotification(
            channel.config as WebhookNotificationConfig,
            request,
            status
          );
          break;
        default:
          this.logger.warn('Unknown notification channel type', { type: channel.type });
      }
    } catch (error) {
      this.logger.error(`Failed to send ${channel.type} notification`, error as Error, {
        requestId: request.id,
      });
      throw error;
    }
  }

  /**
   * Send email notification (placeholder - will integrate with Email adapter)
   */
  private async sendEmailNotification(
    config: EmailNotificationConfig,
    request: ApprovalRequest,
    status: 'pending' | ApprovalDecision
  ): Promise<void> {
    // TODO: Integrate with Email adapter (Prompt 8) once available
    this.logger.info('[PLACEHOLDER] Would send email notification', {
      to: config.to,
      requestId: request.id,
      status,
      template: config.template || 'default',
    });

    // For now, just log the notification details
    // Once Email adapter is available, this will become:
    // const emailAdapter = new EmailAdapter(emailConfig);
    // await emailAdapter.sendTemplatedEmail('approval_request', config.to, {...});
  }

  /**
   * Send Discord webhook notification
   */
  private async sendDiscordNotification(
    config: DiscordNotificationConfig,
    request: ApprovalRequest,
    status: 'pending' | ApprovalDecision
  ): Promise<void> {
    const color = this.getStatusColor(status);
    const title =
      status === 'pending'
        ? '🔔 Approval Required'
        : status === 'approved'
        ? '✅ Request Approved'
        : status === 'rejected'
        ? '❌ Request Rejected'
        : '✏️ Request Modified';

    const embed = {
      title,
      description: request.requestedAction,
      color,
      fields: [
        { name: 'Task ID', value: request.taskId, inline: true },
        { name: 'Risk Level', value: request.riskLevel.toUpperCase(), inline: true },
        { name: 'Task Type', value: request.taskType, inline: true },
        { name: 'Reasoning', value: request.reasoning },
        {
          name: 'Financial Impact',
          value: request.estimatedImpact.financial
            ? `$${request.estimatedImpact.financial}`
            : 'N/A',
          inline: true,
        },
        {
          name: 'Expires At',
          value: request.expiresAt
            ? new Date(request.expiresAt).toLocaleString()
            : 'No expiration',
          inline: true,
        },
      ],
      footer: { text: `Request ID: ${request.id}` },
      timestamp: new Date().toISOString(),
    };

    const payload: any = {
      embeds: [embed],
      username: config.username || 'Jarvis Approval Queue',
    };

    if (config.avatarUrl) {
      payload.avatar_url = config.avatarUrl;
    }

    if (config.mentionEveryone && status === 'pending') {
      payload.content = '@everyone';
    }

    await axios.post(config.webhookUrl, payload);

    this.logger.info('Discord notification sent', { requestId: request.id });
  }

  /**
   * Send custom webhook notification
   */
  private async sendWebhookNotification(
    config: WebhookNotificationConfig,
    request: ApprovalRequest,
    status: 'pending' | ApprovalDecision
  ): Promise<void> {
    const payload = {
      requestId: request.id,
      taskId: request.taskId,
      taskType: request.taskType,
      requestedAction: request.requestedAction,
      reasoning: request.reasoning,
      riskLevel: request.riskLevel,
      estimatedImpact: request.estimatedImpact,
      status,
      requestedAt: request.requestedAt,
      expiresAt: request.expiresAt,
      metadata: request.metadata,
    };

    await axios({
      method: config.method || 'POST',
      url: config.url,
      data: payload,
      headers: config.headers,
      timeout: config.timeout || 30000,
    });

    this.logger.info('Webhook notification sent', { requestId: request.id, url: config.url });
  }

  /**
   * Process expired approval requests (auto-reject)
   * @returns Number of requests expired
   */
  async processExpired(): Promise<number> {
    try {
      this.logger.info('Processing expired approval requests');

      const now = new Date();

      // Find expired pending requests
      const { data, error } = await this.supabase
        .from('approvals')
        .select('*')
        .eq('status', 'pending')
        .is('responded_at', null)
        .lt('expires_at', now.toISOString());

      if (error) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to fetch expired approvals',
          { error: error.message },
          true
        );
      }

      const expiredCount = data?.length || 0;

      if (expiredCount === 0) {
        this.logger.debug('No expired approval requests found');
        return 0;
      }

      this.logger.info('Found expired approval requests', { count: expiredCount });

      // Auto-reject expired requests
      const { error: updateError } = await this.supabase
        .from('approvals')
        .update({
          status: 'rejected',
          responded_by: 'system',
          responded_at: now.toISOString(),
          feedback: 'Auto-rejected: Approval request expired',
        })
        .eq('status', 'pending')
        .is('responded_at', null)
        .lt('expires_at', now.toISOString());

      if (updateError) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to auto-reject expired approvals',
          { error: updateError.message },
          true
        );
      }

      this.logger.info('Expired approval requests auto-rejected', { count: expiredCount });

      return expiredCount;
    } catch (error) {
      if (error instanceof JarvisError) {
        throw error;
      }

      this.logger.error('Failed to process expired approvals', error as Error);
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to process expired approvals',
        { error: (error as Error).message },
        false
      );
    }
  }

  /**
   * Get approval queue status and metrics
   * @returns Queue status including counts and metrics
   */
  async getStatus(): Promise<ApprovalQueueStatus> {
    try {
      // Get pending count
      const { count: pendingCount, error: pendingError } = await this.supabase
        .from('approvals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('responded_at', null);

      if (pendingError) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to fetch pending count',
          { error: pendingError.message },
          true
        );
      }

      // Get oldest pending request
      const { data: oldestData } = await this.supabase
        .from('approvals')
        .select('requested_at')
        .eq('status', 'pending')
        .is('responded_at', null)
        .order('requested_at', { ascending: true })
        .limit(1);

      // Get expired count
      const now = new Date();
      const { count: expiredCount, error: expiredError } = await this.supabase
        .from('approvals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('responded_at', null)
        .lt('expires_at', now.toISOString());

      if (expiredError) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to fetch expired count',
          { error: expiredError.message },
          true
        );
      }

      // Calculate average response time
      const { data: responseData } = await this.supabase
        .from('approvals')
        .select('requested_at, responded_at')
        .not('responded_at', 'is', null)
        .gte('requested_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .limit(100);

      let avgResponseTime: number | undefined;
      if (responseData && responseData.length > 0) {
        const responseTimes = responseData.map((row) => {
          const requested = new Date(row.requested_at).getTime();
          const responded = new Date(row.responded_at).getTime();
          return responded - requested;
        });
        avgResponseTime =
          responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      }

      return {
        pendingCount: pendingCount || 0,
        oldestRequest: oldestData?.[0]?.requested_at
          ? new Date(oldestData[0].requested_at)
          : undefined,
        expiredCount: expiredCount || 0,
        avgResponseTime,
      };
    } catch (error) {
      if (error instanceof JarvisError) {
        throw error;
      }

      this.logger.error('Failed to get queue status', error as Error);
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to get queue status',
        { error: (error as Error).message },
        false
      );
    }
  }

  /**
   * Map database row to ApprovalRequest
   */
  private mapRowToRequest(row: any): ApprovalRequest {
    return {
      id: row.id,
      taskId: row.task_id,
      taskType: row.task_type,
      requestedAction: row.requested_action,
      reasoning: row.reasoning,
      riskLevel: row.risk_level,
      estimatedImpact: row.estimated_impact,
      alternatives: row.alternatives || undefined,
      requestedAt: new Date(row.requested_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      metadata: row.metadata || {},
    };
  }

  /**
   * Map database row to ApprovalRecord (request + response)
   */
  private mapRowToRecord(row: any): ApprovalRecord {
    const request = this.mapRowToRequest(row);

    if (row.responded_at) {
      return {
        ...request,
        decision: row.status,
        respondedBy: row.responded_by,
        respondedAt: new Date(row.responded_at),
        feedback: row.feedback || undefined,
        modifications: row.modifications || undefined,
      };
    }

    return request;
  }

  /**
   * Get color code for status (for Discord embeds)
   */
  private getStatusColor(status: 'pending' | ApprovalDecision): number {
    switch (status) {
      case 'pending':
        return 0xffa500; // Orange
      case 'approved':
        return 0x00ff00; // Green
      case 'rejected':
        return 0xff0000; // Red
      case 'modified':
        return 0x0000ff; // Blue
      default:
        return 0x808080; // Gray
    }
  }
}
