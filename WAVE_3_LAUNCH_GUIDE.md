# Wave 3 Launch Guide - Production-Ready Prompts

**All 15 critical production fixes applied and baked into each prompt.**

---

## 📋 Instance Prompts (Production-Ready)

### Individual Files
1. **WAVE_3_INSTANCE_1_FIXED.md** - Decision Engine (6h, CRITICAL PATH)
2. **WAVE_3_INSTANCE_2_FIXED.md** - BaseAgent + Marketing Agent (5h)
3. **WAVE_3_INSTANCES_3_4_5_FIXED.md** - Sales, Support, Operations + Orchestrator (14h combined)

All fixes from `PRODUCTION_READINESS_FIXES.md` are baked in.

---

## 🚀 Quick Launch Commands

### Instance 1 (Start NOW)
```bash
# Open Claude Code instance 1
"Execute WAVE_3_INSTANCE_1_FIXED.md - Build Decision Engine with all production fixes applied"
```

**Expected Output:**
- `src/core/decision-engine.ts` (~600 lines)
- `config/decision-rules.json` (~100 lines)
- `src/core/decision-engine.test.ts` (~500 lines)
- `docs/decision-framework.md` (~400 lines)

**Notify when 50% complete (3 hours)** - Instance 2 can start

---

### Instance 2 (Start at 3 hours)
```bash
# Open Claude Code instance 2
"Execute WAVE_3_INSTANCE_2_FIXED.md - Build BaseAgent and Marketing Agent with Brevo limits enforced"
```

**Expected Output:**
- `src/integrations/anthropic.ts` - Centralized model config
- `src/agents/base-agent.ts` (~400 lines)
- `src/agents/marketing-agent.ts` (~500 lines)
- Tests (~700 lines)

**Notify when BaseAgent complete** - Instances 3 & 4 can start

---

### Instance 3 (Start after Instance 2 BaseAgent)
```bash
# Open Claude Code instance 3
"Execute section 'Instance 3: Sales Agent' from WAVE_3_INSTANCES_3_4_5_FIXED.md - Build Sales Agent with HubSpot Private App token"
```

**Expected Output:**
- `src/agents/sales-agent.ts` (~600 lines)
- `config/lead-scoring-rules.json`
- `src/agents/sales-agent.test.ts` (~400 lines)

---

### Instance 4 (Parallel with Instance 3)
```bash
# Open Claude Code instance 4
"Execute section 'Instance 4: Support Agent' from WAVE_3_INSTANCES_3_4_5_FIXED.md - Build Support Agent with FTS queries"
```

**Expected Output:**
- `src/agents/support-agent.ts` (~650 lines)
- `src/agents/support-agent.test.ts` (~450 lines)

---

### Instance 5 (Start after Instances 2, 3, 4)
```bash
# Open Claude Code instance 5
"Execute section 'Instance 5: Operations + Orchestrator' from WAVE_3_INSTANCES_3_4_5_FIXED.md - Build final integration with cron timezone fixes"
```

**Expected Output:**
- `src/agents/operations-agent.ts` (~500 lines)
- `src/core/orchestrator.ts` (~600 lines)
- `src/index.ts` (~200 lines)
- `src/scheduler.ts` - With Arizona timezone
- Tests (~900 lines)

---

## ✅ Production Fixes Included

Every instance prompt includes:

### Auth Fixes
- ✅ HubSpot Private App token (not API key)
- ✅ Anthropic stable model ID (`claude-sonnet-4-5-20250929`)
- ✅ Buffer OAuth2 configuration

### Database Fixes
- ✅ Supabase count queries: `{ count: 'exact', head: true }`
- ✅ FTS queries: `fts.@@.plainto_tsquery(english.${query})`
- ✅ pgvector: lowercase `vector(1536)`

### Rate Limit Fixes
- ✅ Brevo 300/day limit enforced
- ✅ Email batching for >300 recipients
- ✅ Risk thresholds aligned with free tiers

### Code Quality Fixes
- ✅ Centralized model config (`CONFIG.anthropicModel`)
- ✅ ESM imports (`import express from 'express'`)
- ✅ Cron timezone (`America/Phoenix`)
- ✅ ApprovalQueue reject bug fixed

---

## 📊 Timeline (Parallel Execution)

