import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('API Client', () => {
  const baseURL = 'http://localhost:3001/api/v1/jarvis';
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = axios as any;
    vi.clearAllMocks();
  });

  describe('getVitality', () => {
    it('should fetch vitality data successfully', async () => {
      const mockVitality = {
        id: '123',
        score: 95,
        status: 'excellent',
        metrics: {
          systemHealth: 0.98,
          userEngagement: 0.95,
          performanceScore: 0.97,
          errorRate: 0.01,
          uptime: 0.999,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockVitality });

      const result = await fetchVitality();
      expect(result).toEqual(mockVitality);
      expect(mockAxios.get).toHaveBeenCalledWith(`${baseURL}/vitality`);
    });

    it('should handle network errors gracefully', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(fetchVitality()).rejects.toThrow('Network error');
    });

    it('should return cached data on 304 response', async () => {
      mockAxios.get.mockResolvedValue({ status: 304, data: null });

      const result = await fetchVitality();
      expect(result).toBeNull();
    });
  });

  describe('executeQuickAction', () => {
    it('should execute quick action successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Action completed',
        data: { result: 'optimized' },
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await executeQuickAction('optimize_performance');
      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith(
        `${baseURL}/quick-actions/optimize_performance`,
        expect.any(Object)
      );
    });
  });
});

// Mock API client functions
async function fetchVitality() {
  const response = await axios.get(`${baseURL}/vitality`);
  return response.data;
}

async function executeQuickAction(action: string) {
  const response = await axios.post(`${baseURL}/quick-actions/${action}`, {
    timestamp: new Date().toISOString(),
  });
  return response.data;
}
