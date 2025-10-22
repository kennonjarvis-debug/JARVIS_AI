# Jarvis Automation Module

**Instance**: jarvis-automation (Instance 5)
**Status**: ✅ Complete
**Version**: 1.0.0

## Overview

The Automation Module is the intelligence and orchestration layer of the Jarvis system. It handles business intelligence data aggregation, predictive planning with GPT forecasting, CI/CD workflow automation, and resource scaling for AI workloads.

## Features

### 1. BI Data Aggregation 📊
- **Daily metrics aggregation** from UsageEvent and RevenueMetric tables
- **Weekly/monthly reports** with trend analysis
- **Automated insights generation** based on patterns
- **Error rate tracking** and anomaly detection

### 2. GPT-Powered Forecasting 🔮
- **Revenue forecasting** with 30-day horizon
- **User growth predictions** with confidence intervals
- **Usage trend analysis** and projections
- **Fallback to linear regression** when GPT unavailable
- **Automated forecast updates** (daily at 6am)

### 3. CI/CD Workflow Automation 🚀
- **Pre-configured workflows**:
  - `test-and-build` - Run tests and build application
  - `deploy-production` - Full production deployment pipeline
  - `database-maintenance` - DB backup and optimization
  - `setup-monitoring` - Prometheus/Grafana setup
  - `cleanup-resources` - Clean up logs and temp files
- **Custom workflow registration**
- **Step-by-step execution** with continue-on-error support
- **Workflow history** and status tracking

### 4. Resource Scaling 📈
- **Auto-scaling based on thresholds**:
  - CPU usage > 80% → Scale up
  - CPU usage < 20% → Scale down
  - Memory usage > 85% → Scale up
  - Queue depth > 5 → Scale AI workers
- **Docker container management**
- **Database connection pool scaling**
- **Redis cache scaling**
- **Hourly resource checks**

## Scheduled Jobs

The module registers 4 cron jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| `daily-metrics-aggregation` | `0 0 * * *` (Midnight) | Aggregate daily metrics |
| `weekly-report-generation` | `0 9 * * 1` (Mon 9am) | Generate weekly report |
| `hourly-resource-check` | `0 * * * *` (Every hour) | Check and scale resources |
| `forecast-update` | `0 6 * * *` (6am daily) | Update all forecasts |

## API Endpoints

All endpoints are mounted at `/api/v1/jarvis/automation/`

### GET /stats
Get module statistics and service status

**Response:**
```json
{
  "aggregationsRun": 42,
  "forecastsGenerated": 12,
  "workflowsExecuted": 8,
  "scalingActions": 15,
  "services": {
    "metricsAggregator": { "lastAggregation": "2025-10-07T12:00:00Z", "isRunning": false },
    "forecastingService": { "forecastCount": 3, "availableMetrics": ["revenue", "users", "usage"] },
    "workflowAutomation": { "registeredWorkflows": [...], "runningWorkflows": [], "completedWorkflows": 8 },
    "resourceScaler": { "lastCheck": "2025-10-07T13:00:00Z", "thresholds": {...}, "recentActions": [...] }
  }
}
```

### POST /aggregate
Run metrics aggregation

**Body:**
```json
{
  "type": "daily",  // "daily" | "weekly" | "monthly"
  "force": false    // Force run even if already running
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "daily",
    "period": { "start": "...", "end": "..." },
    "usage": { "totalEvents": 1250, "byFeature": {...}, "errorRate": 0.02 },
    "revenue": { "totalRevenue": 45000, "byPlan": {...}, "activeUsers": 420 },
    "insights": ["Most popular feature: vocal-coach with 450 events", ...]
  }
}
```

### POST /forecast
Generate GPT forecast

**Body:**
```json
{
  "metric": "revenue",  // "revenue" | "users" | "usage"
  "horizon": 30         // Days to forecast
}
```

