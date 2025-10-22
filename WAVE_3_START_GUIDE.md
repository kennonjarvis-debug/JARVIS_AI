# Wave 3 Start Guide: Agent Development

**Status:** Ready to Begin 🚀
**Prerequisites:** Wave 1 & Wave 2 Complete ✅
**Total Instances:** 5
**Estimated Time:** 10-12 hours (parallel) | 25 hours (sequential)

---

## Executive Summary

Wave 3 is the **final wave** that brings Jarvis to life. This wave builds:
- **Decision Engine** - The brain that decides when to act autonomously
- **Base Agent** - Foundation for all agents
- **4 Specialized Agents** - Marketing, Sales, Support, Operations
- **Orchestrator** - Central coordinator that ties everything together

After Wave 3, you'll have a **fully functional autonomous business AI system**.

---

## Wave 3 Instance Assignments

| Instance | Component | Prompt | Time | Priority | Depends On |
|----------|-----------|--------|------|----------|------------|
| **Instance 1** | Decision Engine | P12 | 6h | CRITICAL | None (start first) |
| **Instance 2** | BaseAgent + Marketing | P13 | 5h | HIGH | Instance 1 (50%) |
| **Instance 3** | Sales Agent | P14a | 3h | HIGH | Instance 2 |
| **Instance 4** | Support Agent | P14b | 3h | HIGH | Instance 2 |
| **Instance 5** | Operations + Orchestrator | P15 | 8h | CRITICAL | Instances 2-4 |

**Critical Path:** Instance 1 → Instance 2 → Instance 5

---

## Execution Strategy

### Option A: Full Parallel (Recommended) - 10-12 hours

```
Hour 0-6:  Instance 1 starts Decision Engine
Hour 3-8:  Instance 2 starts BaseAgent + Marketing (once I1 is 50% done)
Hour 8-11: Instances 3 & 4 start in parallel (Sales & Support)
Hour 8-16: Instance 5 starts Operations + Orchestrator
```

**Result:** All complete in ~10-12 hours with 5 Claude Code instances

### Option B: Sequential - 25 hours

```
Instance 1 (6h) → Instance 2 (5h) → Instances 3&4 parallel (3h) → Instance 5 (8h)
```

**Result:** All complete in ~22 hours with 1-2 instances

### Option C: Hybrid - 14-16 hours

```
Instance 1 (6h)
  └→ Instance 2 (5h)
       ├→ Instance 3 (3h) ┐
       └→ Instance 4 (3h) ┴→ Instance 5 (8h)
```

**Result:** ~14-16 hours with 2-3 instances

---

## Instance Prompt Files

All prompts are ready to use:

```
Wave 3 Instance Prompts:
├── WAVE_3_INSTANCE_1_PROMPT.md  (Decision Engine)
├── WAVE_3_INSTANCE_2_PROMPT.md  (BaseAgent + Marketing)
├── WAVE_3_INSTANCE_3_PROMPT.md  (Sales Agent)
├── WAVE_3_INSTANCE_4_PROMPT.md  (Support Agent)
└── WAVE_3_INSTANCE_5_PROMPT.md  (Operations + Orchestrator)
```

Each prompt includes:
- ✅ Complete context and background
- ✅ API contracts and interfaces
- ✅ Implementation details with code examples
- ✅ Test requirements (>80% coverage)
- ✅ Acceptance criteria
- ✅ Integration points
- ✅ Example usage
- ✅ Documentation requirements

---

## How to Launch Instances

### Step 1: Start Instance 1 (Decision Engine) - CRITICAL PATH

```bash
# Open Claude Code instance 1
claude-code

# Give it this instruction:
"Execute WAVE_3_INSTANCE_1_PROMPT.md - you are Instance 1 building the Decision Engine"
```

**Why start first:** All agents depend on Decision Engine

**When to start Instance 2:** When Instance 1 is ~50% complete (3 hours in)

---

### Step 2: Start Instance 2 (BaseAgent + Marketing)

```bash
# Open Claude Code instance 2
claude-code

# Give it this instruction:
"Execute WAVE_3_INSTANCE_2_PROMPT.md - you are Instance 2 building BaseAgent and Marketing Agent"
```

