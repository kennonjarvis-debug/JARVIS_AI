-- Jarvis Autonomous AI - Supabase Database Schema
-- Run this migration to set up all required tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for embeddings

-- ============================================================================
-- Memory System (with pgvector + full-text search)
-- ============================================================================

CREATE TABLE IF NOT EXISTS memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('conversation', 'decision', 'action', 'event', 'task_execution', 'scheduled_task')),
  agent TEXT,
  content JSONB NOT NULL,
  importance NUMERIC(3, 2) NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding VECTOR(1536),  -- OpenAI ada-002 or similar
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search on JSONB content (generated tsvector column)
ALTER TABLE memory ADD COLUMN IF NOT EXISTS fts TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', content::text)) STORED;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory(type);
CREATE INDEX IF NOT EXISTS idx_memory_agent ON memory(agent);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory(importance DESC);
CREATE INDEX IF NOT EXISTS idx_memory_fts ON memory USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_memory_embedding ON memory USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- Approval Queue
-- ============================================================================

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  estimated_impact JSONB NOT NULL,
  alternatives JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'modified', 'expired')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Response data
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  decision TEXT CHECK (decision IN ('approved', 'rejected', 'modified')),
  feedback TEXT,
  modifications JSONB,
  rejection_reason TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_task_id ON approvals(task_id);
CREATE INDEX IF NOT EXISTS idx_approvals_expires_at ON approvals(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approvals_requested_at ON approvals(requested_at DESC);

-- ============================================================================
-- Task Execution Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 0 AND priority <= 3),
  data JSONB NOT NULL,
  requested_by TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'awaiting_approval', 'completed', 'failed')),
  assigned_agent TEXT,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  result JSONB,
  error TEXT,
  required_approval BOOLEAN DEFAULT FALSE,
  approval_request_id UUID REFERENCES approvals(id),

  -- Audit
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent);

-- ============================================================================
-- Support Tickets
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,

  -- Categorization
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT CHECK (category IN ('bug', 'billing', 'feature_request', 'general')),

  -- Assignment
  assigned_to TEXT,  -- 'auto', 'human', or team name
  escalated BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_email ON support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- ============================================================================
-- Knowledge Base Articles
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Search
  fts TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || content)
  ) STORED,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category);
CREATE INDEX IF NOT EXISTS idx_kb_articles_fts ON kb_articles USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_kb_articles_tags ON kb_articles USING GIN(tags);

-- ============================================================================
-- System Alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,

  -- Status
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_acknowledged ON system_alerts(acknowledged) WHERE NOT acknowledged;

-- ============================================================================
-- Contacts (synced from HubSpot)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hubspot_id TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  company TEXT,

  -- Lead scoring
  lead_score INTEGER,
  lead_category TEXT CHECK (lead_category IN ('hot', 'warm', 'cold')),

  -- Sync
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_id ON contacts(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score DESC NULLS LAST);

-- ============================================================================
-- Analytics Snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_created_at ON analytics_snapshots(created_at DESC);

-- ============================================================================
-- Health Check (for system monitoring)
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_check (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)  -- Only allow one row
);

INSERT INTO health_check (id, last_check) VALUES (1, NOW())
ON CONFLICT (id) DO UPDATE SET last_check = NOW();

-- ============================================================================
-- Row Level Security (RLS) - Enable for production
-- ============================================================================

-- Enable RLS on all tables
-- ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Add policies as needed based on your auth requirements

-- ============================================================================
-- Functions for common operations
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Utility Views
-- ============================================================================

-- Pending approvals summary
CREATE OR REPLACE VIEW pending_approvals_summary AS
SELECT
  risk_level,
  COUNT(*) as count,
  MIN(expires_at) as next_expiration
FROM approvals
WHERE status = 'pending'
GROUP BY risk_level;

-- Task execution summary
CREATE OR REPLACE VIEW task_execution_summary AS
SELECT
  type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM tasks
WHERE started_at IS NOT NULL
GROUP BY type, status;

-- Support ticket metrics
CREATE OR REPLACE VIEW support_metrics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_tickets,
  COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_tickets,
  COUNT(*) FILTER (WHERE assigned_to = 'auto') as auto_resolved,
  AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_response_time_minutes,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_minutes
FROM support_tickets
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- ============================================================================
-- Sample Data (for development/testing)
-- ============================================================================

-- Insert sample KB article
INSERT INTO kb_articles (title, content, category, tags)
VALUES (
  'How to get started with DAWG AI',
  'DAWG AI is a browser-based Digital Audio Workstation. To get started: 1) Create an account 2) Import your audio files 3) Start creating music!',
  'getting-started',
  ARRAY['tutorial', 'basics', 'onboarding']
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Grants (adjust based on your auth setup)
-- ============================================================================

-- Grant service role full access
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant anon role read access to KB
-- GRANT SELECT ON kb_articles TO anon;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify setup
SELECT 'Migration complete! Tables created:' as status;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT 'Extensions enabled:' as status;
SELECT extname
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'vector');
