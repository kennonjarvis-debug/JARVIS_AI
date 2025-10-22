# Week 2 Implementation Guide

Quick start guide for implementing PRs #3 and #4.

## Prerequisites

- [ ] Read WEEK_2_PR_3_4_DESIGN.md for full specification
- [ ] Database migrations ready (in `packages/backend/supabase/migrations/`)
- [ ] TypeScript types defined (in `packages/backend/src/types/week2.types.ts`)
- [ ] Stripe account configured with products

---

## Step 1: Database Migrations (30 minutes)

### Apply Migrations

```bash
cd packages/backend

# Apply migrations in order
psql $SUPABASE_DATABASE_URL -f supabase/migrations/20250120_add_onboarding_to_observatories.sql
psql $SUPABASE_DATABASE_URL -f supabase/migrations/20250120_create_subscriptions_table.sql
psql $SUPABASE_DATABASE_URL -f supabase/migrations/20250120_create_connections_tables.sql
```

### Verify Migrations

```sql
-- Check observatories table has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'observatories' AND column_name IN ('onboarding_completed', 'onboarding_data');

-- Check subscriptions table exists
SELECT COUNT(*) FROM subscriptions;

-- Check connections tables exist
SELECT COUNT(*) FROM connections;
SELECT COUNT(*) FROM connection_settings;
SELECT COUNT(*) FROM business_info_extractions;
```

---

## Step 2: Stripe Configuration (20 minutes)

### Create Stripe Products

```bash
# Login to Stripe
stripe login

# Create Additional Business product
stripe products create \
  --name="Additional Business" \
  --description="Add another business to your Jarvis account"

# Create price (save the price ID)
stripe prices create \
  --product=<PRODUCT_ID_FROM_ABOVE> \
  --unit-amount=2900 \
  --currency=usd \
  --recurring[interval]=month
```

### Update Environment Variables

```bash
# Add to packages/backend/.env
STRIPE_ADDITIONAL_BUSINESS_PRICE_ID=price_xxxxxxxxxxxxx
```

---

## Step 3: PR #3 Implementation (6-8 hours)

### Part 1: Business Onboarding Flow (2-3 hours)

**Backend:**

```bash
# Create onboarding routes
touch packages/backend/src/routes/onboarding.ts
```

```typescript
// packages/backend/src/routes/onboarding.ts
import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { completeOnboarding } from '../controllers/onboarding';

const router = Router();

// POST /api/onboarding/complete
router.post('/complete', authenticateUser, completeOnboarding);

export default router;
```

**Frontend:**

```bash
# Create onboarding components
mkdir -p packages/frontend/src/pages/Onboarding
touch packages/frontend/src/pages/Onboarding/BusinessOnboarding.tsx
touch packages/frontend/src/pages/Onboarding/OnboardingSteps.tsx
```

**Tasks:**
- [ ] Create onboarding controller in backend
- [ ] Create onboarding UI components
- [ ] Implement step-by-step wizard
- [ ] Connect to API endpoints
- [ ] Add form validation
- [ ] Test onboarding flow end-to-end

### Part 2: Multi-Business Sidebar (2-3 hours)

**Frontend:**

```bash
# Update sidebar components
mkdir -p packages/frontend/src/components/Sidebar
touch packages/frontend/src/components/Sidebar/BusinessCard.tsx
touch packages/frontend/src/components/Sidebar/BusinessSwitcher.tsx
touch packages/frontend/src/components/Sidebar/AddBusinessButton.tsx
```

```typescript
// packages/frontend/src/store/businessSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { Observatory } from '../../types/week2.types';

interface BusinessState {
  businesses: Observatory[];
  activeBusiness: Observatory | null;
  loading: boolean;
}

const businessSlice = createSlice({
  name: 'business',
  initialState: {
    businesses: [],
    activeBusiness: null,
    loading: false,
  } as BusinessState,
  reducers: {
    setActiveBusiness: (state, action) => {
      state.activeBusiness = action.payload;
      localStorage.setItem('activeBusinessId', action.payload.id);
    },
    // ... other reducers
  },
});
```

