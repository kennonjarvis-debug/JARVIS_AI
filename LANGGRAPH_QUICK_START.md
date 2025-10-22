# LangGraph Multi-Agent System - Quick Start Guide

**Version**: 1.0
**Date**: October 15, 2025
**For**: JARVIS Developers and Instance 6 (Integration)

---

## Overview

The LangGraph multi-agent system enables JARVIS to intelligently coordinate multiple agents for complex business tasks. It automatically decides whether to use simple single-agent routing or sophisticated multi-agent orchestration.

---

## Quick Start

### 1. Basic Usage (Automatic Mode Selection)

```typescript
import { initializeJarvis } from './src/index.js';
import type { TaskRequest, Priority } from './src/types/tasks.js';

// Initialize JARVIS (includes LangGraph)
const { orchestrator } = await initializeJarvis();

// Submit a complex task - automatically uses LangGraph
await orchestrator.submitTask({
  id: crypto.randomUUID(),
  type: 'marketing.content.create',
  priority: 1 as Priority,
  data: {
    workflow: 'feature_launch',
    featureName: 'AI Beat Generator',
    actions: [
      'Create announcement',
      'Schedule social posts',
      'Update knowledge base',
    ],
  },
  requestedBy: 'product-manager',
  timestamp: new Date(),
  metadata: { requiresCollaboration: true },
});
```

### 2. Using Feature Launch Workflow

```typescript
import { FeatureLaunchWorkflow } from './src/workflows/feature-launch.js';

const workflow = new FeatureLaunchWorkflow(orchestrator.getLangGraph());

// Check if ready to launch
const { ready, issues } = await workflow.checkReadiness({
  featureName: 'AI Beat Generator',
  description: 'Generate professional beats with AI',
  targetAudience: 'Music producers and beatmakers',
  launchDate: new Date('2025-11-01'),
  highlights: ['Generate beats in seconds', 'Multiple genres'],
});

if (!ready) {
  console.error('Launch blocked:', issues);
  return;
}

// Execute full launch
const result = await workflow.execute({
  featureName: 'AI Beat Generator',
  description: 'Generate professional beats with AI',
  targetAudience: 'Music producers and beatmakers',
  launchDate: new Date('2025-11-01'),
  pricing: { tier: 'Pro', price: 29 },
  highlights: [
    'Generate beats in multiple genres',
    'Real-time customization',
    'Export to MIDI and audio',
  ],
});

console.log('Launch Result:', {
  success: result.success,
  announcementPublished: result.announcementPublished,
  socialCampaignScheduled: result.socialCampaignScheduled,
  emailSent: result.emailSent,
  kbUpdated: result.kbUpdated,
  errors: result.errors,
});
```

---

## Configuration

### Set LangGraph Threshold

```typescript
// In src/index.ts or at runtime
orchestrator.setLangGraphThreshold('complex'); // Recommended

// Options:
// - 'always': All tasks use LangGraph (slower but comprehensive)
// - 'complex': Smart detection (recommended - default)
// - 'never': Disable LangGraph (single-agent only)
```

### Task Complexity Detection

Tasks automatically use LangGraph if they have:
- ✅ `metadata.workflow` set
- ✅ `metadata.requiresCollaboration: true`
- ✅ `data.actions` array with >3 items
- ✅ Type is `marketing.content.create`
- ✅ Type is `marketing.email.campaign`
- ✅ `data.multiAgent: true`

---

## API Reference

### LangGraphOrchestrator

```typescript
class LangGraphOrchestrator {
  // Register an agent
  registerAgent(name: string, agent: BaseAgent): void;

  // Execute a task
  executeTask(request: TaskRequest, metadata?: Record<string, any>): Promise<AggregatedResult>;

  // Get registered agents
  getRegisteredAgents(): string[];
}
```

### EnhancedOrchestrator

```typescript
class EnhancedOrchestrator extends Orchestrator {
  // Get LangGraph instance
  getLangGraph(): LangGraphOrchestrator;

  // Configure threshold
  setLangGraphThreshold(threshold: 'always' | 'complex' | 'never'): void;

  // Inherited from Orchestrator
  submitTask(task: TaskRequest): Promise<string>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  getMetrics(): Promise<SystemMetrics>;
}
```

### FeatureLaunchWorkflow

```typescript
class FeatureLaunchWorkflow {
  // Check if ready to launch
  checkReadiness(config: FeatureLaunchConfig): Promise<{
    ready: boolean;
    issues: string[];
  }>;

  // Execute full launch
  execute(config: FeatureLaunchConfig): Promise<FeatureLaunchResult>;

  // Simple announcement only
  executeSimple(featureName: string, description: string): Promise<boolean>;

  // Rollback a launch
  rollback(featureName: string): Promise<boolean>;
}
```

---

## Creating Custom Workflows

```typescript
import { LangGraphOrchestrator } from './src/core/langgraph-orchestrator.js';
import type { TaskRequest } from './src/types/tasks.js';

class MyCustomWorkflow {
  constructor(private orchestrator: LangGraphOrchestrator) {}

  async execute(params: any): Promise<any> {
    const task: TaskRequest = {
      id: crypto.randomUUID(),
      type: 'marketing.content.create',
      priority: 1,
      data: {
        workflow: 'my_custom_workflow',
        ...params,
      },
      requestedBy: 'custom-workflow',
      timestamp: new Date(),
      metadata: {
        requiresCollaboration: true,
      },
    };

    const result = await this.orchestrator.executeTask(task, {
      workflowType: 'custom',
      ...params,
    });

    return {
      success: result.success,
      summary: result.summary,
      actions: result.agentActions,
    };
  }
}
```

---

