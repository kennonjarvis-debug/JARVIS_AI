/**
 * Test Utilities and Helpers
 * Shared utilities for integration and E2E tests
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export const API_ENDPOINTS = {
  jarvis: {
    base: process.env.JARVIS_API_BASE || 'http://localhost:3000',
    health: '/api/health',
    activities: '/api/agents/activities',
    metrics: '/api/agents/metrics',
    approvalQueue: '/api/agents/approval-queue',
    approve: (id: string) => `/api/agents/approve/${id}`,
    reject: (id: string) => `/api/agents/reject/${id}`,
  },
  dawgAI: {
    base: process.env.DAWG_AI_API_BASE || 'http://localhost:9000',
    health: '/health',
    generateMIDI: '/api/v1/generate/midi',
    generateBassline: '/api/v1/generate/bassline',
    generateMelody: '/api/v1/generate/melody',
    mixingSuggestions: '/api/v1/mixing/suggest',
  },
};

/**
 * Test API Client for JARVIS
 */
export class JarvisTestClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_ENDPOINTS.jarvis.base) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
    });
  }

  async checkHealth(): Promise<{ healthy: boolean; data?: any }> {
    const response = await this.client.get(API_ENDPOINTS.jarvis.health);
    return {
      healthy: response.status === 200 && response.data.success === true,
      data: response.data,
    };
  }

  async getActivities(limit: number = 50) {
    const response = await this.client.get(API_ENDPOINTS.jarvis.activities, {
      params: { limit },
    });
    return response;
  }

  async getMetrics() {
    const response = await this.client.get(API_ENDPOINTS.jarvis.metrics);
    return response;
  }

  async getApprovalQueue() {
    const response = await this.client.get(API_ENDPOINTS.jarvis.approvalQueue);
    return response;
  }

  async approveActivity(id: string, approvedBy: string = 'test-user') {
    const response = await this.client.post(API_ENDPOINTS.jarvis.approve(id), {
      approvedBy,
    });
    return response;
  }

  async rejectActivity(id: string, reason: string, rejectedBy: string = 'test-user') {
    const response = await this.client.post(API_ENDPOINTS.jarvis.reject(id), {
      reason,
      rejectedBy,
    });
    return response;
  }

  /**
   * Wait for a specific number of activities to be present
   */
  async waitForActivities(
    minCount: number,
    timeout: number = 10000
  ): Promise<{ success: boolean; activities: any[] }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const response = await this.getActivities(100);
      if (response.status === 200 && response.data.activities.length >= minCount) {
        return { success: true, activities: response.data.activities };
      }
      await sleep(500);
    }

    return { success: false, activities: [] };
  }

  /**
   * Wait for approval queue to have items
   */
  async waitForApprovalQueue(
    minCount: number,
    timeout: number = 10000
  ): Promise<{ success: boolean; queue: any[] }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const response = await this.getApprovalQueue();
      if (response.status === 200 && response.data.queue.length >= minCount) {
        return { success: true, queue: response.data.queue };
      }
      await sleep(500);
    }

    return { success: false, queue: [] };
  }
}

/**
 * Test API Client for DAWG AI
 */
export class DAWGAITestClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_ENDPOINTS.dawgAI.base) {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // MIDI generation can take longer
      validateStatus: () => true,
    });
  }

  async checkHealth(): Promise<{ healthy: boolean; data?: any }> {
    const response = await this.client.get(API_ENDPOINTS.dawgAI.health);
    return {
      healthy: response.status === 200 && response.data.status === 'healthy',
      data: response.data,
    };
  }

  async generateMIDI(params: {
    style: 'drums' | 'melody' | 'bass';
    tempo: number;
    bars: number;
    temperature?: number;
  }) {
    const response = await this.client.post(API_ENDPOINTS.dawgAI.generateMIDI, params);
    return response;
  }

  async generateBassline(params: {
    key: string;
    scale: string;
    bars: number;
    style: string;
  }) {
    const response = await this.client.post(API_ENDPOINTS.dawgAI.generateBassline, params);
    return response;
  }

  async generateMelody(params: { key: string; scale: string; bars: number; style: string }) {
    const response = await this.client.post(API_ENDPOINTS.dawgAI.generateMelody, params);
    return response;
  }

  async getMixingSuggestions(params: { tracks: any[] }) {
    const response = await this.client.post(API_ENDPOINTS.dawgAI.mixingSuggestions, params);
    return response;
  }
}

/**
 * Service Status Checker
 */
export class ServiceStatusChecker {
  async checkAll(): Promise<{
    jarvis: boolean;
    dawgAI: boolean;
    allHealthy: boolean;
  }> {
    const jarvisClient = new JarvisTestClient();
    const dawgClient = new DAWGAITestClient();

    const [jarvisHealth, dawgHealth] = await Promise.all([
      jarvisClient.checkHealth().catch(() => ({ healthy: false })),
      dawgClient.checkHealth().catch(() => ({ healthy: false })),
    ]);

    return {
      jarvis: jarvisHealth.healthy,
      dawgAI: dawgHealth.healthy,
      allHealthy: jarvisHealth.healthy && dawgHealth.healthy,
    };
  }

  async waitForServices(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.checkAll();
      if (status.allHealthy) {
        return true;
      }
      await sleep(2000);
    }

    return false;
  }
}

/**
 * Test Data Generators
 */
