# Two-Factor Authentication Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JARVIS AI WEB APPLICATION                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     PRESENTATION LAYER                       │   │
│  │                                                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │   │
│  │  │ TwoFactorSetup  │  │ TwoFactorPrompt │  │  TwoFactor   │ │   │
│  │  │   Component     │  │   Component     │  │   Settings   │ │   │
│  │  │                 │  │                 │  │  Component   │ │   │
│  │  │ - QR Display    │  │ - Code Input    │  │ - Enable/    │ │   │
│  │  │ - Verification  │  │ - Backup Codes  │  │   Disable    │ │   │
│  │  │ - Backup Codes  │  │ - Rate Limit    │  │ - Regenerate │ │   │
│  │  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │   │
│  └───────────┼────────────────────┼───────────────────┼─────────┘   │
│              │                    │                   │             │
│  ┌───────────┼────────────────────┼───────────────────┼─────────┐   │
│  │           │    APPLICATION LAYER (Next.js 14)      │         │   │
│  │           ▼                    ▼                   ▼         │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │              API ROUTES (/app/api/auth/2fa/)           │ │   │
│  │  │                                                         │ │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │   │
│  │  │  │  enable  │ │  verify  │ │ validate │ │ disable  │  │ │   │
│  │  │  │  route   │ │  route   │ │  route   │ │  route   │  │ │   │
│  │  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │ │   │
│  │  │       │            │            │            │         │ │   │
│  │  │  ┌────┴────────────┴────────────┴────────────┴─────┐  │ │   │
│  │  │  │         backup-codes route                       │  │ │   │
│  │  │  └──────────────────────┬───────────────────────────┘  │ │   │
│  │  └─────────────────────────┼──────────────────────────────┘ │   │
│  │                            │                                │   │
│  │  ┌─────────────────────────┼──────────────────────────────┐ │   │
│  │  │      NEXTAUTH INTEGRATION (/lib/auth.ts)              │ │   │
│  │  │                         │                              │ │   │
│  │  │  ┌──────────────────────▼──────────────────────────┐  │ │   │
│  │  │  │  JWT Callback                                    │  │ │   │
│  │  │  │  - Check 2FA enabled on sign-in                 │  │ │   │
│  │  │  │  - Set twoFactorVerified flag                   │  │ │   │
│  │  │  └──────────────────────┬──────────────────────────┘  │ │   │
│  │  │                         │                              │ │   │
│  │  │  ┌──────────────────────▼──────────────────────────┐  │ │   │
│  │  │  │  Session Callback                                │  │ │   │
│  │  │  │  - Add 2FA status to session                    │  │ │   │
│  │  │  │  - Expose to client                             │  │ │   │
│  │  │  └──────────────────────┬──────────────────────────┘  │ │   │
│  │  └─────────────────────────┼──────────────────────────────┘ │   │
│  │                            │                                │   │
│  │  ┌─────────────────────────┼──────────────────────────────┐ │   │
│  │  │         MIDDLEWARE (middleware.ts)                    │ │   │
│  │  │                         │                              │ │   │
│  │  │  ┌──────────────────────▼──────────────────────────┐  │ │   │
│  │  │  │  two-factor-middleware.ts                        │  │ │   │
│  │  │  │  - Route protection                              │  │ │   │
│  │  │  │  - Check 2FA verification                        │  │ │   │
│  │  │  │  - Redirect if needed                            │  │ │   │
│  │  │  └──────────────────────┬──────────────────────────┘  │ │   │
│  │  └─────────────────────────┼──────────────────────────────┘ │   │
│  └────────────────────────────┼────────────────────────────────┘   │
│                               │                                    │
│  ┌────────────────────────────┼────────────────────────────────┐   │
│  │              SERVICE LAYER (/lib/auth/)                     │   │
│  │                            │                                 │   │
│  │  ┌─────────────────────────▼─────────────────────────────┐  │   │
│  │  │           two-factor.ts (Core Service)                 │  │   │
│  │  │                                                         │  │   │
│  │  │  ┌─────────────────┐  ┌──────────────────────────┐    │  │   │
│  │  │  │ TOTP Functions  │  │  Backup Code Functions   │    │  │   │
│  │  │  │ - Generate      │  │  - Generate (10 codes)   │    │  │   │
│  │  │  │ - Verify        │  │  - Verify (bcrypt)       │    │  │   │
│  │  │  │ - QR Code       │  │  - Format display        │    │  │   │
│  │  │  └─────────────────┘  └──────────────────────────┘    │  │   │
│  │  │                                                         │  │   │
│  │  │  ┌──────────────────────────────────────────────────┐ │  │   │
│  │  │  │  TwoFactorRateLimiter                            │ │  │   │
│  │  │  │  - Track failed attempts                         │ │  │   │
│  │  │  │  - Implement lockout (15 min)                    │ │  │   │
│  │  │  │  - Clear on success                              │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  └───────────────────────────┬─────────────────────────────┘  │   │
│  └────────────────────────────┼────────────────────────────────┘   │
│                               │                                    │
│  ┌────────────────────────────┼────────────────────────────────┐   │
│  │          DATA LAYER (PostgreSQL + Prisma)                   │   │
│  │                            │                                 │   │
│  │  ┌─────────────────────────▼─────────────────────────────┐  │   │
│  │  │                  PRISMA MODELS                         │  │   │
│  │  │                                                         │  │   │
│  │  │  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐  │  │   │
│  │  │  │   User   │  │ TwoFactor    │  │   BackupCode    │  │  │   │
│  │  │  │          │  │   Secret     │  │                 │  │  │   │
│  │  │  │ - id     │  │              │  │ - id            │  │  │   │
│  │  │  │ - email  │  │ - user_id    │  │ - user_id       │  │  │   │
│  │  │  │ - 2fa_   │  │ - secret     │  │ - code_hash     │  │  │   │
│  │  │  │   enabled│  │ - created_at │  │ - used_at       │  │  │   │
│  │  │  └────┬─────┘  └──────┬───────┘  └────────┬────────┘  │  │   │
│  │  │       │               │                   │            │  │   │
│  │  │  ┌────┴───────────────┴───────────────────┴─────────┐  │  │   │
│  │  │  │              TwoFactorLog (Audit)                 │  │  │   │
│  │  │  │  - user_id, event_type, success                  │  │  │   │
│  │  │  │  - ip_address, user_agent, metadata              │  │  │   │
│  │  │  └───────────────────────────────────────────────────┘  │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Setup Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Click "Enable 2FA"
     ▼
