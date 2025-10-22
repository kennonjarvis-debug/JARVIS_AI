# Jarvis Observatory - Setup Guide

Complete guide to get the Observatory running with live data from Supabase.

---

## 📋 Prerequisites

- Node.js 18+
- Supabase account (free tier works great!)
- 10-15 minutes

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Create a new organization (or use existing)
4. Click "New Project"
   - Name: `jarvis-observatory`
   - Database Password: (generate strong password)
   - Region: (closest to you)
5. Wait 2-3 minutes for project to initialize

### Step 2: Run SQL Schema

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` (in project root)
4. Paste into SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see: "Success. No rows returned"

This creates all 7 tables with indexes, views, and helper functions.

### Step 3: Get API Keys

1. In Supabase dashboard, go to **Settings** -> **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (only for setup script)

### Step 4: Configure Environment

1. In the `observatory` directory, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your values:
   ```bash
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### Step 5: Seed Database (Optional but Recommended)

Run the setup script to populate with initial data:

```bash
npm run db:setup
```

Or manually insert seed data using the helper functions in Supabase SQL Editor:

```sql
-- Seed a business metric
SELECT update_business_metric('marketing', 'posts_today', 8, 'count');

-- Log an event
SELECT log_event(
  'agent.task.completed',
  'Marketing Agent',
  'Posted to Twitter',
  'info'
);
```

---

## ✅ Verify Setup

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:5175

3. Check that data is loading:
   - Overview page shows business metrics
   - Logs page shows events
   - Agents page shows agent runs

4. Open browser console - you should see NO Supabase errors

---

## 🔄 Enable Real-time Updates

Supabase real-time is already enabled! The Observatory will automatically update when:
- New events are logged
- Metrics are updated
- Agent runs are recorded

To test:
1. Go to **Table Editor** in Supabase
2. Add a new event manually
3. Watch it appear in the Observatory within seconds!

---

## 🤖 Connect Jarvis Backend (Optional)

To have the Jarvis autonomous agents push data to Observatory:

### Option 1: Use Same Supabase Project

1. Copy the `.env` values to Jarvis backend:
   ```bash
   # In Jarvis-v0/.env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

2. Jarvis agents will automatically log to the same database!

### Option 2: Use the Helper Functions

In Jarvis agent code:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Log an event
await supabase.from('events').insert({
  type: 'agent.task.completed',
  agent: 'Marketing Agent',
  description: 'Posted to Twitter',
  severity: 'info',
  metadata: { post_id: '123' }
});

// Update a business metric
await supabase.from('business_metrics').upsert({
  module: 'marketing',
  metric_name: 'posts_today',
  metric_value: 10,
  last_updated: new Date().toISOString()
});
```

---

## 🎯 Testing Live Data

### Simulate Agent Activity

Run this in Supabase SQL Editor to simulate live agent activity:

```sql
-- Marketing Agent posts
INSERT INTO events (type, agent, description, severity)
VALUES ('agent.task.completed', 'Marketing Agent', 'Posted to LinkedIn', 'info');

-- Update metrics
INSERT INTO business_metrics (module, metric_name, metric_value, unit)
VALUES ('marketing', 'posts_today', 9, 'count')
ON CONFLICT (module, metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  last_updated = NOW();

-- Add agent run
INSERT INTO agent_runs (agent_id, agent_name, task_type, status, duration_ms)
VALUES ('marketing', 'Marketing Agent', 'social_post', 'completed', 2100);
```

Watch the Observatory update in real-time!

---

## 📊 Database Tables Overview

| Table | Purpose | Updates |
|-------|---------|---------|
| `events` | System-wide event log | Real-time |
| `business_metrics` | Current metric values | Real-time |
| `agent_runs` | Agent execution history | Real-time |
| `approvals` | Pending approvals | Real-time |
| `metrics_daily` | Daily aggregations | Batch |
| `system_health` | Component health | Every 30s |
| `dawg_ai_modules` | Module progress | Manual |

---

## 🔧 Troubleshooting

### "Failed to fetch" errors

**Problem**: Observatory can't connect to Supabase

**Solution**:
1. Check `.env` file exists and has correct values
2. Verify Supabase project is running (not paused)
3. Check browser console for specific error
4. Restart dev server: `npm run dev`

### No data showing

**Problem**: Tables are empty

**Solution**:
1. Run seed data script: `npm run db:setup`
2. Or manually insert data via Supabase SQL Editor
3. Check Supabase **Table Editor** to verify data exists

### Real-time not working

**Problem**: Data doesn't update automatically

**Solution**:
1. In Supabase, go to **Database** -> **Replication**
2. Ensure tables have replication enabled
3. Check browser console for subscription errors
4. Hard refresh browser (Cmd/Ctrl + Shift + R)

### TypeScript errors

**Problem**: Type errors about Supabase

**Solution**:
```bash
npm install @supabase/supabase-js
```

---

## 🎉 You're Done!

The Observatory is now connected to live data!

**What's working:**
- ✅ Real-time event stream
- ✅ Live business metrics
- ✅ Agent monitoring
- ✅ DAWG AI progress tracking
- ✅ Automatic updates every 30 seconds
- ✅ Jarvis AI copilot

**Next steps:**
- Connect Jarvis backend to push real agent data
- Customize metrics for your needs
- Add more agents and modules
- Set up daily aggregations for historical data

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **SvelteKit Docs**: https://kit.svelte.dev
- **Observatory README**: See README.md for features
- **Database Schema**: See supabase-schema.sql for structure

---

**Need help?** Check the troubleshooting section or open an issue.

Happy monitoring! 🚀