export class TestDataGenerator {
  /**
   * Generate mock agent activity
   */
  generateActivity(overrides?: Partial<any>): any {
    return {
      agent_type: 'marketing',
      action: 'social_post_created',
      description: 'Created a test social media post',
      risk_level: 'LOW',
      status: 'completed',
      metadata: {
        platform: 'twitter',
        content: 'Test post',
      },
      ...overrides,
    };
  }

  /**
   * Generate mock MIDI generation request
   */
  generateMIDIRequest(overrides?: Partial<any>): any {
    return {
      style: 'drums' as const,
      tempo: 120,
      bars: 4,
      temperature: 0.8,
      ...overrides,
    };
  }

  /**
   * Generate mock voice command
   */
  generateVoiceCommand(overrides?: Partial<any>): any {
    return {
      command: 'Create a trap beat at 140 BPM',
      parsedIntent: {
        action: 'generate',
        type: 'drums',
        tempo: 140,
        genre: 'trap',
      },
      ...overrides,
    };
  }

  /**
   * Generate random UUID
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate realistic test data
   */
  generateRealisticActivity(): any {
    const agentTypes = ['marketing', 'sales', 'operations', 'support'];
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];
    const statuses = ['pending', 'completed', 'failed'];

    const actions = {
      marketing: [
        'social_post_created',
        'blog_post_drafted',
        'email_campaign_scheduled',
        'analytics_reviewed',
      ],
      sales: [
        'lead_qualified',
        'email_sent',
        'crm_updated',
        'meeting_scheduled',
      ],
      operations: [
        'data_synced',
        'backup_completed',
        'metrics_aggregated',
        'health_check_performed',
      ],
      support: [
        'ticket_routed',
        'response_generated',
        'satisfaction_tracked',
        'kb_article_created',
      ],
    };

    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
    const agentActions = actions[agentType as keyof typeof actions];
    const action = agentActions[Math.floor(Math.random() * agentActions.length)];

    return {
      agent_type: agentType,
      action,
      description: `Realistic test activity: ${action}`,
      risk_level: riskLevels[Math.floor(Math.random() * riskLevels.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      metadata: {
        testData: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Performance Timer
 */
export class PerformanceTimer {
  private startTime: number = 0;
  private measurements: Map<string, number> = new Map();

  start(): void {
    this.startTime = Date.now();
  }

  mark(label: string): number {
    const duration = Date.now() - this.startTime;
    this.measurements.set(label, duration);
    return duration;
  }

  reset(): void {
    this.startTime = Date.now();
    this.measurements.clear();
  }

  getMeasurements(): Record<string, number> {
    return Object.fromEntries(this.measurements);
  }

  getTotalDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Async Utilities
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      await sleep(waitTime);
    }
  }

  throw new Error('Retry failed');
}

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 10000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return true;
    }
    await sleep(100);
  }

  return false;
}

/**
 * Test Assertions
 */
export class TestAssertions {
  /**
   * Assert response matches expected structure
   */
  static assertValidActivity(activity: any): void {
    if (!activity.id) throw new Error('Activity missing id');
    if (!activity.agent_type) throw new Error('Activity missing agent_type');
    if (!activity.action) throw new Error('Activity missing action');
    if (!activity.risk_level) throw new Error('Activity missing risk_level');
    if (!activity.status) throw new Error('Activity missing status');
    if (!activity.timestamp) throw new Error('Activity missing timestamp');

    const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH'];
    if (!validRiskLevels.includes(activity.risk_level)) {
      throw new Error(`Invalid risk_level: ${activity.risk_level}`);
    }

    const validStatuses = [
      'pending',
      'pending_approval',
      'awaiting_approval',
      'approved',
      'rejected',
      'completed',
      'failed',
    ];
    if (!validStatuses.includes(activity.status)) {
      throw new Error(`Invalid status: ${activity.status}`);
    }
  }

  /**
   * Assert MIDI response is valid
   */
  static assertValidMIDIResponse(response: any): void {
    if (!response.midi_base64) throw new Error('MIDI response missing midi_base64');
    if (typeof response.midi_base64 !== 'string') {
      throw new Error('midi_base64 must be string');
    }
    if (response.midi_base64.length === 0) {
      throw new Error('midi_base64 is empty');
    }
    if (!response.metadata) throw new Error('MIDI response missing metadata');
    if (typeof response.metadata.notes_generated !== 'number') {
      throw new Error('metadata.notes_generated must be number');
    }
  }

  /**
   * Assert metrics response is valid
   */
  static assertValidMetrics(metrics: any): void {
    if (typeof metrics.total_activities !== 'number') {
      throw new Error('total_activities must be number');
    }
    if (!Array.isArray(metrics.agents)) {
      throw new Error('agents must be array');
    }
    if (!metrics.risk_breakdown) {
      throw new Error('missing risk_breakdown');
    }
    if (typeof metrics.risk_breakdown.LOW !== 'number') {
      throw new Error('risk_breakdown.LOW must be number');
    }
    if (typeof metrics.risk_breakdown.MEDIUM !== 'number') {
      throw new Error('risk_breakdown.MEDIUM must be number');
    }
    if (typeof metrics.risk_breakdown.HIGH !== 'number') {
      throw new Error('risk_breakdown.HIGH must be number');
    }
  }
}

/**
 * Export all test clients and utilities
 */
export const testClients = {
  jarvis: new JarvisTestClient(),
  dawgAI: new DAWGAITestClient(),
  statusChecker: new ServiceStatusChecker(),
};

export const testUtils = {
  dataGenerator: new TestDataGenerator(),
  timer: new PerformanceTimer(),
  assertions: TestAssertions,
  sleep,
  retry,
  waitFor,
};
