# Autonomous Operations Tests

Tests to validate Jarvis autonomous system (zero-touch operations for 7+ days).

## Test Files

### `control-loop.test.ts`
Tests the 30-second control loop:
- Executes every 30s (±2s tolerance)
- Completes each iteration in <10s
- Runs continuously for 24+ hours
- No skipped iterations
- System state validation

### `auto-recovery.test.ts`
Tests autonomous service recovery:
- Max 3 retry attempts before escalation
- Retry counter resets after successful recovery
- Human escalation triggered after 3 failures
- Cascading failure handling
- Service state persistence

### `safety-mechanisms.test.ts`
Tests safety controls:
- Emergency kill switch (JARVIS_AUTONOMOUS=false)
- Command whitelist enforcement
- Rollback on deployment failure
- Audit log immutability (append-only)
- Rate limiting on operations

### `learning-system.test.ts`
Tests memory and pattern recognition:
- SQLite event storage (1000+ events)
- Pattern detection (recurring failures)
- Performance optimization learning
- Memory persistence across restarts
- Query performance (<1s for 1M+ events)

### `deployment-automation.test.ts`
Tests autonomous deployment:
- Git update detection (5-min polling)
- Staging deployment → tests → production
- Automatic rollback on failure
- Post-deploy validation (30 min)
- Health checks and smoke tests

### `long-running.test.ts`
Tests 7-day stability:
- Memory usage <2GB over 7 days
- SQLite database <500MB
- No memory leaks detected
- 99.9% uptime
- CPU usage averages <20%

## Real-World Validation

Tests validate workflows from:
- **Part 7 of REAL_WORLD_WORKFLOW_INTEGRATION.md**
- **Jarvis Full Autonomy Plan**

## Running Tests

```bash
# Run all autonomous tests
cd /Users/benkennon/Jarvis
npm test -- tests/autonomous/

# Run specific test
npm test -- tests/autonomous/control-loop.test.ts

# Run with coverage
npm test -- --coverage tests/autonomous/
```

## Success Criteria

- ✅ Control loop runs every 30s for 24+ hours
- ✅ Auto-recovery succeeds >95% of the time
- ✅ All safety mechanisms working
- ✅ Learning system detects patterns
- ✅ Deployment automation with rollback
- ✅ 7-day stability without human intervention
