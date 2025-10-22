# Two-Factor Authentication (2FA) Documentation

## Overview

Jarvis AI implements industry-standard TOTP-based (Time-based One-Time Password) two-factor authentication to provide an additional layer of security for user accounts. This document covers setup, usage, administration, and security best practices.

## Table of Contents

1. [For End Users](#for-end-users)
2. [For Developers](#for-developers)
3. [For Administrators](#for-administrators)
4. [Security Considerations](#security-considerations)
5. [Troubleshooting](#troubleshooting)

---

## For End Users

### What is Two-Factor Authentication?

Two-factor authentication (2FA) adds an extra layer of security to your account. Instead of just entering your password, you'll also need to enter a 6-digit code from your authenticator app. This means that even if someone steals your password, they can't access your account without your phone.

### Supported Authenticator Apps

- **Google Authenticator** (iOS, Android)
- **Microsoft Authenticator** (iOS, Android)
- **Authy** (iOS, Android, Desktop)
- **1Password** (iOS, Android, Desktop)
- Any TOTP-compatible authenticator app (RFC 6238)

### Enabling 2FA

1. Navigate to **Settings > Security > Two-Factor Authentication**
2. Click **Enable Two-Factor Authentication**
3. Scan the QR code with your authenticator app
   - Alternatively, enter the secret key manually if you can't scan the QR code
4. Enter the 6-digit code from your authenticator app to verify
5. **IMPORTANT:** Save your backup codes in a secure location
   - Download them as a text file
   - Print them and store in a safe place
   - Or store them in a password manager

### Using 2FA During Login

1. Sign in with your email and password (via Google OAuth)
2. You'll be prompted to enter your 6-digit authentication code
3. Open your authenticator app and enter the current code
4. You'll be signed in and redirected to your dashboard

### Backup Codes

Backup codes are single-use codes that allow you to sign in if you lose access to your authenticator app.

**Important Notes:**
- You receive 10 backup codes when you enable 2FA
- Each code can only be used once
- Save them in a secure location immediately
- You can regenerate new codes at any time (this invalidates old codes)

**Using a Backup Code:**
1. On the 2FA verification screen, click **Use a backup code instead**
2. Enter one of your backup codes (format: XXXX-XXXX)
3. After using a backup code, consider regenerating new ones

### Regenerating Backup Codes

1. Navigate to **Settings > Security > Two-Factor Authentication**
2. Click **Regenerate Backup Codes**
3. Enter your current 6-digit authentication code
4. Save your new backup codes securely
5. Old backup codes are now invalid

### Disabling 2FA

1. Navigate to **Settings > Security > Two-Factor Authentication**
2. Click **Disable Two-Factor Authentication**
3. Enter your current 6-digit authentication code to confirm
4. 2FA is now disabled (not recommended)

### Account Recovery

If you lose access to both your authenticator app AND your backup codes:

1. Contact Jarvis AI support at support@jarvisai.com
2. Provide proof of identity:
   - Account email address
   - Recent account activity details
   - Any other identifying information
3. Support will manually disable 2FA for your account
4. You'll receive an email confirmation when 2FA is disabled
5. Sign in and immediately re-enable 2FA with a new authenticator

**Note:** This process may take 24-48 hours for security verification.

---

## For Developers

### Architecture

The 2FA implementation consists of several components:

1. **Core Service** (`lib/auth/two-factor.ts`)
   - TOTP generation and verification
   - Backup code generation and verification
   - Rate limiting
   - Format validation

2. **Database Schema** (`prisma/schema.prisma`)
   - `User.two_factor_enabled`: Boolean flag
   - `TwoFactorSecret`: Stores TOTP secrets
   - `BackupCode`: Stores hashed backup codes
   - `TwoFactorLog`: Audit trail

3. **API Routes** (`app/api/auth/2fa/`)
   - `enable`: Generate TOTP secret and QR code
   - `verify`: Verify setup code and enable 2FA
   - `validate`: Validate login code or backup code
   - `disable`: Disable 2FA
   - `backup-codes`: Regenerate backup codes

4. **UI Components** (`components/`)
   - `TwoFactorSetup`: Setup wizard
   - `TwoFactorPrompt`: Login verification prompt
   - `TwoFactorSettings`: Settings management
   - `BackupCodes`: Backup code display

5. **Middleware** (`lib/auth/two-factor-middleware.ts`)
   - Route protection
   - 2FA verification checks
   - API token bypass

### Technical Specifications

**TOTP Algorithm:**
- Standard: RFC 6238
- Algorithm: SHA-256
- Time window: 30 seconds
- Code length: 6 digits
- Tolerance: ±1 time window (30 seconds before/after)

**Backup Codes:**
- Count: 10 codes per user
- Format: 8 alphanumeric characters (XXXX-XXXX)
- Storage: bcrypt hashed with 12 rounds
- Single-use: Marked with `used_at` timestamp

**Rate Limiting:**
- Maximum attempts: 5 failed attempts
- Lockout duration: 15 minutes
- Scope: Per user ID
- Storage: In-memory (consider Redis for production)

### Database Migration

Run the migration to add 2FA support:

```bash
# Using Prisma
npx prisma migrate dev --name add-two-factor

# Or run the SQL directly
psql $DATABASE_URL < prisma/migrations/add-two-factor.sql
```

### NextAuth Integration

The 2FA flow is integrated into NextAuth callbacks:

1. **JWT Callback**: Checks if user has 2FA enabled on sign-in
2. **Session Callback**: Adds 2FA status to session object
3. **Sign In Callback**: Allows OAuth sign-in, 2FA verified separately

### API Usage Examples

**Enable 2FA:**
```typescript
const response = await fetch('/api/auth/2fa/enable', {
  method: 'POST',
});
const { qrCode, manualEntryKey } = await response.json();
```

**Verify Setup:**
```typescript
const response = await fetch('/api/auth/2fa/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: '123456' }),
});
const { backupCodes } = await response.json();
```

**Validate Login:**
```typescript
const response = await fetch('/api/auth/2fa/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: '123456',
    isBackupCode: false
  }),
});
```

### Middleware Setup

Create or update `middleware.ts`:

```typescript
import { twoFactorMiddleware } from '@/lib/auth/two-factor-middleware';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return twoFactorMiddleware(request, {
    protectedRoutes: ['/dashboard', '/dashboard/*', '/settings/*'],
    excludedRoutes: ['/api/*', '/auth/*', '/_next/*'],
    verificationPath: '/auth/2fa-prompt',
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Testing

**Test with Google Authenticator:**
1. Enable 2FA in development
2. Scan QR code with Google Authenticator
3. Verify codes are accepted
4. Test backup code functionality
5. Test rate limiting (5 failed attempts)

**Unit Tests:**
```typescript
import { verifyTOTPCode, generateBackupCodes } from '@/lib/auth/two-factor';

// Test TOTP verification
test('verifies valid TOTP code', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const token = generateToken(secret); // Use speakeasy
  expect(verifyTOTPCode(token, secret)).toBe(true);
});

// Test backup codes
test('generates 10 unique backup codes', async () => {
  const codes = await generateBackupCodes();
  expect(codes).toHaveLength(10);
  expect(new Set(codes.map(c => c.code)).size).toBe(10);
});
```

---

## For Administrators

### Monitoring 2FA Usage

Query the audit log:

```sql
-- Recent 2FA events
SELECT
  u.email,
  tfl.event_type,
  tfl.success,
  tfl.created_at
FROM "TwoFactorLog" tfl
JOIN "User" u ON u.id = tfl.user_id
WHERE tfl.created_at > NOW() - INTERVAL '7 days'
ORDER BY tfl.created_at DESC;

-- Users with 2FA enabled
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN two_factor_enabled THEN 1 END) as users_with_2fa,
  ROUND(100.0 * COUNT(CASE WHEN two_factor_enabled THEN 1 END) / COUNT(*), 2) as percentage
FROM "User";

-- Failed login attempts (potential attacks)
SELECT
  u.email,
  COUNT(*) as failed_attempts,
  MAX(tfl.created_at) as last_attempt
FROM "TwoFactorLog" tfl
JOIN "User" u ON u.id = tfl.user_id
WHERE tfl.event_type = 'login_failure'
  AND tfl.created_at > NOW() - INTERVAL '1 day'
GROUP BY u.email
HAVING COUNT(*) > 3
ORDER BY failed_attempts DESC;
```

### Manually Disabling 2FA for a User

If a user loses access and needs emergency recovery:

```sql
-- Disable 2FA for a specific user
UPDATE "User"
SET two_factor_enabled = false
WHERE email = 'user@example.com';

-- Delete their TOTP secret
DELETE FROM "TwoFactorSecret"
WHERE user_id = (SELECT id FROM "User" WHERE email = 'user@example.com');

-- Delete their backup codes
DELETE FROM "BackupCode"
WHERE user_id = (SELECT id FROM "User" WHERE email = 'user@example.com');

-- Log the manual disable
INSERT INTO "TwoFactorLog" (id, user_id, event_type, success, metadata, created_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM "User" WHERE email = 'user@example.com'),
  'manually_disabled',
  true,
  '{"reason": "User lost access", "admin": "admin@jarvisai.com"}'::jsonb,
  NOW()
);
```

### Enforcing 2FA

To require 2FA for all users:

1. Add a database constraint or application logic
2. Show a banner prompting users to enable 2FA
3. Set a deadline after which 2FA is required
4. Implement in middleware:

```typescript
// In two-factor-middleware.ts
if (!token.twoFactorEnabled && isRequiredForOrg(token.userId)) {
  // Redirect to 2FA setup
  return NextResponse.redirect('/settings/security/two-factor');
}
```

### Backup Code Usage Statistics

```sql
-- Users running low on backup codes
SELECT
  u.email,
  COUNT(*) FILTER (WHERE bc.used_at IS NULL) as unused_codes,
  COUNT(*) FILTER (WHERE bc.used_at IS NOT NULL) as used_codes
FROM "User" u
JOIN "BackupCode" bc ON bc.user_id = u.id
WHERE u.two_factor_enabled = true
GROUP BY u.email
HAVING COUNT(*) FILTER (WHERE bc.used_at IS NULL) <= 2
ORDER BY unused_codes ASC;
```

---

## Security Considerations

### Best Practices

1. **Secret Storage:**
   - TOTP secrets should be encrypted at rest
   - Consider using environment-based encryption keys
   - Rotate encryption keys periodically

2. **Rate Limiting:**
   - Implement IP-based rate limiting in addition to user-based
   - Consider using Redis for distributed rate limiting
   - Log all failed attempts for security monitoring

3. **Backup Codes:**
   - Always hash backup codes with bcrypt
   - Use sufficient bcrypt rounds (12+)
   - Invalidate all codes when regenerating

4. **Session Security:**
   - Clear 2FA verification on logout
   - Require re-verification after session timeout
   - Consider device fingerprinting for trusted devices

5. **Audit Logging:**
   - Log all 2FA events (enable, disable, success, failure)
   - Include IP address and user agent
   - Monitor for suspicious patterns

### Compliance

**GDPR Considerations:**
- 2FA secrets are personal data
- Include in data export requests
- Delete all 2FA data on account deletion
- Document data retention policies

**SOC 2 / ISO 27001:**
- 2FA helps meet access control requirements
- Maintain audit logs for compliance
- Document 2FA policies and procedures
- Regular security reviews

### Common Vulnerabilities

**Avoided in this implementation:**
- ✅ Timing attacks (constant-time comparison in bcrypt)
- ✅ Brute force (rate limiting after 5 attempts)
- ✅ Secret exposure (QR shown once, secrets hashed)
- ✅ Session hijacking (2FA verified per session)
- ✅ Backup code reuse (marked as used)

**Additional hardening:**
- Consider adding device fingerprinting
- Implement trusted device list
- Add email notifications for 2FA changes
- Consider SMS fallback (with security caveats)

---

## Troubleshooting

### Code Not Working

**User reports 6-digit code is rejected:**

1. **Check time synchronization:**
   - User's phone clock must be accurate
   - TOTP is time-based (30-second windows)
   - Settings > Date & Time > Automatic

2. **Check secret key:**
   - Ensure user scanned the correct QR code
   - Try manual entry if QR scan failed
   - Regenerate secret if needed

3. **Check for rate limiting:**
   - User may be locked out after 5 failed attempts
   - Wait 15 minutes or manually reset
   - Check `TwoFactorLog` for lockout events

### Lost Access

**User lost phone and backup codes:**

1. Verify user identity through support channels
2. Manually disable 2FA (see admin section)
3. Email user confirmation
4. User re-enables 2FA after signing in

### Migration Issues

**Database migration fails:**

1. Check PostgreSQL version (9.4+)
2. Ensure `gen_random_uuid()` is available
3. Check for existing table conflicts
4. Review migration logs

### Performance Issues

**2FA verification is slow:**

1. Check database indexes:
   ```sql
   -- Verify indexes exist
   SELECT indexname FROM pg_indexes
   WHERE tablename IN ('TwoFactorSecret', 'BackupCode', 'TwoFactorLog');
   ```

2. Monitor query performance:
   ```sql
   -- Enable query logging
   SET log_statement = 'all';
   ```

3. Consider caching user 2FA status in Redis

---

## Additional Resources

- [RFC 6238: TOTP Specification](https://tools.ietf.org/html/rfc6238)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
- [Authy](https://authy.com/)
- [1Password](https://1password.com/)

---

## Support

For issues or questions:
- Email: support@jarvisai.com
- Documentation: https://docs.jarvisai.com/security/2fa
- GitHub Issues: https://github.com/jarvisai/web/issues

---

**Last Updated:** 2025-10-17
**Version:** 1.0.0
**Author:** Jarvis AI Security Team
