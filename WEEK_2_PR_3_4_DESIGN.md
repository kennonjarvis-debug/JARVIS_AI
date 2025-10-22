# Week 2: PR #3 & #4 Design Specification

## Overview

Comprehensive design for Week 2 implementation focusing on business-centric onboarding, multi-business support, and seamless integration connections.

**Timeline**: 16-20 hours total
- PR #3: Business Onboarding & Multi-Business Support (6-8 hours)
- PR #4: Easy Integration Connections (10-12 hours)

---

## PR #3: Business Onboarding & Multi-Business Support

### Objective
Transform Jarvis from single-user tool to multi-business platform with intelligent onboarding, payment gates, and contextual business management.

### 1. Business Onboarding Flow

#### 1.1 Signup Flow with Business Questions

**After email/Google signup, before dashboard access:**

```
Step 1: Welcome Screen
┌─────────────────────────────────────┐
│  Welcome to Jarvis!                 │
│                                     │
│  Let's set up your first business   │
│  to start automating your workflow  │
│                                     │
│  [Continue] →                       │
└─────────────────────────────────────┘

Step 2: Business Basics
┌─────────────────────────────────────┐
│  What's your business name?         │
│  ┌─────────────────────────────┐   │
│  │ [Enter business name]       │   │
│  └─────────────────────────────┘   │
│                                     │
│  What industry are you in?          │
│  ┌─────────────────────────────┐   │
│  │ [Select from dropdown]      │   │
│  │ • Marketing Agency          │   │
│  │ • E-commerce                │   │
│  │ • SaaS                      │   │
│  │ • Professional Services     │   │
│  │ • Music/Entertainment       │   │
│  │ • Other...                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [← Back]  [Continue →]             │
└─────────────────────────────────────┘

Step 3: Business Details
┌─────────────────────────────────────┐
│  Tell us about your business        │
│  (This helps Jarvis understand you) │
│                                     │
│  What do you sell/offer?            │
│  ┌─────────────────────────────┐   │
│  │ [Text area - products/      │   │
│  │  services description]      │   │
│  └─────────────────────────────┘   │
│                                     │
│  Who are your customers?            │
│  ┌─────────────────────────────┐   │
│  │ [Text area - target         │   │
│  │  audience description]      │   │
│  └─────────────────────────────┘   │
│                                     │
│  Website (optional)                 │
│  ┌─────────────────────────────┐   │
│  │ https://                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  [← Back]  [Continue →]             │
└─────────────────────────────────────┘

Step 4: Brand Voice
┌─────────────────────────────────────┐
│  How should Jarvis speak for        │
│  your brand?                        │
│                                     │
│  Select your brand voice:           │
│  ┌─────────────────────────────┐   │
│  │ ○ Professional & Polished   │   │
│  │ ○ Casual & Friendly         │   │
│  │ ○ Technical & Precise       │   │
│  │ ○ Creative & Enthusiastic   │   │
│  │ ○ Custom (describe below)   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Example brand attributes:          │
│  ┌─────────────────────────────┐   │
│  │ ☑ Helpful                   │   │
│  │ ☑ Responsive                │   │
│  │ ☐ Witty                     │   │
│  │ ☐ Empathetic                │   │
│  └─────────────────────────────┘   │
│                                     │
│  [← Back]  [Create Business →]      │
└─────────────────────────────────────┘

Step 5: Observatory Created
┌─────────────────────────────────────┐
│  ✅ Your business is ready!         │
│                                     │
│  [Business Name] Observatory        │
│  is now active                      │
│                                     │
│  Next: Connect your accounts        │
│  to start automating               │
│                                     │
│  [Go to Dashboard →]                │
└─────────────────────────────────────┘
```

#### 1.2 Database Schema Changes

**Update `observatories` table:**
```sql
ALTER TABLE observatories ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE observatories ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;
```

**Onboarding Data Structure:**
```typescript
interface OnboardingData {
  businessName: string;
  industry: string;
  description?: string;
  products?: string;
  targetAudience?: string;
  website?: string;
  brandVoice: 'professional' | 'casual' | 'technical' | 'creative' | 'custom';
  customBrandVoice?: string;
  toneAttributes: string[]; // ['helpful', 'responsive', 'empathetic']
  completedAt: string; // ISO timestamp
}
```

**Auto-populate `business_profiles` table:**
```typescript
// After onboarding completion, create business_profiles entry
const businessProfile = {
  observatory_id: observatoryId,
  business_name: onboardingData.businessName,
  industry: onboardingData.industry,
  description: onboardingData.description,
  website: onboardingData.website,
  brand_voice: onboardingData.brandVoice,
  custom_brand_voice: onboardingData.customBrandVoice,
  tone_attributes: onboardingData.toneAttributes,
  products: onboardingData.products ? parseProducts(onboardingData.products) : [],
  target_audience: {
    description: onboardingData.targetAudience
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

### 2. Sidebar Menu with Multi-Business Support

#### 2.1 Sidebar Design

```
┌───────────────────────────────────┐
│                                   │
│  ┌─────┐  Ben Kennon              │
│  │ BK  │  kennonjarvis@gmail.com  │
│  └─────┘  Superadmin              │
│                                   │
├───────────────────────────────────┤
│                                   │
│  MY BUSINESSES                    │
│                                   │
│  ┌─────────────────────────────┐ │
│  │ 🏢 DAWG AI                  │ │
│  │    Active • 12 connections  │ │
│  │    ───────────────────────  │ │
│  │    Music Production         │ │
│  └─────────────────────────────┘ │
│                                   │
│  ┌─────────────────────────────┐ │
│  │ 🏢 Marketing Pro            │ │
│  │    3 connections            │ │
│  │    ───────────────────────  │ │
│  │    Marketing Agency         │ │
│  └─────────────────────────────┘ │
│                                   │
│  [+ Add Business] (💳 Paid)       │
│                                   │
├───────────────────────────────────┤
│                                   │
│  📊 Dashboard                     │
│  🔗 Connections                   │
│  🤖 AI Agents                     │
│  📈 Analytics                     │
│  ⚙️  Settings                     │
│                                   │
│  💳 Billing                       │
│  👤 Account                       │
│  🚪 Logout                        │
│                                   │
└───────────────────────────────────┘
```

#### 2.2 Active Business Context

**All pages show active business in header:**
```
┌────────────────────────────────────────────┐
│  🏢 DAWG AI  ▼   │   Dashboard            │
└────────────────────────────────────────────┘
```

**Business Switcher Dropdown:**
```
┌─────────────────────────────────┐
│  Select Business:               │
│                                 │
│  ✓ 🏢 DAWG AI                   │
│      Music Production           │
│      12 connections             │
│                                 │
│    🏢 Marketing Pro             │
│      Marketing Agency           │
│      3 connections              │
│                                 │
├─────────────────────────────────┤
│  [+ Add Business] (💳 Paid)     │
└─────────────────────────────────┘
```

#### 2.3 Implementation Components

**Frontend Components:**
```typescript
// packages/frontend/src/components/Sidebar/Sidebar.tsx
interface SidebarProps {
  user: User;
  businesses: Observatory[];
  activeBusiness: Observatory;
  onBusinessSwitch: (businessId: string) => void;
}

