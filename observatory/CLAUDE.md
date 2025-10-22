# Jarvis - Claude Code Development Context

**Project:** Jarvis v0 - Autonomous AI Agent for DAWG AI
**Version:** 0.1.0
**Last Updated:** 2025-10-15

---

## Project Overview

Jarvis is an autonomous AI agent system designed to handle business operations for DAWG AI, a browser-based digital audio workstation (DAW) with a freemium model. The system operates 24/7, autonomously managing marketing, sales, operations, and customer support functions with minimal human intervention.

### Core Mission

Enable DAWG AI to scale business operations without proportional headcount growth by automating routine tasks and decisions, while maintaining human oversight for high-risk activities through an intelligent approval system.

### Key Capabilities

1. **Marketing Automation**: Social media content creation and scheduling, blog post generation, email campaign management, performance analytics
2. **Sales Operations**: Lead qualification and scoring, automated outreach sequences, CRM synchronization, pipeline analysis
3. **Customer Support**: Ticket routing and prioritization, automated response generation, knowledge base management, satisfaction tracking
4. **Operations Management**: Data synchronization across systems, system health monitoring, analytics aggregation, automated backups

### Target Outcomes

- **Productivity**: 60-90% reduction in time spent on routine operations
- **Cost Efficiency**: <$50/month total operational cost using free-tier services
- **Response Time**: <5 minutes for high-priority tasks, <1 hour for medium priority
- **Accuracy**: >95% autonomous decision success rate without human intervention
- **Scalability**: Handle 10x business growth without additional operational headcount

---

## Architecture Principles

### 1. Modular Design

Jarvis follows a multi-agent architecture where each agent specializes in a specific business domain:

- **Orchestrator**: Central coordinator that routes tasks to appropriate agents
- **Decision Engine**: Evaluates risk and determines if autonomous execution is safe
- **Memory System**: Maintains context and learns from past executions
- **Approval Queue**: Manages human-in-the-loop workflow for high-risk decisions

### 2. Event-Driven Architecture

All components communicate through events, enabling:
- Loose coupling between components
- Easy addition of new agents without modifying existing code
- Real-time monitoring and debugging
- Asynchronous task execution

### 3. Fail-Safe Defaults

- Default to requesting approval when confidence is low
- Never execute high-financial-impact tasks without approval
- Maintain audit trails for all autonomous decisions
- Implement automatic rollback for failed operations where possible

### 4. Separation of Concerns

```
Core Layer:
- Orchestrator (routing and coordination)
- Decision Engine (risk assessment)
- Memory System (context retention)
- Approval Queue (human oversight)

Agent Layer:
- Marketing Agent
- Sales Agent
- Support Agent
- Operations Agent

Integration Layer:
- Supabase (database)
- Buffer (social media)
- HubSpot (CRM)
- SendGrid (email)
- n8n (workflows)

Utility Layer:
- Logger (structured logging)
- Error Handler (error management)
- Type Definitions (TypeScript types)
```

---

## Decision Framework

### Risk Classification

All tasks are classified into risk tiers that determine autonomous operation boundaries:

#### Low Risk (Auto-Execute)
- Financial impact: $0
- Reversibility: Fully reversible
- Examples:
  - Reading data and analytics
  - Scheduled social media posts (using pre-approved templates)
  - Email sequences for onboarding/notifications
  - Support ticket routing and categorization
  - Data synchronization between systems
  - Performance monitoring and reporting

#### Medium Risk (Execute with Notification)
- Financial impact: $1-$100
- Reversibility: Mostly reversible
- Examples:
  - Publishing content from templates
  - Lead qualification and scoring
  - In-app upgrade prompts
  - Knowledge base article creation
  - Non-critical system configurations
  - A/B test execution

#### High Risk (Require Approval)
- Financial impact: >$100
- Reversibility: Difficult or impossible to reverse
- Examples:
  - Financial transactions >$100
  - Pricing changes or major promotions
  - Public statements during crises
  - Custom enterprise deals
  - User data deletion
  - Security policy changes
  - Major campaign launches
  - Refunds >$50

### Decision Thresholds

Configure in `config/decision-rules.json`:
- `autoApproveMaxSpend`: $100 (financial threshold)
- `bulkEmailMinRecipients`: 1000 (require approval for bulk emails)
- `autoRefundMax`: $50 (auto-approve refunds under this amount)
- `discountMax`: 10% (auto-approve discounts up to this percentage)

