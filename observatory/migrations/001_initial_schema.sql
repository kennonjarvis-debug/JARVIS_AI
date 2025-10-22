-- Migration: 001_initial_schema
-- Description: Initial database schema for Jarvis autonomous agent system
-- Created: 2025-10-15
-- Author: Claude Code Instance 4

-- This migration can be run directly or via Supabase CLI:
-- npx supabase db reset
-- or
-- npx supabase migration up

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 0 AND priority <= 3),
  data JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'pending_approval')),
  result JSONB,
  error TEXT,
  agent_id TEXT,
  requested_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  CONSTRAINT valid_task_type CHECK (type ~ '^[a-z]+\.[a-z_]+(\.[a-z_]+)?$')
);

-- ============================================================================
-- MEMORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN (
    'task_execution',
    'user_feedback',
    'decision_outcome',
    'system_state',
    'learned_pattern',
    'error'
  )),
  content JSONB NOT NULL,
  agent_id TEXT,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}',
  importance DECIMAL(3,2) CHECK (importance >= 0 AND importance <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- APPROVALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  estimated_impact JSONB,
  alternatives JSONB,
  decision TEXT CHECK (decision IS NULL OR decision IN ('approved', 'rejected', 'modified')),
  responded_by TEXT,
  feedback TEXT,
  modifications JSONB,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- ============================================================================
-- DECISION RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS decision_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id TEXT UNIQUE NOT NULL,
  task_types TEXT[] NOT NULL,
  condition JSONB NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tasks indexes
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX idx_tasks_requested_by ON tasks(requested_by);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Memories indexes
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_task_id ON memories(task_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_agent_id ON memories(agent_id);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);

-- Approvals indexes
CREATE INDEX idx_approvals_task_id ON approvals(task_id);
CREATE INDEX idx_approvals_decision ON approvals(decision);
CREATE INDEX idx_approvals_requested_at ON approvals(requested_at DESC);
CREATE INDEX idx_approvals_expires_at ON approvals(expires_at);
CREATE INDEX idx_approvals_risk_level ON approvals(risk_level);

-- Decision rules indexes
CREATE INDEX idx_decision_rules_rule_id ON decision_rules(rule_id);
CREATE INDEX idx_decision_rules_active ON decision_rules(active);
CREATE INDEX idx_decision_rules_task_types ON decision_rules USING GIN(task_types);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decision_rules_updated_at
  BEFORE UPDATE ON decision_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION prune_old_memories(
  older_than_date TIMESTAMP WITH TIME ZONE,
  max_importance_threshold DECIMAL
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM memories
  WHERE created_at < older_than_date
    AND importance <= max_importance_threshold;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_expired_approvals()
RETURNS TABLE (
  approval_id UUID,
  task_id UUID,
  requested_action TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, approvals.task_id, requested_action, approvals.expires_at
  FROM approvals
  WHERE decision IS NULL
    AND approvals.expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

INSERT INTO decision_rules (rule_id, task_types, condition, risk_level, requires_approval, description)
VALUES
  (
    'low-cost-auto-approve',
    ARRAY['*'],
    '{"type": "financial_threshold", "maxAmount": 100}'::JSONB,
    'low',
    FALSE,
    'Auto-approve tasks with financial impact under $100'
  ),
  (
    'social-scheduled-auto',
    ARRAY['marketing.social.post'],
    '{"type": "scheduled", "minDelayHours": 2}'::JSONB,
    'low',
    FALSE,
    'Auto-approve scheduled social posts with 2+ hour delay'
  ),
  (
    'bulk-email-require-approval',
    ARRAY['marketing.email.campaign'],
    '{"type": "recipient_threshold", "minRecipients": 1000}'::JSONB,
    'medium',
    TRUE,
    'Require approval for bulk emails to 1000+ recipients'
  )
ON CONFLICT (rule_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tasks IS 'Stores all task submissions and execution results';
COMMENT ON TABLE memories IS 'Contextual memory for learning and decision-making';
COMMENT ON TABLE approvals IS 'Human-in-the-loop approval workflow';
COMMENT ON TABLE decision_rules IS 'Configurable rules for autonomous decision-making';
