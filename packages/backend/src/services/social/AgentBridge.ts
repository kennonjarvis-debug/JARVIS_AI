/**
 * Agent Integration Bridge
 *
 * Connects Social Listening Engine to LangGraph Agents
 * (Sales, Marketing, Support, Operations)
 *
 * This bridges the gap between the social media platform abstraction
 * and the existing Jarvis LangGraph agent system.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AgentWorkflowTrigger, SocialPost, PostResult } from './types';
import { BaseSocialPlatform } from './BaseSocialPlatform';
import { BusinessContextManager } from './BusinessContext';

export interface AgentResponse {
  content: string;
  confidence: number;
  reasoning: string;
  requiresApproval: boolean;
}

export class AgentBridge {
  private anthropic: Anthropic;
  private supabase: SupabaseClient;
  private contextManager: BusinessContextManager;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize business context manager for multi-tenant support
    this.contextManager = new BusinessContextManager();
  }

  // ========================================================================
  // AGENT WORKFLOW PROCESSING
  // ========================================================================

  /**
   * Process agent workflow trigger and generate response
   */
  async processWorkflow(
    trigger: AgentWorkflowTrigger,
    platform: BaseSocialPlatform
  ): Promise<PostResult | null> {
    console.log(`🤖 Processing ${trigger.agentType} workflow for post ${trigger.post.id}`);

    // Generate agent response using Claude with business-specific context
    const agentResponse = await this.generateAgentResponse(trigger);

    console.log(`💭 Agent response: "${agentResponse.content}"`);
    console.log(`📊 Confidence: ${agentResponse.confidence}%`);

    // Get business-specific confidence threshold
    const personality = await this.contextManager.getAgentPersonality(
      trigger.observatoryId,
      trigger.agentType
    );
    const confidenceThreshold = personality?.confidenceThreshold || 80;

    // Check if approval is required using business-specific threshold
    if (agentResponse.requiresApproval || agentResponse.confidence < confidenceThreshold) {
      console.log(
        `👤 Response requires human approval (confidence ${agentResponse.confidence}% < threshold ${confidenceThreshold}%)`
      );
      await this.requestApproval(trigger, agentResponse);
      return null;
    }

    // Execute action based on workflow
    let result: PostResult | null = null;

    try {
      switch (trigger.action) {
        case 'reply':
          result = await platform.replyToPost(trigger.post.id, agentResponse.content);
          console.log(`✅ Posted reply: ${result.url}`);
          break;

        case 'like':
          await platform.likePost(trigger.post.id);
          console.log('❤️  Liked post');
          break;

        case 'dm':
          await platform.sendDirectMessage(trigger.post.author.id, agentResponse.content);
          console.log('📧 Sent DM');
          break;

        case 'monitor':
          console.log('👁️  Monitoring only (no action)');
          break;

        default:
          console.log(`⚠️  Unknown action: ${trigger.action}`);
      }

      // Log successful execution
      await this.logWorkflowExecution(trigger, agentResponse, result);

      return result;
    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      await this.logWorkflowError(trigger, error as Error);
      throw error;
    }
  }

  /**
   * Generate agent response using Claude with business-specific context and prompts
   */
  private async generateAgentResponse(trigger: AgentWorkflowTrigger): Promise<AgentResponse> {
    // Generate business-specific system prompt using multi-tenant context manager
    const systemPrompt = await this.contextManager.generateSystemPrompt(
      trigger.observatoryId,
      trigger.agentType
    );

    // Search business knowledge base for relevant context
    const knowledgeEntries = await this.contextManager.searchKnowledgeBase(
      trigger.observatoryId,
      trigger.post.content.text
    );

    // Build user prompt with post context
    let userPrompt = `A social media user posted the following:

Author: @${trigger.post.author.username}
Platform: ${trigger.post.platform}
Content: "${trigger.post.content.text}"

Context:
- Matched keywords: ${trigger.context.matchedKeywords.join(', ')}
- Relevance score: ${trigger.context.relevanceScore}/100
- Sentiment: ${trigger.context.sentiment}
- Author followers: (would fetch from platform)
- Engagement on post: ${trigger.post.metrics.likes} likes, ${trigger.post.metrics.shares} shares`;

    // Include knowledge base entries if found
    if (knowledgeEntries.length > 0) {
      userPrompt += `\n\nRelevant Knowledge Base Entries:`;
      knowledgeEntries.forEach((entry) => {
        userPrompt += `\nQ: ${entry.question}\nA: ${entry.answer}`;
      });
    }

    userPrompt += `\n\nTask: Generate an appropriate ${trigger.action} response based on your role.

Requirements:
1. Be concise (max 280 characters for Twitter)
2. Be authentic and conversational
3. Stay on-brand
4. Address the specific context
5. Include a call-to-action if appropriate

Respond in JSON format:
{
  "content": "your response here",
  "confidence": 0-100,
  "reasoning": "why this response is appropriate",
  "requiresApproval": true/false
}`;

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt, // Now business-specific!
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        content: parsed.content,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        requiresApproval: parsed.requiresApproval || parsed.confidence < 80,
      };
    } catch (error) {
      console.error('Failed to parse agent response:', error);
      console.error('Raw response:', responseText);

      // Fallback: use raw text as content
      return {
        content: responseText.substring(0, 280),
        confidence: 50,
        reasoning: 'Failed to parse structured response',
        requiresApproval: true,
      };
    }
  }

  // ========================================================================
  // APPROVAL WORKFLOW
  // ========================================================================

  /**
   * Request human approval for agent response
   */
  private async requestApproval(
    trigger: AgentWorkflowTrigger,
    response: AgentResponse
  ): Promise<void> {
    await this.supabase.from('agent_approval_requests').insert({
      agent_type: trigger.agentType,
      post_id: trigger.post.id,
      platform: trigger.post.platform,
      post_content: trigger.post.content.text,
      author_username: trigger.post.author.username,
      proposed_response: response.content,
      confidence: response.confidence,
      reasoning: response.reasoning,
      context: trigger.context,
      action: trigger.action,
      priority: trigger.priority,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    console.log('📋 Approval request created');
  }

  // ========================================================================
  // LOGGING & ANALYTICS
  // ========================================================================

  /**
   * Log successful workflow execution
   */
  private async logWorkflowExecution(
    trigger: AgentWorkflowTrigger,
    response: AgentResponse,
    result: PostResult | null
  ): Promise<void> {
    await this.supabase.from('agent_workflow_logs').insert({
      agent_type: trigger.agentType,
      post_id: trigger.post.id,
      platform: trigger.post.platform,
      action: trigger.action,
      response_content: response.content,
      confidence: response.confidence,
      reasoning: response.reasoning,
      result_id: result?.id,
      result_url: result?.url,
      status: 'success',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Log workflow error
   */
  private async logWorkflowError(trigger: AgentWorkflowTrigger, error: Error): Promise<void> {
    await this.supabase.from('agent_workflow_logs').insert({
      agent_type: trigger.agentType,
      post_id: trigger.post.id,
      platform: trigger.post.platform,
      action: trigger.action,
      status: 'failed',
      error_message: error.message,
      error_stack: error.stack,
      created_at: new Date().toISOString(),
    });
  }

  // ========================================================================
  // BATCH PROCESSING
  // ========================================================================

  /**
   * Process multiple triggers in parallel
   */
  async processBatch(
    triggers: AgentWorkflowTrigger[],
    platforms: Map<string, BaseSocialPlatform>
  ): Promise<(PostResult | null)[]> {
    console.log(`🚀 Processing ${triggers.length} workflows in parallel...`);

    const results = await Promise.allSettled(
      triggers.map(async (trigger) => {
        const platform = platforms.get(trigger.post.platform);
        if (!platform) {
          throw new Error(`Platform ${trigger.post.platform} not initialized`);
        }
        return this.processWorkflow(trigger, platform);
      })
    );

    return results.map((result) => (result.status === 'fulfilled' ? result.value : null));
  }

  /**
   * Get agent performance analytics
   */
  async getAgentAnalytics(
    observatoryId: string,
    agentType?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    let query = this.supabase
      .from('agent_workflow_logs')
      .select('*')
      .eq('observatory_id', observatoryId);

    if (agentType) {
      query = query.eq('agent_type', agentType);
    }

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }

    const analytics = {
      totalExecutions: data.length,
      successful: data.filter((log) => log.status === 'success').length,
      failed: data.filter((log) => log.status === 'failed').length,
      averageConfidence: data.reduce((sum, log) => sum + (log.confidence || 0), 0) / data.length,
      byAgent: {} as Record<string, any>,
      byPlatform: {} as Record<string, any>,
      byAction: {} as Record<string, any>,
    };

    // Group by agent type
    data.forEach((log) => {
      if (!analytics.byAgent[log.agent_type]) {
        analytics.byAgent[log.agent_type] = { total: 0, successful: 0, failed: 0 };
      }
      analytics.byAgent[log.agent_type].total++;
      if (log.status === 'success') {
        analytics.byAgent[log.agent_type].successful++;
      } else {
        analytics.byAgent[log.agent_type].failed++;
      }
    });

    return analytics;
  }
}
