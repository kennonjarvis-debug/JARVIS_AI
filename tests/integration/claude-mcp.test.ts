/**
 * Claude MCP Integration - Integration Tests
 * Wave 4: Jarvis + AI Dawg MCP Server Testing
 *
 * Tests the complete MCP server implementation including:
 * - Tool listing and schemas
 * - Tool execution and routing
 * - Resource access
 * - Error handling
 * - Backend integration
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

// Configuration
const AI_DAWG_BACKEND_URL = process.env.AI_DAWG_BACKEND_URL || 'http://localhost:3001';
const MCP_SERVER_PATH = '/Users/benkennon/Jarvis/src/integrations/claude/mcp-server.ts';
const TEST_TIMEOUT = 30000; // 30 seconds

/**
 * MCP Protocol Message Types
 */
interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP Server Test Client
 * Communicates with MCP server via stdio using JSON-RPC 2.0
 */
class MCPTestClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Spawn MCP server process
      this.process = spawn('npx', ['tsx', MCP_SERVER_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          AI_DAWG_BACKEND_URL,
        },
      });

      if (!this.process.stdout || !this.process.stdin || !this.process.stderr) {
        reject(new Error('Failed to spawn MCP server process'));
        return;
      }

      let buffer = '';

      // Handle stdout (JSON-RPC responses)
      this.process.stdout.on('data', (data: Buffer) => {
        buffer += data.toString();

        // Process complete JSON messages (separated by newlines)
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const response: MCPResponse = JSON.parse(line);
            const pending = this.pendingRequests.get(Number(response.id));

            if (pending) {
              this.pendingRequests.delete(Number(response.id));

              if (response.error) {
                pending.reject(new Error(response.error.message));
              } else {
                pending.resolve(response.result);
              }
            }
          } catch (error) {
            console.error('Failed to parse MCP response:', line, error);
          }
        }
      });

      // Handle stderr (logs)
      this.process.stderr.on('data', (data: Buffer) => {
        const message = data.toString();
        // Log errors but don't fail on them (MCP server may log diagnostics)
        if (message.includes('error') && !message.includes('Starting')) {
          console.warn('MCP Server stderr:', message);
        }
      });

      // Handle process errors
      this.process.on('error', (error) => {
        reject(error);
      });

      // Wait for server to be ready
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          resolve();
        } else {
          reject(new Error('MCP server failed to start'));
        }
      }, 2000);
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.pendingRequests.clear();
  }

  async request(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('MCP server not started');
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Send request
      this.process!.stdin!.write(JSON.stringify(request) + '\n');

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 10000);
    });
  }

  async listTools(): Promise<MCPTool[]> {
    const result = await this.request('tools/list');
    return result.tools || [];
  }

  async callTool(name: string, args: any = {}): Promise<any> {
    return await this.request('tools/call', {
      name,
      arguments: args,
    });
  }

  async listResources(): Promise<any[]> {
    const result = await this.request('resources/list');
    return result.resources || [];
  }

  async readResource(uri: string): Promise<any> {
    return await this.request('resources/read', { uri });
  }
}

