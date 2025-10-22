/**
 * Tests for n8n Workflow Integration
 *
 * @module integrations/n8n.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { N8nAdapter, N8nError, type WorkflowExecution, type Workflow } from './n8n';
import type { AxiosInstance } from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
  },
}));

describe('N8nAdapter', () => {
  let adapter: N8nAdapter;
  let mockClient: Partial<AxiosInstance>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock axios client
    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      } as any,
    };

    // Mock axios.create to return our mock client
    const axios = require('axios');
    axios.default.create = vi.fn().mockReturnValue(mockClient);

    // Create adapter instance
    adapter = new N8nAdapter({
      apiUrl: 'https://n8n.example.com',
      apiKey: 'test-api-key',
    });
  });

  // ============================================================================
  // WORKFLOW TRIGGERING TESTS
  // ============================================================================

  describe('triggerWorkflow', () => {
    it('should successfully trigger a workflow', async () => {
      const mockResponse = {
        status: 200,
        data: {
          executionId: 'exec-123',
          message: 'Workflow triggered',
        },
      };

      (mockClient.post as any).mockResolvedValue(mockResponse);

      const result = await adapter.triggerWorkflow('workflow-1', {
        input: 'test data',
      });

      expect(result).toMatchObject({
        id: 'exec-123',
        workflowId: 'workflow-1',
        status: 'running',
        data: mockResponse.data,
      });
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(mockClient.post).toHaveBeenCalledWith('/webhook/workflow-1', {
        input: 'test data',
      });
    });

    it('should generate execution ID if not provided', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'Success' },
      };

      (mockClient.post as any).mockResolvedValue(mockResponse);

      const result = await adapter.triggerWorkflow('workflow-1', {});

      expect(result.id).toMatch(/^exec_\d+_/);
      expect(result.status).toBe('running');
    });

    it('should throw N8nError on 4xx response', async () => {
      const mockResponse = {
        status: 400,
        statusText: 'Bad Request',
        data: { error: 'Invalid data' },
      };

      (mockClient.post as any).mockResolvedValue(mockResponse);

      await expect(
        adapter.triggerWorkflow('workflow-1', {})
      ).rejects.toThrow(N8nError);
    });

    it('should throw N8nError on network failure', async () => {
      (mockClient.post as any).mockRejectedValue(new Error('Network error'));

      await expect(
        adapter.triggerWorkflow('workflow-1', {})
      ).rejects.toThrow(N8nError);
    });

    it('should retry on transient failures', async () => {
      (mockClient.post as any)
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          status: 200,
          data: { executionId: 'exec-123' },
        });

      const result = await adapter.triggerWorkflow('workflow-1', {});

      expect(result.id).toBe('exec-123');
      expect(mockClient.post).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // EXECUTION STATUS TESTS
  // ============================================================================

  describe('getExecutionStatus', () => {
    it('should get status for running execution', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: 'exec-123',
            workflowId: 'workflow-1',
            finished: false,
            startedAt: '2025-10-15T12:00:00Z',
            data: {},
          },
        },
      };

      (mockClient.get as any).mockResolvedValue(mockResponse);

      const result = await adapter.getExecutionStatus('exec-123');

      expect(result).toMatchObject({
        id: 'exec-123',
        workflowId: 'workflow-1',
        status: 'running',
      });
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.finishedAt).toBeUndefined();
    });

    it('should get status for successful execution', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: 'exec-123',
            workflowId: 'workflow-1',
            finished: true,
            startedAt: '2025-10-15T12:00:00Z',
            stoppedAt: '2025-10-15T12:05:00Z',
            data: { result: 'success' },
          },
        },
      };

      (mockClient.get as any).mockResolvedValue(mockResponse);

      const result = await adapter.getExecutionStatus('exec-123');

      expect(result.status).toBe('success');
      expect(result.finishedAt).toBeInstanceOf(Date);
    });

    it('should get status for failed execution', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            id: 'exec-123',
            workflowId: 'workflow-1',
            finished: true,
            status: 'error',
            startedAt: '2025-10-15T12:00:00Z',
            stoppedAt: '2025-10-15T12:05:00Z',
            data: {
              resultData: {
                error: { message: 'Workflow failed' },
              },
            },
          },
        },
      };

      (mockClient.get as any).mockResolvedValue(mockResponse);

      const result = await adapter.getExecutionStatus('exec-123');

      expect(result.status).toBe('error');
      expect(result.error).toBe('Workflow failed');
    });

    it('should throw N8nError for not found execution', async () => {
      const mockResponse = {
        status: 404,
        statusText: 'Not Found',
      };

      (mockClient.get as any).mockResolvedValue(mockResponse);

      await expect(
        adapter.getExecutionStatus('exec-999')
      ).rejects.toThrow(N8nError);

      try {
        await adapter.getExecutionStatus('exec-999');
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND');
        expect(error.recoverable).toBe(false);
      }
    });
  });

  // ============================================================================
  // WORKFLOW LISTING TESTS
  // ============================================================================

  describe('listWorkflows', () => {
    it('should list all workflows', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: [
            {
              id: 'wf-1',
              name: 'Social Media Posting',
              active: true,
              tags: ['social', 'marketing'],
              createdAt: '2025-10-01T00:00:00Z',
            },
            {
              id: 'wf-2',
              name: 'Email Campaign',
              active: false,
              tags: ['email'],
            },
          ],
        },
      };

      (mockClient.get as any).mockResolvedValue(mockResponse);

      const result = await adapter.listWorkflows();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'wf-1',
        name: 'Social Media Posting',
        active: true,
        tags: ['social', 'marketing'],
      });
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('should handle empty workflow list', async () => {
      const mockResponse = {
        status: 200,
        data: { data: [] },
      };

      (mockClient.get as any).mockResolvedValue(mockResponse);

      const result = await adapter.listWorkflows();

      expect(result).toEqual([]);
    });

    it('should throw N8nError on failure', async () => {
      (mockClient.get as any).mockRejectedValue(new Error('API error'));

      await expect(adapter.listWorkflows()).rejects.toThrow(N8nError);
    });
  });

  // ============================================================================
  // WEBHOOK TESTS
  // ============================================================================

  describe('createWebhook', () => {
    it('should create webhook URL', async () => {
      const result = await adapter.createWebhook('workflow-1', 'my-webhook');

      expect(result).toMatchObject({
        url: 'https://n8n.example.com/webhook/my-webhook',
        webhookId: 'webhook_workflow-1_my-webhook',
        method: 'POST',
      });
    });

    it('should handle leading slash in path', async () => {
      const result = await adapter.createWebhook('workflow-1', '/my-webhook');

      expect(result.url).toBe('https://n8n.example.com/webhook/my-webhook');
    });

    it('should handle paths with multiple segments', async () => {
      const result = await adapter.createWebhook('workflow-1', 'api/v1/webhook');

      expect(result.url).toBe('https://n8n.example.com/webhook/api/v1/webhook');
      expect(result.webhookId).toBe('webhook_workflow-1_api_v1_webhook');
    });
  });

  // ============================================================================
  // WAIT FOR COMPLETION TESTS
  // ============================================================================

  describe('waitForCompletion', () => {
    it('should wait for successful completion', async () => {
      // First call: running
      // Second call: success
      (mockClient.get as any)
        .mockResolvedValueOnce({
          status: 200,
          data: {
            data: {
              id: 'exec-123',
              workflowId: 'workflow-1',
              finished: false,
              startedAt: '2025-10-15T12:00:00Z',
            },
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            data: {
              id: 'exec-123',
              workflowId: 'workflow-1',
              finished: true,
              startedAt: '2025-10-15T12:00:00Z',
              stoppedAt: '2025-10-15T12:01:00Z',
              data: { result: 'success' },
            },
          },
        });

      const result = await adapter.waitForCompletion(
        'exec-123',
        10000, // 10 second timeout
        100 // 100ms poll interval
      );

      expect(result.status).toBe('success');
      expect(mockClient.get).toHaveBeenCalledTimes(2);
    });

    it('should return immediately if already completed', async () => {
      (mockClient.get as any).mockResolvedValue({
        status: 200,
        data: {
          data: {
            id: 'exec-123',
            workflowId: 'workflow-1',
            finished: true,
            startedAt: '2025-10-15T12:00:00Z',
            stoppedAt: '2025-10-15T12:01:00Z',
          },
        },
      });

      const result = await adapter.waitForCompletion('exec-123', 5000, 100);

      expect(result.status).toBe('success');
      expect(mockClient.get).toHaveBeenCalledTimes(1);
    });

    it('should throw N8nError on timeout', async () => {
      // Always return running status
      (mockClient.get as any).mockResolvedValue({
        status: 200,
        data: {
          data: {
            id: 'exec-123',
            workflowId: 'workflow-1',
            finished: false,
            startedAt: '2025-10-15T12:00:00Z',
          },
        },
      });

      await expect(
        adapter.waitForCompletion(
          'exec-123',
          500, // 500ms timeout
          100 // 100ms poll interval
        )
      ).rejects.toThrow(N8nError);

      try {
        await adapter.waitForCompletion('exec-123', 500, 100);
      } catch (error: any) {
        expect(error.code).toBe('EXECUTION_TIMEOUT');
        expect(error.recoverable).toBe(false);
      }
    });

    it('should continue waiting if execution not found initially', async () => {
      // First call: not found (execution not created yet)
      // Second call: running
      // Third call: success
      (mockClient.get as any)
        .mockResolvedValueOnce({ status: 404 })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            data: {
              id: 'exec-123',
              workflowId: 'workflow-1',
              finished: false,
              startedAt: '2025-10-15T12:00:00Z',
            },
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            data: {
              id: 'exec-123',
              workflowId: 'workflow-1',
              finished: true,
              startedAt: '2025-10-15T12:00:00Z',
              stoppedAt: '2025-10-15T12:01:00Z',
            },
          },
        });

      const result = await adapter.waitForCompletion('exec-123', 10000, 100);

      expect(result.status).toBe('success');
      expect(mockClient.get).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // EXECUTE WORKFLOW TESTS
  // ============================================================================

  describe('executeWorkflow', () => {
    it('should trigger and wait for workflow completion', async () => {
      // Mock trigger
      (mockClient.post as any).mockResolvedValue({
        status: 200,
        data: { executionId: 'exec-123' },
      });

      // Mock status checks
      (mockClient.get as any)
        .mockResolvedValueOnce({
          status: 200,
          data: {
            data: {
              id: 'exec-123',
              workflowId: 'workflow-1',
              finished: false,
              startedAt: '2025-10-15T12:00:00Z',
            },
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            data: {
              id: 'exec-123',
              workflowId: 'workflow-1',
              finished: true,
              startedAt: '2025-10-15T12:00:00Z',
              stoppedAt: '2025-10-15T12:01:00Z',
            },
          },
        });

      const result = await adapter.executeWorkflow('workflow-1', { test: true });

      expect(result.status).toBe('success');
      expect(mockClient.post).toHaveBeenCalledTimes(1);
      expect(mockClient.get).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // HEALTH CHECK TESTS
  // ============================================================================

  describe('healthCheck', () => {
    it('should return true when n8n is healthy', async () => {
      (mockClient.get as any).mockResolvedValue({ status: 200 });

      const result = await adapter.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when n8n is unreachable', async () => {
      (mockClient.get as any).mockRejectedValue(new Error('Connection refused'));

      const result = await adapter.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false on non-200 status', async () => {
      (mockClient.get as any).mockResolvedValue({ status: 500 });

      const result = await adapter.healthCheck();

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('error handling', () => {
    it('should not retry non-recoverable errors', async () => {
      const error = new N8nError('Bad request', 'VALIDATION_ERROR', {}, false);
      (mockClient.post as any).mockRejectedValue(error);

      await expect(
        adapter.triggerWorkflow('workflow-1', {})
      ).rejects.toThrow(N8nError);

      // Should only try once (no retries)
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      (mockClient.get as any).mockRejectedValue(new Error('Timeout'));

      await expect(adapter.listWorkflows()).rejects.toThrow(N8nError);

      // Should try 3 times (initial + 2 retries)
      expect(mockClient.get).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // CONSTRUCTOR TESTS
  // ============================================================================

  describe('constructor', () => {
    it('should create adapter with custom timeout', () => {
      const customAdapter = new N8nAdapter({
        apiUrl: 'https://n8n.example.com',
        apiKey: 'test-key',
        timeout: 60000,
      });

      expect(customAdapter).toBeDefined();
    });

    it('should handle trailing slash in apiUrl', () => {
      const customAdapter = new N8nAdapter({
        apiUrl: 'https://n8n.example.com/',
        apiKey: 'test-key',
      });

      expect(customAdapter).toBeDefined();
    });
  });
});
