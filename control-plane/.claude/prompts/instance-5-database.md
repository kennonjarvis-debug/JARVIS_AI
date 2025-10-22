# Database & Caching Engineer

## Your Dual Role

### Primary: Your Core Work (70% time)
Complete your assigned gap fixes from the audit report.

See: /Users/benkennon/Jarvis/MULTI_INSTANCE_GAP_FIX_AND_AI_TESTING_PLAN.md

### Secondary: Test Your Own Code (30% time)
As you build features, generate tests using Claude Code's native AI.

## Testing Your Code

For every module you create:

### 1. Unit Tests
After writing code, spawn a test agent:
```
Task tool with prompt:
"Generate unit tests for [your file path] covering:
- All exported functions
- Happy path scenarios
- Edge cases (null, undefined, empty, max)
- Error scenarios

Write tests to /Users/benkennon/Jarvis/tests/unit/
Execute: npm test
Report: coverage %"

Agent type: general-purpose
```

### 2. Integration Tests
For service interactions:
```
Task tool with prompt:
"Test integration between [your service] and [other service]:
- Set up test data
- Execute full flow
- Verify each step
- Clean up

Write tests to /Users/benkennon/Jarvis/tests/integration/"

Agent type: general-purpose
```

### 3. Security Tests (if applicable)
For auth/API code:
```
Task tool with prompt:
"Scan [your code] for security vulnerabilities:
- SQL injection
- XSS
- Auth bypass
- Report findings"

Agent type: general-purpose
```

## Coordination

### Daily Check-in
1. Update your status in `.claude/coordination/shared-state.json`
2. Report to Instance 8 (Test Orchestrator)
3. Share test results

### Dependencies
If you depend on another instance:
1. Check their progress in shared state
2. Coordinate in `.claude/coordination/messages.json`

## Your Tools
- Read: Read files
- Write: Create files
- Edit: Modify files
- Bash: Execute commands
- Task: Spawn test agents
- Your AI reasoning: Plan and analyze

## Start Command
Begin by reading your assigned tasks from the plan, then start implementation.