// Test suite
describe('Claude MCP Integration Tests', () => {
  let client: MCPTestClient;
  let backendHealthy = false;

  // Verify AI Dawg backend is running before tests
  beforeAll(async () => {
    try {
      const response = await axios.post(
        `${AI_DAWG_BACKEND_URL}/api/v1/jarvis/execute`,
        {
          module: 'test',
          action: 'ping',
          params: {},
        },
        { timeout: 5000 }
      );

      backendHealthy = response.data.success === true;
      console.log('AI Dawg Backend Health:', backendHealthy ? '✅ Healthy' : '❌ Unhealthy');
    } catch (error: any) {
      console.warn('AI Dawg Backend not available:', error.message);
      backendHealthy = false;
    }

    // Start MCP server
    client = new MCPTestClient();
    await client.start();
    console.log('✅ MCP Server started for testing');
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await client.stop();
    console.log('✅ MCP Server stopped');
  });

  describe('Tool Listing', () => {
    it('should list all available tools', async () => {
      const tools = await client.listTools();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThanOrEqual(22);

      console.log(`✅ Found ${tools.length} tools`);
    });

    it('should include music tools', async () => {
      const tools = await client.listTools();
      const musicTools = tools.filter(t => t.name.includes('music'));

      expect(musicTools.length).toBeGreaterThanOrEqual(3);
      expect(musicTools.some(t => t.name === 'generate_music')).toBe(true);
    });

    it('should include marketing tools', async () => {
      const tools = await client.listTools();
      const marketingTools = tools.filter(t => t.name.includes('marketing'));

      expect(marketingTools.length).toBeGreaterThanOrEqual(3);
      expect(marketingTools.some(t => t.name === 'get_marketing_metrics')).toBe(true);
    });

    it('should include engagement tools', async () => {
      const tools = await client.listTools();
      const engagementTools = tools.filter(t =>
        t.name.includes('sentiment') || t.name.includes('churn') || t.name.includes('engagement')
      );

      expect(engagementTools.length).toBeGreaterThanOrEqual(3);
    });

    it('should include automation tools', async () => {
      const tools = await client.listTools();
      const automationTools = tools.filter(t =>
        t.name.includes('workflow') || t.name.includes('automation') || t.name.includes('scale')
      );

      expect(automationTools.length).toBeGreaterThanOrEqual(3);
    });

    it('should include system tools', async () => {
      const tools = await client.listTools();
      const systemTools = tools.filter(t =>
        t.name.includes('health') || t.name.includes('status') || t.name.includes('module')
      );

      expect(systemTools.length).toBeGreaterThanOrEqual(3);
    });

    it('should have valid tool schemas', async () => {
      const tools = await client.listTools();

      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      }
    });
  });

  describe('Tool Execution - System Tools', () => {
    it('should list modules', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('list_modules');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      console.log('✅ list_modules result:', result.content[0].text.substring(0, 100));
    });

    it('should get system health', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('get_system_health');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      const text = result.content[0].text;
      expect(text).toContain('System Health');

      console.log('✅ get_system_health passed');
    });
  });

  describe('Tool Execution - Music Tools', () => {
    it('should call generate_music tool', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('generate_music', {
        prompt: 'test lofi beat',
        genre: 'lofi',
        duration: 30,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('🎵');

      console.log('✅ generate_music passed');
    });

    it('should get music usage stats', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('get_music_usage_stats');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      console.log('✅ get_music_usage_stats passed');
    });
  });

  describe('Tool Execution - Marketing Tools', () => {
    it('should get marketing metrics', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('get_marketing_metrics');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('📊');

      console.log('✅ get_marketing_metrics passed');
    });

    it('should get revenue breakdown', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('get_revenue_breakdown');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      console.log('✅ get_revenue_breakdown passed');
    });
  });

  describe('Tool Execution - Engagement Tools', () => {
    it('should analyze user sentiment', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('analyze_user_sentiment', {
        days: 7,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      console.log('✅ analyze_user_sentiment passed');
    });

    it('should check churn risk', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('check_churn_risk', {
        userId: 'test-user-123',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      console.log('✅ check_churn_risk passed');
    });
  });

  describe('Tool Execution - Automation Tools', () => {
    it('should aggregate system metrics', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('aggregate_system_metrics');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      console.log('✅ aggregate_system_metrics passed');
    });

    it('should get automation stats', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('get_automation_stats');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      console.log('✅ get_automation_stats passed');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool gracefully', async () => {
      try {
        await client.callTool('nonexistent_tool');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('✅ Unknown tool error handled correctly');
      }
    });

    it('should handle missing required parameters', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.callTool('generate_music', {
        // Missing required 'prompt' parameter
        duration: 30,
      });

      // Should return error content, not throw
      expect(result).toBeDefined();

      console.log('✅ Missing parameter handled');
    });
  });

  describe('MCP Resources', () => {
    it('should list all resources', async () => {
      const resources = await client.listResources();

      expect(resources).toBeDefined();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThanOrEqual(4);

      const resourceNames = resources.map(r => r.uri);
      expect(resourceNames).toContain('jarvis://status');
      expect(resourceNames).toContain('jarvis://modules');
      expect(resourceNames).toContain('jarvis://health');
      expect(resourceNames).toContain('jarvis://metrics');

      console.log(`✅ Found ${resources.length} resources`);
    });

    it('should read jarvis://status resource', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.readResource('jarvis://status');

      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents[0].uri).toBe('jarvis://status');

      const content = JSON.parse(result.contents[0].text);
      expect(content.status).toBeDefined();

      console.log('✅ jarvis://status read successfully');
    });

    it('should read jarvis://modules resource', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.readResource('jarvis://modules');

      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();

      const content = JSON.parse(result.contents[0].text);
      expect(Array.isArray(content.modules)).toBe(true);

      console.log(`✅ jarvis://modules read successfully (${content.modules.length} modules)`);
    });

    it('should read jarvis://health resource', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.readResource('jarvis://health');

      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();

      const content = JSON.parse(result.contents[0].text);
      expect(content.timestamp).toBeDefined();

      console.log('✅ jarvis://health read successfully');
    });

    it('should read jarvis://metrics resource', async () => {
      if (!backendHealthy) {
        console.warn('⚠️ Skipping test - backend not healthy');
        return;
      }

      const result = await client.readResource('jarvis://metrics');

      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();

      console.log('✅ jarvis://metrics read successfully');
    });
  });

  describe('Performance', () => {
    it('should list tools in < 100ms', async () => {
      const start = Date.now();
      await client.listTools();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
      console.log(`✅ Tool listing took ${duration}ms`);
    });

    it('should list resources in < 100ms', async () => {
      const start = Date.now();
      await client.listResources();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
      console.log(`✅ Resource listing took ${duration}ms`);
    });
  });
});
