# Admin User Setup Guide

## Current Status

- kennonjarvis@gmail.com: EXISTS in Supabase Auth (ID: 806eb75d-7dfd-40dc-8633-0390742d7332)
- dawg.ai.chief@gmail.com: EXISTS in Supabase Auth (ID: 10c4dfba-85d9-45a7-959f-cb770ad37768)
- Both users need to be added to the User table with proper roles
- User table is missing 'role' column - needs to be added first

## Issues Found

1. **Missing role column** - User table doesn't have a role column
2. **Google OAuth not configured** - Causing 500 error on sign-in
3. **Email not confirmed** - dawg.ai.chief@gmail.com shows "Email not confirmed" error

## Step-by-Step Fix

### Step 1: Add Role Column to User Table

Open Supabase SQL Editor and run this SQL:

```sql
-- Add role column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create index on role column for performance
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"(role);

-- Update existing users to have 'user' role if null
UPDATE "User" SET role = 'user' WHERE role IS NULL;
```

**Supabase Dashboard URL:** https://supabase.com/dashboard/project/nzmzmsmxbiptilzgdmgt/sql/new

### Step 2: Run the Admin Setup Script

After adding the role column, run:

```bash
cd /Users/benkennon/Projects_Archive/jarvis/jarvis-deploy/packages/backend
npx tsx scripts/setup-admin-users.ts
```

This script will:
- Confirm both users exist in Supabase Auth
- Auto-confirm their emails
- Create User table entries with proper roles:
  - kennonjarvis@gmail.com → superadmin
  - dawg.ai.chief@gmail.com → admin
- Create default observatories for each user

### Step 3: Configure Google OAuth

1. Go to Supabase Dashboard → Authentication → Providers
   https://supabase.com/dashboard/project/nzmzmsmxbiptilzgdmgt/auth/providers

2. Enable Google provider

3. Add your Google OAuth credentials:
   - Get credentials from: https://console.cloud.google.com/apis/credentials
   - Add authorized redirect URI: `https://nzmzmsmxbiptilzgdmgt.supabase.co/auth/v1/callback`

### Step 4: Test Everything

1. **Test Email Login:**
   - Try logging in with kennonjarvis@gmail.com
   - Should work with temporary password: `TempPass123!`
   - Change password on first login

2. **Test Forgot Password Flow:**
   - Click "Forgot Password"
   - Enter email address
   - Check email for reset link
   - Reset password

3. **Test Google OAuth:**
   - Click "Continue with Google"
   - Should redirect to Google login
   - Should successfully authenticate and redirect back

## Verification Checklist

- [ ] Role column added to User table
- [ ] Setup script completed successfully
- [ ] Both users exist in User table with correct roles
- [ ] Both users have observatories created
- [ ] Google OAuth configured in Supabase
- [ ] Email login works for both users
- [ ] Forgot password flow works
- [ ] Google sign-in works
- [ ] No "Email not confirmed" errors

## Troubleshooting

### If script fails with "role column not found"
- Make sure you ran the SQL in Step 1
- Refresh Supabase schema cache (restart backend)

### If Google OAuth still shows 500 error
- Check Google OAuth credentials are correct
- Verify redirect URI matches exactly
- Check Supabase logs for detailed error

### If "Email not confirmed" error persists
- Run the setup script again - it will auto-confirm emails
- Or manually confirm in Supabase Dashboard → Authentication → Users

## User Information

### kennonjarvis@gmail.com
- **Auth ID:** 806eb75d-7dfd-40dc-8633-0390742d7332
- **Role:** superadmin
- **Temp Password:** TempPass123! (change on first login)

### dawg.ai.chief@gmail.com
- **Auth ID:** 10c4dfba-85d9-45a7-959f-cb770ad37768
- **Role:** admin
- **Temp Password:** TempPass123! (change on first login)

## Next Steps (from user request)

Once the above is complete:

1. ✅ kennonjarvis@gmail.com is superadmin
2. ✅ dawg.ai.chief@gmail.com is in Supabase
3. ✅ Forgot password flow works
4. ✅ Google sign-in works
5. ⏳ Add Supabase widget to kennonjarvis@gmail.com (to be implemented)

## Files Modified

- `/packages/backend/scripts/setup-admin-users.ts` - Fixed to use correct column names (created_at, updated_at, role)
- `SETUP_ADMIN_USERS_GUIDE.md` - This guide

## Database Schema

### User Table Columns
- id (UUID, PK)
- email (TEXT)
- name (TEXT)
- image (TEXT, nullable)
- emailVerified (TIMESTAMP, nullable)
- two_factor_enabled (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- **role (TEXT)** ← **NEW COLUMN TO BE ADDED**
