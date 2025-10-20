# Jarvis Unified Agent System

This directory contains the consolidated autonomous and proactive agent system for Jarvis.

## Overview

This unified system replaces and consolidates:
- `src/autonomous/` - Task-based autonomous agents
- `src/core/proactive/` - Proactive suggestion system

Both systems have been merged into a single, cohesive architecture that combines:
- ✅ Task automation with clearance levels
- ✅ Proactive intelligence and suggestions
- ✅ Adaptive learning from user behavior
- ✅ Pattern recognition and decision making
- ✅ Inter-agent coordination

## Architecture

```
src/core/agents/
├── orchestrator.ts              # Main orchestrator - coordinates all agents
├── config.ts                    # Configuration management
├── types.ts                     # Unified type definitions
├── index.ts                     # Public API
├── engines/
│   ├── adaptive-engine.ts       # Unified adaptive learning engine
│   ├── anticipation-engine.ts   # Proactive anticipation (from proactive)
│   └── insight-engine.ts        # Pattern insights (from autonomous)
└── domains/
    ├── base-domain.ts           # Base class for all domain agents
    ├── chat-conversation-domain.ts
    ├── code-optimization-domain.ts
    ├── cost-optimization-domain.ts
    ├── data-scientist-domain.ts
    ├── marketing-strategist-domain.ts
    └── system-health-domain.ts
```

## Usage

### Basic Setup

```typescript
import { getOrchestrator, ClearanceLevel } from '@/core/agents';

// Get orchestrator instance
const orchestrator = getOrchestrator();

// Start the system
await orchestrator.start();

// Register domain agents
import { CodeOptimizationDomain, SystemHealthDomain } from '@/core/agents';

orchestrator.registerAgent(new CodeOptimizationDomain(ClearanceLevel.SUGGEST));
orchestrator.registerAgent(new SystemHealthDomain(ClearanceLevel.READ_ONLY));
```

### Configuration

Configure via environment variables:

```bash
# Enable/disable system
AUTONOMOUS_ENABLED=true
PROACTIVE_ENABLED=true
LEARNING_ENABLED=true

# Clearance level: READ_ONLY, SUGGEST, MODIFY_SAFE, MODIFY_PRODUCTION, FULL_AUTONOMY
AUTONOMOUS_CLEARANCE=SUGGEST

# Analysis interval (milliseconds)
AUTONOMOUS_ANALYSIS_INTERVAL=300000  # 5 minutes

# Auto-approval settings
AUTONOMOUS_AUTO_APPROVE_READ_ONLY=true
AUTONOMOUS_AUTO_APPROVE_SUGGESTIONS=true
AUTONOMOUS_AUTO_APPROVE_MODIFY_SAFE=false
AUTONOMOUS_AUTO_APPROVE_MODIFY_PRODUCTION=false

# Proactive settings
PROACTIVE_MAX_PER_HOUR=5
PROACTIVE_MAX_PER_DAY=20
PROACTIVE_CONFIDENCE=0.6

# Learning settings
LEARNING_RATE=0.7
LEARNING_CONFIDENCE=0.75
LEARNING_AUTO_ADAPT=false
```

### Task Management

```typescript
import { Priority, TaskStatus } from '@/core/agents';

// Queue a task
orchestrator.queueTask({
  id: 'task-123',
  domain: DomainType.CODE_OPTIMIZATION,
  action: 'refactor-duplicates',
  description: 'Refactor duplicate code patterns',
  priority: Priority.MEDIUM,
  status: TaskStatus.PENDING,
  clearance: ClearanceLevel.SUGGEST,
  requiresApproval: false,
  params: {
    minSimilarity: 0.85,
    minOccurrences: 3
  },
  createdAt: new Date()
});

// Approve pending tasks
const pending = orchestrator.getPendingApprovals();
orchestrator.approveTask(pending[0].id, 'user@example.com');

// Check status
const status = orchestrator.getStatus();
console.log(`Active tasks: ${status.activeTasks}`);
console.log(`Queue size: ${status.taskQueue}`);
```

### Adaptive Learning

```typescript
import { adaptiveEngine } from '@/core/agents';

// Track user interactions
adaptiveEngine.trackInteraction({
  id: 'int-123',
  type: 'command',
  timestamp: new Date(),
  context: {
    timestamp: new Date(),
    activeProject: 'jarvis',
    recentCommands: ['npm test'],
    systemLoad: 0.5,
    timeOfDay: 'morning',
    dayOfWeek: 'monday'
  },
  action: 'run-tests',
  result: 'success',
  duration: 1500
});

// Get learned patterns
const patterns = adaptiveEngine.getPatterns('code');

// Get user preferences
const prefs = adaptiveEngine.getUserPreferences(0.7);

// Get metrics
const metrics = adaptiveEngine.getMetrics();
console.log(`Success rate: ${metrics.successRate * 100}%`);
console.log(`Patterns identified: ${metrics.patternsIdentified}`);
```

