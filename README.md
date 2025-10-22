# Jarvis - Autonomous AI Agent for DAWG AI

**An autonomous business operations AI agent that handles marketing, sales, operations, and customer service with minimal human intervention.**

---

## Overview

Jarvis is a multi-agent autonomous system built to operate DAWG AI's business functions 24/7, asking for human approval only on high-risk decisions. Built with Claude Code, LangGraph patterns, and integrated with free/low-cost tools, Jarvis achieves enterprise-grade automation on a startup budget.

### Key Capabilities

- **Marketing Automation**: Social media posting, content creation, email campaigns
- **Sales Operations**: Lead qualification, outreach sequences, CRM management
- **Customer Support**: Ticket routing, automated responses, knowledge base management
- **Operations**: Data synchronization, system monitoring, analytics reporting

### Decision Framework

Jarvis operates autonomously within defined risk boundaries:
- **Low Risk**: Auto-execute (e.g., scheduled social posts, data syncs)
- **Medium Risk**: Execute with notification (e.g., content publication, lead scoring)
- **High Risk**: Require approval (e.g., bulk emails >1000 recipients, refunds >$50)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator (Core)                       │
│  - Event routing                                             │
│  - Agent coordination                                        │
│  - Decision engine integration                               │
└───────────────┬─────────────────────────────────────────────┘
                │
        ┌───────┴───────┬───────────┬──────────┬──────────┐
        │               │           │          │          │
   ┌────▼────┐    ┌────▼────┐ ┌───▼────┐ ┌──▼─────┐ ┌──▼──────┐
   │Marketing│    │ Sales   │ │Operations│ │Support│ │Decision │
   │ Agent   │    │ Agent   │ │  Agent  │ │ Agent │ │ Engine  │
   └────┬────┘    └────┬────┘ └───┬────┘ └──┬─────┘ └──┬──────┘
        │              │           │          │          │
   ┌────▼──────────────▼───────────▼──────────▼──────────▼─────┐
   │              Integration Layer                              │
   │  Supabase | n8n | Buffer | HubSpot | Email | Discord       │
   └─────────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Language**: TypeScript (Node.js)
- **LLM**: Claude Sonnet 4.5 (Anthropic)
- **Database**: Supabase (PostgreSQL)
- **Workflows**: n8n
- **Integrations**: Buffer, HubSpot CRM, SendGrid
- **Testing**: Vitest

### Cost Breakdown

- Claude API: ~$10-30/month (depending on usage)
- Supabase: Free tier
- n8n: Free tier
- Buffer: Free tier (3 social accounts)
- HubSpot CRM: Free tier
- SendGrid: Free tier (100 emails/day)
- **Total**: $10-30/month

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- API keys for: Anthropic, Supabase, Buffer, HubSpot, SendGrid

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Jarvis-v0

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Initialize database
npm run db:migrate

# Run tests
npm test

# Start development server
npm run dev
```

### First Task Execution

```typescript
import { Orchestrator } from './src/core/orchestrator';

// Initialize (see src/index.ts for full setup)
const orchestrator = new Orchestrator(config);
await orchestrator.initialize();

// Submit a task
const taskId = await orchestrator.submitTask({
  id: crypto.randomUUID(),
  type: TaskType.MARKETING_SOCIAL_POST,
  priority: Priority.MEDIUM,
  data: {
    platform: 'twitter',
    topic: 'New MIDI import feature',
  },
  requestedBy: 'admin',
  timestamp: new Date(),
});