// packages/frontend/src/components/Sidebar/BusinessCard.tsx
interface BusinessCardProps {
  business: Observatory;
  isActive: boolean;
  connectionCount: number;
  onClick: () => void;
}

// packages/frontend/src/components/Sidebar/AddBusinessButton.tsx
interface AddBusinessButtonProps {
  onAddClick: () => void;
  requiresPayment: boolean;
}
```

**State Management:**
```typescript
// packages/frontend/src/store/businessSlice.ts
interface BusinessState {
  businesses: Observatory[];
  activeBusiness: Observatory | null;
  loading: boolean;
  error: string | null;
}

const businessSlice = createSlice({
  name: 'business',
  initialState,
  reducers: {
    setActiveBusiness: (state, action) => {
      state.activeBusiness = action.payload;
      // Persist to localStorage
      localStorage.setItem('activeBusinessId', action.payload.id);
    },
    // ...
  }
});
```

### 3. Payment Gate for Additional Businesses

#### 3.1 Business Limits

**Free Tier:**
- 1 business (observatory) included
- All features available for that business
- No credit card required for first business

**Paid Tier (per additional business):**
- $29/month per additional business
- Unlimited connections per business
- All AI agents enabled
- Priority support

#### 3.2 Payment Flow

```
User clicks [+ Add Business]
  ↓
Check current business count
  ↓
If count >= 1:
  ┌─────────────────────────────────┐
  │  Add Another Business           │
  │                                 │
  │  Additional businesses require  │
  │  a paid subscription            │
  │                                 │
  │  💰 $29/month per business      │
  │                                 │
  │  Includes:                      │
  │  ✓ Unlimited connections        │
  │  ✓ All AI agents                │
  │  ✓ Priority support             │
  │                                 │
  │  [Subscribe Now] [Cancel]       │
  └─────────────────────────────────┘
    ↓
  Stripe Checkout
    ↓
  Create subscription
    ↓
  On success: Show onboarding flow
```

#### 3.3 Stripe Integration

**Stripe Product Configuration:**
```typescript
// packages/backend/src/services/stripe/products.ts
export const STRIPE_PRODUCTS = {
  ADDITIONAL_BUSINESS: {
    name: 'Additional Business',
    description: 'Add another business to your Jarvis account',
    prices: {
      monthly: {
        amount: 2900, // $29.00
        currency: 'usd',
        interval: 'month'
      }
    }
  }
};
```

**Backend API Endpoints:**
```typescript
// POST /api/businesses/checkout
// Create Stripe checkout session for additional business
router.post('/checkout', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  // Count existing businesses
  const { count } = await supabase
    .from('observatory_members')
    .select('observatory_id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('role', 'owner');

  if (count < 1) {
    return res.status(400).json({ error: 'First business is free' });
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer: req.user.stripeCustomerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: process.env.STRIPE_ADDITIONAL_BUSINESS_PRICE_ID,
      quantity: 1
    }],
    success_url: `${process.env.FRONTEND_URL}/businesses/new?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/businesses`,
    metadata: {
      userId,
      type: 'additional_business'
    }
  });

  res.json({ sessionId: session.id });
});

