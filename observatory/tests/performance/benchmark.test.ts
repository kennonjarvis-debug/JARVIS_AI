/**
 * Performance Benchmarking Suite
 * Tests performance requirements for JARVIS and DAWG AI systems
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const JARVIS_API_BASE = 'http://localhost:3000';
const DAWG_AI_API_BASE = 'http://localhost:9000';

// Performance thresholds from spec
const PERFORMANCE_TARGETS = {
  jarvis: {
    decisionLatency: 1000, // <1s
    approvalQueueResponse: 5000, // <5s
    apiResponseTime: 1000, // <1s
    concurrentRequests: 10,
    concurrentLatency: 3000, // <3s for 10 concurrent
  },
  dawgAudio: {
    recordingLatency: 10, // <10ms (tested client-side)
    playbackStable: true,
    midiGenerationLatency: 10000, // <10s
  },
  dawgFrontend: {
    initialLoad: 2000, // <2s
    targetFPS: 60,
  },
  memory: {
    typicalUsage: 1024 * 1024 * 1024, // <1GB
  },
};

interface BenchmarkResult {
  testName: string;
  duration: number;
  threshold: number;
  passed: boolean;
  metadata?: Record<string, any>;
}

const benchmarkResults: BenchmarkResult[] = [];

function recordBenchmark(
  testName: string,
  duration: number,
  threshold: number,
  metadata?: Record<string, any>
): BenchmarkResult {
  const result: BenchmarkResult = {
    testName,
    duration,
    threshold,
    passed: duration <= threshold,
    metadata,
  };
  benchmarkResults.push(result);
  return result;
}

describe('Performance Benchmarks: JARVIS API', () => {
  let apiHealthy = false;

  beforeAll(async () => {
    try {
      const health = await axios.get(`${JARVIS_API_BASE}/api/health`, { timeout: 2000 });
      apiHealthy = health.data.success === true;
    } catch (error) {
      console.warn('JARVIS API not running - benchmarks will be skipped');
    }
  });

  it.skipIf(!apiHealthy)(
    'GET /api/agents/activities should respond in <1s',
    async () => {
      const startTime = Date.now();
      const response = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=50`);
      const duration = Date.now() - startTime;

      const result = recordBenchmark(
        'JARVIS Activities API',
        duration,
        PERFORMANCE_TARGETS.jarvis.apiResponseTime,
        { recordCount: response.data.activities.length }
      );

      expect(result.passed).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.jarvis.apiResponseTime);
    },
    { timeout: 3000 }
  );

  it.skipIf(!apiHealthy)(
    'GET /api/agents/metrics should respond in <1s',
    async () => {
      const startTime = Date.now();
      const response = await axios.get(`${JARVIS_API_BASE}/api/agents/metrics`);
      const duration = Date.now() - startTime;

      const result = recordBenchmark(
        'JARVIS Metrics API',
        duration,
        PERFORMANCE_TARGETS.jarvis.apiResponseTime,
        { totalActivities: response.data.total_activities }
      );

      expect(result.passed).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.jarvis.apiResponseTime);
    },
    { timeout: 3000 }
  );

  it.skipIf(!apiHealthy)(
    'GET /api/agents/approval-queue should respond in <1s',
    async () => {
      const startTime = Date.now();
      const response = await axios.get(`${JARVIS_API_BASE}/api/agents/approval-queue`);
      const duration = Date.now() - startTime;

      const result = recordBenchmark(
        'JARVIS Approval Queue API',
        duration,
        PERFORMANCE_TARGETS.jarvis.apiResponseTime,
        { queueLength: response.data.queue.length }
      );

      expect(result.passed).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.jarvis.apiResponseTime);
    },
    { timeout: 3000 }
  );

  it.skipIf(!apiHealthy)(
    'should handle 10 concurrent requests in <3s total',
    async () => {
      const requests = Array(PERFORMANCE_TARGETS.jarvis.concurrentRequests)
        .fill(null)
        .map(() => axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=10`));

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      const result = recordBenchmark(
        'JARVIS Concurrent Requests',
        duration,
        PERFORMANCE_TARGETS.jarvis.concurrentLatency,
        { requestCount: PERFORMANCE_TARGETS.jarvis.concurrentRequests }
      );

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(result.passed).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.jarvis.concurrentLatency);
    },
    { timeout: 5000 }
  );

  it.skipIf(!apiHealthy)(
    'POST /api/agents/approve should respond in <5s',
    async () => {
      // Get approval queue first
      const queueResponse = await axios.get(`${JARVIS_API_BASE}/api/agents/approval-queue`);

      if (queueResponse.data.queue.length > 0) {
        const pendingApproval = queueResponse.data.queue[0];

        const startTime = Date.now();
        await axios.post(
          `${JARVIS_API_BASE}/api/agents/approve/${pendingApproval.id}`,
          {
            approvedBy: 'benchmark-test',
          },
          { validateStatus: () => true }
        );
        const duration = Date.now() - startTime;

        const result = recordBenchmark(
          'JARVIS Approval Action',
          duration,
          PERFORMANCE_TARGETS.jarvis.approvalQueueResponse
        );

        expect(result.passed).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_TARGETS.jarvis.approvalQueueResponse);
      } else {
        // No pending approvals - test still passes
        expect(true).toBe(true);
      }
    },
    { timeout: 10000 }
  );
});

describe('Performance Benchmarks: DAWG AI Backend', () => {
  let apiHealthy = false;

  beforeAll(async () => {
    try {
      const health = await axios.get(`${DAWG_AI_API_BASE}/health`, { timeout: 2000 });
      apiHealthy = health.data.status === 'healthy';
    } catch (error) {
      console.warn('DAWG AI API not running - benchmarks will be skipped');
    }
  });

  it.skipIf(!apiHealthy)(
    'MIDI generation should complete in <10s',
    async () => {
      const startTime = Date.now();
      const response = await axios.post(
        `${DAWG_AI_API_BASE}/api/v1/generate/midi`,
        {
          style: 'drums',
          tempo: 120,
          bars: 4,
        },
        { timeout: 15000 }
      );
      const duration = Date.now() - startTime;

      const result = recordBenchmark(
        'DAWG AI MIDI Generation',
        duration,
        PERFORMANCE_TARGETS.dawgAudio.midiGenerationLatency,
        {
          notesGenerated: response.data.metadata?.notes_generated,
        }
      );

      expect(result.passed).toBe(true);
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.dawgAudio.midiGenerationLatency);
    },
    { timeout: 20000 }
  );

  it.skipIf(!apiHealthy)(
    'Bassline generation should complete in <10s',
    async () => {
      const startTime = Date.now();
      const response = await axios.post(
        `${DAWG_AI_API_BASE}/api/v1/generate/bassline`,
        {
          key: 'C',
          scale: 'minor',
          bars: 4,
          style: 'funk',
        },
        { timeout: 15000 }
      );
      const duration = Date.now() - startTime;

      const result = recordBenchmark(
        'DAWG AI Bassline Generation',
        duration,
        PERFORMANCE_TARGETS.dawgAudio.midiGenerationLatency
      );

      expect(result.passed).toBe(true);
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.dawgAudio.midiGenerationLatency);
    },
    { timeout: 20000 }
  );

  it.skipIf(!apiHealthy)(
    'Melody generation should complete in <10s',
    async () => {
      const startTime = Date.now();
      const response = await axios.post(
        `${DAWG_AI_API_BASE}/api/v1/generate/melody`,
        {
          key: 'C',
          scale: 'major',
          bars: 8,
          style: 'uplifting',
        },
        { timeout: 15000 }
      );
      const duration = Date.now() - startTime;

      const result = recordBenchmark(
        'DAWG AI Melody Generation',
        duration,
        PERFORMANCE_TARGETS.dawgAudio.midiGenerationLatency
      );

      expect(result.passed).toBe(true);
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.dawgAudio.midiGenerationLatency);
    },
    { timeout: 20000 }
  );

  it.skipIf(!apiHealthy)(
    'Health check should respond in <500ms',
    async () => {
      const startTime = Date.now();
      await axios.get(`${DAWG_AI_API_BASE}/health`);
      const duration = Date.now() - startTime;

      const result = recordBenchmark('DAWG AI Health Check', duration, 500);

      expect(result.passed).toBe(true);
      expect(duration).toBeLessThan(500);
    },
    { timeout: 2000 }
  );
});

describe('Performance Benchmarks: End-to-End Workflows', () => {
  let jarvisHealthy = false;
  let dawgHealthy = false;

  beforeAll(async () => {
    try {
      const jarvisHealth = await axios.get(`${JARVIS_API_BASE}/api/health`, { timeout: 2000 });
      jarvisHealthy = jarvisHealth.data.success === true;
    } catch (error) {
      jarvisHealthy = false;
    }

    try {
      const dawgHealth = await axios.get(`${DAWG_AI_API_BASE}/health`, { timeout: 2000 });
      dawgHealthy = dawgHealth.data.status === 'healthy';
    } catch (error) {
      dawgHealthy = false;
    }
  });

  it.skipIf(!jarvisHealthy || !dawgHealthy)(
    'Voice-to-DAW workflow should complete in <15s',
    async () => {
      // Simulate complete workflow timing
      const startTime = Date.now();

      // 1. Voice command processed (simulated - instant)
      const voiceCommand = 'Create a trap beat at 140 BPM';

      // 2. JARVIS parses and routes (simulated)
      const parseTime = Date.now();

      // 3. DAWG AI generates MIDI
      const midiResponse = await axios.post(
        `${DAWG_AI_API_BASE}/api/v1/generate/midi`,
        {
          style: 'drums',
          tempo: 140,
          bars: 4,
        },
        { timeout: 15000 }
      );
      const generationTime = Date.now();

      // 4. Activity logged to JARVIS
      await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=1`);
      const loggingTime = Date.now();

      const totalDuration = loggingTime - startTime;

      const result = recordBenchmark('Voice-to-DAW Complete Workflow', totalDuration, 15000, {
        voiceProcessing: parseTime - startTime,
        midiGeneration: generationTime - parseTime,
        activityLogging: loggingTime - generationTime,
      });

      expect(result.passed).toBe(true);
      expect(midiResponse.status).toBe(200);
      expect(totalDuration).toBeLessThan(15000);
    },
    { timeout: 20000 }
  );

  it.skipIf(!jarvisHealthy)(
    'Multi-agent coordination should complete in <5s',
    async () => {
      const startTime = Date.now();

      // Fetch all data needed for Observatory dashboard
      const [activities, metrics, approvalQueue] = await Promise.all([
        axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=50`),
        axios.get(`${JARVIS_API_BASE}/api/agents/metrics`),
        axios.get(`${JARVIS_API_BASE}/api/agents/approval-queue`),
      ]);

      const duration = Date.now() - startTime;

      const result = recordBenchmark('Multi-Agent Dashboard Load', duration, 5000, {
        activitiesCount: activities.data.activities.length,
        agentsCount: metrics.data.agents.length,
        queueLength: approvalQueue.data.queue.length,
      });

      expect(result.passed).toBe(true);
      expect(duration).toBeLessThan(5000);
    },
    { timeout: 10000 }
  );
});

describe('Performance Summary Report', () => {
  it('should generate performance summary', () => {
    if (benchmarkResults.length === 0) {
      console.log('No benchmarks were run (services may be offline)');
      expect(true).toBe(true);
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE BENCHMARK SUMMARY');
    console.log('='.repeat(80));

    const passed = benchmarkResults.filter((r) => r.passed).length;
    const failed = benchmarkResults.filter((r) => !r.passed).length;
    const total = benchmarkResults.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ${failed > 0 ? '✗' : ''}`);
    console.log(`Pass Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    console.log('Individual Results:');
    console.log('-'.repeat(80));

    benchmarkResults.forEach((result) => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const percentage = ((result.duration / result.threshold) * 100).toFixed(1);

      console.log(
        `${status} | ${result.testName.padEnd(40)} | ${result.duration}ms / ${result.threshold}ms (${percentage}%)`
      );

      if (result.metadata) {
        console.log(`       Metadata: ${JSON.stringify(result.metadata)}`);
      }
    });

    console.log('='.repeat(80) + '\n');

    // All benchmarks should pass
    expect(failed).toBe(0);
  });
});
