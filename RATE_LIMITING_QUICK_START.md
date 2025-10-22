# Rate Limiting Quick Start Guide

Fast setup guide to get rate limiting working in 5 minutes.

---

## Prerequisites

- ✅ Redis running on `localhost:6379` (or set `REDIS_URL`)
- ✅ PostgreSQL database configured
- ✅ Prisma installed

---

## Step 1: Environment Setup (30 seconds)

Add to `.env`:

```bash
REDIS_URL=redis://localhost:6379
```

Start Redis if not running:

```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Or Homebrew
brew services start redis
```

---

## Step 2: Database Migration (1 minute)

```bash
cd /Users/benkennon/Jarvis
npx prisma migrate dev --name add_rate_limiting
npx prisma generate
```

---

## Step 3: Apply to Gateway (1 minute)

Edit `src/core/gateway.ts`:

```typescript
import { applyRateLimiting } from '../config/apply-rate-limiting.js';

const app = express();

// Add after middleware, before routes
applyRateLimiting(app);
```

---

## Step 4: Start Server (30 seconds)

```bash
npm run dev:gateway
```

---

## Step 5: Test (1 minute)

```bash
# Get your rate limit status
curl http://localhost:4000/api/rate-limits/status \
  -H "Authorization: Bearer YOUR_API_KEY"

# Trigger rate limit
for i in {1..150}; do
  curl http://localhost:4000/api/data
done
```

---

## That's It! 🎉

Rate limiting is now active on all `/api/*` routes.

---

## Quick Reference

### Rate Limit Tiers

| Tier | AI/Day | API/Hour | API/Min |
|------|--------|----------|---------|
| Free Trial | 10 | 100 | 10 |
| Starter | 50 | 500 | 50 |
| Professional | 200 | 2,000 | 200 |
| Enterprise | ∞ | ∞ | 1,000 |

### Key Endpoints

```bash
# Get status
GET /api/rate-limits/status

# Get history
GET /api/rate-limits/history

# Reset (admin)
POST /api/rate-limits/reset
```

### Common Tasks

**Reset user limits** (admin):
```bash
curl -X POST http://localhost:4000/api/rate-limits/reset \
  -H "Authorization: Bearer ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'
```

**Check violations**:
```bash
curl http://localhost:4000/api/rate-limits/history \
  -H "Authorization: Bearer YOUR_KEY"
```

**Whitelist IP** (in code):
```typescript
import { addWhitelistedIP } from './middleware/rate-limit-bypass.js';
addWhitelistedIP('203.0.113.50', 'admin-id');
```

---

## Next Steps

1. Read full docs: `/docs/RATE_LIMITING.md`
2. Review examples: `/examples/rate-limiting-integration.ts`
3. Add dashboard: Use `<RateLimitStatus />` component
4. Configure monitoring: Track violations and usage

---

## Troubleshooting

**Redis connection error?**
```bash
redis-cli ping  # Should return PONG
```

**Rate limiting not working?**
```bash
# Check logs
tail -f logs/app.log | grep rate

# Verify middleware applied
grep -r "applyRateLimiting" src/
```

**Always getting 429?**
- Check if banned: `GET /api/rate-limits/history`
- Verify tier: `GET /api/rate-limits/status`
- Could be hitting endpoint-specific limit

---

## Support

- 📚 Full Documentation: `/docs/RATE_LIMITING.md`
- 💡 Examples: `/examples/rate-limiting-integration.ts`
- 📊 Summary: `/RATE_LIMITING_IMPLEMENTATION_SUMMARY.md`
