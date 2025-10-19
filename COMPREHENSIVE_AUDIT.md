# JARVIS Comprehensive Codebase Audit & Refactoring Plan

**Audit Date**: October 19, 2025
**Auditor**: Claude Code
**Scope**: Full macOS codebase audit for autonomous business management platform

---

## 🎯 Executive Summary

**Current State**: JARVIS is a **frontend-only demo** with hardcoded integrations and no actual automation capabilities.

**Target State**: JARVIS should be an **autonomous business management platform** that connects to all major business tools and runs operations automatically.

**Critical Gap**: **No backend, no real integrations, no automation engine**

---

## 📊 Current Architecture Analysis

### File Structure
```
jarvis-deploy/
├── src/
│   ├── pages/           # 7 pages (Landing, Login, Signup, Dashboard, AuthCallback)
│   ├── lib/            # Only supabase.ts
│   ├── components/     # EMPTY (no reusable components)
│   ├── App.tsx
│   └── main.tsx
├── package.json        # 6 dependencies total
├── .env               # Supabase config only
└── netlify.toml       # Deployment config
```

### Dependencies (MINIMAL)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.47.0",  // Auth only
    "lucide-react": "^0.400.0",          // Icons
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.0"         // Routing
  }
}
```

**Missing Critical Dependencies:**
- ❌ No state management (Redux, Zustand, Jotai)
- ❌ No API client (Axios, TanStack Query)
- ❌ No form handling (React Hook Form, Formik)
- ❌ No data fetching (SWR, React Query)
- ❌ No OAuth libraries
- ❌ No WebSocket client
- ❌ No analytics
- ❌ No error tracking (Sentry)
- ❌ No testing libraries

---

## 🔴 Critical Issues

### 1. **NO BACKEND / API LAYER**

**Current**: Everything is hardcoded in React components

**Impact**:
- Cannot connect to real services
- Cannot store integration credentials
- Cannot run automation
- Cannot process webhooks
- Cannot execute business logic

**Example from DashboardPage.tsx line 124**:
```typescript
href="http://localhost:3000"  // Hardcoded localhost URL
```

### 2. **FAKE INTEGRATIONS**

**Current**: Only displays 4 static integration cards
```typescript
<IntegrationCard name="iMessage" status="connected" />
<IntegrationCard name="Twitter" status="connected" />
<IntegrationCard name="Gmail" status="connected" />
<IntegrationCard name="Calendar" status="connected" />
```

**Issues**:
- No actual API connections
- No OAuth flows
- No credential storage
- No webhook listeners
- Just displaying hardcoded "connected" status

### 3. **NO AUTOMATION ENGINE**

**Current**: Mock activity items with hardcoded text
```typescript
<ActivityItem title="Auto-responded to John Doe" time="5 minutes ago" />
<ActivityItem title="Posted to Twitter" time="1 hour ago" />
```

**Issues**:
- Not actually auto-responding
- Not actually posting to Twitter
- No automation rules
- No triggers/actions
- No AI agent system

### 4. **ENVIRONMENT MISMATCH**

**Development**:
- Runs on `http://localhost:5176`
- Hardcodes `http://localhost:3000` for Observatory

**Production**:
- Runs on `https://jarvis-ai.co`
- Redirects to `https://dawg-ai.com`

**Impact**: Breaks in production, requires different configs

### 5. **NO DATABASE SCHEMA**

**Current**: Only uses Supabase auth (`auth.users` table)

**Missing Tables**:
- `observatories` - Business workspaces
- `integrations` - Connected platforms
- `oauth_credentials` - Encrypted access tokens
- `automation_rules` - User-defined automations
- `activity_logs` - Action history
- `contacts` - CRM data
- `messages` - Communication threads
- `posts` - Social media queue
- `analytics` - Performance metrics

### 6. **NO REAL-TIME CAPABILITIES**

**Missing**:
- WebSocket connections
- Webhook handlers
- Event-driven architecture
- Real-time updates

---

## 🏗️ Required Architecture

