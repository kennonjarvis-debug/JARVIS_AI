-- JARVIS Database Schema
-- PostgreSQL schema for conversation storage, messages, and participants

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('desktop', 'web', 'chatgpt', 'iphone')),
  context JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL CHECK (source IN ('desktop', 'web', 'chatgpt', 'iphone')),
  connected BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(conversation_id, source)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp
  ON messages(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_messages_source
  ON messages(source);

CREATE INDEX IF NOT EXISTS idx_participants_conversation
  ON participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_participants_source
  ON participants(source);

CREATE INDEX IF NOT EXISTS idx_conversations_updated
  ON conversations(updated_at DESC);

-- Full-text search index for message content
CREATE INDEX IF NOT EXISTS idx_messages_content_fts
  ON messages USING gin(to_tsvector('english', content));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW conversation_stats AS
SELECT
  c.id,
  c.created_at,
  c.updated_at,
  c.metadata,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT p.source) as participant_count,
  MAX(m.timestamp) as last_message_at
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN participants p ON c.id = p.conversation_id
GROUP BY c.id;

-- Comment on tables
COMMENT ON TABLE conversations IS 'Stores conversation metadata and timestamps';
COMMENT ON TABLE messages IS 'Stores all messages across all sources (desktop, web, chatgpt, iphone)';
COMMENT ON TABLE participants IS 'Tracks participant presence and connection status';
