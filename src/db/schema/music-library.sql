-- ====================================================
-- Music Library Database Schema
-- Complete schema for storing songs, tags, and folders
-- ====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg

vector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ====================================================
-- USERS TABLE
-- ====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================
-- SONGS TABLE
-- ====================================================
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Info
  title VARCHAR(500) NOT NULL,
  artist VARCHAR(255),
  album VARCHAR(255),

  -- File Paths
  audio_path TEXT NOT NULL,
  lyrics_path TEXT,
  cover_art_path TEXT,
  waveform_path TEXT,

  -- Musical Intent (JSONB for flexibility)
  musical_intent JSONB NOT NULL,

  -- Tags (JSONB)
  tags JSONB NOT NULL,

  -- Lyrics
  lyrics TEXT,

  -- Audio Metadata
  duration INTEGER, -- seconds
  file_size BIGINT, -- bytes
  format VARCHAR(20), -- mp3, wav, flac
  sample_rate INTEGER,
  bitrate INTEGER,

  -- Source Info
  source_type VARCHAR(50) NOT NULL, -- voice-memo, text-note, imported, generated
  source_upload_id VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_played_at TIMESTAMP,

  -- Stats
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  skip_count INTEGER DEFAULT 0,

  -- Vector embedding for semantic search (1536 dimensions for OpenAI)
  embedding vector(1536)
);

-- Indexes for songs
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX idx_songs_play_count ON songs(play_count DESC);
CREATE INDEX idx_songs_tags ON songs USING GIN (tags);
CREATE INDEX idx_songs_musical_intent ON songs USING GIN (musical_intent);
CREATE INDEX idx_songs_embedding ON songs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search index
CREATE INDEX idx_songs_search ON songs USING GIN (
  to_tsvector('english',
    COALESCE(title, '') || ' ' ||
    COALESCE(artist, '') || ' ' ||
    COALESCE(lyrics, '')
  )
);

-- ====================================================
-- FOLDERS TABLE (Smart Playlists)
-- ====================================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- genre, mood, activity, theme, era, energy, manual, smart

  -- Filter criteria (JSONB)
  filter JSONB NOT NULL,

  auto_update BOOLEAN DEFAULT TRUE,

  -- Metadata
  song_count INTEGER DEFAULT 0,
  total_duration INTEGER, -- seconds
  cover_image TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for folders
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_type ON folders(type);

-- ====================================================
-- SONG_FOLDERS TABLE (Many-to-Many)
-- ====================================================
CREATE TABLE IF NOT EXISTS song_folders (
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (song_id, folder_id)
);

-- Indexes
CREATE INDEX idx_song_folders_song_id ON song_folders(song_id);
CREATE INDEX idx_song_folders_folder_id ON song_folders(folder_id);

-- ====================================================
-- SOURCE_MATERIALS TABLE
-- ====================================================
CREATE TABLE IF NOT EXISTS source_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- voice-memo, note, image
  original_url TEXT NOT NULL,
  transcription TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_source_materials_song_id ON source_materials(song_id);

-- ====================================================
-- PLAYLISTS TABLE (User-created playlists)
-- ====================================================
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  cover_image TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================
-- PLAYLIST_SONGS TABLE (Many-to-Many with ordering)
-- ====================================================
CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (playlist_id, song_id)
);

-- Indexes
CREATE INDEX idx_playlist_songs_playlist_id ON playlist_songs(playlist_id, position);
CREATE INDEX idx_playlist_songs_song_id ON playlist_songs(song_id);

-- ====================================================
-- LISTENING_HISTORY TABLE
-- ====================================================
CREATE TABLE IF NOT EXISTS listening_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

  played_at TIMESTAMP DEFAULT NOW(),
  play_duration INTEGER, -- How long they listened (seconds)
  completed BOOLEAN DEFAULT FALSE, -- Did they finish the song?

  -- Context
  device VARCHAR(100),
  location VARCHAR(100)
);

-- Indexes
CREATE INDEX idx_listening_history_user_id ON listening_history(user_id, played_at DESC);
CREATE INDEX idx_listening_history_song_id ON listening_history(song_id);

-- ====================================================
-- VIEWS
-- ====================================================

