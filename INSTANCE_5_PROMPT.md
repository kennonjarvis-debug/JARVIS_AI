# Instance 5: n8n Workflow Integration (Prompt 9)

**Assigned Component:** n8n Workflow Automation Integration
**Estimated Time:** 3 hours
**Dependencies:** ✅ Logger (P2), ✅ Error Handler (P3), ✅ Types (P5)
**Priority:** MEDIUM - Optional but powerful for complex workflows

---

## Your Task

Build the n8n adapter for workflow automation. This integration allows Jarvis to trigger complex multi-step workflows managed in n8n.

---

## Context

**Prompt 9: n8n Integration** - Workflow automation for complex tasks

**Already complete:** Logger, Error handler, Types, Supabase

**You're building:** n8n API client for workflow triggering and monitoring

---

## API Contract

See `JARVIS_DESIGN_AND_PROMPTS.md` section **"11. Integrations: n8n Workflow Adapter"**

```typescript
export interface N8nConfig {
  apiUrl: string;
  apiKey: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  data?: any;
  startedAt: Date;
  finishedAt?: Date;
}

export class N8nAdapter {
  constructor(config: N8nConfig);
  async triggerWorkflow(workflowId: string, data: Record<string, any>): Promise<WorkflowExecution>;
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution>;
  async listWorkflows(): Promise<Array<{ id: string; name: string; active: boolean }>>;
  async createWebhook(workflowId: string, path: string): Promise<{ url: string; webhookId: string }>;
}
```

---

## Implementation

### 1. Create `src/integrations/n8n.ts`

**Key features:**
- Trigger workflows via webhook or API
- Monitor execution status
- List available workflows
- Create webhooks for event-driven triggers
- Handle async workflows

**n8n API endpoints:**
```
POST /webhook/:path - Trigger workflow via webhook
GET /executions/:id - Get execution status
GET /workflows - List workflows
POST /webhooks - Create webhook
```

**Implementation:**
```typescript
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';

export interface N8nConfig {
  apiUrl: string;
  apiKey: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  data?: any;
  startedAt: Date;
  finishedAt?: Date;
}

export class N8nAdapter {
  private client: AxiosInstance;
  private logger: Logger;
  private apiUrl: string;

  constructor(config: N8nConfig) {
    this.apiUrl = config.apiUrl;
    this.logger = new Logger('N8nAdapter');

    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // Workflows can take time
    });
  }

  public async triggerWorkflow(
    workflowId: string,
    data: Record<string, any>
  ): Promise<WorkflowExecution> {
    try {
      this.logger.info('Triggering n8n workflow', { workflowId });

      const response = await this.client.post(
        `/webhook/${workflowId}`,
        data
      );

      const execution: WorkflowExecution = {
        id: response.data.executionId || `exec_${Date.now()}`,
        workflowId,
        status: 'running',
        data: response.data,
        startedAt: new Date()
      };

      this.logger.info('Workflow triggered', {
        executionId: execution.id,
        workflowId
      });

      return execution;
    } catch (error: any) {
      this.logger.error('Failed to trigger workflow', error);

      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to trigger n8n workflow',
        { workflowId, error: error.message },
        true
      );
    }
  }

  public async getExecutionStatus(executionId: string): Promise<WorkflowExecution> {
    try {
      const response = await this.client.get(`/executions/${executionId}`);

      return {
        id: response.data.id,
        workflowId: response.data.workflowId,
        status: this.mapStatus(response.data.finished, response.data.stoppedAt),
        data: response.data.data,
        startedAt: new Date(response.data.startedAt),
        finishedAt: response.data.stoppedAt ? new Date(response.data.stoppedAt) : undefined
      };
    } catch (error: any) {
      this.logger.error('Failed to get execution status', error);

      if (error.response?.status === 404) {
        throw new JarvisError(
          ErrorCode.NOT_FOUND,
          'Execution not found',
          { executionId },
          false
        );
      }

      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to get n8n execution status',
        { executionId, error: error.message },
        true
      );
    }
  }

  public async listWorkflows(): Promise<Array<{ id: string; name: string; active: boolean }>> {
    try {
      const response = await this.client.get('/workflows');

      return response.data.data.map((wf: any) => ({
        id: wf.id,
        name: wf.name,
        active: wf.active
      }));
    } catch (error: any) {
      this.logger.error('Failed to list workflows', error);

      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to list n8n workflows',
        { error: error.message },
        true
      );
    }
  }

  public async createWebhook(
    workflowId: string,
    path: string
  ): Promise<{ url: string; webhookId: string }> {
    try {
      // n8n webhooks are created within workflow definitions
      // This method constructs the webhook URL
      const webhookUrl = `${this.apiUrl}/webhook/${path}`;
      const webhookId = `webhook_${workflowId}_${path}`;

      this.logger.info('Webhook created', { workflowId, path, webhookUrl });

      return {
        url: webhookUrl,
        webhookId
      };
    } catch (error: any) {
      this.logger.error('Failed to create webhook', error);

      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to create n8n webhook',
        { workflowId, path, error: error.message },
        true
      );
    }
  }

  private mapStatus(finished: boolean, stoppedAt: string | null): 'running' | 'success' | 'error' {
    if (!finished) {
      return 'running';
    }

    // If finished but stoppedAt has error indicator
    return 'success';
  }

  /**
   * Wait for workflow execution to complete
   * Polls execution status until finished
   */
  public async waitForCompletion(
    executionId: string,
    timeoutMs: number = 300000, // 5 minutes
    pollIntervalMs: number = 2000 // 2 seconds
  ): Promise<WorkflowExecution> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const execution = await this.getExecutionStatus(executionId);

      if (execution.status !== 'running') {
        return execution;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new JarvisError(
      ErrorCode.TASK_EXECUTION_ERROR,
      'Workflow execution timeout',
      { executionId, timeoutMs },
      false
    );
  }
}
```

