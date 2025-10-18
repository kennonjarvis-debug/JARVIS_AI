# Performance Optimization Guide

> Comprehensive guide to optimizing the Jarvis AI platform for maximum performance

**Version:** 1.0.0
**Last Updated:** October 17, 2025
**Target Metrics:** <100ms API response (p95), <2s page load (p95), >1000 req/s throughput

---

## Table of Contents

1. [Overview](#overview)
2. [Performance Targets](#performance-targets)
3. [Architecture](#architecture)
4. [Optimization Techniques](#optimization-techniques)
5. [Caching Strategy](#caching-strategy)
6. [Database Optimization](#database-optimization)
7. [API Optimization](#api-optimization)
8. [Frontend Optimization](#frontend-optimization)
9. [Monitoring & Profiling](#monitoring--profiling)
10. [Benchmarking](#benchmarking)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Overview

This guide covers all performance optimization implementations for the Jarvis AI platform, including:

- **Multi-tier caching** (L1: in-memory, L2: Redis, L3: database)
- **Database query optimization** (N+1 detection, index recommendations)
- **API response compression** (Gzip, Brotli)
- **Static asset optimization** (images, fonts, bundles)
- **Memory management** (GC tuning, leak detection)
- **CDN configuration** (Cloudflare edge caching)
- **Real-time profiling** (CPU, memory, event loop)

---

## Performance Targets

### API Performance
- **Response Time (p50):** <50ms
- **Response Time (p95):** <100ms
- **Response Time (p99):** <200ms
- **Throughput:** >1000 requests/second
- **Error Rate:** <0.1%

### Frontend Performance
- **Time to First Byte (TTFB):** <200ms
- **First Contentful Paint (FCP):** <1.5s
- **Time to Interactive (TTI):** <2s
- **Largest Contentful Paint (LCP):** <2.5s
- **Cumulative Layout Shift (CLS):** <0.1

### Infrastructure
- **Memory Usage:** <512MB per instance
- **CPU Usage (avg):** <60%
- **Database Query Time (p95):** <50ms
- **Redis Operations (p95):** <5ms
- **Cache Hit Rate:** >80%

---

## Architecture

### Multi-Tier Caching System

```
┌─────────────────────────────────────────────────────────┐
│                    Client Request                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   L1 Cache (Memory)   │  ← Fastest (< 1ms)
         │   - Hot data          │
         │   - 10K items max     │
         └───────────┬───────────┘
                     │ Miss
                     ▼
         ┌───────────────────────┐
         │   L2 Cache (Redis)    │  ← Fast (< 5ms)
         │   - Shared cache      │
         │   - TTL: 1 hour       │
         └───────────┬───────────┘
                     │ Miss
                     ▼
         ┌───────────────────────┐
         │   L3 (Database)       │  ← Slower (< 50ms)
         │   - Source of truth   │
         └───────────────────────┘
```

---

## Optimization Techniques

### 1. Multi-Tier Caching

**Location:** `/src/services/cache.service.ts`

#### Features
- L1: In-memory cache (node-cache) - fastest access
- L2: Redis cache - shared across instances
- L3: Database - source of truth
- Automatic cache invalidation
- Cache-aside pattern
- Cache warming

#### Usage

```typescript
import { getCacheService } from './services/cache.service';

const cache = getCacheService();

// Get or set pattern
const user = await cache.getOrSet(
  `user:${userId}`,
  async () => {
    return await db.users.findById(userId);
  },
  { ttl: 3600 } // 1 hour
);

// Multi-get for batch operations
const users = await cache.mget([
  'user:1',
  'user:2',
  'user:3'
]);

// Invalidate by pattern
await cache.invalidatePattern('user:*');

// Get metrics
const metrics = cache.getMetrics();
console.log(`Cache hit rate: ${metrics.hitRate * 100}%`);
```

#### Best Practices
- Cache frequently accessed data
- Set appropriate TTL values
- Use cache tags for invalidation
- Monitor cache hit rates
- Implement cache warming for common queries

---

### 2. Database Query Optimization

**Location:** `/src/services/query-optimizer.service.ts`

#### Features
- N+1 query detection
- Slow query tracking (>100ms)
- Index recommendations
- Query result caching
- Connection pooling

#### Usage

```typescript
import { getQueryOptimizerService } from './services/query-optimizer.service';
import pool from './db/pool';

const optimizer = getQueryOptimizerService(pool);

// Execute optimized query with caching
const result = await optimizer.query(
  'SELECT * FROM users WHERE email = $1',
  [email],
  { cache: true, cacheTTL: 300 }
);

// Batch queries to prevent N+1
const results = await optimizer.batch([
  { query: 'SELECT * FROM users WHERE id = $1', values: [1] },
  { query: 'SELECT * FROM users WHERE id = $1', values: [2] },
]);

// Get slow query report
const slowQueries = optimizer.getSlowQueries();
console.log('Top slow queries:', slowQueries);

// Analyze query and get index recommendations
const recommendations = await optimizer.analyzeQuery(
  'SELECT * FROM orders WHERE user_id = 123 ORDER BY created_at DESC'
);
```

#### Best Practices
- Add indexes on frequently queried columns
- Use EXPLAIN ANALYZE to understand query plans
- Batch queries when possible
- Cache query results
- Monitor slow query logs

---

### 3. API Response Compression

**Location:** `/src/middleware/compression.ts`

#### Features
- Gzip compression (universal support)
- Brotli compression (modern browsers, best compression)
- Smart compression (skip images/videos)
- Configurable compression levels

#### Usage

```typescript
import express from 'express';
import { compression, highCompression } from './middleware/compression';

const app = express();

// Balanced compression (default)
app.use(compression());

// High compression (slower, better ratio)
app.use(highCompression());

// Custom configuration
app.use(compression({
  threshold: 1024,  // 1KB minimum
  level: 6,         // Compression level 1-9
  brotli: true,     // Enable Brotli
}));
```

#### Performance Impact
- **Bandwidth savings:** 60-80% for text responses
- **Response time:** +5-10ms compression overhead
- **Network transfer:** 70% faster on slow connections

---

### 4. Static Asset Optimization

**Location:** `/web/jarvis-web/next.config.js`

#### Features
- Image optimization (WebP, AVIF)
- Font optimization
- Bundle splitting
- Tree shaking
- Minification
- HTTP/2 push

#### Configuration

```javascript
// Next.js config is already optimized with:
images: {
  formats: ['image/avif', 'image/webp'],  // Modern formats
  minimumCacheTTL: 60,                     // Cache images
},
swcMinify: true,                            // Fast minification
compress: true,                             // Gzip compression
webpack: {
  optimization: {
    splitChunks: { /* vendor splitting */ }
  }
}
```

#### Usage

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/hero.jpg"
  width={800}
  height={600}
  alt="Hero image"
  loading="lazy"
  quality={85}
/>

// Lazy load components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
});
```

---

### 5. Connection Pool Optimization

**Location:** `/src/db/connection-pool.ts`

#### Features
- Dynamic pool sizing
- Connection recycling
- Health checks
- Failover support
- Connection leak detection

#### Usage

```typescript
import { getConnectionPool } from './db/connection-pool';

const pool = getConnectionPool({
  max: 20,              // Maximum connections
  min: 5,               // Minimum connections
  idleTimeoutMillis: 30000,
  healthCheckInterval: 60000,
});

// Execute query
const result = await pool.query('SELECT * FROM users');

// Execute transaction
const user = await pool.transaction(async (client) => {
  const user = await client.query('INSERT INTO users ...');
  const profile = await client.query('INSERT INTO profiles ...');
  return user.rows[0];
});

// Get pool statistics
const stats = pool.getStats();
console.log('Pool connections:', stats.totalCount);
console.log('Idle connections:', stats.idleCount);
console.log('Waiting clients:', stats.waitingCount);
```

---

### 6. Redis Optimization

**Location:** `/src/services/redis-optimizer.service.ts`

#### Features
- Pipeline commands (batch operations)
- Command buffering
- Pub/Sub optimization
- Connection pooling
- Rate limiting with sliding window

#### Usage

```typescript
import { getRedisOptimizerService } from './services/redis-optimizer.service';

const redis = getRedisOptimizerService();

// Batch operations with pipelining
await redis.pipeline([
  ['set', 'key1', 'value1'],
  ['set', 'key2', 'value2'],
  ['set', 'key3', 'value3'],
]);

// Multi-get for better performance
const values = await redis.mget(['key1', 'key2', 'key3']);

// Rate limiting
const { allowed, remaining } = await redis.rateLimit(
  'api:user:123',
  100,  // limit
  60    // window in seconds
);

// Pub/Sub
await redis.subscribe('notifications', (message) => {
  console.log('Received:', message);
});

await redis.publish('notifications', 'Hello!');
```

---

### 7. Lazy Loading Components

**Location:** `/web/jarvis-web/components/LazyLoader.tsx`

#### Components

```typescript
import {
  LazyImage,
  LazySection,
  PrefetchLink,
  ProgressiveImage,
  SkeletonLoader,
} from '@/components/LazyLoader';

// Lazy load images
<LazyImage
  src="/large-image.jpg"
  alt="Large image"
  threshold={0.1}
  rootMargin="50px"
/>

// Lazy load sections
<LazySection
  fallback={<SkeletonLoader height="200px" />}
>
  <HeavyComponent />
</LazySection>

// Prefetch on hover
<PrefetchLink href="/dashboard" prefetchDelay={100}>
  Dashboard
</PrefetchLink>

// Progressive image loading
<ProgressiveImage
  src="/hero.jpg"
  placeholderSrc="/hero-small.jpg"
  alt="Hero"
/>
```

---

### 8. Memory Management

**Location:** `/src/services/memory-manager.service.ts`

#### Features
- Memory monitoring
- Leak detection
- Object pooling
- Stream processing
- GC tuning

#### Usage

```typescript
import { getMemoryManagerService, ObjectPool, StreamProcessor } from './services/memory-manager.service';

const memoryManager = getMemoryManagerService({
  warning: 70,
  critical: 85,
});

// Start monitoring
memoryManager.startMonitoring(5000);

// Listen for events
memoryManager.on('warning', (stats) => {
  console.warn('High memory usage:', stats.usedPercent);
});

memoryManager.on('leak-detected', (data) => {
  console.error('Memory leak detected!', data);
  memoryManager.takeHeapSnapshot();
});

// Object pooling
const bufferPool = new ObjectPool({
  createFn: () => Buffer.allocUnsafe(1024),
  resetFn: (buf) => buf.fill(0),
  maxSize: 100,
});

const buffer = bufferPool.acquire();
// Use buffer...
bufferPool.release(buffer);

// Stream processing for large data
const results = await StreamProcessor.processArray(
  largeArray,
  async (item) => await processItem(item),
  { concurrency: 10, chunkSize: 100 }
);
```

---

### 9. API Batching

**Location:** `/src/middleware/api-batcher.ts`

#### Features
- Request batching
- DataLoader pattern
- Request deduplication
- Automatic debouncing

#### Usage

```typescript
import { DataLoader } from './middleware/api-batcher';

// Create data loader for users
const userLoader = new DataLoader(async (userIds) => {
  const users = await db.users.findMany({
    where: { id: { in: userIds } }
  });
  return userIds.map(id => users.find(u => u.id === id));
}, {
  maxBatchSize: 100,
  batchWindowMs: 10,
  cache: true,
});

// Load single user (batched automatically)
const user = await userLoader.load(userId);

// Load multiple users
const users = await userLoader.loadMany([1, 2, 3, 4, 5]);

// Prime the cache
userLoader.prime(userId, userData);
```

---

## Caching Strategy

### Cache Levels

| Level | Technology | Use Case | TTL | Hit Rate Target |
|-------|-----------|----------|-----|-----------------|
| L1 | Node Cache | Hot data, session data | 5-30 min | >90% |
| L2 | Redis | Shared data, API responses | 1-24 hours | >80% |
| L3 | Database | Source of truth | N/A | N/A |

### Cache Keys

Use structured cache keys:

```
{resource}:{id}:{attribute}
user:123:profile
product:456:details
api:search:query:latest
```

### Cache Invalidation

```typescript
// Invalidate single key
await cache.delete('user:123');

// Invalidate pattern
await cache.invalidatePattern('user:*');

// Invalidate on update
await db.users.update(userId, data);
await cache.delete(`user:${userId}`);
```

### Cache Warming

```typescript
// Warm cache on startup
await cache.warmup(async () => {
  const popularProducts = await db.products.findPopular();
  const entries = new Map();
  for (const product of popularProducts) {
    entries.set(`product:${product.id}`, product);
  }
  return entries;
});
```

---

## Database Optimization

### Index Strategy

```sql
-- Add indexes on frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Composite indexes for multi-column queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial indexes for common filters
CREATE INDEX idx_active_users ON users(email) WHERE active = true;
```

### Query Optimization

```typescript
// BAD: N+1 query
const users = await db.users.findMany();
for (const user of users) {
  user.orders = await db.orders.findMany({ userId: user.id });
}

// GOOD: Use JOIN or eager loading
const users = await db.users.findMany({
  include: { orders: true }
});

// GOOD: Use DataLoader
const users = await db.users.findMany();
const ordersByUserId = await orderLoader.loadMany(users.map(u => u.id));
```

### Connection Pool Tuning

```typescript
const pool = getConnectionPool({
  max: 20,  // Based on: CPU cores * 2 + effective_spindle_count
  min: 5,   // Keep warm connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

---

## API Optimization

### Response Compression

```typescript
// Enable compression middleware
app.use(compression({
  threshold: 1024,
  level: 6,
  brotli: true,
}));
```

### Response Caching

```typescript
// Cache API responses
app.get('/api/products', async (req, res) => {
  const cacheKey = 'api:products:all';
  const cached = await cache.get(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  const products = await db.products.findAll();
  await cache.set(cacheKey, products, { ttl: 300 });
  res.json(products);
});
```

### Request Batching

```typescript
// Batch endpoint
app.post('/api/batch', batchMiddleware());

// Client side
const responses = await fetch('/api/batch', {
  method: 'POST',
  body: JSON.stringify({
    requests: [
      { id: '1', url: '/api/user/1' },
      { id: '2', url: '/api/user/2' },
      { id: '3', url: '/api/user/3' },
    ]
  })
});
```

---

## Frontend Optimization

### Code Splitting

```typescript
// Route-based splitting
const Dashboard = dynamic(() => import('./Dashboard'));
const Settings = dynamic(() => import('./Settings'));

// Component-based splitting
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

### Image Optimization

```typescript
// Use Next.js Image
<Image
  src="/image.jpg"
  width={800}
  height={600}
  quality={85}
  loading="lazy"
  placeholder="blur"
/>

// Lazy load images
<LazyImage
  src="/image.jpg"
  alt="Description"
  threshold={0.1}
/>
```

### Bundle Size Optimization

```bash
# Analyze bundle
npm run build
npm run analyze

# Tree shake unused code
# Remove unused dependencies
npm prune

# Use production builds
NODE_ENV=production npm run build
```

---

## Monitoring & Profiling

### Performance Profiler

```typescript
import { getProfilerService } from './services/performance-profiler.service';

const profiler = getProfilerService();

// Start profiling
const sessionId = profiler.startProfiling('api-test');

// Your code here...

// Stop profiling
const session = profiler.stopProfiling(sessionId);
const report = profiler.getSessionReport(sessionId);
console.log(report);

// Measure specific operations
await profiler.measureAsync('database-query', async () => {
  return await db.users.findMany();
});
```

### Optimization Advisor

```typescript
import { getOptimizationAdvisorService } from './services/optimization-advisor.service';

const advisor = getOptimizationAdvisorService();

// Analyze performance
const analysis = await advisor.analyzePerformance();

console.log(`Performance Score: ${analysis.score}/100`);
console.log(`Critical Issues: ${analysis.criticalIssues}`);

// Generate report
const report = advisor.generateReport(analysis);
console.log(report);

// Track optimization impact
await advisor.trackOptimizationImpact('cache-optimization', {
  before: { responseTime: 500 },
  after: { responseTime: 150 }
});
```

---

## Benchmarking

### Load Testing

```typescript
import { PerformanceBenchmark } from './tests/performance/benchmarks';

// Run load test
const result = await PerformanceBenchmark.loadTest('API Test', {
  url: 'http://localhost:3000/api/test',
  concurrent: 50,
  totalRequests: 1000,
});

console.log(`Throughput: ${result.throughput} req/s`);
console.log(`P95 Response Time: ${result.p95}ms`);
```

### Stress Testing

```typescript
// Test with increasing load
const results = await PerformanceBenchmark.stressTest('API Stress Test', {
  url: 'http://localhost:3000/api/test',
}, [10, 50, 100, 200, 500]);

// Find breaking point
for (const result of results) {
  console.log(`${result.concurrent} concurrent: ${result.successRate}% success`);
}
```

### Cache Performance Testing

```typescript
const { cached, uncached, improvement } =
  await PerformanceBenchmark.benchmarkCache(
    'http://localhost:3000/api/cached',
    'http://localhost:3000/api/uncached',
    100
  );

console.log(`Cache improvement: ${improvement.toFixed(2)}%`);
```

---

## Troubleshooting

### High Memory Usage

```typescript
// Take heap snapshot
const memoryManager = getMemoryManagerService();
const snapshot = memoryManager.takeHeapSnapshot();

// Analyze with Chrome DevTools
// Load the snapshot file in Chrome DevTools Memory Profiler

// Check for leaks
memoryManager.on('leak-detected', (data) => {
  console.error('Memory leak detected!');
  memoryManager.takeHeapSnapshot();
});
```

### Slow Queries

```typescript
// Get slow query report
const optimizer = getQueryOptimizerService(pool);
const slowQueries = optimizer.getSlowQueries();

for (const query of slowQueries) {
  console.log(`${query.query}: ${query.executionTime}ms (${query.count} times)`);
}

// Analyze and get recommendations
const recommendations = await optimizer.analyzeQuery(slowQuery);
for (const rec of recommendations) {
  console.log(`Add index: ${rec.table}(${rec.columns.join(', ')})`);
}
```

### Low Cache Hit Rate

```typescript
const cache = getCacheService();
const metrics = cache.getMetrics();

console.log(`Cache hit rate: ${metrics.hitRate * 100}%`);
console.log(`L1 hits: ${metrics.l1Hits}`);
console.log(`L2 hits: ${metrics.l2Hits}`);
console.log(`Total misses: ${metrics.totalMisses}`);

// Increase TTL or add cache warming
await cache.warmup(async () => {
  // Pre-populate cache with common queries
  return popularDataMap;
});
```

### Event Loop Lag

```typescript
const profiler = getProfilerService();

profiler.on('event-loop-lag', (lag) => {
  console.warn(`Event loop lag: ${lag}ms`);
  // Identify blocking operations
});

// Use async operations
// Avoid synchronous file I/O
// Use worker threads for CPU-intensive tasks
```

---

## Best Practices

### Caching
- ✅ Cache frequently accessed data
- ✅ Set appropriate TTL values
- ✅ Use cache tags for invalidation
- ✅ Monitor cache hit rates (target >80%)
- ✅ Implement cache warming
- ❌ Don't cache user-specific data in shared cache
- ❌ Don't set TTL too long (stale data)

### Database
- ✅ Add indexes on queried columns
- ✅ Use connection pooling
- ✅ Batch queries to prevent N+1
- ✅ Cache query results
- ✅ Use EXPLAIN ANALYZE
- ❌ Don't fetch more data than needed
- ❌ Don't use SELECT * in production

### API
- ✅ Enable response compression
- ✅ Implement rate limiting
- ✅ Use CDN for static assets
- ✅ Batch API requests
- ✅ Add request timeouts
- ❌ Don't block event loop
- ❌ Don't return large payloads

### Frontend
- ✅ Code split by route
- ✅ Lazy load images and components
- ✅ Optimize images (WebP, AVIF)
- ✅ Minimize bundle size
- ✅ Use CDN
- ❌ Don't load all data upfront
- ❌ Don't skip lazy loading

### Memory
- ✅ Monitor memory usage
- ✅ Use object pooling
- ✅ Stream large data
- ✅ Detect memory leaks early
- ✅ Run with --expose-gc in production
- ❌ Don't hold references unnecessarily
- ❌ Don't create large arrays in memory

---

## Performance Checklist

- [ ] Multi-tier caching implemented
- [ ] Cache hit rate >80%
- [ ] Database indexes added
- [ ] N+1 queries eliminated
- [ ] Response compression enabled
- [ ] Static assets optimized
- [ ] CDN configured
- [ ] Connection pooling optimized
- [ ] Memory monitoring enabled
- [ ] Performance profiling set up
- [ ] Load testing completed
- [ ] API response time <100ms (p95)
- [ ] Page load time <2s (p95)
- [ ] Throughput >1000 req/s

---

## Additional Resources

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Best Practices](https://redis.io/topics/optimization)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web Vitals](https://web.dev/vitals/)

---

## Support

For questions or issues:
- Create an issue on GitHub
- Contact DevOps team
- Check monitoring dashboards

**Happy Optimizing! 🚀**
