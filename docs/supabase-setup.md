# Supabase Integration Setup Guide

## Overview

This guide covers the setup and configuration of the Supabase integration for Jarvis autonomous agent system. The Supabase adapter provides persistent storage for tasks, memories, approvals, and decision rules.

---

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Supabase CLI (for local development)

---

## Local Development Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase in Your Project

```bash
# From the project root
npx supabase init
```

This creates a `supabase/` directory with configuration files.

### 3. Start Local Supabase Instance

```bash
npx supabase start
```

This starts Docker containers for:
- PostgreSQL database
- Supabase Studio (UI at http://localhost:54323)
- API services

**Note:** Docker must be running on your system.

### 4. Run Migrations

Apply the database schema:

```bash
# Copy migration to Supabase migrations directory
cp migrations/001_initial_schema.sql supabase/migrations/

# Run migrations
npx supabase db reset
```

### 5. Get Local Credentials

```bash
npx supabase status
```

Copy the credentials and add them to `.env`:

```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<anon-key-from-status>
SUPABASE_SERVICE_KEY=<service-role-key-from-status>
```

---

## Production Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database provisioning (2-3 minutes)

### 2. Run Migrations

#### Option A: Via Supabase Dashboard

1. Open your project in Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `config/supabase-schema.sql`
4. Run the SQL

#### Option B: Via CLI (Recommended)

```bash
# Link to your project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

### 3. Configure Environment Variables

From your Supabase project settings:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<anon-key-from-settings>
SUPABASE_SERVICE_KEY=<service-role-key-from-settings>
```

**Security Note:** Keep `SUPABASE_SERVICE_KEY` secret! It has full database access.

---

## Database Schema

The Supabase integration uses 4 main tables:

### Tasks Table

Stores all task submissions and execution results.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | TEXT | Task type (e.g., 'marketing.social.post') |
| priority | INTEGER | 0-3 (CRITICAL to LOW) |
| data | JSONB | Task-specific data |
| status | TEXT | 'pending', 'in_progress', 'completed', 'failed', 'pending_approval' |
| result | JSONB | Task execution result |
| error | TEXT | Error message if failed |
| agent_id | TEXT | Agent that executed the task |
| requested_by | TEXT | User who requested the task |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| metadata | JSONB | Additional metadata |

### Memories Table

Stores contextual information for learning and decision-making.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | TEXT | Memory type (task_execution, user_feedback, etc.) |
| content | JSONB | Memory content |
| agent_id | TEXT | Associated agent |
| task_id | UUID | Associated task (FK to tasks) |
| tags | TEXT[] | Searchable tags |
| importance | DECIMAL | 0-1 importance score for pruning |
| created_at | TIMESTAMP | Creation timestamp |

### Approvals Table

Manages human-in-the-loop approval workflow.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| task_id | UUID | Associated task (FK to tasks) |
| task_type | TEXT | Type of task requiring approval |
| requested_action | TEXT | Description of proposed action |
| reasoning | TEXT | Why this action is needed |
| risk_level | TEXT | 'low', 'medium', 'high', 'critical' |
| estimated_impact | JSONB | Financial and other impacts |
| alternatives | JSONB | Alternative approaches |
| decision | TEXT | 'approved', 'rejected', 'modified', or NULL |
| responded_by | TEXT | Who responded to the approval |
| feedback | TEXT | Human feedback on the decision |
| modifications | JSONB | Any modifications to the original request |
| requested_at | TIMESTAMP | When approval was requested |
| responded_at | TIMESTAMP | When approval was responded to |
| expires_at | TIMESTAMP | Approval expiration time |
| metadata | JSONB | Additional metadata |

### Decision Rules Table

Configurable rules for autonomous decision-making.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| rule_id | TEXT | Unique rule identifier |
| task_types | TEXT[] | Task types this rule applies to |
| condition | JSONB | Rule condition logic |
| risk_level | TEXT | Risk level of this rule |
| requires_approval | BOOLEAN | Whether approval is needed |
| description | TEXT | Human-readable description |
| active | BOOLEAN | Whether rule is active |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

---

## Usage Examples

### Basic Usage

```typescript
import { SupabaseAdapter, TaskType, Priority } from './integrations/supabase';

// Initialize adapter
const adapter = new SupabaseAdapter({
  url: process.env.SUPABASE_URL!,
  anonKey: process.env.SUPABASE_ANON_KEY!,
  serviceKey: process.env.SUPABASE_SERVICE_KEY,
});

// Initialize tables (one-time setup validation)
await adapter.initializeTables();

// Store a task
await adapter.storeTask({
  id: crypto.randomUUID(),
  type: TaskType.MARKETING_SOCIAL_POST,
  priority: Priority.MEDIUM,
  data: { platform: 'twitter', content: 'Hello world' },
  requestedBy: 'user@example.com',
  timestamp: new Date(),
});

// Query tasks
const tasks = await adapter.queryTasks({
  type: TaskType.MARKETING_SOCIAL_POST,
  status: 'completed',
  limit: 10,
});

// Store memory
const memoryId = await adapter.storeMemory({
  type: MemoryType.TASK_EXECUTION,
  content: { result: 'success', metrics: { likes: 42 } },
  timestamp: new Date(),
  agentId: 'marketing-agent',
  tags: ['social', 'twitter'],
  importance: 0.7,
});
```

### Advanced Queries

```typescript
// Query memories with filters
const memories = await adapter.queryMemories({
  type: MemoryType.TASK_EXECUTION,
  agentId: 'marketing-agent',
  tags: ['social', 'success'],
  minImportance: 0.5,
  since: new Date('2025-10-01'),
  limit: 20,
});

// Get pending approvals
const pending = await adapter.getPendingApprovals();

// Prune old memories
const deletedCount = await adapter.pruneMemories(
  new Date('2025-01-01'), // older than this date
  0.3 // and importance <= 0.3
);
```

### Health Checks

```typescript
// Check Supabase connection
const isHealthy = await adapter.healthCheck();
if (!isHealthy) {
  console.error('Supabase connection failed');
}
```

---

## Features

### ✅ Automatic Retry Logic

The adapter automatically retries transient failures (network issues, timeouts) with exponential backoff:

- Max retries: 3
- Initial delay: 1 second
- Exponential backoff: 2x per retry

Non-retryable errors (validation, auth, not found) fail immediately.

### ✅ Type Safety

Full TypeScript support with exported types for all operations.

### ✅ Connection Pooling

Supabase client handles connection pooling automatically.

### ✅ Query Optimization

All tables have appropriate indexes for common query patterns:
- Tasks: type, status, created_at, agent_id, priority
- Memories: type, task_id, created_at, agent_id, importance, tags
- Approvals: task_id, decision, requested_at, expires_at

### ✅ Utility Functions

Database functions for complex operations:
- `prune_old_memories()`: Efficient memory cleanup
- `get_expired_approvals()`: Find expired approval requests

---

## Maintenance

### Database Backups

Supabase provides automatic daily backups on all plans.

To manually backup:

```bash
# Local development
npx supabase db dump -f backup.sql

# Production (via dashboard)
# Settings → Database → Backups
```

### Monitoring

Monitor your Supabase instance:

```bash
# View logs
npx supabase logs

# Check database size
npx supabase db inspect
```

### Memory Cleanup

Run periodic memory pruning to prevent database bloat:

```typescript
// Prune memories older than 90 days with importance <= 0.3
await adapter.pruneMemories(
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  0.3
);
```

---

## Troubleshooting

### Connection Issues

```typescript
// Test connection
const isHealthy = await adapter.healthCheck();
console.log('Connection healthy:', isHealthy);
```

### Migration Errors

If migrations fail:

```bash
# Reset local database
npx supabase db reset

# Or push fresh schema
npx supabase db push --include-all
```

### Query Performance

Check slow queries in Supabase Dashboard:
1. Go to Database → Query Performance
2. Identify slow queries
3. Add indexes if needed

### Rate Limits

Supabase free tier limits:
- 500MB database
- 2GB bandwidth/month
- 50,000 API requests/month

Monitor usage in Supabase Dashboard → Settings → Usage.

---

## Security Best Practices

1. **Never expose `SUPABASE_SERVICE_KEY`** in client-side code
2. Use Row Level Security (RLS) for production (see schema comments)
3. Rotate keys periodically via Supabase Dashboard
4. Use environment variables, never hardcode credentials
5. Enable 2FA on Supabase account

---

## Testing

Run tests with mocked Supabase client:

```bash
npm test src/integrations/supabase.test.ts
```

For integration tests with real Supabase:

```bash
# Start local Supabase
npx supabase start

# Run integration tests
npm run test:integration
```

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Jarvis Architecture Overview](../JARVIS_DESIGN_AND_PROMPTS.md)

---

## Support

For issues with the Supabase adapter:
1. Check this documentation
2. Review test cases in `src/integrations/supabase.test.ts`
3. Consult the API contract in `JARVIS_DESIGN_AND_PROMPTS.md`
4. Check Supabase status: https://status.supabase.com

---

**Last Updated:** 2025-10-15
**Version:** 1.0
**Author:** Claude Code Instance 4
