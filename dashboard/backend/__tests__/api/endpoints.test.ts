/**
 * API Endpoint Tests
 * Tests all dashboard and chat API endpoints
 */

import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { setupMockFiles, cleanupMockFiles } from '../utils/helpers.js';

// Mock external dependencies
jest.mock('axios');

const TEST_MONITORING_DIR = path.join(__dirname, '../../__test_monitoring__');

describe('Dashboard API Endpoints', () => {
  let app: express.Application;
  let cleanup: () => void;

  beforeAll(async () => {
    // Setup mock files
    const mock = setupMockFiles(TEST_MONITORING_DIR);
    cleanup = mock.cleanup;

    // Import app after mocks are set up
    const dashboardModule = await import('../../dashboard-api.js');
    app = dashboardModule.default;
  });

  afterAll(() => {
    cleanup();
    if (fs.existsSync(TEST_MONITORING_DIR)) {
      fs.rmSync(TEST_MONITORING_DIR, { recursive: true });
    }
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'jarvis-dashboard-api');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/dashboard/overview', () => {
    it('should return complete dashboard overview', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('instances');
      expect(response.body.data).toHaveProperty('business');
      expect(response.body.data).toHaveProperty('health');
      expect(response.body.data).toHaveProperty('financial');
      expect(response.body.data).toHaveProperty('waves');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should handle errors gracefully', async () => {
      // Remove mock file to trigger error
      const trackerPath = path.join(TEST_MONITORING_DIR, 'instance-tracker.json');
      const backup = fs.readFileSync(trackerPath, 'utf8');
      fs.unlinkSync(trackerPath);

      const response = await request(app)
        .get('/api/dashboard/overview')
        .expect(200); // Should still return 200 with null data

      // Restore file
      fs.writeFileSync(trackerPath, backup);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.instances).toBeNull();
    });
  });

  describe('GET /api/dashboard/instances', () => {
    it('should return Claude instance activity', async () => {
      const response = await request(app)
        .get('/api/dashboard/instances')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('instances');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('blockers');
      expect(Array.isArray(response.body.data.instances)).toBe(true);
    });
  });

  describe('GET /api/dashboard/business', () => {
    it('should return business metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard/business')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('music');
      expect(response.body.data).toHaveProperty('marketing');
      expect(response.body.data).toHaveProperty('engagement');
      expect(response.body.data).toHaveProperty('automation');
      expect(response.body.data).toHaveProperty('intelligence');
    });

    it('should include health status for each module', async () => {
      const response = await request(app)
        .get('/api/dashboard/business')
        .expect(200);

      expect(response.body.data.music).toHaveProperty('health');
      expect(response.body.data.marketing).toHaveProperty('health');
    });
  });

  describe('GET /api/dashboard/health', () => {
    it('should return system health', async () => {
      const response = await request(app)
        .get('/api/dashboard/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/dashboard/financial', () => {
    it('should return financial metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard/financial')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('mrr');
      expect(response.body.data).toHaveProperty('arr');
      expect(response.body.data).toHaveProperty('customers');
      expect(response.body.data).toHaveProperty('revenue_today');
    });
  });

  describe('GET /api/dashboard/waves', () => {
    it('should return wave progress', async () => {
      const response = await request(app)
        .get('/api/dashboard/waves')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter wave projects correctly', async () => {
      const response = await request(app)
        .get('/api/dashboard/waves')
        .expect(200);

      const waves = response.body.data;
      waves.forEach((wave: any) => {
        expect(wave.id).toMatch(/^wave-/);
        expect(wave).toHaveProperty('name');
        expect(wave).toHaveProperty('status');
        expect(wave).toHaveProperty('completion');
      });
    });
  });

  describe('GET /api/dashboard/stream', () => {
    it('should set up SSE headers', async () => {
      const response = await request(app)
        .get('/api/dashboard/stream');

      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');
    });

    it('should send data in SSE format', (done) => {
      const req = request(app).get('/api/dashboard/stream');

      req.on('response', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
          if (data.includes('data: ')) {
            // Verify SSE format
            expect(data).toMatch(/^data: /m);
            req.abort();
            done();
          }
        });
      });

      req.end();
    });
  });

  describe('CORS Configuration', () => {
    it('should have CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('Chat API Endpoints', () => {
  let app: express.Application;

  beforeAll(async () => {
    const dashboardModule = await import('../../dashboard-api.js');
    app = dashboardModule.default;
  });

  describe('POST /api/chat', () => {
    it('should require message in request body', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Message is required');
    });

    it('should set up SSE headers for chat response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello Jarvis' });

      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it('should send start event with conversation ID', (done) => {
      const req = request(app)
        .post('/api/chat')
        .send({ message: 'Hello' });

      req.on('response', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
          if (data.includes('"type":"start"')) {
            const match = data.match(/data: ({.*})/);
            if (match) {
              const event = JSON.parse(match[1]);
              expect(event.type).toBe('start');
              expect(event).toHaveProperty('conversationId');
              expect(event).toHaveProperty('messageId');
              req.abort();
              done();
            }
          }
        });
      });

      req.end();
    });

    it('should stream tokens', (done) => {
      const req = request(app)
        .post('/api/chat')
        .send({ message: 'Test message' });

      let hasToken = false;
      req.on('response', (res) => {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = line.substring(6);
              try {
                const event = JSON.parse(jsonData);
                if (event.type === 'token') {
                  hasToken = true;
                  expect(event).toHaveProperty('content');
                }
                if (event.type === 'complete') {
                  expect(hasToken).toBe(true);
                  req.abort();
                  done();
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        });
      });

      req.end();
    }, 10000); // 10 second timeout
  });

  describe('GET /api/chat/:conversationId', () => {
    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/chat/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('not found');
    });

    it('should return conversation history if exists', async () => {
      // First create a conversation
      let conversationId = '';
      const chatReq = request(app)
        .post('/api/chat')
        .send({ message: 'Hello' });

      await new Promise<void>((resolve) => {
        chatReq.on('response', (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk.toString();
            if (data.includes('"type":"start"')) {
              const match = data.match(/data: ({.*})/);
              if (match) {
                const event = JSON.parse(match[1]);
                conversationId = event.conversationId;
                chatReq.abort();
                resolve();
              }
            }
          });
        });
        chatReq.end();
      });

      // Give it time to save
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now fetch the conversation
      const response = await request(app)
        .get(`/api/chat/${conversationId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', conversationId);
      expect(response.body.data).toHaveProperty('messages');
      expect(Array.isArray(response.body.data.messages)).toBe(true);
    });
  });

  describe('DELETE /api/chat/:conversationId', () => {
    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .delete('/api/chat/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should delete existing conversation', async () => {
      // First create a conversation
      let conversationId = '';
      const chatReq = request(app)
        .post('/api/chat')
        .send({ message: 'Test' });

      await new Promise<void>((resolve) => {
        chatReq.on('response', (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk.toString();
            if (data.includes('"type":"start"')) {
              const match = data.match(/data: ({.*})/);
              if (match) {
                const event = JSON.parse(match[1]);
                conversationId = event.conversationId;
                chatReq.abort();
                resolve();
              }
            }
          });
        });
        chatReq.end();
      });

      // Delete it
      const deleteResponse = await request(app)
        .delete(`/api/chat/${conversationId}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('success', true);

      // Verify it's gone
      await request(app)
        .get(`/api/chat/${conversationId}`)
        .expect(404);
    });
  });
});