### Backend Stack
```
jarvis-deploy/
├── backend/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── integrations.ts
│   │   │   ├── automations.ts
│   │   │   ├── webhooks.ts
│   │   │   ├── analytics.ts
│   │   │   └── observatory.ts
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── server.ts
│   ├── services/
│   │   ├── integrations/
│   │   │   ├── social/
│   │   │   │   ├── twitter.ts
│   │   │   │   ├── linkedin.ts
│   │   │   │   ├── facebook.ts
│   │   │   │   ├── instagram.ts
│   │   │   │   ├── tiktok.ts
│   │   │   │   └── youtube.ts
│   │   │   ├── crm/
│   │   │   │   ├── salesforce.ts
│   │   │   │   ├── hubspot.ts
│   │   │   │   ├── pipedrive.ts
│   │   │   │   ├── zoho.ts
│   │   │   │   └── monday.ts
│   │   │   ├── email/
│   │   │   │   ├── gmail.ts
│   │   │   │   ├── outlook.ts
│   │   │   │   └── sendgrid.ts
│   │   │   ├── calendar/
│   │   │   │   ├── google-calendar.ts
│   │   │   │   ├── outlook-calendar.ts
│   │   │   │   └── apple-calendar.ts
│   │   │   ├── messaging/
│   │   │   │   ├── slack.ts
│   │   │   │   ├── discord.ts
│   │   │   │   ├── telegram.ts
│   │   │   │   └── whatsapp.ts
│   │   │   ├── ecommerce/
│   │   │   │   ├── shopify.ts
│   │   │   │   ├── woocommerce.ts
│   │   │   │   └── stripe.ts
│   │   │   └── analytics/
│   │   │       ├── google-analytics.ts
│   │   │       └── mixpanel.ts
│   │   ├── automation/
│   │   │   ├── engine.ts
│   │   │   ├── scheduler.ts
│   │   │   └── executor.ts
│   │   ├── ai/
│   │   │   ├── agent-orchestrator.ts
│   │   │   ├── intent-classifier.ts
│   │   │   ├── response-generator.ts
│   │   │   └── content-creator.ts
│   │   └── queue/
│   │       ├── bull-queue.ts
│   │       └── workers.ts
│   ├── db/
│   │   ├── schema.sql
│   │   ├── migrations/
│   │   └── seeds/
│   └── utils/
│       ├── encryption.ts
│       ├── oauth.ts
│       └── webhooks.ts
```

---

## 📝 Required Integrations (50+ Platforms)

### Social Media (8)
- ✅ Twitter/X - Post, schedule, respond, analytics
- ✅ LinkedIn - Post, network, messaging
- ✅ Facebook - Pages, groups, ads
- ✅ Instagram - Post, stories, DMs
- ✅ TikTok - Post, analytics
- ✅ YouTube - Upload, comments, analytics
- ✅ Pinterest - Pin, boards
- ✅ Reddit - Post, comment, monitor

### CRM (10)
- ✅ Salesforce - Leads, deals, contacts
- ✅ HubSpot - Marketing, sales, service
- ✅ Pipedrive - Sales pipeline
- ✅ Zoho CRM - Customer management
- ✅ Monday.com - Project CRM
- ✅ Freshsales - Sales CRM
- ✅ Copper - Google Workspace CRM
- ✅ Nutshell - Sales automation
- ✅ Insightly - Project + CRM
- ✅ ActiveCampaign - Email + CRM

### Email & Communication (8)
- ✅ Gmail - Read, send, organize
- ✅ Outlook - Email management
- ✅ Mailchimp - Email campaigns
- ✅ SendGrid - Transactional email
- ✅ Slack - Team messaging
- ✅ Discord - Community management
- ✅ Telegram - Bot + messaging
- ✅ WhatsApp Business - Customer messaging

### Calendar & Scheduling (5)
- ✅ Google Calendar - Events, meetings
- ✅ Outlook Calendar - Scheduling
- ✅ Apple Calendar - iCloud sync
- ✅ Calendly - Meeting booking
- ✅ Acuity Scheduling - Appointments

### E-commerce & Payments (7)
- ✅ Shopify - Store management
- ✅ WooCommerce - WordPress store
- ✅ Stripe - Payments
- ✅ PayPal - Transactions
- ✅ Square - POS + payments
- ✅ Amazon Seller Central - Marketplace
- ✅ Etsy - Handmade marketplace

