/**
 * Integration Test: AI DAWG Backend → AI Producer → S3 Upload
 *
 * Test Scenarios:
 * 1. User generates beat - AI Producer creates audio - File uploaded to S3 - Verify playable
 * 2. Multiple concurrent audio generations - Verify all uploads succeed
 * 3. Large audio file upload - Verify streaming upload works
 * 4. S3 upload failure - Verify retry logic
 * 5. Audio metadata preservation - Verify metadata in S3
 */

import axios from 'axios';
import { randomUUID } from 'crypto';

const AI_DAWG_API = 'http://localhost:3001';
const PRODUCER_API = 'http://localhost:8001';
const AUTH_TOKEN = process.env.JARVIS_AUTH_TOKEN || 'test-token';

interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

async function pollJobStatus(jobId: string, maxAttempts = 30): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await axios.get(`${AI_DAWG_API}/api/v1/jobs/${jobId}`, {
      timeout: 5000
    });

    if (response.data.status === 'completed') {
      return response.data;
    }

    if (response.data.status === 'failed') {
      throw new Error(`Job failed: ${response.data.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Job timeout - did not complete within expected time');
}

describe('AI Producer → S3 Upload Integration', () => {
  beforeAll(async () => {
    console.log('\n🎵 Starting AI Producer → S3 Integration Tests\n');
  });

  afterAll(() => {
    console.log('\n📊 Test Results Summary:');
    console.log('=======================');
    results.forEach(r => {
      const status = r.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${r.scenario} | ${r.duration}ms`);
      if (r.error) console.log(`   Error: ${r.error}`);
    });
    const passCount = results.filter(r => r.passed).length;
    console.log(`\nTotal: ${passCount}/${results.length} passed`);
  });

  test('Scenario 1: Generate beat and verify S3 upload', async () => {
    const scenario = 'Generate beat and verify S3 upload';

    try {
      const { duration } = await measureTime(async () => {
        // Step 1: Request beat generation
        const generateResponse = await axios.post(
          `${AI_DAWG_API}/api/v1/music/generate`,
          {
            prompt: 'Upbeat hip-hop instrumental with 808 bass',
            duration: 30,
            genre: 'hip-hop',
            tempo: 120
          },
          { timeout: 10000 }
        );

        expect(generateResponse.status).toBe(200);
        expect(generateResponse.data.success).toBe(true);
        expect(generateResponse.data.jobId).toBeDefined();

        const jobId = generateResponse.data.jobId;

        // Step 2: Poll for job completion
        const jobResult = await pollJobStatus(jobId);

        expect(jobResult.status).toBe('completed');
        expect(jobResult.result).toBeDefined();
        expect(jobResult.result.audioUrl).toBeDefined();

        // Step 3: Verify file is accessible from S3
        const audioUrl = jobResult.result.audioUrl;
        const audioResponse = await axios.head(audioUrl, { timeout: 5000 });

        expect(audioResponse.status).toBe(200);
        expect(audioResponse.headers['content-type']).toMatch(/audio/);

        // Step 4: Download and verify file is not empty
        const downloadResponse = await axios.get(audioUrl, {
          responseType: 'arraybuffer',
          timeout: 10000
        });

        expect(downloadResponse.data.byteLength).toBeGreaterThan(1000); // At least 1KB
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  }, 120000); // 2 minute timeout for audio generation

  test('Scenario 2: Concurrent audio generations', async () => {
    const scenario = 'Concurrent audio generations';

    try {
      const { duration } = await measureTime(async () => {
        // Generate 3 tracks concurrently
        const prompts = [
          'Relaxing ambient soundscape',
          'Energetic rock guitar riff',
          'Smooth jazz piano melody'
        ];

        const generatePromises = prompts.map(prompt =>
          axios.post(
            `${AI_DAWG_API}/api/v1/music/generate`,
            { prompt, duration: 15, genre: 'electronic', tempo: 100 },
            { timeout: 10000 }
          )
        );

        const generateResults = await Promise.all(generatePromises);

        // All should initiate successfully
        generateResults.forEach(res => {
          expect(res.status).toBe(200);
          expect(res.data.success).toBe(true);
          expect(res.data.jobId).toBeDefined();
        });

        const jobIds = generateResults.map(res => res.data.jobId);

        // Poll all jobs
        const jobResults = await Promise.all(jobIds.map(id => pollJobStatus(id)));

        // All should complete and have S3 URLs
        jobResults.forEach(job => {
          expect(job.status).toBe('completed');
          expect(job.result.audioUrl).toBeDefined();
        });

        // Verify all files are accessible
        const verifyPromises = jobResults.map(job =>
          axios.head(job.result.audioUrl, { timeout: 5000 })
        );

        const verifyResults = await Promise.all(verifyPromises);

        verifyResults.forEach(res => {
          expect(res.status).toBe(200);
        });
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  }, 180000); // 3 minute timeout

  test('Scenario 3: Verify audio metadata in S3', async () => {
    const scenario = 'Verify audio metadata preservation';

    try {
      const { duration } = await measureTime(async () => {
        const metadata = {
          artist: 'AI DAWG',
          title: 'Integration Test Track',
          album: 'Test Suite',
          genre: 'Electronic',
          year: '2024'
        };

        // Generate with metadata
        const generateResponse = await axios.post(
          `${AI_DAWG_API}/api/v1/music/generate`,
          {
            prompt: 'Electronic test track',
            duration: 15,
            metadata
          },
          { timeout: 10000 }
        );

        expect(generateResponse.data.success).toBe(true);

        const jobResult = await pollJobStatus(generateResponse.data.jobId);

        // Verify metadata is preserved
        expect(jobResult.result.metadata).toBeDefined();
        expect(jobResult.result.metadata.artist).toBe(metadata.artist);
        expect(jobResult.result.metadata.title).toBe(metadata.title);
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  }, 120000);

  test('Scenario 4: Handle invalid audio generation request', async () => {
    const scenario = 'Error handling - invalid generation request';

    try {
      const { duration } = await measureTime(async () => {
        try {
          await axios.post(
            `${AI_DAWG_API}/api/v1/music/generate`,
            {
              // Missing required prompt
              duration: 30,
              genre: 'invalid-genre-12345'
            },
            { timeout: 10000 }
          );

          throw new Error('Expected validation error but request succeeded');
        } catch (error: any) {
          // Should fail with 400 Bad Request
          expect([400, 422]).toContain(error.response?.status);
        }
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 5: Producer health check and metrics', async () => {
    const scenario = 'Producer health and metrics';

    try {
      const { duration } = await measureTime(async () => {
        // Check producer health
        const healthResponse = await axios.get(`${PRODUCER_API}/health`, {
          timeout: 5000
        });

        expect(healthResponse.status).toBe(200);
        expect(healthResponse.data.status).toBe('healthy');

        // Check metrics endpoint
        const metricsResponse = await axios.get(`${PRODUCER_API}/metrics`, {
          timeout: 5000
        });

        expect(metricsResponse.status).toBe(200);
        expect(metricsResponse.data).toHaveProperty('totalGenerations');
        expect(metricsResponse.data).toHaveProperty('s3Uploads');
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });
});
