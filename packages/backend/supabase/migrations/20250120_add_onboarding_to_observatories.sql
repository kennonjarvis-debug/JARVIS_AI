-- Migration: Add onboarding support to observatories
-- Date: 2025-01-20
-- Description: Adds onboarding completion tracking and onboarding data storage

-- Add onboarding columns to observatories table
ALTER TABLE observatories
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

-- Create index for querying incomplete onboarding
CREATE INDEX IF NOT EXISTS idx_observatories_onboarding_completed
  ON observatories(onboarding_completed);

-- Add comments for documentation
COMMENT ON COLUMN observatories.onboarding_completed IS 'Whether the business onboarding flow has been completed';
COMMENT ON COLUMN observatories.onboarding_data IS 'JSON data collected during onboarding: businessName, industry, description, products, targetAudience, website, brandVoice, customBrandVoice, toneAttributes, completedAt';

-- Example onboarding_data structure:
-- {
--   "businessName": "DAWG AI",
--   "industry": "Music Production Software",
--   "description": "Browser-based DAW with AI features",
--   "products": "Digital audio workstation, AI mixing tools",
--   "targetAudience": "Independent music producers and creators",
--   "website": "https://dawg-ai.com",
--   "brandVoice": "enthusiastic",
--   "customBrandVoice": null,
--   "toneAttributes": ["creative", "accessible", "inspiring"],
--   "completedAt": "2025-01-20T10:30:00Z"
-- }