```
Hour 0:  Instance 1 starts (Decision Engine)
Hour 3:  Instance 2 starts (BaseAgent + Marketing)
Hour 8:  Instance 3 & 4 start parallel (Sales + Support)
Hour 8:  Instance 5 starts (Operations + Orchestrator)
Hour 12: ALL COMPLETE! 🎉
```

**Total Time:** ~10-12 hours with 5 instances

---

## 🧪 Before Starting Wave 3

### 1. Run Database Migration
```bash
psql postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres \
  -f docs/database-schema.sql
```

This creates:
- All tables with proper indexes
- pgvector extension
- FTS tsvector columns
- Health check table

### 2. Install Dependencies
```bash
npm install
```

New packages added:
- express, node-cron, @notionhq/client, uuid, openai, @langchain/*

### 3. Update .env
```bash
cp .env.example .env
```

**CRITICAL updates:**
```bash
# Use Private App token (not API key)
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-xxx

# Use stable model
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Use Brevo (not SendGrid)
BREVO_API_KEY=xkeysib-xxx
BREVO_DAILY_LIMIT=300

# Set timezone
TZ=America/Phoenix
CRON_TIMEZONE=America/Phoenix
```

### 4. Verify Configuration
```bash
npm run typecheck
```

---

## 📝 Coordination Checklist

### Pre-Launch
- [ ] Database migration complete
- [ ] Dependencies installed
- [ ] .env file updated with correct tokens
- [ ] Config validation passes

### Instance 1 Checkpoints
- [ ] 0h: Started
- [ ] 3h: 50% complete → START INSTANCE 2
- [ ] 6h: Complete → Verify tests pass

### Instance 2 Checkpoints
- [ ] 0h: Started (after Instance 1 at 50%)
- [ ] 2h: BaseAgent complete → START INSTANCES 3 & 4
- [ ] 5h: Complete → Verify marketing agent works

### Instances 3 & 4 Checkpoints (Parallel)
- [ ] 0h: Both started
- [ ] 3h: Both complete → START INSTANCE 5

### Instance 5 Checkpoints
- [ ] 0h: Started
- [ ] 4h: Operations agent complete
- [ ] 6h: Orchestrator complete
- [ ] 8h: Integration complete → RUN FINAL TESTS

---

## 🎯 Final Verification

After all instances complete:

```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage

# Type check
npm run typecheck

# Build
npm run build

# Start system
npm start
```

**Expected:**
- ✅ 400+ tests passing
- ✅ >80% coverage across all components
- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ All integrations healthy

---

## 🚨 Troubleshooting

### Issue: Instance 2 can't find DecisionEngine
**Solution:** Instance 1 must be at least 50% complete

### Issue: HubSpot auth failing
**Solution:** Verify using `HUBSPOT_PRIVATE_APP_TOKEN` (not old API key)

### Issue: FTS queries not working
**Solution:** Verify database migration ran and created tsvector column

### Issue: Anthropic model not found
**Solution:** Verify using `claude-sonnet-4-5-20250929` (stable snapshot)

### Issue: Cron jobs running at wrong time
**Solution:** Verify `CRON_TIMEZONE=America/Phoenix` in .env

---

## 📚 Reference Documents

- **PRODUCTION_READINESS_FIXES.md** - Detailed fix documentation
- **FIXES_SUMMARY.md** - Quick reference guide
- **docs/database-schema.sql** - Complete schema
- **src/config/tools.ts** - Central configuration
- **.env.example** - All environment variables

---

## 🎉 Success Criteria

Wave 3 is complete when:

- [ ] All 5 instances finished
- [ ] All tests passing (400+ tests)
- [ ] Coverage >80%
- [ ] No TypeScript errors
- [ ] Health checks green
- [ ] Full system demo works
- [ ] Documentation complete

**Result:** Production-ready autonomous AI system! 🚀

---

## 💬 Communication Between Instances

### Instance 1 → Instance 2 (at 50%)
"Decision Engine 50% complete. DecisionEngine class and core interfaces ready. You can start BaseAgent."

### Instance 2 → Instances 3 & 4 (when BaseAgent done)
"BaseAgent complete and tested. Extend it in your Sales/Support agents."

### Instances 3 & 4 → Instance 5 (when both done)
"All agents complete. Starting final integration."

### Instance 5 → Team (when done)
"🎉 JARVIS COMPLETE! All systems operational."

---

**Ready to launch? Start Instance 1 now!** 🚀
