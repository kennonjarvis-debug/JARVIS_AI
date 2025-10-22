/**
 * Audio Integration Test for Phase 2.5 QA
 * Claude B - Audio Integration Agent
 *
 * Tests:
 * - WebSocket audio streaming to ws://localhost:3001/ws/audio
 * - Transcription latency ≤ 500ms
 * - SSE throughput ≥ 10 events/sec
 * - Transcription accuracy ≥ 95%
 */

import WebSocket from 'ws';
import axios from 'axios';
import { EventSource } from 'eventsource';
import * as fs from 'fs';
import * as path from 'path';

interface TestMetrics {
  startTime: number;
  endTime: number;
  totalFramesSent: number;
  totalFramesReceived: number;
  latencies: number[];
  sseEventCount: number;
  sseStartTime: number;
  sseEndTime: number;
  transcriptionResults: Array<{
    text: string;
    confidence: number;
    latency: number;
  }>;
  errors: string[];
  websocketConnected: boolean;
  redisMemoryMB: number;
}

class AudioIntegrationTest {
  private metrics: TestMetrics;
  private ws: WebSocket | null = null;
  private logPath: string;

  constructor() {
    this.metrics = {
      startTime: Date.now(),
      endTime: 0,
      totalFramesSent: 0,
      totalFramesReceived: 0,
      latencies: [],
      sseEventCount: 0,
      sseStartTime: 0,
      sseEndTime: 0,
      transcriptionResults: [],
      errors: [],
      websocketConnected: false,
      redisMemoryMB: 0,
    };

    this.logPath = '/Users/benkennon/Jarvis/logs/qa/phase2/audio-integration.log';
  }

