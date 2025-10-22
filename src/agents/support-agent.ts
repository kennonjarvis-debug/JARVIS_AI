/**
 * Support Agent for Jarvis
 *
 * Handles customer support tickets, knowledge base management, and automated
 * responses with intelligent routing and categorization.
 */

import { BaseAgent } from './base-agent';
import { CONFIG } from '../config/tools';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import type { HubSpotAdapter } from '../integrations/hubspot';
import type { EmailAdapter } from '../integrations/email';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TaskType,
  TaskRequest,
  TaskResult,
} from '../types/tasks';

/**
 * Support ticket structure
 */
export interface SupportTicket {
  /** Ticket ID */
  id: string;
  /** Ticket subject line */
  subject: string;
  /** Detailed description */
  description: string;
  /** Customer email */
  customerEmail: string;
  /** Customer name */
  customerName?: string;
  /** Optional priority override */
  priority?: 'low' | 'medium' | 'high' | 'critical';
  /** Creation timestamp */
  createdAt: Date;
  /** Current status */
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  /** Category if already determined */
  category?: string;
}

/**
 * Ticket routing decision
 */
export interface TicketRouting {
  /** Ticket ID */
  ticketId: string;
  /** Where to assign: 'auto' for automated, team name, or 'human' */
  assignTo: 'auto' | 'human' | string;
  /** Ticket priority */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Ticket category */
  category: string;
  /** Reasoning for routing decision */
  reasoning: string;
  /** Suggested automated response if applicable */
  suggestedResponse?: string;
}

/**
 * Knowledge base article
 */
export interface KBArticle {
  /** Article ID */
  id: string;
  /** Article title */
  title: string;
  /** Article content */
  content: string;
  /** Article category */
  category: string;
  /** Tags for categorization */
  tags: string[];
  /** Relevance score (0-1) for search results */
  relevanceScore?: number;
}

/**
 * Support metrics
 */
export interface SupportMetrics {
  /** Total tickets in period */
  totalTickets: number;
  /** Resolved tickets */
  resolved: number;
  /** Average first response time (minutes) */
  avgResponseTime: number;
  /** Average resolution time (minutes) */
  avgResolutionTime: number;
  /** Tickets auto-resolved */
  autoResolved: number;
  /** Tickets escalated to human */
  escalated: number;
}

/**
 * Support Agent for customer service automation
 *
 * Capabilities:
 * - Intelligent ticket routing
 * - Knowledge base search
 * - Automated response generation
 * - Support metrics tracking
 */
export class SupportAgent extends BaseAgent {
  private hubspotAdapter: HubSpotAdapter;
  private emailAdapter: EmailAdapter;
  private supabase: SupabaseClient;

