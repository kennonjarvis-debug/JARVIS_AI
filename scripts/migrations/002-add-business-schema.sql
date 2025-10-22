-- =============================================================================
-- Business Assistant Schema Migration
--
-- Creates all database tables for business modules:
-- - Marketing Campaigns
-- - CRM Leads
-- - Support Tickets
-- - Business Metrics Snapshots
-- - Business Automations
-- - Automation Execution Logs
-- =============================================================================

-- Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'social', 'ads', 'content')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
  platform TEXT NOT NULL CHECK (platform IN ('mailchimp', 'hubspot', 'sendgrid', 'facebook', 'google', 'custom')),
  metrics JSONB NOT NULL DEFAULT '{}',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for marketing campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_platform ON marketing_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_start_date ON marketing_campaigns(start_date);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON marketing_campaigns(created_at);

-- =============================================================================

-- CRM Leads Table
CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  source TEXT NOT NULL,
  value DECIMAL(10, 2),
  custom_fields JSONB DEFAULT '{}',
  enrichment JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for CRM leads
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source ON crm_leads(source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON crm_leads(created_at);

-- =============================================================================

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'open', 'pending', 'resolved', 'closed')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  customer_id TEXT NOT NULL,
  assigned_to TEXT,
  tags TEXT[] DEFAULT '{}',
  sentiment JSONB DEFAULT '{}',
  ai_suggestions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tags ON support_tickets USING GIN(tags);

-- =============================================================================

-- Business Metrics Snapshots Table
CREATE TABLE IF NOT EXISTS business_metrics_snapshots (
  id TEXT PRIMARY KEY,
  timeframe JSONB NOT NULL,
  operations JSONB NOT NULL,
  marketing JSONB NOT NULL,
  sales JSONB NOT NULL,
  support JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for business metrics
CREATE INDEX IF NOT EXISTS idx_business_metrics_created_at ON business_metrics_snapshots(created_at);

-- =============================================================================

-- Business Automations Table
CREATE TABLE IF NOT EXISTS business_automations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  triggers JSONB NOT NULL,
  conditions JSONB,
  actions JSONB NOT NULL,
  schedule JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for business automations
CREATE INDEX IF NOT EXISTS idx_business_automations_enabled ON business_automations(enabled);
CREATE INDEX IF NOT EXISTS idx_business_automations_created_at ON business_automations(created_at);

-- =============================================================================

-- Automation Execution Logs Table
CREATE TABLE IF NOT EXISTS automation_execution_logs (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL REFERENCES business_automations(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  duration INTEGER NOT NULL,
  error TEXT,
  result JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for automation logs
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation_id ON automation_execution_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed_at ON automation_execution_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_success ON automation_execution_logs(success);

-- =============================================================================

-- Update Triggers for updated_at columns
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to tables with updated_at column
CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_automations_updated_at
  BEFORE UPDATE ON business_automations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================

-- Sample Data (Optional - for testing)
-- =============================================================================

-- Uncomment to insert sample data for testing:

/*
-- Sample Marketing Campaign
INSERT INTO marketing_campaigns (id, name, type, status, platform, metrics, start_date) VALUES
  ('campaign-1', 'Summer Sale Email Campaign', 'email', 'active', 'mailchimp',
   '{"sent": 10000, "delivered": 9800, "opened": 2940, "clicked": 588}', NOW());

-- Sample CRM Lead
INSERT INTO crm_leads (id, email, first_name, last_name, company, status, source, value) VALUES
  ('lead-1', 'john.doe@example.com', 'John', 'Doe', 'Acme Corp', 'qualified', 'website', 5000.00);

-- Sample Support Ticket
INSERT INTO support_tickets (id, external_id, subject, description, status, priority, customer_id, tags) VALUES
  ('ticket-1', 'ext-12345', 'Login Issue', 'Cannot log into account', 'open', 'high', 'customer-1', ARRAY['login', 'urgent']);

-- Sample Automation
INSERT INTO business_automations (id, name, description, enabled, triggers, actions) VALUES
  ('auto-1', 'Lead Enrichment', 'Automatically enrich new leads', TRUE,
   '[{"type": "event", "event": "lead_created"}]',
   '[{"type": "ai_analyze", "config": {"model": "claude-3-sonnet"}}]');
*/

-- =============================================================================
-- Migration Complete
-- =============================================================================

-- Display summary
DO $$
BEGIN
  RAISE NOTICE '✅ Business Assistant Schema Migration Complete';
  RAISE NOTICE '';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - marketing_campaigns';
  RAISE NOTICE '  - crm_leads';
  RAISE NOTICE '  - support_tickets';
  RAISE NOTICE '  - business_metrics_snapshots';
  RAISE NOTICE '  - business_automations';
  RAISE NOTICE '  - automation_execution_logs';
  RAISE NOTICE '';
  RAISE NOTICE 'Created indexes: 15 total';
  RAISE NOTICE 'Created triggers: 4 for updated_at columns';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Verify tables: SELECT tablename FROM pg_tables WHERE schemaname = ''public'' AND tablename LIKE ''%marketing%'' OR tablename LIKE ''%crm%'' OR tablename LIKE ''%support%'' OR tablename LIKE ''%business%'';';
  RAISE NOTICE '  2. Check indexes: SELECT indexname FROM pg_indexes WHERE tablename IN (''marketing_campaigns'', ''crm_leads'', ''support_tickets'');';
  RAISE NOTICE '  3. Start Business Assistant: createBusinessAssistant(config)';
END $$;
