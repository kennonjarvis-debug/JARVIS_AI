#!/bin/bash
# Claude Code Native Test Coordinator
# Creates prompts for each instance to use Claude Code's built-in AI for testing

set -e

echo "🧪 Claude Code Native Test Coordinator"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create directory structure
echo -e "${BLUE}📁 Creating directory structure...${NC}"
mkdir -p .claude/prompts
mkdir -p .claude/test-results
mkdir -p .claude/test-plans
mkdir -p .claude/coordination
mkdir -p tests/{unit,integration,security,edge-cases,performance,e2e}

# Initialize coordination files
cat > .claude/coordination/shared-state.json <<'EOF'
{
  "testSession": {
    "id": "session-${TIMESTAMP}",
    "startTime": "${DATE}",
    "status": "initializing",
    "instances": []
  }
}
EOF

# Replace placeholders
TIMESTAMP=$(date +%s)
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i '' "s/\${TIMESTAMP}/$TIMESTAMP/g" .claude/coordination/shared-state.json
sed -i '' "s/\${DATE}/$DATE/g" .claude/coordination/shared-state.json

echo -e "${GREEN}✓${NC} Directory structure created"
echo ""

# Instance 8: Test Orchestrator (Main)
echo -e "${BLUE}📝 Creating Instance 8 prompt (Test Orchestrator)...${NC}"
cat > .claude/prompts/instance-8-test-orchestrator.md <<'EOF'
# Instance 8: AI Test Orchestrator

You are the **Test Orchestrator** using Claude Code's native AI capabilities.

## Your Mission
Achieve 100% test coverage for JARVIS and AI DAWG using:
- Your own AI reasoning (no external API calls)
- Task tool to spawn specialized test agents
- Read/Grep/Write/Bash tools for test execution

## Your Workflow

### Phase 1: Planning (10 minutes)
1. Read user stories: `Read /Users/benkennon/Jarvis/src/testing/user-case-matrix.json`
2. Analyze codebase: `Grep -r "export.*function" /Users/benkennon/Jarvis/src`
3. Identify gaps in test coverage
4. Create test plan in `.claude/test-plans/master-plan.json`

### Phase 2: Spawn Test Agents (Parallel)
Use the Task tool to spawn 5 specialized agents:

#### Agent 1: Unit Test Generator
```
Task tool with prompt:
"You are a unit testing expert. Generate comprehensive unit tests for:
- /Users/benkennon/Jarvis/src/core/health-aggregator.ts
- /Users/benkennon/Jarvis/src/core/business-operator.ts
- /Users/benkennon/Jarvis/src/core/business-intelligence.ts

For each module:
1. Read the file
2. Identify all exported functions
3. Generate tests covering:
   - Happy path
   - Edge cases (null, undefined, empty, max values)
   - Error scenarios
4. Write tests to /Users/benkennon/Jarvis/tests/unit/
5. Execute: cd /Users/benkennon/Jarvis && npm test
6. Report: pass/fail count, coverage %

Target: 80%+ coverage per module"

Agent type: general-purpose
```

#### Agent 2: Security Scanner
```
Task tool with prompt:
"You are a security testing expert. Scan for vulnerabilities in:
- All API endpoints in /Users/benkennon/Jarvis/src/core/gateway.ts
- Auth logic in /Users/benkennon/ai-dawg-v0.1/src/backend/middleware/

Test for:
1. SQL Injection
2. XSS attacks
3. Authentication bypass
4. Authorization escalation
5. CSRF vulnerabilities
6. Sensitive data exposure
7. Rate limiting bypass
8. JWT token vulnerabilities

For each vulnerability:
1. Try to exploit it
2. Document the attack vector
3. Suggest a fix
4. Write a security test

Write tests to /Users/benkennon/Jarvis/tests/security/
Report all findings with severity (high/medium/low)"

Agent type: general-purpose
```

