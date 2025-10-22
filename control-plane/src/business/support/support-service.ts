/**
 * Support Service
 *
 * Manages customer support tickets with AI-powered features:
 * - Sentiment analysis
 * - Automated response suggestions
 * - Smart ticket routing
 * - Performance analytics
 *
 * Integrations:
 * - Zendesk
 * - Intercom
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import {
  SupportTicket,
  SupportInsight,
  BusinessEvent,
  IExternalIntegration
} from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export interface SupportConfig {
  platform: 'zendesk' | 'intercom';
  zendesk?: {
    subdomain: string;
    email: string;
    apiToken: string;
  };
  intercom?: {
    accessToken: string;
  };
  sentimentAnalysis: {
    enabled: boolean;
    threshold: number; // Escalate if sentiment below this (-1 to 1)
    autoEscalate: boolean;
  };
  autoSuggest: {
    enabled: boolean;
    confidence: number; // Only suggest if confidence above this (0 to 1)
  };
}

export class SupportService extends EventEmitter {
  private prisma: PrismaClient;
  private config: SupportConfig;
  private integration: IExternalIntegration | null = null;
  private isInitialized: boolean = false;

  constructor(config: SupportConfig) {
    super();
    this.prisma = new PrismaClient();
    this.config = config;
  }

  /**
   * Initialize service and connect to support platform
   */
  async initialize(): Promise<void> {
    logger.info('Support service initializing', {
      service: 'support',
      platform: this.config.platform
    });

    try {
      // Connect to selected support platform
      if (this.config.platform === 'zendesk' && this.config.zendesk) {
        const { ZendeskClient } = await import('../integrations/zendesk-client.js');
        this.integration = new ZendeskClient(
          this.config.zendesk.subdomain,
          this.config.zendesk.email,
          this.config.zendesk.apiToken
        );
      } else if (this.config.platform === 'intercom' && this.config.intercom) {
        const { IntercomClient } = await import('../integrations/intercom-client.js');
        this.integration = new IntercomClient(this.config.intercom.accessToken);
      } else {
        throw new Error(`Unsupported support platform: ${this.config.platform}`);
      }

      await this.integration.connect();

      this.isInitialized = true;
      logger.info('Support service initialized successfully', {
        service: 'support',
        platform: this.config.platform
      });
    } catch (error) {
      logger.error('Failed to initialize support service', {
        service: 'support',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a new support ticket
   */
  async createTicket(ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupportTicket> {
    if (!this.isInitialized) {
      throw new Error('Support service not initialized');
    }

    logger.info('Creating support ticket', {
      service: 'support',
      subject: ticketData.subject,
      priority: ticketData.priority
    });

    try {
      // Create in database
      const ticket = await this.prisma.supportTicket.create({
        data: {
          externalId: `local-${Date.now()}`,
          subject: ticketData.subject,
          description: ticketData.description,
          status: ticketData.status,
          priority: ticketData.priority,
          customerId: ticketData.customer.id,
          assignedTo: ticketData.assignedTo,
          tags: ticketData.tags,
          sentiment: ticketData.sentiment || {},
          aiSuggestions: ticketData.aiSuggestions || {}
        }
      });

      const result: SupportTicket = {
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status as SupportTicket['status'],
        priority: ticket.priority as SupportTicket['priority'],
        customer: ticketData.customer,
        assignedTo: ticket.assignedTo || undefined,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        tags: ticket.tags as string[],
        sentiment: ticket.sentiment as SupportTicket['sentiment'],
        aiSuggestions: ticket.aiSuggestions as SupportTicket['aiSuggestions']
      };

      // Emit event
      this.emit(BusinessEvent.TICKET_CREATED, result);

      // Auto-analyze sentiment if enabled
      if (this.config.sentimentAnalysis.enabled) {
        // Don't await - analyze in background
        this.analyzeSentiment(result.id).catch(error => {
          logger.error('Background sentiment analysis failed', {
            service: 'support',
            ticketId: result.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }

      // Auto-suggest response if enabled
      if (this.config.autoSuggest.enabled) {
        // Don't await - suggest in background
        this.suggestResponse(result.id).catch(error => {
          logger.error('Background response suggestion failed', {
            service: 'support',
            ticketId: result.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }

      logger.info('Support ticket created', {
        service: 'support',
        ticketId: result.id
      });

      return result;
    } catch (error) {
      logger.error('Failed to create support ticket', {
        service: 'support',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) return null;

    // For simplicity, customer info is mocked here
    // In production, you'd join with customer table
    return {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status as SupportTicket['status'],
      priority: ticket.priority as SupportTicket['priority'],
      customer: {
        id: ticket.customerId,
        name: 'Customer Name',
        email: 'customer@example.com'
      },
      assignedTo: ticket.assignedTo || undefined,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      tags: ticket.tags as string[],
      sentiment: ticket.sentiment as SupportTicket['sentiment'],
      aiSuggestions: ticket.aiSuggestions as SupportTicket['aiSuggestions']
    };
  }

  /**
   * List tickets with optional filters
   */
  async listTickets(filters?: {
    status?: SupportTicket['status'];
    priority?: SupportTicket['priority'];
    customerId?: string;
  }): Promise<SupportTicket[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        status: filters?.status,
        priority: filters?.priority,
        customerId: filters?.customerId
      },
      orderBy: { createdAt: 'desc' }
    });

    return tickets.map(ticket => ({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status as SupportTicket['status'],
      priority: ticket.priority as SupportTicket['priority'],
      customer: {
        id: ticket.customerId,
        name: 'Customer Name',
        email: 'customer@example.com'
      },
      assignedTo: ticket.assignedTo || undefined,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      tags: ticket.tags as string[],
      sentiment: ticket.sentiment as SupportTicket['sentiment'],
      aiSuggestions: ticket.aiSuggestions as SupportTicket['aiSuggestions']
    }));
  }

  /**
   * Update ticket
   */
  async updateTicket(
    ticketId: string,
    updates: Partial<Omit<SupportTicket, 'id' | 'customer' | 'createdAt' | 'updatedAt'>>
  ): Promise<SupportTicket> {
    logger.info('Updating support ticket', {
      service: 'support',
      ticketId,
      updates: Object.keys(updates)
    });

    const previousTicket = await this.getTicket(ticketId);

    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        subject: updates.subject,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        assignedTo: updates.assignedTo,
        tags: updates.tags,
        sentiment: updates.sentiment ? updates.sentiment : undefined,
        aiSuggestions: updates.aiSuggestions ? updates.aiSuggestions : undefined
      }
    });

    const result: SupportTicket = {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status as SupportTicket['status'],
      priority: ticket.priority as SupportTicket['priority'],
      customer: {
        id: ticket.customerId,
        name: 'Customer Name',
        email: 'customer@example.com'
      },
      assignedTo: ticket.assignedTo || undefined,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      tags: ticket.tags as string[],
      sentiment: ticket.sentiment as SupportTicket['sentiment'],
      aiSuggestions: ticket.aiSuggestions as SupportTicket['aiSuggestions']
    };

    // Emit appropriate events
    if (previousTicket && previousTicket.status !== result.status) {
      if (result.status === 'resolved') {
        this.emit(BusinessEvent.TICKET_RESOLVED, result);
      }
    }

    this.emit(BusinessEvent.TICKET_UPDATED, result);

    return result;
  }

  /**
   * AI-powered sentiment analysis for ticket
   */
  async analyzeSentiment(ticketId: string): Promise<SupportTicket> {
    if (!this.config.sentimentAnalysis.enabled) {
      throw new Error('Sentiment analysis is not enabled');
    }

    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    logger.info('Analyzing ticket sentiment', {
      service: 'support',
      ticketId
    });

    try {
      // TODO: Integrate with actual AI sentiment analysis
      // For now, use a simple keyword-based approach
      const sentiment = this.calculateSentiment(ticket.subject, ticket.description);

      const updatedTicket = await this.updateTicket(ticketId, { sentiment });

      // Check if we should escalate
      if (
        this.config.sentimentAnalysis.autoEscalate &&
        sentiment.score < this.config.sentimentAnalysis.threshold
      ) {
        await this.escalateTicket(ticketId);
      }

      logger.info('Ticket sentiment analyzed', {
        service: 'support',
        ticketId,
        sentimentLabel: sentiment.label,
        sentimentScore: sentiment.score
      });

      return updatedTicket;
    } catch (error) {
      logger.error('Failed to analyze ticket sentiment', {
        service: 'support',
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * AI-powered response suggestion for ticket
   */
  async suggestResponse(ticketId: string): Promise<SupportTicket> {
    if (!this.config.autoSuggest.enabled) {
      throw new Error('Auto-suggest is not enabled');
    }

    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    logger.info('Generating AI response suggestion', {
      service: 'support',
      ticketId
    });

    try {
      // TODO: Integrate with actual AI for response generation
      // For now, use template-based suggestions
      const aiSuggestions = this.generateSuggestions(ticket);

      const updatedTicket = await this.updateTicket(ticketId, { aiSuggestions });

      logger.info('AI response suggestion generated', {
        service: 'support',
        ticketId,
        hasSuggestion: !!aiSuggestions.suggestedReply
      });

      return updatedTicket;
    } catch (error) {
      logger.error('Failed to generate response suggestion', {
        service: 'support',
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Escalate ticket
   */
  async escalateTicket(ticketId: string): Promise<SupportTicket> {
    logger.info('Escalating ticket', {
      service: 'support',
      ticketId
    });

    const updatedTicket = await this.updateTicket(ticketId, {
      priority: 'urgent',
      tags: [...(await this.getTicket(ticketId))!.tags, 'escalated']
    });

    this.emit(BusinessEvent.TICKET_ESCALATED, updatedTicket);

    return updatedTicket;
  }

  /**
   * Get support insights and analytics
   */
  async getInsights(timeframe?: { start: Date; end: Date }): Promise<SupportInsight> {
    const where = timeframe ? {
      createdAt: {
        gte: timeframe.start,
        lte: timeframe.end
      }
    } : {};

    const tickets = await this.prisma.supportTicket.findMany({ where });

    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'pending').length;

    // Calculate average response time (mock - in production, track actual response times)
    const avgResponseTime = 45; // minutes

    // Calculate average resolution time (mock)
    const avgResolutionTime = 24; // hours

    // Sentiment distribution
    const sentimentDistribution = {
      positive: 0,
      neutral: 0,
      negative: 0
    };

    tickets.forEach(ticket => {
      const sentiment = ticket.sentiment as SupportTicket['sentiment'];
      if (sentiment?.label) {
        sentimentDistribution[sentiment.label]++;
      }
    });

    // Top issues (mock - in production, use ML clustering)
    const topIssues = [
      { category: 'Login Issues', count: 15, trend: 'increasing' as const },
      { category: 'Billing Questions', count: 12, trend: 'stable' as const },
      { category: 'Feature Requests', count: 8, trend: 'decreasing' as const }
    ];

    // Escalation rate
    const escalatedTickets = tickets.filter(t =>
      (t.tags as string[]).includes('escalated')
    ).length;
    const escalationRate = totalTickets > 0 ? (escalatedTickets / totalTickets) * 100 : 0;

    return {
      totalTickets,
      openTickets,
      avgResponseTime,
      avgResolutionTime,
      sentimentDistribution,
      topIssues,
      escalationRate
    };
  }

  /**
   * Health check for support service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    platform: string;
    connected: boolean;
    message: string;
  }> {
    if (!this.integration) {
      return {
        healthy: false,
        platform: this.config.platform,
        connected: false,
        message: 'Integration not initialized'
      };
    }

    try {
      const result = await this.integration.test();
      return {
        healthy: result.healthy,
        platform: this.config.platform,
        connected: result.healthy,
        message: result.message
      };
    } catch (error) {
      return {
        healthy: false,
        platform: this.config.platform,
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper: Calculate sentiment (mock implementation)
   */
  private calculateSentiment(subject: string, description: string): {
    score: number;
    label: 'negative' | 'neutral' | 'positive';
    confidence: number;
  } {
    const text = `${subject} ${description}`.toLowerCase();

    // Negative keywords
    const negativeKeywords = ['angry', 'frustrated', 'terrible', 'awful', 'broken', 'hate', 'worst'];
    const negativeCount = negativeKeywords.filter(keyword => text.includes(keyword)).length;

    // Positive keywords
    const positiveKeywords = ['great', 'excellent', 'love', 'wonderful', 'amazing', 'fantastic'];
    const positiveCount = positiveKeywords.filter(keyword => text.includes(keyword)).length;

    const score = (positiveCount - negativeCount) / 10; // Normalize to -1 to 1
    const label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
    const confidence = Math.min(Math.abs(score) * 2, 1);

    return { score, label, confidence };
  }

  /**
   * Helper: Generate AI suggestions (mock implementation)
   */
  private generateSuggestions(ticket: SupportTicket): {
    suggestedReply?: string;
    similarTickets?: string[];
    escalate?: boolean;
    reason?: string;
  } {
    const suggestions: any = {};

    // Generate template-based reply
    if (ticket.subject.toLowerCase().includes('login')) {
      suggestions.suggestedReply =
        `Hi ${ticket.customer.name},\n\n` +
        `Thank you for contacting us about your login issue. ` +
        `I'd be happy to help you regain access to your account.\n\n` +
        `Please try the following steps:\n` +
        `1. Clear your browser cache and cookies\n` +
        `2. Reset your password using the "Forgot Password" link\n` +
        `3. Try using a different browser\n\n` +
        `If the issue persists, please let me know and I'll escalate to our technical team.\n\n` +
        `Best regards`;
    }

    // Check if should escalate
    if (ticket.sentiment && ticket.sentiment.score < -0.5) {
      suggestions.escalate = true;
      suggestions.reason = 'Negative sentiment detected';
    }

    return suggestions;
  }

  /**
   * Cleanup and disconnect
   */
  async shutdown(): Promise<void> {
    logger.info('Support service shutting down');

    if (this.integration) {
      await this.integration.disconnect();
    }

    await this.prisma.$disconnect();
    this.isInitialized = false;
  }
}

// Singleton instance
let supportServiceInstance: SupportService | null = null;

export function createSupportService(config: SupportConfig): SupportService {
  if (!supportServiceInstance) {
    supportServiceInstance = new SupportService(config);
  }
  return supportServiceInstance;
}

export function getSupportService(): SupportService {
  if (!supportServiceInstance) {
    throw new Error('Support service not initialized. Call createSupportService first.');
  }
  return supportServiceInstance;
}
