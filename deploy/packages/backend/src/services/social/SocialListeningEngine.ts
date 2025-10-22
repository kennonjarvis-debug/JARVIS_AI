/**
 * Social Listening Engine
 *
 * Monitors keywords across multiple social platforms (Twitter, Meta, LinkedIn)
 * and triggers appropriate agent workflows based on context and relevance.
 *
 * Features:
 * - Multi-platform keyword monitoring
 * - Intelligent agent routing (Sales, Marketing, Support, Operations)
 * - Auto-reply with human-in-the-loop approval
 * - Real-time WebSocket updates
 * - Activity logging and analytics
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import { TwitterPlatform } from './TwitterPlatform';
import { MetaPlatform } from './MetaPlatform';
import { LinkedInPlatform } from './LinkedInPlatform';
import { BaseSocialPlatform } from './BaseSocialPlatform';
import type {
  SocialPost,
  KeywordMatch,
  SocialListenerConfig,
  AgentWorkflowTrigger,
} from './types';

export interface ListenerStats {
  totalPosts: number;
  matchedPosts: number;
  agentsTriggered: number;
  autoReplies: number;
  humanInterventions: number;
}

export class SocialListeningEngine extends EventEmitter {
  private supabase: SupabaseClient;
  private platforms: Map<string, BaseSocialPlatform>;
  private isListening: boolean = false;
  private config: SocialListenerConfig;
  private observatoryId: string;
  private stats: ListenerStats;

  constructor(observatoryId: string, config: SocialListenerConfig) {
    super();
    this.observatoryId = observatoryId;
    this.config = config;
    this.platforms = new Map();

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);

    this.stats = {
      totalPosts: 0,
      matchedPosts: 0,
      agentsTriggered: 0,
      autoReplies: 0,
      humanInterventions: 0,
    };
  }

  // ========================================================================
  // INITIALIZATION & LIFECYCLE
  // ========================================================================

  /**
   * Initialize platform clients from connected integrations
   */
  async initialize(): Promise<void> {
    console.log('🎧 Initializing Social Listening Engine...');

    // Load connected integrations for this observatory
    const { data: integrations, error } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('observatory_id', this.observatoryId)
      .eq('status', 'connected')
      .in('platform', this.config.platforms);

    if (error) {
      throw new Error(`Failed to load integrations: ${error.message}`);
    }

    if (!integrations || integrations.length === 0) {
      throw new Error('No connected integrations found for listening');
    }

    // Initialize platform clients
    for (const integration of integrations) {
      const platformConfig = {
        integrationId: integration.id,
        observatoryId: integration.observatory_id,
        credentials: {
          accessToken: integration.credentials.access_token,
          refreshToken: integration.credentials.refresh_token,
          expiresAt: integration.credentials.expires_at
            ? new Date(integration.credentials.expires_at)
            : undefined,
        },
      };

      let platform: BaseSocialPlatform;

      switch (integration.platform.toLowerCase()) {
        case 'twitter':
          platform = new TwitterPlatform(platformConfig);
          break;
        case 'meta':
          platform = new MetaPlatform(platformConfig);
          break;
        case 'linkedin':
          platform = new LinkedInPlatform(platformConfig);
          break;
        default:
          console.warn(`Unknown platform: ${integration.platform}`);
          continue;
      }

      this.platforms.set(integration.platform.toLowerCase(), platform);
      console.log(`✅ Initialized ${integration.platform} platform`);
    }

    console.log(`🎧 Listening on ${this.platforms.size} platform(s)`);
  }

  /**
   * Start listening for keywords across all platforms
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️  Already listening');
      return;
    }

    this.isListening = true;
    console.log(`🎧 Starting to listen for keywords: ${this.config.keywords.join(', ')}`);

    // Start listening on each platform in parallel
    const listeningPromises = Array.from(this.platforms.entries()).map(([platformName, platform]) =>
      this.listenOnPlatform(platformName, platform)
    );

    await Promise.allSettled(listeningPromises);
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    this.isListening = false;
    console.log('🛑 Stopped listening');
    this.emit('stopped');
  }

  // ========================================================================
  // PLATFORM LISTENING
  // ========================================================================

  /**
   * Listen for keywords on a specific platform
   */
  private async listenOnPlatform(
    platformName: string,
    platform: BaseSocialPlatform
  ): Promise<void> {
    console.log(`🎧 Listening on ${platformName}...`);

    try {
      // Start streaming keywords
      for await (const post of platform.streamKeywords(this.config.keywords)) {
        if (!this.isListening) {
          console.log(`🛑 Stopped listening on ${platformName}`);
          break;
        }

        this.stats.totalPosts++;

        // Process the post
        await this.processPost(post, platform);
      }
    } catch (error) {
      console.error(`❌ Error listening on ${platformName}:`, error);
      this.emit('error', { platform: platformName, error });

      // Retry after delay
      if (this.isListening) {
        console.log(`🔄 Retrying ${platformName} in 30 seconds...`);
        setTimeout(() => {
          if (this.isListening) {
            this.listenOnPlatform(platformName, platform);
          }
        }, 30000);
      }
    }
  }

  /**
   * Process a post that matches keywords
   */
  private async processPost(post: SocialPost, platform: BaseSocialPlatform): Promise<void> {
    console.log(`📨 Processing post from @${post.author.username}: "${post.content.text.substring(0, 50)}..."`);

    // Apply filters
    if (!this.passesFilters(post)) {
      console.log('⏭️  Post filtered out');
      return;
    }

    // Analyze post for keyword matches and relevance
    const match = await platform['analyzePost'](post, this.config.keywords);

    if (match.relevanceScore < 30) {
      console.log('⏭️  Relevance score too low, skipping');
      return;
    }

    this.stats.matchedPosts++;

    // Log to database
    await this.logMatch(match);

    // Emit event for real-time updates
    this.emit('match', match);

    // Decide action based on config and relevance
    if (match.suggestedAction === 'engage') {
      await this.handleEngagement(match, platform);
    } else if (match.suggestedAction === 'monitor') {
      console.log('👁️  Monitoring (no action taken)');
    }
  }

  /**
   * Check if post passes configured filters
   */
  private passesFilters(post: SocialPost): boolean {
    const filters = this.config.filters;
    if (!filters) return true;

    // Min followers filter
    if (filters.minFollowers && post.author.id) {
      // Would need to fetch author profile to check followers
      // For now, skip this check
    }

    // Language filter
    if (filters.languages && filters.languages.length > 0) {
      if (post.language && !filters.languages.includes(post.language)) {
        return false;
      }
    }

    // Exclude replies
    if (filters.excludeReplies && post.inReplyToId) {
      return false;
    }

    // Exclude retweets/shares (Twitter-specific)
    if (filters.excludeRetweets && post.content.text.startsWith('RT @')) {
      return false;
    }

    return true;
  }

  // ========================================================================
  // ENGAGEMENT HANDLING
  // ========================================================================

  /**
   * Handle engagement with a matched post
   */
  private async handleEngagement(
    match: KeywordMatch,
    platform: BaseSocialPlatform
  ): Promise<void> {
    console.log(`💬 Handling engagement for post ${match.post.id}`);

    // Determine if we should auto-reply or request human approval
    const shouldAutoReply =
      this.config.actions?.autoReply &&
      match.relevanceScore > 70 &&
      match.sentiment !== 'negative';

    if (shouldAutoReply) {
      // Trigger agent workflow for auto-reply
      await this.triggerAgent(match, platform);
    } else {
      // Request human approval
      this.stats.humanInterventions++;
      await this.requestHumanApproval(match);
    }
  }

  /**
   * Trigger appropriate agent workflow
   */
  private async triggerAgent(match: KeywordMatch, platform: BaseSocialPlatform): Promise<void> {
    if (!this.config.actions?.triggerAgent) {
      return;
    }

    const agentType = match.suggestedAgent || 'support';
    console.log(`🤖 Triggering ${agentType} agent...`);

    this.stats.agentsTriggered++;

    // Create agent workflow trigger with multi-tenant context
    const trigger: AgentWorkflowTrigger = {
      observatoryId: this.observatoryId, // Multi-tenant support
      agentType,
      post: match.post,
      context: {
        matchedKeywords: match.matchedKeywords,
        relevanceScore: match.relevanceScore,
        sentiment: match.sentiment,
      },
      action: this.determineAgentAction(match),
      priority: this.determinePriority(match),
    };

    // Store trigger in database for agent to pick up
    await this.supabase.from('agent_workflow_triggers').insert({
      observatory_id: this.observatoryId,
      agent_type: trigger.agentType,
      post_id: trigger.post.id,
      platform: trigger.post.platform,
      post_data: trigger.post,
      context: trigger.context,
      action: trigger.action,
      priority: trigger.priority,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // Emit event for real-time processing
    this.emit('agent_triggered', trigger);

    // For now, simulate agent response (would integrate with actual agents)
    await this.simulateAgentResponse(trigger, platform);
  }

  /**
   * Simulate agent response (placeholder for actual agent integration)
   */
  private async simulateAgentResponse(
    trigger: AgentWorkflowTrigger,
    platform: BaseSocialPlatform
  ): Promise<void> {
    console.log(`🤖 ${trigger.agentType} agent processing...`);

    // Wait a bit to simulate thinking
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate response based on agent type and context
    let response = this.generateAgentResponse(trigger);

    console.log(`💬 Agent response: "${response}"`);

    // Reply to post
    if (trigger.action === 'reply') {
      try {
        const result = await platform.replyToPost(trigger.post.id, response);
        this.stats.autoReplies++;
        console.log(`✅ Replied: ${result.url}`);

        // Update trigger status
        await this.supabase
          .from('agent_workflow_triggers')
          .update({
            status: 'completed',
            response_id: result.id,
            response_url: result.url,
            completed_at: new Date().toISOString(),
          })
          .eq('post_id', trigger.post.id)
          .eq('agent_type', trigger.agentType);
      } catch (error) {
        console.error('❌ Reply failed:', error);
        await this.supabase
          .from('agent_workflow_triggers')
          .update({
            status: 'failed',
            error_message: (error as Error).message,
          })
          .eq('post_id', trigger.post.id)
          .eq('agent_type', trigger.agentType);
      }
    } else if (trigger.action === 'like') {
      await platform.likePost(trigger.post.id);
      console.log('❤️  Liked post');
    } else if (trigger.action === 'dm') {
      // Would send DM
      console.log('📧 Would send DM (not implemented)');
    }
  }

  /**
   * Generate agent response based on context
   */
  private generateAgentResponse(trigger: AgentWorkflowTrigger): string {
    const { agentType, post, context } = trigger;

    // This is a simple template-based response
    // In production, this would use the actual LangGraph agents with Claude

    if (agentType === 'sales') {
      return `Hi @${post.author.username}! 👋 I'd love to help you with ${context.matchedKeywords[0]}. DAWG AI offers powerful browser-based DAW features. Can I share more details?`;
    } else if (agentType === 'support') {
      return `Hi @${post.author.username}! I saw you mentioned ${context.matchedKeywords[0]}. I'm here to help! What specific issue are you experiencing?`;
    } else if (agentType === 'marketing') {
      return `@${post.author.username} Great to see interest in ${context.matchedKeywords[0]}! DAWG AI makes music production accessible right in your browser. Check us out: https://dawg-ai.com`;
    } else {
      return `@${post.author.username} Thanks for mentioning ${context.matchedKeywords[0]}! We're here to help. 🎵`;
    }
  }

  /**
   * Request human approval for engagement
   */
  private async requestHumanApproval(match: KeywordMatch): Promise<void> {
    console.log('👤 Requesting human approval...');

    await this.supabase.from('approval_requests').insert({
      observatory_id: this.observatoryId,
      type: 'social_engagement',
      post_id: match.post.id,
      platform: match.post.platform,
      post_data: match.post,
      matched_keywords: match.matchedKeywords,
      relevance_score: match.relevanceScore,
      sentiment: match.sentiment,
      suggested_action: match.suggestedAction,
      suggested_agent: match.suggestedAgent,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    this.emit('approval_requested', match);
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Determine what action the agent should take
   */
  private determineAgentAction(match: KeywordMatch): 'reply' | 'like' | 'dm' | 'follow' | 'monitor' {
    if (match.relevanceScore > 80 && match.sentiment === 'positive') {
      return 'reply';
    } else if (match.relevanceScore > 60) {
      return 'like';
    } else {
      return 'monitor';
    }
  }

  /**
   * Determine priority level
   */
  private determinePriority(match: KeywordMatch): 'critical' | 'high' | 'medium' | 'low' {
    if (match.relevanceScore > 90) return 'critical';
    if (match.relevanceScore > 70) return 'high';
    if (match.relevanceScore > 50) return 'medium';
    return 'low';
  }

  /**
   * Log keyword match to database
   */
  private async logMatch(match: KeywordMatch): Promise<void> {
    await this.supabase.from('social_listening_matches').insert({
      observatory_id: this.observatoryId,
      platform: match.post.platform,
      post_id: match.post.id,
      author_username: match.post.author.username,
      content: match.post.content.text,
      matched_keywords: match.matchedKeywords,
      relevance_score: match.relevanceScore,
      sentiment: match.sentiment,
      suggested_action: match.suggestedAction,
      suggested_agent: match.suggestedAgent,
      post_metrics: match.post.metrics,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Get listening statistics
   */
  getStats(): ListenerStats {
    return { ...this.stats };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SocialListenerConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔄 Configuration updated');
  }
}
