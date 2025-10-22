# Jarvis Agent Quick Reference Guide

## Agent Overview Table

| Agent | Domain | File | Status | Clearance | Key Capabilities |
|-------|--------|------|--------|-----------|------------------|
| Marketing Strategist | Marketing | `marketing-strategist-domain.ts` | Production | MODIFY_SAFE | Campaign planning, content creation, analytics, SEO |
| Data Scientist | Sales/Ops | `data-scientist-domain.ts` | Production | READ_ONLY/MODIFY_SAFE | Data loading, processing, analysis |
| System Health | Support/Ops | `system-health-domain.ts` | Production | READ_ONLY/MODIFY_PRODUCTION | Service monitoring, degradation detection, restart, reporting |
| Cost Optimizer | Operations | `cost-optimization-domain.ts` | Production | READ_ONLY/MODIFY_SAFE | Spending monitoring, anomaly detection, routing optimization |
| Code Optimizer | QA/DevOps | `code-optimization-domain.ts` | Production | MODIFY_SAFE | TS error fixing, dead code removal, dependency mgmt, style |
| Chat Conversation | Support | `chat-conversation-domain.ts` | Planned | SUGGEST | User support, FAQ, context preservation |

## Capability Matrix

### Marketing Agent
```
campaign_planning (MODIFY_SAFE)
  ├─ Multi-channel orchestration
  ├─ Target audience definition
  └─ KPI tracking
  
content_creation (MODIFY_SAFE)
  ├─ Blog generation
  ├─ Social media content
  └─ Copy writing
  
marketing_analytics (READ_ONLY)
  ├─ Performance tracking
  ├─ ROI calculation
  └─ Engagement metrics
  
seo_optimization (MODIFY_SAFE)
  ├─ On-page optimization
  ├─ Keyword management
  └─ Meta tags
```

### Data Scientist Agent
```
data_loading (READ_ONLY)
  ├─ CSV imports
  ├─ JSON loading
  └─ DB queries
  
data_processing (MODIFY_SAFE)
  ├─ Missing value handling
  ├─ Type transformation
  └─ Normalization
  
data_analysis (READ_ONLY)
  ├─ Correlation analysis
  ├─ Statistics generation
  └─ Visualization
```

### System Health Agent
```
monitor-services (READ_ONLY)
  ├─ Health polling (30s)
  ├─ Latency measurement
  └─ Uptime tracking
  
detect-degradation (READ_ONLY)
  ├─ Threshold monitoring (>2000ms)
  ├─ Failure tracking
  └─ Reports
  
restart-services (MODIFY_PRODUCTION)
  ├─ Auto-restart
  ├─ Limit enforcement (3/5min)
  └─ Recovery verification
  
generate-health-report (READ_ONLY)
  ├─ Markdown reports
  ├─ Status tables
  └─ Recommendations
```

### Cost Optimizer Agent
```
monitor-spending (READ_ONLY)
  ├─ Daily/monthly tracking
  ├─ Budget comparison
  └─ Trend analysis
  
detect-anomalies (READ_ONLY)
  ├─ 2x threshold alerts
  ├─ Runaway detection
  └─ Overrun warnings
  
optimize-routing (MODIFY_SAFE)
  ├─ 90% threshold: aggressive (85% Gemini)
  ├─ 80% threshold: gradual (75% Gemini)
  └─ 40-60% savings potential
  
recommend-savings (SUGGEST)
  ├─ Caching opportunities
  ├─ Batch suggestions
  └─ Model switching
```

### Code Optimizer Agent
```
fix-typescript-errors (MODIFY_SAFE)
  ├─ Error detection
  ├─ Auto-dependency install
  └─ Type fixes

remove-dead-code (MODIFY_SAFE)
  ├─ Unused function detection
  ├─ Import cleanup
  └─ Code removal

optimize-dependencies (MODIFY_SAFE)
  ├─ Missing @types/* packages
  ├─ Unused removal
  └─ Version updates

standardize-code-style (MODIFY_SAFE)
  ├─ Prettier formatting
  ├─ ESLint fixes
  └─ Import standardization
```

## Resource Costs

### By Agent (Average per Task)

| Agent | Duration | API Calls | Tokens | Cost |
|-------|----------|-----------|--------|------|
| Marketing | 5000ms | 5.25 | 1275 | $0.013 |
| Data Science | 3000ms | 2.67 | 567 | $0.011 |
| System Health | 2000ms | 2 | 0 | $0 |
| Cost Optimizer | 1500ms | 1 | 0 | $0 |
| Code Quality | 2500ms | 1-2 | 0 | ~$0.10 |

### Daily Budget
- API calls: ~150-200
- Tokens: ~50,000-60,000
- Cost: ~$1.50-2.00
- CPU: 500ms-2s aggregate
- Memory: <100MB peak

## Clearance Levels

```
Level 0: READ_ONLY
  - Analysis/monitoring only
  - No system changes
  - No external modifications

Level 1: SUGGEST
  - Recommendations only
  - No automatic actions
  - User approval required

Level 2: MODIFY_SAFE
  - Non-critical system changes
  - Campaign/content changes
  - Code quality improvements
  - Dependency installations

Level 3: MODIFY_PRODUCTION
  - Service restarts
  - Database modifications
  - Production deployments
  - Configuration changes

Level 4: FULL_ACCESS
  - Unrestricted operations
  - Emergency overrides
  - System-wide changes
```

## Task Priority Mapping