// Check status
const result = await orchestrator.getTaskStatus(taskId);
console.log(result);
```

---

## Documentation

### For Development

- **[Design & Prompts](./JARVIS_DESIGN_AND_PROMPTS.md)**: Complete system design with API contracts and development prompts
- **[Parallel Execution Guide](./PARALLEL_EXECUTION_GUIDE.md)**: How to build Jarvis with multiple Claude Code instances in parallel
- **[API Quick Reference](./API_QUICK_REFERENCE.md)**: Fast lookup for interfaces and method signatures

### For Operations

- **[Decision Framework](./docs/decision-framework.md)**: Risk tiers and approval rules (created during development)
- **[Agent Documentation](./docs/agents-overview.md)**: Capabilities and usage for each agent
- **[Integration Setup](./docs/)**: Setup guides for each integration (Buffer, HubSpot, etc.)

---

## Development Workflow

### Building with Parallel Claude Code Instances

This project is designed to be built in parallel using multiple Claude Code instances. See [PARALLEL_EXECUTION_GUIDE.md](./PARALLEL_EXECUTION_GUIDE.md) for detailed instructions.

**Quick overview:**

1. **Wave 1** (4-6 hours): Foundation components (5 prompts in parallel)
   - Project structure, Logger, Error handler, Supabase, Types

2. **Wave 2** (8-12 hours): Integrations and core systems (6 prompts in parallel)
   - Buffer, HubSpot, Email, n8n, Memory, Approval queue

3. **Wave 3** (12-16 hours): Agents and orchestration (4 prompts, mostly sequential)
   - Decision engine, Marketing agent, Sales/Support agents, Orchestrator

**Total time**: 10-15 hours with 5 parallel instances, or 30-40 hours sequentially.

### Project Structure

```
Jarvis-v0/
├── src/
│   ├── core/                    # Core systems
│   │   ├── orchestrator.ts      # Central coordinator
│   │   ├── decision-engine.ts   # Decision making
│   │   ├── memory.ts            # Context retention
│   │   └── approval-queue.ts    # Human-in-loop
│   ├── agents/                  # Specialized agents
│   │   ├── base-agent.ts
│   │   ├── marketing-agent.ts
│   │   ├── sales-agent.ts
│   │   ├── support-agent.ts
│   │   └── operations-agent.ts
│   ├── integrations/            # External services
│   │   ├── supabase.ts
│   │   ├── buffer.ts
│   │   ├── hubspot.ts
│   │   ├── email.ts
│   │   └── n8n.ts
│   ├── utils/                   # Utilities
│   │   ├── logger.ts
│   │   └── error-handler.ts
│   ├── types/                   # Type definitions
│   └── index.ts                 # Main entry point
├── config/                      # Configuration files
│   ├── decision-rules.json
│   ├── supabase-schema.sql
│   └── n8n-workflows/
├── tests/                       # Tests
│   ├── unit/
│   └── integration/
├── docs/                        # Documentation
└── migrations/                  # Database migrations
```

---

## Usage Examples

### Marketing Agent

```typescript
const marketingAgent = new MarketingAgent(config);

// Create and schedule social media post
const post = await marketingAgent.createSocialPost({
  platform: 'twitter',
  topic: 'New feature release: MIDI import',
  targetAudience: 'music producers',
  scheduledTime: new Date('2025-10-16T14:00:00Z'),
});

// Generate blog content
const content = await marketingAgent.createContent({
  type: 'blog',
  topic: 'Getting started with DAWG AI',
  targetKeywords: ['browser DAW', 'online music production'],
  tone: 'casual',
});

// Send email campaign
const campaign = await marketingAgent.createEmailCampaign({
  campaignType: 'engagement',
  segment: 'active_users',
  subject: 'New features you'll love',
});
```

### Sales Agent

```typescript
const salesAgent = new SalesAgent(config);

// Qualify incoming lead
const score = await salesAgent.qualifyLead({
  leadId: 'lead-123',
  source: 'website-signup',
});

if (score.category === 'hot') {
  // Send personalized outreach
  await salesAgent.sendOutreach({
    leadId: 'lead-123',
    channel: 'email',
  });

  // Schedule follow-ups
  await salesAgent.scheduleFollowUp('lead-123', 3 * 24 * 60 * 60 * 1000); // 3 days
}
```

### Support Agent

```typescript
const supportAgent = new SupportAgent(config);

// Route incoming ticket
const routing = await supportAgent.routeTicket(ticket);

if (routing.assignTo === 'auto') {
  // Generate and send automated response
  const response = await supportAgent.respondToTicket(ticket.id);

  if (response.resolved) {
    console.log('Ticket resolved automatically');
  } else {
    console.log('Ticket requires follow-up');
  }
}
```

### Operations Agent

```typescript
const opsAgent = new OperationsAgent(config);

// Sync data between systems
await opsAgent.syncData({
  source: 'hubspot',
  destination: 'supabase',
  dataType: 'contacts',
});

// Check system health
const health = await opsAgent.checkSystemHealth();
if (health.status !== 'healthy') {
  // Handle alerts
  for (const alert of health.alerts) {
    await opsAgent.handleAlert(alert);
  }
}

