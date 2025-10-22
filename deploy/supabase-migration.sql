-- JARVIS Integration System Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/nvyebkzrrvmepbdejspr

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- OBSERVATORIES TABLE
-- ============================================================================
-- Each business using JARVIS is an "observatory"
CREATE TABLE IF NOT EXISTS observatories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE observatories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own observatories
CREATE POLICY "Users can view own observatories"
  ON observatories FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own observatories"
  ON observatories FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own observatories"
  ON observatories FOR UPDATE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- INTEGRATIONS TABLE
-- ============================================================================
-- Stores connected platform integrations (Twitter, Gmail, HubSpot, etc.)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL, -- 'twitter', 'gmail', 'hubspot', etc.
  account_name TEXT, -- Display name (e.g., "@JarvisAiCo")
  account_id TEXT, -- External platform account ID
  credentials JSONB NOT NULL, -- Encrypted OAuth tokens and API keys
  config JSONB DEFAULT '{}', -- Platform-specific configuration
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique platform + account per observatory
  UNIQUE(observatory_id, platform, account_id)
);

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access integrations for their observatories
CREATE POLICY "Users can view own integrations"
  ON integrations FOR SELECT
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own integrations"
  ON integrations FOR INSERT
  WITH CHECK (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own integrations"
  ON integrations FOR UPDATE
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own integrations"
  ON integrations FOR DELETE
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_integrations_observatory ON integrations(observatory_id);
CREATE INDEX idx_integrations_platform ON integrations(platform);
CREATE INDEX idx_integrations_status ON integrations(status);

-- ============================================================================
-- ACTIVITY LOGS TABLE
-- ============================================================================
-- Tracks all autonomous actions performed by JARVIS
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- 'post', 'email', 'crm_update', 'message', 'sync', etc.
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'sent', 'synced'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}', -- Additional context (tweet ID, email subject, etc.)
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activity for their observatories
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_activity_logs_observatory ON activity_logs(observatory_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_status ON activity_logs(status);

-- ============================================================================
-- AUTOMATION RULES TABLE
-- ============================================================================
-- Defines automation rules and scheduled tasks
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('schedule', 'webhook', 'event')),
  trigger_config JSONB NOT NULL, -- Cron schedule, webhook URL, event pattern
  actions JSONB NOT NULL, -- Array of actions to execute
  conditions JSONB DEFAULT '{}', -- Optional conditions for execution
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  requires_approval BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage automation rules for their observatories
CREATE POLICY "Users can view own automation rules"
  ON automation_rules FOR SELECT
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own automation rules"
  ON automation_rules FOR INSERT
  WITH CHECK (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own automation rules"
  ON automation_rules FOR UPDATE
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own automation rules"
  ON automation_rules FOR DELETE
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_automation_rules_observatory ON automation_rules(observatory_id);
CREATE INDEX idx_automation_rules_enabled ON automation_rules(enabled);
CREATE INDEX idx_automation_rules_next_run ON automation_rules(next_run_at) WHERE enabled = true;

-- ============================================================================
-- APPROVAL REQUESTS TABLE
-- ============================================================================
-- Queue for high-risk actions requiring human approval
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,
  automation_rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL, -- 'automation', 'manual_action', 'financial', 'data_deletion'
  action_data JSONB NOT NULL, -- What action JARVIS wants to perform
  risk_level TEXT NOT NULL CHECK (risk_level IN ('medium', 'high')),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT, -- Why JARVIS thinks this action should be taken
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id),
  response_note TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Enable Row Level Security
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view approval requests for their observatories
CREATE POLICY "Users can view own approval requests"
  ON approval_requests FOR SELECT
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can respond to own approval requests"
  ON approval_requests FOR UPDATE
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_approval_requests_observatory ON approval_requests(observatory_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_pending ON approval_requests(requested_at DESC)
  WHERE status = 'pending';

-- ============================================================================
-- CONTACTS TABLE
-- ============================================================================
-- Unified contact database synced from CRMs
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  external_id TEXT, -- ID in the source system (HubSpot, Salesforce, etc.)
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  phone TEXT,
  lifecycle_stage TEXT, -- 'lead', 'opportunity', 'customer'
  properties JSONB DEFAULT '{}', -- Additional CRM fields
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique email per observatory
  UNIQUE(observatory_id, email)
);

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view contacts for their observatories
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_contacts_observatory ON contacts(observatory_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_lifecycle ON contacts(lifecycle_stage);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Stores messages from all communication channels (email, iMessage, etc.)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  external_id TEXT, -- ID in the source system
  channel TEXT NOT NULL, -- 'email', 'imessage', 'sms'
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}', -- Attachments, thread ID, etc.
  is_read BOOLEAN DEFAULT false,
  requires_response BOOLEAN DEFAULT false,
  sentiment_score FLOAT, -- AI-analyzed sentiment (-1 to 1)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for their observatories
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_messages_observatory ON messages(observatory_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_unread ON messages(is_read) WHERE is_read = false;

-- ============================================================================
-- SOCIAL POSTS TABLE
-- ============================================================================
-- Tracks all social media posts across platforms
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  platform TEXT NOT NULL, -- 'twitter', 'linkedin', 'instagram', 'facebook'
  external_id TEXT, -- Post ID on the platform
  content TEXT NOT NULL,
  media_urls TEXT[], -- Array of image/video URLs
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  engagement JSONB DEFAULT '{}', -- likes, retweets, comments, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view social posts for their observatories
CREATE POLICY "Users can view own social posts"
  ON social_posts FOR SELECT
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own social posts"
  ON social_posts FOR INSERT
  WITH CHECK (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own social posts"
  ON social_posts FOR UPDATE
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_social_posts_observatory ON social_posts(observatory_id);
CREATE INDEX idx_social_posts_platform ON social_posts(platform);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_at)
  WHERE status = 'scheduled';

-- ============================================================================
-- ANALYTICS TABLE
-- ============================================================================
-- Stores aggregated analytics and metrics
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  metric_type TEXT NOT NULL, -- 'social_engagement', 'email_open_rate', 'crm_conversion', etc.
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  dimensions JSONB DEFAULT '{}', -- Additional dimensions (platform, campaign, etc.)
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analytics for their observatories
CREATE POLICY "Users can view own analytics"
  ON analytics FOR SELECT
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_analytics_observatory ON analytics(observatory_id);
CREATE INDEX idx_analytics_type ON analytics(metric_type);
CREATE INDEX idx_analytics_period ON analytics(period_start, period_end);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_observatories_updated_at
  BEFORE UPDATE ON observatories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create observatory for superadmin (kennonjarvis@gmail.com)
DO $$
DECLARE
  superadmin_id UUID;
  observatory_id UUID;
BEGIN
  -- Get superadmin user ID
  SELECT id INTO superadmin_id
  FROM auth.users
  WHERE email = 'kennonjarvis@gmail.com'
  LIMIT 1;

  IF superadmin_id IS NOT NULL THEN
    -- Create default observatory if it doesn't exist
    INSERT INTO observatories (name, description, owner_id)
    VALUES (
      'DAWG AI',
      'Autonomous operations for DAWG AI - browser-based digital audio workstation',
      superadmin_id
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO observatory_id;

    -- Log creation
    IF observatory_id IS NOT NULL THEN
      RAISE NOTICE 'Created observatory for DAWG AI: %', observatory_id;
    ELSE
      RAISE NOTICE 'Observatory already exists for superadmin';
    END IF;
  ELSE
    RAISE NOTICE 'Superadmin user not found - run this migration after first login';
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tables created:
-- 1. observatories - Business entities using JARVIS
-- 2. integrations - Connected platforms (Twitter, Gmail, HubSpot, etc.)
-- 3. activity_logs - Audit trail of all autonomous actions
-- 4. automation_rules - Scheduled tasks and automation workflows
-- 5. approval_requests - Queue for high-risk actions
-- 6. contacts - Unified contact database from CRMs
-- 7. messages - Communication channels (email, iMessage, SMS)
-- 8. social_posts - Social media content across platforms
-- 9. analytics - Aggregated metrics and KPIs
--
-- All tables have Row Level Security enabled
-- All tables are optimized with appropriate indexes
-- Auto-updating timestamps on relevant tables