**Response:**
```json
{
  "success": true,
  "forecast": {
    "metric": "revenue",
    "horizon": 30,
    "generatedAt": "2025-10-07T12:00:00Z",
    "predictions": [
      { "date": "2025-10-08", "predicted": 1500, "confidence": 0.85, "lowerBound": 1200, "upperBound": 1800 }
    ],
    "insights": ["Revenue is trending upward...", ...],
    "methodology": "GPT-4 based time series analysis"
  }
}
```

### POST /workflow
Execute a workflow

**Body:**
```json
{
  "workflow": "test-and-build",  // Workflow name
  "params": {}                   // Optional parameters
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "workflow": "test-and-build",
    "status": "success",
    "startedAt": "...",
    "completedAt": "...",
    "duration": 45000,
    "steps": [
      { "name": "Install dependencies", "status": "success", "duration": 5000 },
      { "name": "Run linter", "status": "success", "duration": 2000 },
      ...
    ]
  }
}
```

### POST /scale
Scale a resource

**Body:**
```json
{
  "resource": "ai-workers",    // "cpu" | "memory" | "ai-workers" | "database" | "cache"
  "action": "scale-up"         // "scale-up" | "scale-down" | "restart" | "status"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "resource": "ai-workers",
    "action": "scale-up",
    "timestamp": "...",
    "status": "success",
    "details": "Scaled AI workers from 2 to 4 instances"
  }
}
```

## Jarvis Commands

The module registers 6 commands accessible via Jarvis command API:

### `aggregate-metrics`
Run metrics aggregation

```json
{
  "module": "automation",
  "action": "aggregate-metrics",
  "params": {
    "type": "daily",
    "force": false
  }
}
```

### `generate-forecast`
Generate GPT forecast

```json
{
  "module": "automation",
  "action": "generate-forecast",
  "params": {
    "metric": "revenue",
    "horizon": 30
  }
}
```

### `execute-workflow`
Execute CI/CD workflow

```json
{
  "module": "automation",
  "action": "execute-workflow",
  "params": {
    "workflow": "test-and-build",
    "params": {}
  }
}
```

### `scale-resources`
Scale system resources

```json
{
  "module": "automation",
  "action": "scale-resources",
  "params": {
    "resource": "ai-workers",
    "action": "scale-up"
  }
}
```

### `generate-report`
Generate BI report

```json
{
  "module": "automation",
  "action": "generate-report",
  "params": {
    "type": "weekly",
    "format": "json"
  }
}
```

### `get-stats`
Get module statistics

```json
{
  "module": "automation",
  "action": "get-stats",
  "params": {}
}
```

## Services

### MetricsAggregator
Aggregates usage events and revenue metrics from Prisma database.

**Key Methods:**
- `runAggregation(type, force)` - Run aggregation
- `getAggregatedMetrics(type)` - Get cached metrics
- `storeAggregation(metrics)` - Store for history

### ForecastingService
Uses GPT-4 for predictive analytics with linear regression fallback.

**Key Methods:**
- `generateForecast(metric, horizon)` - Generate forecast
- `getAllForecasts()` - Get all cached forecasts
- `updateAllForecasts()` - Refresh all forecasts

### WorkflowAutomation
Manages CI/CD pipelines and business workflows.

**Key Methods:**
- `registerWorkflow(definition)` - Register custom workflow
- `executeWorkflow(name, params)` - Execute workflow
- `listWorkflows()` - List available workflows
- `getWorkflowHistory(name)` - Get execution history

### ResourceScaler
Monitors and scales system resources automatically.

**Key Methods:**
- `getMetrics()` - Get current resource metrics
- `checkAndScale()` - Check and auto-scale
- `scaleResource(resource, action)` - Manual scaling
- `updateThresholds(thresholds)` - Update scaling thresholds

## Database Integration

The module uses Prisma to access:

- **UsageEvent** - Feature usage tracking
  - `userId`, `featureKey`, `eventType`, `duration`, `errorCode`
  - Indexed by `userId`, `featureKey`, `createdAt`