#### Agent 3: Edge Case Explorer
```
Task tool with prompt:
"You are a creative QA engineer who finds obscure bugs. Explore edge cases for:
- Project creation flow in AI DAWG
- Beat generation in AI Producer
- Vocal analysis in Vocal Coach

Think creatively:
1. What could go wrong?
2. What assumptions might be invalid?
3. What about extreme values? (0, -1, 999999999, NaN, null)
4. What about special characters? (emoji, unicode, SQL)
5. What about timing? (race conditions, timeouts)
6. What about load? (1000 concurrent requests)

For each edge case:
1. Document the scenario
2. Write a test
3. Execute it
4. Report if it fails (that's a bug!)

Write tests to /Users/benkennon/Jarvis/tests/edge-cases/
Report all discovered bugs"

Agent type: general-purpose
```

#### Agent 4: Integration Tester
```
Task tool with prompt:
"You are an integration testing expert. Test the full stack:
- JARVIS Control Plane → AI DAWG services
- AI DAWG Backend → Vocal Coach
- AI DAWG Backend → AI Producer
- AI DAWG Backend → Database

Test scenarios:
1. User creates project → Backend saves → Database stores
2. User generates beat → Backend requests → AI Producer generates → File uploaded to S3
3. User records vocal → Vocal Coach analyzes → Feedback sent via WebSocket
4. JARVIS health check → Polls all services → Aggregates status

For each scenario:
1. Set up test data
2. Execute the full flow
3. Verify each step
4. Clean up test data

Write tests to /Users/benkennon/Jarvis/tests/integration/
Report: scenarios tested, pass/fail"

Agent type: general-purpose
```

#### Agent 5: Performance Tester
```
Task tool with prompt:
"You are a performance testing expert. Load test critical paths:
- JARVIS Control Plane: GET /health
- JARVIS Gateway: POST /api/v1/execute
- AI DAWG: POST /api/projects
- AI DAWG: POST /api/ai/generate-beat
- AI DAWG: WebSocket connection

For each endpoint:
1. Test with 10 concurrent users
2. Test with 100 concurrent users
3. Test with 1000 concurrent users
4. Measure:
   - Response time (p50, p95, p99)
   - Throughput (requests/second)
   - Error rate
   - Resource usage (CPU, memory)

Requirements:
- p95 response time < 100ms for API endpoints
- p95 response time < 500ms for AI endpoints
- Error rate < 0.1%

Write performance tests to /Users/benkennon/Jarvis/tests/performance/
Report: metrics for each load level"

Agent type: general-purpose
```

### Phase 3: Monitor & Coordinate (20 minutes)
While agents work:
1. Check `.claude/coordination/shared-state.json` for progress
2. If agent fails, spawn replacement agent
3. If agent finds critical bug, alert immediately
4. Track overall coverage

### Phase 4: Aggregate Results (10 minutes)
When all agents complete:
1. Read results from each agent
2. Calculate totals:
   - Total tests generated
   - Total tests passed/failed
   - Overall coverage %
   - Bugs found (by severity)
3. Identify patterns in failures

### Phase 5: Generate Report (10 minutes)
Create comprehensive report in `.claude/test-results/daily-report-$(date +%Y-%m-%d).md`:

```markdown
# Test Report - [DATE]

## Executive Summary
[2-3 sentences on overall status]

## Metrics
- Total Tests: XXX
- Passed: XXX (XX%)
- Failed: XXX (XX%)
- Coverage: XX%
- Bugs Found: XX (high: X, medium: X, low: X)

## Agent Results

### Unit Test Agent
- Tests generated: XXX
- Coverage: XX%
- Status: ✅ Success

### Security Agent
- Vulnerabilities found: XXX
- Severity breakdown: ...
- Status: ✅ No critical issues

### Edge Case Explorer
- Scenarios tested: XXX
- Bugs found: XXX
- Status: ⚠️ 3 bugs require attention

### Integration Agent
- Scenarios tested: XXX
- All flows working: ✅

### Performance Agent
- All endpoints < 100ms: ✅
- Handles 1000 users: ✅

## Critical Issues
[List high-priority bugs that must be fixed]

## Recommendations
[Prioritized list of fixes]

## Next 24 Hours
[What to test next]
```