### Learning Mechanism

The Decision Engine learns from human feedback:
1. Track all approval decisions (approved/rejected)
2. Analyze patterns in human decisions
3. Adjust confidence thresholds based on success rate
4. Update rules dynamically when patterns emerge
5. Flag tasks similar to previously rejected decisions

---

## Code Conventions

### TypeScript Standards

1. **Strict Mode**: Always use TypeScript strict mode
2. **No `any` Types**: Use proper types or `unknown` with type guards
3. **Explicit Return Types**: All functions must have explicit return types
4. **Interface Over Type**: Prefer `interface` for object shapes
5. **Const Assertions**: Use `as const` for literal types

### Naming Conventions

```typescript
// Classes: PascalCase
class MarketingAgent extends BaseAgent { }

// Interfaces: PascalCase with 'I' prefix for implementation interfaces
interface TaskRequest { }

// Enums: PascalCase for enum name, SCREAMING_SNAKE_CASE for values
enum TaskType {
  MARKETING_SOCIAL_POST = 'marketing.social.post',
}

// Functions/Methods: camelCase
async function submitTask(request: TaskRequest): Promise<string> { }

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Private properties: prefix with underscore
private _internalState: Map<string, any>;
```

### File Organization

```typescript
// 1. Imports (grouped: external, internal, types)
import { Anthropic } from '@anthropic-ai/sdk';
import { Logger } from '../utils/logger.js';
import type { TaskRequest, TaskResult } from '../types/index.js';

// 2. Type definitions and interfaces
interface Config { }

// 3. Constants
const DEFAULT_TIMEOUT = 30000;

// 4. Class implementation
export class MyClass {
  // 4a. Properties
  private logger: Logger;

  // 4b. Constructor
  constructor(config: Config) { }

  // 4c. Public methods
  public async execute(): Promise<void> { }

  // 4d. Private methods
  private validate(): void { }
}

// 5. Exports
export type { Config };
```

### Error Handling

```typescript
// Use custom JarvisError for domain errors
throw new JarvisError(
  ErrorCode.VALIDATION_ERROR,
  'Invalid task data',
  { taskId: '123', field: 'priority' },
  true // recoverable
);

// Always include context in catch blocks
try {
  await riskyOperation();
} catch (error) {
  this.logger.error('Operation failed', error, { taskId, agentId });
  throw new JarvisError(
    ErrorCode.TASK_EXECUTION_ERROR,
    'Failed to execute task',
    { originalError: error, taskId },
    false
  );
}
```

### Async/Await Patterns

```typescript
// Always use async/await, never raw promises
async function good(): Promise<Result> {
  const data = await fetchData();
  return processData(data);
}

// Handle multiple concurrent operations
async function parallel(): Promise<void> {
  const [users, tasks, analytics] = await Promise.all([
    fetchUsers(),
    fetchTasks(),
    fetchAnalytics(),
  ]);
}

// Use Promise.allSettled for independent operations that can fail
async function resilient(): Promise<void> {
  const results = await Promise.allSettled([
    operation1(),
    operation2(),
    operation3(),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      this.logger.warn('Operation failed', result.reason);
    }
  }
}
```

### Logging Standards

```typescript
// Use structured logging with context
this.logger.info('Task started', {
  taskId: task.id,
  taskType: task.type,
  priority: task.priority,
});

// Include execution metrics
this.logger.info('Task completed', {
  taskId: task.id,
  duration: Date.now() - startTime,
  success: true,
});

// Log errors with full context
this.logger.error('Task failed', error, {
  taskId: task.id,
  attemptNumber: retries,
  canRetry: this.errorHandler.isRecoverable(error),
});
```

---

## Security Guidelines

### API Key Management

1. **Never commit secrets**: All API keys must be in environment variables
2. **Validate on startup**: Check all required env vars exist before starting
3. **Rotate regularly**: Implement key rotation every 90 days
4. **Least privilege**: Use role-specific keys (not admin keys) where possible
5. **Audit access**: Log all API key usage for security monitoring

### Data Protection

1. **Encrypt sensitive data**: Use encryption for PII in database
2. **Sanitize inputs**: Validate and sanitize all user inputs
3. **Rate limiting**: Implement rate limits on all external API calls
4. **Audit trails**: Log all data access and modifications
5. **Data retention**: Implement automatic pruning of old data