**Tasks:**
- [ ] Create business state management (Redux/Zustand)
- [ ] Design and implement sidebar UI
- [ ] Implement business switcher dropdown
- [ ] Add active business indicator
- [ ] Persist active business to localStorage
- [ ] Filter all data by active business

### Part 3: Stripe Payment Gate (2 hours)

**Backend:**

```bash
# Create business routes with payment validation
touch packages/backend/src/routes/businesses.ts
touch packages/backend/src/middleware/businessLimit.ts
```

```typescript
// packages/backend/src/middleware/businessLimit.ts
export const checkBusinessLimit = async (req, res, next) => {
  const userId = req.user.id;

  // Count businesses
  const { count: businessCount } = await supabase
    .from('observatory_members')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('role', 'owner');

  // Count subscriptions
  const { count: subCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('type', 'additional_business')
    .eq('status', 'active');

  const maxBusinesses = 1 + (subCount || 0);

  if (businessCount >= maxBusinesses) {
    return res.status(403).json({
      error: 'Business limit reached',
      requiresPayment: true,
    });
  }

  next();
};
```

**Frontend:**

```bash
# Create payment components
touch packages/frontend/src/components/Payment/BusinessCheckout.tsx
```

**Tasks:**
- [ ] Implement business limit middleware
- [ ] Create Stripe checkout endpoint
- [ ] Handle Stripe webhooks
- [ ] Create checkout UI component
- [ ] Test payment flow end-to-end
- [ ] Test subscription updates and cancellations

---

## Step 4: PR #4 Implementation (10-12 hours)

### Part 1: Connection Infrastructure (3-4 hours)

**Backend:**

```bash
# Create connection routes and services
touch packages/backend/src/routes/connections.ts
mkdir -p packages/backend/src/integrations
touch packages/backend/src/integrations/BaseIntegration.ts
```

```typescript
// packages/backend/src/integrations/BaseIntegration.ts
export abstract class BaseIntegration {
  abstract type: ConnectionType;
  abstract provider: ConnectionProvider;

  abstract testConnection(config: ConnectionConfig): Promise<boolean>;
  abstract sync(connectionId: string): Promise<void>;
  abstract disconnect(connectionId: string): Promise<void>;
}
```

**Frontend:**

```bash
# Create connections page and components
mkdir -p packages/frontend/src/pages/Connections
touch packages/frontend/src/pages/Connections/ConnectionsPage.tsx
touch packages/frontend/src/components/Connections/ConnectionCard.tsx
touch packages/frontend/src/components/Connections/ConnectionsGrid.tsx
```

**Tasks:**
- [ ] Create base integration class
- [ ] Implement connection CRUD endpoints
- [ ] Create connections state management
- [ ] Design and implement connections dashboard
- [ ] Add connection status indicators
- [ ] Implement sync triggers

### Part 2: Gmail & Calendar (2-3 hours)

```bash
# Create Google OAuth integrations
mkdir -p packages/backend/src/integrations/gmail
mkdir -p packages/backend/src/integrations/calendar
touch packages/backend/src/integrations/gmail/oauth.ts
touch packages/backend/src/integrations/gmail/sync.ts
touch packages/backend/src/integrations/calendar/oauth.ts
touch packages/backend/src/integrations/calendar/sync.ts
```

**Environment Setup:**

```bash
# Add to .env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
```

**Tasks:**
- [ ] Set up Google Cloud project
- [ ] Configure OAuth consent screen
- [ ] Implement Gmail OAuth flow
- [ ] Implement Gmail sync service
- [ ] Implement Calendar OAuth flow
- [ ] Implement Calendar sync service
- [ ] Test both integrations end-to-end

### Part 3: CRM Integration (2-3 hours)

```bash
# Create CRM integrations
mkdir -p packages/backend/src/integrations/crm
touch packages/backend/src/integrations/crm/base.ts
touch packages/backend/src/integrations/crm/hubspot.ts
touch packages/backend/src/integrations/crm/salesforce.ts
```

**Environment Setup:**

```bash
# Add to .env
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
```