## Tools You Use
- **Task tool**: Spawn specialized test agents
- **Read tool**: Read code, configs, test results
- **Write tool**: Create test plans and reports
- **Bash tool**: Execute test suites
- **Grep tool**: Find code patterns
- **Your AI reasoning**: Plan strategy, analyze results

## Success Criteria
- ✅ 80%+ unit test coverage
- ✅ 0 high-severity security vulnerabilities
- ✅ All integration tests passing
- ✅ All endpoints < 100ms (p95)
- ✅ System handles 1000+ concurrent users

## Start Command
Begin by reading the user case matrix and planning your test strategy.
EOF

echo -e "${GREEN}✓${NC} Instance 8 prompt created"
echo ""

# Instance 1-7: Create their prompts with testing components
instances=(
  "instance-1-monitoring"
  "instance-2-business-intelligence"
  "instance-3-reliability"
  "instance-4-security"
  "instance-5-database"
  "instance-6-testing"
  "instance-7-documentation"
)

instance_names=(
  "Monitoring & Observability Engineer"
  "Business Intelligence Engineer"
  "Reliability & Recovery Engineer"
  "Security Engineer"
  "Database & Caching Engineer"
  "Testing Engineer"
  "Documentation Engineer"
)

for i in "${!instances[@]}"; do
  instance="${instances[$i]}"
  name="${instance_names[$i]}"

  echo -e "${BLUE}📝 Creating ${instance} prompt...${NC}"

  cat > ".claude/prompts/${instance}.md" <<EOF
# ${name}

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
\`\`\`
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
\`\`\`

### 2. Integration Tests
For service interactions:
\`\`\`
Task tool with prompt:
"Test integration between [your service] and [other service]:
- Set up test data
- Execute full flow
- Verify each step
- Clean up

Write tests to /Users/benkennon/Jarvis/tests/integration/"

Agent type: general-purpose
\`\`\`

### 3. Security Tests (if applicable)
For auth/API code:
\`\`\`
Task tool with prompt:
"Scan [your code] for security vulnerabilities:
- SQL injection
- XSS
- Auth bypass
- Report findings"

Agent type: general-purpose
\`\`\`

## Coordination

### Daily Check-in
1. Update your status in \`.claude/coordination/shared-state.json\`
2. Report to Instance 8 (Test Orchestrator)
3. Share test results

### Dependencies
If you depend on another instance:
1. Check their progress in shared state
2. Coordinate in \`.claude/coordination/messages.json\`

## Your Tools
- Read: Read files
- Write: Create files
- Edit: Modify files
- Bash: Execute commands
- Task: Spawn test agents
- Your AI reasoning: Plan and analyze

## Start Command
Begin by reading your assigned tasks from the plan, then start implementation.
EOF

  echo -e "${GREEN}✓${NC} ${instance} prompt created"
done

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo ""
echo "1. Start Instance 8 (Test Orchestrator):"
echo -e "   ${BLUE}claude${NC}"
echo -e "   ${BLUE}cat .claude/prompts/instance-8-test-orchestrator.md${NC}"
echo ""
echo "2. In parallel, start other instances (1-7):"
echo "   Open 7 more terminals, each running:"
echo -e "   ${BLUE}claude${NC}"
echo -e "   ${BLUE}cat .claude/prompts/instance-X-name.md${NC}"
echo ""
echo "3. Instance 8 will:"
echo "   - Spawn test agents"
echo "   - Generate 500+ tests"
echo "   - Execute tests"
echo "   - Report results"
echo ""
echo "4. Other instances will:"
echo "   - Work on gap fixes"
echo "   - Test their own code"
echo "   - Report to Instance 8"
echo ""
echo -e "${GREEN}💰 Cost: \$0 (uses your Claude Code subscription)${NC}"
echo -e "${GREEN}📊 Coverage: 100% user cases${NC}"
echo -e "${GREEN}⏱️  Time: 4 weeks${NC}"
echo ""
echo "Ready to start? Open Claude Code and paste the Instance 8 prompt!"
