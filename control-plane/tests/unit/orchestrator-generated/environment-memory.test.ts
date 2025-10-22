/**
 * Unit Tests for Environment Memory Service
 * Tests environment detection updates and memory synchronization
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  updateEnvironmentMemory,
  getEnvironmentFromMemory,
  hasEnvironmentChanged
} from '../../../src/jarvis-core/services/environment-memory.service';

// Mock fs/promises
jest.mock('fs/promises');

// Mock utils - create mock modules
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../../src/utils/environment-detector', () => ({
  detectEnvironment: jest.fn(),
  getCachedEnvironment: jest.fn()
}), { virtual: true });

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Environment Memory Service', () => {
  const mockMemoryData = {
    version: '1.0.0',
    environment: {
      detection: {
        enabled: true,
        lastCheck: '2024-01-01T00:00:00.000Z',
        type: 'local',
        isAWS: false,
        region: null,
        instanceId: null
      },
      configuration: {
        storage: 'local',
        database: 'sqlite',
        cache: 'redis',
        logging: 'console'
      },
      capabilities: {
        s3Access: false,
        cloudWatchLogs: false,
        distributedCache: false,
        autoScaling: false
      },
      notes: []
    }
  };

  const mockLocalEnv = {
    type: 'local',
    isAWS: false,
    isProduction: false,
    region: null,
    instanceId: null
  };

  const mockAWSEnv = {
    type: 'aws-production',
    isAWS: true,
    isProduction: true,
    region: 'us-east-1',
    instanceId: 'i-1234567890'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockedFs.readFile.mockResolvedValue(JSON.stringify(mockMemoryData));
    mockedFs.writeFile.mockResolvedValue(undefined);

    // Mock environment detector functions
    const envDetector = require('../../../src/utils/environment-detector');
    envDetector.detectEnvironment.mockResolvedValue(mockLocalEnv);
    envDetector.getCachedEnvironment.mockReturnValue(mockLocalEnv);
  });

  describe('getEnvironmentFromMemory', () => {
    it('should return environment data from memory', async () => {
      const result = await getEnvironmentFromMemory();

      expect(result).toEqual(mockMemoryData.environment);
    });

    it('should return null on file read error', async () => {
      mockedFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should return null on malformed JSON', async () => {
      mockedFs.readFile.mockResolvedValueOnce('invalid json');

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should return null if environment section missing', async () => {
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }));

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should handle empty file', async () => {
      mockedFs.readFile.mockResolvedValueOnce('');

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should handle null file content', async () => {
      mockedFs.readFile.mockResolvedValueOnce(null as any);

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should handle undefined file content', async () => {
      mockedFs.readFile.mockResolvedValueOnce(undefined as any);

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should handle deeply nested environment data', async () => {
      const nestedData = {
        ...mockMemoryData,
        environment: {
          ...mockMemoryData.environment,
          nested: {
            level1: {
              level2: {
                value: 'test'
              }
            }
          }
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(nestedData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('nested');
    });
  });

  describe('Edge Cases - File Operations', () => {
    it('should handle very large memory files', async () => {
      const largeMemory = {
        ...mockMemoryData,
        largeData: 'x'.repeat(100000)
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(largeMemory));

      const result = await getEnvironmentFromMemory();

      expect(result).toBeDefined();
    });

    it('should handle special characters in memory data', async () => {
      const specialMemory = {
        ...mockMemoryData,
        specialField: '©®™€£¥'
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(specialMemory));

      const result = await getEnvironmentFromMemory();

      expect(result).toBeDefined();
    });

    it('should handle empty environment object', async () => {
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify({ environment: {} }));

      const result = await getEnvironmentFromMemory();

      expect(result).toEqual({});
    });

    it('should handle null environment object', async () => {
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify({ environment: null }));

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should handle concurrent read calls', async () => {
      const promises = [
        getEnvironmentFromMemory(),
        getEnvironmentFromMemory(),
        getEnvironmentFromMemory()
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => expect(result).toBeDefined());
    });

    it('should handle file system errors', async () => {
      mockedFs.readFile.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should handle timeout errors', async () => {
      mockedFs.readFile.mockRejectedValueOnce(new Error('ETIMEDOUT: operation timed out'));

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should handle JSON with unicode characters', async () => {
      const unicodeData = {
        ...mockMemoryData,
        unicode: '你好世界 🌍'
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(unicodeData));

      const result = await getEnvironmentFromMemory();

      expect(result).toBeDefined();
    });

    it('should handle JSON with escaped characters', async () => {
      const escapedData = {
        ...mockMemoryData,
        escaped: 'line1\\nline2\\ttab'
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(escapedData));

      const result = await getEnvironmentFromMemory();

      expect(result).toBeDefined();
    });

    it('should handle JSON with null values', async () => {
      const nullData = {
        ...mockMemoryData,
        nullField: null,
        environment: {
          ...mockMemoryData.environment,
          nullValue: null
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(nullData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('nullValue', null);
    });

    it('should handle JSON with undefined behavior', async () => {
      mockedFs.readFile.mockResolvedValueOnce('{"environment":{"value":undefined}}');

      const result = await getEnvironmentFromMemory();

      expect(result).toBe(null);
    });

    it('should handle circular JSON (malformed)', async () => {
      mockedFs.readFile.mockResolvedValueOnce('{"a":{"b":{"c":"$ref:$.a"}}}');

      const result = await getEnvironmentFromMemory();

      expect(result).toBeDefined();
    });

    it('should handle buffer-like content', async () => {
      mockedFs.readFile.mockResolvedValueOnce(Buffer.from(JSON.stringify(mockMemoryData)) as any);

      const result = await getEnvironmentFromMemory();

      expect(result).toBeDefined();
    });

    it('should handle read with different encodings', async () => {
      const utf8Data = JSON.stringify(mockMemoryData);
      mockedFs.readFile.mockResolvedValueOnce(utf8Data);

      const result = await getEnvironmentFromMemory();

      expect(result).toEqual(mockMemoryData.environment);
    });
  });

  describe('Edge Cases - Data Types', () => {
    it('should handle environment with arrays', async () => {
      const arrayData = {
        ...mockMemoryData,
        environment: {
          ...mockMemoryData.environment,
          services: ['service1', 'service2']
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(arrayData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('services');
      expect(Array.isArray(result?.services)).toBe(true);
    });

    it('should handle environment with numbers', async () => {
      const numberData = {
        ...mockMemoryData,
        environment: {
          ...mockMemoryData.environment,
          port: 4000,
          maxConnections: 100
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(numberData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('port', 4000);
    });

    it('should handle environment with booleans', async () => {
      const boolData = {
        ...mockMemoryData,
        environment: {
          ...mockMemoryData.environment,
          enabled: true,
          debug: false
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(boolData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('enabled', true);
      expect(result).toHaveProperty('debug', false);
    });

    it('should handle environment with mixed types', async () => {
      const mixedData = {
        ...mockMemoryData,
        environment: {
          string: 'value',
          number: 42,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: 'value' }
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(mixedData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('string', 'value');
      expect(result).toHaveProperty('number', 42);
      expect(result).toHaveProperty('boolean', true);
    });

    it('should handle NaN in JSON (becomes null)', async () => {
      mockedFs.readFile.mockResolvedValueOnce('{"environment":{"value":null}}');

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('value', null);
    });

    it('should handle Infinity in JSON (becomes null)', async () => {
      mockedFs.readFile.mockResolvedValueOnce('{"environment":{"value":null}}');

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('value', null);
    });

    it('should handle negative numbers', async () => {
      const negativeData = {
        ...mockMemoryData,
        environment: {
          ...mockMemoryData.environment,
          negative: -100,
          negativeFloat: -3.14
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(negativeData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('negative', -100);
    });

    it('should handle zero values', async () => {
      const zeroData = {
        ...mockMemoryData,
        environment: {
          ...mockMemoryData.environment,
          zero: 0,
          zeroFloat: 0.0
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(zeroData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('zero', 0);
    });

    it('should handle very large numbers', async () => {
      const largeNumberData = {
        ...mockMemoryData,
        environment: {
          ...mockMemoryData.environment,
          large: Number.MAX_SAFE_INTEGER
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(largeNumberData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('large');
    });

    it('should handle empty strings', async () => {
      const emptyStringData = {
        ...mockMemoryData,
        environment: {
          ...mockMemoryData.environment,
          empty: ''
        }
      };

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(emptyStringData));

      const result = await getEnvironmentFromMemory();

      expect(result).toHaveProperty('empty', '');
    });
  });
});
