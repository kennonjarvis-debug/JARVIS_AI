CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  agent TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'success', 'warning', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_timestamp_idx ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS events_type_idx ON events(type);
CREATE INDEX IF NOT EXISTS events_agent_idx ON events(agent);
CREATE INDEX IF NOT EXISTS events_severity_idx ON events(severity);

CREATE TABLE IF NOT EXISTS metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  module TEXT NOT NULL CHECK (module IN ('marketing', 'sales', 'operations', 'support')),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, module, metric_name)
);

CREATE INDEX IF NOT EXISTS metrics_daily_date_idx ON metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS metrics_daily_module_idx ON metrics_daily(module);

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  task_description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  result JSONB DEFAULT '{}',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_runs_started_idx ON agent_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_agent_idx ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS agent_runs_status_idx ON agent_runs(status);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by TEXT NOT NULL,
  responded_at TIMESTAMPTZ,
  responded_by TEXT,
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals(status);
CREATE INDEX IF NOT EXISTS approvals_requested_idx ON approvals(requested_at DESC);
CREATE INDEX IF NOT EXISTS approvals_agent_idx ON approvals(agent_id);

CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('marketing', 'sales', 'operations', 'support')),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(module, metric_name)
);

CREATE INDEX IF NOT EXISTS business_metrics_module_idx ON business_metrics(module);

CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'degraded', 'offline')),
  latency_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_health_component_idx ON system_health(component);
CREATE INDEX IF NOT EXISTS system_health_checked_idx ON system_health(checked_at DESC);

CREATE TABLE IF NOT EXISTS dawg_ai_modules (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('not-started', 'in-progress', 'blocked', 'complete')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_update DATE,
  issues INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO dawg_ai_modules (id, name, status, progress, last_update, issues) VALUES
  (1, 'Design System', 'complete', 100, '2025-10-15', 0),
  (2, 'Audio Engine', 'complete', 100, '2025-10-15', 0),
  (3, 'Track Manager', 'complete', 100, '2025-10-15', 0),
  (4, 'MIDI Editor', 'complete', 100, '2025-10-15', 0),
  (5, 'Effects Processor', 'complete', 100, '2025-10-15', 0),
  (6, 'Voice Interface', 'complete', 100, '2025-10-15', 0),
  (7, 'AI Beat Generator', 'not-started', 0, NULL, 0),
  (8, 'AI Vocal Coach', 'not-started', 0, NULL, 0),
  (9, 'AI Mixing', 'not-started', 0, NULL, 0),
  (10, 'Backend/Storage', 'complete', 100, '2025-10-15', 0),
  (11, 'Integration', 'not-started', 0, NULL, 0)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE VIEW recent_events AS
SELECT * FROM events
ORDER BY timestamp DESC
LIMIT 100;

CREATE OR REPLACE VIEW pending_approvals AS
SELECT * FROM approvals
WHERE status = 'pending'
ORDER BY requested_at DESC;

CREATE OR REPLACE VIEW agent_performance AS
SELECT
  agent_id,
  agent_name,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_runs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
  ROUND(AVG(duration_ms), 2) as avg_duration_ms,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*), 2) as success_rate
FROM agent_runs
WHERE started_at >= NOW() - INTERVAL '24 hours'
GROUP BY agent_id, agent_name;

CREATE OR REPLACE VIEW dawg_ai_progress AS
SELECT
  COUNT(*) as total_modules,
  COUNT(*) FILTER (WHERE status = 'complete') as completed_modules,
  COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress_modules,
  ROUND(AVG(progress), 2) as overall_progress
FROM dawg_ai_modules;

CREATE OR REPLACE FUNCTION log_event(
  p_type TEXT,
  p_agent TEXT,
  p_description TEXT,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO events (type, agent, description, severity, metadata)
  VALUES (p_type, p_agent, p_description, p_severity, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_business_metric(
  p_module TEXT,
  p_metric_name TEXT,
  p_metric_value NUMERIC,
  p_unit TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO business_metrics (module, metric_name, metric_value, unit, metadata, last_updated)
  VALUES (p_module, p_metric_name, p_metric_value, p_unit, p_metadata, NOW())
  ON CONFLICT (module, metric_name)
  DO UPDATE SET
    metric_value = EXCLUDED.metric_value,
    unit = EXCLUDED.unit,
    metadata = EXCLUDED.metadata,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

SELECT log_event('agent.task.completed', 'Marketing Agent', 'Posted to Twitter', 'info', '{"platform": "twitter"}'::jsonb);
SELECT log_event('agent.task.completed', 'Sales Agent', 'Qualified 3 new leads', 'info', '{"leads": 3}'::jsonb);
SELECT log_event('agent.approval.required', 'Sales Agent', 'Approval required for bulk email', 'warning', '{"recipients": 1500}'::jsonb);

SELECT update_business_metric('marketing', 'posts_today', 8, 'count');
SELECT update_business_metric('marketing', 'engagement_rate', 12.4, 'percentage');
SELECT update_business_metric('sales', 'leads_today', 12, 'count');
SELECT update_business_metric('sales', 'conversion_rate', 4.2, 'percentage');
SELECT update_business_metric('operations', 'tasks_completed', 127, 'count');
SELECT update_business_metric('support', 'tickets_today', 15, 'count');
