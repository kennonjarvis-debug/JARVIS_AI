/**
 * Integration Test: AI DAWG Frontend → Backend → Vocal Coach → WebSocket
 *
 * Test Scenarios:
 * 1. Real-time vocal feedback via WebSocket - Verify < 100ms latency
 * 2. Multiple concurrent WebSocket connections - Verify broadcasting
 * 3. WebSocket reconnection - Verify resilience
 * 4. High-frequency events (10+ events/sec) - Verify throughput
 * 5. WebSocket authentication and security
 */

import axios from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

const AI_DAWG_API = 'http://localhost:3001';
const VOCAL_COACH_API = 'http://localhost:8000';
const WS_URL = 'ws://localhost:4000/ws';

interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

const results: TestResult[] = [];

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

function createWebSocketConnection(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    ws.on('open', () => resolve(ws));
    ws.on('error', reject);

    setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
  });
}

class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private messageCount = 0;
  private latencies: number[] = [];

  async connect(url: string): Promise<void> {
    this.ws = await createWebSocketConnection(url);

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());

        // Calculate latency if timestamp present
        if (message.timestamp) {
          const latency = Date.now() - new Date(message.timestamp).getTime();
          this.latencies.push(latency);
        }

        this.messageCount++;
        this.emit('message', message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('close', () => {
      this.emit('close');
    });
  }

  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify(data));
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  getStats() {
    return {
      messageCount: this.messageCount,
      avgLatency: this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0,
      maxLatency: this.latencies.length > 0 ? Math.max(...this.latencies) : 0,
      minLatency: this.latencies.length > 0 ? Math.min(...this.latencies) : 0
    };
  }
}

