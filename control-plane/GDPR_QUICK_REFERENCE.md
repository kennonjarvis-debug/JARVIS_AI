# GDPR Implementation - Quick Reference

## Files Created

### Privacy API Endpoints
```
/Users/benkennon/Jarvis/src/api/privacy/
├── export-data.ts       - Data export (Article 15)
├── delete-account.ts    - Account deletion (Article 17)
├── consent.ts           - Consent management (Article 7)
└── index.ts             - Centralized exports
```

### Services
```
/Users/benkennon/Jarvis/src/services/
└── data-retention.service.ts - Automatic data cleanup
```

### Frontend
```
/Users/benkennon/Jarvis/web/jarvis-web/components/
└── CookieConsent.tsx    - Cookie consent banner
```

### Documentation
```
/Users/benkennon/Jarvis/docs/
└── GDPR_COMPLIANCE.md   - Complete compliance guide
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/privacy/export` | Export user data |
| DELETE | `/api/privacy/delete-account` | Delete account |
| POST | `/api/privacy/cancel-deletion` | Cancel deletion |
| GET | `/api/privacy/consent` | Get consent preferences |
| POST | `/api/privacy/consent` | Update consent |
| POST | `/api/privacy/consent/withdraw` | Withdraw consent |
| GET | `/api/privacy/consent/history` | View consent history |

---

## Quick Integration

### 1. Install Dependencies
```bash
npm install archiver cron
```

### 2. Add Routes to Gateway
```typescript
// src/core/gateway.ts
import privacyHandlers from '../api/privacy/index.js';

app.get('/api/privacy/export', authenticateUser, privacyHandlers.exportUserData);
app.delete('/api/privacy/delete-account', authenticateUser, privacyHandlers.deleteUserAccount);
app.post('/api/privacy/cancel-deletion', authenticateUser, privacyHandlers.cancelAccountDeletion);
app.get('/api/privacy/consent', authenticateUser, privacyHandlers.getConsentPreferences);
app.post('/api/privacy/consent', authenticateUser, privacyHandlers.updateConsentPreferences);
app.post('/api/privacy/consent/withdraw', authenticateUser, privacyHandlers.withdrawConsent);
app.get('/api/privacy/consent/history', authenticateUser, privacyHandlers.getConsentHistory);
```

### 3. Start Data Retention Service
```typescript
// src/main.ts
import { dataRetentionService } from './services/data-retention.service.js';

dataRetentionService.start();
```

### 4. Add Cookie Consent Banner
```typescript
// web/jarvis-web/app/layout.tsx
import CookieConsent from '@/components/CookieConsent';

<CookieConsent />
```

### 5. Create Database Tables
```sql
-- Run migrations in docs/GDPR_COMPLIANCE.md
CREATE TABLE user_consents (...);
CREATE TABLE deletion_requests (...);
CREATE TABLE gdpr_audit_log (...);
```

### 6. Set Environment Variables
```bash
DATA_RETENTION_ENABLED=true
PRIVACY_POLICY_VERSION=1.0
GDPR_AUDIT_ENABLED=true
```

---

## Testing Commands

```bash
# Export data
curl -X GET "http://localhost:4000/api/privacy/export?format=json" \
  -H "Authorization: Bearer TOKEN"

# Delete account
curl -X DELETE "http://localhost:4000/api/privacy/delete-account" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"immediateDelete": false}'

# Get consent
curl -X GET "http://localhost:4000/api/privacy/consent" \
  -H "Authorization: Bearer TOKEN"

# Update consent
curl -X POST "http://localhost:4000/api/privacy/consent" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preferences": {"functional": true, "analytics": false}}'
```

---

## Data Retention Policies

| Data Type | Retention | Auto-Delete |
|-----------|-----------|-------------|
| Usage logs | 90 days | Yes |
| Activity logs | 7 days | Yes |
| Session data | 30 days | Yes |
| Temp files | 1 day | Yes |
| Deleted accounts | 30 days | Yes |
| Audit logs | 365 days | No |

---

## Consent Types

- **ESSENTIAL** - Required (always active)
- **FUNCTIONAL** - Activity monitoring, proactive AI
- **ANALYTICS** - Usage tracking, improvements
- **MARKETING** - Promotional emails
- **THIRD_PARTY** - Google OAuth, Stripe, etc.

---

## User Rights Implemented

✅ Right to Access (Article 15)
✅ Right to Erasure (Article 17)
✅ Right to Rectification (Article 16)
✅ Right to Data Portability (Article 20)
✅ Right to Object (Article 21)
✅ Right to Restrict Processing (Article 18)
✅ Right to be Informed (Articles 13-14)

---

## Support

**Full Documentation:** `/Users/benkennon/Jarvis/docs/GDPR_COMPLIANCE.md`
**Implementation Guide:** `/Users/benkennon/Jarvis/GDPR_IMPLEMENTATION_COMPLETE.md`