**Wait for:** Instance 1 to be 50% done (Decision Engine partially complete)

**When to start Instances 3 & 4:** When Instance 2 completes BaseAgent

---

### Step 3: Start Instances 3 & 4 (Sales & Support) - IN PARALLEL

```bash
# Instance 3
"Execute WAVE_3_INSTANCE_3_PROMPT.md - you are Instance 3 building Sales Agent"

# Instance 4
"Execute WAVE_3_INSTANCE_4_PROMPT.md - you are Instance 4 building Support Agent"
```

**Wait for:** Instance 2 to complete BaseAgent

**Run in parallel:** Both can run simultaneously (no dependencies between them)

---

### Step 4: Start Instance 5 (Operations + Orchestrator) - FINAL PIECE

```bash
# Instance 5
"Execute WAVE_3_INSTANCE_5_PROMPT.md - you are Instance 5 building Operations Agent and Orchestrator. This is the final integration."
```

**Wait for:** Instances 2, 3, and 4 to complete

**Note:** This is the final piece that completes Jarvis

---

## Coordination Checklist

### Before Starting

- [ ] Confirm Wave 2 is 100% complete
- [ ] All Wave 2 tests passing
- [ ] `ANTHROPIC_API_KEY` configured in `.env`
- [ ] Database connections working
- [ ] All integration API keys configured

### Instance 1 Checkpoints

- [ ] 0h: Started Decision Engine
- [ ] 3h: 50% complete - START INSTANCE 2
- [ ] 6h: Decision Engine complete
- [ ] Tests passing
- [ ] `config/decision-rules.json` created

### Instance 2 Checkpoints

- [ ] 0h: Started BaseAgent + Marketing
- [ ] 2h: BaseAgent complete - START INSTANCES 3 & 4
- [ ] 5h: Marketing Agent complete
- [ ] Tests passing
- [ ] Both agents ready for integration

### Instances 3 & 4 Checkpoints (Parallel)

- [ ] 0h: Both started
- [ ] 3h: Both complete
- [ ] Tests passing
- [ ] START INSTANCE 5

### Instance 5 Checkpoints

- [ ] 0h: Started Operations + Orchestrator
- [ ] 4h: Operations Agent complete
- [ ] 6h: Orchestrator complete
- [ ] 8h: Full integration and `src/index.ts` complete
- [ ] All tests passing
- [ ] **JARVIS COMPLETE** 🎉

---

## Dependencies Matrix

```
┌─────────────────┐
│ Instance 1      │
│ Decision Engine │
└────────┬────────┘
         │
         ├─ 50% ─────────┐
         │               │
         v               v
┌─────────────────┐     (continues)
│ Instance 2      │
│ BaseAgent +     │
│ Marketing       │
└────────┬────────┘
         │
         ├─ BaseAgent done ───┬───────────────────┐
         │                    │                   │
         v                    v                   v
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Instance 3      │  │ Instance 4      │  │ (continue I2)   │
│ Sales Agent     │  │ Support Agent   │  │                 │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                     │
         └──────────┬─────────┴─────────────────────┘
                    │
                    v
           ┌─────────────────┐
           │ Instance 5      │
           │ Operations +    │
           │ Orchestrator    │
           └─────────────────┘
                    │
                    v
              ✨ COMPLETE ✨
```

---

## What Gets Built (Wave 3)

### Decision Engine (Instance 1)
- **File:** `src/core/decision-engine.ts` (~600 lines)
- **Features:**
  - Rule-based evaluation
  - Claude-powered decision making
  - Confidence scoring
  - Risk assessment
  - Learning from feedback
  - Integration with Approval Queue

### BaseAgent (Instance 2)
- **File:** `src/agents/base-agent.ts` (~400 lines)
- **Features:**
  - Abstract agent class
  - Common execute() workflow
  - Decision Engine integration
  - Memory integration
  - Approval request handling
  - Claude content generation

### Marketing Agent (Instance 2)
- **File:** `src/agents/marketing-agent.ts` (~500 lines)
- **Features:**
  - Social post creation (Twitter, LinkedIn, Facebook)
  - Long-form content generation
  - Email campaign management
  - Performance analytics
  - Buffer integration
  - Email integration

