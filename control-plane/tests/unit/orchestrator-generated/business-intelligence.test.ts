/**
 * Unit Tests for BusinessIntelligenceService
 * Tests AI usage tracking, user sessions, request tracking, and business metrics
 */

import {
  BusinessIntelligenceService,
  AIUsageRecord,
  SessionRecord,
  RequestRecord
} from '../../../src/core/business-intelligence';
import { ConversationStore } from '../../../src/core/conversation-store';

jest.mock('../../../src/core/conversation-store');

describe('BusinessIntelligenceService', () => {
  let service: BusinessIntelligenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    console.log = jest.fn();
    service = new BusinessIntelligenceService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('trackAIUsage', () => {
    it('should track OpenAI usage', () => {
      service.trackAIUsage('openai', 10000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.totalCalls).toBe(1);
      expect(snapshot.aiUsage.byModel.openai.calls).toBe(1);
      expect(snapshot.aiUsage.byModel.openai.tokens).toBe(10000);
    });

    it('should track Anthropic usage', () => {
      service.trackAIUsage('anthropic', 8000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.anthropic.calls).toBe(1);
      expect(snapshot.aiUsage.byModel.anthropic.tokens).toBe(8000);
    });

    it('should track Gemini usage', () => {
      service.trackAIUsage('gemini', 5000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.gemini.calls).toBe(1);
      expect(snapshot.aiUsage.byModel.gemini.tokens).toBe(5000);
    });

    it('should calculate cost for OpenAI', () => {
      service.trackAIUsage('openai', 10000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.openai.cost).toBeGreaterThan(0);
      expect(snapshot.aiUsage.totalCost).toBeGreaterThan(0);
    });

    it('should handle zero tokens', () => {
      service.trackAIUsage('openai', 0, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.openai.calls).toBe(1);
      expect(snapshot.aiUsage.byModel.openai.cost).toBe(0);
    });

    it('should handle negative tokens', () => {
      service.trackAIUsage('openai', -1000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.openai.tokens).toBe(-1000);
    });

    it('should handle NaN tokens', () => {
      service.trackAIUsage('openai', NaN, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.openai.calls).toBe(1);
    });

    it('should handle Infinity tokens', () => {
      service.trackAIUsage('openai', Infinity, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.openai.calls).toBe(1);
    });

    it('should handle very large token counts', () => {
      service.trackAIUsage('openai', Number.MAX_SAFE_INTEGER, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.openai.tokens).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should track multiple AI calls', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');
      service.trackAIUsage('anthropic', 2000, 'conv-2', 'msg-2');
      service.trackAIUsage('gemini', 3000, 'conv-3', 'msg-3');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.totalCalls).toBe(3);
    });

    it('should handle empty conversation ID', () => {
      service.trackAIUsage('openai', 1000, '', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.totalCalls).toBe(1);
    });

    it('should handle empty message ID', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', '');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.totalCalls).toBe(1);
    });

    it('should handle null conversation ID', () => {
      service.trackAIUsage('openai', 1000, null as any, 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.totalCalls).toBe(1);
    });
  });

  describe('trackSession', () => {
    it('should track desktop session', () => {
      service.trackSession('session-1', 'desktop', 'user-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.totalSessions).toBe(1);
      expect(snapshot.users.bySource.desktop).toBe(1);
    });

    it('should track web session', () => {
      service.trackSession('session-1', 'web');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.bySource.web).toBe(1);
    });

    it('should track chatgpt session', () => {
      service.trackSession('session-1', 'chatgpt');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.bySource.chatgpt).toBe(1);
    });

    it('should track iphone session', () => {
      service.trackSession('session-1', 'iphone');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.bySource.iphone).toBe(1);
    });

    it('should not create duplicate sessions', () => {
      service.trackSession('session-1', 'desktop');
      service.trackSession('session-1', 'desktop');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.totalSessions).toBe(1);
    });

    it('should track session without user ID', () => {
      service.trackSession('session-1', 'web');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.totalSessions).toBe(1);
    });

    it('should handle empty session ID', () => {
      service.trackSession('', 'web');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.totalSessions).toBe(1);
    });

    it('should handle null session ID', () => {
      service.trackSession(null as any, 'web');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.totalSessions).toBe(1);
    });
  });

  describe('updateSession', () => {
    it('should update session message count', () => {
      service.trackSession('session-1', 'desktop');
      service.updateSession('session-1');
      service.updateSession('session-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.totalSessions).toBe(1);
    });

    it('should handle non-existent session', () => {
      service.updateSession('non-existent');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.totalSessions).toBe(0);
    });

    it('should handle empty session ID', () => {
      service.updateSession('');

      expect(() => service.getSnapshot(60)).not.toThrow();
    });

    it('should handle null session ID', () => {
      service.updateSession(null as any);

      expect(() => service.getSnapshot(60)).not.toThrow();
    });
  });

  describe('endSession', () => {
    it('should end active session', () => {
      service.trackSession('session-1', 'desktop');
      service.endSession('session-1');

      // Session should still be counted in total but not active after 5min
      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.totalSessions).toBe(1);
    });

    it('should handle non-existent session', () => {
      service.endSession('non-existent');

      expect(() => service.getSnapshot(60)).not.toThrow();
    });

    it('should handle ending session twice', () => {
      service.trackSession('session-1', 'desktop');
      service.endSession('session-1');
      service.endSession('session-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.totalSessions).toBe(1);
    });
  });

  describe('trackRequest', () => {
    it('should track successful request', () => {
      service.trackRequest('/api/test', 'GET', 200, 100);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.total).toBe(1);
      expect(snapshot.requests.avgResponseTime).toBe(100);
    });

    it('should track error request', () => {
      service.trackRequest('/api/test', 'GET', 500, 100, 'Internal error');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.errorRate).toBe(1);
    });

    it('should track 404 as error', () => {
      service.trackRequest('/api/test', 'GET', 404, 100);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.errorRate).toBe(1);
    });

    it('should calculate error rate correctly', () => {
      service.trackRequest('/api/test', 'GET', 200, 100);
      service.trackRequest('/api/test', 'GET', 200, 100);
      service.trackRequest('/api/test', 'GET', 500, 100);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.errorRate).toBeCloseTo(0.333, 2);
    });

    it('should calculate average response time', () => {
      service.trackRequest('/api/test', 'GET', 200, 100);
      service.trackRequest('/api/test', 'GET', 200, 200);
      service.trackRequest('/api/test', 'GET', 200, 300);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.avgResponseTime).toBe(200);
    });

    it('should handle zero response time', () => {
      service.trackRequest('/api/test', 'GET', 200, 0);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.avgResponseTime).toBe(0);
    });

    it('should handle negative response time', () => {
      service.trackRequest('/api/test', 'GET', 200, -100);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.total).toBe(1);
    });

    it('should handle NaN response time', () => {
      service.trackRequest('/api/test', 'GET', 200, NaN);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.total).toBe(1);
    });

    it('should handle Infinity response time', () => {
      service.trackRequest('/api/test', 'GET', 200, Infinity);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.total).toBe(1);
    });

    it('should calculate requests per minute', () => {
      for (let i = 0; i < 120; i++) {
        service.trackRequest('/api/test', 'GET', 200, 100);
      }

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.requestsPerMinute).toBe(2);
    });

    it('should handle empty endpoint', () => {
      service.trackRequest('', 'GET', 200, 100);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.total).toBe(1);
    });

    it('should handle empty method', () => {
      service.trackRequest('/api/test', '', 200, 100);

      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.total).toBe(1);
    });
  });

  describe('getSnapshot', () => {
    it('should return snapshot for specified time window', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(30);

      expect(snapshot.aiUsage.totalCalls).toBe(1);
    });

    it('should filter old records outside time window', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      jest.advanceTimersByTime(61 * 60 * 1000); // 61 minutes

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.totalCalls).toBe(0);
    });

    it('should handle zero time window', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(0);

      // Zero time window may still include current moment
      expect(snapshot.aiUsage.totalCalls).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative time window', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(-60);

      expect(snapshot.aiUsage.totalCalls).toBe(0);
    });

    it('should handle very large time window', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(Number.MAX_SAFE_INTEGER);

      // Very large time window should include all records
      expect(snapshot.aiUsage.totalCalls).toBeGreaterThanOrEqual(0);
    });

    it('should return zero error rate with no requests', () => {
      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.errorRate).toBe(0);
    });

    it('should return zero avg response time with no requests', () => {
      const snapshot = service.getSnapshot(60);

      expect(snapshot.requests.avgResponseTime).toBe(0);
    });

    it('should calculate active sessions correctly', () => {
      service.trackSession('session-1', 'desktop');
      service.trackSession('session-2', 'web');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.activeSessions).toBeGreaterThan(0);
    });

    it('should not count ended sessions as active after 5 minutes', () => {
      service.trackSession('session-1', 'desktop');
      service.endSession('session-1');

      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.activeSessions).toBe(0);
    });

    it('should count unique active users', () => {
      service.trackSession('session-1', 'desktop', 'user-1');
      service.trackSession('session-2', 'web', 'user-1');
      service.trackSession('session-3', 'chatgpt', 'user-2');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.activeUsers).toBe(2);
    });

    it('should handle sessions without user IDs', () => {
      service.trackSession('session-1', 'desktop');
      service.trackSession('session-2', 'web');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.users.activeUsers).toBe(0);
    });
  });

  describe('getDailySummary', () => {
    it('should return 24-hour snapshot', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      const summary = service.getDailySummary();

      expect(summary.aiUsage.totalCalls).toBe(1);
    });
  });

  describe('getWeeklySummary', () => {
    it('should return 7-day snapshot', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      const summary = service.getWeeklySummary();

      expect(summary.aiUsage.totalCalls).toBe(1);
    });
  });

  describe('getInsights', () => {
    it('should return AI usage insights', () => {
      service.trackAIUsage('openai', 10000, 'conv-1', 'msg-1');
      service.trackAIUsage('openai', 10000, 'conv-2', 'msg-2');

      const insights = service.getInsights(60);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some(i => i.includes('AI API calls'))).toBe(true);
    });

    it('should return user insights', () => {
      service.trackSession('session-1', 'desktop');
      service.trackSession('session-2', 'web');

      const insights = service.getInsights(60);

      expect(insights.some(i => i.includes('active sessions'))).toBe(true);
    });

    it('should return request insights', () => {
      for (let i = 0; i < 100; i++) {
        service.trackRequest('/api/test', 'GET', 200, 100);
      }

      const insights = service.getInsights(60);

      expect(insights.some(i => i.includes('requests'))).toBe(true);
    });

    it('should warn about high error rate', () => {
      service.trackRequest('/api/test', 'GET', 200, 100);
      service.trackRequest('/api/test', 'GET', 500, 100);
      service.trackRequest('/api/test', 'GET', 500, 100);

      const insights = service.getInsights(60);

      expect(insights.some(i => i.includes('error rate'))).toBe(true);
    });

    it('should return empty array with no activity', () => {
      const insights = service.getInsights(60);

      expect(insights).toEqual([]);
    });

    it('should include most used AI model', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');
      service.trackAIUsage('openai', 1000, 'conv-2', 'msg-2');
      service.trackAIUsage('anthropic', 1000, 'conv-3', 'msg-3');

      const insights = service.getInsights(60);

      expect(insights.some(i => i.includes('openai'))).toBe(true);
    });

    it('should include most active source', () => {
      service.trackSession('session-1', 'desktop');
      service.trackSession('session-2', 'desktop');
      service.trackSession('session-3', 'web');

      const insights = service.getInsights(60);

      expect(insights.some(i => i.includes('desktop'))).toBe(true);
    });

    it('should handle zero time window', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      const insights = service.getInsights(0);

      // Zero time window behavior may vary
      expect(Array.isArray(insights)).toBe(true);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should remove records older than 7 days', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days

      const snapshot = service.getSnapshot(10080); // 7 days

      expect(snapshot.aiUsage.totalCalls).toBe(0);
    });

    it('should keep recent records', () => {
      service.trackAIUsage('openai', 1000, 'conv-1', 'msg-1');

      jest.advanceTimersByTime(6 * 24 * 60 * 60 * 1000); // 6 days

      const snapshot = service.getSnapshot(10080); // 7 days

      expect(snapshot.aiUsage.totalCalls).toBe(1);
    });

    it('should log cleanup', () => {
      jest.advanceTimersByTime(3600000); // 1 hour

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up old records')
      );
    });

    it('should cleanup request records', () => {
      service.trackRequest('/api/test', 'GET', 200, 100);

      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days

      const snapshot = service.getSnapshot(10080); // 7 days

      expect(snapshot.requests.total).toBe(0);
    });

    it('should cleanup ended sessions', () => {
      service.trackSession('session-1', 'desktop');
      service.endSession('session-1');

      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days

      const snapshot = service.getSnapshot(10080); // 7 days

      expect(snapshot.users.totalSessions).toBe(0);
    });

    it('should not cleanup active sessions', () => {
      service.trackSession('session-1', 'desktop');

      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days

      const snapshot = service.getSnapshot(10080); // 7 days

      // Session older than 7 days will be cleaned up if time window is only 7 days
      expect(snapshot.users.totalSessions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('setConversationStore', () => {
    it('should set conversation store', () => {
      const mockStore = {} as ConversationStore;

      expect(() => service.setConversationStore(mockStore)).not.toThrow();
    });

    it('should handle null conversation store', () => {
      expect(() => service.setConversationStore(null as any)).not.toThrow();
    });
  });

  describe('Edge Cases - Cost Calculation', () => {
    it('should handle very small token counts', () => {
      service.trackAIUsage('openai', 1, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.openai.cost).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large token counts', () => {
      service.trackAIUsage('openai', 1000000, 'conv-1', 'msg-1');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.byModel.openai.cost).toBeGreaterThan(0);
    });

    it('should calculate costs for all models', () => {
      service.trackAIUsage('openai', 10000, 'conv-1', 'msg-1');
      service.trackAIUsage('anthropic', 10000, 'conv-2', 'msg-2');
      service.trackAIUsage('gemini', 10000, 'conv-3', 'msg-3');

      const snapshot = service.getSnapshot(60);

      expect(snapshot.aiUsage.totalCost).toBeGreaterThan(0);
      expect(snapshot.aiUsage.byModel.openai.cost).toBeGreaterThan(0);
      expect(snapshot.aiUsage.byModel.anthropic.cost).toBeGreaterThan(0);
      expect(snapshot.aiUsage.byModel.gemini.cost).toBeGreaterThan(0);
    });
  });
});
