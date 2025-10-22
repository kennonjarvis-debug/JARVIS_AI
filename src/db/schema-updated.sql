-- JARVIS Database Schema (Updated for TEXT IDs)
-- PostgreSQL schema for conversation storage, messages, and participants

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables and views
DROP VIEW IF EXISTS conversation_stats CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Conversations table (using TEXT for IDs to support custom conversation IDs)
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('desktop', 'web', 'chatgpt', 'iphone')),
  context JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL CHECK (source IN ('desktop', 'web', 'chatgpt', 'iphone')),
  connected BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(conversation_id, source)
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation
  ON messages(conversation_id);

CREATE INDEX idx_messages_timestamp
  ON messages(timestamp DESC);

CREATE INDEX idx_messages_source
  ON messages(source);

CREATE INDEX idx_participants_conversation
  ON participants(conversation_id);

CREATE INDEX idx_participants_source
  ON participants(source);

CREATE INDEX idx_conversations_updated
  ON conversations(updated_at DESC);

-- Full-text search index for message content
CREATE INDEX idx_messages_content_fts
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
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW conversation_stats AS
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