### Sales Agent (Instance 3)
- **File:** `src/agents/sales-agent.ts` (~600 lines)
- **Features:**
  - Lead qualification with scoring
  - Personalized outreach generation
  - Follow-up sequencing
  - Deal management (CRM)
  - Pipeline analysis
  - HubSpot integration

### Support Agent (Instance 4)
- **File:** `src/agents/support-agent.ts` (~650 lines)
- **Features:**
  - Ticket routing and categorization
  - Knowledge Base search
  - Automated response generation
  - KB article creation
  - Support metrics
  - Ticket escalation

### Operations Agent (Instance 5)
- **File:** `src/agents/operations-agent.ts` (~500 lines)
- **Features:**
  - Data synchronization (Supabase ↔ HubSpot)
  - System health monitoring
  - Analytics aggregation
  - Backup automation
  - Alert handling

### Orchestrator (Instance 5)
- **File:** `src/core/orchestrator.ts` (~600 lines)
- **Features:**
  - Central task routing
  - Agent coordination
  - Event-driven architecture
  - Task status tracking
  - Lifecycle management
  - Graceful shutdown

### Main Entry Point (Instance 5)
- **File:** `src/index.ts` (~200 lines)
- **Features:**
  - Initialize all components
  - Wire up dependencies
  - Start orchestrator
  - Graceful shutdown handling
  - **Complete Jarvis system** ✨

---

## Expected Output (Wave 3)

### Code Files
- 7 new implementation files (~3,850 lines)
- 6 test files (~2,250 lines)
- 1 main entry point (~200 lines)
- **Total:** ~6,300 lines of production code

### Configuration
- `config/decision-rules.json` - Decision rules
- `config/lead-scoring-rules.json` - Lead scoring config
- `config/ticket-routing-rules.json` - Support routing rules

### Documentation
- `docs/decision-framework.md`
- `docs/agents-overview.md`
- `docs/sales-automation.md`
- `docs/support-automation.md`
- `docs/orchestration.md`
- **Total:** ~1,600 lines of documentation

### Tests
- 200+ new test cases
- >80% code coverage
- Full integration tests

---

## Testing Strategy

### Unit Tests (Each Instance)
Each instance should run tests as they complete:
```bash
npm test src/core/decision-engine.test.ts
npm test src/agents/base-agent.test.ts
npm test src/agents/marketing-agent.test.ts
npm test src/agents/sales-agent.test.ts
npm test src/agents/support-agent.test.ts
npm test src/agents/operations-agent.test.ts
npm test src/core/orchestrator.test.ts
```

### Integration Tests (Instance 5)
After all components complete:
```bash
npm test
npm run test:coverage
npm run typecheck
npm run build
```

### System Demo (Instance 5)
Final verification:
```typescript
import { initializeJarvis } from './src';

const { orchestrator } = await initializeJarvis();

// Submit test task
const taskId = await orchestrator.submitTask({
  id: crypto.randomUUID(),
  type: TaskType.MARKETING_SOCIAL_POST,
  priority: Priority.MEDIUM,
  data: {
    platform: 'twitter',
    topic: 'New feature release',
  },
  requestedBy: 'demo',
  timestamp: new Date(),
});

// Verify it works end-to-end
```

---

## Communication Between Instances

### Instance 1 → Instance 2
**When:** Decision Engine 50% complete

**Message:** "Decision Engine is 50% complete. You can start BaseAgent implementation. The evaluate() method and core interfaces are ready."

### Instance 2 → Instances 3 & 4
**When:** BaseAgent complete

**Message:** "BaseAgent is complete and tested. You can start Sales/Support agents. Extend BaseAgent and implement the abstract methods."

### Instances 3 & 4 → Instance 5
**When:** Both complete

**Message:** "All agents complete. Starting final integration with Operations Agent and Orchestrator."

### Instance 5 → Coordinator
**When:** Complete

**Message:** "🎉 JARVIS COMPLETE! All systems operational. Running final integration tests..."

---

## Troubleshooting

### Issue: Instance 2 blocked on Decision Engine
**Solution:** Instance 1 must reach 50% before Instance 2 can start integration work

