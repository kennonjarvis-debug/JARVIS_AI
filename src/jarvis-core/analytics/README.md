

# Jarvis Cloud Intelligence Service

Continuous improvement engine that automatically analyzes system performance, detects patterns, and generates actionable insights.

## Overview

The Cloud Intelligence Service is an autonomous analytics engine that:

- 📊 **Collects data** from logs, tests, deployments, and vitality metrics
- 🔍 **Detects patterns** in recurring test failures and system issues
- 📈 **Identifies regressions** in module performance
- 🚀 **Analyzes deployments** for success rates and trends
- 🔗 **Correlates vitality** with testing outcomes
- 📝 **Generates reports** in both JSON and Markdown formats
- 🎯 **Updates strategic goals** automatically based on analytics
- 🚨 **Sends Slack alerts** when modules drop below thresholds

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│          Cloud Intelligence Service                      │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │
│  │  Pattern   │  │Performance │  │ Deployment  │       │
│  │  Detector  │  │ Analyzer   │  │  Analyzer   │       │
│  └────────────┘  └────────────┘  └─────────────┘       │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │
│  │ Vitality   │  │   Report   │  │    Goal     │       │
│  │Correlation │  │ Generator  │  │   Updater   │       │
│  └────────────┘  └────────────┘  └─────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │       Notification Service (Slack)           │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Data Sources          │
              ├────────────────────────┤
              │ • Test Results         │
              │ • Performance Logs     │
              │ • Deployment History   │
              │ • Vitality Metrics     │
              └────────────────────────┘
```

## Components

### 1. Cloud Intelligence Service (`cloud-intelligence.service.ts`)
Main orchestrator that coordinates all analytics components and runs the analysis pipeline.

**Key Features:**
- Continuous monitoring (configurable interval)
- Data collection from multiple sources
- Coordinated analysis pipeline
- Report generation and storage
- Alert triggering

### 2. Pattern Detector (`pattern-detector.ts`)
Identifies recurring patterns in test failures.

**Capabilities:**
- Normalizes error messages to detect patterns
- Tracks frequency and affected modules
- Calculates severity based on impact
- Detects trends (improving/degrading)

### 3. Performance Analyzer (`performance-analyzer.ts`)
Detects performance regressions and module health degradation.

**Metrics:**
- Module health scores
- Success rates
- Response times
- Error rates
- Performance trends

### 4. Deployment Analyzer (`deployment-analyzer.ts`)
Analyzes deployment success rates and patterns.

**Metrics:**
- Deployment success rate
- Average deployment duration
- Trend analysis
- Failure pattern detection

### 5. Vitality Correlation (`vitality-correlation.ts`)
Correlates system vitality with other metrics.

**Correlations:**
- Vitality ↔ Test Pass Rate
- Vitality ↔ Module Performance
- Vitality ↔ Deployment Success

### 6. Report Generator (`report-generator.ts`)
Generates comprehensive Markdown reports.

**Report Sections:**
- Executive Summary
- System Vitality
- Testing Analysis
- Deployment Analysis
- Module Health
- Correlations
- Recommendations
- Alerts

### 7. Goal Updater (`goal-updater.ts`)
Automatically updates `strategic-goals-v2.json` based on analytics.

**Updates:**
- Adjusts targets based on performance
- Sets priority flags for critical modules
- Tracks performance trends
- Maintains goal alignment

### 8. Notification Service (`notification.service.ts`)
Sends alerts via Slack when thresholds are breached.

**Alert Triggers:**
- Module health < 85%
- Test pass rate < 85%
- Deployment success rate < 90%

## Usage

### Installation

```bash
# Install dependencies (if not already installed)
npm install
```

### Basic Usage

```typescript
import { initializeCloudIntelligence } from './src/jarvis/analytics';

// Initialize with defaults
const intelligence = initializeCloudIntelligence();

// Start continuous monitoring
await intelligence.start();

// Or run a one-time analysis
const result = await intelligence.runAnalysis();
console.log('Vitality:', result.vitalityIndex);
console.log('Test Pass Rate:', result.testResults.passRate);
```

### Custom Configuration

```typescript
import { initializeCloudIntelligence } from './src/jarvis/analytics';

const intelligence = initializeCloudIntelligence({
  dataPath: '/path/to/data',
  outputPath: '/path/to/output',
  notificationThreshold: 85,     // Alert if module drops below 85%
  analysisInterval: 86400000,    // Run every 24 hours
  enableAutoGoalUpdate: true,     // Automatically update strategic goals
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
});

await intelligence.start();
```

### Environment Variables

```bash
# Optional: Slack notifications
export SLACK_WEBHOOK_URL='https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
```

### Running Tests

```bash
# Run the test script
npm run test:intelligence

