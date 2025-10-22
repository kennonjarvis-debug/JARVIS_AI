/**
 * Automation Engine
 *
 * Event-driven workflow automation system that connects all business modules.
 *
 * Features:
 * - Event-based triggers
 * - Conditional logic
 * - Multi-action workflows
 * - Scheduled automations
 * - AI-powered actions
 *
 * Example automations:
 * - When lead created → Enrich lead data → Send to sales team
 * - When negative sentiment detected → Escalate ticket → Notify manager
 * - When campaign completed → Analyze performance → Generate report
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import {
  BusinessAutomation,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
  BusinessEvent
} from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export interface AutomationEngineConfig {
  maxConcurrent: number; // Maximum concurrent automation executions
  retryAttempts: number; // Number of retry attempts for failed actions
  logRetentionDays: number; // How long to keep execution logs
}

export class AutomationEngine extends EventEmitter {
  private prisma: PrismaClient;
  private config: AutomationEngineConfig;
  private isInitialized: boolean = false;
  private runningAutomations: Set<string> = new Set();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: AutomationEngineConfig) {
    super();
    this.prisma = new PrismaClient();
    this.config = config;
  }

  /**
   * Initialize automation engine
   */
  async initialize(eventBus: EventEmitter): Promise<void> {
    logger.info('Automation engine initializing', {
      service: 'automation'
    });

    try {
      // Load all enabled automations
      const automations = await this.prisma.businessAutomation.findMany({
        where: { enabled: true }
      });

      logger.info(`Loaded ${automations.length} enabled automations`, {
        service: 'automation'
      });

      // Register event listeners for each automation
      for (const automation of automations) {
        const automationData = this.convertToAutomation(automation);
        this.registerAutomation(automationData, eventBus);
      }

      // Set up scheduled automations
      this.startScheduledAutomations();

      this.isInitialized = true;
      logger.info('Automation engine initialized successfully', {
        service: 'automation',
        automations: automations.length
      });
    } catch (error) {
      logger.error('Failed to initialize automation engine', {
        service: 'automation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a new automation
   */
  async createAutomation(automation: Omit<BusinessAutomation, 'id' | 'metadata'>): Promise<BusinessAutomation> {
    logger.info('Creating automation', {
      service: 'automation',
      name: automation.name
    });

    try {
      const created = await this.prisma.businessAutomation.create({
        data: {
          name: automation.name,
          description: automation.description,
          enabled: automation.enabled,
          triggers: automation.triggers as any,
          conditions: automation.conditions as any,
          actions: automation.actions as any,
          schedule: automation.schedule as any,
          metadata: {}
        }
      });

      const result = this.convertToAutomation(created);

      logger.info('Automation created', {
        service: 'automation',
        automationId: result.id,
        name: result.name
      });

      return result;
    } catch (error) {
      logger.error('Failed to create automation', {
        service: 'automation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get automation by ID
   */
  async getAutomation(automationId: string): Promise<BusinessAutomation | null> {
    const automation = await this.prisma.businessAutomation.findUnique({
      where: { id: automationId }
    });

    if (!automation) return null;

    return this.convertToAutomation(automation);
  }

  /**
   * List all automations
   */
  async listAutomations(filters?: { enabled?: boolean }): Promise<BusinessAutomation[]> {
    const automations = await this.prisma.businessAutomation.findMany({
      where: {
        enabled: filters?.enabled
      },
      orderBy: { createdAt: 'desc' }
    });

    return automations.map(a => this.convertToAutomation(a));
  }

  /**
   * Update automation
   */
  async updateAutomation(
    automationId: string,
    updates: Partial<Omit<BusinessAutomation, 'id' | 'metadata'>>
  ): Promise<BusinessAutomation> {
    logger.info('Updating automation', {
      service: 'automation',
      automationId
    });

    const automation = await this.prisma.businessAutomation.update({
      where: { id: automationId },
      data: {
        name: updates.name,
        description: updates.description,
        enabled: updates.enabled,
        triggers: updates.triggers as any,
        conditions: updates.conditions as any,
        actions: updates.actions as any,
        schedule: updates.schedule as any
      }
    });

    return this.convertToAutomation(automation);
  }

  /**
   * Delete automation
   */
  async deleteAutomation(automationId: string): Promise<void> {
    logger.info('Deleting automation', {
      service: 'automation',
      automationId
    });

    await this.prisma.businessAutomation.delete({
      where: { id: automationId }
    });

    // Remove event listeners
    this.unregisterAutomation(automationId);
  }

  /**
   * Manually trigger an automation
   */
  async runAutomation(automationId: string, context: Record<string, any> = {}): Promise<{
    success: boolean;
    results: any[];
    error?: string;
  }> {
    const automation = await this.getAutomation(automationId);
    if (!automation) {
      throw new Error(`Automation ${automationId} not found`);
    }

    logger.info('Manually running automation', {
      service: 'automation',
      automationId,
      name: automation.name
    });

    return await this.executeAutomation(automation, 'manual', context);
  }

  /**
   * Register automation to listen for events
   */
  private registerAutomation(automation: BusinessAutomation, eventBus: EventEmitter): void {
    for (const trigger of automation.triggers) {
      if (trigger.type === 'event' && trigger.event) {
        const handler = (eventData: any) => {
          this.handleEvent(automation, trigger, eventData);
        };

        eventBus.on(trigger.event, handler);

        // Store listener for cleanup
        if (!this.eventListeners.has(automation.id)) {
          this.eventListeners.set(automation.id, []);
        }
        this.eventListeners.get(automation.id)!.push(handler);

        logger.debug('Registered automation for event', {
          service: 'automation',
          automationId: automation.id,
          event: trigger.event
        });
      }
    }
  }

  /**
   * Unregister automation event listeners
   */
  private unregisterAutomation(automationId: string): void {
    const listeners = this.eventListeners.get(automationId);
    if (listeners) {
      // In production, you'd also need to remove from eventBus
      this.eventListeners.delete(automationId);
    }
  }

  /**
   * Handle incoming event
   */
  private async handleEvent(
    automation: BusinessAutomation,
    trigger: AutomationTrigger,
    eventData: any
  ): Promise<void> {
    // Check if automation is enabled
    if (!automation.enabled) return;

    // Apply trigger filters
    if (trigger.filters && !this.matchesFilters(eventData, trigger.filters)) {
      return;
    }

    // Check conditions
    if (automation.conditions && !this.evaluateConditions(automation.conditions, eventData)) {
      logger.debug('Automation conditions not met', {
        service: 'automation',
        automationId: automation.id
      });
      return;
    }

    // Check concurrency limit
    if (this.runningAutomations.size >= this.config.maxConcurrent) {
      logger.warn('Automation concurrency limit reached', {
        service: 'automation',
        limit: this.config.maxConcurrent
      });
      return;
    }

    // Execute automation
    await this.executeAutomation(automation, trigger.event || 'event', eventData);
  }

  /**
   * Execute automation actions
   */
  private async executeAutomation(
    automation: BusinessAutomation,
    trigger: string,
    context: Record<string, any>
  ): Promise<{ success: boolean; results: any[]; error?: string }> {
    const startTime = Date.now();
    this.runningAutomations.add(automation.id);

    logger.info('Executing automation', {
      service: 'automation',
      automationId: automation.id,
      name: automation.name,
      trigger
    });

    this.emit(BusinessEvent.AUTOMATION_TRIGGERED, {
      automationId: automation.id,
      trigger
    });

    const results: any[] = [];
    let success = true;
    let error: string | undefined;

    try {
      // Execute each action sequentially
      for (const action of automation.actions) {
        const result = await this.executeAction(action, context);
        results.push(result);

        if (!result.success) {
          success = false;
          error = result.error;
          break;
        }
      }

      // Log execution
      await this.logExecution({
        automationId: automation.id,
        trigger,
        success,
        duration: Date.now() - startTime,
        error,
        result: results
      });

      if (success) {
        this.emit(BusinessEvent.AUTOMATION_COMPLETED, {
          automationId: automation.id,
          results
        });

        // Update metadata
        await this.updateAutomationMetadata(automation.id, true);
      } else {
        this.emit(BusinessEvent.AUTOMATION_FAILED, {
          automationId: automation.id,
          error
        });

        await this.updateAutomationMetadata(automation.id, false);
      }

      logger.info('Automation execution completed', {
        service: 'automation',
        automationId: automation.id,
        success,
        duration: Date.now() - startTime
      });
    } catch (error) {
      success = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Automation execution failed', {
        service: 'automation',
        automationId: automation.id,
        error: errorMessage
      });

      await this.logExecution({
        automationId: automation.id,
        trigger,
        success: false,
        duration: Date.now() - startTime,
        error: errorMessage
      });

      this.emit(BusinessEvent.AUTOMATION_FAILED, {
        automationId: automation.id,
        error: errorMessage
      });
    } finally {
      this.runningAutomations.delete(automation.id);
    }

    return { success, results, error };
  }

  /**
   * Execute a single automation action
   */
  private async executeAction(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    logger.debug('Executing automation action', {
      service: 'automation',
      actionType: action.type
    });

    try {
      switch (action.type) {
        case 'notify':
          return await this.actionNotify(action.config, context);

        case 'create_task':
          return await this.actionCreateTask(action.config, context);

        case 'send_email':
          return await this.actionSendEmail(action.config, context);

        case 'update_crm':
          return await this.actionUpdateCRM(action.config, context);

        case 'webhook':
          return await this.actionWebhook(action.config, context);

        case 'ai_analyze':
          return await this.actionAIAnalyze(action.config, context);

        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Action: Send notification
   */
  private async actionNotify(config: AutomationAction['config'], context: any): Promise<any> {
    logger.info('Sending notification', {
      service: 'automation',
      channel: config.channel
    });

    // In production, integrate with actual notification system
    return { success: true, data: { notified: config.channel } };
  }

  /**
   * Action: Create autonomous task
   */
  private async actionCreateTask(config: AutomationAction['config'], context: any): Promise<any> {
    logger.info('Creating autonomous task', {
      service: 'automation',
      domain: config.domain
    });

    // In production, integrate with orchestrator
    return { success: true, data: { taskCreated: true } };
  }

  /**
   * Action: Send email
   */
  private async actionSendEmail(config: AutomationAction['config'], context: any): Promise<any> {
    logger.info('Sending email', {
      service: 'automation',
      to: config.to
    });

    // In production, integrate with email service (SendGrid)
    return { success: true, data: { emailSent: true } };
  }

  /**
   * Action: Update CRM
   */
  private async actionUpdateCRM(config: AutomationAction['config'], context: any): Promise<any> {
    logger.info('Updating CRM', {
      service: 'automation',
      contactId: config.contactId
    });

    // In production, integrate with CRM service
    return { success: true, data: { crmUpdated: true } };
  }

  /**
   * Action: Call webhook
   */
  private async actionWebhook(config: AutomationAction['config'], context: any): Promise<any> {
    logger.info('Calling webhook', {
      service: 'automation',
      url: config.url,
      method: config.method
    });

    if (!config.url) {
      return { success: false, error: 'Webhook URL not provided' };
    }

    try {
      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(config.body || context)
      });

      const data = await response.json();

      return {
        success: response.ok,
        data,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook call failed'
      };
    }
  }

  /**
   * Action: AI analysis
   */
  private async actionAIAnalyze(config: AutomationAction['config'], context: any): Promise<any> {
    logger.info('Running AI analysis', {
      service: 'automation',
      model: config.model
    });

    // In production, integrate with AI provider
    return { success: true, data: { analysis: 'AI analysis result' } };
  }

  /**
   * Evaluate automation conditions
   */
  private evaluateConditions(conditions: AutomationCondition[], data: any): boolean {
    for (const condition of conditions) {
      const value = this.getNestedValue(data, condition.field);
      const matches = this.evaluateCondition(value, condition.operator, condition.value);

      if (!matches && condition.logic !== 'OR') {
        return false; // AND logic - all must match
      }

      if (matches && condition.logic === 'OR') {
        return true; // OR logic - one match is enough
      }
    }

    return true; // All AND conditions matched
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expected;

      case 'contains':
        return String(value).includes(String(expected));

      case 'greater_than':
        return Number(value) > Number(expected);

      case 'less_than':
        return Number(value) < Number(expected);

      case 'exists':
        return value !== undefined && value !== null;

      default:
        return false;
    }
  }

  /**
   * Check if event matches trigger filters
   */
  private matchesFilters(data: any, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      const dataValue = this.getNestedValue(data, key);
      if (dataValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return undefined;
    }

    return value;
  }

  /**
   * Log automation execution
   */
  private async logExecution(log: {
    automationId: string;
    trigger: string;
    success: boolean;
    duration: number;
    error?: string;
    result?: any;
  }): Promise<void> {
    try {
      await this.prisma.automationExecutionLog.create({
        data: {
          automationId: log.automationId,
          trigger: log.trigger,
          success: log.success,
          duration: log.duration,
          error: log.error,
          result: log.result as any
        }
      });
    } catch (error) {
      logger.error('Failed to log automation execution', {
        service: 'automation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get execution logs for an automation
   */
  async getExecutionLogs(automationId: string, limit: number = 50): Promise<any[]> {
    const logs = await this.prisma.automationExecutionLog.findMany({
      where: { automationId },
      orderBy: { executedAt: 'desc' },
      take: limit
    });

    return logs;
  }

  /**
   * Update automation metadata (run count, success count, etc.)
   */
  private async updateAutomationMetadata(automationId: string, success: boolean): Promise<void> {
    const automation = await this.getAutomation(automationId);
    if (!automation) return;

    const metadata = automation.metadata || {};

    await this.prisma.businessAutomation.update({
      where: { id: automationId },
      data: {
        metadata: {
          lastRun: new Date(),
          runCount: (metadata.runCount || 0) + 1,
          successCount: success ? (metadata.successCount || 0) + 1 : metadata.successCount,
          failureCount: !success ? (metadata.failureCount || 0) + 1 : metadata.failureCount
        } as any
      }
    });
  }

  /**
   * Start scheduled automations
   */
  private startScheduledAutomations(): void {
    // In production, use a job scheduler like Bull or node-cron
    logger.info('Scheduled automations would start here', {
      service: 'automation'
    });
  }

  /**
   * Convert database record to BusinessAutomation
   */
  private convertToAutomation(record: any): BusinessAutomation {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      enabled: record.enabled,
      triggers: record.triggers as AutomationTrigger[],
      conditions: record.conditions as AutomationCondition[] | undefined,
      actions: record.actions as AutomationAction[],
      schedule: record.schedule as BusinessAutomation['schedule'],
      metadata: record.metadata as BusinessAutomation['metadata']
    };
  }

  /**
   * Cleanup and disconnect
   */
  async shutdown(): Promise<void> {
    logger.info('Automation engine shutting down');

    // Clear all event listeners
    this.eventListeners.clear();
    this.runningAutomations.clear();

    await this.prisma.$disconnect();
    this.isInitialized = false;
  }
}

// Singleton instance
let automationEngineInstance: AutomationEngine | null = null;

export function createAutomationEngine(config: AutomationEngineConfig): AutomationEngine {
  if (!automationEngineInstance) {
    automationEngineInstance = new AutomationEngine(config);
  }
  return automationEngineInstance;
}

export function getAutomationEngine(): AutomationEngine {
  if (!automationEngineInstance) {
    throw new Error('Automation engine not initialized. Call createAutomationEngine first.');
  }
  return automationEngineInstance;
}