### Issue: Instances 3 & 4 blocked on BaseAgent
**Solution:** Instance 2 must complete BaseAgent before Instances 3 & 4 can begin

### Issue: Instance 5 blocked on agents
**Solution:** Instances 2, 3, and 4 must all complete before Instance 5 starts

### Issue: Type errors between components
**Solution:** All types should already be defined in Wave 1 (Prompt 5). Check `src/types/`

### Issue: Integration failures
**Solution:** Verify all Wave 2 integrations are working. Run Wave 2 tests.

---

## Success Criteria (Wave 3 Complete)

- [ ] All 7 implementation files created
- [ ] All 6 test files created with >80% coverage
- [ ] All tests passing (400+ tests total)
- [ ] Decision Engine making decisions
- [ ] All 4 agents operational
- [ ] Orchestrator routing tasks correctly
- [ ] `src/index.ts` starts full system
- [ ] Documentation complete
- [ ] Integration demo working
- [ ] No TypeScript errors
- [ ] No runtime errors

---

## After Wave 3 Completion

### What You'll Have

✅ **Complete autonomous business AI system**
- Decision-making with human oversight
- 4 specialized agents (Marketing, Sales, Support, Operations)
- Multi-integration support (Buffer, HubSpot, Email, n8n)
- Memory and context management
- Approval workflow for high-risk actions
- Central orchestration
- Event-driven architecture
- Comprehensive logging and monitoring

### Next Steps

1. **Configuration:** Set up all API keys in `.env`
2. **Database:** Initialize Supabase schema
3. **Testing:** Run full test suite
4. **Deployment:** Deploy to production environment
5. **Monitoring:** Set up alerts and dashboards
6. **Documentation:** Write user guide and API docs
7. **Training:** Train team on Jarvis usage

### Potential Enhancements

- Web UI for monitoring and approval
- Mobile app for approvals
- Slack integration
- Custom agents for specific workflows
- Advanced analytics dashboard
- Multi-tenant support
- Enhanced learning algorithms

---

## Timeline Visualization

```
Parallel Execution (Recommended):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instance 1: ████████████████████                     (6h - Decision Engine)
Instance 2:          ██████████████                   (5h - BaseAgent + Marketing)
Instance 3:                    ██████                 (3h - Sales Agent)
Instance 4:                    ██████                 (3h - Support Agent)
Instance 5:                    ████████████████████   (8h - Ops + Orchestrator)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timeline:   0h    3h    6h    9h   12h   15h   18h
Total Time: ~10-12 hours with 5 instances
```

---

## Quick Start Commands

### Launch All Instances (Copy-Paste Ready)

```bash
# Terminal 1 - Instance 1 (Start immediately)
echo "Instance 1: Execute WAVE_3_INSTANCE_1_PROMPT.md"

# Terminal 2 - Instance 2 (Start after 3 hours)
echo "Instance 2: Execute WAVE_3_INSTANCE_2_PROMPT.md"

# Terminal 3 - Instance 3 (Start after Instance 2 completes BaseAgent)
echo "Instance 3: Execute WAVE_3_INSTANCE_3_PROMPT.md"

# Terminal 4 - Instance 4 (Start with Instance 3)
echo "Instance 4: Execute WAVE_3_INSTANCE_4_PROMPT.md"

# Terminal 5 - Instance 5 (Start after Instances 2, 3, 4 complete)
echo "Instance 5: Execute WAVE_3_INSTANCE_5_PROMPT.md"
```

---

## Final Note

Wave 3 is the **most complex and critical wave**. Take time to:
- Review each prompt before starting
- Verify dependencies are complete
- Monitor progress and coordinate between instances
- Run tests frequently
- Celebrate milestones! 🎉

**Once Wave 3 is complete, you'll have a fully operational autonomous business AI system!**

---

**Ready to begin?** Start with Instance 1 (Decision Engine) now! 🚀

---

**Questions?**
- Review individual prompt files for detailed instructions
- Check WAVE_2_COMPLETE_STATUS.md for current system state
- Refer to JARVIS_DESIGN_AND_PROMPTS.md for API contracts
