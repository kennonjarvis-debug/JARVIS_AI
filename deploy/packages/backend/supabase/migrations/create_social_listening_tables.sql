-- Social Listening System Database Tables
-- Created for multi-platform social listening and agent integration

-- ============================================================================
-- Social Activity Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('post', 'reply', 'like', 'dm', 'search')),
  post_id TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_social_activity_logs_integration ON social_activity_logs(integration_id);
CREATE INDEX idx_social_activity_logs_observatory ON social_activity_logs(observatory_id);
CREATE INDEX idx_social_activity_logs_created_at ON social_activity_logs(created_at DESC);

-- ============================================================================
-- Social Listening Matches
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_listening_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_id TEXT NOT NULL,
  author_username TEXT NOT NULL,
  content TEXT NOT NULL,
  matched_keywords TEXT[] NOT NULL,
  relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 0 AND 100),
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  suggested_action TEXT NOT NULL CHECK (suggested_action IN ('engage', 'monitor', 'ignore')),
  suggested_agent TEXT CHECK (suggested_agent IN ('sales', 'marketing', 'support', 'operations')),
  post_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_social_listening_matches_observatory ON social_listening_matches(observatory_id);
CREATE INDEX idx_social_listening_matches_platform ON social_listening_matches(platform);
CREATE INDEX idx_social_listening_matches_relevance ON social_listening_matches(relevance_score DESC);
CREATE INDEX idx_social_listening_matches_created_at ON social_listening_matches(created_at DESC);

-- ============================================================================
-- Agent Workflow Triggers
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('sales', 'marketing', 'support', 'operations')),
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  post_data JSONB NOT NULL,
  context JSONB NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('reply', 'like', 'dm', 'follow', 'monitor')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  response_id TEXT,
  response_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_agent_workflow_triggers_observatory ON agent_workflow_triggers(observatory_id);
CREATE INDEX idx_agent_workflow_triggers_status ON agent_workflow_triggers(status);
CREATE INDEX idx_agent_workflow_triggers_agent_type ON agent_workflow_triggers(agent_type);
CREATE INDEX idx_agent_workflow_triggers_priority ON agent_workflow_triggers(priority);
CREATE INDEX idx_agent_workflow_triggers_created_at ON agent_workflow_triggers(created_at DESC);

-- ============================================================================
-- Agent Workflow Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('sales', 'marketing', 'support', 'operations')),
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  action TEXT NOT NULL,
  response_content TEXT,
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  reasoning TEXT,
  result_id TEXT,
  result_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  error_stack TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agent_workflow_logs_observatory ON agent_workflow_logs(observatory_id);
CREATE INDEX idx_agent_workflow_logs_agent_type ON agent_workflow_logs(agent_type);
CREATE INDEX idx_agent_workflow_logs_status ON agent_workflow_logs(status);
CREATE INDEX idx_agent_workflow_logs_created_at ON agent_workflow_logs(created_at DESC);

-- ============================================================================
-- Agent Approval Requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('sales', 'marketing', 'support', 'operations')),
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  post_content TEXT NOT NULL,
  author_username TEXT NOT NULL,
  proposed_response TEXT NOT NULL,
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  reasoning TEXT,
  context JSONB,
  action TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_agent_approval_requests_observatory ON agent_approval_requests(observatory_id);
CREATE INDEX idx_agent_approval_requests_status ON agent_approval_requests(status);
CREATE INDEX idx_agent_approval_requests_agent_type ON agent_approval_requests(agent_type);
CREATE INDEX idx_agent_approval_requests_created_at ON agent_approval_requests(created_at DESC);

-- ============================================================================
-- Approval Requests (For social engagement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  post_data JSONB NOT NULL,
  matched_keywords TEXT[],
  relevance_score INTEGER,
  sentiment TEXT,
  suggested_action TEXT,
  suggested_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approval_requests_observatory ON approval_requests(observatory_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_created_at ON approval_requests(created_at DESC);

-- ============================================================================
-- Social Listening Configurations (Store user preferences)
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_listening_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE UNIQUE,
  keywords TEXT[] NOT NULL DEFAULT ARRAY['daw', 'music production', 'audio production'],
  platforms TEXT[] NOT NULL DEFAULT ARRAY['twitter'],
  filters JSONB DEFAULT '{"minFollowers": 0, "languages": ["en"], "excludeReplies": false, "excludeRetweets": true}',
  actions JSONB DEFAULT '{"autoReply": true, "notifyHuman": true, "triggerAgent": true}',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_social_listening_configs_observatory ON social_listening_configs(observatory_id);
CREATE INDEX idx_social_listening_configs_active ON social_listening_configs(is_active);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE social_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_listening_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_listening_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access data from their observatories
CREATE POLICY social_activity_logs_policy ON social_activity_logs
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY social_listening_matches_policy ON social_listening_matches
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_workflow_triggers_policy ON agent_workflow_triggers
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_workflow_logs_policy ON agent_workflow_logs
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_approval_requests_policy ON agent_approval_requests
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY approval_requests_policy ON approval_requests
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY social_listening_configs_policy ON social_listening_configs
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_listening_configs_updated_at
  BEFORE UPDATE ON social_listening_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Insert default configuration for existing observatories
INSERT INTO social_listening_configs (observatory_id, keywords, platforms)
SELECT id,
       ARRAY['daw', 'music production', 'audio production', 'beat making', 'music software'],
       ARRAY['twitter']
FROM observatories
ON CONFLICT (observatory_id) DO NOTHING;
