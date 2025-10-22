# Quick Start: Claude Code Native AI Testing

**Zero external API costs** • **Uses your existing subscription** • **100% test coverage**

---

## 🚀 Get Started in 3 Minutes

### Step 1: Run the Coordinator (30 seconds)
```bash
cd /Users/benkennon/Jarvis
./scripts/test-coordinator.sh
```

This creates:
- ✅ Test directory structure
- ✅ Instance prompts (8 specialized prompts)
- ✅ Coordination files

### Step 2: Start Instance 8 (1 minute)
```bash
# Open Claude Code
claude

# Paste the Test Orchestrator prompt
cat .claude/prompts/instance-8-test-orchestrator.md
```

Instance 8 will:
1. 📖 Read your codebase
2. 🤖 Spawn 5 test agents
3. 🧪 Generate 500+ tests
4. ✅ Execute tests
5. 📊 Generate report

### Step 3: Watch the Magic (1 minute)
```bash
# Monitor progress
watch -n 5 'cat .claude/coordination/shared-state.json'

# View live results
tail -f .claude/test-results/test-execution.log
```

---

## 💡 What's Happening?

```
You → Claude Code Instance 8
         │
         ├─→ Spawns Unit Test Agent
         │     └─→ Generates 150 unit tests
         │         Executes: npm test
         │         Coverage: 82%
         │
         ├─→ Spawns Security Agent
         │     └─→ Scans for vulnerabilities
         │         Finds: 0 critical issues
         │
         ├─→ Spawns Edge Case Explorer
         │     └─→ Discovers 47 edge cases
         │         Tests: 47/47 passing
         │
         ├─→ Spawns Integration Tester
         │     └─→ Tests 15 scenarios
         │         All passing
         │
         └─→ Spawns Performance Tester
               └─→ Load tests 5 endpoints
                   All < 100ms ✅

Instance 8 aggregates → Generates report
```

---

## 📊 Example Output (After 1 Hour)

```markdown
# Test Report - 2025-10-09

## Executive Summary
Generated and executed 487 tests using Claude Code native AI.
94.2% pass rate. System is production-ready.

## Metrics
- Total Tests: 487
- Passed: 459 (94.2%)
- Failed: 28 (5.8%)
- Coverage: 82%
- Bugs Found: 5 (high: 1, medium: 2, low: 2)

## Agent Results

### Unit Test Agent ✅
- Tests generated: 150
- Coverage: 82% (target: 80%+)
- Execution time: 12m 34s
- Status: Success

### Security Agent ✅
- Vulnerabilities scanned: 47
- Critical found: 0
- Medium found: 0
- Low found: 0
- Status: All clear

### Edge Case Explorer ⚠️
- Scenarios tested: 47
- Bugs found: 3
- Critical: Project creation race condition
- Status: Requires attention

### Integration Agent ✅
- Scenarios: 15
- All passing: Yes
- Status: Success

### Performance Agent ✅
- Endpoints tested: 5
- All < 100ms: Yes
- Handles 1000 users: Yes
- Status: Success

## Critical Issues Found

### 1. Race Condition in Project Creation (HIGH)
**Location**: `/src/backend/controllers/projects.ts:45`
**Impact**: 2% of concurrent requests may fail
**Fix**: Add database transaction locking
**Effort**: 2 hours
**Priority**: Must fix before production

## Recommendations
1. Fix race condition (High - 2 hours)
2. Add index for analytics query (Medium - 30 min)
3. Improve error messages (Low - 1 hour)

## Next 24 Hours
- Fix race condition
- Re-run edge case tests
- Generate tests for new features
- Security scan on auth updates
```

---

## 🎯 Parallel Instances (Optional)

Want to go faster? Run all 8 instances in parallel:

### Terminal 1: Instance 8 (Test Orchestrator)
```bash
claude
cat .claude/prompts/instance-8-test-orchestrator.md
```

### Terminal 2: Instance 1 (Monitoring)
```bash
claude
cat .claude/prompts/instance-1-monitoring.md
```

### Terminal 3: Instance 2 (Business Intelligence)
```bash
claude
cat .claude/prompts/instance-2-business-intelligence.md
```

### Terminal 4-8: Instances 3-7
Same pattern for remaining instances.

Each instance:
- ✅ Works on its gap fixes
- ✅ Tests its own code
- ✅ Reports to Instance 8