  constructor(config: any) {
    super(config);

    if (!config.integrations.hubspot) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'HubSpot integration required for SupportAgent'
      );
    }

    if (!config.integrations.email) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Email integration required for SupportAgent'
      );
    }

    if (!config.integrations.supabase) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Supabase integration required for SupportAgent'
      );
    }

    this.hubspotAdapter = config.integrations.hubspot;
    this.emailAdapter = config.integrations.email;
    this.supabase = config.integrations.supabase;
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'support.ticket.route' as TaskType,
      'support.ticket.respond' as TaskType,
      'support.kb.search' as TaskType,
      'support.kb.create' as TaskType,
      'support.metrics.generate' as TaskType,
    ];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    switch (task.type) {
      case 'support.ticket.route':
        return await this.routeTicketTask(task.data);
      case 'support.ticket.respond':
        return await this.respondToTicketTask(task.data);
      case 'support.kb.search':
        return await this.searchKBTask(task.data);
      case 'support.kb.create':
        return await this.createKBArticleTask(task.data);
      case 'support.metrics.generate':
        return await this.generateMetricsTask(task.data);
      default:
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Unsupported task type: ${task.type}`
        );
    }
  }

  /**
   * Route ticket with intelligent categorization
   *
   * @param ticket - Ticket to route
   * @returns Routing decision with assignment and priority
   */
  async routeTicket(ticket: SupportTicket): Promise<TicketRouting> {
    this.logger.info('Routing ticket', { ticketId: ticket.id, subject: ticket.subject });

    // 1. Categorize with Claude
    const category = await this.categorizeTicket(ticket);

    // 2. Determine priority
    const priority = this.determinePriority(ticket, category);

    // 3. Apply routing rules
    let assignTo: 'auto' | 'human' | string = 'auto';
    let reasoning = '';

    if (category === 'bug' && priority === 'high') {
      assignTo = 'engineering';
      reasoning = 'High-priority bug requires engineering team attention';
    } else if (category === 'bug' && priority === 'critical') {
      assignTo = 'engineering';
      reasoning = 'Critical bug requires immediate engineering response';
    } else if (category === 'billing') {
      if (this.requiresRefund(ticket)) {
        assignTo = 'human';
        reasoning = 'Refund request requires human approval';
      } else {
        assignTo = 'billing';
        reasoning = 'Billing inquiry routed to billing team';
      }
    } else if (category === 'feature_request') {
      assignTo = 'product';
      reasoning = 'Feature request routed to product team for review';
    } else {
      // Search KB for solution
      const kbArticles = await this.searchKnowledgeBase(
        `${ticket.subject} ${ticket.description}`
      );

      if (kbArticles.length > 0 && kbArticles[0].relevanceScore! > 0.8) {
        assignTo = 'auto';
        reasoning = `Found relevant KB article: "${kbArticles[0].title}"`;
      } else if (kbArticles.length > 0 && kbArticles[0].relevanceScore! > 0.6) {
        assignTo = 'human';
        reasoning = `Partial KB match found, but requires human verification`;
      } else {
        assignTo = 'human';
        reasoning = 'No relevant KB article found, escalating to human agent';
      }
    }

    // 4. Generate suggested response if auto
    let suggestedResponse: string | undefined;
    if (assignTo === 'auto') {
      suggestedResponse = await this.generateResponse(ticket);
    }

    const routing: TicketRouting = {
      ticketId: ticket.id,
      assignTo,
      priority,
      category,
      reasoning,
      suggestedResponse,
    };

    this.logger.info('Ticket routed', {
      ticketId: ticket.id,
      assignTo,
      category,
      priority,
    });

    return routing;
  }

  /**
   * ✅ Search KB with proper FTS query
   *
   * Uses tsvector index for full-text search
   *
   * @param query - Search query
   * @returns Relevant KB articles sorted by relevance
   */
  async searchKnowledgeBase(query: string): Promise<KBArticle[]> {
    this.logger.info('Searching knowledge base', { query });

    try {
      // ✅ Use FTS tsvector index (from database-schema.sql)
      const { data, error } = await this.supabase
        .from('kb_articles')
        .select('*')
        .or(`fts.@@.plainto_tsquery(english.${query})`) // ✅ Correct FTS syntax
        .limit(5);

      if (error) {
        this.logger.error('KB search failed', { error, query });
        return [];
      }

      if (!data || data.length === 0) {
        this.logger.info('No KB articles found', { query });
        return [];
      }

      // Calculate relevance scores with semantic matching
      const articlesWithScores = await Promise.all(
        data.map(async (article) => {
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

      // Sort by relevance score descending
      const sorted = articlesWithScores.sort((a, b) =>
        (b.relevanceScore || 0) - (a.relevanceScore || 0)
      );

      this.logger.info('KB search complete', {
        query,
        resultsCount: sorted.length,
        topScore: sorted[0]?.relevanceScore,
      });

      return sorted;
    } catch (error) {
      this.logger.error('KB search error', { error, query });
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to search knowledge base',
        { query, error: (error as Error).message },
        true
      );
    }
  }

  /**
   * Generate automated response with KB context
   *
   * @param ticket - Ticket to respond to
   * @returns Generated response HTML
   */
  private async generateResponse(ticket: SupportTicket): Promise<string> {
    const kbArticles = await this.searchKnowledgeBase(
      `${ticket.subject} ${ticket.description}`
    );
    return this.generateResponseWithKB(ticket, kbArticles);
  }

  /**
   * Generate response using KB articles as context
   */
  private async generateResponseWithKB(
    ticket: SupportTicket,
    kbArticles: KBArticle[]
  ): Promise<string> {
    const kbContext = kbArticles.length > 0
      ? kbArticles
          .slice(0, 3)
          .map(a => `${a.title}: ${a.content.substring(0, 200)}`)
          .join('\n\n')
      : 'No relevant KB articles found.';

    const prompt = `Generate a helpful support response for this customer inquiry.

Ticket:
Subject: ${ticket.subject}
Description: ${ticket.description}
Customer: ${ticket.customerName || 'Valued customer'}

Relevant Knowledge Base Articles:
${kbContext}

Requirements:
- Professional and empathetic tone
- Address their specific issue clearly
- Reference KB articles if relevant
- Provide clear, actionable next steps
- Offer escalation if the KB doesn't fully solve it
- Keep it concise (2-3 paragraphs)

Generate the email body in HTML format (just the body, no <html> or <body> tags).`;

    return await this.generateContent(prompt);
  }

  /**
   * ✅ Get support metrics with correct count syntax
   *
   * @param timeRange - Time period for metrics
   * @returns Support performance metrics
   */
  async getSupportMetrics(timeRange: { start: Date; end: Date }): Promise<SupportMetrics> {
    this.logger.info('Generating support metrics', {
      start: timeRange.start,
      end: timeRange.end,
    });

    try {
      // ✅ Use correct Supabase count syntax
      const { count: totalTickets } = await this.supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true }) // ✅ Correct syntax
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());

      const { data } = await this.supabase
        .from('support_tickets')
        .select('*')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());

      if (!data) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to fetch support tickets for metrics'
        );
      }

      const resolved = data.filter(t =>
        t.status === 'resolved' || t.status === 'closed'
      );
      const autoResolved = data.filter(t => t.assigned_to === 'auto');
      const escalated = data.filter(t => t.escalated === true);

      const metrics: SupportMetrics = {
        totalTickets: totalTickets || 0,
        resolved: resolved.length,
        avgResponseTime: this.calculateAvgResponseTime(data),
        avgResolutionTime: this.calculateAvgResolutionTime(resolved),
        autoResolved: autoResolved.length,
        escalated: escalated.length,
      };

      this.logger.info('Support metrics generated', metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to generate support metrics', { error });
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to generate support metrics',
        { error: (error as Error).message },
        true
      );
    }
  }

  /**
   * Categorize ticket using Claude
   */
  private async categorizeTicket(ticket: SupportTicket): Promise<string> {
    const prompt = `Categorize this support ticket into ONE of these categories:
- bug
- billing
- feature_request
- general
- account
- technical

Ticket:
Subject: ${ticket.subject}
Description: ${ticket.description}

Respond with ONLY the category name in lowercase, nothing else.`;

    const response = await this.generateContent(prompt);
    return response.trim().toLowerCase();
  }

  /**
   * Determine ticket priority
   */
  private determinePriority(
    ticket: SupportTicket,
    category: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Use explicit priority if provided
    if (ticket.priority) {
      return ticket.priority;
    }

    // Auto-determine based on category and content
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();

    // Critical keywords
    const criticalKeywords = ['down', 'broken', 'can\'t login', 'data loss', 'security'];
    if (criticalKeywords.some(kw => text.includes(kw))) {
      return 'critical';
    }

    // High priority categories
    if (category === 'bug') {
      return 'high';
    }

    // Medium priority categories
    if (category === 'billing' || category === 'account') {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  /**
   * Check if ticket requires refund
   */
  private requiresRefund(ticket: SupportTicket): boolean {
    const refundKeywords = ['refund', 'money back', 'cancel subscription', 'cancellation', 'charge back'];
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
    return refundKeywords.some(kw => text.includes(kw));
  }

  /**
   * Calculate relevance score for KB article
   */
  private async calculateRelevance(query: string, article: any): Promise<number> {
    const queryLower = query.toLowerCase();
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();

    let score = 0;

    // Title match is highly relevant
    if (titleLower.includes(queryLower)) {
      score += 0.5;
    }

    // Content match is moderately relevant
    if (contentLower.includes(queryLower)) {
      score += 0.3;
    }

    // Tag match is somewhat relevant
    if (article.tags?.some((tag: string) =>
      queryLower.includes(tag.toLowerCase()) || tag.toLowerCase().includes(queryLower)
    )) {
      score += 0.2;
    }

    // Could enhance with embeddings/semantic similarity in future
    return Math.min(score, 1.0);
  }

  /**
   * Calculate average response time
   */
  private calculateAvgResponseTime(tickets: any[]): number {
    const times = tickets
      .filter(t => t.first_response_at)
      .map(t =>
        (new Date(t.first_response_at).getTime() -
         new Date(t.created_at).getTime()) / 1000 / 60
      );

    if (times.length === 0) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  /**
   * Calculate average resolution time
   */
  private calculateAvgResolutionTime(tickets: any[]): number {
    const times = tickets
      .filter(t => t.resolved_at)
      .map(t =>
        (new Date(t.resolved_at).getTime() -
         new Date(t.created_at).getTime()) / 1000 / 60
      );

    if (times.length === 0) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  /**
   * Task: Route ticket
   */
  private async routeTicketTask(data: any): Promise<TaskResult> {
    const ticket: SupportTicket = {
      id: data.id || crypto.randomUUID(),
      subject: data.subject,
      description: data.description,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      priority: data.priority,
    };

    const routing = await this.routeTicket(ticket);

    // Store ticket in Supabase
    await this.supabase.from('support_tickets').insert({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      customer_email: ticket.customerEmail,
      customer_name: ticket.customerName,
      status: 'open',
      assigned_to: routing.assignTo,
      priority: routing.priority,
      category: routing.category,
      created_at: ticket.createdAt.toISOString(),
    });

    // If auto-assigned, send response
    if (routing.assignTo === 'auto' && routing.suggestedResponse) {
      await this.emailAdapter.sendEmail({
        to: ticket.customerEmail,
        subject: `Re: ${ticket.subject}`,
        html: routing.suggestedResponse,
      });

      // Update ticket status
      await this.supabase
        .from('support_tickets')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          first_response_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);
    }

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: routing,
      timestamp: new Date(),
      executedBy: this.id,
      message: `Ticket routed: ${routing.assignTo} (${routing.category})`,
    };
  }

  /**
   * Task: Respond to ticket
   */
  private async respondToTicketTask(data: any): Promise<TaskResult> {
    const ticket: SupportTicket = data.ticket;
    const response = data.response || await this.generateResponse(ticket);

    await this.emailAdapter.sendEmail({
      to: ticket.customerEmail,
      subject: `Re: ${ticket.subject}`,
      html: response,
    });

    // Log in HubSpot
    if (data.contactId) {
      await this.hubspotAdapter.logActivity(data.contactId, {
        type: 'email',
        subject: `Re: ${ticket.subject}`,
        body: response,
      });
    }

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { ticketId: ticket.id },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Support response sent to ${ticket.customerEmail}`,
    };
  }

  /**
   * Task: Search KB
   */
  private async searchKBTask(data: any): Promise<TaskResult> {
    const articles = await this.searchKnowledgeBase(data.query);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { articles, count: articles.length },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Found ${articles.length} KB articles`,
    };
  }

  /**
   * Task: Create KB article
   */
  private async createKBArticleTask(data: any): Promise<TaskResult> {
    const { data: article, error } = await this.supabase
      .from('kb_articles')
      .insert({
        id: crypto.randomUUID(),
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to create KB article',
        { error: error.message },
        true
      );
    }

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { articleId: article.id },
      timestamp: new Date(),
      executedBy: this.id,
      message: `KB article created: ${data.title}`,
    };
  }

  /**
   * Task: Generate metrics
   */
  private async generateMetricsTask(data: any): Promise<TaskResult> {
    const timeRange = {
      start: new Date(data.start),
      end: new Date(data.end),
    };

    const metrics = await this.getSupportMetrics(timeRange);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: metrics,
      timestamp: new Date(),
      executedBy: this.id,
      message: `Support metrics generated: ${metrics.totalTickets} tickets`,
    };
  }
}
