-- Agent Activities Table
-- Stores all agent activity logs for Observatory dashboard

CREATE TABLE IF NOT EXISTS agent_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('marketing', 'sales', 'operations', 'support', 'imessage', 'dawg-monitor')),
  action TEXT NOT NULL,
  description TEXT,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_approval', 'awaiting_approval', 'approved', 'rejected', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  result JSONB,
  error TEXT,
  duration_ms INTEGER,
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_activities_timestamp ON agent_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activities_status ON agent_activities(status);
CREATE INDEX IF NOT EXISTS idx_agent_activities_agent_type ON agent_activities(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_activities_risk_level ON agent_activities(risk_level);
CREATE INDEX IF NOT EXISTS idx_agent_activities_correlation_id ON agent_activities(correlation_id);

-- Scheduled social posts table
CREATE TABLE IF NOT EXISTS scheduled_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'facebook', 'instagram')),
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed', 'cancelled')),
  posted_at TIMESTAMPTZ,
  post_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_social_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_social_posts(status);

-- Blog ideas table
CREATE TABLE IF NOT EXISTS blog_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT[],
  target_word_count INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  completed_at TIMESTAMPTZ,
  published_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_ideas_status ON blog_ideas(status);

-- Lead scores table
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  factors JSONB DEFAULT '{}',
  last_engagement TIMESTAMPTZ,
  next_followup TIMESTAMPTZ,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_email ON lead_scores(email);
CREATE INDEX IF NOT EXISTS idx_lead_scores_score ON lead_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scores_status ON lead_scores(status);

-- Support tickets table (if not exists)
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_email ON support_tickets(user_email);

-- Agent metrics summary (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_metrics_summary AS
SELECT
  agent_type,
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE risk_level = 'LOW') as low_risk_count,
  COUNT(*) FILTER (WHERE risk_level = 'MEDIUM') as medium_risk_count,
  COUNT(*) FILTER (WHERE risk_level = 'HIGH') as high_risk_count,
  COUNT(*) FILTER (WHERE status = 'pending_approval' OR status = 'awaiting_approval') as pending_approval_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  AVG(duration_ms) as avg_duration_ms,
  MAX(timestamp) as last_activity
FROM agent_activities
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY agent_type, DATE_TRUNC('hour', timestamp);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_agent_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY agent_metrics_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_agent_activities_updated_at BEFORE UPDATE ON agent_activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at BEFORE UPDATE ON scheduled_social_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_ideas_updated_at BEFORE UPDATE ON blog_ideas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_scores_updated_at BEFORE UPDATE ON lead_scores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO agent_activities (agent_type, action, description, risk_level, status, completed_at)
VALUES
  ('marketing', 'analyze_social_performance', 'Analyzed last week''s social media performance', 'LOW', 'completed', NOW() - INTERVAL '2 hours'),
  ('sales', 'score_new_lead', 'Scored lead from contact form', 'LOW', 'completed', NOW() - INTERVAL '1 hour'),
  ('support', 'route_ticket', 'Routed ticket #1234 to technical support', 'LOW', 'completed', NOW() - INTERVAL '30 minutes'),
  ('operations', 'backup_database', 'Performed automated database backup', 'LOW', 'completed', NOW() - INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO scheduled_social_posts (platform, content, scheduled_for)
VALUES
  ('twitter', 'Check out our latest AI features! 🤖 #AI #MusicProduction', NOW() + INTERVAL '2 hours'),
  ('linkedin', 'Excited to announce our new AI-powered mixing assistant. Learn more: [link]', NOW() + INTERVAL '4 hours')
ON CONFLICT DO NOTHING;

INSERT INTO blog_ideas (title, description, status)
VALUES
  ('How AI is Revolutionizing Music Production', 'Deep dive into AI-powered DAW features', 'approved'),
  ('Getting Started with DAWG AI', 'Beginner-friendly guide to using DAWG', 'pending')
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE agent_activities IS 'Logs all agent activities for monitoring and analytics';
COMMENT ON TABLE scheduled_social_posts IS 'Queue of scheduled social media posts';
COMMENT ON TABLE blog_ideas IS 'Content ideas for marketing blog';
COMMENT ON TABLE lead_scores IS 'Lead scoring and qualification data';
COMMENT ON TABLE support_tickets IS 'Customer support ticket tracking';