### Creating Custom Domain Agents

```typescript
import { BaseDomainAgent, DomainType, ClearanceLevel } from '@/core/agents';
import type { AutonomousTask, TaskResult, DomainCapability } from '@/core/agents';

export class CustomDomain extends BaseDomainAgent {
  domain: DomainType = DomainType.CUSTOM;
  name: string = 'Custom Agent';
  description: string = 'My custom domain agent';

  constructor(clearanceLevel?: ClearanceLevel) {
    super('Custom Agent', 'custom', clearanceLevel);
  }

  async initialize(): Promise<void> {
    // Initialize your agent
    logger.info('Custom agent initialized');
  }

  async analyze(): Promise<AutonomousTask[]> {
    // Analyze and return tasks
    return [];
  }

  async execute(task: AutonomousTask): Promise<TaskResult> {
    // Execute the task
    return {
      taskId: task.id,
      status: TaskStatus.COMPLETED,
      success: true,
      completedAt: new Date()
    };
  }

  getCapabilities(): DomainCapability[] {
    return [
      {
        name: 'my-capability',
        description: 'What this capability does',
        clearance: ClearanceLevel.SUGGEST,
        requiresApproval: true
      }
    ];
  }
}
```

## Events

The orchestrator emits events for monitoring:

```typescript
orchestrator.on('task:created', (event) => {
  console.log('New task:', event.data.task.action);
});

orchestrator.on('task:completed', (event) => {
  console.log('Task completed:', event.data.result);
});

orchestrator.on('decision:made', (event) => {
  console.log('Decision made:', event.data.decision);
});

orchestrator.on('pattern:identified', (event) => {
  console.log('New pattern:', event.data.pattern);
});
```

## Migration from Old Systems

### From `autonomous/orchestrator.ts`

```typescript
// Old
import { AutonomousOrchestrator } from '@/autonomous/orchestrator';
const orchestrator = AutonomousOrchestrator.getInstance();

// New
import { getOrchestrator } from '@/core/agents';
const orchestrator = getOrchestrator();
```

### From `core/proactive/proactive-agent.ts`

```typescript
// Old
import { ProactiveAgent } from '@/core/proactive/proactive-agent';
const agent = ProactiveAgent.getInstance();

// New
import { getOrchestrator } from '@/core/agents';
const orchestrator = getOrchestrator();
// Proactive features are built into the orchestrator
```

### From `autonomous/adaptive/adaptive-engine.ts`

```typescript
// Old
import { AdaptiveEngine } from '@/autonomous/adaptive/adaptive-engine';
const engine = AdaptiveEngine.getInstance();

// New
import { adaptiveEngine } from '@/core/agents';
// Same API, unified implementation
```

## Benefits of Consolidation

1. **Single Source of Truth** - One orchestrator, one adaptive engine
2. **Reduced Code Duplication** - Eliminated ~85% duplicate patterns
3. **Improved Maintainability** - Fixes apply to all agents
4. **Better Learning** - Unified learning across all domains
5. **Clearer Architecture** - Easier to understand and extend
6. **Consistent API** - Same patterns everywhere

## Testing

```typescript
import { getOrchestrator, ClearanceLevel, Priority } from '@/core/agents';

// Test setup
const orchestrator = getOrchestrator({
  enabled: true,
  globalClearance: ClearanceLevel.READ_ONLY,
  analysisInterval: 60000
});

await orchestrator.start();

// Verify agents registered
const agents = orchestrator.getAgents();
expect(agents.length).toBeGreaterThan(0);

// Test task execution
orchestrator.queueTask({
  id: 'test-task',
  domain: DomainType.SYSTEM_HEALTH,
  action: 'health-check',
  priority: Priority.HIGH,
  // ... other fields
});

await orchestrator.stop();
```

## Performance

- Analysis runs every 5 minutes (configurable)
- Max 3 concurrent tasks (configurable)
- Adaptive engine auto-saves every minute
- Pattern retention: 90 days (configurable)
- Max history: 10,000 interactions

## Security & Clearance Levels

The system enforces strict clearance levels:

1. **READ_ONLY** - Can only observe, no modifications
2. **SUGGEST** - Can suggest actions, requires approval
3. **MODIFY_SAFE** - Can modify non-production data
4. **MODIFY_PRODUCTION** - Can modify production (requires approval)
5. **FULL_AUTONOMY** - Full control (always requires approval)

## Contributing

When adding new domain agents:

1. Extend `BaseDomainAgent`
2. Implement required methods
3. Define capabilities clearly
4. Add comprehensive tests
5. Document the agent's purpose
6. Export from `index.ts`

## Related

- PR #2: Consolidation implementation
- Issue #6: Consolidation plan
- COMPREHENSIVE_AUDIT_REPORT.md: Original recommendation