## Testing

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LangGraphOrchestrator } from '../src/core/langgraph-orchestrator.js';

describe('My Workflow', () => {
  let orchestrator: LangGraphOrchestrator;

  beforeEach(() => {
    orchestrator = new LangGraphOrchestrator(mockMemory);
    orchestrator.registerAgent('marketing', mockMarketingAgent);
  });

  it('should execute workflow', async () => {
    const result = await orchestrator.executeTask(task);
    expect(result.success).toBe(true);
  });
});
```

### Run Tests

```bash
# Run LangGraph unit tests
npm run test tests/unit/core/langgraph-orchestrator.test.ts

# Run workflow integration tests
npm run test tests/integration/workflows/feature-launch.test.ts

# Run all tests
npm run test
```

---

## Monitoring & Debugging

### Enable Debug Logging

```typescript
// Set LOG_LEVEL in .env
LOG_LEVEL=debug

// Or in code
process.env.LOG_LEVEL = 'debug';
```

### Check Task Execution

```typescript
// Listen to orchestrator events
orchestrator.on('task:completed', (result) => {
  console.log('Task completed:', result);
});

orchestrator.on('task:failed', (taskId, error) => {
  console.error('Task failed:', taskId, error);
});

// Get task status
const status = await orchestrator.getTaskStatus(taskId);
console.log('Task status:', status);
```

### View Memory Entries

```typescript
// Query recent multi-agent executions
const entries = await memory.query({
  type: 'multi_agent_execution',
  limit: 10,
  sortBy: 'timestamp',
  sortOrder: 'desc',
});

console.log('Recent workflows:', entries);
```

---

## Performance Tips

### 1. Use Appropriate Threshold
- **Simple tasks**: Use 'never' or 'complex' (default)
- **Complex tasks**: Use 'complex' or 'always'
- **Development**: Use 'always' to test LangGraph

### 2. Optimize Agent Count
- Only register agents you need
- Remove unused agents to reduce routing overhead

### 3. Monitor API Usage
- LangGraph uses Claude API for supervisor and aggregator
- Each workflow = 2 Claude API calls (~$0.001 each)
- Consider caching supervisor decisions for repeated tasks

### 4. Batch Related Tasks
```typescript
// Instead of:
await workflow.executeSimple('Feature A', 'desc');
await workflow.executeSimple('Feature B', 'desc');

// Use:
await workflow.execute({
  featureName: 'Multiple Features',
  actions: ['Feature A', 'Feature B'],
  // ...
});
```

---

## Troubleshooting

### Issue: Tasks Not Using LangGraph

**Solution**: Check complexity indicators
```typescript
// Add metadata to force LangGraph
task.metadata = { requiresCollaboration: true };

// Or add workflow
task.data.workflow = 'my_workflow';

// Or set threshold
orchestrator.setLangGraphThreshold('always');
```

### Issue: Supervisor Analysis Fails

**Solution**: Check Claude API credentials
```bash
# Verify .env
cat .env | grep ANTHROPIC_API_KEY

# Test API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

### Issue: Agents Not Executing

**Solution**: Check agent registration
```typescript
// List registered agents
const agents = orchestrator.getLangGraph().getRegisteredAgents();
console.log('Registered agents:', agents);

// Should include: ['marketing', 'sales', 'operations', 'support']
```

### Issue: Slow Performance

**Solution**: Profile execution
```typescript
const startTime = Date.now();
const result = await orchestrator.executeTask(task);
const duration = Date.now() - startTime;

console.log('Execution time:', duration, 'ms');

// Expected:
// - Simple tasks: <5,000ms
// - Complex tasks: <30,000ms
```

---

## Examples by Use Case

### 1. Content Campaign Launch
```typescript
await orchestrator.submitTask({
  id: crypto.randomUUID(),
  type: 'marketing.email.campaign',
  priority: 1,
  data: {
    campaign: 'Pro Tier Launch',
    actions: ['Email', 'Social', 'Blog'],
  },
  requestedBy: 'marketing-manager',
  timestamp: new Date(),
});
```

### 2. Lead Nurturing Sequence
```typescript
await orchestrator.submitTask({
  id: crypto.randomUUID(),
  type: 'sales.outreach',
  priority: 1,
  data: {
    workflow: 'lead_nurture',
    leadSegment: 'trial-users',
    actions: ['Email Day 1', 'Email Day 3', 'Call Day 7'],
  },
  requestedBy: 'sales-manager',
  timestamp: new Date(),
  metadata: { requiresCollaboration: true },
});
```

### 3. Customer Support Onboarding
```typescript
await orchestrator.submitTask({
  id: crypto.randomUUID(),
  type: 'support.kb.update',
  priority: 2,
  data: {
    workflow: 'onboard_support',
    actions: ['Create FAQs', 'Train chatbot', 'Update docs'],
  },
  requestedBy: 'support-manager',
  timestamp: new Date(),
});
```

---

## Best Practices

### ✅ DO
- Use `requiresCollaboration` for multi-agent tasks
- Set appropriate priority levels
- Include clear task descriptions
- Monitor Claude API usage
- Test workflows in staging first

### ❌ DON'T
- Use LangGraph for simple single-agent tasks
- Submit tasks without validation
- Ignore error handling
- Exceed Claude API rate limits
- Skip readiness checks for launches

---

## Support

- **Documentation**: `/docs/agents-overview.md`
- **Examples**: `/tests/integration/workflows/`
- **Issues**: Check logs in `/logs/`
- **Instance 5 Report**: `/INSTANCE_5_LANGGRAPH_COMPLETE.md`

---

**Ready to orchestrate complex multi-agent workflows!** 🚀
