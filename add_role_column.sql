-- Add role column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create index on role column for performance
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"(role);

-- Update existing users to have 'user' role if null
UPDATE "User" SET role = 'user' WHERE role IS NULL;
