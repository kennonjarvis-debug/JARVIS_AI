# Decision Engine Framework

## Overview

The Decision Engine is the brain of Jarvis that determines when tasks can be executed autonomously vs when they require human approval.

## Architecture

### Decision Flow

1. **Rule Evaluation** (fast path) - Check predefined rules
2. **Claude Evaluation** (smart path) - Use AI for complex decisions
3. **Threshold Check** - Compare confidence vs risk thresholds
4. **Approval Routing** - Send high-risk tasks to approval queue

### Risk Levels

- **LOW:** <$10 cost, <50 email recipients - High confidence (70%) required
- **MEDIUM:** $10-50 cost, 50-300 recipients - Higher confidence (80%) required
- **HIGH:** $50-100 cost, >300 recipients - Very high confidence (90%) required
- **CRITICAL:** >$100 cost - Always require approval (100%)

## Configuration

### Risk Thresholds

Defined in `src/config/tools.ts`:

```typescript
export const RISK_THRESHOLDS = {
  emailRecipients: {
    low: 50,
    medium: 300,  // Brevo free tier limit
    high: 300,
  },
  financial: {
    low: 10,
    medium: 50,
    high: 100,
    critical: 100,
  },
};
```

### Decision Rules

Defined in `config/decision-rules.json` with priority ordering.

## Usage

```typescript
import { DecisionEngine } from './core/decision-engine';

const decision = await decisionEngine.evaluate({
  task,
  historicalData: [],
  rules: [],
  agentCapabilities: [],
});

if (decision.requiresApproval) {
  await approvalQueue.requestApproval({...});
} else {
  await executeTask(task);
}
```

## Learning Mechanism

The engine learns from human feedback:

```typescript
await decisionEngine.learnFromFeedback(
  taskId,
  decision,
  'approved',
  'Timing was good'
);
```

This adjusts confidence thresholds over time based on approval patterns.

## Best Practices

1. Start conservative (high thresholds)
2. Monitor approval/rejection patterns
3. Adjust rules based on feedback
4. Always store decision context for auditability

## Troubleshooting

### All tasks require approval
- Check confidence thresholds in CONFIG
- Review decision rules priority
- Verify Claude API key is working

### Tasks executed that should require approval
- Lower confidence thresholds for that risk level
- Add specific rules for those task types
- Review estimated impact calculations
