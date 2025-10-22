-- Business Context System Database Tables
-- Multi-Tenant Business Profile and Agent Personality Configuration
-- Created for per-business AI agent customization

-- ============================================================================
-- Business Profiles Table
-- ============================================================================
-- Stores business-specific context for each observatory
-- Each observatory represents one business with its own brand, products, and voice

CREATE TABLE IF NOT EXISTS business_profiles (
  observatory_id UUID PRIMARY KEY REFERENCES observatories(id) ON DELETE CASCADE,

  -- Basic Business Info
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  description TEXT NOT NULL,
  website TEXT,

  -- Brand Voice & Tone
  brand_voice TEXT NOT NULL DEFAULT 'professional' CHECK (brand_voice IN ('professional', 'casual', 'friendly', 'technical', 'enthusiastic', 'custom')),
  custom_brand_voice TEXT,
  tone_attributes TEXT[] DEFAULT ARRAY['helpful', 'concise', 'empathetic'],

  -- Products & Services (JSONB for flexible structure)
  products JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ name, description, features, pricing, targetAudience }]

  services JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ name, description, deliverables, pricing, targetAudience }]

  -- Target Audience
  target_audience JSONB DEFAULT '{}'::jsonb,
  -- Structure: { demographics: [], industries: [], painPoints: [] }

  -- Pricing Information
  pricing_tiers JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ name, price, billingPeriod, features, callToAction }]

  -- Competitive Positioning
  unique_selling_points TEXT[] DEFAULT ARRAY[]::TEXT[],
  competitors TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Knowledge Base
  knowledge_base JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ question, answer, keywords, category }]

  -- Social Media Guidelines
  social_guidelines JSONB DEFAULT '{}'::jsonb,
  -- Structure: {
  --   hashtagsToUse: [],
  --   hashtagsToAvoid: [],
  --   topicsToAvoid: [],
  --   responseTime: "immediate" | "within_1hr" | "within_24hr",
  --   approvalRequired: "always" | "high_risk_only" | "never"
  -- }

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_business_profiles_industry ON business_profiles(industry);
CREATE INDEX idx_business_profiles_brand_voice ON business_profiles(brand_voice);

-- ============================================================================
-- Agent Personalities Table
-- ============================================================================
-- Stores agent-specific configuration for each business
-- Allows per-business customization of Sales, Marketing, Support, Operations agents

CREATE TABLE IF NOT EXISTS agent_personalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID NOT NULL REFERENCES observatories(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('sales', 'marketing', 'support', 'operations')),

  -- Agent Personality
  system_prompt TEXT,
  -- Custom system prompt override (if provided, overrides default generation)

  response_style TEXT,
  -- High-level description of how this agent should respond

  example_responses JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ situation, response, explanation }]
  -- Few-shot examples to guide agent behavior

  -- Response Rules
  rules JSONB DEFAULT '{}'::jsonb,
  -- Structure: {
  --   maxResponseLength: 280,
  --   includeLinks: true,
  --   includeEmojis: false,
  --   includeHashtags: true,
  --   mentionCompetitors: false,
  --   offerDiscounts: false,
  --   maxDiscountPercent: 10
  -- }

  -- Context Requirements
  requires_context TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- List of required context fields (e.g., ["pricing", "features", "availability"])

  -- Approval Settings
  confidence_threshold INTEGER DEFAULT 80 CHECK (confidence_threshold BETWEEN 0 AND 100),
  -- Minimum confidence score to auto-approve responses

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one personality per agent type per business
  UNIQUE(observatory_id, agent_type)
);

-- Indexes for performance
CREATE INDEX idx_agent_personalities_observatory ON agent_personalities(observatory_id);
CREATE INDEX idx_agent_personalities_agent_type ON agent_personalities(agent_type);
CREATE INDEX idx_agent_personalities_combo ON agent_personalities(observatory_id, agent_type);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_personalities ENABLE ROW LEVEL SECURITY;

-- Users can only access their own observatory's business profile
CREATE POLICY business_profiles_policy ON business_profiles
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can only access their own observatory's agent personalities
CREATE POLICY agent_personalities_policy ON agent_personalities
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Auto-update updated_at timestamp on business_profiles
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp on agent_personalities
CREATE TRIGGER update_agent_personalities_updated_at
  BEFORE UPDATE ON agent_personalities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sample/Default Data
-- ============================================================================

