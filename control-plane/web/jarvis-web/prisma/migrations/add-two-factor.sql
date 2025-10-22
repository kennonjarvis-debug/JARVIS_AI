-- Migration: Add Two-Factor Authentication Support
-- Description: Adds tables and columns to support TOTP-based 2FA with backup codes
-- Date: 2025-10-17

-- Add two_factor_enabled column to User table
-- This flag indicates whether 2FA is active for the user
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Create TwoFactorSecret table
-- Stores the encrypted TOTP secret for each user
CREATE TABLE IF NOT EXISTS "TwoFactorSecret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL UNIQUE,
    "secret" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorSecret_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create BackupCode table
-- Stores hashed backup codes for account recovery
CREATE TABLE IF NOT EXISTS "BackupCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupCode_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create TwoFactorLog table
-- Audit trail for all 2FA-related events
CREATE TABLE IF NOT EXISTS "TwoFactorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorLog_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for performance
-- Index on user_id for quick lookups
CREATE INDEX IF NOT EXISTS "TwoFactorSecret_user_id_idx"
ON "TwoFactorSecret"("user_id");

CREATE INDEX IF NOT EXISTS "BackupCode_user_id_idx"
ON "BackupCode"("user_id");

-- Index on used_at to quickly find unused backup codes
CREATE INDEX IF NOT EXISTS "BackupCode_user_id_used_at_idx"
ON "BackupCode"("user_id", "used_at");

-- Index on created_at for log queries
CREATE INDEX IF NOT EXISTS "TwoFactorLog_user_id_created_at_idx"
ON "TwoFactorLog"("user_id", "created_at" DESC);

-- Index on event_type for filtering logs
CREATE INDEX IF NOT EXISTS "TwoFactorLog_event_type_idx"
ON "TwoFactorLog"("event_type");

-- Comments for documentation
COMMENT ON TABLE "TwoFactorSecret" IS 'Stores TOTP secrets for users with 2FA enabled';
COMMENT ON TABLE "BackupCode" IS 'Stores hashed backup codes for 2FA account recovery';
COMMENT ON TABLE "TwoFactorLog" IS 'Audit log for all 2FA-related events';

COMMENT ON COLUMN "User"."two_factor_enabled" IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN "TwoFactorSecret"."secret" IS 'Base32-encoded TOTP secret (should be encrypted at rest)';
COMMENT ON COLUMN "BackupCode"."code_hash" IS 'Bcrypt hash of the backup code';
COMMENT ON COLUMN "BackupCode"."used_at" IS 'Timestamp when code was used (NULL if unused)';
COMMENT ON COLUMN "TwoFactorLog"."event_type" IS 'Type of event: enabled, disabled, login_success, login_failure, backup_used';