### Analytics & Tracking (5)
- ✅ Google Analytics - Web analytics
- ✅ Mixpanel - Product analytics
- ✅ Segment - Data pipeline
- ✅ Amplitude - User behavior
- ✅ Hotjar - Heatmaps + recordings

### Project Management (6)
- ✅ Asana - Task management
- ✅ Trello - Kanban boards
- ✅ Jira - Agile projects
- ✅ ClickUp - All-in-one PM
- ✅ Notion - Workspace
- ✅ Airtable - Database + sheets

### Productivity (6)
- ✅ Google Drive - File storage
- ✅ Dropbox - Cloud storage
- ✅ OneDrive - Microsoft cloud
- ✅ Evernote - Note taking
- ✅ Todoist - Task management
- ✅ RescueTime - Time tracking

---

## 🤖 Autonomous Agent System

### Required Components

#### 1. **Intent Classification**
```typescript
interface Intent {
  category: 'email' | 'social' | 'crm' | 'calendar' | 'support';
  action: 'respond' | 'create' | 'update' | 'delete' | 'schedule';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  confidence: number;
}
```

#### 2. **Automation Rules Engine**
```typescript
interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    platform: string;
    event: string;
    conditions: Condition[];
  };
  actions: Action[];
  enabled: boolean;
}
```

#### 3. **AI Agent Orchestrator**
```typescript
class AgentOrchestrator {
  async processEvent(event: BusinessEvent): Promise<void> {
    // 1. Classify intent
    // 2. Find matching rules
    // 3. Execute actions
    // 4. Log activity
    // 5. Update analytics
  }
}
```

---

## 🗄️ Database Schema