// POST /api/webhooks/stripe
// Handle successful subscription
router.post('/webhooks/stripe', async (req, res) => {
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.metadata.type === 'additional_business') {
      // Store subscription info
      await supabase
        .from('subscriptions')
        .insert({
          user_id: session.metadata.userId,
          stripe_subscription_id: session.subscription,
          type: 'additional_business',
          status: 'active',
          created_at: new Date().toISOString()
        });

      // User can now create additional business
    }
  }

  res.json({ received: true });
});
```

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  type TEXT NOT NULL, -- 'additional_business', 'premium', etc.
  status TEXT NOT NULL, -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

#### 3.4 Business Count Validation

**Frontend Guard:**
```typescript
// packages/frontend/src/hooks/useBusinessLimit.ts
export const useBusinessLimit = () => {
  const { businesses } = useSelector((state: RootState) => state.business);
  const { subscriptions } = useSelector((state: RootState) => state.user);

  const freeLimit = 1;
  const activeAdditionalBusinessSubs = subscriptions.filter(
    sub => sub.type === 'additional_business' && sub.status === 'active'
  ).length;

  const maxBusinesses = freeLimit + activeAdditionalBusinessSubs;
  const canAddBusiness = businesses.length < maxBusinesses;

  return {
    canAddBusiness,
    currentCount: businesses.length,
    maxCount: maxBusinesses,
    requiresPayment: businesses.length >= freeLimit
  };
};
```

**Backend Validation:**
```typescript
// packages/backend/src/middleware/businessLimit.ts
export const checkBusinessLimit = async (req, res, next) => {
  const userId = req.user.id;

  // Count existing businesses
  const { count: businessCount } = await supabase
    .from('observatory_members')
    .select('observatory_id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('role', 'owner');

  // Count active subscriptions
  const { count: subCount } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('type', 'additional_business')
    .eq('status', 'active');

  const maxBusinesses = 1 + (subCount || 0);

  if (businessCount >= maxBusinesses) {
    return res.status(403).json({
      error: 'Business limit reached',
      message: 'Subscribe to add more businesses',
      currentCount: businessCount,
      maxCount: maxBusinesses
    });
  }

  next();
};
```

### 4. API Endpoints

```typescript
// Business Management
GET    /api/businesses              // List all user's businesses
POST   /api/businesses              // Create new business (requires payment if > 1)
GET    /api/businesses/:id          // Get business details
PATCH  /api/businesses/:id          // Update business
DELETE /api/businesses/:id          // Delete business
POST   /api/businesses/checkout     // Create Stripe checkout for additional business

// Business Onboarding
POST   /api/businesses/:id/onboarding  // Complete onboarding
GET    /api/businesses/:id/onboarding  // Get onboarding status

// Business Switching
POST   /api/user/active-business    // Set active business (stored in session/JWT)
```

---

## PR #4: Easy Integration Connections

### Objective
Create seamless, user-friendly connection flows for all business integrations with intelligent business info updates.

### 1. Dashboard Connection Cards

#### 1.1 Initial State (No Connections)

```
┌────────────────────────────────────────────────────────┐
│  Welcome back, Ben!                                    │
│  Connect your accounts to start automating your        │
│  workflow                                              │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Get Started with Jarvis                               │
│                                                        │
│  Quick Setup (recommended)                             │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Connect your top 3 accounts to get started:     │ │
│  │                                                  │ │
│  │  [📧 Gmail]  [📅 Calendar]  [💬 Twitter]        │ │
│  │                                                  │ │
│  │  [Quick Connect All →]                           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Or choose individual connections:                     │
│                                                        │
│  Communication                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│  │ 💬 iMessage │ │ 📧 Gmail    │ │ 💼 Slack    │    │
│  │ Not conn.   │ │ Not conn.   │ │ Not conn.   │    │
│  │ [Connect]   │ │ [Connect]   │ │ [Connect]   │    │
│  └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                        │
│  Productivity                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│  │ 📅 Calendar │ │ 📝 Notes    │ │ 🎤 Voice    │    │
│  │ Not conn.   │ │ Not conn.   │ │ Not conn.   │    │
│  │ [Connect]   │ │ [Connect]   │ │ [Connect]   │    │
│  └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                        │
│  Business Tools                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│  │ 📊 CRM      │ │ 🗄️ Database │ │ 📈 Analytics│    │
│  │ Not conn.   │ │ Not conn.   │ │ Not conn.   │    │
│  │ [Connect]   │ │ [Connect]   │ │ [Connect]   │    │
│  └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                        │
│  Social Media                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│  │ 🐦 Twitter  │ │ 📘 Facebook │ │ 📸 Instagram│    │
│  │ Not conn.   │ │ Not conn.   │ │ Not conn.   │    │
│  │ [Connect]   │ │ [Connect]   │ │ [Connect]   │    │
│  └─────────────┘ └─────────────┘ └─────────────┘    │
└────────────────────────────────────────────────────────┘
```

#### 1.2 With Connections (Intelligent Business Info)

```
┌────────────────────────────────────────────────────────┐
│  🏢 DAWG AI                                            │
│  Music Production Software                             │
│                                                        │
│  📧 hello@dawg-ai.com (from Gmail)                     │
│  🌐 www.dawg-ai.com (from email signature)             │
│  📍 San Francisco, CA (from Calendar)                  │
│  👥 5 team members (from Gmail contacts)               │
│                                                        │
│  Recent Activity:                                      │
│  • 12 emails processed today                           │
│  • 3 social mentions detected                          │
│  • 1 new customer in CRM                               │
│                                                        │
│  [Edit Business Info] [View Full Details →]            │
└────────────────────────────────────────────────────────┘

Connected Accounts (12)
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 💬 iMessage │ │ 📧 Gmail    │ │ 💼 Slack    │
│ ✅ Active   │ │ ✅ Active   │ │ ✅ Active   │
│ hello@...   │ │ team@...    │ │ #general    │
│ [Settings]  │ │ [Settings]  │ │ [Settings]  │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 2. Connection Flows

#### 2.1 iMessage Connection

**Approach: Local Mac App + API Bridge**

```
Connection Flow:
1. User clicks [Connect iMessage]
2. Show instructions:
   ┌─────────────────────────────────┐
   │  Connect iMessage               │
   │                                 │
   │  Step 1: Download Jarvis        │
   │          Mac Companion          │
   │                                 │
   │  [Download for Mac →]           │
   │                                 │
   │  Step 2: Install and open       │
   │          the app                │
   │                                 │
   │  Step 3: Scan this QR code      │
   │          to pair                │
   │                                 │
   │  ┌───────────────┐              │
   │  │   QR CODE     │              │
   │  │               │              │
   │  └───────────────┘              │
   │                                 │
   │  Or enter code: ABC-123-XYZ     │
   │                                 │
   │  [Cancel]                       │
   └─────────────────────────────────┘

3. Mac app authenticates with code
4. Requests iMessage access permission
5. Establishes WebSocket connection
6. Syncs messages to Jarvis backend
```

**Technical Implementation:**
```typescript
// Mac Companion App (Electron)
// packages/mac-companion/src/integrations/iMessage.ts
import { exec } from 'child_process';
import { AppleScript } from 'applescript';

class IMessageIntegration {
  async requestPermission() {
    // Request Full Disk Access for Messages.app
    // User must manually enable in System Preferences
  }

  async getMessages(since: Date) {
    const script = `
      tell application "Messages"
        set messageList to {}
        repeat with msg in (get messages of (conversations where date > date "${since.toISOString()}"))
          set end of messageList to {
            id: id of msg,
            text: text of msg,
            sender: handle of sender of msg,
            date: date of msg
          }
        end repeat
        return messageList
      end tell
    `;

    const result = await AppleScript.execString(script);
    return JSON.parse(result);
  }

  async sendMessage(recipient: string, text: string) {
    const script = `
      tell application "Messages"
        send "${text}" to buddy "${recipient}"
      end tell
    `;

    await AppleScript.execString(script);
  }
}

// Backend API
// packages/backend/src/integrations/iMessage/adapter.ts
export class IMessageAdapter extends BaseAdapter {
  async processMessages(messages: IMessage[]) {
    for (const msg of messages) {
      // Detect business-related messages
      if (this.isBusinessRelated(msg)) {
        await this.queueForAgent(msg);
      }
    }
  }
}
```

#### 2.2 Gmail Connection

**Approach: Google OAuth + Gmail API**

```
Connection Flow:
1. User clicks [Connect Gmail]
2. Redirect to Google OAuth:
   - Scopes: gmail.readonly, gmail.send, gmail.labels
3. User authorizes access
4. Store OAuth tokens in database
5. Start background sync
6. Show success:
   ┌─────────────────────────────────┐
   │  ✅ Gmail Connected             │
   │                                 │
   │  team@dawg-ai.com               │
   │                                 │
   │  Syncing 2,147 emails...        │
   │  [████████░░] 80%               │
   │                                 │
   │  What should Jarvis monitor?    │
   │  ☑ Support emails               │
   │  ☑ Sales inquiries              │
   │  ☐ Newsletters                  │
   │  ☑ Customer feedback            │
   │                                 │
   │  [Save Settings →]              │
   └─────────────────────────────────┘
```

**Technical Implementation:**
```typescript
// packages/backend/src/integrations/gmail/oauth.ts
export const initiateGmailOAuth = async (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/integrations/gmail/callback`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.labels'
    ],
    state: req.user.id // Pass user ID for callback
  });

  res.redirect(authUrl);
};

