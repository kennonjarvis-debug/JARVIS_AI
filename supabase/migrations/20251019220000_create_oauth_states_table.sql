-- Create table for OAuth state storage (fixes serverless state issue)
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  observatory_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Enable RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (OAuth states are temporary and don't contain sensitive data)
CREATE POLICY "Allow all operations on oauth_states"
  ON oauth_states
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired states (optional, can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM oauth_states
  WHERE expires_at < NOW();
END;
$$;
