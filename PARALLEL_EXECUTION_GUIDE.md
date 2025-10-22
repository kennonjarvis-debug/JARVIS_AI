# Jarvis Parallel Development - Execution Guide

**Quick reference for executing parallel development with multiple Claude Code instances**

---

## Overview

This guide shows how to distribute the 15 development prompts across multiple Claude Code instances for maximum efficiency. Total estimated development time: **40-60 hours** (can be reduced to **10-15 hours** with 4-5 parallel instances).

---

## Execution Waves

### Wave 1: Foundation (No Dependencies)
**Run all 5 in parallel - Estimated time: 2-4 hours each**

| Prompt | File | Component | Est. Time |
|--------|------|-----------|-----------|
| 1 | `prompts/01-init-structure.md` | Project initialization | 2h |
| 2 | `prompts/02-logger-utility.md` | Logger utility | 3h |
| 3 | `prompts/03-error-handler.md` | Error handler | 3h |
| 4 | `prompts/04-supabase-integration.md` | Supabase adapter | 4h |
| 5 | `prompts/05-type-definitions.md` | TypeScript types | 2h |

**Commands:**
```bash
# Instance 1
cd /path/to/Jarvis-v0
# Paste Prompt 1 content

# Instance 2
cd /path/to/Jarvis-v0
# Paste Prompt 2 content

# Instance 3
cd /path/to/Jarvis-v0
# Paste Prompt 3 content

# Instance 4
cd /path/to/Jarvis-v0
# Paste Prompt 4 content

# Instance 5
cd /path/to/Jarvis-v0
# Paste Prompt 5 content
```

---

### Wave 2: Integrations & Core Systems (Low Dependencies)
**Run 6 in parallel after Wave 1 completes - Estimated time: 3-6 hours each**

| Prompt | File | Component | Dependencies | Est. Time |
|--------|------|-----------|--------------|-----------|
| 6 | `prompts/06-buffer-integration.md` | Buffer adapter | Logger, Errors, Types | 4h |
| 7 | `prompts/07-hubspot-integration.md` | HubSpot adapter | Logger, Errors, Types | 4h |
| 8 | `prompts/08-email-integration.md` | Email adapter | Logger, Errors, Types | 4h |
| 9 | `prompts/09-n8n-integration.md` | n8n adapter | Logger, Errors, Types | 3h |
| 10 | `prompts/10-memory-system.md` | Memory system | Supabase, Logger, Types | 5h |
| 11 | `prompts/11-approval-queue.md` | Approval queue | Supabase, Email, Logger, Types | 6h |

**Commands:**
```bash
# Wait for Wave 1 to complete, then:

# Instance 1
cd /path/to/Jarvis-v0
# Paste Prompt 6 content

# Instance 2
cd /path/to/Jarvis-v0
# Paste Prompt 7 content

# Continue for Prompts 8-11...
```

---

### Wave 3: Agents & Orchestration (High Dependencies)
**Run 2-3 in parallel after Wave 2 completes - Estimated time: 4-8 hours each**

| Prompt | File | Component | Dependencies | Est. Time |
|--------|------|-----------|--------------|-----------|
| 12 | `prompts/12-decision-engine.md` | Decision engine | Memory, Approval, All integrations | 6h |
| 13 | `prompts/13-marketing-agent.md` | Marketing agent | Decision engine, Buffer, Email | 5h |
| 14 | `prompts/14-sales-support-agents.md` | Sales & Support agents | Decision engine, HubSpot, Email | 6h |
| 15 | `prompts/15-operations-orchestrator.md` | Ops agent & Orchestrator | All agents, All integrations | 8h |

**Recommended Order:**
1. Start Prompt 12 (Decision Engine) first
2. Once Prompt 12 is ~50% complete, start Prompts 13 & 14 in parallel
3. Once Prompts 13 & 14 are complete, start Prompt 15

**Commands:**
```bash
# Sequential with overlap:

# Instance 1 - Start immediately
cd /path/to/Jarvis-v0
# Paste Prompt 12 content

# Instance 2 - Start after Prompt 12 is 50% done
cd /path/to/Jarvis-v0
# Paste Prompt 13 content

# Instance 3 - Start after Prompt 12 is 50% done
cd /path/to/Jarvis-v0
# Paste Prompt 14 content

# Instance 1 - After Prompt 12 completes
cd /path/to/Jarvis-v0
# Paste Prompt 15 content
```

---

## Optimal Resource Allocation

### With 5 Claude Code Instances

**Timeline: 10-15 hours total**