// packages/backend/src/integrations/gmail/sync.ts
export class GmailSyncService {
  async syncMessages(connectionId: string) {
    const connection = await this.getConnection(connectionId);
    const gmail = await this.getGmailClient(connection);

    // Get messages since last sync
    const lastSync = connection.lastSyncedAt || new Date(0);
    const query = `after:${Math.floor(lastSync.getTime() / 1000)}`;

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500
    });

    for (const message of response.data.messages) {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });

      await this.processEmail(full.data);
    }

    // Update last sync time
    await this.updateLastSync(connectionId);
  }

  async processEmail(email: gmail_v1.Schema$Message) {
    // Extract metadata
    const metadata = this.extractMetadata(email);

    // Check if business-related
    if (this.isBusinessRelated(metadata)) {
      // Determine agent type
      const agentType = this.classifyEmailType(metadata);

      // Queue for agent processing
      await this.queueForAgent({
        type: 'email',
        agentType,
        data: metadata,
        priority: this.calculatePriority(metadata)
      });
    }
  }
}
```

#### 2.3 Notes Connection

**Approach: iCloud Notes API (via Mac Companion)**

```
Connection Flow:
1. User clicks [Connect Notes]
2. Mac Companion app requests Notes access
3. User grants permission in System Preferences
4. Sync notes to Jarvis
5. Show success:
   ┌─────────────────────────────────┐
   │  ✅ Notes Connected             │
   │                                 │
   │  247 notes synced               │
   │                                 │
   │  Which folders should Jarvis    │
   │  monitor?                       │
   │  ☑ Business Ideas               │
   │  ☑ Meeting Notes                │
   │  ☐ Personal                     │
   │  ☑ Product Feedback             │
   │                                 │
   │  [Save Settings →]              │
   └─────────────────────────────────┘
```

#### 2.4 Voice Memos Connection

**Approach: iCloud Voice Memos + Transcription**

```
Connection Flow:
1. User clicks [Connect Voice Memos]
2. Mac Companion syncs voice memos
3. Backend transcribes with Whisper API
4. Show success:
   ┌─────────────────────────────────┐
   │  ✅ Voice Memos Connected       │
   │                                 │
   │  42 voice memos synced          │
   │  12 automatically transcribed   │
   │                                 │
   │  Auto-transcribe new memos?     │
   │  ● Yes, all memos               │
   │  ○ Only work-related            │
   │  ○ Ask me first                 │
   │                                 │
   │  [Save Settings →]              │
   └─────────────────────────────────┘
```

**Technical Implementation:**
```typescript
// packages/backend/src/integrations/voicememos/transcription.ts
export class VoiceMemoTranscriptionService {
  async transcribeAudio(audioBuffer: Buffer) {
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-1',
      language: 'en'
    });

    return transcription.text;
  }

  async processVoiceMemo(memo: VoiceMemo) {
    // Transcribe
    const transcript = await this.transcribeAudio(memo.audioData);

    // Store transcript
    await supabase
      .from('voice_memo_transcripts')
      .insert({
        memo_id: memo.id,
        transcript,
        created_at: new Date().toISOString()
      });

    // Check if business-related
    if (this.isBusinessRelated(transcript)) {
      // Extract action items with Claude
      const actionItems = await this.extractActionItems(transcript);

      // Queue for agent
      await this.queueForAgent({
        type: 'voice_memo',
        transcript,
        actionItems,
        memo
      });
    }
  }
}
```

#### 2.5 Calendar Connection

**Approach: Google Calendar API**

```
Connection Flow:
1. User clicks [Connect Calendar]
2. Google OAuth (same as Gmail)
3. Sync calendars
4. Show success:
   ┌─────────────────────────────────┐
   │  ✅ Calendar Connected          │
   │                                 │
   │  3 calendars synced:            │
   │  • Work (127 events)            │
   │  • Personal (52 events)         │
   │  • DAWG AI Team (89 events)     │
   │                                 │
   │  What can Jarvis do?            │
   │  ☑ Remind before meetings       │
   │  ☑ Prepare meeting briefs       │
   │  ☑ Suggest optimal meeting      │
   │    times for prospects          │
   │  ☑ Block focus time             │
   │                                 │
   │  [Save Settings →]              │
   └─────────────────────────────────┘