| Priority | Level | Response | Example |
|----------|-------|----------|---------|
| CRITICAL | 9-10 | Immediate | Service down, budget depleted |
| HIGH | 7-8 | Urgent | Degradation, budget 80% |
| MEDIUM | 4-6 | Normal | Content needs, analytics |
| LOW | 1-3 | Background | Routine reports, SEO |

## Task Execution Flowchart

```
Agent.analyze()
    ↓
Generate AutonomousTask[]
    ↓
For each task:
    ├─ Validate metadata
    ├─ Check dependencies
    └─ Determine priority
        ↓
    Agent.execute(task)
        ├─ Validate clearance
        ├─ Check resources available
        ├─ Execute capability handler
        ├─ Track metrics
        └─ Generate artifacts
        ↓
    Return TaskResult
        ├─ success: boolean
        ├─ metrics: {duration, resources, impact}
        ├─ artifacts: [generated items]
        └─ logs: [execution trace]
        ↓
    Post-execution
        ├─ Update orchestrator
        ├─ Emit events
        ├─ Store results
        └─ Update dashboards
```

## Common Workflows

### 1. Marketing Campaign Launch
```
Marketing Agent.analyze()
  ├─ campaign-planning task (MODIFY_SAFE)
  ├─ content-creation task (MODIFY_SAFE)
  └─ seo-optimization task (MODIFY_SAFE)
  
Total: 16 API calls, 4200 tokens, ~$0.05
```

### 2. Budget Alert Response
```
Cost Optimizer detects: 90% of budget used
  ├─ Create optimize-routing task (CRITICAL)
  ├─ Shift routing: 85% Gemini
  ├─ Project savings: 40-60%
  └─ New budget: $15-20/month
```

### 3. Service Recovery
```
System Health detects service down (3 failures)
  ├─ Create restart-services task (CRITICAL)
  ├─ Execute: docker restart
  ├─ Verify: health check
  ├─ Generate health report
  └─ Emit recovery event
```

### 4. Code Quality Pass
```
Code Optimizer scans codebase
  ├─ Fix TS errors (if present)
  ├─ Remove dead code (if present)
  ├─ Optimize dependencies (if needed)
  └─ Standardize style (routine)
```

## Monitoring Points

### Health Checks
- Every 30 seconds (System Health agent)
- Monitors: Jarvis, AI DAWG, Dashboard, Database
- Thresholds: <2000ms healthy, >2000ms degraded

### Cost Tracking
- Daily updates (Cost Optimizer agent)
- Monitors: Total spend, per-provider, free tier usage
- Thresholds: 80% warning, 90% critical

### Task Success
- Logged per execution
- System Health: 98%
- Cost Optimizer: 95%
- Marketing: 92%
- Data Science: 97%
- Code Quality: 94%

## Integration Points

### With Business Operator
```
Business Operator
  ├─ Receives health updates (System Health)
  ├─ Receives cost data (Cost Optimizer)
  ├─ Receives analytics (Data Scientist)
  └─ Receives marketing actions (Marketing Agent)
```

### With Autonomous Orchestrator
```
Orchestrator
  ├─ Schedules agent analysis (periodic)
  ├─ Coordinates task execution
  ├─ Manages dependencies
  ├─ Enforces clearance
  └─ Collects metrics
```

### With AI Models
```
Smart Router
  ├─ Simple → Gemini ($0.00025/1K)
  ├─ Standard → GPT-4o ($0.005/1K)
  └─ Complex → Claude ($0.015/1K)
```

## API Endpoints

### Agent Status
```
GET /api/v1/autonomous/agents
GET /api/v1/autonomous/agents/{domainId}
```

### Task Management
```
POST /api/v1/autonomous/tasks
GET /api/v1/autonomous/tasks
GET /api/v1/autonomous/tasks/{taskId}
```

### Results & History
```
GET /api/v1/autonomous/results
GET /api/v1/autonomous/results/{taskId}
```

## Configuration

### Environment Variables
```bash
# Agent clearance levels (set at startup)
MARKETING_AGENT_CLEARANCE=2
SYSTEM_HEALTH_AGENT_CLEARANCE=3
COST_OPTIMIZER_CLEARANCE=2
CODE_OPTIMIZER_CLEARANCE=2
DATA_SCIENTIST_CLEARANCE=2

# Cost limits
MONTHLY_BUDGET=50
CRITICAL_THRESHOLD=0.9
WARNING_THRESHOLD=0.8

# Monitoring intervals
HEALTH_CHECK_INTERVAL=30000  # 30 seconds
COST_CHECK_INTERVAL=3600000  # 1 hour

# Restart limits
MAX_RESTART_ATTEMPTS=3
RESTART_WINDOW=300000  # 5 minutes
```

## Troubleshooting

### Agent Not Responding
1. Check health status: `GET /api/v1/autonomous/agents/{id}`
2. Review recent logs for errors
3. Verify clearance level is sufficient
4. Check resource availability (CPU, memory)

### High Cost Alerts
1. Check `GET /api/v1/autonomous/results` for recent tasks
2. Review Cost Optimizer recommendations
3. Check AI model usage breakdown
4. Consider implementing caching/batching

### Service Recovery Failing
1. Check service logs directly
2. Verify service is responding to health checks
3. Check restart attempt history
4. May require manual intervention

### Low Task Success Rate
1. Check clearance level enforcement
2. Review error logs for patterns
3. Verify external dependencies available
4. Check resource constraints (CPU, memory, API quotas)

---

**Quick Links:**
- Full Audit: `JARVIS_AGENT_CAPABILITIES_AUDIT.md`
- Architecture: `JARVIS_ARCHITECTURE.md`
- API Docs: `/api/v1/autonomous/` endpoints
- Code: `/src/autonomous/domains/`