**Tasks:**
- [ ] Create base CRM integration class
- [ ] Implement HubSpot OAuth
- [ ] Implement HubSpot sync (contacts, deals)
- [ ] Implement Salesforce OAuth (optional)
- [ ] Create CRM selection UI
- [ ] Test CRM sync

### Part 4: Database Connections (2 hours)

```bash
# Create database integrations
mkdir -p packages/backend/src/integrations/database
touch packages/backend/src/integrations/database/base.ts
touch packages/backend/src/integrations/database/postgresql.ts
touch packages/backend/src/integrations/database/mysql.ts
```

**Tasks:**
- [ ] Implement database connection testing
- [ ] Implement table discovery
- [ ] Implement change watching (LISTEN/NOTIFY)
- [ ] Create database connection UI
- [ ] Add security warnings for read-only users
- [ ] Test with PostgreSQL
- [ ] Test with MySQL (optional)

### Part 5: Mac Companion App (3-4 hours)

```bash
# Create new Electron app
mkdir packages/mac-companion
cd packages/mac-companion
npm init -y
npm install electron electron-builder applescript
```

**Structure:**

```
packages/mac-companion/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Preload script
│   ├── api/
│   │   └── client.ts        # API client for Jarvis backend
│   ├── integrations/
│   │   ├── iMessage.ts      # iMessage integration
│   │   ├── notes.ts         # Notes integration
│   │   └── voicememos.ts    # Voice Memos integration
│   └── windows/
│       ├── pairing.html     # QR code pairing window
│       └── settings.html    # Settings window
├── package.json
└── electron-builder.json
```

**Tasks:**
- [ ] Set up Electron project
- [ ] Implement pairing flow with QR code
- [ ] Implement iMessage integration (AppleScript)
- [ ] Implement Notes integration
- [ ] Implement Voice Memos integration
- [ ] Add Whisper API for transcription
- [ ] Create system tray icon
- [ ] Sign and notarize for macOS
- [ ] Create installer

### Part 6: Business Info Extraction (1-2 hours)

```bash
# Create extraction service
touch packages/backend/src/services/BusinessInfoExtractor.ts
```

```typescript
// packages/backend/src/services/BusinessInfoExtractor.ts
export class BusinessInfoExtractor {
  async extractFromGmail(connectionId: string) {
    // Extract email, website, phone from signatures
  }

  async extractFromCalendar(connectionId: string) {
    // Extract location from common meeting places
  }

  async extractFromCRM(connectionId: string) {
    // Extract industry, deal size, target customers
  }

  async extractFromDatabase(connectionId: string) {
    // Extract customer count, revenue metrics
  }
}
```

**Frontend:**

```bash
# Create extraction UI
touch packages/frontend/src/components/BusinessInfo/ExtractionSuggestions.tsx
```

**Tasks:**
- [ ] Implement extraction algorithms
- [ ] Store extractions in database
- [ ] Create suggestion UI
- [ ] Implement apply/dismiss actions
- [ ] Test extraction from all sources
- [ ] Verify business profile updates

---

## Step 5: Testing (2-3 hours)

### Unit Tests

```bash
# Backend
npm run test:backend

# Frontend
npm run test:frontend
```

### Integration Tests

```bash
# Create test files
touch packages/backend/tests/onboarding.test.ts
touch packages/backend/tests/businesses.test.ts
touch packages/backend/tests/connections.test.ts
touch packages/backend/tests/stripe.test.ts
```

### E2E Tests

```bash
# Create Playwright tests
mkdir -p packages/frontend/e2e
touch packages/frontend/e2e/onboarding.spec.ts
touch packages/frontend/e2e/multi-business.spec.ts
touch packages/frontend/e2e/connections.spec.ts
```

**Test Scenarios:**
- [ ] New user onboarding flow
- [ ] Create second business with payment
- [ ] Switch between businesses
- [ ] Connect Gmail
- [ ] Connect Calendar
- [ ] Connect CRM
- [ ] Connect Database
- [ ] Business info extraction
- [ ] Subscription cancellation

---

## Step 6: Documentation (1 hour)

### User Documentation

```bash
# Create user guides
mkdir -p docs/user-guides
touch docs/user-guides/getting-started.md
touch docs/user-guides/multi-business-setup.md
touch docs/user-guides/connecting-gmail.md
touch docs/user-guides/connecting-crm.md
```