```sql
-- Observatories (Business workspaces)
CREATE TABLE observatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT 'active',
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations (Connected platforms)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id),
  platform VARCHAR(100) NOT NULL, -- 'twitter', 'salesforce', etc.
  status VARCHAR(50) DEFAULT 'disconnected',
  credentials JSONB, -- Encrypted OAuth tokens
  settings JSONB, -- Platform-specific settings
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation Rules
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger JSONB NOT NULL,
  actions JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  runs_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id),
  integration_id UUID REFERENCES integrations(id),
  action_type VARCHAR(100),
  title VARCHAR(255),
  description TEXT,
  metadata JSONB,
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts (CRM)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id),
  email VARCHAR(255),
  name VARCHAR(255),
  company VARCHAR(255),
  phone VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (Omnichannel inbox)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id),
  contact_id UUID REFERENCES contacts(id),
  platform VARCHAR(100),
  direction VARCHAR(50), -- 'inbound' | 'outbound'
  content TEXT,
  status VARCHAR(50),
  ai_responded BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Posts (Scheduled content)
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id),
  platform VARCHAR(100),
  content TEXT,
  media_urls TEXT[],
  scheduled_for TIMESTAMPTZ,
  status VARCHAR(50),
  post_id VARCHAR(255), -- Platform's post ID
  analytics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observatory_id UUID REFERENCES observatories(id),
  metric_name VARCHAR(100),
  metric_value DECIMAL,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔧 Refactoring Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up monorepo structure (frontend + backend)
- [ ] Add backend API (Node.js + Express or Next.js API routes)
- [ ] Implement database schema
- [ ] Set up environment management (dotenv-flow)
- [ ] Add state management (Zustand)
- [ ] Create API client with React Query

### Phase 2: Integration Framework (Week 3-4)
- [ ] Build OAuth connector base class
- [ ] Implement integration manager service
- [ ] Add webhook receiver
- [ ] Create credential encryption service
- [ ] Build integration testing framework

### Phase 3: Core Integrations (Week 5-8)
- [ ] Social Media (Twitter, LinkedIn, Facebook, Instagram)
- [ ] CRM (Salesforce, HubSpot, Pipedrive)
- [ ] Email (Gmail, Outlook)
- [ ] Calendar (Google, Outlook)
- [ ] Messaging (Slack, Discord)

### Phase 4: Automation Engine (Week 9-10)
- [ ] Build automation rules engine
- [ ] Create trigger system
- [ ] Implement action executor
- [ ] Add queue system (Bull/BullMQ)
- [ ] Build scheduler

### Phase 5: AI Agents (Week 11-12)
- [ ] Intent classification system
- [ ] Response generation (GPT-4)
- [ ] Content creation agent
- [ ] Email auto-responder
- [ ] Social media posting agent

### Phase 6: Dashboard Redesign (Week 13-14)
- [ ] Integration marketplace UI
- [ ] OAuth connection flows
- [ ] Real-time activity feed
- [ ] Analytics dashboard
- [ ] Automation rule builder (visual)

---

## 🎨 Dashboard Redesign Mockup

### New Dashboard Structure

```
┌─────────────────────────────────────────────────────────────┐
│  JARVIS AI                    🔔  ⚙️  👤  Jarvis Kennon     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Welcome back, Jarvis! 👋                     🚀 Dashboard  │
│  Running 47 automations across 12 platforms                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────────── INTEGRATIONS ────────────────────────┐
│                                                            │
│  SOCIAL MEDIA (8/8 connected)                             │
│  🐦 Twitter   📘 LinkedIn   📘 Facebook   📷 Instagram    │
│  🎵 TikTok    ▶️ YouTube    📌 Pinterest  🤖 Reddit       │
│                                                            │
│  CRM (5/10 connected)                     + Add More       │
│  ☁️ Salesforce   🟠 HubSpot   📊 Pipedrive                 │
│  🔷 Zoho CRM     📅 Monday.com                            │
│                                                            │
│  EMAIL & MESSAGING (6/8 connected)        + Add More       │
│  ✉️ Gmail        📧 Outlook     📬 Mailchimp              │
│  💬 Slack        💬 Discord     📱 Telegram               │
│                                                            │
│  E-COMMERCE (3/7 connected)               + Add More       │
│  🛍️ Shopify      💳 Stripe      🅿️ PayPal                 │
│                                                            │
│  CALENDAR (3/5 connected)                 + Add More       │
│  📅 Google Cal   📅 Outlook     🍎 Apple Calendar         │
│                                                            │
│  PROJECT MANAGEMENT (4/6 connected)       + Add More       │
│  ✓ Asana        📋 Trello      🎯 ClickUp  📝 Notion      │
│                                                            │
│  [Browse 40+ More Integrations →]                         │
└────────────────────────────────────────────────────────────┘

┌──────────────────── LIVE ACTIVITY ─────────────────────────┐
│  🤖 Auto-responded to 12 emails              2 min ago     │
│  📱 Posted to Twitter, LinkedIn              5 min ago     │
│  📞 Scheduled 3 meetings in Google Calendar  8 min ago     │
│  💬 Synced 47 new contacts to HubSpot       15 min ago     │
│  📊 Updated 8 deals in Salesforce           22 min ago     │
│  [View All Activity →]                                     │
└────────────────────────────────────────────────────────────┘

┌────────── AUTOMATION RULES ──────────┐ ┌──── ANALYTICS ────┐
│  ✓ Auto-respond to support emails    │ │  📊 47 Actions    │
│  ✓ Post daily content to social      │ │  ⏱️ 12.4 hrs saved│
│  ✓ Sync CRM contacts                 │ │  ✉️ 234 Emails    │
│  ✓ Schedule meetings automatically   │ │  📱 45 Posts      │
│  + Create New Rule                   │ │  [View Report →]  │
└──────────────────────────────────────┘ └───────────────────┘
```

---

## 🚨 Production/Dev Parity Issues

### Current Issues

1. **URLs**:
   - Dev: `http://localhost:5176`
   - Prod: `https://jarvis-ai.co`
   - Observatory Dev: `http://localhost:3000`
   - Observatory Prod: `https://dawg-ai.com`

2. **Environment Variables**:
   - No `.env.development`
   - No `.env.production`
   - No `.env.local`

3. **Build Configuration**:
   - Same build for dev and prod
   - No environment-specific builds

### Solution: Environment Management