**Hour 0-4 (Wave 1):**
- Instance A: Prompt 1 (2h) → Prompt 6 (4h starts at 2h)
- Instance B: Prompt 2 (3h) → Prompt 7 (starts at 3h)
- Instance C: Prompt 3 (3h) → Prompt 8 (starts at 3h)
- Instance D: Prompt 4 (4h) → Prompt 9 (starts at 4h)
- Instance E: Prompt 5 (2h) → Prompt 10 (5h starts at 2h)

**Hour 4-10 (Wave 2):**
- Instance A: Prompt 6 continues → Prompt 12 (starts at 6h)
- Instance B: Prompt 7 continues → Prompt 12 (assist)
- Instance C: Prompt 8 continues
- Instance D: Prompt 9 continues → Prompt 11 (starts at 7h)
- Instance E: Prompt 10 continues

**Hour 10-15 (Wave 3):**
- Instance A: Prompt 12 continues (6h total)
- Instance B: Prompt 13 (starts at 11h after Prompt 12 is 50%)
- Instance C: Prompt 14 (starts at 11h after Prompt 12 is 50%)
- Instance D: Prompt 11 continues
- Instance E: Testing/integration

**Hour 15+ (Final):**
- Instance A or B: Prompt 15 (8h)
- Others: Integration testing, bug fixes

---

### With 3 Claude Code Instances

**Timeline: 20-25 hours total**

**Hours 0-8 (Wave 1 + Start Wave 2):**
- Instance A: Prompts 1, 2, 6, 7
- Instance B: Prompts 3, 4, 8
- Instance C: Prompts 5, 9, 10

**Hours 8-15 (Wave 2 Complete):**
- Instance A: Prompt 11
- Instance B: Prompt 12
- Instance C: Testing/integration

**Hours 15-25 (Wave 3):**
- Instance A: Prompt 13
- Instance B: Prompt 14
- Instance C: Prompt 15

---

### With 2 Claude Code Instances

**Timeline: 30-35 hours total**

**Instance A (Primary):**
- Wave 1: Prompts 1, 2, 3 (8h)
- Wave 2: Prompts 6, 7, 10 (13h)
- Wave 3: Prompts 12, 13 (11h)
- **Total: 32h**

**Instance B (Secondary):**
- Wave 1: Prompts 4, 5 (6h)
- Wave 2: Prompts 8, 9, 11 (13h)
- Wave 3: Prompts 14, 15 (14h)
- **Total: 33h**

---

## Instructions for Each Instance

### Setting Up a New Instance

```bash
# 1. Open new terminal/Claude Code session
cd /Users/benkennon/Jarvis-v0

# 2. If directory doesn't exist yet (for first instance):
mkdir -p Jarvis-v0
cd Jarvis-v0

# 3. Initialize git (Prompt 1 does this, but if not started):
git init

# 4. Load the design document
cat JARVIS_DESIGN_AND_PROMPTS.md
```

### Executing a Prompt

1. Open the design document: `JARVIS_DESIGN_AND_PROMPTS.md`
2. Navigate to the specific prompt section (e.g., "PROMPT 6: Build Buffer Integration")
3. Copy the entire prompt content (from `# Prompt X` to end of that section)
4. Paste into Claude Code as your instruction
5. Let Claude Code execute the prompt
6. Verify completion with acceptance criteria checklist
7. Commit the changes:
   ```bash
   git add .
   git commit -m "Complete Prompt X: [Component Name]"
   ```

### Syncing Between Instances

If working in the same repository:

```bash
# Before starting new prompt
git pull origin main

# After completing prompt
git push origin main
```

If working in separate directories (merge later):

```bash
# Each instance works in isolated directory
# Merge manually after all prompts complete
```

---

## Verification Checklist

### After Wave 1
- [ ] `package.json` exists with all dependencies
- [ ] TypeScript compiles: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Supabase schema created: Check `config/supabase-schema.sql`
- [ ] Types exported: `src/types/index.ts` exports all types

### After Wave 2
- [ ] All integration adapters exist in `src/integrations/`
- [ ] Each integration has tests
- [ ] Memory system can store/query
- [ ] Approval queue can create requests
- [ ] All tests pass: `npm test`

### After Wave 3
- [ ] Decision engine evaluates tasks
- [ ] All 4 agents exist: Marketing, Sales, Support, Operations
- [ ] Orchestrator routes tasks correctly
- [ ] End-to-end test passes: Task submission → Agent execution → Result
- [ ] All tests pass: `npm test`