┌─────────────────────┐
│ TwoFactorSettings   │
│    Component        │
└────┬────────────────┘
     │ 2. POST /api/auth/2fa/enable
     ▼
┌─────────────────────┐
│  Enable Route       │
│  - Check auth       │
│  - Generate secret  │ ──────► speakeasy.generateSecret()
│  - Create QR code   │ ──────► QRCode.toDataURL()
│  - Store in DB      │ ──────► Prisma.TwoFactorSecret.create()
└────┬────────────────┘
     │ 3. Return QR code
     ▼
┌─────────────────────┐
│ TwoFactorSetup      │
│    Component        │
│  - Display QR       │
│  - Accept code      │
└────┬────────────────┘
     │ 4. POST /api/auth/2fa/verify { code }
     ▼
┌─────────────────────┐
│  Verify Route       │
│  - Verify TOTP      │ ──────► verifyTOTPCode()
│  - Generate backup  │ ──────► generateBackupCodes()
│  - Enable 2FA       │ ──────► Prisma.User.update({ 2fa: true })
│  - Store codes      │ ──────► Prisma.BackupCode.createMany()
└────┬────────────────┘
     │ 5. Return backup codes
     ▼
┌─────────────────────┐
│  Backup Codes UI    │
│  - Display          │
│  - Download         │
│  - Print            │
└─────────────────────┘
```

### 2. Login Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Google OAuth Sign In
     ▼
┌─────────────────────┐
│  NextAuth           │
│  - JWT Callback     │
│  - Check 2FA?       │ ──────► Prisma.User.findUnique()
│  - Set flags        │
└────┬────────────────┘
     │ 2. If 2FA enabled: twoFactorVerified = false
     ▼
┌─────────────────────┐
│  Middleware         │
│  - Check route      │
│  - Protected?       │
│  - 2FA verified?    │
└────┬────────────────┘
     │ 3. Redirect to /auth/2fa-prompt
     ▼
┌─────────────────────┐
│ TwoFactorPrompt     │
│    Component        │
│  - Accept code      │
└────┬────────────────┘
     │ 4. POST /api/auth/2fa/validate { code }
     ▼
┌─────────────────────┐
│  Validate Route     │
│  - Check lockout    │ ──────► rateLimiter.isLockedOut()
│  - Verify code      │ ──────► verifyTOTPCode() or verifyBackupCode()
│  - Log attempt      │ ──────► Prisma.TwoFactorLog.create()
│  - Update session   │
└────┬────────────────┘
     │ 5. Success: twoFactorVerified = true
     ▼
┌─────────────────────┐
│  Session Update     │
│  - Mark verified    │
│  - Redirect to app  │
└─────────────────────┘
```