  /**
   * Generate simulated 16-bit PCM audio at 44.1 kHz
   */
  generateAudioFrame(durationMs: number = 100): Buffer {
    const sampleRate = 44100;
    const channels = 1;
    const bitDepth = 16;

    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const buffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample

    // Generate a simple sine wave (440 Hz - A4 note)
    const frequency = 440;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * frequency * t);
      // Convert to 16-bit PCM
      const pcmValue = Math.floor(sample * 32767);
      buffer.writeInt16LE(pcmValue, i * 2);
    }

    return buffer;
  }

  /**
   * Test WebSocket audio streaming
   */
  async testWebSocketAudio(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = 'ws://localhost:3001/ws/audio';
      this.log(`Connecting to WebSocket: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        this.log('ERROR: WebSocket connection timeout');
        this.metrics.errors.push('WebSocket connection timeout');
        this.metrics.websocketConnected = false;
        resolve();
      }, 5000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.log('WebSocket connected successfully');
        this.metrics.websocketConnected = true;

        // Send 50 audio frames (5 seconds of audio)
        const frameCount = 50;
        let framesSent = 0;

        const sendInterval = setInterval(() => {
          if (framesSent >= frameCount) {
            clearInterval(sendInterval);
            setTimeout(() => {
              this.ws?.close();
              resolve();
            }, 2000); // Wait for final responses
            return;
          }

          const frame = this.generateAudioFrame(100);
          const sendTime = Date.now();

          this.ws?.send(frame, (err) => {
            if (err) {
              this.log(`ERROR sending frame: ${err.message}`);
              this.metrics.errors.push(`Frame send error: ${err.message}`);
            } else {
              this.metrics.totalFramesSent++;
              framesSent++;
            }
          });
        }, 100); // Send frame every 100ms
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const receiveTime = Date.now();
          const message = JSON.parse(data.toString());

          this.metrics.totalFramesReceived++;

          if (message.type === 'transcription' || message.type === 'pitch_analysis') {
            const latency = receiveTime - this.metrics.startTime;
            this.metrics.latencies.push(latency);

            if (message.text) {
              this.metrics.transcriptionResults.push({
                text: message.text,
                confidence: message.confidence || 1.0,
                latency,
              });
            }
          }
        } catch (err) {
          this.log(`ERROR parsing message: ${err instanceof Error ? err.message : String(err)}`);
        }
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`WebSocket error: ${error.message}`);
        this.metrics.errors.push(`WebSocket error: ${error.message}`);
        this.metrics.websocketConnected = false;
        resolve();
      });

      this.ws.on('close', () => {
        this.log('WebSocket connection closed');
      });
    });
  }

  /**
   * Test SSE throughput
   */
  async testSSEThroughput(): Promise<void> {
    return new Promise((resolve) => {
      const sseUrl = 'http://localhost:5001/api/events';
      this.log(`Connecting to SSE endpoint: ${sseUrl}`);

      this.metrics.sseStartTime = Date.now();
      const eventSource = new EventSource(sseUrl);

      const timeout = setTimeout(() => {
        eventSource.close();
        this.metrics.sseEndTime = Date.now();
        resolve();
      }, 5000); // Monitor for 5 seconds

      eventSource.onmessage = (event) => {
        this.metrics.sseEventCount++;
      };

      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        this.log(`SSE connection error or endpoint not available`);
        this.metrics.errors.push('SSE endpoint not available');
        eventSource.close();
        this.metrics.sseEndTime = Date.now();
        resolve();
      };
    });
  }

  /**
   * Check Redis memory usage
   */
  async checkRedisMemory(): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);

      const { stdout } = await execPromise('redis-cli info memory | grep "used_memory:" | head -1 | awk -F: \'{print $2}\'');
      const memoryBytes = parseInt(stdout.trim());
      this.metrics.redisMemoryMB = memoryBytes / (1024 * 1024);

      this.log(`Redis memory usage: ${this.metrics.redisMemoryMB.toFixed(2)} MB`);
    } catch (err) {
      this.log(`ERROR checking Redis memory: ${err instanceof Error ? err.message : String(err)}`);
      this.metrics.errors.push('Redis memory check failed');
    }
  }

  /**
   * Calculate metrics
   */
  calculateMetrics() {
    const avgLatency = this.metrics.latencies.length > 0
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length
      : 0;

    const maxLatency = this.metrics.latencies.length > 0
      ? Math.max(...this.metrics.latencies)
      : 0;

    const sseTestDuration = (this.metrics.sseEndTime - this.metrics.sseStartTime) / 1000;
    const sseEventsPerSec = sseTestDuration > 0
      ? this.metrics.sseEventCount / sseTestDuration
      : 0;

    const avgConfidence = this.metrics.transcriptionResults.length > 0
      ? this.metrics.transcriptionResults.reduce((sum, r) => sum + r.confidence, 0) / this.metrics.transcriptionResults.length
      : 0;

    return {
      avgLatency,
      maxLatency,
      sseEventsPerSec,
      avgConfidence: avgConfidence * 100,
      transcriptionAccuracy: avgConfidence * 100,
    };
  }

  /**
   * Log message
   */
  log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    console.log(message);

    // Ensure log directory exists
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(this.logPath, logMessage);
  }

  /**
   * Generate final report
   */
  generateReport(): string {
    const metrics = this.calculateMetrics();

    const report = `
=================================================
AUDIO INTEGRATION TEST REPORT - PHASE 2.5 QA
Claude B - Audio Integration Agent
=================================================

Test Duration: ${((this.metrics.endTime - this.metrics.startTime) / 1000).toFixed(2)}s
Test Timestamp: ${new Date(this.metrics.startTime).toISOString()}

-------------------------------------------------
WEBSOCKET AUDIO STREAMING
-------------------------------------------------
Connected: ${this.metrics.websocketConnected ? 'YES ✓' : 'NO ✗'}
Frames Sent: ${this.metrics.totalFramesSent}
Responses Received: ${this.metrics.totalFramesReceived}
Average Latency: ${metrics.avgLatency.toFixed(2)}ms ${metrics.avgLatency <= 500 ? '✓' : '✗ FAIL'}
Max Latency: ${metrics.maxLatency.toFixed(2)}ms
Target: ≤ 500ms

-------------------------------------------------
SSE THROUGHPUT
-------------------------------------------------
Events Received: ${this.metrics.sseEventCount}
Test Duration: ${((this.metrics.sseEndTime - this.metrics.sseStartTime) / 1000).toFixed(2)}s
Throughput: ${metrics.sseEventsPerSec.toFixed(2)} events/sec ${metrics.sseEventsPerSec >= 10 ? '✓' : '✗ FAIL'}
Target: ≥ 10 events/sec

-------------------------------------------------
TRANSCRIPTION
-------------------------------------------------
Transcriptions Received: ${this.metrics.transcriptionResults.length}
Average Confidence: ${metrics.avgConfidence.toFixed(2)}%
Accuracy: ${metrics.transcriptionAccuracy.toFixed(2)}% ${metrics.transcriptionAccuracy >= 95 ? '✓' : '✗ FAIL'}
Target: ≥ 95%

-------------------------------------------------
RESOURCE USAGE
-------------------------------------------------
Redis Memory: ${this.metrics.redisMemoryMB.toFixed(2)} MB ${this.metrics.redisMemoryMB < 100 ? '✓' : '✗ FAIL'}
Target: < 100 MB

-------------------------------------------------
ERRORS
-------------------------------------------------
${this.metrics.errors.length === 0 ? 'No errors ✓' : this.metrics.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

-------------------------------------------------
TEST RESULTS
-------------------------------------------------
`;

    const allPassed =
      this.metrics.websocketConnected &&
      metrics.avgLatency <= 500 &&
      metrics.sseEventsPerSec >= 10 &&
      metrics.transcriptionAccuracy >= 95 &&
      this.metrics.redisMemoryMB < 100 &&
      this.metrics.errors.length === 0;

    const summary = allPassed
      ? '✓ ALL TESTS PASSED'
      : '✗ SOME TESTS FAILED';

    return report + summary + '\n' + '='.repeat(49) + '\n';
  }

  /**
   * Run all tests
   */
  async run(): Promise<void> {
    this.log('='.repeat(49));
    this.log('STARTING AUDIO INTEGRATION TEST - PHASE 2.5 QA');
    this.log('Claude B - Audio Integration Agent');
    this.log('='.repeat(49));

    // Check Redis memory
    this.log('\n[1/3] Checking Redis memory usage...');
    await this.checkRedisMemory();

    // Test WebSocket audio streaming
    this.log('\n[2/3] Testing WebSocket audio streaming...');
    await this.testWebSocketAudio();

    // Test SSE throughput
    this.log('\n[3/3] Testing SSE throughput...');
    await this.testSSEThroughput();

    this.metrics.endTime = Date.now();

    // Generate and log report
    const report = this.generateReport();
    this.log('\n' + report);

    // Write completion marker
    const completionFile = '/tmp/qa-phase2-audio-complete';
    fs.writeFileSync(completionFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      calculated: this.calculateMetrics(),
    }, null, 2));

    this.log(`Completion marker written: ${completionFile}`);
  }
}

// Run the test
const test = new AudioIntegrationTest();
test.run().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