---

## Common Issues & Solutions

### Issue: Type conflicts between prompts

**Solution:**
```bash
# Re-export types from single source
# Edit src/types/index.ts to consolidate
```

### Issue: Dependency version conflicts

**Solution:**
```bash
# Lock versions in package.json
npm install
```

### Issue: Integration tests failing

**Solution:**
```bash
# Use mocked APIs for tests
# Check each integration's test file for mock setup
```

### Issue: Supabase schema conflicts

**Solution:**
```bash
# Reset local Supabase
npx supabase db reset
```

---

## Final Integration Steps

After all prompts complete:

### 1. Create Main Entry Point

```typescript
// src/index.ts
import { Orchestrator } from './core/orchestrator';
import {
  MarketingAgent,
  SalesAgent,
  SupportAgent,
  OperationsAgent
} from './agents';
import { DecisionEngine } from './core/decision-engine';
import { MemorySystem } from './core/memory';
import { ApprovalQueue } from './core/approval-queue';
// ... import all integrations

async function main() {
  // Initialize all components
  const supabase = new SupabaseAdapter({...});
  const memory = new MemorySystem(supabase);
  const approvalQueue = new ApprovalQueue(supabase, [...]);
  const decisionEngine = new DecisionEngine([...]);

  // Initialize agents
  const marketingAgent = new MarketingAgent({...});
  const salesAgent = new SalesAgent({...});
  const supportAgent = new SupportAgent({...});
  const opsAgent = new OperationsAgent({...});

  // Initialize orchestrator
  const orchestrator = new Orchestrator({
    agents: [marketingAgent, salesAgent, supportAgent, opsAgent],
    integrations: {...},
    decisionEngine,
    approvalQueue,
    memory,
  });

  await orchestrator.initialize();

  console.log('Jarvis is running...');
}

main().catch(console.error);
```

### 2. Run Integration Tests

```bash
npm run test:integration
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Submit First Test Task

```bash
# Use API or CLI to submit test task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "marketing.social.post",
    "priority": 2,
    "data": {
      "platform": "twitter",
      "topic": "test post"
    },
    "requestedBy": "test"
  }'
```

---

## Parallel Execution Command Summary

### Quick Start (5 Instances)

```bash
# Terminal 1
cd ~/Jarvis-v0 && claude-code
# Execute Prompt 1, then Prompt 6, then Prompt 12

# Terminal 2
cd ~/Jarvis-v0 && claude-code
# Execute Prompt 2, then Prompt 7, then Prompt 13

# Terminal 3
cd ~/Jarvis-v0 && claude-code
# Execute Prompt 3, then Prompt 8, then Prompt 14

# Terminal 4
cd ~/Jarvis-v0 && claude-code
# Execute Prompt 4, then Prompt 9, then Prompt 11

# Terminal 5
cd ~/Jarvis-v0 && claude-code
# Execute Prompt 5, then Prompt 10, then Prompt 15
```

---

## Time Estimates by Developer Experience

| Experience Level | Wave 1 | Wave 2 | Wave 3 | Total (Sequential) | Total (5 Parallel) |
|------------------|--------|--------|--------|--------------------|--------------------|
| Senior Dev | 10h | 20h | 20h | 50h | 12h |
| Mid-level Dev | 14h | 26h | 25h | 65h | 15h |
| Junior Dev | 18h | 32h | 30h | 80h | 18h |

---

## Success Criteria

### Minimum Viable Product (MVP)
- [ ] Orchestrator routes tasks to agents
- [ ] Marketing agent posts to social media
- [ ] Sales agent qualifies leads
- [ ] Support agent responds to tickets
- [ ] Decision engine evaluates risk
- [ ] Approval queue handles high-risk tasks

### Full Feature Set
- [ ] All 15 prompts completed
- [ ] All tests passing (>85% coverage)
- [ ] Integration tests pass
- [ ] Documentation complete
- [ ] Deployed to production
- [ ] First autonomous task executed successfully

---

## Next Steps

1. **Decide on resource allocation**: How many Claude Code instances can you run in parallel?
2. **Start Wave 1**: Execute prompts 1-5 in parallel
3. **Monitor progress**: Use acceptance criteria in each prompt
4. **Start Wave 2**: Once Wave 1 completes
5. **Start Wave 3**: Once Wave 2 completes
6. **Integrate**: Combine all components
7. **Test**: Run full integration tests
8. **Deploy**: Push to production

---

**Ready to start? Begin with Wave 1 - Prompt 1!**
