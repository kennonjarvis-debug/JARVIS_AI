# GDPR Compliance Documentation

**Jarvis AI Platform**
**Last Updated:** October 2025
**Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [GDPR Principles Implementation](#gdpr-principles-implementation)
3. [User Rights Implementation](#user-rights-implementation)
4. [API Endpoints](#api-endpoints)
5. [Data Retention Policies](#data-retention-policies)
6. [Consent Management](#consent-management)
7. [Security Measures](#security-measures)
8. [Data Processing Activities](#data-processing-activities)
9. [Third-Party Processors](#third-party-processors)
10. [Compliance Checklist](#compliance-checklist)
11. [Integration Guide](#integration-guide)

---

## Overview

Jarvis implements comprehensive GDPR compliance measures to protect user privacy and provide transparent data processing practices. This document outlines our technical implementation of GDPR requirements.

### Key Features

- ✅ **Right to Access** - Users can export all personal data
- ✅ **Right to Erasure** - Complete account deletion with 30-day grace period
- ✅ **Right to Rectification** - Users can update their information
- ✅ **Right to Data Portability** - Machine-readable data export (JSON/ZIP)
- ✅ **Consent Management** - Granular control over data processing
- ✅ **Data Retention** - Automatic cleanup of old data
- ✅ **Privacy by Design** - Built-in privacy controls
- ✅ **Audit Trail** - Complete logging of privacy actions

---

## GDPR Principles Implementation

### 1. Lawfulness, Fairness, and Transparency (Article 5(1)(a))

**Implementation:**
- Clear privacy policy and terms of service
- Cookie consent banner with detailed explanations
- Transparent data processing notices
- Regular privacy policy updates with version tracking

**Files:**
- `/web/jarvis-web/components/CookieConsent.tsx`
- Privacy policy served at `/privacy-policy`

### 2. Purpose Limitation (Article 5(1)(b))

**Implementation:**
- Data collected only for specified purposes
- Separate consent types for different processing activities:
  - Essential (service functionality)
  - Functional (enhanced features)
  - Analytics (service improvement)
  - Marketing (promotional content)

**Files:**
- `/src/api/privacy/consent.ts` - `ConsentType` enum

### 3. Data Minimization (Article 5(1)(c))

**Implementation:**
- Only collect necessary data for service operation
- Optional fields for enhanced features
- Minimal personal information required for signup
- Activity monitoring disabled by default

### 4. Accuracy (Article 5(1)(d))

**Implementation:**
- Users can update profile information anytime
- Settings page for data correction
- Regular data validation and cleanup

### 5. Storage Limitation (Article 5(1)(e))

**Implementation:**
- Automated data retention policies
- Regular cleanup of old data
- Configurable retention periods per data type

**Files:**
- `/src/services/data-retention.service.ts`

**Default Retention Periods:**
- Usage logs: 90 days
- Activity logs: 7 days
- Session data: 30 days
- Temp files: 1 day
- Deleted accounts: 30 days (grace period)
- Audit logs: 365 days

### 6. Integrity and Confidentiality (Article 5(1)(f))

**Implementation:**
- Encrypted data transmission (HTTPS/TLS)
- Database encryption at rest
- Access controls and authentication
- Regular security audits
- Audit logging for sensitive operations

---

## User Rights Implementation

### Right to Access (Article 15)

**Endpoint:** `GET /api/privacy/export`

**Features:**
- Export all personal data in JSON format
- Optional ZIP archive with README
- Includes:
  - User profile
  - Subscription details
  - Usage statistics
  - Usage logs
  - Observatories
  - Projects metadata
  - API keys (hashed)
  - Activity logs (if enabled)

**Usage:**
```bash
curl -X GET "https://api.jarvis.ai/api/privacy/export?format=json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "subscription": { ... },
    "usageStats": { ... },
    "usageLogs": [ ... ],
    "observatories": [ ... ],
    "projects": [ ... ],
    "apiKeys": [ ... ],
    "metadata": {
      "exportDate": "2025-10-17T12:00:00Z",
      "dataFormat": "JSON",
      "gdprCompliant": true
    }
  }
}
```

### Right to Erasure (Article 17)

**Endpoint:** `DELETE /api/privacy/delete-account`

**Features:**
- Immediate or scheduled (30-day grace period) deletion
- Complete data removal across all systems
- Cancels active subscriptions
- Deletes all user files
- Maintains audit log for compliance

**Usage:**
```bash
curl -X DELETE "https://api.jarvis.ai/api/privacy/delete-account" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "immediateDelete": false,
    "reason": "No longer need the service"
  }'
```

**Deletion Process:**
1. Cancel active subscription
2. Mark account for deletion
3. 30-day grace period (unless immediate)
4. Complete data erasure:
   - User profile
   - Subscription data
   - Usage logs
   - Observatories
   - Projects
   - API keys
   - Activity monitoring data
   - User files

### Right to Data Portability (Article 20)

**Endpoint:** `GET /api/privacy/export?format=zip`

**Features:**
- Machine-readable format (JSON)
- Structured data export
- Compatible with other services
- ZIP archive with documentation

### Right to Object (Article 21)

**Implementation:**
- Users can object to specific data processing via consent management
- Can disable activity monitoring
- Can opt-out of marketing communications
- Can revoke third-party data sharing

### Right to Restrict Processing (Article 18)

**Implementation:**
- Users can pause account (keep data but disable processing)
- Can disable specific features
- Can limit data collection scope

---

## API Endpoints

### Data Export

```typescript
GET /api/privacy/export
Query Parameters:
  - format: "json" | "zip" (default: "json")
  - includeUsageLogs: boolean (default: true)

Headers:
  - Authorization: Bearer <token>

Response: JSON or ZIP file
```

### Account Deletion

```typescript
DELETE /api/privacy/delete-account
Body:
  {
    "confirmationCode": string (optional),
    "reason": string (optional),
    "immediateDelete": boolean (default: false)
  }

Headers:
  - Authorization: Bearer <token>

Response:
  {
    "success": boolean,
    "userId": string,
    "scheduledDate": string (if not immediate),
    "recordsDeleted": { ... }
  }
```

### Cancel Deletion

```typescript
POST /api/privacy/cancel-deletion

Headers:
  - Authorization: Bearer <token>

Response:
  {
    "success": boolean,
    "message": string
  }
```

### Get Consent Preferences

```typescript
GET /api/privacy/consent

Headers:
  - Authorization: Bearer <token>

Response:
  {
    "success": boolean,
    "data": {
      "preferences": {
        "essential": boolean,
        "functional": boolean,
        "analytics": boolean,
        "marketing": boolean,
        "thirdParty": boolean
      },
      "lastUpdated": string,
      "policyVersion": string
    }
  }
```

### Update Consent Preferences

```typescript
POST /api/privacy/consent
Body:
  {
    "preferences": {
      "essential": boolean,
      "functional": boolean,
      "analytics": boolean,
      "marketing": boolean,
      "thirdParty": boolean
    }
  }

Headers:
  - Authorization: Bearer <token>

Response:
  {
    "success": boolean,
    "message": string,
    "data": { ... }
  }
```

### Withdraw Consent

```typescript
POST /api/privacy/consent/withdraw
Body:
  {
    "consentType": "FUNCTIONAL" | "ANALYTICS" | "MARKETING" | "THIRD_PARTY"
  }

Headers:
  - Authorization: Bearer <token>

Response:
  {
    "success": boolean,
    "message": string
  }
```

### Get Consent History

```typescript
GET /api/privacy/consent/history

Headers:
  - Authorization: Bearer <token>

Response:
  {
    "success": boolean,
    "data": {
      "history": [ ... ],
      "count": number
    }
  }
```

---

## Data Retention Policies

### Automatic Cleanup

The Data Retention Service (`DataRetentionService`) runs daily at 2:00 AM to automatically delete old data according to configured policies.

**Configuration:**

```typescript
import { dataRetentionService } from './services/data-retention.service';

// Start automatic cleanup
dataRetentionService.start();

// Update retention period
dataRetentionService.updatePolicy('usage_logs', 60); // 60 days

// Add custom policy
dataRetentionService.addPolicy({
  dataType: 'custom_data',
  retentionDays: 30,
  autoDelete: true,
  description: 'Custom data type'
});

// Manual cleanup
const results = await dataRetentionService.runCleanup();
```

### Default Policies

| Data Type | Retention Period | Auto-Delete |
|-----------|------------------|-------------|
| Usage Logs | 90 days | Yes |
| Activity Logs | 7 days | Yes |
| Session Data | 30 days | Yes |
| Temp Files | 1 day | Yes |
| Deleted Accounts | 30 days | Yes |
| Audit Logs | 365 days | No |
| Error Logs | 30 days | Yes |

### Custom Retention Periods

Users with Enterprise plans can configure custom retention periods for their organization.

---

## Consent Management

### Consent Types

```typescript
enum ConsentType {
  ESSENTIAL = 'ESSENTIAL',       // Required (cannot be disabled)
  FUNCTIONAL = 'FUNCTIONAL',     // Activity monitoring, proactive AI
  ANALYTICS = 'ANALYTICS',       // Usage tracking, improvements
  MARKETING = 'MARKETING',       // Promotional emails
  THIRD_PARTY = 'THIRD_PARTY'    // Google OAuth, Stripe, etc.
}
```

### Consent Flow

1. **First Visit:** Cookie consent banner displayed
2. **User Choice:** Accept All, Reject All, or Customize
3. **Storage:** Preferences saved to localStorage + database
4. **Application:** Consent applied to features
5. **Updates:** User can modify anytime in settings

### Frontend Integration

```typescript
import CookieConsent, { hasConsent } from '@/components/CookieConsent';

// In your layout/app component
<CookieConsent />

// Check consent before feature use
if (hasConsent('functional')) {
  // Enable activity monitoring
  await startActivityMonitoring();
}

if (hasConsent('analytics')) {
  // Initialize analytics
  initializeGoogleAnalytics();
}
```

---

## Security Measures

### Data Encryption

- **In Transit:** TLS 1.3 for all API communications
- **At Rest:** PostgreSQL encryption, encrypted file storage
- **Backups:** Encrypted database backups

### Access Controls

- Role-based access control (RBAC)
- JWT authentication with short expiry
- API rate limiting
- IP-based restrictions (configurable)

### Audit Logging

All privacy-sensitive operations are logged:
- Data exports
- Account deletions
- Consent changes
- Data access requests

**Audit Log Table:**
```sql
CREATE TABLE gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Data Processing Activities

### Personal Data We Collect

1. **Account Data**
   - Email address
   - Name
   - Google ID (OAuth)
   - Role

2. **Subscription Data**
   - Plan tier
   - Billing information (via Stripe)
   - Usage limits
   - Subscription status

3. **Usage Data**
   - AI requests
   - Feature usage
   - Error logs
   - Performance metrics

4. **Activity Data** (Optional - requires consent)
   - Application usage
   - Screen recordings
   - Audio samples
   - Interaction patterns

### Legal Basis for Processing

| Data Type | Legal Basis | Purpose |
|-----------|-------------|---------|
| Account Data | Contract | Service provision |
| Subscription | Contract | Billing and access control |
| Usage Data | Legitimate Interest | Service improvement, support |
| Activity Data | Consent | Proactive AI features |
| Marketing | Consent | Promotional communications |
| Analytics | Consent | Product improvement |

---

## Third-Party Processors

### Data Processor Agreement (DPA)

We have Data Processing Agreements with all third-party processors.

| Processor | Purpose | Data Shared | Location |
|-----------|---------|-------------|----------|
| Stripe | Payment processing | Email, billing info | USA |
| Google OAuth | Authentication | Email, name, profile | USA |
| AWS | Infrastructure hosting | All service data | USA/EU (configurable) |
| OpenAI | AI processing | Prompts, responses | USA |
| Anthropic | AI processing | Prompts, responses | USA |

### Sub-processors

Users can request a complete list of sub-processors at any time.

---

## Compliance Checklist

### Implementation Status

- [x] Privacy Policy published
- [x] Cookie consent banner
- [x] Data export functionality
- [x] Account deletion process
- [x] Consent management system
- [x] Data retention policies
- [x] Audit logging
- [x] Encrypted data storage
- [x] Secure API endpoints
- [x] User authentication
- [ ] Data Protection Impact Assessment (DPIA) - In Progress
- [ ] Privacy Policy translations (EU languages) - Planned
- [ ] DPO appointment - Planned for production

### Ongoing Requirements

- Monthly security audits
- Quarterly privacy policy review
- Annual GDPR compliance audit
- Regular data retention cleanup
- Incident response plan testing

---

## Integration Guide

### Backend Integration

1. **Add privacy routes to gateway:**

```typescript
// src/core/gateway.ts
import { exportUserData, authenticateUser } from '../api/privacy/export-data.js';
import { deleteUserAccount, cancelAccountDeletion } from '../api/privacy/delete-account.js';
import consentHandlers from '../api/privacy/consent.js';

// Add routes
app.get('/api/privacy/export', authenticateUser, exportUserData);
app.delete('/api/privacy/delete-account', authenticateUser, deleteUserAccount);
app.post('/api/privacy/cancel-deletion', authenticateUser, cancelAccountDeletion);
app.get('/api/privacy/consent', authenticateUser, consentHandlers.getConsentPreferences);
app.post('/api/privacy/consent', authenticateUser, consentHandlers.updateConsentPreferences);
app.post('/api/privacy/consent/withdraw', authenticateUser, consentHandlers.withdrawConsent);
app.get('/api/privacy/consent/history', authenticateUser, consentHandlers.getConsentHistory);
```

2. **Start data retention service:**

```typescript
// src/main.ts
import { dataRetentionService } from './services/data-retention.service.js';

// Start automatic cleanup
if (process.env.DATA_RETENTION_ENABLED === 'true') {
  dataRetentionService.start();
  logger.info('Data retention service started');
}
```

3. **Add database tables:**

```sql
-- User Consents
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  version VARCHAR(20) NOT NULL,
  UNIQUE(user_id, consent_type)
);

-- Deletion Requests
CREATE TABLE deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP NOT NULL,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GDPR Audit Log
CREATE TABLE gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Frontend Integration

1. **Add CookieConsent to layout:**

```typescript
// app/layout.tsx
import CookieConsent from '@/components/CookieConsent';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
```

2. **Add privacy settings page:**

Create a settings page where users can:
- View their data
- Export their data
- Manage consent preferences
- Delete their account

3. **Check consent before features:**

```typescript
import { hasConsent } from '@/components/CookieConsent';

// Before enabling activity monitoring
if (hasConsent('functional')) {
  enableActivityMonitoring();
}
```

### Environment Variables

```bash
# Data Retention
DATA_RETENTION_ENABLED=true

# Privacy Policy
PRIVACY_POLICY_VERSION=1.0

# Audit Logging
GDPR_AUDIT_ENABLED=true
```

---

## Support & Contacts

### Data Protection Officer (DPO)
- **Email:** dpo@jarvis.ai
- **Response Time:** 72 hours

### Privacy Inquiries
- **Email:** privacy@jarvis.ai
- **Support Portal:** https://support.jarvis.ai

### Data Subject Requests
Users can submit requests via:
1. In-app settings (preferred)
2. Email to privacy@jarvis.ai
3. Support ticket

**Response Time:** 30 days (per GDPR Article 12)

---

## Appendices

### Appendix A: Data Flow Diagram

```
User → Frontend → API Gateway → Privacy Endpoints → Database
                                                   → File Storage
                                                   → Audit Log
```

### Appendix B: Incident Response Plan

In case of data breach:
1. Contain incident immediately
2. Assess scope and severity
3. Notify DPO within 1 hour
4. Notify affected users within 72 hours (if high risk)
5. Report to supervisory authority (if required)
6. Document incident in audit log

### Appendix C: User Rights Request Form

Available at: https://jarvis.ai/privacy/request-form

### Appendix D: Privacy by Design Principles

1. Proactive not reactive
2. Privacy as default setting
3. Privacy embedded into design
4. Full functionality (positive-sum, not zero-sum)
5. End-to-end security
6. Visibility and transparency
7. Respect for user privacy

---

**Document Version:** 1.0
**Last Review:** October 2025
**Next Review:** January 2026
**Approved By:** Engineering & Legal Teams