-- View: Song stats with folder count
CREATE OR REPLACE VIEW song_stats AS
SELECT
  s.id,
  s.user_id,
  s.title,
  s.artist,
  s.play_count,
  s.like_count,
  COUNT(DISTINCT sf.folder_id) as folder_count,
  COUNT(DISTINCT ps.playlist_id) as playlist_count
FROM songs s
LEFT JOIN song_folders sf ON s.id = sf.song_id
LEFT JOIN playlist_songs ps ON s.id = ps.song_id
GROUP BY s.id, s.user_id, s.title, s.artist, s.play_count, s.like_count;

-- View: Popular songs (most played)
CREATE OR REPLACE VIEW popular_songs AS
SELECT
  s.*,
  COUNT(lh.id) as total_plays,
  COUNT(DISTINCT lh.user_id) as unique_listeners
FROM songs s
LEFT JOIN listening_history lh ON s.id = lh.song_id
GROUP BY s.id
ORDER BY total_plays DESC;

-- ====================================================
-- FUNCTIONS
-- ====================================================

-- Function: Update folder song count
CREATE OR REPLACE FUNCTION update_folder_song_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE folders
  SET song_count = (
    SELECT COUNT(*)
    FROM song_folders
    WHERE folder_id = NEW.folder_id
  ),
  updated_at = NOW()
  WHERE id = NEW.folder_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update folder count on song add/remove
CREATE TRIGGER trigger_update_folder_song_count
AFTER INSERT OR DELETE ON song_folders
FOR EACH ROW
EXECUTE FUNCTION update_folder_song_count();

-- Function: Update song play count
CREATE OR REPLACE FUNCTION update_song_play_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE songs
  SET play_count = play_count + 1,
      last_played_at = NOW()
  WHERE id = NEW.song_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update play count on new listen
CREATE TRIGGER trigger_update_song_play_count
AFTER INSERT ON listening_history
FOR EACH ROW
EXECUTE FUNCTION update_song_play_count();

-- Function: Search songs by tags
CREATE OR REPLACE FUNCTION search_songs_by_tags(
  p_user_id UUID,
  p_genres TEXT[] DEFAULT NULL,
  p_moods TEXT[] DEFAULT NULL,
  p_themes TEXT[] DEFAULT NULL,
  p_min_energy INTEGER DEFAULT NULL,
  p_max_energy INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  artist VARCHAR,
  tags JSONB,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.title, s.artist, s.tags, s.created_at
  FROM songs s
  WHERE s.user_id = p_user_id
    AND (p_genres IS NULL OR s.tags->>'primaryGenre' = ANY(p_genres))
    AND (p_moods IS NULL OR s.tags->>'primaryMood' = ANY(p_moods))
    AND (p_themes IS NULL OR s.tags->'themes' ?| p_themes)
    AND (p_min_energy IS NULL OR (s.tags->>'energy')::INTEGER >= p_min_energy)
    AND (p_max_energy IS NULL OR (s.tags->>'energy')::INTEGER <= p_max_energy)
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- SEED DATA (Default Folders)
-- ====================================================

-- Insert default folders for each user (would be done via application)
-- Example:
-- INSERT INTO folders (user_id, name, type, filter, auto_update) VALUES
-- ('{user_id}', 'Hip-Hop', 'genre', '{"genres": ["hip-hop"]}', TRUE);

-- ====================================================
-- GRANTS (Adjust based on your setup)
-- ====================================================

-- Grant permissions to application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jarvis_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jarvis_app;

-- ====================================================
-- COMMENTS
-- ====================================================

COMMENT ON TABLE songs IS 'Main songs table with metadata, tags, and embeddings';
COMMENT ON TABLE folders IS 'Smart folders and playlists with auto-update capability';
COMMENT ON TABLE song_folders IS 'Many-to-many relationship between songs and folders';
COMMENT ON TABLE listening_history IS 'Complete listening history for analytics';
COMMENT ON COLUMN songs.embedding IS 'Vector embedding for semantic search (OpenAI embeddings)';
COMMENT ON COLUMN songs.musical_intent IS 'Complete musical intent analysis from voice memo';
COMMENT ON COLUMN songs.tags IS 'Comprehensive tags for organization and discovery';
