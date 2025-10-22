-- ====================================================
-- Database Encryption Migration
-- Adds encrypted columns for sensitive data
-- ====================================================
--
-- WARNING: Do NOT run this migration directly!
-- This migration adds encrypted storage for sensitive data.
-- Follow the migration guide in docs/DATABASE_ENCRYPTION.md
--
-- Migration Version: 1.0
-- Date: 2025-10-17
-- Description: Add column-level encryption for API keys, OAuth tokens, and user emails
--
-- ====================================================

-- ====================================================
-- 1. API KEYS TABLE
-- ====================================================

-- Create table for encrypted API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Service/Integration identifier
  service_name VARCHAR(100) NOT NULL,
  key_name VARCHAR(100),

  -- Encrypted API key data
  encrypted_key TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  key_auth_tag TEXT NOT NULL,
  key_data_key TEXT NOT NULL,

  -- Search hash for lookups (one-way hash)
  key_hash VARCHAR(64) NOT NULL,

  -- Metadata (non-sensitive)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Key rotation tracking
  rotation_count INTEGER DEFAULT 0,
  last_rotated_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  last_used_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_service_key UNIQUE(user_id, service_name, key_name)
);

-- Indexes for api_keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_service ON api_keys(service_name);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON TABLE api_keys IS 'Encrypted storage for API keys and service credentials';
COMMENT ON COLUMN api_keys.encrypted_key IS 'AES-256-GCM encrypted API key';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash for searching without decryption';
COMMENT ON COLUMN api_keys.key_data_key IS 'KMS-encrypted data encryption key';

-- ====================================================
-- 2. OAUTH TOKENS TABLE
-- ====================================================

-- Create table for encrypted OAuth tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- OAuth provider
  provider VARCHAR(100) NOT NULL,
  provider_user_id VARCHAR(255),

  -- Encrypted access token
  encrypted_access_token TEXT NOT NULL,
  access_token_iv TEXT NOT NULL,
  access_token_auth_tag TEXT NOT NULL,
  access_token_data_key TEXT NOT NULL,

  -- Encrypted refresh token (optional)
  encrypted_refresh_token TEXT,
  refresh_token_iv TEXT,
  refresh_token_auth_tag TEXT,
  refresh_token_data_key TEXT,

  -- Token metadata (non-sensitive)
  scope TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,

  -- Status and rotation
  is_active BOOLEAN DEFAULT TRUE,
  rotation_count INTEGER DEFAULT 0,
  last_rotated_at TIMESTAMPTZ,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_provider_user UNIQUE(user_id, provider, provider_user_id)
);

-- Indexes for oauth_tokens
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX idx_oauth_tokens_active ON oauth_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(expires_at);

-- Comments
COMMENT ON TABLE oauth_tokens IS 'Encrypted storage for OAuth access and refresh tokens';
COMMENT ON COLUMN oauth_tokens.encrypted_access_token IS 'AES-256-GCM encrypted OAuth access token';
COMMENT ON COLUMN oauth_tokens.encrypted_refresh_token IS 'AES-256-GCM encrypted OAuth refresh token';

-- ====================================================
-- 3. ADD ENCRYPTED EMAIL TO USERS TABLE
-- ====================================================

-- Add encrypted email columns to existing users table
-- Note: This assumes users table exists from music-library.sql
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS encrypted_email TEXT,
  ADD COLUMN IF NOT EXISTS email_iv TEXT,
  ADD COLUMN IF NOT EXISTS email_auth_tag TEXT,
  ADD COLUMN IF NOT EXISTS email_data_key TEXT,
  ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);

-- Create index for email hash lookups
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);

-- Comments
COMMENT ON COLUMN users.encrypted_email IS 'AES-256-GCM encrypted email address';
COMMENT ON COLUMN users.email_hash IS 'SHA-256 hash for email lookups without decryption';

-- ====================================================
-- 4. BACKUP ENCRYPTION METADATA TABLE
-- ====================================================

-- Create table for tracking encrypted backups
CREATE TABLE IF NOT EXISTS encrypted_backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Backup identification
  backup_name VARCHAR(255) NOT NULL,
  backup_type VARCHAR(50) NOT NULL,

  -- Storage location
  storage_path TEXT NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'local',

  -- Encryption metadata
  encrypted_data TEXT NOT NULL,
  data_iv TEXT NOT NULL,
  data_auth_tag TEXT NOT NULL,
  data_data_key TEXT NOT NULL,

  -- Backup metadata
  original_size BIGINT,
  compressed_size BIGINT,
  compression_type VARCHAR(20),
  checksum VARCHAR(64),

  -- Backup info
  tables_included TEXT[],
  record_count BIGINT,

  -- Status
  status VARCHAR(50) DEFAULT 'completed',
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  expires_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_backup_name UNIQUE(backup_name)
);

-- Indexes for encrypted_backups
CREATE INDEX idx_encrypted_backups_type ON encrypted_backups(backup_type);
CREATE INDEX idx_encrypted_backups_created ON encrypted_backups(created_at DESC);
CREATE INDEX idx_encrypted_backups_status ON encrypted_backups(status);