### 3. Backup Code Usage Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ Lost authenticator
     │
     │ 1. Click "Use backup code"
     ▼
┌─────────────────────┐
│ TwoFactorPrompt     │
│  - Backup mode      │
│  - Accept code      │
└────┬────────────────┘
     │ 2. POST /api/auth/2fa/validate { code, isBackupCode: true }
     ▼
┌─────────────────────────────────────────────────┐
│  Validate Route                                 │
│  - Check lockout    ──────► rateLimiter         │
│  - Get unused codes ──────► Prisma.BackupCode   │
│                              .findMany({ used_at: null })
│  - Try each code:                               │
│    - bcrypt.compare(input, stored_hash)         │
│  - If match:                                    │
│    - Mark as used ──────► .update({ used_at: now })
│    - Log event    ──────► TwoFactorLog.create() │
│    - Count remaining                            │
└────┬────────────────────────────────────────────┘
     │ 3. Success + warning if low codes
     ▼
┌─────────────────────┐
│  Session Update     │
│  - Mark verified    │
│  - Show warning     │
│  - Redirect         │
└─────────────────────┘
```

---

## Security Architecture

### Defense Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                         │
│                                                              │
│  Layer 1: Rate Limiting                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - 5 attempts per user                                 │ │
│  │  - 15-minute lockout                                   │ │
│  │  - In-memory tracking (consider Redis)                │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ▼                                   │
│  Layer 2: Input Validation                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - TOTP: 6 digits only                                │ │
│  │  - Backup: 8 alphanumeric + hyphen                    │ │
│  │  - Sanitize all inputs                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ▼                                   │
│  Layer 3: TOTP Verification                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - Time-based algorithm (RFC 6238)                     │ │
│  │  - 30-second windows                                   │ │
│  │  - ±1 window tolerance                                 │ │
│  │  - SHA-256 algorithm                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ▼                                   │
│  Layer 4: Backup Code Verification                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - bcrypt comparison (constant-time)                   │ │
│  │  - 12 rounds                                           │ │
│  │  - Single-use enforcement                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ▼                                   │
│  Layer 5: Session Security                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - JWT-based sessions                                  │ │
│  │  - Verification flag in token                          │ │
│  │  - Clear on logout                                     │ │
│  │  - HttpOnly cookies                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ▼                                   │
│  Layer 6: Audit Logging                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - All events logged                                   │ │
│  │  - IP and user agent tracked                           │ │
│  │  - JSONB metadata storage                              │ │
│  │  - Indexed for fast queries                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                          DATABASE                               │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │      User        │                                          │
│  ├──────────────────┤                                          │
│  │ id (PK)          │                                          │
│  │ email            │                                          │
│  │ two_factor_      │                                          │
│  │   enabled        │                                          │
│  └────────┬─────────┘                                          │
│           │ one-to-one                                         │
│           ▼                                                    │
│  ┌──────────────────┐                                          │
│  │ TwoFactorSecret  │                                          │
│  ├──────────────────┤                                          │
│  │ id (PK)          │                                          │
│  │ user_id (FK)     │────────────► CASCADE DELETE             │
│  │ secret           │ ◄────────── Encrypted at rest           │
│  │ created_at       │                                          │
│  │ updated_at       │                                          │
│  └──────────────────┘                                          │
│                                                                 │
│           │ one-to-many                                        │
│           ▼                                                    │
│  ┌──────────────────┐                                          │
│  │   BackupCode     │                                          │
│  ├──────────────────┤                                          │
│  │ id (PK)          │                                          │
│  │ user_id (FK)     │────────────► CASCADE DELETE             │
│  │ code_hash        │ ◄────────── bcrypt hashed               │
│  │ used_at          │ ◄────────── NULL = unused               │
│  │ created_at       │                                          │
│  └──────────────────┘                                          │
│           │                                                    │
│           │ Index: user_id, used_at                            │
│           │                                                    │
│           │ one-to-many                                        │
│           ▼                                                    │
│  ┌──────────────────┐                                          │
│  │  TwoFactorLog    │                                          │
│  ├──────────────────┤                                          │
│  │ id (PK)          │                                          │
│  │ user_id (FK)     │────────────► CASCADE DELETE             │
│  │ event_type       │ ◄────────── enable/disable/login/etc    │
│  │ success          │                                          │
│  │ ip_address       │                                          │
│  │ user_agent       │                                          │
│  │ metadata (JSONB) │ ◄────────── Flexible data storage       │
│  │ created_at       │                                          │
│  └──────────────────┘                                          │
│           │                                                    │
│           │ Indexes:                                           │
│           │  - user_id + created_at DESC                       │
│           │  - event_type                                      │
│           │                                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Machine

### 2FA State Transitions

```
┌──────────────────────────────────────────────────────────────────┐
│                     2FA STATE MACHINE                            │
│                                                                  │
│  ┌────────────┐                                                 │
│  │  DISABLED  │ ◄─────────────────────────────┐                │
│  │            │                                │                │
│  │ 2fa_enabled│                                │                │
│  │   = false  │                                │                │
│  └──────┬─────┘                                │                │
│         │                                      │                │
│         │ User clicks "Enable 2FA"             │                │
│         │                                      │                │
│         ▼                                      │                │
│  ┌────────────┐                                │                │
│  │   SETUP    │                                │                │
│  │  PENDING   │                                │                │
│  │            │                                │                │
│  │ Secret     │                                │                │
│  │ generated  │                                │                │
│  │ but not    │                                │                │
│  │ verified   │                                │                │
│  └──────┬─────┘                                │                │
│         │                                      │                │
│         │ User enters correct code             │                │
│         │                                      │                │
│         ▼                                      │                │
│  ┌────────────┐                                │                │
│  │  ENABLED   │                                │                │
│  │            │                                │                │
│  │ 2fa_enabled│                                │                │
│  │   = true   │                                │                │
│  │            │                                │                │
│  │ TwoFactor  │                                │                │
│  │ Secret     │                                │                │
│  │ stored     │                                │                │
│  │            │                                │                │
│  │ 10 Backup  │                                │                │
│  │ Codes      │                                │                │
│  │ generated  │                                │                │
│  └──────┬─────┘                                │                │
│         │                                      │                │
│         │ User clicks "Disable 2FA" + code     │                │
│         │                                      │                │
│         └──────────────────────────────────────┘                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Session State During Login:

┌─────────────┐   OAuth    ┌──────────────┐   2FA Valid   ┌───────────┐
│  Not Auth   │ ────────►  │ Auth Pending │  ──────────►  │   Fully   │
│             │            │   2FA Check  │               │   Auth    │
│ No session  │            │              │               │           │
│             │            │ 2fa_verified │               │ 2fa_      │
│             │            │   = false    │               │ verified  │
│             │            │              │               │ = true    │
└─────────────┘            └──────────────┘               └───────────┘
```

---

## Component Interaction Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                    COMPONENT INTERACTIONS                          │
│                                                                    │
│  Browser                    Server                    Database    │
│                                                                    │
│  ┌──────────┐                                                     │
│  │  User    │                                                     │
│  │  Action  │                                                     │
│  └────┬─────┘                                                     │
│       │                                                           │
│       ▼                                                           │
│  ┌──────────────┐                                                │
│  │  React       │                                                │
│  │  Component   │                                                │
│  │              │                                                │
│  │ - Setup      │                                                │
│  │ - Prompt     │                                                │
│  │ - Settings   │                                                │
│  └──────┬───────┘                                                │
│         │                                                         │
│         │ HTTP POST                                               │
│         │                                                         │
│         ▼                                                         │
│         ┌────────────────┐                                        │
│         │  API Route     │                                        │
│         │  Handler       │                                        │
│         │                │                                        │
│         │ - Validate     │                                        │
│         │ - Authenticate │                                        │
│         └───────┬────────┘                                        │
│                 │                                                 │
│                 ▼                                                 │
│         ┌────────────────┐                                        │
│         │  Service Layer │                                        │
│         │  (two-factor   │                                        │
│         │   .ts)         │                                        │
│         │                │                                        │
│         │ - TOTP Logic   │                                        │
│         │ - Backup Codes │                                        │
│         │ - Rate Limit   │                                        │
│         └───────┬────────┘                                        │
│                 │                                                 │
│                 ▼                                                 │
│         ┌────────────────┐          ┌──────────────────┐         │
│         │  Prisma        │──────────│  PostgreSQL      │         │
│         │  Client        │  Queries │  Database        │         │
│         │                │          │                  │         │
│         │ - ORM Layer    │          │ - User           │         │
│         │ - Type Safety  │          │ - TwoFactorSecret│         │
│         │ - Migrations   │          │ - BackupCode     │         │
│         └───────┬────────┘          │ - TwoFactorLog   │         │
│                 │                   └──────────────────┘         │
│                 │                                                 │
│                 │ Response                                        │
│                 ▼                                                 │
│         ┌────────────────┐                                        │
│         │  JSON Response │                                        │
│         │                │                                        │
│         │ - Success/Error│                                        │
│         │ - Data         │                                        │
│         └───────┬────────┘                                        │
│                 │                                                 │
│                 │ HTTP Response                                   │
│                 ▼                                                 │
│  ┌──────────────────┐                                            │
│  │  React Component │                                            │
│  │  Updates         │                                            │
│  │                  │                                            │
│  │ - Show success   │                                            │
│  │ - Display data   │                                            │
│  │ - Handle errors  │                                            │
│  └──────────────────┘                                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRODUCTION DEPLOYMENT                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                         CDN / Edge                            │  │
│  │                      (Vercel Edge)                            │  │
│  │                                                               │  │
│  │  - Static assets                                              │  │
│  │  - Client-side code                                           │  │
│  │  - Middleware execution                                       │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                         │
│                           ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Next.js Application                        │  │
│  │                  (Serverless Functions)                       │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │  │   API       │  │  SSR Pages  │  │  2FA Middleware     │  │  │
│  │  │   Routes    │  │             │  │                     │  │  │
│  │  │             │  │  - Settings │  │  - Route protection │  │  │
│  │  │ /api/auth/  │  │  - Prompt   │  │  - Verification     │  │  │
│  │  │   2fa/*     │  │             │  │    checks           │  │  │
│  │  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │  │
│  └─────────┼──────────────────────────────────────────────────┘  │
│            │                                                       │
│            ▼                                                       │
│  ┌─────────────────────────┐     ┌──────────────────────────┐    │
│  │   PostgreSQL Database   │     │   Redis (Optional)       │    │
│  │                         │     │                          │    │
│  │  - User data            │     │  - Rate limiting         │    │
│  │  - TOTP secrets         │     │  - Session cache         │    │
│  │  - Backup codes         │     │  - Temporary data        │    │
│  │  - Audit logs           │     │                          │    │
│  └─────────────────────────┘     └──────────────────────────┘    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Monitoring & Logging                       │  │
│  │                                                               │  │
│  │  - 2FA event logs                                             │  │
│  │  - Failed attempt tracking                                    │  │
│  │  - Performance metrics                                        │  │
│  │  - Security alerts                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Scalable serverless deployment
- ✅ Multiple security layers
- ✅ Comprehensive audit trail
- ✅ Easy to maintain and extend