```

#### 2.6 CRM Connection

**Approach: OAuth for Popular CRMs (HubSpot, Salesforce, Pipedrive)**

```
Connection Flow:
1. User clicks [Connect CRM]
2. Show CRM selection:
   ┌─────────────────────────────────┐
   │  Select your CRM                │
   │                                 │
   │  [🔶 HubSpot]                   │
   │  [☁️ Salesforce]                │
   │  [🔵 Pipedrive]                 │
   │  [📊 Zoho CRM]                  │
   │  [+ Other]                      │
   │                                 │
   │  [Cancel]                       │
   └─────────────────────────────────┘

3. Redirect to CRM OAuth
4. User authorizes
5. Sync contacts, deals, companies
6. Show success:
   ┌─────────────────────────────────┐
   │  ✅ HubSpot Connected           │
   │                                 │
   │  Synced:                        │
   │  • 1,247 contacts               │
   │  • 89 companies                 │
   │  • 34 active deals              │
   │                                 │
   │  Jarvis can now:                │
   │  ☑ Auto-update contact info     │
   │  ☑ Log social interactions      │
   │  ☑ Create deals from emails     │
   │  ☑ Suggest next actions         │
   │                                 │
   │  [Save Settings →]              │
   └─────────────────────────────────┘
```

**Technical Implementation:**
```typescript
// packages/backend/src/integrations/crm/hubspot.ts
export class HubSpotIntegration extends BaseCRMIntegration {
  async syncContacts(connectionId: string) {
    const connection = await this.getConnection(connectionId);
    const hubspot = await this.getHubSpotClient(connection);

    const contacts = await hubspot.crm.contacts.getAll();

    for (const contact of contacts) {
      await this.storeContact({
        connectionId,
        externalId: contact.id,
        email: contact.properties.email,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        company: contact.properties.company,
        phone: contact.properties.phone,
        lastActivity: contact.properties.lastmodifieddate,
        customFields: contact.properties
      });
    }
  }

  async createDeal(data: DealData) {
    const connection = await this.getConnection(data.connectionId);
    const hubspot = await this.getHubSpotClient(connection);

    const deal = await hubspot.crm.deals.basicApi.create({
      properties: {
        dealname: data.name,
        amount: data.amount,
        dealstage: data.stage,
        pipeline: data.pipeline,
        closedate: data.expectedCloseDate
      },
      associations: data.contactIds.map(id => ({
        to: { id },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
      }))
    });

    return deal;
  }
}
```

#### 2.7 Database Connection

**Approach: Direct SQL Connection (PostgreSQL, MySQL, MongoDB)**

```
Connection Flow:
1. User clicks [Connect Database]
2. Show database type selection:
   ┌─────────────────────────────────┐
   │  Select Database Type           │
   │                                 │
   │  [🐘 PostgreSQL]                │
   │  [🐬 MySQL]                     │
   │  [🍃 MongoDB]                   │
   │  [📊 Supabase]                  │
   │  [🔥 Firebase]                  │
   │                                 │
   │  [Cancel]                       │
   └─────────────────────────────────┘

3. Show connection form:
   ┌─────────────────────────────────┐
   │  Connect PostgreSQL Database    │
   │                                 │
   │  Host                           │
   │  ┌─────────────────────────┐   │
   │  │ db.example.com          │   │
   │  └─────────────────────────┘   │
   │                                 │
   │  Port                           │
   │  ┌─────────────────────────┐   │
   │  │ 5432                    │   │
   │  └─────────────────────────┘   │
   │                                 │
   │  Database Name                  │
   │  ┌─────────────────────────┐   │
   │  │ production_db           │   │
   │  └─────────────────────────┘   │
   │                                 │
   │  Username                       │
   │  ┌─────────────────────────┐   │
   │  │ readonly_user           │   │
   │  └─────────────────────────┘   │
   │                                 │
   │  Password                       │
   │  ┌─────────────────────────┐   │
   │  │ ••••••••••••            │   │
   │  └─────────────────────────┘   │
   │                                 │
   │  ⚠️ We recommend creating a     │
   │     read-only user for Jarvis  │
   │                                 │
   │  [Test Connection]              │
   │  [Connect] [Cancel]             │
   └─────────────────────────────────┘

4. Test connection
5. Show table selection:
   ┌─────────────────────────────────┐
   │  ✅ Connection Successful       │
   │                                 │
   │  Which tables should Jarvis     │
   │  monitor?                       │
   │                                 │
   │  ☑ customers                    │
   │  ☑ orders                       │
   │  ☑ products                     │
   │  ☐ internal_logs                │
   │  ☐ migrations                   │
   │                                 │
   │  [Select All] [Deselect All]    │
   │  [Save Settings →]              │
   └─────────────────────────────────┘
```

**Technical Implementation:**
```typescript
// packages/backend/src/integrations/database/postgresql.ts
export class PostgreSQLIntegration extends BaseDatabaseIntegration {
  async testConnection(config: DBConfig): Promise<boolean> {
    try {
      const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl
      });

      await pool.query('SELECT 1');
      await pool.end();

