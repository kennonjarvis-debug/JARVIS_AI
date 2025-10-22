/**
 * n8n Workflow Automation Integration
 *
 * Provides workflow automation capabilities for Jarvis.
 * Allows triggering complex multi-step workflows managed in n8n.
 *
 * @module integrations/n8n
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface N8nConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  data?: any;
  error?: string;
  startedAt: Date;
  finishedAt?: Date;
}

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebhookInfo {
  url: string;
  webhookId: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

// Error class for n8n-specific errors
export class N8nError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'N8nError';
  }
}

// ============================================================================
// N8N ADAPTER
// ============================================================================

export class N8nAdapter {
  private client: AxiosInstance;
  private apiUrl: string;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(config: N8nConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, ''); // Remove trailing slash

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: config.timeout || 30000, // Workflows can take time
      validateStatus: (status) => status < 500, // Don't throw on 4xx
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logError('n8n API request failed', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Trigger a workflow execution
   * @param workflowId - Workflow ID or webhook path
   * @param data - Data to pass to the workflow
   * @returns Execution information
   */
  async triggerWorkflow(
    workflowId: string,
    data: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    return this.withRetry(async () => {
      try {
        this.log('info', 'Triggering n8n workflow', { workflowId });

        // Try webhook endpoint first (most common for production)
        const response = await this.client.post(`/webhook/${workflowId}`, data);

        if (response.status >= 400) {
          throw new N8nError(
            `Failed to trigger workflow: ${response.statusText}`,
            'TRIGGER_FAILED',
            { status: response.status, workflowId },
            response.status < 500
          );
        }

        const execution: WorkflowExecution = {
          id: response.data.executionId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          workflowId,
          status: 'running',
          data: response.data,
          startedAt: new Date(),
        };

        this.log('info', 'Workflow triggered successfully', {
          executionId: execution.id,
          workflowId,
        });

        return execution;
      } catch (error: any) {
        if (error instanceof N8nError) {
          throw error;
        }

        const axiosError = error as AxiosError;
        throw new N8nError(
          'Failed to trigger n8n workflow',
          'INTEGRATION_ERROR',
          {
            workflowId,
            error: axiosError.message,
            status: axiosError.response?.status,
          },
          true
        );
      }
    });
  }

  /**
   * Get the status of a workflow execution
   * @param executionId - Execution ID
   * @returns Execution details with current status
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution> {
    return this.withRetry(async () => {
      try {
        const response = await this.client.get(`/executions/${executionId}`);

        if (response.status === 404) {
          throw new N8nError(
            'Execution not found',
            'NOT_FOUND',
            { executionId },
            false
          );
        }

        if (response.status >= 400) {
          throw new N8nError(
            `Failed to get execution status: ${response.statusText}`,
            'STATUS_FETCH_FAILED',
            { status: response.status, executionId },
            response.status < 500
          );
        }

        const exec = response.data.data || response.data;

        return {
          id: exec.id,
          workflowId: exec.workflowId || exec.workflowData?.id || 'unknown',
          status: this.mapExecutionStatus(exec),
          data: exec.data,
          error: exec.data?.resultData?.error?.message,
          startedAt: new Date(exec.startedAt),
          finishedAt: exec.stoppedAt ? new Date(exec.stoppedAt) : undefined,
        };
      } catch (error: any) {
        if (error instanceof N8nError) {
          throw error;
        }

        const axiosError = error as AxiosError;
        throw new N8nError(
          'Failed to get n8n execution status',
          'INTEGRATION_ERROR',
          {
            executionId,
            error: axiosError.message,
            status: axiosError.response?.status,
          },
          true
        );
      }
    });
  }

  /**
   * List all available workflows
   * @returns Array of workflow information
   */
  async listWorkflows(): Promise<Workflow[]> {
    return this.withRetry(async () => {
      try {
        const response = await this.client.get('/workflows');

        if (response.status >= 400) {
          throw new N8nError(
            `Failed to list workflows: ${response.statusText}`,
            'LIST_FAILED',
            { status: response.status },
            response.status < 500
          );
        }

        const workflows = response.data.data || response.data;

        return workflows.map((wf: any) => ({
          id: wf.id,
          name: wf.name,
          active: wf.active || false,
          tags: wf.tags || [],
          createdAt: wf.createdAt ? new Date(wf.createdAt) : undefined,
          updatedAt: wf.updatedAt ? new Date(wf.updatedAt) : undefined,
        }));
      } catch (error: any) {
        if (error instanceof N8nError) {
          throw error;
        }

        const axiosError = error as AxiosError;
        throw new N8nError(
          'Failed to list n8n workflows',
          'INTEGRATION_ERROR',
          { error: axiosError.message },
          true
        );
      }
    });
  }

  /**
   * Create or get webhook URL for a workflow
   * Note: In n8n, webhooks are typically defined in the workflow itself.
   * This method constructs the webhook URL for external use.
   *
   * @param workflowId - Workflow ID
   * @param path - Webhook path
   * @returns Webhook information
   */
  async createWebhook(
    workflowId: string,
    path: string
  ): Promise<WebhookInfo> {
    try {
      // Normalize path
      const normalizedPath = path.replace(/^\//, '');

      // Construct webhook URL
      const webhookUrl = `${this.apiUrl}/webhook/${normalizedPath}`;
      const webhookId = `webhook_${workflowId}_${normalizedPath.replace(/\//g, '_')}`;

      this.log('info', 'Webhook URL created', {
        workflowId,
        path: normalizedPath,
        webhookUrl,
      });

      return {
        url: webhookUrl,
        webhookId,
        method: 'POST',
      };
    } catch (error: any) {
      throw new N8nError(
        'Failed to create n8n webhook',
        'WEBHOOK_CREATION_FAILED',
        {
          workflowId,
          path,
          error: error.message,
        },
        false
      );
    }
  }

  /**
   * Wait for a workflow execution to complete
   * Polls the execution status until it's no longer running
   *
   * @param executionId - Execution ID to monitor
   * @param timeoutMs - Maximum time to wait (default: 5 minutes)
   * @param pollIntervalMs - Time between status checks (default: 2 seconds)
   * @returns Final execution state
   */
  async waitForCompletion(
    executionId: string,
    timeoutMs: number = 300000, // 5 minutes
    pollIntervalMs: number = 2000 // 2 seconds
  ): Promise<WorkflowExecution> {
    const startTime = Date.now();
    let attempts = 0;

    this.log('info', 'Waiting for workflow completion', {
      executionId,
      timeoutMs,
      pollIntervalMs,
    });

    while (Date.now() - startTime < timeoutMs) {
      attempts++;

      try {
        const execution = await this.getExecutionStatus(executionId);

        if (execution.status !== 'running') {
          this.log('info', 'Workflow completed', {
            executionId,
            status: execution.status,
            attempts,
            duration: Date.now() - startTime,
          });
          return execution;
        }

        // Wait before next poll
        await this.sleep(pollIntervalMs);
      } catch (error) {
        // If execution not found yet, keep waiting
        if (error instanceof N8nError && error.code === 'NOT_FOUND') {
          await this.sleep(pollIntervalMs);
          continue;
        }
        throw error;
      }
    }

    throw new N8nError(
      'Workflow execution timeout',
      'EXECUTION_TIMEOUT',
      {
        executionId,
        timeoutMs,
        attempts,
      },
      false
    );
  }

  /**
   * Trigger a workflow and wait for completion
   * Convenience method combining trigger + wait
   *
   * @param workflowId - Workflow ID
   * @param data - Workflow input data
   * @param timeoutMs - Maximum wait time
   * @returns Completed execution
   */
  async executeWorkflow(
    workflowId: string,
    data: Record<string, any> = {},
    timeoutMs: number = 300000
  ): Promise<WorkflowExecution> {
    const execution = await this.triggerWorkflow(workflowId, data);
    return this.waitForCompletion(execution.id, timeoutMs);
  }

  /**
   * Health check - verify connection to n8n
   * @returns true if n8n is reachable and responding
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/workflows', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Map n8n execution status to our simplified status
   */
  private mapExecutionStatus(execution: any): 'running' | 'success' | 'error' {
    // Check if execution is finished
    if (!execution.finished && !execution.stoppedAt) {
      return 'running';
    }

    // Check for errors
    if (
      execution.data?.resultData?.error ||
      execution.data?.executionData?.error ||
      execution.status === 'error' ||
      execution.status === 'crashed'
    ) {
      return 'error';
    }

    // If finished without errors, it's successful
    if (execution.finished || execution.stoppedAt) {
      return 'success';
    }

    // Default to running if uncertain
    return 'running';
  }

  /**
   * Execute operation with retry logic
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry certain errors
        if (error instanceof N8nError && !error.recoverable) {
          throw error;
        }

        // Don't retry client errors (4xx)
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw new N8nError(
      `Operation failed after ${this.maxRetries} attempts: ${lastError?.message}`,
      'MAX_RETRIES_EXCEEDED',
      { attempts: this.maxRetries, error: lastError?.message },
      false
    );
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    if (error instanceof N8nError) {
      return !error.recoverable;
    }

    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    // Don't retry client errors (400-499)
    if (status && status >= 400 && status < 500) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simple logging utility
   * TODO: Replace with proper Logger once integrated
   */
  private log(level: 'info' | 'error', message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level,
      service: 'N8nAdapter',
      message,
      ...context,
    };

    if (level === 'error') {
      console.error(JSON.stringify(logMessage));
    } else {
      console.log(JSON.stringify(logMessage));
    }
  }

  /**
   * Log errors with details
   */
  private logError(message: string, error: any): void {
    const axiosError = error as AxiosError;
    this.log('error', message, {
      error: error.message,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    });
  }
}
