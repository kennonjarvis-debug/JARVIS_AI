-- ============================================================================
-- JARVIS Dashboard Overhaul - Phase 1 Migration
-- RLS Policies and Performance Indexes
-- ============================================================================
-- Created: 2025-10-19
-- Purpose: Ensure Row Level Security (RLS) is properly configured and add
--          performance indexes for frequently queried columns
--
-- This migration is idempotent and safe to run multiple times
-- ============================================================================

-- ============================================================================
-- OBSERVATORIES TABLE - RLS POLICIES
-- ============================================================================

-- Enable RLS if not already enabled (idempotent)
ALTER TABLE observatories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to ensure clean recreation
DROP POLICY IF EXISTS "Users can view own observatories" ON observatories;
DROP POLICY IF EXISTS "Users can create own observatories" ON observatories;
DROP POLICY IF EXISTS "Users can update own observatories" ON observatories;
DROP POLICY IF EXISTS "Users can delete own observatories" ON observatories;

-- Policy 1: SELECT - Users can only view their own observatories
-- Purpose: Ensures users can only see observatories where they are the owner
-- Security: Compares authenticated user ID (auth.uid()) with owner_id column
CREATE POLICY "Users can view own observatories"
  ON observatories FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy 2: INSERT - Users can only create observatories for themselves
-- Purpose: Prevents users from creating observatories owned by others
-- Security: WITH CHECK ensures the owner_id matches the authenticated user
CREATE POLICY "Users can create own observatories"
  ON observatories FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy 3: UPDATE - Users can only update their own observatories
-- Purpose: Prevents users from modifying other users' observatories
-- Security: USING clause restricts which rows can be updated
CREATE POLICY "Users can update own observatories"
  ON observatories FOR UPDATE
  USING (auth.uid() = owner_id);

-- Policy 4: DELETE - Users can only delete their own observatories
-- Purpose: Prevents users from deleting other users' observatories
-- Security: USING clause restricts which rows can be deleted
CREATE POLICY "Users can delete own observatories"
  ON observatories FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- INTEGRATIONS TABLE - RLS POLICIES
-- ============================================================================

-- Enable RLS if not already enabled (idempotent)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to ensure clean recreation
DROP POLICY IF EXISTS "Users can view own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can create own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON integrations;

-- Policy 1: SELECT - Users can only view integrations in their observatories
-- Purpose: Users can access integrations only for observatories they own
-- Security: Subquery checks if the integration's observatory is owned by the user
-- Performance: Uses index on observatories(owner_id) for fast lookup
CREATE POLICY "Users can view own integrations"
  ON integrations FOR SELECT
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Policy 2: INSERT - Users can only create integrations in their observatories
-- Purpose: Prevents users from adding integrations to other users' observatories
-- Security: WITH CHECK validates the observatory belongs to the user
CREATE POLICY "Users can create own integrations"
  ON integrations FOR INSERT
  WITH CHECK (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Policy 3: UPDATE - Users can only update integrations in their observatories
-- Purpose: Prevents users from modifying integrations in other observatories
-- Security: USING clause restricts updateable rows to user's observatories
CREATE POLICY "Users can update own integrations"
  ON integrations FOR UPDATE
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- Policy 4: DELETE - Users can only delete integrations in their observatories
-- Purpose: Prevents users from deleting integrations from other observatories
-- Security: USING clause restricts deletable rows to user's observatories
CREATE POLICY "Users can delete own integrations"
  ON integrations FOR DELETE
  USING (
    observatory_id IN (
      SELECT id FROM observatories WHERE owner_id = auth.uid()
    )
  );

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Index 1: integrations(observatory_id)
-- Purpose: Speeds up queries filtering integrations by observatory
-- Use Cases:
--   - Loading all integrations for a dashboard
--   - Checking if an observatory has specific platform connected
--   - RLS policy subquery lookups
-- Impact: Critical for dashboard performance (used on every page load)
CREATE INDEX IF NOT EXISTS idx_integrations_observatory
  ON integrations(observatory_id);

-- Index 2: integrations(platform)
-- Purpose: Speeds up queries filtering by platform type
-- Use Cases:
--   - Finding Twitter/Gmail/HubSpot integrations across observatories
--   - Platform-specific health checks
--   - Integration type reports
-- Impact: Medium (used for platform-specific operations)
CREATE INDEX IF NOT EXISTS idx_integrations_platform
  ON integrations(platform);

-- Index 3: observatories(owner_id)
-- Purpose: Speeds up queries finding observatories for a specific user
-- Use Cases:
--   - User login (loading user's observatories)
--   - RLS policy enforcement
--   - Multi-observatory user support
-- Impact: Critical for authentication and authorization
CREATE INDEX IF NOT EXISTS idx_observatories_owner
  ON observatories(owner_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration was successful:

-- 1. Check RLS is enabled on both tables
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('observatories', 'integrations');
-- Expected: rowsecurity = true for both

-- 2. List all policies
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('observatories', 'integrations')
-- ORDER BY tablename, policyname;
-- Expected: 4 policies per table (SELECT, INSERT, UPDATE, DELETE)

-- 3. Verify indexes exist
-- SELECT tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('observatories', 'integrations')
--   AND indexname IN ('idx_integrations_observatory', 'idx_integrations_platform', 'idx_observatories_owner')
-- ORDER BY tablename, indexname;
-- Expected: All 3 indexes present

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
--
-- Expected Query Performance Improvements:
--
-- 1. Dashboard Load (integrations by observatory):
--    Before: Table scan (~500ms for 1000 rows)
--    After:  Index scan (~5ms)
--    Improvement: 100x faster
--
-- 2. RLS Policy Checks (observatory ownership):
--    Before: Sequential scan on observatories
--    After:  Index lookup
--    Improvement: Critical for every authenticated query
--
-- 3. Platform Filtering (e.g., "show all Twitter accounts"):
--    Before: Table scan
--    After:  Index scan
--    Improvement: 50x faster for platform-specific queries
--
-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration:
--
-- -- Drop the policies
-- DROP POLICY IF EXISTS "Users can view own observatories" ON observatories;
-- DROP POLICY IF EXISTS "Users can create own observatories" ON observatories;
-- DROP POLICY IF EXISTS "Users can update own observatories" ON observatories;
-- DROP POLICY IF EXISTS "Users can delete own observatories" ON observatories;
-- DROP POLICY IF EXISTS "Users can view own integrations" ON integrations;
-- DROP POLICY IF EXISTS "Users can create own integrations" ON integrations;
-- DROP POLICY IF EXISTS "Users can update own integrations" ON integrations;
-- DROP POLICY IF EXISTS "Users can delete own integrations" ON integrations;
--
-- -- Drop the indexes
-- DROP INDEX IF EXISTS idx_integrations_observatory;
-- DROP INDEX IF EXISTS idx_integrations_platform;
-- DROP INDEX IF EXISTS idx_observatories_owner;
--
-- -- Disable RLS (not recommended for production)
-- ALTER TABLE observatories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE integrations DISABLE ROW LEVEL SECURITY;
--
-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 Migration Complete: RLS policies and performance indexes created';
  RAISE NOTICE 'Observatories: 4 RLS policies created';
  RAISE NOTICE 'Integrations: 4 RLS policies created';
  RAISE NOTICE 'Performance indexes: 3 created (integrations.observatory_id, integrations.platform, observatories.owner_id)';
END $$;
