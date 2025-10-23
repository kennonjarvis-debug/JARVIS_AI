-- DAWG AI Database Schema
-- PostgreSQL Schema for Cloud Storage & Backend (Module 10)
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Note: Users are managed by Supabase Auth
-- This references auth.users table from Supabase

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,

  -- Constraints
  CONSTRAINT projects_name_not_empty CHECK (char_length(name) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token) WHERE share_token IS NOT NULL;

-- =====================================================
-- PROJECT VERSIONS TABLE
-- =====================================================
-- For undo/redo and version history
CREATE TABLE IF NOT EXISTS project_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT project_versions_unique UNIQUE(project_id, version_number),
  CONSTRAINT project_versions_number_positive CHECK (version_number > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_created_at ON project_versions(created_at DESC);

-- =====================================================
-- FILES TABLE
-- =====================================================
-- Track uploaded files (audio samples, exports, etc.)
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT files_filename_not_empty CHECK (char_length(filename) > 0),
  CONSTRAINT files_size_positive CHECK (size_bytes > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

-- =====================================================
-- COLLABORATORS TABLE
-- =====================================================
-- For project collaboration
CREATE TABLE IF NOT EXISTS collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT collaborators_unique UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collaborators_project_id ON collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON collaborators(user_id);

-- =====================================================
-- PROJECT TEMPLATES TABLE
-- =====================================================
-- Predefined project templates
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  category TEXT NOT NULL,
  is_official BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT project_templates_name_not_empty CHECK (char_length(name) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_official ON project_templates(is_official) WHERE is_official = TRUE;

-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================
-- Track user activity for analytics
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);

-- =====================================================
-- BEATS TABLE
-- =====================================================
-- Stores pre-generated and user-generated beats for instant search/audition
CREATE TABLE IF NOT EXISTS beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,

  -- Style taxonomy (NO artist names)
  style TEXT NOT NULL, -- e.g. 'toronto-ambient-trap', 'drill-aggressive'
  mood JSONB NOT NULL DEFAULT '[]', -- e.g. ["moody", "dark", "atmospheric"]
  tempo INT NOT NULL CHECK (tempo >= 60 AND tempo <= 200),
  drums TEXT, -- e.g. 'sparse-808-crisp-clap'
  melody TEXT, -- e.g. 'pad-minor-ambient'
  texture TEXT, -- e.g. 'reverb-heavy'

  -- Audio/MIDI assets
  preview_url TEXT NOT NULL, -- Pre-rendered audio preview (WAV/MP3)
  midi_data JSONB, -- Generated MIDI patterns {kick: [], snare: [], hihat: []}
  asset_url TEXT, -- Full stems/project file (optional)

  -- Metadata
  bars INT DEFAULT 4,
  key TEXT DEFAULT 'Amin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Analytics
  play_count INT DEFAULT 0,
  use_count INT DEFAULT 0 -- How many times added to projects
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_beats_style ON beats(style);
CREATE INDEX IF NOT EXISTS idx_beats_tempo ON beats(tempo);
CREATE INDEX IF NOT EXISTS idx_beats_mood ON beats USING GIN (mood);
CREATE INDEX IF NOT EXISTS idx_beats_play_count ON beats(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_beats_created ON beats(created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_beats_search ON beats USING GIN (
  to_tsvector('english', title || ' ' || style || ' ' || COALESCE(drums, '') || ' ' || COALESCE(melody, ''))
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Projects: Users can only see their own projects or shared projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared projects"
  ON projects FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Files: Users can only access their own files
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'base64');
  token := replace(token, '/', '_');
  token := replace(token, '+', '-');
  token := replace(token, '=', '');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to create project version snapshot
CREATE OR REPLACE FUNCTION create_project_version(
  p_project_id UUID,
  p_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM project_versions
  WHERE project_id = p_project_id;

  -- Insert new version
  INSERT INTO project_versions (project_id, version_number, data)
  VALUES (p_project_id, v_version_number, p_data)
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Beat search function
CREATE OR REPLACE FUNCTION search_beats(
  p_style TEXT DEFAULT NULL,
  p_tempo_min INT DEFAULT 60,
  p_tempo_max INT DEFAULT 200,
  p_mood TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  style TEXT,
  mood JSONB,
  tempo INT,
  preview_url TEXT,
  play_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.style,
    b.mood,
    b.tempo,
    b.preview_url,
    b.play_count
  FROM beats b
  WHERE
    (p_style IS NULL OR b.style = p_style)
    AND b.tempo >= p_tempo_min
    AND b.tempo <= p_tempo_max
    AND (p_mood IS NULL OR b.mood @> to_jsonb(ARRAY[p_mood]))
  ORDER BY b.play_count DESC, b.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Increment beat play count
CREATE OR REPLACE FUNCTION increment_beat_play_count(p_beat_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE beats
  SET play_count = play_count + 1
  WHERE id = p_beat_id;
END;
$$ LANGUAGE plpgsql;

-- Increment beat use count
CREATE OR REPLACE FUNCTION increment_beat_use_count(p_beat_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE beats
  SET use_count = use_count + 1
  WHERE id = p_beat_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA (Optional - for development)
-- =====================================================

-- Insert default project templates
INSERT INTO project_templates (name, description, data, category, is_official)
VALUES
  (
    'Empty Project',
    'Start from scratch with an empty project',
    '{"tracks": [], "tempo": 120, "timeSignature": [4, 4]}',
    'basic',
    TRUE
  ),
  (
    'Hip Hop Beat',
    'Hip hop project with drums, bass, and melody tracks',
    '{"tracks": [{"type": "midi", "name": "Drums"}, {"type": "midi", "name": "Bass"}, {"type": "audio", "name": "Melody"}], "tempo": 85, "timeSignature": [4, 4]}',
    'genre',
    TRUE
  ),
  (
    'EDM Track',
    'Electronic music project with synths and drums',
    '{"tracks": [{"type": "midi", "name": "Kick"}, {"type": "midi", "name": "Bass"}, {"type": "midi", "name": "Lead"}], "tempo": 128, "timeSignature": [4, 4]}',
    'genre',
    TRUE
  ),
  (
    'Vocal Recording',
    'Project optimized for vocal recording and processing',
    '{"tracks": [{"type": "audio", "name": "Lead Vocal"}, {"type": "audio", "name": "Harmony"}, {"type": "audio", "name": "Backing"}], "tempo": 120, "timeSignature": [4, 4]}',
    'recording',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- Insert sample beats
INSERT INTO beats (title, style, mood, tempo, drums, melody, texture, preview_url, bars) VALUES
  ('Toronto Vibes 1', 'toronto-ambient-trap', '["moody","dark","atmospheric"]', 140, 'sparse-808-crisp-clap', 'pad-minor-ambient', 'reverb-heavy', '/beats/previews/toronto-1.wav', 4),
  ('Toronto Vibes 2', 'toronto-ambient-trap', '["moody","dark","atmospheric"]', 138, 'sparse-808-crisp-clap', 'pad-minor-ambient', 'reverb-heavy', '/beats/previews/toronto-2.wav', 4),
  ('Toronto Vibes 3', 'toronto-ambient-trap', '["moody","dark","atmospheric"]', 142, 'sparse-808-crisp-clap', 'pad-minor-ambient', 'reverb-heavy', '/beats/previews/toronto-3.wav', 4),
  ('Drill Heat 1', 'drill-aggressive', '["aggressive","dark","menacing"]', 145, 'sliding-808-hard-snare', 'synth-ominous-bass-heavy', 'clean-hard-hitting', '/beats/previews/drill-1.wav', 4),
  ('Drill Heat 2', 'drill-aggressive', '["aggressive","dark","menacing"]', 148, 'sliding-808-hard-snare', 'synth-ominous-bass-heavy', 'clean-hard-hitting', '/beats/previews/drill-2.wav', 4),
  ('Lofi Study 1', 'lofi-chill', '["chill","nostalgic","warm"]', 75, 'dusty-vinyl-soft-kick', 'piano-jazzy-rhodes', 'vinyl-crackle-tape-saturation', '/beats/previews/lofi-1.wav', 4),
  ('Lofi Study 2', 'lofi-chill', '["chill","nostalgic","warm"]', 82, 'dusty-vinyl-soft-kick', 'piano-jazzy-rhodes', 'vinyl-crackle-tape-saturation', '/beats/previews/lofi-2.wav', 4),
  ('Hyperpop Chaos 1', 'hyperpop-glitch', '["chaotic","energetic","futuristic"]', 165, 'digital-glitch-snare', 'synth-distorted-pitched', 'bitcrush-glitch-stereo', '/beats/previews/hyperpop-1.wav', 4),
  ('Deep House Groove 1', 'deep-house-groovy', '["groovy","warm","hypnotic"]', 122, 'four-on-floor-shaker', 'rhodes-pad-bassline', 'warm-analog-subtle-reverb', '/beats/previews/house-1.wav', 4),
  ('Deep House Groove 2', 'deep-house-groovy', '["groovy","warm","hypnotic"]', 124, 'four-on-floor-shaker', 'rhodes-pad-bassline', 'warm-analog-subtle-reverb', '/beats/previews/house-2.wav', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE projects IS 'Main projects table - stores user DAW projects';
COMMENT ON TABLE project_versions IS 'Version history for projects (undo/redo)';
COMMENT ON TABLE files IS 'Uploaded files (audio samples, exports)';
COMMENT ON TABLE collaborators IS 'Project collaboration permissions';
COMMENT ON TABLE project_templates IS 'Predefined project templates';
COMMENT ON TABLE activity_log IS 'User activity tracking for analytics';
COMMENT ON TABLE beats IS 'Pre-generated and user-generated beats for instant search and audition';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