describe('Vocal Coach → WebSocket Integration', () => {
  beforeAll(async () => {
    console.log('\n🎤 Starting Vocal Coach → WebSocket Integration Tests\n');
  });

  afterAll(() => {
    console.log('\n📊 Test Results Summary:');
    console.log('=======================');
    results.forEach(r => {
      const status = r.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${r.scenario} | ${r.duration}ms`);
      if (r.metadata) {
        Object.entries(r.metadata).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      if (r.error) console.log(`   Error: ${r.error}`);
    });
    const passCount = results.filter(r => r.passed).length;
    console.log(`\nTotal: ${passCount}/${results.length} passed`);
  });

  test('Scenario 1: Real-time vocal feedback with < 100ms latency', async () => {
    const scenario = 'Real-time vocal feedback < 100ms';

    const client = new WebSocketClient();

    try {
      const { duration } = await measureTime(async () => {
        // Connect WebSocket
        await client.connect(WS_URL);

        const feedbackReceived = new Promise<any>((resolve) => {
          client.on('message', (message) => {
            if (message.type === 'vocal_feedback') {
              resolve(message);
            }
          });
        });

        // Simulate vocal recording and analysis
        const analysisStart = Date.now();

        const analysisResponse = await axios.post(
          `${VOCAL_COACH_API}/analyze`,
          {
            audioData: 'base64_encoded_audio_data_placeholder',
            realTime: true,
            sessionId: 'test-session-123'
          },
          { timeout: 5000 }
        );

        expect(analysisResponse.status).toBe(200);

        // Wait for WebSocket feedback
        const feedback = await Promise.race([
          feedbackReceived,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Feedback timeout')), 5000)
          )
        ]);

        const feedbackLatency = Date.now() - analysisStart;

        // Verify latency < 100ms
        expect(feedbackLatency).toBeLessThan(100);

        // Verify feedback contains expected data
        expect(feedback).toHaveProperty('pitch');
        expect(feedback).toHaveProperty('confidence');
      });

      const stats = client.getStats();

      results.push({
        scenario,
        passed: true,
        duration,
        metadata: {
          avgLatency: `${stats.avgLatency.toFixed(2)}ms`,
          maxLatency: `${stats.maxLatency}ms`,
          messageCount: stats.messageCount
        }
      });

      console.log(`✅ ${scenario} - ${duration}ms (avg latency: ${stats.avgLatency.toFixed(2)}ms)`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    } finally {
      client.close();
    }
  }, 15000);

  test('Scenario 2: Multiple concurrent WebSocket connections', async () => {
    const scenario = 'Multiple concurrent WebSocket connections';

    const clients: WebSocketClient[] = [];

    try {
      const { duration } = await measureTime(async () => {
        // Create 5 concurrent WebSocket connections
        const connectionPromises = Array.from({ length: 5 }, async () => {
          const client = new WebSocketClient();
          await client.connect(WS_URL);
          clients.push(client);
          return client;
        });

        await Promise.all(connectionPromises);

        // Broadcast message and verify all clients receive it
        const messageReceivedPromises = clients.map(client =>
          new Promise<void>((resolve) => {
            client.on('message', (message) => {
              if (message.type === 'broadcast_test') {
                resolve();
              }
            });
          })
        );

        // Send broadcast request
        await axios.post(
          `${AI_DAWG_API}/api/v1/websocket/broadcast`,
          {
            type: 'broadcast_test',
            data: { message: 'Testing multi-client broadcast' }
          },
          { timeout: 5000 }
        );

        // Wait for all clients to receive message (with timeout)
        await Promise.race([
          Promise.all(messageReceivedPromises),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Broadcast timeout')), 5000)
          )
        ]);
      });

      results.push({
        scenario,
        passed: true,
        duration,
        metadata: { clientCount: clients.length }
      });

      console.log(`✅ ${scenario} - ${duration}ms (${clients.length} clients)`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    } finally {
      clients.forEach(client => client.close());
    }
  }, 20000);

  test('Scenario 3: WebSocket reconnection resilience', async () => {
    const scenario = 'WebSocket reconnection resilience';

    const client = new WebSocketClient();

    try {
      const { duration } = await measureTime(async () => {
        // Initial connection
        await client.connect(WS_URL);

        // Force close
        client.close();

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reconnect
        await client.connect(WS_URL);

        // Verify connection works
        const messageReceived = new Promise<void>((resolve) => {
          client.on('message', () => resolve());
        });

        await axios.post(
          `${AI_DAWG_API}/api/v1/websocket/broadcast`,
          { type: 'reconnection_test', data: {} },
          { timeout: 5000 }
        );

        await Promise.race([
          messageReceived,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Reconnection test failed')), 5000)
          )
        ]);
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    } finally {
      client.close();
    }
  }, 20000);

  test('Scenario 4: High-frequency events (10+ events/sec)', async () => {
    const scenario = 'High-frequency events throughput';

    const client = new WebSocketClient();

    try {
      const { duration } = await measureTime(async () => {
        await client.connect(WS_URL);

        const eventCount = 100;
        const testDuration = 5000; // 5 seconds

        // Track received events
        let receivedCount = 0;
        const startTime = Date.now();

        client.on('message', (message) => {
          if (message.type === 'high_frequency_test') {
            receivedCount++;
          }
        });

        // Send high-frequency events
        const sendEvents = async () => {
          const interval = testDuration / eventCount;

          for (let i = 0; i < eventCount; i++) {
            await axios.post(
              `${AI_DAWG_API}/api/v1/websocket/broadcast`,
              {
                type: 'high_frequency_test',
                data: { eventId: i, timestamp: new Date().toISOString() }
              },
              { timeout: 1000 }
            );

            await new Promise(resolve => setTimeout(resolve, interval));
          }
        };

        await sendEvents();

        // Wait for remaining messages
        await new Promise(resolve => setTimeout(resolve, 2000));

        const elapsedTime = Date.now() - startTime;
        const eventsPerSec = (receivedCount / elapsedTime) * 1000;

        // Verify throughput > 10 events/sec
        expect(eventsPerSec).toBeGreaterThan(10);
      });

      const stats = client.getStats();

      results.push({
        scenario,
        passed: true,
        duration,
        metadata: {
          messagesReceived: stats.messageCount,
          avgLatency: `${stats.avgLatency.toFixed(2)}ms`
        }
      });

      console.log(`✅ ${scenario} - ${duration}ms (${stats.messageCount} messages)`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    } finally {
      client.close();
    }
  }, 30000);

  test('Scenario 5: Vocal Coach health and capabilities', async () => {
    const scenario = 'Vocal Coach health and capabilities';

    try {
      const { duration } = await measureTime(async () => {
        // Check health
        const healthResponse = await axios.get(`${VOCAL_COACH_API}/health`, {
          timeout: 5000
        });

        expect(healthResponse.status).toBe(200);
        expect(healthResponse.data.status).toBe('healthy');

        // Check capabilities
        const capabilitiesResponse = await axios.get(
          `${VOCAL_COACH_API}/capabilities`,
          { timeout: 5000 }
        );

        expect(capabilitiesResponse.status).toBe(200);
        expect(capabilitiesResponse.data).toHaveProperty('pitchDetection');
        expect(capabilitiesResponse.data).toHaveProperty('realTimeAnalysis');
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
