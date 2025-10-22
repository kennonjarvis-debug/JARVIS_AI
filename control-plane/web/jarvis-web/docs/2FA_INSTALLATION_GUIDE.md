# Two-Factor Authentication - Installation Guide

## Quick Start

This guide will help you deploy the 2FA system to your Jarvis AI application.

---

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ PostgreSQL database
- ✅ Next.js 14 application
- ✅ NextAuth configured
- ✅ Prisma installed

---

## Installation Steps

### Step 1: Install Dependencies

The required packages have already been installed:

```bash
npm install speakeasy qrcode bcryptjs @types/speakeasy @types/qrcode @types/bcryptjs
```

**Packages installed:**
- `speakeasy` - TOTP generation and verification
- `qrcode` - QR code generation
- `bcryptjs` - Backup code hashing

### Step 2: Run Database Migration

Apply the 2FA database schema:

```bash
# Option 1: Using Prisma (recommended)
npx prisma generate
npx prisma db push

# Option 2: Run SQL directly
psql $DATABASE_URL < prisma/migrations/add-two-factor.sql
```

**This creates:**
- `two_factor_enabled` column on User table
- `TwoFactorSecret` table
- `BackupCode` table
- `TwoFactorLog` table
- Performance indexes

### Step 3: Update TypeScript Types (Optional)

If using TypeScript with NextAuth, extend the session types:

Create or update `types/next-auth.d.ts`:

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
    userId?: string;
  }
}
```

### Step 4: Configure Environment Variables

Add to your `.env.local`:

```bash
# Already configured
NEXTAUTH_SECRET=your-secret-here
DATABASE_URL=your-postgres-url

# Optional: For Redis rate limiting (production)
REDIS_URL=your-redis-url
```

### Step 5: Set Up Middleware (Optional)

To protect routes with 2FA, create `middleware.ts` in your root:

```typescript
import { NextRequest } from 'next/server';
import { twoFactorMiddleware } from '@/lib/auth/two-factor-middleware';