-- Comments
COMMENT ON TABLE encrypted_backups IS 'Metadata for encrypted database backups';
COMMENT ON COLUMN encrypted_backups.encrypted_data IS 'AES-256-GCM encrypted backup data or manifest';

-- ====================================================
-- 5. ENCRYPTION AUDIT LOG
-- ====================================================

-- Create table for encryption operations audit trail
CREATE TABLE IF NOT EXISTS encryption_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Operation details
  operation_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,

  -- User/System context
  user_id UUID,
  system_context VARCHAR(100),
  ip_address INET,

  -- Encryption details
  encryption_version VARCHAR(20),
  key_rotation_id UUID,

  -- Result
  status VARCHAR(20) NOT NULL,
  error_message TEXT,

  -- Timing
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for encryption_audit_log
CREATE INDEX idx_encryption_audit_operation ON encryption_audit_log(operation_type);
CREATE INDEX idx_encryption_audit_table ON encryption_audit_log(table_name);
CREATE INDEX idx_encryption_audit_user ON encryption_audit_log(user_id);
CREATE INDEX idx_encryption_audit_created ON encryption_audit_log(created_at DESC);

-- Comments
COMMENT ON TABLE encryption_audit_log IS 'Audit trail for all encryption/decryption operations';

-- ====================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- ====================================================

-- Trigger for api_keys updated_at
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for oauth_tokens updated_at
DROP TRIGGER IF EXISTS update_oauth_tokens_updated_at ON oauth_tokens;
CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================================
-- 7. FUNCTIONS FOR ENCRYPTION MANAGEMENT
-- ====================================================

-- Function to mark API key as used
CREATE OR REPLACE FUNCTION mark_api_key_used(p_key_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql;

-- Function to rotate token
CREATE OR REPLACE FUNCTION mark_token_rotated(p_token_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE oauth_tokens
  SET
    rotation_count = rotation_count + 1,
    last_rotated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_token_id;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old tokens
CREATE OR REPLACE FUNCTION expire_old_tokens()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE oauth_tokens
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_encryption_audit_logs(p_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM encryption_audit_log
  WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- 8. VIEWS FOR MONITORING
-- ====================================================

-- View: Active API keys summary
CREATE OR REPLACE VIEW active_api_keys_summary AS
SELECT
  service_name,
  COUNT(*) as total_keys,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '7 days') as expiring_soon,
  COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '30 days') as recently_used,
  MAX(last_used_at) as last_activity
FROM api_keys
WHERE is_active = TRUE
GROUP BY service_name;

-- View: OAuth tokens summary
CREATE OR REPLACE VIEW oauth_tokens_summary AS
SELECT
  provider,
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_tokens,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '1 day') as expiring_soon,
  AVG(rotation_count) as avg_rotations,
  MAX(last_used_at) as last_activity
FROM oauth_tokens
GROUP BY provider;

-- View: Encryption audit summary
CREATE OR REPLACE VIEW encryption_audit_summary AS
SELECT
  operation_type,
  table_name,
  COUNT(*) as operation_count,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'error') as failed,
  AVG(duration_ms) as avg_duration_ms,
  MAX(created_at) as last_operation
FROM encryption_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY operation_type, table_name;

-- ====================================================
-- 9. GRANTS AND PERMISSIONS
-- ====================================================

-- Grant permissions to application user (uncomment and adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO jarvis_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_tokens TO jarvis_app;
-- GRANT UPDATE ON users TO jarvis_app;
-- GRANT SELECT, INSERT ON encrypted_backups TO jarvis_app;
-- GRANT INSERT ON encryption_audit_log TO jarvis_app;
-- GRANT SELECT ON active_api_keys_summary TO jarvis_app;
-- GRANT SELECT ON oauth_tokens_summary TO jarvis_app;
-- GRANT SELECT ON encryption_audit_summary TO jarvis_app;

-- ====================================================
-- 10. MIGRATION NOTES
-- ====================================================

-- After running this migration, you should:
-- 1. Configure KMS_KEY_ID in your environment
-- 2. Set ENCRYPTION_SEARCH_SALT for search hashes
-- 3. Migrate existing plaintext emails to encrypted format
-- 4. Set up key rotation schedule (recommended: every 90 days)
-- 5. Enable encryption audit logging in application
-- 6. Test backup and restore procedures
-- 7. Document key recovery procedures

-- For rollback, you can:
-- DROP TABLE IF EXISTS api_keys CASCADE;
-- DROP TABLE IF EXISTS oauth_tokens CASCADE;
-- DROP TABLE IF EXISTS encrypted_backups CASCADE;
-- DROP TABLE IF EXISTS encryption_audit_log CASCADE;
-- ALTER TABLE users DROP COLUMN IF EXISTS encrypted_email;
-- ALTER TABLE users DROP COLUMN IF EXISTS email_iv;
-- ALTER TABLE users DROP COLUMN IF EXISTS email_auth_tag;
-- ALTER TABLE users DROP COLUMN IF EXISTS email_data_key;
-- ALTER TABLE users DROP COLUMN IF EXISTS email_hash;