### 2. Create `src/integrations/n8n.test.ts`

**Test cases (minimum 12):**
- [ ] Trigger workflow successfully
- [ ] Get execution status (running)
- [ ] Get execution status (success)
- [ ] Get execution status (error)
- [ ] List workflows
- [ ] Create webhook URL
- [ ] Wait for completion (success)
- [ ] Wait for completion (timeout)
- [ ] Handle workflow not found
- [ ] Handle execution not found
- [ ] Handle API errors
- [ ] Retry transient failures

### 3. Create `docs/n8n-workflows.md`

**Document pre-built workflows:**

1. **social-media-posting** - Multi-platform post distribution
2. **email-campaign-sender** - Bulk email with tracking
3. **lead-enrichment** - Enrich leads from multiple sources
4. **crm-sync** - Sync HubSpot ↔ Supabase
5. **support-ticket-routing** - Intelligent ticket routing
6. **analytics-aggregation** - Aggregate metrics
7. **backup-automation** - Automated backups

**Include:**
- Workflow JSON exports
- Setup instructions
- Configuration parameters
- Integration points

### 4. Create `config/n8n-workflows/` directory

Create workflow definition files:
- `social-media-posting.json`
- `email-campaign-sender.json`
- `lead-enrichment.json`
- etc.

---

## Acceptance Criteria

- [ ] Workflow triggering works
- [ ] Execution monitoring works
- [ ] Workflow listing functional
- [ ] Webhook creation works
- [ ] Async execution handling
- [ ] Timeout handling
- [ ] Error handling with JarvisError
- [ ] Test coverage >80% (12+ tests)
- [ ] 7 workflow definitions documented
- [ ] Setup guide complete

---

## Environment Variables

```bash
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your_api_key_here
```

---

## n8n Setup (Local Development)

```bash
# Install n8n
npm install -g n8n

# Start n8n
n8n start

# Access UI
open http://localhost:5678

# Get API key from Settings > API Keys
```

---

## Integration Points

Used by:
- **Operations Agent (P15)** - Complex automation workflows
- **All Agents** - When multi-step workflows needed

---

## Resources

- n8n Docs: https://docs.n8n.io/
- n8n API: https://docs.n8n.io/api/
- Workflow Examples: https://n8n.io/workflows

---

## Completion

Create `PROMPT_9_COMPLETION.md` with:
- ✅ All methods implemented
- ✅ Workflow definitions documented
- ✅ Tests passing
- ✅ Ready for Operations Agent

---

**BUILD THE AUTOMATION LAYER!** 🤖

n8n is optional but powerful - it enables complex multi-step workflows. Keep the interface simple and focused on triggering and monitoring.
