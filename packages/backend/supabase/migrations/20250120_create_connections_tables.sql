-- Migration: Create connections tables for integration management
-- Date: 2025-01-20
-- Description: Tracks all user connections (Gmail, Calendar, CRM, Database, etc.)

-- =============================================================================
-- CONNECTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,

  -- Connection type and provider
  type TEXT NOT NULL, -- 'gmail', 'calendar', 'crm', 'database', 'imessage', 'notes', 'voicememos'
  provider TEXT NOT NULL, -- 'google', 'hubspot', 'salesforce', 'postgresql', 'apple', etc.

  -- Connection status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disconnected', 'error', 'pending'

  -- OAuth tokens (encrypted at application level before storage)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- Connection-specific configuration
  config JSONB DEFAULT '{}'::jsonb,
  -- Examples:
  -- For Gmail: { "email": "user@example.com", "labels": ["INBOX", "Support"] }
  -- For Database: { "host": "db.example.com", "port": 5432, "database": "prod" }
  -- For CRM: { "accountId": "123", "apiVersion": "v3" }

  -- Sync metadata
  last_synced_at TIMESTAMP,
  sync_frequency TEXT DEFAULT 'realtime', -- 'realtime', '15min', '1hour', 'manual'

  -- Statistics
  items_synced INTEGER DEFAULT 0,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connections_observatory_id ON connections(observatory_id);
CREATE INDEX IF NOT EXISTS idx_connections_type ON connections(type);
CREATE INDEX IF NOT EXISTS idx_connections_provider ON connections(provider);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_type_provider ON connections(type, provider);
CREATE INDEX IF NOT EXISTS idx_connections_observatory_status ON connections(observatory_id, status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connections_updated_at_trigger
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_connections_updated_at();

-- =============================================================================
-- CONNECTION SETTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS connection_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE NOT NULL,

  -- Sync settings
  labels_to_monitor TEXT[], -- For Gmail: ['INBOX', 'Support', 'Sales']
  folders_to_monitor TEXT[], -- For Notes: ['Work', 'Projects']
  tables_to_monitor TEXT[], -- For Database: ['customers', 'orders']
  calendars_to_monitor TEXT[], -- For Calendar: ['primary', 'work']

  -- AI agent settings
  auto_respond_types TEXT[], -- ['support', 'sales', 'marketing']
  require_approval_for TEXT[], -- ['all', 'low_confidence']

  -- Data extraction settings
  extract_signatures BOOLEAN DEFAULT true,
  extract_contacts BOOLEAN DEFAULT true,
  extract_metadata BOOLEAN DEFAULT true,

  -- Custom rules (JSONB for flexibility)
  custom_rules JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one settings record per connection
  UNIQUE(connection_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connection_settings_connection_id ON connection_settings(connection_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_connection_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connection_settings_updated_at_trigger
  BEFORE UPDATE ON connection_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_connection_settings_updated_at();

-- =============================================================================
-- BUSINESS INFO EXTRACTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS business_info_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,

  -- Extracted field
  field_name TEXT NOT NULL, -- 'email', 'website', 'phone', 'address', 'team_size', etc.
  extracted_value TEXT NOT NULL,
  confidence FLOAT, -- 0-1 confidence score
  source_type TEXT, -- 'email_signature', 'calendar_location', 'crm_data', 'database_query'

  -- Application status
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP,
  applied_by UUID REFERENCES "User"(id),

  -- User can dismiss suggestions
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP,
  dismissed_by UUID REFERENCES "User"(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_info_extractions_observatory_id ON business_info_extractions(observatory_id);
CREATE INDEX IF NOT EXISTS idx_business_info_extractions_connection_id ON business_info_extractions(connection_id);
CREATE INDEX IF NOT EXISTS idx_business_info_extractions_applied ON business_info_extractions(applied);
CREATE INDEX IF NOT EXISTS idx_business_info_extractions_dismissed ON business_info_extractions(dismissed);
CREATE INDEX IF NOT EXISTS idx_business_info_extractions_field_name ON business_info_extractions(field_name);

-- Composite index for pending extractions
CREATE INDEX IF NOT EXISTS idx_business_info_extractions_pending
  ON business_info_extractions(observatory_id, applied, dismissed)
  WHERE applied = false AND dismissed = false;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_info_extractions ENABLE ROW LEVEL SECURITY;

-- Connections policies
CREATE POLICY connections_select_policy ON connections
  FOR SELECT USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY connections_insert_policy ON connections
  FOR INSERT WITH CHECK (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY connections_update_policy ON connections
  FOR UPDATE USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY connections_delete_policy ON connections
  FOR DELETE USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Connection settings policies
CREATE POLICY connection_settings_select_policy ON connection_settings
  FOR SELECT USING (
    connection_id IN (
      SELECT c.id FROM connections c
      JOIN observatory_members om ON c.observatory_id = om.observatory_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY connection_settings_modify_policy ON connection_settings
  FOR ALL USING (
    connection_id IN (
      SELECT c.id FROM connections c
      JOIN observatory_members om ON c.observatory_id = om.observatory_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

-- Business info extractions policies
CREATE POLICY business_info_extractions_select_policy ON business_info_extractions
  FOR SELECT USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY business_info_extractions_modify_policy ON business_info_extractions
  FOR UPDATE USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Active connections view
CREATE OR REPLACE VIEW active_connections AS
SELECT
  c.*,
  cs.auto_respond_types,
  cs.require_approval_for,
  o.name as observatory_name
FROM connections c
LEFT JOIN connection_settings cs ON c.id = cs.connection_id
JOIN observatories o ON c.observatory_id = o.id
WHERE c.status = 'active';

-- Pending business info extractions view
CREATE OR REPLACE VIEW pending_business_info_extractions AS
SELECT
  bie.*,
  o.name as observatory_name,
  c.type as connection_type,
  c.provider as connection_provider
FROM business_info_extractions bie
JOIN observatories o ON bie.observatory_id = o.id
LEFT JOIN connections c ON bie.connection_id = c.id
WHERE bie.applied = false AND bie.dismissed = false
ORDER BY bie.confidence DESC, bie.created_at DESC;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE connections IS 'Stores all integration connections (Gmail, Calendar, CRM, Database, etc.)';
COMMENT ON TABLE connection_settings IS 'Configuration and preferences for each connection';
COMMENT ON TABLE business_info_extractions IS 'Auto-extracted business information from connections';

COMMENT ON COLUMN connections.type IS 'Integration type: gmail, calendar, crm, database, imessage, notes, voicememos';
COMMENT ON COLUMN connections.provider IS 'Provider: google, hubspot, salesforce, postgresql, apple, etc.';
COMMENT ON COLUMN connections.status IS 'Connection status: active, disconnected, error, pending';
COMMENT ON COLUMN connections.config IS 'Provider-specific configuration (email, database credentials, etc.)';

COMMENT ON COLUMN business_info_extractions.field_name IS 'Business field: email, website, phone, address, team_size, etc.';
COMMENT ON COLUMN business_info_extractions.confidence IS 'Confidence score 0-1 from extraction algorithm';
COMMENT ON COLUMN business_info_extractions.source_type IS 'Source: email_signature, calendar_location, crm_data, database_query';
