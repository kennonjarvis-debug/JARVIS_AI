/**
 * Unit Tests for HealthAggregator
 * Tests health checking functionality for all JARVIS services
 */

import { HealthAggregator } from '../../../src/core/health-aggregator';
import axios from 'axios';
import { config } from '../../../src/utils/config';
import { logger } from '../../../src/utils/logger';

jest.mock('axios');
jest.mock('../../../src/utils/config');
jest.mock('../../../src/utils/logger');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedConfig = config as jest.Mocked<typeof config>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('HealthAggregator', () => {
  let healthAggregator: HealthAggregator;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup default config mocks
    mockedConfig.aiDawgBackendUrl = 'http://localhost:3001';
    mockedConfig.aiDawgDockerUrl = 'http://localhost:3000';
    mockedConfig.vocalCoachUrl = 'http://localhost:8000';
    mockedConfig.producerUrl = 'http://localhost:8001';
    mockedConfig.aiBrainUrl = 'http://localhost:8002';

    // Setup logger mocks
    mockedLogger.info = jest.fn();
    mockedLogger.warn = jest.fn();
    mockedLogger.error = jest.fn();

    healthAggregator = new HealthAggregator();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkAll', () => {
    it('should return healthy status when all services are up', async () => {
      // Mock all services as healthy
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result.overall).toBe('healthy');
      expect(result.services.aiDawgBackend.status).toBe('healthy');
      expect(result.services.vocalCoach.status).toBe('healthy');
      expect(result.services.producer.status).toBe('healthy');
      expect(result.services.aiBrain.status).toBe('healthy');
      expect(result.services.postgres.status).toBe('healthy');
      expect(result.services.redis.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded status when some services are down', async () => {
      // Mock some services healthy, others failing
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200, data: {} }) // aiDawgBackend
        .mockResolvedValueOnce({ status: 200, data: {} }) // aiDawgDocker
        .mockRejectedValueOnce(new Error('Service unavailable')) // vocalCoach
        .mockResolvedValueOnce({ status: 200, data: {} }) // producer
        .mockResolvedValueOnce({ status: 200, data: {} }) // aiBrain
        .mockResolvedValueOnce({ status: 200, data: {} }) // postgres
        .mockResolvedValueOnce({ status: 200, data: {} }); // redis

      const result = await healthAggregator.checkAll();

      expect(result.overall).toBe('degraded');
      expect(result.services.vocalCoach.status).toBe('down');
    });

    it('should return down status when all services are down', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await healthAggregator.checkAll();

      expect(result.overall).toBe('down');
      expect(result.services.aiDawgBackend.status).toBe('down');
      expect(result.services.vocalCoach.status).toBe('down');
    });

    it('should log health check start', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthAggregator.checkAll();

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Running health checks on all services'
      );
    });

    it('should include latency for healthy services', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty responses', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: null });

      const result = await healthAggregator.checkAll();

      expect(result.overall).toBe('healthy');
    });

    it('should validate timestamp format', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('checkEndpoint - Edge Cases', () => {
    it('should handle timeout errors', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' });

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
      expect(result.services.aiDawgBackend.message).toContain('timeout');
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' });

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
    });

    it('should handle connection refused errors', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' });

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
    });

    it('should accept status codes < 500 as healthy', async () => {
      mockedAxios.get.mockResolvedValue({ status: 404, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('healthy');
    });

    it('should handle null error messages', async () => {
      mockedAxios.get.mockRejectedValue({});

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
      expect(result.services.aiDawgBackend.message).toBe('Service unavailable');
    });

    it('should handle undefined error messages', async () => {
      mockedAxios.get.mockRejectedValue({ message: undefined });

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.message).toBe('Service unavailable');
    });

    it('should warn on health check failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Test error'));

      await healthAggregator.checkAll();

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Health check failed')
      );
    });
  });

  describe('checkAIDawgBackend', () => {
    it('should call correct endpoint', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthAggregator.checkAll();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/jarvis/desktop/health',
        expect.objectContaining({
          timeout: 5000,
          validateStatus: expect.any(Function)
        })
      );
    });

    it('should use configured timeout', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthAggregator.checkAll();

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1]).toHaveProperty('timeout', 5000);
    });
  });

  describe('checkPostgres', () => {
    it('should mark as healthy when AI Dawg backend responds', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result.services.postgres.status).toBe('healthy');
      expect(result.services.postgres.message).toBe('Connected via AI Dawg');
    });

    it('should mark as down when AI Dawg backend is unreachable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection failed'));

      const result = await healthAggregator.checkAll();

      expect(result.services.postgres.status).toBe('down');
      expect(result.services.postgres.message).toBe('Cannot verify (AI Dawg backend down)');
    });
  });

  describe('checkRedis', () => {
    it('should mark as healthy when AI Dawg backend responds', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result.services.redis.status).toBe('healthy');
      expect(result.services.redis.message).toBe('Connected via AI Dawg');
    });

    it('should mark as down when AI Dawg backend is unreachable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection failed'));

      const result = await healthAggregator.checkAll();

      expect(result.services.redis.status).toBe('down');
      expect(result.services.redis.message).toBe('Cannot verify (AI Dawg backend down)');
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle extremely high latency', async () => {
      mockedAxios.get.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ status: 200, data: {} }), 4999))
      );

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('healthy');
      expect(result.services.aiDawgBackend.latency).toBeGreaterThan(0);
    });

    it('should handle zero latency responses', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle NaN in response', async () => {
      mockedAxios.get.mockResolvedValue({ status: NaN, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result).toBeDefined();
    });

    it('should handle Infinity in response', async () => {
      mockedAxios.get.mockResolvedValue({ status: Infinity, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result).toBeDefined();
    });

    it('should handle negative status codes', async () => {
      mockedAxios.get.mockResolvedValue({ status: -1, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('healthy');
    });

    it('should handle max integer latency', async () => {
      mockedAxios.get.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return { status: 200, data: {} };
      });

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.latency).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from transient errors', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValue({ status: 200, data: {} });

      const result1 = await healthAggregator.checkAll();
      expect(result1.services.aiDawgBackend.status).toBe('down');

      const result2 = await healthAggregator.checkAll();
      expect(result2.services.aiDawgBackend.status).toBe('healthy');
    });

    it('should handle mixed service statuses', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200, data: {} })
        .mockRejectedValueOnce(new Error('Down'))
        .mockResolvedValueOnce({ status: 200, data: {} })
        .mockRejectedValueOnce(new Error('Down'))
        .mockResolvedValueOnce({ status: 200, data: {} })
        .mockResolvedValueOnce({ status: 200, data: {} })
        .mockResolvedValueOnce({ status: 200, data: {} });

      const result = await healthAggregator.checkAll();

      expect(result.overall).toBe('degraded');
      expect(result.services.aiDawgBackend.status).toBe('healthy');
      expect(result.services.aiDawgDocker.status).toBe('down');
    });
  });

  describe('Concurrent Checks', () => {
    it('should handle multiple concurrent check calls', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const [result1, result2, result3] = await Promise.all([
        healthAggregator.checkAll(),
        healthAggregator.checkAll(),
        healthAggregator.checkAll()
      ]);

      expect(result1.overall).toBe('healthy');
      expect(result2.overall).toBe('healthy');
      expect(result3.overall).toBe('healthy');
    });

    it('should handle parallel checks without race conditions', async () => {
      let callCount = 0;
      mockedAxios.get.mockImplementation(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 200, data: {} };
      });

      await Promise.all([
        healthAggregator.checkAll(),
        healthAggregator.checkAll()
      ]);

      expect(callCount).toBeGreaterThan(10); // Each checkAll makes multiple calls
    });
  });

  describe('Config Validation', () => {
    it('should handle null config URLs', async () => {
      mockedConfig.aiDawgBackendUrl = null as any;
      mockedAxios.get.mockRejectedValue(new Error('Invalid URL'));

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
    });

    it('should handle empty config URLs', async () => {
      mockedConfig.aiDawgBackendUrl = '';
      mockedAxios.get.mockRejectedValue(new Error('Invalid URL'));

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
    });

    it('should handle malformed URLs', async () => {
      mockedConfig.aiDawgBackendUrl = 'not-a-url';
      mockedAxios.get.mockRejectedValue(new Error('Invalid URL'));

      const result = await healthAggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
    });
  });

  describe('validateStatus Function', () => {
    it('should validate status < 500 as true', async () => {
      let validateFn: ((status: number) => boolean) | undefined = undefined;

      mockedAxios.get.mockImplementation((url, config) => {
        if (config?.validateStatus) {
          validateFn = config.validateStatus;
        }
        return Promise.resolve({ status: 200, data: {} });
      });

      await healthAggregator.checkAll();

      expect(validateFn).toBeDefined();
      expect(validateFn!(200)).toBe(true);
      expect(validateFn!(404)).toBe(true);
      expect(validateFn!(499)).toBe(true);
    });

    it('should validate status >= 500 as false', async () => {
      let validateFn: ((status: number) => boolean) | undefined = undefined;

      mockedAxios.get.mockImplementation((url, config) => {
        if (config?.validateStatus) {
          validateFn = config.validateStatus;
        }
        return Promise.resolve({ status: 200, data: {} });
      });

      await healthAggregator.checkAll();

      expect(validateFn).toBeDefined();
      expect(validateFn!(500)).toBe(false);
      expect(validateFn!(503)).toBe(false);
    });
  });
});