### Developer Documentation

```bash
# Update API documentation
touch docs/api/onboarding.md
touch docs/api/businesses.md
touch docs/api/connections.md
```

**Tasks:**
- [ ] Document onboarding flow
- [ ] Document multi-business management
- [ ] Document all connection types
- [ ] Document API endpoints
- [ ] Create video tutorials (optional)

---

## Deployment Checklist

### Environment Variables

```bash
# Production .env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_ADDITIONAL_BUSINESS_PRICE_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
ANTHROPIC_API_KEY=
```

### Database

- [ ] Migrations applied to production
- [ ] RLS policies verified
- [ ] Indexes created
- [ ] Backup strategy in place

### Stripe

- [ ] Webhooks configured
- [ ] Products created
- [ ] Prices set correctly
- [ ] Test mode → Live mode

### Google OAuth

- [ ] OAuth consent screen published
- [ ] Scopes approved
- [ ] Redirect URIs configured
- [ ] API quotas checked

### Mac Companion

- [ ] App signed with Apple Developer certificate
- [ ] App notarized by Apple
- [ ] DMG installer created
- [ ] Download page created

---

## Monitoring & Analytics

### Add Tracking

```typescript
// Track key events
analytics.track('Onboarding Completed', { businessId, industry });
analytics.track('Business Created', { isPaid, subscriptionId });
analytics.track('Connection Added', { type, provider });
analytics.track('Business Switched', { fromId, toId });
```

### Error Monitoring

```bash
# Set up Sentry
npm install @sentry/node @sentry/react

# Add to backend
Sentry.init({ dsn: process.env.SENTRY_DSN });

# Add to frontend
Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN });
```

### Performance Monitoring

- [ ] Monitor connection sync times
- [ ] Monitor extraction processing times
- [ ] Monitor Stripe webhook latency
- [ ] Set up alerts for errors

---

## Success Metrics

### PR #3 Metrics

- [ ] % of new users completing onboarding
- [ ] Average time to complete onboarding
- [ ] % of users creating second business
- [ ] Conversion rate for additional business payment
- [ ] Active business switches per user per day

### PR #4 Metrics

- [ ] Connections added per user
- [ ] Most popular connection types
- [ ] Connection success rate
- [ ] Time to first sync
- [ ] Business info extraction accuracy
- [ ] % of extractions applied vs dismissed

---

## Rollout Strategy

### Phase 1: Internal Testing (Week 2, Days 1-3)

- [ ] Deploy to staging
- [ ] Internal team testing
- [ ] Fix critical bugs

### Phase 2: Beta Users (Week 2, Days 4-6)

- [ ] Invite 10-20 beta users
- [ ] Collect feedback
- [ ] Iterate on UX

### Phase 3: General Availability (Week 2, Day 7+)

- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Support rollout

---

## Troubleshooting

### Common Issues

**Onboarding not showing:**
- Check `onboarding_completed` flag in database
- Verify new user creation flow

**Payment gate not working:**
- Verify Stripe price ID in .env
- Check webhook endpoint is accessible
- Verify webhook signature validation

**Connections failing:**
- Check OAuth redirect URIs
- Verify API credentials
- Check token expiration handling

**Business info not extracting:**
- Verify extraction service is running
- Check confidence thresholds
- Verify data sources are syncing

---

## Next Steps After Week 2

1. **Week 3: Polish & Optimization**
   - Performance optimization
   - UI/UX improvements
   - Bug fixes

2. **Week 4: Advanced Features**
   - Bulk connection management
   - Connection templates
   - Advanced extraction rules

3. **Future Enhancements**
   - Mobile app
   - Browser extension
   - Zapier integration
   - API for custom integrations

---

## Support Resources

- **Design Spec:** WEEK_2_PR_3_4_DESIGN.md
- **Type Definitions:** packages/backend/src/types/week2.types.ts
- **Migrations:** packages/backend/supabase/migrations/
- **Example Code:** See design spec for code examples

**Questions?** Contact the development team or create an issue on GitHub.