# Or directly with ts-node
ts-node scripts/test-cloud-intelligence.ts
```

## Data Sources

The service automatically collects data from:

1. **Test Results** (`logs/tests/*.json`)
   - Test suite results
   - Assertion pass/fail rates
   - Test coverage data

2. **Performance Logs** (`logs/jarvis/adaptive-history.log`)
   - Module performance metrics
   - Success rates
   - Performance scores

3. **Deployment History** (`outputs/deploy/*.json`)
   - Deployment outcomes
   - Duration metrics
   - Failure patterns

4. **Vitality Metrics** (`logs/jarvis/cloud-integration-verification-*.json`)
   - System vitality index
   - Component health
   - Overall system status

## Output

### Reports

Reports are automatically generated and saved to:

```
logs/jarvis/analytics/
├── analytics-2025-10-07.json    # JSON format
└── analytics-2025-10-07.md      # Markdown format
```

### JSON Report Structure

```json
{
  "timestamp": "2025-10-07T22:00:00.000Z",
  "vitalityIndex": 81,
  "moduleHealth": {
    "music": {
      "score": 100,
      "status": "healthy",
      "issues": [],
      "recommendations": []
    }
  },
  "testResults": {
    "totalTests": 50,
    "passed": 50,
    "failed": 0,
    "passRate": 100,
    "failurePatterns": []
  },
  "deployments": {
    "total": 1,
    "successful": 1,
    "failed": 0,
    "successRate": 100,
    "avgDuration": 5921,
    "trends": []
  },
  "correlations": [],
  "recommendations": [],
  "goalsUpdated": false,
  "alertsSent": []
}
```

### Markdown Report Example

See `logs/jarvis/analytics/analytics-YYYY-MM-DD.md` for formatted report.

## Slack Notifications

When configured, the service sends Slack alerts for:

- **Module Health**: When any module drops below threshold (default: 85%)
- **Test Quality**: When test pass rate falls below threshold
- **Deployment Issues**: When deployment success rate < 90%

Example notification:

```
🚨 Module Health Alert

Module "music" health dropped to 72% (threshold: 85%)

Module: music
Score: 72/100

Issues:
• Module score significantly below target (< 70)
• Success rate below target: 68.5%

Recommendations:
• Investigate root cause of performance degradation
• Review error logs and failure patterns
```

## Strategic Goal Updates

The service can automatically update `memory/strategic-goals-v2.json` based on analytics:

### Automation Updates
- Adjusts `job_failure_rate` targets based on actual performance
- Updates CI/CD cycle time expectations

### Module Priority Flags
- Sets `high_priority: true` when module health < 70%
- Removes priority flag when module recovers to > 85%

### Intelligence Tracking
- Tracks insight accuracy over time
- Maintains 30-day performance history

Example update:

```json
{
  "objectives": {
    "workflow_automation": {
      "high_priority": true,
      "priority_reason": "Module health dropped to 68/100",
      "monitored_metrics": [
        {
          "name": "job_failure_rate",
          "target": "< 8"  // Updated from "< 5"
        }
      ]
    }
  },
  "last_updated": "2025-10-07T22:00:00.000Z",
  "updated_by": "cloud-intelligence-service"
}
```

## Continuous Monitoring

To enable continuous monitoring:

```typescript
// Start the service (runs analysis every 24 hours by default)
const intelligence = initializeCloudIntelligence();
await intelligence.start();

// The service will:
// 1. Run initial analysis immediately
// 2. Schedule periodic analyses
// 3. Generate reports automatically
// 4. Send alerts when thresholds are breached
// 5. Update strategic goals as needed

// To stop monitoring:
intelligence.stop();
```

## Integration with Jarvis Core

The Cloud Intelligence Service integrates with:

- **Self-Awareness Module**: Uses vitality metrics for correlation
- **Adaptive Engine**: Informs adaptation decisions
- **Goal Updater**: Maintains strategic goal alignment
- **Notification System**: Alerts on critical issues

## Performance Considerations

- **Analysis Duration**: Typically < 1 second for standard datasets
- **Memory Usage**: < 50 MB for typical workloads
- **CPU Impact**: Minimal (runs async, non-blocking)
- **Storage**: ~10 KB per daily report

## Best Practices

1. **Run Daily**: Set `analysisInterval: 86400000` (24 hours)
2. **Configure Slack**: Enable alerts for proactive monitoring
3. **Review Reports**: Check daily Markdown reports for trends
4. **Tune Thresholds**: Adjust `notificationThreshold` based on your needs
5. **Enable Goal Updates**: Keep strategic goals aligned with reality

## Troubleshooting

### No data collected

**Issue:** Analysis shows 0 tests, deployments, etc.

**Solution:**
```bash
# Check data sources exist
ls -la logs/tests/
ls -la logs/jarvis/adaptive-history.log
ls -la outputs/deploy/
```

### Alerts not sending

**Issue:** Slack alerts not received

**Solution:**
```bash
# Verify webhook URL is set
echo $SLACK_WEBHOOK_URL

# Test webhook manually
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test notification"}'
```

### Goals not updating

**Issue:** `strategic-goals-v2.json` not being modified

**Solution:**
- Ensure `enableAutoGoalUpdate: true` in config
- Check file permissions on `memory/strategic-goals-v2.json`
- Review logs for update errors

## API Reference

### `initializeCloudIntelligence(config?)`

Initialize the Cloud Intelligence Service.

**Parameters:**
- `config` (optional): Partial analytics configuration

**Returns:** `CloudIntelligenceService` instance

### `CloudIntelligenceService.start()`

Start continuous monitoring.

### `CloudIntelligenceService.stop()`

Stop continuous monitoring.

### `CloudIntelligenceService.runAnalysis()`

Run a one-time analysis.

**Returns:** `Promise<AnalysisResult>`

### `CloudIntelligenceService.getLatestAnalysis()`

Get the most recent analysis result from disk.

**Returns:** `Promise<AnalysisResult | null>`

## Development

### Adding New Analyzers

1. Create analyzer in `src/jarvis/analytics/`
2. Implement analysis logic
3. Export from `index.ts`
4. Integrate into `CloudIntelligenceService.runAnalysis()`

### Adding New Data Sources

1. Add collection method in `CloudIntelligenceService.collectData()`
2. Update analyzer to process new data
3. Update report generator to display insights

### Adding New Metrics

1. Update relevant analyzer
2. Add metric to `AnalysisResult` type
3. Update report generator
4. Update goal updater if applicable

## License

Part of Jarvis V2 - AI DAWG Controller System

## Support

For issues or questions:
- Check logs: `logs/jarvis/analytics/`
- Review reports: Generated Markdown files
- Run test: `npm run test:intelligence`