export async function middleware(request: NextRequest) {
  return twoFactorMiddleware(request, {
    protectedRoutes: [
      '/dashboard',
      '/dashboard/*',
      '/settings',
      '/settings/*',
    ],
    excludedRoutes: [
      '/api/*',
      '/auth/*',
      '/_next/*',
      '/public/*',
    ],
    verificationPath: '/auth/2fa-prompt',
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Step 6: Add Navigation Links

Add 2FA settings link to your navigation:

```tsx
import Link from 'next/link';

// In your settings navigation
<Link href="/settings/security/two-factor">
  Two-Factor Authentication
</Link>
```

### Step 7: Test the Implementation

1. **Enable 2FA:**
   - Navigate to `/settings/security/two-factor`
   - Click "Enable Two-Factor Authentication"
   - Scan QR code with Google Authenticator
   - Verify with 6-digit code
   - Save backup codes

2. **Test Login:**
   - Sign out
   - Sign in with Google OAuth
   - Should be prompted for 2FA code
   - Enter code from authenticator
   - Should be redirected to dashboard

3. **Test Backup Code:**
   - Sign out
   - Sign in
   - Click "Use a backup code instead"
   - Enter one of your backup codes
   - Should be logged in

4. **Test Rate Limiting:**
   - Enter 5 incorrect codes
   - Should be locked out for 15 minutes

---

## Verification Checklist

- [ ] Database migration applied successfully
- [ ] Can access `/settings/security/two-factor`
- [ ] Can enable 2FA and scan QR code
- [ ] 6-digit codes are accepted
- [ ] Backup codes are generated (10 codes)
- [ ] Login prompts for 2FA code
- [ ] Backup codes work for login
- [ ] Rate limiting works (5 attempts)
- [ ] Can disable 2FA with code
- [ ] Can regenerate backup codes
- [ ] Audit logs are created in database

---

## Database Verification

Check that tables were created:

```sql
-- List 2FA tables
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('TwoFactorSecret', 'BackupCode', 'TwoFactorLog');

-- Check User table has new column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'User'
  AND column_name = 'two_factor_enabled';

-- Verify indexes
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('TwoFactorSecret', 'BackupCode', 'TwoFactorLog');
```

---

## Troubleshooting

### Issue: "Prisma Client not found"

**Solution:**
```bash
npx prisma generate
```

### Issue: "Column already exists" during migration

**Solution:**
The migration is idempotent. If columns already exist, they will be skipped. If there's an error, drop the tables and re-run:

```sql
DROP TABLE IF EXISTS "TwoFactorLog" CASCADE;
DROP TABLE IF EXISTS "BackupCode" CASCADE;
DROP TABLE IF EXISTS "TwoFactorSecret" CASCADE;
ALTER TABLE "User" DROP COLUMN IF EXISTS "two_factor_enabled";
```

Then re-run the migration.

### Issue: QR Code Not Displaying

**Check:**
1. `qrcode` package is installed
2. API route returns `qrCode` field
3. Browser console for errors
4. Try manual entry key instead

### Issue: Codes Not Working

**Check:**
1. Phone clock is synchronized
2. Using correct secret/authenticator
3. Code hasn't expired (30-second window)
4. No rate limiting active

### Issue: "Too many failed attempts"

**Solution:**
Wait 15 minutes or manually clear rate limit:

```typescript
// In development, clear rate limiter
import { rateLimiter } from '@/lib/auth/two-factor';
rateLimiter.clearAttempts(userId);
```

Or restart the server (in-memory rate limiter resets).

---

## Security Checklist

Before going to production:

- [ ] NEXTAUTH_SECRET is a strong random string
- [ ] DATABASE_URL uses SSL in production
- [ ] TOTP secrets are encrypted at rest (optional enhancement)
- [ ] Rate limiting uses Redis (for multi-instance)
- [ ] Audit logs are monitored
- [ ] Backup codes are downloaded by users
- [ ] Recovery process is documented
- [ ] Support email is configured
- [ ] HTTPS is enforced
- [ ] CSP headers are configured

---

## Production Deployment

### Environment-Specific Considerations

**Staging:**
```bash
# Test migration first
DATABASE_URL=staging-db-url npx prisma db push

# Deploy code
vercel --prod
```

**Production:**
```bash
# Backup database first
pg_dump $DATABASE_URL > backup.sql

# Run migration
DATABASE_URL=production-db-url npx prisma db push

# Deploy code
vercel --prod

# Monitor logs
vercel logs --follow
```

### Post-Deployment Checks

1. Check health endpoint
2. Enable 2FA for test account
3. Verify login flow
4. Check database logs
5. Monitor error rates
6. Test backup codes
7. Verify audit logging

---

## Rollback Plan

If you need to rollback:

```sql
-- Disable 2FA for all users
UPDATE "User" SET two_factor_enabled = false;

-- Optional: Remove 2FA data
DELETE FROM "TwoFactorLog";
DELETE FROM "BackupCode";
DELETE FROM "TwoFactorSecret";
```

Then redeploy previous version.

---

## Monitoring Setup

### Key Metrics to Track

```sql
-- 2FA adoption rate
SELECT
  COUNT(*) FILTER (WHERE two_factor_enabled) * 100.0 / COUNT(*) as adoption_rate
FROM "User";

-- Failed login attempts (last 24 hours)
SELECT COUNT(*) as failed_attempts
FROM "TwoFactorLog"
WHERE event_type = 'login_failure'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Backup code usage
SELECT COUNT(*) as backup_codes_used
FROM "BackupCode"
WHERE used_at IS NOT NULL;
```

### Set Up Alerts

- Alert if >10 failed attempts from single IP
- Alert if multiple users locked out simultaneously
- Alert if 2FA disable rate spikes
- Alert if database errors on 2FA tables

---

## Support Resources

- **Documentation:** `/docs/TWO_FACTOR_AUTH.md`
- **Architecture:** `/docs/2FA_ARCHITECTURE.md`
- **Code Reference:** `/lib/auth/two-factor.ts`
- **API Routes:** `/app/api/auth/2fa/*/route.ts`

---

## Next Steps

After installation:

1. ✅ Test thoroughly in staging
2. ✅ Train support team on recovery process
3. ✅ Create user documentation/FAQs
4. ✅ Set up monitoring and alerts
5. ✅ Plan rollout communication
6. ✅ Consider enforcing 2FA for all users
7. ✅ Implement Redis rate limiting
8. ✅ Add email notifications for 2FA changes

---

## Quick Commands Reference

```bash
# Install dependencies
npm install speakeasy qrcode bcryptjs @types/speakeasy @types/qrcode @types/bcryptjs

# Generate Prisma client
npx prisma generate

# Run migration
npx prisma db push

# View database
npx prisma studio

# Check Prisma schema
npx prisma validate

# Reset database (development only)
npx prisma migrate reset

# Build application
npm run build

# Start production server
npm run start
```

---

**Installation Complete!** 🎉

Your Jarvis AI application now has enterprise-grade two-factor authentication.

For questions or issues, refer to the comprehensive documentation in `/docs/TWO_FACTOR_AUTH.md`.
