/**
 * DAWG AI Webhook Handler
 *
 * Handles webhook events from DAWG AI platform.
 *
 * @module webhooks/dawg-ai-webhook
 */

import crypto from 'crypto';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  data: any;
  userId: string;
}

/**
 * DAWG AI Webhook Service
 */
export class DawgAIWebhookService {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.DAWG_AI_WEBHOOK_SECRET || '';
    if (!this.webhookSecret) {
      logger.warn('DAWG AI webhook secret not configured');
    }
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('Webhook verification skipped - no secret configured');
      return true; // Allow in development
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Handle webhook event
   */
  async handleEvent(event: WebhookEvent): Promise<void> {
    logger.info('Processing DAWG AI webhook event', {
      type: event.type,
      eventId: event.id,
    });

    try {
      switch (event.type) {
        case 'project.created':
          await this.handleProjectCreated(event);
          break;

        case 'project.updated':
          await this.handleProjectUpdated(event);
          break;

        case 'project.deleted':
          await this.handleProjectDeleted(event);
          break;

        case 'workflow.completed':
          await this.handleWorkflowCompleted(event);
          break;

        case 'workflow.failed':
          await this.handleWorkflowFailed(event);
          break;

        case 'automation.triggered':
          await this.handleAutomationTriggered(event);
          break;

        default:
          logger.warn('Unknown webhook event type', { type: event.type });
      }

      // Log event for analytics
      await this.logWebhookEvent(event);
    } catch (error: any) {
      logger.error('Failed to handle webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle project created event
   */
  private async handleProjectCreated(event: WebhookEvent): Promise<void> {
    const { project } = event.data;

    await prisma.dawgAIProject.upsert({
      where: {
        userId_externalId: {
          userId: event.userId,
          externalId: project.id,
        },
      },
      create: {
        userId: event.userId,
        externalId: project.id,
        name: project.name,
        description: project.description,
        status: project.status || 'active',
        metadata: project.metadata || {},
      },
      update: {
        name: project.name,
        description: project.description,
        status: project.status || 'active',
        metadata: project.metadata || {},
        updatedAt: new Date(),
      },
    });

    logger.info('Project created via webhook', {
      userId: event.userId,
      projectId: project.id,
    });
  }

  /**
   * Handle project updated event
   */
  private async handleProjectUpdated(event: WebhookEvent): Promise<void> {
    const { project } = event.data;

    await prisma.dawgAIProject.updateMany({
      where: {
        userId: event.userId,
        externalId: project.id,
      },
      data: {
        name: project.name,
        description: project.description,
        status: project.status,
        metadata: project.metadata || {},
        updatedAt: new Date(),
      },
    });

    logger.info('Project updated via webhook', {
      userId: event.userId,
      projectId: project.id,
    });
  }

  /**
   * Handle project deleted event
   */
  private async handleProjectDeleted(event: WebhookEvent): Promise<void> {
    const { projectId } = event.data;

    await prisma.dawgAIProject.deleteMany({
      where: {
        userId: event.userId,
        externalId: projectId,
      },
    });

    logger.info('Project deleted via webhook', {
      userId: event.userId,
      projectId,
    });
  }

  /**
   * Handle workflow completed event
   */
  private async handleWorkflowCompleted(event: WebhookEvent): Promise<void> {
    const { workflowId, executionId, duration, output } = event.data;

    // Update workflow last run time
    await prisma.dawgAIWorkflow.updateMany({
      where: {
        userId: event.userId,
        id: workflowId,
      },
      data: {
        lastRun: new Date(),
      },
    });

    // Update execution status
    await prisma.dawgAIWorkflowExecution.updateMany({
      where: {
        id: executionId,
        userId: event.userId,
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
        logs: {
          completed: true,
          duration,
          output,
        },
      },
    });

    logger.info('Workflow completed via webhook', {
      userId: event.userId,
      workflowId,
      executionId,
    });
  }

  /**
   * Handle workflow failed event
   */
  private async handleWorkflowFailed(event: WebhookEvent): Promise<void> {
    const { workflowId, executionId, error } = event.data;

    await prisma.dawgAIWorkflowExecution.updateMany({
      where: {
        id: executionId,
        userId: event.userId,
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error,
      },
    });

    logger.info('Workflow failed via webhook', {
      userId: event.userId,
      workflowId,
      executionId,
      error,
    });
  }

  /**
   * Handle automation triggered event
   */
  private async handleAutomationTriggered(event: WebhookEvent): Promise<void> {
    const { automationId } = event.data;

    await prisma.dawgAIAutomation.updateMany({
      where: {
        userId: event.userId,
        id: automationId,
      },
      data: {
        lastTriggered: new Date(),
      },
    });

    logger.info('Automation triggered via webhook', {
      userId: event.userId,
      automationId,
    });
  }

  /**
   * Log webhook event for analytics
   */
  private async logWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      await prisma.dawgAIAnalytics.create({
        data: {
          userId: event.userId,
          eventType: event.type,
          success: true,
          metadata: {
            eventId: event.id,
            timestamp: event.timestamp,
            data: event.data,
          },
        },
      });
    } catch (error) {
      // Don't throw on logging errors
      logger.error('Failed to log webhook event:', error);
    }
  }
}

/**
 * Express middleware for webhook handling
 */
export function createWebhookHandler(webhookService: DawgAIWebhookService) {
  return async (req: Request, res: Response) => {
    try {
      // Verify signature
      const signature = req.headers['x-dawg-ai-signature'] as string;
      const payload = JSON.stringify(req.body);

      if (!signature || !webhookService.verifySignature(payload, signature)) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Parse event
      const event: WebhookEvent = req.body;

      // Handle event asynchronously
      webhookService.handleEvent(event).catch((error) => {
        logger.error('Async webhook processing failed:', error);
      });

      // Respond immediately to webhook
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Singleton instance
 */
let webhookServiceInstance: DawgAIWebhookService | null = null;

/**
 * Get webhook service instance
 */
export function getDawgAIWebhookService(): DawgAIWebhookService {
  if (!webhookServiceInstance) {
    webhookServiceInstance = new DawgAIWebhookService();
  }
  return webhookServiceInstance;
}

export default DawgAIWebhookService;
