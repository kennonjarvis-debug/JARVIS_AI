# Jarvis Agent System - Overview

**Version:** Wave 3 - Production Ready
**Last Updated:** 2025-10-15

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [BaseAgent Class](#baseagent-class)
4. [MarketingAgent](#marketingagent)
5. [Task Execution Flow](#task-execution-flow)
6. [Email Campaign Limits](#email-campaign-limits)
7. [Integration Guide](#integration-guide)
8. [Testing](#testing)
9. [API Reference](#api-reference)

---

## Introduction

The Jarvis Agent System provides a foundation for building autonomous AI agents that can execute tasks with human oversight. The system is built on three core principles:

1. **Intelligent Decision-Making**: Every action is evaluated by a decision engine for risk and confidence
2. **Human-in-the-Loop**: High-risk actions require explicit approval
3. **Memory & Learning**: All executions are stored for context and improvement

### Key Components

- **BaseAgent**: Abstract foundation class providing common functionality
- **Specialized Agents**: Domain-specific agents (Marketing, Sales, Support, Operations)
- **Decision Engine**: Risk evaluation and action recommendation
- **Memory System**: Context storage and retrieval
- **Approval Queue**: Human oversight for high-risk actions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Orchestrator                         │
│                  (Coordinates all agents)                    │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
    │ Marketing │      │   Sales   │      │  Support  │
    │   Agent   │      │   Agent   │      │   Agent   │
    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │     BaseAgent      │
                    │  (Abstract Class)  │
                    └─────────┬──────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼──────┐     ┌─────▼──────┐     ┌─────▼──────┐
    │  Decision  │     │   Memory   │     │  Approval  │
    │   Engine   │     │   System   │     │   Queue    │
    └────────────┘     └────────────┘     └────────────┘
```

---

## BaseAgent Class

The `BaseAgent` class is an abstract foundation that all specialized agents extend.

### Location
`src/agents/base-agent.ts`

### Key Features

✅ **Execution Flow Management**
- Validates task compatibility
- Consults decision engine for risk assessment
- Requests approval when needed
- Executes task and stores result

✅ **Memory Integration**
- Retrieves historical context before execution
- Stores execution results for learning
- Tracks errors for pattern recognition

✅ **Claude Integration**
- Centralized Anthropic client configuration
- Content generation helper methods
- JSON parsing with markdown code block handling

✅ **Error Handling**
- Comprehensive error tracking
- Automatic storage of failures in memory
- Status management (idle/busy/error)

### Abstract Methods

Subclasses **must** implement:

```typescript
abstract getSupportedTaskTypes(): TaskType[];
abstract canHandle(task: TaskRequest): boolean;
abstract executeTask(task: TaskRequest): Promise<TaskResult>;
```

### Protected Helper Methods

Available to subclasses:

```typescript
// Generate text content with Claude
protected async generateContent(prompt: string, context?: any): Promise<string>

// Generate and parse JSON content
protected async generateJSON<T>(prompt: string): Promise<T>

// Validate task has required fields
protected validateTaskData(task: TaskRequest, requiredFields: string[]): void

// Create standardized task result
protected createTaskResult(
  taskId: string,
  success: boolean,
  data?: any,
  message?: string
): TaskResult

// Request human approval for high-risk task
protected async requestApproval(
  task: TaskRequest,
  decision: DecisionResult
): Promise<TaskResult>
```

### Usage Example

```typescript
class MyCustomAgent extends BaseAgent {
  getSupportedTaskTypes(): TaskType[] {
    return ['custom.task' as TaskType];
  }

  canHandle(task: TaskRequest): boolean {
    return task.type === 'custom.task';
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    // Validate required fields
    this.validateTaskData(task, ['field1', 'field2']);

    // Use Claude to generate content
    const content = await this.generateContent('Generate something...');

    // Return standardized result
    return this.createTaskResult(
      task.id,
      true,
      { content },
      'Task completed successfully'
    );
  }
}
```

---

## MarketingAgent

The first specialized agent, handling social media and email campaigns.

### Location
`src/agents/marketing-agent.ts`

### Supported Task Types

1. **marketing.social.post** - Create and schedule social media posts
2. **marketing.email.campaign** - Send email campaigns with Brevo limits
3. **marketing.content.create** - Generate long-form marketing content

### Key Features

✅ **Social Media Management**
- Multi-platform support (Twitter, LinkedIn, Facebook)
- Platform-specific character limits
- Automatic content optimization
- Integration with Buffer for scheduling

✅ **Email Campaign Management**
- Brevo free tier limit enforcement (300 emails/day)
- Automatic batching for large campaigns
- Daily count tracking with midnight reset
- Batch scheduling across multiple days

✅ **Content Generation**
- Claude-powered content creation
- Customizable tone and style
- Target audience optimization
- SEO-friendly output

### Configuration

Required environment variables:

```bash
# Buffer Profile IDs (for social media)
BUFFER_TWITTER_PROFILE_ID=your-twitter-profile-id
BUFFER_LINKEDIN_PROFILE_ID=your-linkedin-profile-id
BUFFER_FACEBOOK_PROFILE_ID=your-facebook-profile-id

# Brevo (Email)
BREVO_API_KEY=xkeysib-your-api-key
BREVO_DAILY_LIMIT=300  # Free tier limit
```

### Usage Examples

#### Social Media Post

```typescript
const task: TaskRequest = {
  id: 'task-123',
  type: 'marketing.social.post',
  priority: 1,
  data: {
    platform: 'twitter',
    topic: 'New feature launch',
    targetAudience: 'Music producers',
    tone: 'professional',
    hashtags: ['DAWGAI', 'MusicProduction'],
    includeLink: 'https://dawg.ai/new-feature',
  },
  requestedBy: 'user-456',
  timestamp: new Date(),
};

const result = await marketingAgent.execute(task);
// Result includes: postId, content, scheduledFor
```

#### Email Campaign (Small)

```typescript
const task: TaskRequest = {
  id: 'task-124',
  type: 'marketing.email.campaign',
  priority: 1,
  data: {
    segment: 'active_users',
    subject: 'Weekly Newsletter',
    content: 'Newsletter content...',
    recipientCount: 150,  // Under 300 limit
    templateId: 'newsletter-template',
  },
  requestedBy: 'user-456',
  timestamp: new Date(),
};

const result = await marketingAgent.execute(task);
// Sends immediately, returns: { sent: 150, dailyCountUsed: 150 }
```

#### Email Campaign (Large - Batched)

```typescript
const task: TaskRequest = {
  id: 'task-125',
  type: 'marketing.email.campaign',
  priority: 1,
  data: {
    segment: 'all_users',
    subject: 'Product Announcement',
    content: 'Announcement content...',
    recipientCount: 1000,  // Exceeds 300 limit
  },
  requestedBy: 'user-456',
  timestamp: new Date(),
};

const result = await marketingAgent.execute(task);
// Returns batch plan:
// {
//   batched: true,
//   totalBatches: 4,
//   batches: [
//     { batchNumber: 1, recipientCount: 300, scheduledFor: '2025-10-15' },
//     { batchNumber: 2, recipientCount: 300, scheduledFor: '2025-10-16' },
//     { batchNumber: 3, recipientCount: 300, scheduledFor: '2025-10-17' },
//     { batchNumber: 4, recipientCount: 100, scheduledFor: '2025-10-18' },
//   ]
// }
```

---

## Task Execution Flow

Every task follows this standardized flow:

```
1. Task Submission
   ↓
2. Agent Selection (Orchestrator)
   ↓
3. Capability Check (canHandle)
   ↓
4. Context Retrieval (Memory System)
   ↓
5. Risk Evaluation (Decision Engine)
   ↓
6. Decision Branch:

   ┌─ REJECT → Throw Error
   │
   ├─ APPROVE → Execute Task
   │             ↓
   │          Store Result
   │
   └─ REQUEST_APPROVAL → Submit to Approval Queue
                          ↓
                       Wait for Human
                          ↓
                       Execute if Approved
```

### Example Execution

```typescript
// 1. Create agent
const agent = new MarketingAgent({
  id: 'marketing-001',
  name: 'Marketing Agent',
  capabilities: [...],
  integrations: { buffer, email },
  decisionEngine,
  memory,
  approvalQueue,
});

// 2. Submit task
const result = await agent.execute(task);

// 3. Handle result
if (result.status === 'completed') {
  console.log('Task completed:', result.data);
} else if (result.status === 'awaiting_approval') {
  console.log('Awaiting approval:', result.data.requestId);
}
```

---

## Email Campaign Limits

### Why Brevo 300/Day Limit?

Jarvis uses **Brevo** (formerly Sendinblue) for email campaigns, which offers:
- ✅ 300 emails/day on free tier
- ✅ Modern REST API
- ✅ Template support
- ✅ Bulk sending capabilities

**Note:** We explicitly do NOT use SendGrid (deprecated in our architecture).

### Limit Enforcement Strategy

```typescript
// Risk Levels (from src/config/tools.ts)
emailRecipients: {
  low: 50,        // < 50 recipients = LOW risk
  medium: 300,    // 50-300 = MEDIUM risk
  high: 300,      // > 300 = HIGH risk (requires batching)
}
```

### How Batching Works

When a campaign exceeds 300 recipients:

1. **Calculate Batches**
   - Total batches = `Math.ceil(recipientCount / 300)`
   - Each batch gets ≤300 recipients

2. **Schedule Across Days**
   - Batch 1: Today at 10:00 AM
   - Batch 2: Tomorrow at 10:00 AM
   - Batch 3: Day after at 10:00 AM
   - etc.

3. **Store Batch Plan**
   - Plan saved in Memory System
   - Each batch marked as "planned"
   - Cron job executes batches on schedule

4. **Execute Batches**
   - Operations Agent processes scheduled batches
   - Checks daily count before sending
   - Updates batch status to "completed"

### Daily Count Tracking

```typescript
// Get current stats
const stats = marketingAgent.getDailyEmailStats();
// Returns:
// {
//   sent: 175,
//   limit: 300,
//   remaining: 125,
//   resetDate: Date
// }

// Manual reset (for testing)
marketingAgent.resetDailyEmailCount();
```

### Reset Logic

Daily count automatically resets at midnight:
- Compares current date with last reset date
- Resets if day/month/year differs
- Triggered on every `executeTask()` call

---

## Integration Guide

### Creating a New Specialized Agent

1. **Extend BaseAgent**

```typescript
import { BaseAgent } from './base-agent.js';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks.js';

export class MyAgent extends BaseAgent {
  // Define supported task types
  getSupportedTaskTypes(): TaskType[] {
    return ['myagent.task1' as TaskType, 'myagent.task2' as TaskType];
  }

  // Check if agent can handle task
  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  // Implement task execution
  async executeTask(task: TaskRequest): Promise<TaskResult> {
    switch (task.type) {
      case 'myagent.task1':
        return await this.handleTask1(task);
      case 'myagent.task2':
        return await this.handleTask2(task);
      default:
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Unsupported task type: ${task.type}`,
          { taskId: task.id },
          false
        );
    }
  }

  private async handleTask1(task: TaskRequest): Promise<TaskResult> {
    // Validate
    this.validateTaskData(task, ['field1', 'field2']);

    // Execute
    const result = await this.doSomething(task.data);

    // Return
    return this.createTaskResult(task.id, true, result, 'Success');
  }
}
```

2. **Add Integration Adapters**

```typescript
constructor(config: AgentConfig) {
  super(config);
  this.myIntegration = config.integrations.myIntegration;
}
```

3. **Use Helper Methods**

```typescript
// Generate content
const content = await this.generateContent('Create a blog post about...');

// Generate JSON
const data = await this.generateJSON<MyType>('Generate JSON with fields...');

// Validate
this.validateTaskData(task, ['requiredField1', 'requiredField2']);

// Create result
return this.createTaskResult(task.id, true, { data }, 'Completed');
```

4. **Create Tests**

```typescript
describe('MyAgent', () => {
  let agent: MyAgent;

  beforeEach(() => {
    agent = new MyAgent({
      id: 'my-agent',
      name: 'My Agent',
      capabilities: [],
      integrations: {},
      decisionEngine: mockDecisionEngine,
      memory: mockMemory,
      approvalQueue: mockApprovalQueue,
    });
  });

  it('should handle my task', async () => {
    const task = { /* ... */ };
    const result = await agent.executeTask(task);
    expect(result.success).toBe(true);
  });
});
```

---

## Testing

### Test Coverage

Both agents have comprehensive test suites with >80% coverage:

- **BaseAgent Tests** (`src/agents/base-agent.test.ts`): 23 tests
  - Constructor initialization
  - Task execution flow
  - Decision engine integration
  - Approval workflow
  - Error handling
  - Helper methods

- **MarketingAgent Tests** (`src/agents/marketing-agent.test.ts`): 28 tests
  - Social media posting
  - Email campaigns
  - Brevo limit enforcement
  - Email batching logic
  - Daily count tracking
  - Platform optimization

### Running Tests

```bash
# Run all tests
npm test

# Run specific agent tests
npm test base-agent
npm test marketing-agent

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

### Test Structure

```typescript
describe('AgentName', () => {
  let agent: AgentType;
  let mockDependencies: any;

  beforeEach(() => {
    // Set up mocks and agent instance
  });

  describe('method name', () => {
    it('should behave correctly in this scenario', async () => {
      // Arrange
      const input = { /* ... */ };

      // Act
      const result = await agent.method(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

---

## API Reference

### BaseAgent

#### Constructor

```typescript
constructor(config: AgentConfig)
```

**Parameters:**
- `config.id`: Unique agent identifier
- `config.name`: Human-readable agent name
- `config.capabilities`: Array of agent capabilities
- `config.integrations`: Integration adapters (Buffer, Email, etc.)
- `config.decisionEngine`: Decision engine instance
- `config.memory`: Memory system instance
- `config.approvalQueue`: Approval queue instance

#### Public Methods

##### execute()

```typescript
async execute(task: TaskRequest): Promise<TaskResult>
```

Main execution method. Orchestrates the full task lifecycle.

**Returns:** Task result with status (completed/failed/awaiting_approval)

**Throws:** `JarvisError` on validation errors or rejected tasks

##### getStatus()

```typescript
getStatus(): AgentStatus
```

Returns current agent status.

**Returns:**
```typescript
{
  id: string;
  name: string;
  status: 'idle' | 'busy' | 'error';
  capabilities: AgentCapability[];
  lastActive: Date;
}
```

##### getCapabilities()

```typescript
getCapabilities(): AgentCapability[]
```

Returns agent capabilities.

##### getId() / getName()

```typescript
getId(): string
getName(): string
```

Return agent ID and name.

---

### MarketingAgent

Extends all BaseAgent methods plus:

#### getDailyEmailStats()

```typescript
getDailyEmailStats(): {
  sent: number;
  limit: number;
  remaining: number;
  resetDate: Date;
}
```

Returns current daily email usage statistics.

#### resetDailyEmailCount()

```typescript
resetDailyEmailCount(): void
```

Manually reset daily email count (for testing or manual intervention).

---

## Best Practices

### 1. Always Validate Input

```typescript
this.validateTaskData(task, ['required', 'fields']);
```

### 2. Use Helper Methods

```typescript
// ✅ Good
return this.createTaskResult(task.id, true, data, 'Success');

// ❌ Bad
return {
  taskId: task.id,
  success: true,
  // ... manual construction
};
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await this.doSomething();
  return this.createTaskResult(task.id, true, result);
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new JarvisError(
    ErrorCode.INTERNAL_ERROR,
    'Failed to complete task',
    { taskId: task.id, error },
    true
  );
}
```

### 4. Log Important Events

```typescript
this.logger.info('Starting operation', { taskId: task.id });
this.logger.debug('Intermediate state', { data });
this.logger.warn('Potential issue', { warning });
this.logger.error('Operation failed', error, { context });
```

### 5. Test Thoroughly

- Test happy path
- Test error cases
- Test edge cases (limits, empty data, etc.)
- Test integration points (mocked)
- Aim for >80% coverage

---

## Troubleshooting

### Common Issues

#### 1. "Buffer integration not configured"

**Cause:** Buffer adapter not passed to agent constructor

**Solution:**
```typescript
const agent = new MarketingAgent({
  // ...
  integrations: {
    buffer: bufferAdapter,  // ✅ Include this
  },
});
```

#### 2. "Email campaign exceeds remaining daily limit"

**Cause:** Already sent too many emails today

**Solution:**
- Wait until midnight for automatic reset
- OR use batching for campaigns >300
- OR manually reset: `agent.resetDailyEmailCount()` (testing only)

#### 3. "Buffer profile ID not configured"

**Cause:** Environment variable not set

**Solution:**
```bash
export BUFFER_TWITTER_PROFILE_ID=your-profile-id
export BUFFER_LINKEDIN_PROFILE_ID=your-profile-id
export BUFFER_FACEBOOK_PROFILE_ID=your-profile-id
```

#### 4. "Task rejected by decision engine"

**Cause:** Decision engine determined task is too risky

**Solution:**
- Review decision reasoning in logs
- Adjust task parameters to reduce risk
- Request explicit approval from user
- Update decision rules if needed

---

## Next Steps

1. **Implement Other Agents**
   - SalesAgent (Wave 3, Instance 3)
   - SupportAgent (Wave 3, Instance 4)
   - OperationsAgent (Wave 3, Instance 5)

2. **Enhance Decision Engine**
   - Add more sophisticated risk rules
   - Implement confidence scoring
   - Learn from historical decisions

3. **Expand Integrations**
   - Add more social platforms
   - Support multiple email providers
   - Integrate with CRM systems

4. **Improve Monitoring**
   - Real-time dashboards
   - Performance metrics
   - Alert thresholds

---

## Resources

- **Source Code:**
  - BaseAgent: `src/agents/base-agent.ts`
  - MarketingAgent: `src/agents/marketing-agent.ts`

- **Tests:**
  - BaseAgent Tests: `src/agents/base-agent.test.ts`
  - MarketingAgent Tests: `src/agents/marketing-agent.test.ts`

- **Configuration:**
  - Central Config: `src/config/tools.ts`
  - Risk Thresholds: `RISK_THRESHOLDS` in tools.ts

- **Related Documentation:**
  - Decision Engine: `docs/decision-engine.md`
  - Memory System: `docs/memory-system.md`
  - Approval Queue: `docs/approval-queue.md`

---

**Last Updated:** 2025-10-15
**Contributors:** Instance 2 - Wave 3 Development Team
