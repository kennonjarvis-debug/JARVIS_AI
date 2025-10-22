import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Database Stress Testing
 * Tests database performance under heavy load
 * Focuses on read/write operations, queries, and transactions
 */

// Custom metrics
const dbReads = new Counter('db_reads');
const dbWrites = new Counter('db_writes');
const dbErrors = new Rate('db_errors');
const queryDuration = new Trend('query_duration');
const transactionDuration = new Trend('transaction_duration');

// Test configuration
export const options = {
  stages: [
    // Gradual ramp-up
    { duration: '3m', target: 200 },     // 200 concurrent operations
    { duration: '5m', target: 500 },     // 500 concurrent operations
    { duration: '7m', target: 1000 },    // 1,000 concurrent operations

    // Stress phase
    { duration: '10m', target: 2000 },   // 2,000 concurrent operations
    { duration: '5m', target: 3000 },    // Maximum stress

    // Cool down
    { duration: '5m', target: 500 },
    { duration: '3m', target: 0 },
  ],

  thresholds: {
    'db_errors': ['rate<0.01'],                  // Less than 1% error rate
    'query_duration': ['p(95)<50', 'p(99)<100'], // Fast queries
    'transaction_duration': ['p(95)<200'],        // Fast transactions
    'db_reads': ['rate>5000'],                   // At least 5,000 reads/s
    'db_writes': ['rate>1000'],                  // At least 1,000 writes/s
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json'
};

export default function() {
  group('Read Operations', () => {
    // Simple SELECT queries
    const startTime = Date.now();

    const userRes = http.get(`${BASE_URL}/api/users/${__VU}`, { headers });
    check(userRes, {
      'user query successful': (r) => r.status === 200,
      'user query fast': (r) => r.timings.duration < 50
    });

    queryDuration.add(Date.now() - startTime);
    dbReads.add(1);
    dbErrors.add(userRes.status !== 200);

    sleep(0.1);

    // JOIN queries
    const obsStartTime = Date.now();
    const observatoriesRes = http.get(`${BASE_URL}/api/observatories?include=metrics,alerts`, { headers });

    check(observatoriesRes, {
      'observatory join query successful': (r) => r.status === 200,
      'observatory join query reasonable': (r) => r.timings.duration < 200
    });

    queryDuration.add(Date.now() - obsStartTime);
    dbReads.add(1);
    dbErrors.add(observatoriesRes.status !== 200);

    sleep(0.1);

    // Aggregation queries
    const aggStartTime = Date.now();
    const statsRes = http.get(`${BASE_URL}/api/metrics/stats?timeRange=1h&aggregation=avg`, { headers });

    check(statsRes, {
      'aggregation query successful': (r) => r.status === 200,
      'aggregation query acceptable': (r) => r.timings.duration < 500
    });

    queryDuration.add(Date.now() - aggStartTime);
    dbReads.add(1);
    dbErrors.add(statsRes.status !== 200);

    sleep(0.2);
  });

  group('Write Operations', () => {
    // INSERT operations
    const insertStartTime = Date.now();

    const createMetricRes = http.post(`${BASE_URL}/api/metrics`, JSON.stringify({
      observatoryId: `obs-${__VU}`,
      metric: 'test_metric',
      value: Math.random() * 100,
      timestamp: Date.now()
    }), { headers });

    check(createMetricRes, {
      'metric insert successful': (r) => r.status === 201,
      'metric insert fast': (r) => r.timings.duration < 100
    });

    queryDuration.add(Date.now() - insertStartTime);
    dbWrites.add(1);
    dbErrors.add(createMetricRes.status !== 201);

    sleep(0.1);

    // UPDATE operations
    const updateStartTime = Date.now();

    const updateUserRes = http.patch(`${BASE_URL}/api/users/${__VU}`, JSON.stringify({
      lastActive: Date.now()
    }), { headers });

    check(updateUserRes, {
      'user update successful': (r) => r.status === 200,
      'user update fast': (r) => r.timings.duration < 50
    });

    queryDuration.add(Date.now() - updateStartTime);
    dbWrites.add(1);
    dbErrors.add(updateUserRes.status !== 200);

    sleep(0.1);
  });

  group('Transactions', () => {
    // Simulate complex transaction
    const txStartTime = Date.now();

    const txRes = http.post(`${BASE_URL}/api/transactions`, JSON.stringify({
      operations: [
        { type: 'create', table: 'metrics', data: { value: 100 } },
        { type: 'update', table: 'observatories', id: `obs-${__VU}`, data: { updated: true } },
        { type: 'create', table: 'events', data: { type: 'test' } }
      ]
    }), { headers });

    check(txRes, {
      'transaction successful': (r) => r.status === 200,
      'transaction completed': (r) => r.json('committed') === true,
      'transaction reasonable time': (r) => r.timings.duration < 300
    });

    transactionDuration.add(Date.now() - txStartTime);
    dbWrites.add(3); // 3 operations in transaction
    dbErrors.add(txRes.status !== 200);

    sleep(0.3);
  });

  group('Search and Full-Text', () => {
    // Full-text search
    const searchStartTime = Date.now();

    const searchRes = http.get(`${BASE_URL}/api/search?q=metrics&type=fulltext`, { headers });

    check(searchRes, {
      'search successful': (r) => r.status === 200,
      'search has results': (r) => r.json('results.length') >= 0,
      'search reasonably fast': (r) => r.timings.duration < 1000
    });

    queryDuration.add(Date.now() - searchStartTime);
    dbReads.add(1);
    dbErrors.add(searchRes.status !== 200);

    sleep(0.5);
  });

  group('Batch Operations', () => {
    // Batch insert
    const batchStartTime = Date.now();

    const batchData = Array.from({ length: 100 }, (_, i) => ({
      observatoryId: `obs-${__VU}`,
      metric: 'batch_metric',
      value: Math.random() * 100,
      timestamp: Date.now() + i
    }));

    const batchRes = http.post(`${BASE_URL}/api/metrics/batch`, JSON.stringify({
      metrics: batchData
    }), { headers });

    check(batchRes, {
      'batch insert successful': (r) => r.status === 201,
      'batch insert efficient': (r) => r.timings.duration < 500,
      'all records inserted': (r) => r.json('inserted') === 100
    });

    transactionDuration.add(Date.now() - batchStartTime);
    dbWrites.add(100);
    dbErrors.add(batchRes.status !== 201);

    sleep(1);
  });

  group('Concurrent Operations', () => {
    // Simulate concurrent reads and writes
    const promises = [];

    // Multiple reads
    for (let i = 0; i < 5; i++) {
      const res = http.get(`${BASE_URL}/api/metrics?limit=100&offset=${i * 100}`, { headers });
      dbReads.add(1);
      dbErrors.add(res.status !== 200);
    }

    // Multiple writes
    for (let i = 0; i < 3; i++) {
      const res = http.post(`${BASE_URL}/api/metrics`, JSON.stringify({
        observatoryId: `obs-${__VU}`,
        metric: `concurrent_${i}`,
        value: Math.random() * 100
      }), { headers });
      dbWrites.add(1);
      dbErrors.add(res.status !== 201);
    }

    sleep(0.5);
  });

  group('Index Performance', () => {
    // Test indexed queries
    const indexedRes = http.get(`${BASE_URL}/api/metrics?observatoryId=obs-${__VU}&metric=cpu_usage`, { headers });

    check(indexedRes, {
      'indexed query fast': (r) => r.timings.duration < 30
    });

    dbReads.add(1);

    sleep(0.1);

    // Test non-indexed queries (should be slower but acceptable)
    const nonIndexedRes = http.get(`${BASE_URL}/api/metrics?filter=value>50`, { headers });

    check(nonIndexedRes, {
      'non-indexed query acceptable': (r) => r.timings.duration < 500
    });

    dbReads.add(1);

    sleep(0.2);
  });

  group('Connection Pool Stress', () => {
    // Rapid-fire requests to test connection pooling
    for (let i = 0; i < 10; i++) {
      const res = http.get(`${BASE_URL}/api/health/db`, { headers });
      check(res, {
        'connection pool healthy': (r) => r.status === 200,
        'pool has available connections': (r) => r.json('availableConnections') > 0
      });
      dbReads.add(1);
    }

    sleep(0.5);
  });

  // Random think time
  sleep(Math.random() * 2);
}

export function teardown() {
  console.log('✅ Database load test complete');
  console.log('   Check for slow queries, connection pool issues, and lock contention');
}
