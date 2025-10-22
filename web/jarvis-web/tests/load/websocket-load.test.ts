import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * WebSocket Load Testing
 * Tests real-time connections and message throughput
 * Target: 5,000 concurrent connections
 */

// Custom metrics
const wsConnections = new Counter('ws_connections');
const wsMessages = new Counter('ws_messages');
const wsErrors = new Rate('ws_errors');
const wsLatency = new Trend('ws_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 500 },    // Ramp up to 500 connections
    { duration: '3m', target: 1000 },   // Ramp up to 1,000 connections
    { duration: '5m', target: 2500 },   // Ramp up to 2,500 connections
    { duration: '10m', target: 5000 },  // Peak: 5,000 connections
    { duration: '5m', target: 5000 },   // Hold peak
    { duration: '3m', target: 1000 },   // Ramp down
    { duration: '2m', target: 0 },      // Complete shutdown
  ],

  thresholds: {
    'ws_connections': ['count>4000'],     // Should handle at least 4,000 connections
    'ws_errors': ['rate<0.02'],           // Less than 2% error rate
    'ws_latency': ['p(95)<100'],          // 95% of messages < 100ms latency
    'ws_messages': ['rate>10000'],        // At least 10,000 messages/second
  }
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:3000/api/ws';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

export default function() {
  const url = `${WS_URL}?token=${API_TOKEN}&userId=${__VU}`;

  const response = ws.connect(url, {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`
    }
  }, function(socket) {
    wsConnections.add(1);

    socket.on('open', () => {
      console.log(`VU ${__VU}: Connected`);

      // Subscribe to channels
      socket.send(JSON.stringify({
        type: 'subscribe',
        channels: ['metrics', 'alerts', 'notifications']
      }));

      // Send periodic heartbeat
      socket.setInterval(() => {
        const sendTime = Date.now();

        socket.send(JSON.stringify({
          type: 'ping',
          timestamp: sendTime
        }));

        wsMessages.add(1);
      }, 5000);

      // Send metric updates
      socket.setInterval(() => {
        const sendTime = Date.now();

        socket.send(JSON.stringify({
          type: 'metric_update',
          data: {
            observatoryId: `obs-${__VU}`,
            metric: 'cpu_usage',
            value: Math.random() * 100,
            timestamp: sendTime
          }
        }));

        wsMessages.add(1);
      }, 2000);
    });

    socket.on('message', (data) => {
      const receiveTime = Date.now();

      try {
        const message = JSON.parse(data);

        // Calculate latency if message has timestamp
        if (message.timestamp) {
          const latency = receiveTime - message.timestamp;
          wsLatency.add(latency);
        }

        // Handle different message types
        switch (message.type) {
          case 'pong':
            check(message, {
              'pong received': (m) => m.type === 'pong'
            });
            break;

          case 'metric_update':
            check(message, {
              'metric update has data': (m) => m.data !== null
            });
            wsMessages.add(1);
            break;

          case 'alert':
            check(message, {
              'alert has severity': (m) => m.severity !== null
            });
            wsMessages.add(1);
            break;

          case 'notification':
            check(message, {
              'notification has message': (m) => m.message !== null
            });
            wsMessages.add(1);
            break;

          case 'error':
            wsErrors.add(1);
            console.error(`VU ${__VU}: WebSocket error - ${message.error}`);
            break;
        }
      } catch (error) {
        wsErrors.add(1);
        console.error(`VU ${__VU}: Failed to parse message - ${error}`);
      }
    });

    socket.on('error', (e) => {
      wsErrors.add(1);
      console.error(`VU ${__VU}: WebSocket error - ${e.error()}`);
    });

    socket.on('close', () => {
      console.log(`VU ${__VU}: Disconnected`);
    });

    // Keep connection open
    socket.setTimeout(() => {
      console.log(`VU ${__VU}: Closing connection after timeout`);
      socket.close();
    }, 120000); // 2 minutes
  });

  check(response, {
    'WebSocket connection established': (r) => r && r.status === 101
  });

  if (!response || response.status !== 101) {
    wsErrors.add(1);
  }

  sleep(1);
}

export function teardown() {
  console.log('✅ WebSocket load test complete');
}