### Authentication & Authorization

```typescript
// Validate all approval requests
async function validateApprovalRequest(request: ApprovalRequest): Promise<void> {
  // Check request authenticity
  if (!this.isValidSignature(request)) {
    throw new JarvisError(ErrorCode.AUTHENTICATION_ERROR, 'Invalid signature');
  }

  // Check authorization
  if (!this.canApprove(request.respondedBy)) {
    throw new JarvisError(ErrorCode.AUTHENTICATION_ERROR, 'Unauthorized');
  }
}
```

### External API Security

1. **Timeout all requests**: Maximum 30 seconds per API call
2. **Retry with backoff**: Exponential backoff for transient failures
3. **Validate responses**: Never trust external data without validation
4. **Rate limit handling**: Respect API rate limits and implement queuing
5. **Error isolation**: Don't expose internal errors to external systems

---

## Testing Strategy

### Unit Tests

- **Coverage Target**: >85% for all modules
- **Test Isolation**: Mock all external dependencies
- **Test Structure**: Arrange-Act-Assert pattern
- **File Location**: `tests/unit/[module]/[component].test.ts`

```typescript
describe('MarketingAgent', () => {
  it('should create social post', async () => {
    // Arrange
    const mockBuffer = { createPost: vi.fn().mockResolvedValue({ id: '123' }) };
    const agent = new MarketingAgent({ integrations: { buffer: mockBuffer } });

    // Act
    const result = await agent.createSocialPost({ platform: 'twitter' });

    // Assert
    expect(result.postId).toBe('123');
    expect(mockBuffer.createPost).toHaveBeenCalledOnce();
  });
});
```

### Integration Tests

- **Coverage Target**: All major workflows end-to-end
- **Test Environment**: Use test database and mock external APIs
- **File Location**: `tests/integration/[workflow].test.ts`

### Test Data Management

- Store test fixtures in `tests/fixtures/`
- Use factory functions for test data generation
- Never use production data in tests

---

## Performance Requirements

### Response Time Targets

- **Critical Priority**: <30 seconds
- **High Priority**: <5 minutes
- **Medium Priority**: <1 hour
- **Low Priority**: <24 hours

### Resource Limits

- **Memory**: <512MB per instance
- **CPU**: <50% average utilization
- **Database**: <100 concurrent connections
- **API Calls**: Respect all rate limits with 20% buffer

### Optimization Guidelines

1. **Lazy Loading**: Only load data when needed
2. **Caching**: Cache frequently accessed data (with TTL)
3. **Batch Operations**: Batch database operations where possible
4. **Connection Pooling**: Reuse database connections
5. **Async Operations**: Never block on I/O operations

---

## Deployment & Operations

### Environment Configuration

- **Development**: Local with mocked integrations
- **Staging**: Full integration with test accounts
- **Production**: Live integrations with monitoring

### Monitoring

1. **Logs**: Structured JSON logs to Supabase
2. **Metrics**: Task completion rate, execution time, error rate
3. **Alerts**: Discord webhooks for critical errors
4. **Health Checks**: `/health` endpoint for uptime monitoring

### Rollback Procedures

1. Keep previous version deployed
2. Database migrations must be backwards compatible
3. Feature flags for new functionality
4. Automated rollback on critical error spike

---

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `fix/*`: Bug fixes
- `prompt/*`: Parallel prompt development branches

### Commit Convention

```
type(scope): subject

body

footer
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(marketing): add LinkedIn post scheduling

Implement LinkedIn-specific post formatting and scheduling
through Buffer API with character limit validation.

Closes #42
```

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Ensure all tests pass
4. Update documentation
5. Create PR with description and test results
6. Code review required
7. Merge to `develop`

---

## Future Considerations

### Scalability

- Implement job queue (Bull/BullMQ) for task distribution
- Horizontal scaling with multiple orchestrator instances
- Database read replicas for analytics queries
- CDN for static assets

### Advanced Features

- Voice/chat interface for approvals
- Mobile app for on-the-go management
- Multi-tenant support for multiple businesses
- Marketplace for third-party agent extensions
- Advanced analytics and predictive modeling

---

**This document should be updated as the project evolves. All developers should read this before contributing to Jarvis.**