-- Insert default business profiles for existing observatories
-- This ensures every observatory has a basic profile to start with
INSERT INTO business_profiles (
  observatory_id,
  business_name,
  industry,
  description,
  brand_voice,
  tone_attributes,
  unique_selling_points,
  social_guidelines
)
SELECT
  o.id,
  COALESCE(o.name, 'My Business'),
  'Technology',
  'AI-powered business solutions',
  'professional',
  ARRAY['helpful', 'responsive', 'knowledgeable'],
  ARRAY['AI-powered automation', '24/7 availability', 'Personalized service'],
  jsonb_build_object(
    'responseTime', 'within_1hr',
    'approvalRequired', 'high_risk_only',
    'hashtagsToUse', '[]'::jsonb,
    'hashtagsToAvoid', '[]'::jsonb,
    'topicsToAvoid', '[]'::jsonb
  )
FROM observatories o
WHERE NOT EXISTS (
  SELECT 1 FROM business_profiles bp WHERE bp.observatory_id = o.id
);

-- Insert default agent personalities for each business
-- Creates all 4 agent types (sales, marketing, support, operations) for each observatory
INSERT INTO agent_personalities (
  observatory_id,
  agent_type,
  response_style,
  rules,
  confidence_threshold
)
SELECT
  o.id,
  agent_type,
  CASE
    WHEN agent_type = 'sales' THEN 'Consultative and solution-focused. Qualify leads and provide value.'
    WHEN agent_type = 'marketing' THEN 'Engaging and community-focused. Build brand awareness and relationships.'
    WHEN agent_type = 'support' THEN 'Patient and problem-solving. Address issues and ensure satisfaction.'
    WHEN agent_type = 'operations' THEN 'Technical and precise. Provide accurate implementation guidance.'
  END,
  jsonb_build_object(
    'maxResponseLength', 280,
    'includeLinks', true,
    'includeEmojis', CASE WHEN agent_type IN ('marketing', 'support') THEN true ELSE false END,
    'includeHashtags', CASE WHEN agent_type = 'marketing' THEN true ELSE false END,
    'mentionCompetitors', false,
    'offerDiscounts', CASE WHEN agent_type = 'sales' THEN true ELSE false END,
    'maxDiscountPercent', 10
  ),
  CASE
    WHEN agent_type = 'sales' THEN 85
    WHEN agent_type = 'marketing' THEN 75
    WHEN agent_type = 'support' THEN 80
    WHEN agent_type = 'operations' THEN 90
  END
FROM observatories o
CROSS JOIN (
  VALUES ('sales'), ('marketing'), ('support'), ('operations')
) AS agent_types(agent_type)
WHERE NOT EXISTS (
  SELECT 1 FROM agent_personalities ap
  WHERE ap.observatory_id = o.id
  AND ap.agent_type = agent_types.agent_type
);

-- ============================================================================
-- Example Knowledge Base Entries
-- ============================================================================

-- Add sample knowledge base entries to demonstrate structure
-- Users can customize these in their dashboard
UPDATE business_profiles
SET knowledge_base = jsonb_build_array(
  jsonb_build_object(
    'question', 'What is your pricing?',
    'answer', 'We offer flexible pricing plans starting from $29/month for individuals up to custom enterprise solutions. All plans include a 14-day free trial.',
    'keywords', ARRAY['pricing', 'cost', 'price', 'expensive', 'cheap', 'afford'],
    'category', 'pricing'
  ),
  jsonb_build_object(
    'question', 'How do I get started?',
    'answer', 'Getting started is easy! Sign up for a free trial, connect your social accounts, and configure your keywords. Our AI agents will start monitoring and engaging within minutes.',
    'keywords', ARRAY['start', 'begin', 'setup', 'onboard', 'getting started', 'how to use'],
    'category', 'onboarding'
  ),
  jsonb_build_object(
    'question', 'What platforms do you support?',
    'answer', 'We currently support Twitter, with Facebook and LinkedIn integration coming soon. All platforms share the same powerful AI-driven engagement features.',
    'keywords', ARRAY['platform', 'support', 'integrate', 'twitter', 'facebook', 'linkedin', 'social media'],
    'category', 'features'
  )
)
WHERE knowledge_base = '[]'::jsonb;

-- ============================================================================
-- Comments & Documentation
-- ============================================================================

COMMENT ON TABLE business_profiles IS 'Stores business-specific context for multi-tenant AI agent personalization';
COMMENT ON TABLE agent_personalities IS 'Stores agent-specific behavior configuration per business';

COMMENT ON COLUMN business_profiles.brand_voice IS 'Overall tone and personality of brand communications';
COMMENT ON COLUMN business_profiles.knowledge_base IS 'FAQ and business-specific information for agent responses';
COMMENT ON COLUMN business_profiles.social_guidelines IS 'Rules and preferences for social media engagement';

COMMENT ON COLUMN agent_personalities.confidence_threshold IS 'Minimum confidence (0-100) required to auto-approve agent responses';
COMMENT ON COLUMN agent_personalities.example_responses IS 'Few-shot learning examples to guide agent behavior';
COMMENT ON COLUMN agent_personalities.rules IS 'Agent-specific rules for response formatting and content';
