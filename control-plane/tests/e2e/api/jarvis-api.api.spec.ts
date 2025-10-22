import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v1/jarvis`;

test.describe('Jarvis API Tests', () => {
  test('GET /api/v1/jarvis/vitality - should return vitality data', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE}/vitality`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('score');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('metrics');
  });

  test('GET /api/v1/jarvis/quick-actions - should return available actions', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE}/quick-actions`);

    expect(response.ok()).toBeTruthy();
    const actions = await response.json();

    expect(Array.isArray(actions)).toBeTruthy();
    expect(actions.length).toBeGreaterThan(0);

    // Verify action structure
    const firstAction = actions[0];
    expect(firstAction).toHaveProperty('title');
    expect(firstAction).toHaveProperty('action');
    expect(firstAction).toHaveProperty('icon');
  });

  test('POST /api/v1/jarvis/quick-actions/:action - should execute action', async ({
    request,
  }) => {
    const response = await request.post(
      `${API_BASE}/quick-actions/health_check`,
      {
        data: {
          timestamp: new Date().toISOString(),
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    expect(result).toHaveProperty('success');
    expect(result.success).toBe(true);
  });

  test('GET /api/v1/jarvis/alerts - should return system alerts', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE}/alerts`);

    expect(response.ok()).toBeTruthy();
    const alerts = await response.json();

    expect(Array.isArray(alerts)).toBeTruthy();
  });

  test('POST /api/v1/jarvis/desktop/query - should process query', async ({
    request,
  }) => {
    const response = await request.post(`${API_BASE}/desktop/query`, {
      data: {
        query: 'What is the current system status?',
        includeScreenContext: false,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    expect(result).toHaveProperty('response');
    expect(typeof result.response).toBe('string');
  });

  test('GET /api/v1/jarvis/health - should return health status', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/v1/jarvis/desktop/health`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });
});