```bash
# .env.development
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://nvyebkzrrvmepbdejspr.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_OBSERVATORY_URL=http://localhost:3000
VITE_ENVIRONMENT=development

# .env.production
VITE_API_URL=https://api.jarvis-ai.co
VITE_SUPABASE_URL=https://nvyebkzrrvmepbdejspr.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_OBSERVATORY_URL=https://dawg-ai.com
VITE_ENVIRONMENT=production
```

---

## 📦 New Dependencies Needed

```json
{
  "dependencies": {
    // Existing
    "@supabase/supabase-js": "^2.47.0",
    "lucide-react": "^0.400.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.0",

    // NEW - State Management
    "zustand": "^4.5.0",

    // NEW - Data Fetching
    "@tanstack/react-query": "^5.17.0",
    "axios": "^1.6.0",

    // NEW - Forms
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",

    // NEW - UI Components
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.0",
    "@radix-ui/react-switch": "^1.0.0",
    "sonner": "^1.3.0",

    // NEW - Utilities
    "date-fns": "^3.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",

    // NEW - OAuth & API Integrations
    "twitter-api-v2": "^1.15.0",
    "linkedin-api-client": "^1.0.0",
    "@hubspot/api-client": "^11.0.0",
    "googleapis": "^129.0.0",
    "stripe": "^14.0.0",

    // NEW - WebSocket
    "socket.io-client": "^4.6.0",

    // NEW - Environment
    "dotenv-flow": "^4.1.0"
  },
  "devDependencies": {
    // Existing
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.3",
    "vite": "^5.3.1",

    // NEW - Testing
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",

    // NEW - Code Quality
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0"
  }
}
```

---

## 🎯 Success Metrics

After refactoring, JARVIS should achieve:

1. **Autonomous Operation**:
   - ✅ Responds to emails within 30 seconds
   - ✅ Posts to social media on schedule
   - ✅ Syncs CRM contacts in real-time
   - ✅ Schedules meetings automatically

2. **Integration Coverage**:
   - ✅ 50+ platforms supported
   - ✅ OAuth connection in < 2 minutes
   - ✅ Real-time webhook processing
   - ✅ 99.9% uptime

3. **User Experience**:
   - ✅ Visual automation builder (no-code)
   - ✅ Real-time activity feed
   - ✅ Comprehensive analytics
   - ✅ One-click integration setup

---

## 🚀 Next Steps

1. **Immediate** (Today):
   - Create backend API structure
   - Set up environment management
   - Design integration architecture

2. **Week 1**:
   - Implement database schema
   - Build OAuth connector framework
   - Create first integration (Twitter)

3. **Week 2**:
   - Add automation rules engine
   - Build webhook receiver
   - Create activity logging system

4. **Week 3**:
   - Redesign dashboard with integration marketplace
   - Add 10 core integrations
   - Implement AI auto-responder

5. **Week 4**:
   - Full testing suite
   - Production deployment
   - User onboarding flow

---

## 💰 Cost Estimates

### Infrastructure
- Supabase (Pro): $25/mo
- Backend hosting (Railway/Render): $20/mo
- Redis (queue): $15/mo
- CDN (Cloudflare): Free
- **Total**: ~$60/mo

### Third-Party APIs
- OpenAI (GPT-4): ~$100/mo (usage-based)
- Webhook forwarding (ngrok): $8/mo
- **Total**: ~$108/mo

### Development Time
- Phase 1-3 (Foundation + Integrations): 8 weeks
- Phase 4-5 (Automation + AI): 4 weeks
- Phase 6 (Dashboard): 2 weeks
- **Total**: ~14 weeks (~3.5 months)

---

## ✅ Conclusion

**JARVIS requires a complete rewrite** from frontend demo to full-stack autonomous business platform.

**Priority 1**: Build backend API and integration framework
**Priority 2**: Implement core integrations (Social, CRM, Email)
**Priority 3**: Create automation engine and AI agents
**Priority 4**: Redesign dashboard with integration marketplace

**Recommendation**: Start with backend foundation and build integrations incrementally. Focus on 10 most-used platforms first, then expand.

---

**Ready to begin refactoring?** 🚀