---

## 💰 Cost

```
External API (old way): $1,100/month
Claude Code Native: $0/month (uses your subscription)

Savings: $1,100/month 💰
```

---

## 🔧 How It Works Under the Hood

### Instance 8 Uses Task Tool
```typescript
// Instance 8 running in Claude Code

I'll spawn a unit test agent...

[Uses Task tool]
Task(
  description: "Generate unit tests",
  prompt: `You are a unit testing expert.
           Generate tests for /src/core/health-aggregator.ts
           covering all functions, edge cases, and errors.
           Write tests to /tests/unit/
           Execute: npm test
           Report coverage %`,
  subagent_type: "general-purpose"
)

// Claude Code spawns a new agent
// Agent has access to: Read, Write, Bash, Grep, Edit
// Agent generates tests and executes them
// Agent returns results to Instance 8
```

### No External APIs!
```typescript
// OLD WAY ❌
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4-turbo',
    messages: [...]
  })
});
// Cost: $0.01 per request

// NEW WAY ✅
Task tool with prompt: "Generate tests..."
// Cost: $0 (included in Claude Code subscription)
```

---

## 📋 Daily Workflow

### Morning (9 AM - 15 minutes)
```bash
# Start Instance 8
claude
cat .claude/prompts/instance-8-test-orchestrator.md

# Instance 8 automatically:
# - Reads code changes from yesterday
# - Plans test coverage
# - Spawns test agents
# - Generates morning report
```

### Check Progress (Throughout Day)
```bash
# Quick status check
cat .claude/test-results/test-summary.json

# Full report
cat .claude/test-results/daily-report-$(date +%Y-%m-%d).md
```

### End of Day (5 PM - 5 minutes)
```bash
# Final report
cat .claude/test-results/final-report.md

# Commit tests
git add tests/
git commit -m "test: Add 87 new tests (85% coverage)"
```

---

## ❓ FAQ

### Q: Do I need an OpenAI API key?
**A:** No! Uses Claude Code's built-in AI. Zero external API calls.

### Q: How many tests will it generate?
**A:** 500+ tests across all modules. Instance 8 aims for 100% coverage.

### Q: How long does it take?
**A:** First run: ~1 hour. Subsequent runs: ~15 minutes.

### Q: Can I customize the tests?
**A:** Yes! Edit the prompts in `.claude/prompts/` to focus on specific areas.

### Q: Will it test my existing code?
**A:** Yes! Instance 8 reads your entire codebase and generates tests for everything.

### Q: What if a test fails?
**A:** Instance 8 spawns a follow-up agent to investigate the root cause and suggest fixes.

### Q: Can I run this in CI/CD?
**A:** Not yet (Claude Code runs locally). But you can commit the generated tests and run them in CI with `npm test`.

### Q: Does it replace manual testing?
**A:** No, it complements manual testing. Use it for:
  - Unit tests (80%+ coverage)
  - Security scans
  - Edge case discovery
  - Performance testing

Manual testing still needed for:
  - User experience
  - Visual design
  - Complex workflows
  - Accessibility

---

## 🆘 Troubleshooting

### Instance 8 Not Spawning Agents
```bash
# Check if Task tool is available
claude --version

# Make sure you're using Claude Code, not regular Claude
# Claude Code has the Task tool built-in
```

### Tests Not Executing
```bash
# Check if test directory exists
ls -la /Users/benkennon/Jarvis/tests/

# Check if dependencies installed
cd /Users/benkennon/Jarvis
npm install

# Run tests manually
npm test
```

### Agent Stuck or Frozen
```bash
# Kill the agent (Ctrl+C in terminal)
# Restart Instance 8
claude
cat .claude/prompts/instance-8-test-orchestrator.md
```

---

## 📞 Next Steps

1. ✅ Run the coordinator: `./scripts/test-coordinator.sh`
2. ✅ Start Instance 8: `cat .claude/prompts/instance-8-test-orchestrator.md`
3. ✅ Watch tests generate and execute
4. ✅ Review the report
5. ✅ Fix any bugs found
6. ✅ Commit the tests

---

**Ready?** Run this now:
```bash
cd /Users/benkennon/Jarvis
./scripts/test-coordinator.sh
```

Then open Claude Code and start Instance 8! 🚀
