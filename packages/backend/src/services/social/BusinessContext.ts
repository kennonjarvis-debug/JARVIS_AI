/**
 * Business Context Manager
 *
 * Manages business-specific context for multi-tenant Jarvis deployment.
 * Each observatory (business) has its own:
 * - Brand voice and personality
 * - Products/services information
 * - Target audience
 * - Custom keywords
 * - Response templates
 * - Industry-specific knowledge
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface BusinessProfile {
  observatoryId: string;
  businessName: string;
  industry: string;
  description: string;
  website?: string;

  // Brand & Voice
  brandVoice: 'professional' | 'casual' | 'friendly' | 'technical' | 'enthusiastic' | 'custom';
  customBrandVoice?: string;
  toneAttributes: string[]; // e.g., ["helpful", "concise", "empathetic"]

  // Products & Services
  products: ProductInfo[];
  services: ServiceInfo[];

  // Target Audience
  targetAudience: {
    demographics: string[];
    industries: string[];
    painPoints: string[];
  };

  // Pricing & Plans
  pricingTiers?: PricingTier[];

  // Key Differentiators
  uniqueSellingPoints: string[];
  competitors?: string[];

  // Custom Knowledge Base
  knowledgeBase: KnowledgeEntry[];

  // Social Media Guidelines
  socialGuidelines: {
    hashtagsToUse: string[];
    hashtagsToAvoid: string[];
    topicsToAvoid: string[];
    responseTime: 'immediate' | 'within_1hr' | 'within_24hr';
    approvalRequired: 'always' | 'high_risk_only' | 'never';
  };
}

export interface ProductInfo {
  name: string;
  description: string;
  features: string[];
  pricing?: string;
  url?: string;
}

export interface ServiceInfo {
  name: string;
  description: string;
  benefits: string[];
  pricing?: string;
}

export interface PricingTier {
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
}

export interface KnowledgeEntry {
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

export interface AgentPersonality {
  observatoryId: string;
  agentType: 'sales' | 'marketing' | 'support' | 'operations';

  systemPrompt: string;
  responseStyle: string;
  exampleResponses: ExampleResponse[];

  // Agent-specific rules
  rules: {
    maxResponseLength: number;
    includeLinks: boolean;
    includeEmojis: boolean;
    includeHashtags: boolean;
    mentionCompetitors: boolean;
    offerDiscounts: boolean;
    maxDiscountPercent?: number;
  };

  // Context awareness
  requiresContext: string[]; // What info agent needs before responding
  confidenceThreshold: number; // Min confidence to auto-respond (0-100)
}

export interface ExampleResponse {
  scenario: string;
  userMessage: string;
  agentResponse: string;
  reasoning: string;
}

export class BusinessContextManager {
  private supabase: SupabaseClient;
  private contextCache: Map<string, BusinessProfile>;
  private agentCache: Map<string, Map<string, AgentPersonality>>;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);

    this.contextCache = new Map();
    this.agentCache = new Map();
  }

  // ========================================================================
  // BUSINESS PROFILE MANAGEMENT
  // ========================================================================

  /**
   * Get business profile for an observatory
   */
  async getBusinessProfile(observatoryId: string): Promise<BusinessProfile> {
    // Check cache first
    if (this.contextCache.has(observatoryId)) {
      return this.contextCache.get(observatoryId)!;
    }

    // Load from database
    const { data: profile, error } = await this.supabase
      .from('business_profiles')
      .select('*')
      .eq('observatory_id', observatoryId)
      .single();

    if (error || !profile) {
      // Return default profile if not found
      return this.getDefaultProfile(observatoryId);
    }

    const businessProfile: BusinessProfile = {
      observatoryId: profile.observatory_id,
      businessName: profile.business_name,
      industry: profile.industry,
      description: profile.description,
      website: profile.website,
      brandVoice: profile.brand_voice,
      customBrandVoice: profile.custom_brand_voice,
      toneAttributes: profile.tone_attributes || [],
      products: profile.products || [],
      services: profile.services || [],
      targetAudience: profile.target_audience || { demographics: [], industries: [], painPoints: [] },
      pricingTiers: profile.pricing_tiers,
      uniqueSellingPoints: profile.unique_selling_points || [],
      competitors: profile.competitors,
      knowledgeBase: profile.knowledge_base || [],
      socialGuidelines: profile.social_guidelines || {
        hashtagsToUse: [],
        hashtagsToAvoid: [],
        topicsToAvoid: [],
        responseTime: 'within_1hr',
        approvalRequired: 'high_risk_only',
      },
    };

    // Cache it
    this.contextCache.set(observatoryId, businessProfile);

    return businessProfile;
  }

  /**
   * Update business profile
   */
  async updateBusinessProfile(
    observatoryId: string,
    updates: Partial<BusinessProfile>
  ): Promise<void> {
    await this.supabase
      .from('business_profiles')
      .upsert({
        observatory_id: observatoryId,
        business_name: updates.businessName,
        industry: updates.industry,
        description: updates.description,
        website: updates.website,
        brand_voice: updates.brandVoice,
        custom_brand_voice: updates.customBrandVoice,
        tone_attributes: updates.toneAttributes,
        products: updates.products,
        services: updates.services,
        target_audience: updates.targetAudience,
        pricing_tiers: updates.pricingTiers,
        unique_selling_points: updates.uniqueSellingPoints,
        competitors: updates.competitors,
        knowledge_base: updates.knowledgeBase,
        social_guidelines: updates.socialGuidelines,
        updated_at: new Date().toISOString(),
      });

    // Clear cache
    this.contextCache.delete(observatoryId);
  }

  /**
   * Get default profile for new observatories
   */
  private async getDefaultProfile(observatoryId: string): Promise<BusinessProfile> {
    // Load observatory info
    const { data: observatory } = await this.supabase
      .from('observatories')
      .select('name')
      .eq('id', observatoryId)
      .single();

    return {
      observatoryId,
      businessName: observatory?.name || 'My Business',
      industry: 'Technology',
      description: 'A business using Jarvis AI for social media management',
      brandVoice: 'professional',
      toneAttributes: ['helpful', 'professional', 'responsive'],
      products: [],
      services: [],
      targetAudience: {
        demographics: [],
        industries: [],
        painPoints: [],
      },
      uniqueSellingPoints: [],
      knowledgeBase: [],
      socialGuidelines: {
        hashtagsToUse: [],
        hashtagsToAvoid: [],
        topicsToAvoid: ['politics', 'religion'],
        responseTime: 'within_1hr',
        approvalRequired: 'high_risk_only',
      },
    };
  }

  // ========================================================================
  // AGENT PERSONALITY MANAGEMENT
  // ========================================================================

  /**
   * Get agent personality configuration
   */
  async getAgentPersonality(
    observatoryId: string,
    agentType: 'sales' | 'marketing' | 'support' | 'operations'
  ): Promise<AgentPersonality> {
    // Check cache
    const observatoryAgents = this.agentCache.get(observatoryId);
    if (observatoryAgents?.has(agentType)) {
      return observatoryAgents.get(agentType)!;
    }

    // Load from database
    const { data: personality, error } = await this.supabase
      .from('agent_personalities')
      .select('*')
      .eq('observatory_id', observatoryId)
      .eq('agent_type', agentType)
      .single();

    if (error || !personality) {
      // Generate default personality based on business profile
      const profile = await this.getBusinessProfile(observatoryId);
      return this.generateDefaultPersonality(profile, agentType);
    }

    const agentPersonality: AgentPersonality = {
      observatoryId: personality.observatory_id,
      agentType: personality.agent_type,
      systemPrompt: personality.system_prompt,
      responseStyle: personality.response_style,
      exampleResponses: personality.example_responses || [],
      rules: personality.rules || this.getDefaultRules(agentType),
      requiresContext: personality.requires_context || [],
      confidenceThreshold: personality.confidence_threshold || 80,
    };

    // Cache it
    if (!this.agentCache.has(observatoryId)) {
      this.agentCache.set(observatoryId, new Map());
    }
    this.agentCache.get(observatoryId)!.set(agentType, agentPersonality);

    return agentPersonality;
  }

  /**
   * Generate custom system prompt for agent based on business context
   */
  async generateSystemPrompt(
    observatoryId: string,
    agentType: 'sales' | 'marketing' | 'support' | 'operations'
  ): Promise<string> {
    const profile = await this.getBusinessProfile(observatoryId);
    const personality = await this.getAgentPersonality(observatoryId, agentType);

    let prompt = `You are a ${agentType} AI agent for ${profile.businessName}.

BUSINESS CONTEXT:
- Industry: ${profile.industry}
- Description: ${profile.description}
${profile.website ? `- Website: ${profile.website}` : ''}

BRAND VOICE: ${profile.brandVoice}
${profile.customBrandVoice ? `Custom Voice: ${profile.customBrandVoice}` : ''}
Tone Attributes: ${profile.toneAttributes.join(', ')}

`;

    // Add products/services info
    if (profile.products.length > 0) {
      prompt += `\nPRODUCTS:\n`;
      profile.products.forEach(product => {
        prompt += `- ${product.name}: ${product.description}\n`;
        if (product.features.length > 0) {
          prompt += `  Features: ${product.features.join(', ')}\n`;
        }
        if (product.pricing) {
          prompt += `  Pricing: ${product.pricing}\n`;
        }
      });
    }

    if (profile.services.length > 0) {
      prompt += `\nSERVICES:\n`;
      profile.services.forEach(service => {
        prompt += `- ${service.name}: ${service.description}\n`;
        if (service.benefits.length > 0) {
          prompt += `  Benefits: ${service.benefits.join(', ')}\n`;
        }
      });
    }

    // Add pricing tiers
    if (profile.pricingTiers && profile.pricingTiers.length > 0) {
      prompt += `\nPRICING TIERS:\n`;
      profile.pricingTiers.forEach(tier => {
        prompt += `- ${tier.name}: ${tier.price}${tier.recommended ? ' (RECOMMENDED)' : ''}\n`;
        prompt += `  Features: ${tier.features.join(', ')}\n`;
      });
    }

    // Add target audience
    if (profile.targetAudience.demographics.length > 0 || profile.targetAudience.industries.length > 0) {
      prompt += `\nTARGET AUDIENCE:\n`;
      if (profile.targetAudience.demographics.length > 0) {
        prompt += `Demographics: ${profile.targetAudience.demographics.join(', ')}\n`;
      }
      if (profile.targetAudience.industries.length > 0) {
        prompt += `Industries: ${profile.targetAudience.industries.join(', ')}\n`;
      }
      if (profile.targetAudience.painPoints.length > 0) {
        prompt += `Pain Points: ${profile.targetAudient.painPoints.join(', ')}\n`;
      }
    }

    // Add USPs
    if (profile.uniqueSellingPoints.length > 0) {
      prompt += `\nUNIQUE SELLING POINTS:\n${profile.uniqueSellingPoints.map(usp => `- ${usp}`).join('\n')}\n`;
    }

    // Add knowledge base
    if (profile.knowledgeBase.length > 0) {
      prompt += `\nKNOWLEDGE BASE:\n`;
      profile.knowledgeBase.forEach(entry => {
        prompt += `Q: ${entry.question}\nA: ${entry.answer}\n\n`;
      });
    }

    // Add agent-specific role
    prompt += `\nYOUR ROLE AS ${agentType.toUpperCase()} AGENT:\n`;

    switch (agentType) {
      case 'sales':
        prompt += `- Qualify leads and identify potential customers
- Provide information about products, services, and pricing
- Guide prospects through the sales process
- Schedule demos and consultations
- Keep responses focused on value and ROI
`;
        break;

      case 'marketing':
        prompt += `- Engage with community discussions
- Share valuable content and insights
- Promote products/services naturally in context
- Build brand awareness and positive sentiment
- Foster relationships with potential customers
`;
        break;

      case 'support':
        prompt += `- Troubleshoot technical issues
- Answer questions about features and functionality
- Provide guidance on best practices
- Escalate complex issues when needed
- Ensure customer satisfaction and retention
`;
        break;

      case 'operations':
        prompt += `- Handle technical and API questions
- Assist with integrations and implementations
- Address developer inquiries
- Monitor system performance concerns
- Coordinate with technical team
`;
        break;
    }

    // Add response rules
    prompt += `\nRESPONSE RULES:\n`;
    prompt += `- Maximum response length: ${personality.rules.maxResponseLength} characters\n`;
    prompt += `- Include links: ${personality.rules.includeLinks ? 'Yes' : 'No'}\n`;
    prompt += `- Use emojis: ${personality.rules.includeEmojis ? 'Yes' : 'No'}\n`;
    prompt += `- Use hashtags: ${personality.rules.includeHashtags ? 'Yes' : 'No'}\n`;
    prompt += `- Mention competitors: ${personality.rules.mentionCompetitors ? 'Yes' : 'No'}\n`;
    if (personality.rules.offerDiscounts) {
      prompt += `- Can offer discounts up to ${personality.rules.maxDiscountPercent || 10}%\n`;
    }

    // Add social guidelines
    if (profile.socialGuidelines.topicsToAvoid.length > 0) {
      prompt += `\nTOPICS TO AVOID: ${profile.socialGuidelines.topicsToAvoid.join(', ')}\n`;
    }

    // Add example responses
    if (personality.exampleResponses.length > 0) {
      prompt += `\nEXAMPLE RESPONSES:\n`;
      personality.exampleResponses.forEach(example => {
        prompt += `Scenario: ${example.scenario}\n`;
        prompt += `User: "${example.userMessage}"\n`;
        prompt += `Response: "${example.agentResponse}"\n`;
        prompt += `Reasoning: ${example.reasoning}\n\n`;
      });
    }

    prompt += `\nAlways respond in JSON format:
{
  "content": "your response here",
  "confidence": 0-100,
  "reasoning": "why this response is appropriate",
  "requiresApproval": true/false
}`;

    return prompt;
  }

  /**
   * Generate default agent personality
   */
  private generateDefaultPersonality(
    profile: BusinessProfile,
    agentType: 'sales' | 'marketing' | 'support' | 'operations'
  ): AgentPersonality {
    return {
      observatoryId: profile.observatoryId,
      agentType,
      systemPrompt: '', // Will be generated dynamically
      responseStyle: profile.brandVoice,
      exampleResponses: [],
      rules: this.getDefaultRules(agentType),
      requiresContext: this.getDefaultContextRequirements(agentType),
      confidenceThreshold: 80,
    };
  }

  /**
   * Get default rules for agent type
   */
  private getDefaultRules(agentType: string): AgentPersonality['rules'] {
    return {
      maxResponseLength: 280,
      includeLinks: agentType === 'sales' || agentType === 'marketing',
      includeEmojis: agentType === 'marketing' || agentType === 'support',
      includeHashtags: agentType === 'marketing',
      mentionCompetitors: false,
      offerDiscounts: agentType === 'sales',
      maxDiscountPercent: 10,
    };
  }

  /**
   * Get default context requirements
   */
  private getDefaultContextRequirements(agentType: string): string[] {
    switch (agentType) {
      case 'sales':
        return ['user_intent', 'budget_indication', 'company_size'];
      case 'marketing':
        return ['user_interests', 'engagement_history'];
      case 'support':
        return ['issue_description', 'product_version', 'error_messages'];
      case 'operations':
        return ['technical_details', 'api_version', 'integration_type'];
      default:
        return [];
    }
  }

  // ========================================================================
  // KNOWLEDGE BASE QUERIES
  // ========================================================================

  /**
   * Search knowledge base for relevant answers
   */
  async searchKnowledgeBase(
    observatoryId: string,
    query: string
  ): Promise<KnowledgeEntry[]> {
    const profile = await this.getBusinessProfile(observatoryId);

    const queryLower = query.toLowerCase();

    return profile.knowledgeBase
      .filter(entry =>
        entry.keywords.some(keyword => queryLower.includes(keyword.toLowerCase())) ||
        entry.question.toLowerCase().includes(queryLower)
      )
      .sort((a, b) => {
        // Sort by number of keyword matches
        const aMatches = a.keywords.filter(k => queryLower.includes(k.toLowerCase())).length;
        const bMatches = b.keywords.filter(k => queryLower.includes(k.toLowerCase())).length;
        return bMatches - aMatches;
      });
  }

  /**
   * Clear cache for an observatory
   */
  clearCache(observatoryId: string): void {
    this.contextCache.delete(observatoryId);
    this.agentCache.delete(observatoryId);
  }
}
