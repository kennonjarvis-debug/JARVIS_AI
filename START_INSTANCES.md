# Quick Start: Launch All Instances

**Copy-paste these commands into separate terminals to start Wave 2 development**

---

## Prerequisites

```bash
# Navigate to project
cd /Users/benkennon/Jarvis-v0

# Ensure dependencies installed
npm install

# Verify tests work
npm test
```

---

## Launch Commands (Parallel Execution)

### Instance 1: Buffer Integration
```bash
cd /Users/benkennon/Jarvis-v0 && \
claude code "You are Instance 1 building Prompt 6: Buffer Integration.

Read INSTANCE_1_PROMPT.md for complete instructions.

Build the Buffer API adapter for social media management:
- Create src/integrations/buffer.ts
- Create src/integrations/buffer.test.ts (15+ tests, >85% coverage)
- Create docs/buffer-setup.md
- Implement all methods from API contract
- Use Logger and ErrorHandler from existing utilities
- Handle rate limiting (10 calls/min)
- Support Twitter, LinkedIn, Facebook

Acceptance criteria in the prompt file. Create PROMPT_6_COMPLETION.md when done."
```

---

### Instance 2: HubSpot Integration
```bash
cd /Users/benkennon/Jarvis-v0 && \
claude code "You are Instance 2 building Prompt 7: HubSpot Integration.

Read INSTANCE_4_PROMPT.md for complete instructions.

Build the HubSpot CRM adapter for lead/customer management:
- Create src/integrations/hubspot.ts
- Create src/integrations/hubspot.test.ts (18+ tests, >85% coverage)
- Create docs/hubspot-setup.md
- Implement contact CRUD, deal management, activity logging
- Use Logger and ErrorHandler from existing utilities
- Handle rate limiting (100/10s)
- Support HubSpot API v3

Acceptance criteria in the prompt file. Create PROMPT_7_COMPLETION.md when done."
```

---

### Instance 3: Email Integration
```bash
cd /Users/benkennon/Jarvis-v0 && \
claude code "You are Instance 3 building Prompt 8: Email Integration.

Read INSTANCE_3_PROMPT.md for complete instructions.

Build the Email adapter for transactional and bulk email:
- Create src/integrations/email.ts
- Create src/integrations/email.test.ts (20+ tests, >85% coverage)
- Create docs/email-setup.md
- Create config/email-templates.json
- Implement SendGrid integration (100 emails/day free tier)
- Use Logger and ErrorHandler from existing utilities
- Support single, bulk, and templated emails
- Handle attachments

Acceptance criteria in the prompt file. Create PROMPT_8_COMPLETION.md when done."
```

---

### Instance 4: n8n Integration
```bash
cd /Users/benkennon/Jarvis-v0 && \
claude code "You are Instance 4 building Prompt 9: n8n Integration.

Read INSTANCE_5_PROMPT.md for complete instructions.

Build the n8n workflow automation adapter:
- Create src/integrations/n8n.ts
- Create src/integrations/n8n.test.ts (12+ tests, >80% coverage)
- Create docs/n8n-workflows.md
- Create config/n8n-workflows/ with 7 workflow definitions
- Implement workflow triggering and monitoring
- Use Logger and ErrorHandler from existing utilities
- Handle async execution

Acceptance criteria in the prompt file. Create PROMPT_9_COMPLETION.md when done."
```

---

### Instance 5: Approval Queue (Start after Email reaches 50%)
```bash
cd /Users/benkennon/Jarvis-v0 && \
claude code "You are Instance 5 building Prompt 11: Approval Queue.

Read JARVIS_DESIGN_AND_PROMPTS.md section 'PROMPT 11: Build Approval Queue System'.

Build the human-in-loop approval system:
- Create src/core/approval-queue.ts
- Create src/core/approval-queue.test.ts (25+ tests, >85% coverage)
- Create docs/approval-workflow.md
- Implement approval request creation, retrieval, approval/rejection
- Send email notifications using Email adapter (from Prompt 8)
- Use Supabase for storage
- Use Logger and ErrorHandler
- Handle expiration (24-hour default)

IMPORTANT: This depends on Email Integration (Prompt 8) being complete.

Create PROMPT_11_COMPLETION.md when done."
```

---

## Alternative: One-at-a-Time (Sequential)

If you prefer sequential execution:

### Step 1: Email (Most Dependencies)
```bash
cd /Users/benkennon/Jarvis-v0
# Paste Instance 3 command above
```

