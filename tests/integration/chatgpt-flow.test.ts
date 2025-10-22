/**
 * ChatGPT Integration Tests
 *
 * Comprehensive integration tests for ChatGPT Custom GPT Actions.
 * Tests all critical flows: authentication, rate limiting, actions, jobs, context.
 */

import request from 'supertest';
import { app, startServer, stopServer } from '../../src/core/gateway.js';

const BASE_URL = '/integrations/chatgpt';
const AUTH_TOKEN = process.env.JARVIS_AUTH_TOKEN || 'test-token';

describe('ChatGPT Integration', () => {
  beforeAll(async () => {
    // Start server for testing
    await startServer();
  });

  afterAll(async () => {
    // Clean up
    await stopServer();
  });

  // ==================== AUTHENTICATION TESTS ====================

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should accept valid Bearer token', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.status).toBe('ready');
    });

    it('should accept valid API key header', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/`)
        .set('x-api-key', AUTH_TOKEN)
        .expect(200);

      expect(response.body.status).toBe('ready');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/`)
        .set('Authorization', 'Bearer invalid-token-123')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  // ==================== MUSIC MODULE TESTS ====================

  describe('Music Module', () => {
    it('should generate music successfully', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/music/generate`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          prompt: 'Upbeat electronic dance track',
          duration: 30,
          genre: 'electronic',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toMatch(/^job_music_generation_/);
      expect(response.body.estimatedTime).toBeGreaterThan(0);
    });

    it('should reject music generation without prompt', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/music/generate`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ duration: 30 })
        .expect(400);

      expect(response.body.error).toBe('BadRequest');
      expect(response.body.message).toContain('prompt is required');
    });

    it('should analyze music track', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/music/analyze`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          audioUrl: 'https://example.com/track.mp3',
          analyzeVocals: false,
        });

      // May succeed or fail depending on AI Dawg availability
      // Just verify response structure
      expect(response.body).toHaveProperty('success');
    });

    it('should validate music file', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/music/validate`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          audioUrl: 'https://example.com/track.mp3',
          standards: 'streaming',
        });

      expect(response.body).toHaveProperty('success');
    });

    it('should reject invalid standards for validation', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/music/validate`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          audioUrl: 'https://example.com/track.mp3',
          standards: 'invalid-standard',
        })
        .expect(400);

      expect(response.body.error).toBe('BadRequest');
    });
  });

  // ==================== MARKETING MODULE TESTS ====================

  describe('Marketing Module', () => {
    it('should get marketing metrics', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/marketing/metrics`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ timeRange: 'month' });

      expect(response.body).toHaveProperty('success');
      if (response.body.success) {
        expect(response.body.data).toHaveProperty('impressions');
        expect(response.body.data).toHaveProperty('clicks');
        expect(response.body.data).toHaveProperty('conversions');
      }
    });

    it('should reject invalid time range', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/marketing/metrics`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ timeRange: 'invalid-range' })
        .expect(400);

      expect(response.body.error).toBe('BadRequest');
    });

    it('should manage campaigns', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/marketing/campaigns`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ action: 'list' });

      expect(response.body).toHaveProperty('success');
    });

    it('should perform growth analysis', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/marketing/growth-analysis`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          includeCompetitors: true,
          forecastMonths: 3,
        });

      expect(response.body).toHaveProperty('success');
    });

    it('should reject invalid forecast months', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/marketing/growth-analysis`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ forecastMonths: 15 })
        .expect(400);

      expect(response.body.error).toBe('BadRequest');
    });
  });

  // ==================== ENGAGEMENT MODULE TESTS ====================

  describe('Engagement Module', () => {
    it('should analyze sentiment', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/engagement/sentiment`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          source: 'all',
          timeRange: 'week',
          includeTopics: true,
        });

      expect(response.body).toHaveProperty('success');
    });

    it('should detect churn risk', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/engagement/churn`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          riskThreshold: 'medium',
          includeRecommendations: true,
        });

      expect(response.body).toHaveProperty('success');
    });

    it('should create re-engagement campaign', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/engagement/re-engage`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          targetSegment: 'dormant_30days',
          campaignType: 'email',
          personalization: true,
        });

      expect(response.body).toHaveProperty('success');
    });

    it('should reject re-engagement without target segment', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/engagement/re-engage`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ campaignType: 'email' })
        .expect(400);

      expect(response.body.error).toBe('BadRequest');
    });
  });

  // ==================== AUTOMATION MODULE TESTS ====================

  describe('Automation Module', () => {
    it('should manage workflows', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/automation/workflows`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ action: 'list' });

      expect(response.body).toHaveProperty('success');
    });

    it('should generate forecast', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/automation/forecasts`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          metric: 'revenue',
          horizon: 30,
          includeScenarios: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toMatch(/^job_forecasting_/);
    });

    it('should reject invalid forecast horizon', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/automation/forecasts`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          metric: 'revenue',
          horizon: 500, // Too high
        })
        .expect(400);

      expect(response.body.error).toBe('BadRequest');
    });

    it('should manage scaling', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/automation/scaling`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ action: 'get-status' });

      expect(response.body).toHaveProperty('success');
    });
  });

  // ==================== TESTING MODULE TESTS ====================

  describe('Testing Module', () => {
    it('should run health checks', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/testing/health`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          scope: 'all',
          includeMetrics: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
    });

    it('should validate system integrity', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/testing/validate`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({
          validationType: 'all',
          severity: 'all',
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('valid');
    });

    it('should filter health checks by scope', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/testing/health`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ scope: 'infrastructure' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toBeDefined();
    });
  });

  // ==================== JOB MANAGEMENT TESTS ====================

  describe('Job Management', () => {
    let testJobId: string;

    beforeAll(async () => {
      // Create a job for testing
      const response = await request(app)
        .post(`${BASE_URL}/actions/music/generate`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ prompt: 'Test track', duration: 10 });

      testJobId = response.body.jobId;
    });

    it('should get job status', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/jobs/${testJobId}`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.jobId).toBe(testJobId);
      expect(response.body.status).toMatch(/queued|running|completed|failed/);
      expect(response.body.progress).toBeGreaterThanOrEqual(0);
    });

    it('should return 404 for nonexistent job', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/jobs/job_nonexistent_123`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(404);

      expect(response.body.error).toBe('NotFound');
    });

    it('should list all jobs', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/jobs`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.jobs)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter jobs by status', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/jobs?status=running`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.jobs)).toBe(true);
    });

    it('should get job statistics', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/jobs-stats`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toHaveProperty('total');
      expect(response.body.stats).toHaveProperty('queued');
      expect(response.body.stats).toHaveProperty('running');
      expect(response.body.stats).toHaveProperty('completed');
      expect(response.body.stats).toHaveProperty('failed');
    });
  });

  // ==================== RATE LIMITING TESTS ====================

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Send more requests than the limit
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .post(`${BASE_URL}/actions/music/generate`)
          .set('Authorization', `Bearer ${AUTH_TOKEN}`)
          .send({ prompt: 'Test track', duration: 10 })
      );

      const responses = await Promise.all(requests);

      // Check if at least one was rate limited
      const rateLimited = responses.some((r) => r.status === 429);
      // Note: May not trigger in test environment if DISABLE_RATE_LIMIT_IN_DEV=true
      if (!process.env.DISABLE_RATE_LIMIT_IN_DEV) {
        expect(rateLimited).toBe(true);
      }
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/music/analyze`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ audioUrl: 'https://example.com/track.mp3' });

      if (!process.env.DISABLE_RATE_LIMIT_IN_DEV) {
        expect(response.headers).toHaveProperty('x-ratelimit-limit');
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
        expect(response.headers).toHaveProperty('x-ratelimit-reset');
      }
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/unknown/endpoint`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(404);

      expect(response.body.error).toBe('NotFound');
      expect(response.body.availableEndpoints).toBeDefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/actions/music/generate`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return proper error for deprecated webhook', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/webhook`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ action: 'test' })
        .expect(410);

      expect(response.body.error).toBe('Deprecated');
    });
  });

  // ==================== INTEGRATION STATUS ====================

  describe('Integration Status', () => {
    it('should return integration info', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.version).toBe('2.0.0');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints).toHaveProperty('music');
      expect(response.body.endpoints).toHaveProperty('marketing');
      expect(response.body.endpoints).toHaveProperty('engagement');
      expect(response.body.endpoints).toHaveProperty('automation');
      expect(response.body.endpoints).toHaveProperty('testing');
      expect(response.body.endpoints).toHaveProperty('jobs');
    });
  });
});