      return true;
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async watchChanges(connectionId: string, tables: string[]) {
    const connection = await this.getConnection(connectionId);
    const pool = await this.getPool(connection);

    // Set up PostgreSQL LISTEN/NOTIFY for real-time changes
    const client = await pool.connect();

    for (const table of tables) {
      // Create trigger function if not exists
      await client.query(`
        CREATE OR REPLACE FUNCTION notify_${table}_changes()
        RETURNS trigger AS $$
        BEGIN
          PERFORM pg_notify('table_change', json_build_object(
            'table', TG_TABLE_NAME,
            'action', TG_OP,
            'data', row_to_json(NEW)
          )::text);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Create trigger
      await client.query(`
        DROP TRIGGER IF EXISTS ${table}_notify_trigger ON ${table};
        CREATE TRIGGER ${table}_notify_trigger
        AFTER INSERT OR UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION notify_${table}_changes();
      `);
    }

    // Listen for changes
    await client.query('LISTEN table_change');

    client.on('notification', async (msg) => {
      const payload = JSON.parse(msg.payload);
      await this.handleDatabaseChange(connectionId, payload);
    });
  }
}
```

### 3. Intelligent Business Info Updates

#### 3.1 Business Info Extraction

**Extract information from connections:**

```typescript
// packages/backend/src/services/BusinessInfoExtractor.ts
export class BusinessInfoExtractor {
  async updateFromGmail(observatoryId: string, connection: Connection) {
    const gmail = await this.getGmailClient(connection);

    // Get email signature
    const signature = await this.extractEmailSignature(gmail);

    const updates: Partial<BusinessProfile> = {};

    // Extract business email
    if (signature.email) {
      updates.business_email = signature.email;
    }

    // Extract website from signature
    if (signature.website) {
      updates.website = signature.website;
    }

    // Extract phone number
    if (signature.phone) {
      updates.phone = signature.phone;
    }

    // Extract address
    if (signature.address) {
      updates.address = signature.address;
    }

    // Count team members from contacts
    const contacts = await this.getTeamContacts(gmail);
    updates.team_size = contacts.length;

    await this.updateBusinessProfile(observatoryId, updates);
  }

  async updateFromCalendar(observatoryId: string, connection: Connection) {
    const calendar = await this.getCalendarClient(connection);

    // Extract location from most common meeting locations
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 100
    });

    const locations = events.data.items
      .map(e => e.location)
      .filter(Boolean);

    const mostCommonLocation = this.getMostCommon(locations);

    if (mostCommonLocation) {
      await this.updateBusinessProfile(observatoryId, {
        primary_location: mostCommonLocation
      });
    }
  }

  async updateFromCRM(observatoryId: string, connection: Connection) {
    // Extract industry from common customer industries
    // Extract avg deal size from deals
    // Extract sales cycle length
    // Extract target customer profile

    const crm = await this.getCRMClient(connection);
    const companies = await crm.getCompanies({ limit: 100 });

    const industries = companies.map(c => c.industry).filter(Boolean);
    const mostCommonIndustry = this.getMostCommon(industries);

    const deals = await crm.getDeals({ limit: 100 });
    const avgDealSize = this.calculateAverage(deals.map(d => d.amount));

    await this.updateBusinessProfile(observatoryId, {
      target_industries: industries,
      avg_deal_size: avgDealSize,
      crm_integration_active: true
    });
  }

  async updateFromDatabase(observatoryId: string, connection: Connection) {
    // Extract customer count
    // Extract revenue metrics
    // Extract product catalog

    const db = await this.getDatabaseClient(connection);

    const customerCount = await db.query(
      'SELECT COUNT(*) FROM customers WHERE status = $1',
      ['active']
    );

    const products = await db.query('SELECT * FROM products WHERE active = true');

    await this.updateBusinessProfile(observatoryId, {
      customer_count: customerCount.rows[0].count,
      products: products.rows.map(p => ({
        name: p.name,
        description: p.description,
        price: p.price
      }))
    });
  }
}
```

#### 3.2 Auto-Update UI

**Dashboard header shows extracted info:**
```
┌────────────────────────────────────────────────────────┐
│  🏢 DAWG AI                    [Edit]                  │
│  Music Production Software                             │
│                                                        │
│  📧 hello@dawg-ai.com          ✨ from Gmail           │
│  🌐 www.dawg-ai.com            ✨ from Email Signature │
│  📍 San Francisco, CA          ✨ from Calendar        │
│  👥 5 team members             ✨ from Gmail Contacts  │
│  💰 $149/mo avg deal           ✨ from CRM             │
│  🎯 Music Producers            ✨ from CRM             │
│  📊 2,147 active customers     ✨ from Database        │
│                                                        │
│  ✨ = Auto-detected from your connections             │
└────────────────────────────────────────────────────────┘
```

### 4. Connection Management

#### 4.1 Connections Page

```
┌────────────────────────────────────────────────────────┐
│  Connections                                           │
│                                                        │
│  [+ Add Connection]                   [Manage All]     │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Active Connections (12)                               │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 📧 Gmail                          ✅ Connected   │ │
│  │ team@dawg-ai.com                                 │ │
│  │ Last synced: 2 minutes ago                       │ │
│  │ • 2,147 emails processed                         │ │
│  │ • 12 labels monitored                            │ │
│  │ [Settings] [Disconnect]                          │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 📅 Google Calendar                ✅ Connected   │ │
│  │ 3 calendars synced                               │ │
│  │ Last synced: 5 minutes ago                       │ │
│  │ • 268 events tracked                             │ │
│  │ • Next meeting in 30 minutes                     │ │
│  │ [Settings] [Disconnect]                          │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🔶 HubSpot CRM                    ✅ Connected   │ │
│  │ Production account                               │ │
│  │ Last synced: 1 hour ago                          │ │
│  │ • 1,247 contacts                                 │ │
│  │ • 34 active deals                                │ │
│  │ [Settings] [Disconnect]                          │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

#### 4.2 Connection Settings Modal

```
┌─────────────────────────────────────────────────────┐
│  Gmail Settings                               [✕]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Account: team@dawg-ai.com                          │
│  Status: ✅ Active                                  │
│  Last sync: 2 minutes ago                           │
│                                                     │
│  ─── Sync Settings ───                              │
│                                                     │
│  Sync frequency:                                    │
│  ● Real-time (recommended)                          │
│  ○ Every 15 minutes                                 │
│  ○ Every hour                                       │
│  ○ Manual only                                      │
│                                                     │
│  Monitor these labels:                              │
│  ☑ INBOX                                            │
│  ☑ Support                                          │
│  ☑ Sales                                            │
│  ☐ Spam                                             │
│  ☐ Promotions                                       │
│                                                     │
│  ─── AI Agent Settings ───                          │
│                                                     │
│  Automatically respond to:                          │
│  ☑ Support inquiries (Support Agent)                │
│  ☑ Sales questions (Sales Agent)                    │
│  ☐ General inquiries                                │
│                                                     │
│  Require approval for:                              │
│  ☑ All draft responses                              │
│  ☐ Only low-confidence responses                    │
│                                                     │
│  ─── Data Extraction ───                            │
│                                                     │
│  Extract business info from:                        │
│  ☑ Email signatures                                 │
│  ☑ Contact details                                  │
│  ☑ Meeting information                              │
│                                                     │
│  [Sync Now]  [Save Changes]  [Disconnect]           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5. Database Schema

```sql
-- Connections table
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'gmail', 'calendar', 'crm', 'database', etc.
  provider TEXT NOT NULL, -- 'google', 'hubspot', 'postgresql', etc.
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disconnected', 'error'

  -- OAuth tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- Connection-specific config
  config JSONB DEFAULT '{}'::jsonb,

  -- Sync metadata
  last_synced_at TIMESTAMP,
  sync_frequency TEXT DEFAULT 'realtime', -- 'realtime', '15min', '1hour', 'manual'

  -- Stats
  items_synced INTEGER DEFAULT 0,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_connections_observatory_id ON connections(observatory_id);
CREATE INDEX idx_connections_type ON connections(type);
CREATE INDEX idx_connections_status ON connections(status);

-- Connection settings
CREATE TABLE IF NOT EXISTS connection_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,

  -- Sync settings
  labels_to_monitor TEXT[], -- For Gmail
  folders_to_monitor TEXT[], -- For Notes
  tables_to_monitor TEXT[], -- For Database

  -- AI agent settings
  auto_respond_types TEXT[], -- ['support', 'sales']
  require_approval_for TEXT[], -- ['all', 'low_confidence']

  -- Data extraction settings
  extract_signatures BOOLEAN DEFAULT true,
  extract_contacts BOOLEAN DEFAULT true,
  extract_metadata BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Extracted business info tracking
CREATE TABLE IF NOT EXISTS business_info_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,

  field_name TEXT NOT NULL, -- 'email', 'website', 'phone', etc.
  extracted_value TEXT NOT NULL,
  confidence FLOAT, -- 0-1 confidence score
  source_type TEXT, -- 'email_signature', 'calendar_location', etc.

  applied BOOLEAN DEFAULT false, -- Whether this was applied to business_profiles
  applied_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_business_info_extractions_observatory_id ON business_info_extractions(observatory_id);
CREATE INDEX idx_business_info_extractions_applied ON business_info_extractions(applied);
```

### 6. API Endpoints

```typescript
// Connection Management
POST   /api/connections/gmail/authorize          // Start Gmail OAuth
GET    /api/connections/gmail/callback           // OAuth callback
POST   /api/connections/calendar/authorize       // Start Calendar OAuth
POST   /api/connections/crm/authorize            // Start CRM OAuth (with provider)
POST   /api/connections/database/test            // Test database connection
POST   /api/connections/database/connect         // Save database connection

GET    /api/connections                          // List all connections
GET    /api/connections/:id                      // Get connection details
PATCH  /api/connections/:id                      // Update connection settings
DELETE /api/connections/:id                      // Disconnect
POST   /api/connections/:id/sync                 // Trigger manual sync

// Business Info Extraction
GET    /api/businesses/:id/extractions           // Get extracted info suggestions
POST   /api/businesses/:id/extractions/:extractionId/apply  // Apply suggestion
POST   /api/businesses/:id/extractions/:extractionId/dismiss // Dismiss suggestion

// Mac Companion
POST   /api/companion/pair                       // Pair Mac app with QR/code
GET    /api/companion/status                     // Check pairing status
POST   /api/companion/imessage/messages          // Receive iMessage sync
POST   /api/companion/notes/sync                 // Receive Notes sync
POST   /api/companion/voicememos/sync            // Receive Voice Memos sync
```

---

## Implementation Timeline

### Week 2: Day 1-2 (PR #3: Part 1)
- [ ] Business onboarding flow UI
- [ ] Onboarding questions form
- [ ] Database schema updates
- [ ] Auto-populate business_profiles from onboarding

### Week 2: Day 2-3 (PR #3: Part 2)
- [ ] Sidebar menu redesign
- [ ] Business switcher component
- [ ] Multi-business state management
- [ ] Active business context

### Week 2: Day 3-4 (PR #3: Part 3)
- [ ] Stripe integration for additional businesses
- [ ] Payment gate UI/UX
- [ ] Business count validation
- [ ] Webhook handlers

### Week 2: Day 4-5 (PR #4: Part 1)
- [ ] Connection cards dashboard
- [ ] Gmail OAuth integration
- [ ] Calendar OAuth integration
- [ ] Basic sync infrastructure

### Week 2: Day 5-6 (PR #4: Part 2)
- [ ] Mac Companion app (Electron)
- [ ] iMessage integration
- [ ] Notes integration
- [ ] Voice Memos + transcription

### Week 2: Day 6-7 (PR #4: Part 3)
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Database connections
- [ ] Business info extraction system
- [ ] Auto-update UI components

### Week 2: Day 7-8 (Testing & Polish)
- [ ] End-to-end testing
- [ ] Connection flow testing
- [ ] Payment flow testing
- [ ] Bug fixes and polish

---

## Success Metrics

### PR #3 Success Criteria
- ✅ New users complete onboarding with business info
- ✅ Users can create multiple businesses
- ✅ Payment gate prevents > 1 free business
- ✅ Sidebar shows all businesses with switcher
- ✅ Active business context persists across sessions

### PR #4 Success Criteria
- ✅ Users can connect Gmail in < 3 clicks
- ✅ Users can connect Calendar in < 3 clicks
- ✅ Mac Companion enables iMessage/Notes/Voice Memos
- ✅ CRM integration syncs contacts and deals
- ✅ Business info auto-populates from connections
- ✅ Dashboard shows intelligent business summary

---

## Testing Checklist

### Onboarding
- [ ] New user signup flows to onboarding
- [ ] All onboarding questions save correctly
- [ ] Business profile auto-created
- [ ] Default agent personalities created
- [ ] First observatory marked as onboarding_completed

### Multi-Business
- [ ] First business creates without payment
- [ ] Second business requires Stripe checkout
- [ ] Payment success enables business creation
- [ ] Business switcher updates active business
- [ ] All data filtered by active business

### Connections
- [ ] Gmail OAuth completes successfully
- [ ] Gmail sync processes emails
- [ ] Calendar OAuth completes successfully
- [ ] Calendar sync processes events
- [ ] Mac Companion pairs with QR code
- [ ] iMessage messages sync to backend
- [ ] Notes sync to backend
- [ ] Voice Memos transcribe correctly
- [ ] CRM OAuth and sync works
- [ ] Database connection tests and connects

### Business Info Extraction
- [ ] Email extracted from Gmail signature
- [ ] Website extracted from signature
- [ ] Phone extracted from signature
- [ ] Location extracted from Calendar
- [ ] Team size calculated from contacts
- [ ] Industry extracted from CRM
- [ ] Customer count from database
- [ ] Auto-update UI shows sources

---

## Security Considerations

### OAuth Tokens
- Store all tokens encrypted at rest
- Use separate encryption keys per environment
- Rotate encryption keys quarterly
- Never log tokens

### Database Connections
- Recommend read-only users
- Validate connection strings
- Never store passwords in plaintext
- Support SSH tunneling for extra security

### Mac Companion
- Code signing required
- Notarization for macOS
- Minimal permissions requested
- All data encrypted in transit

### Payment Security
- Never store credit card info (Stripe handles)
- Validate all webhooks with signatures
- Prevent race conditions in business creation
- Audit all subscription changes

---

## User Experience Principles

### Simplicity
- Each connection in ≤ 3 clicks
- Clear, jargon-free language
- Visual progress indicators
- Contextual help text

### Intelligence
- Auto-detect business info from connections
- Suggest relevant connections based on industry
- Pre-fill forms when possible
- Smart defaults for settings

### Transparency
- Show what Jarvis is monitoring
- Explain why permissions are needed
- Display sync status in real-time
- Provide audit logs

### Control
- Easy connection/disconnection
- Granular permission controls
- Approval workflows for AI actions
- Data export options

---

## Next Steps After Week 2

### Week 3: Stabilization
- Bug fixes from user feedback
- Performance optimization
- Connection reliability improvements
- Error handling enhancements

### Week 4: Advanced Features
- Bulk connection management
- Connection templates by industry
- Advanced business info rules
- Multi-user collaboration

### Future Considerations
- Mobile app for connection management
- Browser extension for web connections
- Zapier/Make.com integrations
- API for custom integrations

---

## Questions for Clarification

1. **Mac Companion Distribution**: Should this be distributed via Mac App Store or direct download?

2. **CRM Priority**: Which CRM should we prioritize first? (HubSpot, Salesforce, or Pipedrive?)

3. **Database Security**: Should we require SSH tunneling for all database connections?

4. **Pricing**: Confirm $29/month per additional business is acceptable

5. **Voice Memos**: Should transcription happen immediately or batch process daily?

6. **Business Switching**: Should switching businesses reload the entire dashboard or just filter data client-side?

---

## Files to Create/Modify

### Frontend
- `packages/frontend/src/pages/Onboarding/BusinessOnboarding.tsx` (NEW)
- `packages/frontend/src/components/Sidebar/Sidebar.tsx` (MODIFY)
- `packages/frontend/src/components/Sidebar/BusinessCard.tsx` (NEW)
- `packages/frontend/src/components/Sidebar/BusinessSwitcher.tsx` (NEW)
- `packages/frontend/src/components/Connections/ConnectionCard.tsx` (NEW)
- `packages/frontend/src/components/Connections/ConnectionsGrid.tsx` (NEW)
- `packages/frontend/src/pages/Connections/ConnectionsPage.tsx` (NEW)
- `packages/frontend/src/store/businessSlice.ts` (NEW)
- `packages/frontend/src/store/connectionsSlice.ts` (NEW)

### Backend
- `packages/backend/src/routes/businesses.ts` (NEW)
- `packages/backend/src/routes/connections.ts` (NEW)
- `packages/backend/src/routes/stripe-webhooks.ts` (MODIFY)
- `packages/backend/src/integrations/gmail/oauth.ts` (NEW)
- `packages/backend/src/integrations/gmail/sync.ts` (NEW)
- `packages/backend/src/integrations/calendar/oauth.ts` (NEW)
- `packages/backend/src/integrations/calendar/sync.ts` (NEW)
- `packages/backend/src/integrations/crm/hubspot.ts` (NEW)
- `packages/backend/src/integrations/crm/base.ts` (NEW)
- `packages/backend/src/integrations/database/postgresql.ts` (NEW)
- `packages/backend/src/integrations/database/base.ts` (NEW)
- `packages/backend/src/services/BusinessInfoExtractor.ts` (NEW)
- `packages/backend/src/middleware/businessLimit.ts` (NEW)

### Mac Companion (NEW PACKAGE)
- `packages/mac-companion/src/main.ts` (NEW)
- `packages/mac-companion/src/integrations/iMessage.ts` (NEW)
- `packages/mac-companion/src/integrations/notes.ts` (NEW)
- `packages/mac-companion/src/integrations/voicememos.ts` (NEW)
- `packages/mac-companion/src/api/client.ts` (NEW)

### Database
- `packages/backend/supabase/migrations/add_onboarding_to_observatories.sql` (NEW)
- `packages/backend/supabase/migrations/create_connections_tables.sql` (NEW)
- `packages/backend/supabase/migrations/create_subscriptions_table.sql` (NEW)

---

**Total Estimated Lines of Code**: ~8,000 lines
**Total Estimated Time**: 16-20 hours
**Priority**: High - Foundational features for business-centric platform