Wait for completion (~4 hours), then:

### Step 2: Buffer
```bash
# Paste Instance 1 command
```

### Step 3: HubSpot
```bash
# Paste Instance 2 command
```

### Step 4: n8n
```bash
# Paste Instance 4 command
```

### Step 5: Approval Queue
```bash
# Paste Instance 5 command
```

**Total Time Sequential:** 15-20 hours

---

## Monitoring Progress

### Check Completion Status
```bash
# See which prompts are done
ls -la *COMPLETION*.md

# Check recent changes
git status

# See test results
npm test
```

### Track Files Created
```bash
# Integration files
ls -la src/integrations/

# Core files
ls -la src/core/

# Docs
ls -la docs/

# Config
ls -la config/
```

---

## When All Instances Complete

### Verify Integration
```bash
# Run all tests
npm test

# Type check
npm run typecheck

# Check coverage
npm run test:coverage
```

### Update Status
Edit `PROJECT_STATUS.md`:
```markdown
### Wave 2: Integrations & Core Systems (100% Complete)
- [x] Prompt 6: Buffer Integration ✅
- [x] Prompt 7: HubSpot Integration ✅
- [x] Prompt 8: Email Integration ✅
- [x] Prompt 9: n8n Integration ✅
- [x] Prompt 10: Memory System ✅
- [x] Prompt 11: Approval Queue ✅
```

### Prepare for Wave 3
Read `JARVIS_DESIGN_AND_PROMPTS.md` section "Wave 3: Agents & Orchestration"

---

## Troubleshooting

### If an instance gets stuck:
1. Check error logs
2. Read the completion criteria in the prompt file
3. Verify all dependencies are met
4. Ask Claude to "summarize what you've completed so far"

### If tests fail:
```bash
# Check specific test file
npm test -- src/integrations/buffer.test.ts --reporter=verbose

# Check TypeScript errors
npm run typecheck

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### If imports fail:
Verify paths in completed files:
```typescript
// Should work:
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import { SupabaseAdapter } from './supabase';
```

---

## Expected Output After Wave 2

### Files Created (17 new files)
```
src/integrations/
  buffer.ts
  buffer.test.ts
  hubspot.ts
  hubspot.test.ts
  email.ts
  email.test.ts
  n8n.ts
  n8n.test.ts

src/core/
  approval-queue.ts
  approval-queue.test.ts

docs/
  buffer-setup.md
  hubspot-setup.md
  email-setup.md
  n8n-workflows.md
  approval-workflow.md

config/
  email-templates.json
  n8n-workflows/
    (7 workflow files)

Root:
  PROMPT_6_COMPLETION.md
  PROMPT_7_COMPLETION.md
  PROMPT_8_COMPLETION.md
  PROMPT_9_COMPLETION.md
  PROMPT_11_COMPLETION.md
```

### Lines of Code Added
- **Source Code:** ~2,500 lines
- **Test Code:** ~2,000 lines
- **Documentation:** ~2,000 lines
- **Total:** ~6,500 lines

### Test Count
- **Wave 2 Tests:** 90+ new tests
- **Total Project Tests:** 220+ tests
- **Coverage:** >85% for all new components

---

## Success Indicators

✅ All 5 completion documents created
✅ All tests passing (`npm test` shows 0 failures)
✅ No TypeScript errors (`npm run typecheck` clean)
✅ Can send email via SendGrid
✅ Can post to Buffer
✅ Can create HubSpot contact
✅ Can trigger n8n workflow
✅ Can create approval request
✅ All components properly integrated

---

## Next: Wave 3 Agents

After Wave 2 completes, you'll build:
1. Decision Engine (Prompt 12) - 6 hours
2. Marketing Agent (Prompt 13) - 5 hours
3. Sales & Support Agents (Prompt 14) - 6 hours
4. Operations & Orchestrator (Prompt 15) - 8 hours

**With parallel execution:** 10-12 hours
**Sequential:** 25-30 hours

---

## Ready to Launch?

1. Open 4-5 terminal windows
2. Copy-paste the commands above
3. Watch the magic happen! ✨

Each instance will:
- Read its specific prompt file
- Build its component
- Write comprehensive tests
- Create documentation
- Verify acceptance criteria
- Create a completion document

**Estimated completion:** 4-5 hours (parallel) or 15-20 hours (sequential)

---

**LET'S BUILD!** 🚀