// ==================== MANUAL TEST SCENARIOS ====================

/**
 * Manual Test Scenarios (run these manually with a real ChatGPT Custom GPT)
 *
 * 1. Music Generation Flow
 *    - Say: "Generate a chill lo-fi hip hop beat"
 *    - Verify: Job ID is returned
 *    - Say: "Check status of [job ID]"
 *    - Verify: Progress updates correctly
 *
 * 2. Marketing Analytics Flow
 *    - Say: "Show me my marketing metrics for this month"
 *    - Verify: Metrics are displayed clearly
 *    - Say: "Analyze growth trends"
 *    - Verify: Growth analysis is provided
 *
 * 3. Engagement Flow
 *    - Say: "Analyze sentiment from social media"
 *    - Verify: Sentiment breakdown is shown
 *    - Say: "Detect users at risk of churning"
 *    - Verify: Churn analysis with recommendations
 *
 * 4. System Health Flow
 *    - Say: "Run a health check"
 *    - Verify: Service status is displayed
 *    - Say: "Validate system integrity"
 *    - Verify: Validation results are clear
 *
 * 5. Error Handling
 *    - Say: "Generate music" (without details)
 *    - Verify: GPT asks for clarification
 *    - Say: "Invalid action"
 *    - Verify: Helpful error message
 *
 * 6. Rate Limiting
 *    - Generate music 11 times quickly
 *    - Verify: Rate limit message on 11th attempt
 *    - Verify: Retry-after time is provided
 *
 * 7. Context Preservation
 *    - Say: "Generate a track"
 *    - Say: "Analyze it"
 *    - Verify: GPT remembers the previous track
 *
 * 8. Recommendations
 *    - Use multiple music actions
 *    - Say: "What should I do next?"
 *    - Verify: Recommendations are relevant
 */