- **RevenueMetric** - Time-series revenue data
  - `date`, `plan`, `totalRevenue`, `newSubscribers`, `activeUsers`, `churnCount`
  - Indexed by `date`, `plan`

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...           # For GPT forecasting
DATABASE_URL=postgresql://...   # Prisma database connection

# Optional
AUTOMATION_CPU_HIGH_THRESHOLD=80      # CPU scale-up threshold (%)
AUTOMATION_CPU_LOW_THRESHOLD=20       # CPU scale-down threshold (%)
AUTOMATION_MEMORY_HIGH_THRESHOLD=85   # Memory scale-up threshold (%)
AUTOMATION_QUEUE_THRESHOLD=5          # Queue depth scale-up threshold
```

### Scaling Thresholds

Update thresholds at runtime:

```typescript
resourceScaler.updateThresholds({
  cpuHigh: 75,
  memoryHigh: 90,
  queueThreshold: 10,
});
```

## Health Metrics

The module reports:
- `aggregationsRun` - Total aggregations completed
- `forecastsGenerated` - Total forecasts generated
- `workflowsExecuted` - Total workflows executed
- `scalingActions` - Total scaling actions taken
- `errorRate` - Error rate across all operations
- `cpuUsage` - Current CPU usage
- `memoryUsage` - Current memory usage

## Example Usage

### Via Jarvis Controller

```typescript
import { jarvisController } from '../../core/jarvis.controller';

// Execute command
const result = await jarvisController.executeCommand({
  module: 'automation',
  action: 'aggregate-metrics',
  params: { type: 'daily' },
});

console.log(result.data);
```

### Via HTTP API

```bash
# Get stats
curl http://localhost:3001/api/v1/jarvis/automation/stats

# Run aggregation
curl -X POST http://localhost:3001/api/v1/jarvis/automation/aggregate \
  -H "Content-Type: application/json" \
  -d '{"type": "daily", "force": false}'

# Generate forecast
curl -X POST http://localhost:3001/api/v1/jarvis/automation/forecast \
  -H "Content-Type: application/json" \
  -d '{"metric": "revenue", "horizon": 30}'

# Execute workflow
curl -X POST http://localhost:3001/api/v1/jarvis/automation/workflow \
  -H "Content-Type: application/json" \
  -d '{"workflow": "test-and-build"}'

# Scale resources
curl -X POST http://localhost:3001/api/v1/jarvis/automation/scale \
  -H "Content-Type: application/json" \
  -d '{"resource": "ai-workers", "action": "scale-up"}'
```

## Files

```
src/jarvis/modules/automation/
├── automation.module.ts           # Main module (420 lines)
├── services/
│   ├── metrics-aggregator.ts      # BI data aggregation (230 lines)
│   ├── forecasting.ts             # GPT forecasting (320 lines)
│   ├── workflow-automation.ts     # CI/CD automation (290 lines)
│   └── resource-scaler.ts         # Resource scaling (380 lines)
├── index.ts                       # Module exports (7 lines)
└── README.md                      # This file

Total: ~1,650 lines of code
```

## Dependencies

- `@prisma/client` - Database access
- `openai` - GPT-4 forecasting
- `node:child_process` - Workflow execution
- `node:os` - Resource monitoring

## Testing

```bash
# Test metrics aggregation
npm run test:jarvis:automation:metrics

# Test forecasting
npm run test:jarvis:automation:forecast

# Test workflows
npm run test:jarvis:automation:workflow

# Test resource scaling
npm run test:jarvis:automation:scale
```

## Future Enhancements

- [ ] Slack/email notifications for alerts
- [ ] Grafana dashboard integration
- [ ] Kubernetes auto-scaling integration
- [ ] ML-based anomaly detection
- [ ] Cost optimization recommendations
- [ ] Advanced workflow DAG support
- [ ] Multi-region deployment orchestration

---

**Module Complete**: ✅
**Ready for Integration**: Yes
**Documentation**: Complete
**Tests**: Pending Phase 3