// Generate analytics report
const analytics = await opsAgent.generateAnalytics('week');
```

---

## Configuration

### Decision Rules

Edit `config/decision-rules.json` to customize autonomous operation boundaries:

```json
{
  "thresholds": {
    "autoApproveMaxSpend": 100,      // Auto-approve tasks under $100
    "bulkEmailMinRecipients": 1000,  // Require approval for >1000 recipients
    "autoRefundMax": 50,              // Auto-approve refunds under $50
    "discountMax": 10                 // Auto-approve discounts up to 10%
  }
}
```

### Agent Capabilities

Each agent can be configured with specific capabilities:

```typescript
const marketingAgent = new MarketingAgent({
  id: 'marketing-agent',
  name: 'Marketing Agent',
  capabilities: [
    {
      taskType: TaskType.MARKETING_SOCIAL_POST,
      description: 'Create and schedule social media posts',
      estimatedDuration: 30000, // 30 seconds
      requiredIntegrations: ['buffer', 'anthropic'],
    },
    // ... more capabilities
  ],
  integrations: {
    buffer: bufferAdapter,
    email: emailAdapter,
  },
  llmClient: anthropicClient,
  decisionEngine,
  memory,
});
```

---

## Testing

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure

- **Unit tests**: Test individual components in isolation
- **Integration tests**: Test complete workflows end-to-end
- **Mocking**: External APIs are mocked for consistent testing

Example test:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MarketingAgent } from '../src/agents/marketing-agent';

describe('MarketingAgent', () => {
  it('should create social post', async () => {
    const mockBuffer = {
      createPost: vi.fn().mockResolvedValue({
        id: 'post-123',
        profileIds: ['twitter'],
        scheduledAt: new Date(),
      }),
    };

    const agent = new MarketingAgent({
      ...mockConfig,
      integrations: { buffer: mockBuffer },
    });

    const result = await agent.createSocialPost({
      platform: 'twitter',
      content: 'Test post',
    });

    expect(result.postId).toBe('post-123');
    expect(mockBuffer.createPost).toHaveBeenCalledOnce();
  });
});
```

---

## Deployment

### Local Development

```bash
npm run dev
```

### Production (Railway.app)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set ANTHROPIC_API_KEY=xxx
railway variables set SUPABASE_URL=xxx
# ... set all required variables

# Deploy
railway up
```

### Environment Variables

See [.env.example](./.env.example) for required variables. All API keys must be set before deployment.

---

## Monitoring & Maintenance

### Logging

Logs are structured and written to:
- Console (development)
- File (production): `logs/jarvis-{date}.log`
- Supabase (for analysis)

### Metrics

Track key metrics via Operations Agent:

```typescript
const opsAgent = new OperationsAgent(config);
const analytics = await opsAgent.generateAnalytics('week');

console.log('Tasks completed:', analytics.metrics.tasksCompleted);
console.log('Success rate:', analytics.metrics.successRate);
console.log('Avg execution time:', analytics.metrics.avgExecutionTime);
```

### Approval Queue

Monitor pending approvals:

```typescript
const pending = await approvalQueue.getPending();
console.log(`${pending.length} approvals pending`);

// Respond to approval
await approvalQueue.respond({
  requestId: 'approval-123',
  decision: 'approved',
  respondedBy: 'admin@dawgai.com',
  feedback: 'Looks good',
});
```

---

## Roadmap

### Phase 1: MVP (Weeks 1-4) ✅
- [x] Core infrastructure
- [x] Basic agents (Marketing, Sales, Support, Ops)
- [x] Decision engine
- [x] All integrations

### Phase 2: Learning (Weeks 5-8) 🚧
- [ ] Implement learning from feedback
- [ ] Optimize decision confidence
- [ ] A/B test autonomous decisions
- [ ] Expand knowledge base

### Phase 3: Advanced Automation (Weeks 9-12)
- [ ] Multi-agent coordination
- [ ] Predictive analytics
- [ ] Voice/chat interface
- [ ] Mobile app integration

### Phase 4: Scale (Weeks 13+)
- [ ] Multi-tenant support
- [ ] White-label offering
- [ ] Advanced workflow builder
- [ ] Marketplace for agent extensions

---

## Contributing

### Development Guidelines

1. **Code Style**: Follow TypeScript strict mode, use ESLint
2. **Testing**: Maintain >85% test coverage
3. **Documentation**: Update docs for all new features
4. **Commits**: Use conventional commits (e.g., `feat:`, `fix:`, `docs:`)

### Adding New Agents

1. Extend `BaseAgent` class
2. Implement `execute()` and `validateTask()` methods
3. Register capabilities
4. Add tests
5. Update orchestrator routing

Example:

```typescript
class CustomAgent extends BaseAgent {
  async execute(task: TaskRequest): Promise<TaskResult> {
    // Implementation
  }

  protected async validateTask(task: TaskRequest): Promise<void> {
    // Validation logic
  }
}
```

---

## License

MIT License - see [LICENSE](./LICENSE) file

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: [docs/](./docs/)
- **Email**: support@dawgai.com

---

## Acknowledgments

Built with:
- [Claude Code](https://claude.com/claude-code) by Anthropic
- [Supabase](https://supabase.com)
- [n8n](https://n8n.io)
- [Buffer](https://buffer.com)
- [HubSpot](https://hubspot.com)

Inspired by autonomous agent patterns from LangGraph, AutoGPT, and modern AI agent architectures.

---

**Jarvis is ready to automate your business. Let's build the future of autonomous operations.**
