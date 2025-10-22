# Jarvis Monitoring and Observability

Comprehensive monitoring and observability stack for the Jarvis AI platform.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Components](#components)
- [Configuration](#configuration)
- [Metrics Reference](#metrics-reference)
- [Alert Configuration](#alert-configuration)
- [Dashboard Setup](#dashboard-setup)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## Overview

The Jarvis monitoring stack provides complete observability across:

- **Logging**: Structured JSON logs with automatic rotation
- **Metrics**: Prometheus-compatible metrics collection
- **Tracing**: Request tracing and performance tracking
- **Error Tracking**: Error aggregation and Sentry integration
- **Performance Monitoring**: APM with slow query/endpoint detection
- **Alerting**: Multi-channel alerting (email, Slack, webhook)
- **Health Checks**: Liveness and readiness probes
- **Dashboards**: Real-time monitoring UI

## Quick Start

### 1. Install Dependencies

Dependencies are already installed via the main package.json:
- `winston` and `winston-daily-rotate-file` for logging
- `prom-client` for Prometheus metrics
- `@sentry/node` for error tracking (optional)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Logging
LOG_LEVEL=info

# Sentry (optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_TRACES_SAMPLE_RATE=0.1

# Email Alerts (optional)
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_FROM=alerts@jarvis.ai
ALERT_EMAIL_TO=admin@jarvis.ai,ops@jarvis.ai
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Slack Alerts (optional)
ALERT_SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_SLACK_CHANNEL=#alerts

# Webhook Alerts (optional)
ALERT_WEBHOOK_ENABLED=true
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
```

### 3. Integrate into Express App

```typescript
import express from 'express';
import { metricsService, metricsMiddleware } from './services/metrics.service.js';
import { httpLogger, errorLogger } from './services/logger.service.js';
import { requestTracer, slowRequestLogger } from './middleware/request-tracer.js';
import { errorTrackingMiddleware, errorTracker } from './services/error-tracker.service.js';
import { performanceMiddleware, performanceMonitor } from './services/performance-monitor.service.js';
import { healthCheckService } from './api/health/index.js';
import prometheusRouter from './api/metrics/prometheus.js';
import dashboardRouter from './api/monitoring/dashboard.js';

const app = express();

// Initialize metrics
await metricsService.initialize();

// Add monitoring middleware (in order)
app.use(requestTracer);              // Request tracing
app.use(httpLogger);                 // HTTP logging
app.use(metricsMiddleware);          // Metrics collection
app.use(performanceMiddleware(performanceMonitor)); // Performance tracking
app.use(slowRequestLogger(500));     // Log slow requests (>500ms)

// Health check endpoints
app.use('/health', healthCheckService.getRouter());

// Metrics endpoints
app.use('/metrics', prometheusRouter);

// Monitoring dashboard API
app.use('/api/monitoring', dashboardRouter);

// Your routes here...

// Error tracking middleware (must be after routes)
app.use(errorTrackingMiddleware(errorTracker));
app.use(errorLogger);

app.listen(3000, () => {
  console.log('Server running with monitoring enabled');
});
```

### 4. Access Monitoring

- **Health Check**: `http://localhost:3000/health`
- **Prometheus Metrics**: `http://localhost:3000/metrics`
- **Dashboard API**: `http://localhost:3000/api/monitoring/dashboard`
- **Admin UI**: `http://localhost:3001/admin/monitoring` (Next.js app)

## Components

### 1. Logger Service

Structured logging with Winston and automatic log rotation.

**Features:**
- JSON structured logs
- Multiple log levels (error, warn, info, http, debug)
- Automatic context (request ID, user ID, IP)
- Daily log rotation
- 30-day retention for errors, 14-day for HTTP logs

**Usage:**

```typescript
import { Logger, defaultLogger } from './services/logger.service.js';

// Use default logger
defaultLogger.info('User logged in', { userId: '123' });
defaultLogger.error('Database error', error, { query: 'SELECT...' });

// Create child logger with context
const logger = defaultLogger.child({ service: 'auth' });
logger.info('Authentication started');

// Logger with request context
app.use((req, res, next) => {
  req.logger = defaultLogger.withRequest(
    req.id,
    req.user?.id,
    req.ip
  );
  next();
});
```

**Log Files:**
- `logs/error-YYYY-MM-DD.log` - Error logs (30 days)
- `logs/combined-YYYY-MM-DD.log` - All logs (30 days)
- `logs/http-YYYY-MM-DD.log` - HTTP logs (14 days)

### 2. Metrics Service

Prometheus-compatible metrics collection.

**Tracked Metrics:**
- HTTP requests (total, duration, errors, active)
- API usage by endpoint/user/subscription tier
- Rate limit hits
- 2FA attempts/success/failures
- User metrics (active, registrations, logins)
- Database queries (duration, errors, connections)
- Redis commands (duration, errors, connections)
- Subscriptions (upgrades, downgrades, cancellations)
- Payments (successes, failures)
- System metrics (memory, CPU, disk)

**Usage:**

```typescript
import { metricsService } from './services/metrics.service.js';

// Record HTTP request
metricsService.recordHttpRequest('GET', '/api/users', 200, 150);

// Record database query
metricsService.recordDbQuery('SELECT', 'users', 45);

// Update active users
metricsService.updateActiveUsers(150);

// Custom metrics
metricsService.apiUsageByEndpoint.inc({
  endpoint: '/api/chat',
  userId: '123',
  subscriptionTier: 'premium'
});
```

### 3. Health Check System

Comprehensive health checks for all dependencies.

**Default Checks:**
- Database (PostgreSQL) - <100ms threshold
- Redis - <50ms threshold
- Disk space - 80% warning, 90% critical
- Memory - 85% warning, 95% critical

**Endpoints:**
- `GET /health/live` - Liveness probe (basic check)
- `GET /health/ready` - Readiness probe (full check)
- `GET /health` - Detailed health status

**Usage:**

```typescript
import { healthCheckService } from './api/health/index.js';

// Register custom health check
healthCheckService.registerCheck('external-api', async () => {
  try {
    const response = await fetch('https://api.example.com/health');
    return {
      status: response.ok ? 'pass' : 'fail',
      message: `API returned ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error.message,
    };
  }
});
```

### 4. Request Tracing

Distributed tracing for tracking requests through services.

**Features:**
- Unique request IDs
- Automatic span creation
- Performance timing per operation
- Request context propagation

**Usage:**

```typescript
import { createSpan, traceDbQuery, traceOperation } from './middleware/request-tracer.js';

// Manual span
app.get('/api/users', async (req, res) => {
  const endSpan = createSpan(req, 'fetch-users');
  try {
    const users = await db.query('SELECT * FROM users');
    endSpan();
    res.json(users);
  } catch (error) {
    endSpan(error);
    throw error;
  }
});

// Database query span
const users = await traceDbQuery(req, 'SELECT', 'users', async () => {
  return await db.query('SELECT * FROM users');
});

// Custom operation span
const result = await traceOperation(req, 'process-payment', async () => {
  return await stripe.charges.create({ ... });
}, { amount: 1000, currency: 'usd' });
```

### 5. Error Tracking

Error aggregation with Sentry integration.

**Features:**
- Error grouping by fingerprint
- Error frequency tracking
- Context capture (request, user, stack trace)
- Optional Sentry integration
- Error search and filtering

**Usage:**

```typescript
import { errorTracker } from './services/error-tracker.service.js';

// Track error manually
try {
  await dangerousOperation();
} catch (error) {
  errorTracker.trackError(error, {
    timestamp: new Date(),
    userId: req.user?.id,
    url: req.url,
    metadata: { operation: 'payment' },
  });
  throw error;
}

// Get error statistics
const stats = errorTracker.getErrorStats(3600000); // Last hour
console.log(`Error rate: ${stats.errorRate} errors/min`);

// Search errors
const errors = errorTracker.searchErrors('database timeout');
```

### 6. Performance Monitoring

APM with automatic slow query and endpoint detection.

**Thresholds:**
- Slow queries: >100ms
- Slow endpoints: >500ms
- Slow operations: >1000ms

**Usage:**

```typescript
import { performanceMonitor } from './services/performance-monitor.service.js';

// Track query (automatic with tracing)
performanceMonitor.trackQuery(
  'SELECT * FROM users WHERE status = $1',
  150,
  { table: 'users', operation: 'SELECT', requestId: req.id }
);

// Track endpoint (automatic with middleware)
performanceMonitor.trackEndpoint('/api/users', 'GET', 250, {
  statusCode: 200,
  requestId: req.id,
});

// Create timer for custom operations
const endTimer = performanceMonitor.createTimer('process-batch');
await processBatch();
endTimer();

// Get performance stats
const stats = performanceMonitor.getStats(3600000);
console.log(`P95 response time: ${stats.p95ResponseTime}ms`);
```

### 7. Alerting System

Multi-channel alerting with configurable conditions.

**Default Alert Conditions:**
- High error rate (>10 errors/min)
- High memory usage (>90%)
- Service unhealthy

**Alert Channels:**
- Email (SMTP)
- Slack (webhook)
- Custom webhook

**Usage:**

```typescript
import { alertingService } from './services/alerting.service.js';

// Register custom alert condition
alertingService.registerCondition({
  id: 'payment_failures',
  name: 'High Payment Failure Rate',
  description: 'Payment failure rate exceeds 5%',
  severity: 'critical',
  channels: ['email', 'slack'],
  enabled: true,
  cooldownMinutes: 15,
  checkFn: async () => {
    const stats = await getPaymentStats();
    return stats.failureRate > 0.05;
  },
});

// Create manual alert
await alertingService.createAlert(
  'Database Backup Failed',
  'Nightly database backup job failed',
  'critical',
  ['email', 'slack'],
  { job: 'db-backup', error: 'timeout' }
);

// Get alerts
const alerts = alertingService.getAlerts({
  severity: 'critical',
  resolved: false,
});
```

### 8. Log Aggregation

Search and analyze logs across all services.

**Features:**
- Full-text search
- Time range filtering
- User/request ID filtering
- Log level filtering
- Aggregations by level/user/endpoint

**Usage:**

```typescript
import { logAggregator } from './services/log-aggregator.service.js';

// Search logs
const results = await logAggregator.searchLogs({
  query: 'authentication failed',
  level: 'error',
  startTime: new Date(Date.now() - 3600000),
  limit: 100,
});

// Get logs for specific user
const userLogs = await logAggregator.getLogsByUserId('user-123', 50);

// Get error logs
const errors = await logAggregator.getErrorLogs(100);

// Export logs
const exportData = await logAggregator.exportLogs({
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-01-31'),
});
```

## Metrics Reference

### HTTP Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, route, status | Total HTTP requests |
| `http_request_duration_ms` | Histogram | method, route, status | Request duration in ms |
| `http_request_errors_total` | Counter | method, route, status, error | HTTP errors |
| `http_active_requests` | Gauge | - | Active requests |

### Database Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `db_query_duration_ms` | Histogram | operation, table | Query duration in ms |
| `db_query_errors_total` | Counter | operation, table, error | Database errors |
| `db_connections_active` | Gauge | - | Active connections |
| `db_connections_idle` | Gauge | - | Idle connections |

### System Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `system_memory_usage_bytes` | Gauge | - | Memory usage |
| `system_cpu_usage_percent` | Gauge | - | CPU usage |
| `system_disk_usage_bytes` | Gauge | path | Disk usage |

## Alert Configuration

### Email Alerts

```bash
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_FROM=alerts@jarvis.ai
ALERT_EMAIL_TO=admin@jarvis.ai
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Slack Alerts

1. Create a Slack incoming webhook:
   - Go to https://api.slack.com/apps
   - Create new app > Incoming Webhooks
   - Activate and create webhook for your channel
   - Copy webhook URL

2. Configure:
```bash
ALERT_SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_SLACK_CHANNEL=#alerts
```

### Custom Webhook Alerts

```bash
ALERT_WEBHOOK_ENABLED=true
ALERT_WEBHOOK_URL=https://your-webhook.com/alerts
ALERT_WEBHOOK_HEADERS={"Authorization": "Bearer token123"}
```

## Dashboard Setup

### Access the Dashboard

1. Navigate to `http://localhost:3001/admin/monitoring`
2. Dashboard auto-refreshes every 30 seconds
3. Select time window: 5min, 15min, 1hr, 24hr

### Dashboard Features

- **System Health**: Overall status, uptime, memory/CPU usage
- **Active Alerts**: Critical, warning, and info alerts
- **Performance Metrics**: Response times (avg, p95, p99)
- **Error Tracking**: Error rate, top errors by frequency
- **Slow Endpoints**: Endpoints exceeding 500ms threshold
- **Slow Queries**: Database queries exceeding 100ms threshold

### Grafana Integration

Export metrics to Grafana:

1. Install Grafana
2. Add Prometheus data source pointing to `http://localhost:3000/metrics`
3. Import dashboard from `/docs/grafana-dashboard.json`

## API Reference

### Health Endpoints

```bash
# Liveness probe
GET /health/live

# Readiness probe
GET /health/ready

# Full health check
GET /health
```

### Metrics Endpoints

```bash
# Prometheus format
GET /metrics

# JSON format
GET /metrics/json
```

### Dashboard Endpoints

```bash
# Complete dashboard data
GET /api/monitoring/dashboard?timeWindow=3600000

# Error data
GET /api/monitoring/dashboard/errors?timeWindow=3600000

# Performance data
GET /api/monitoring/dashboard/performance?timeWindow=3600000

# Alerts
GET /api/monitoring/dashboard/alerts?severity=critical&resolved=false

# Acknowledge alert
POST /api/monitoring/dashboard/alerts/:alertId/acknowledge

# Resolve alert
POST /api/monitoring/dashboard/alerts/:alertId/resolve

# System metrics
GET /api/monitoring/dashboard/system
```

## Troubleshooting

### Logs Not Appearing

1. Check log directory exists: `mkdir -p logs`
2. Check write permissions: `chmod 755 logs`
3. Check LOG_LEVEL environment variable
4. View console logs for errors

### Metrics Not Collected

1. Ensure `metricsService.initialize()` is called
2. Check middleware order (metrics middleware before routes)
3. Verify Prometheus endpoint: `curl http://localhost:3000/metrics`

### Alerts Not Sending

**Email:**
- Verify SMTP credentials
- Check firewall allows SMTP port
- Test with `npm test:alerts`

**Slack:**
- Verify webhook URL is correct
- Check webhook is active in Slack settings
- Test webhook: `curl -X POST -H 'Content-type: application/json' --data '{"text":"Test"}' WEBHOOK_URL`

### High Memory Usage

1. Check log cache size: reduce `maxCacheSize` in log-aggregator
2. Check metrics retention: reduce time window
3. Clear old logs: `find logs -name "*.log" -mtime +30 -delete`

### Performance Impact

Monitoring overhead should be <5ms per request. If higher:

1. Reduce log verbosity (set LOG_LEVEL=warn)
2. Increase metrics scrape interval
3. Disable slow request logging
4. Reduce Sentry sample rate

### Dashboard Not Loading

1. Check API URL in Next.js env: `NEXT_PUBLIC_API_URL`
2. Verify backend is running and accessible
3. Check CORS settings
4. Check browser console for errors

## Best Practices

1. **Use appropriate log levels**
   - ERROR: System errors requiring immediate attention
   - WARN: Unusual conditions that should be investigated
   - INFO: Important business events
   - DEBUG: Detailed diagnostic information

2. **Add context to logs**
   ```typescript
   logger.info('Payment processed', {
     userId: user.id,
     amount: payment.amount,
     currency: payment.currency,
   });
   ```

3. **Set up alerts for critical conditions**
   - High error rates
   - Service downtime
   - Resource exhaustion
   - Business metric anomalies

4. **Monitor in production**
   - Use Sentry for production error tracking
   - Set up Grafana for metric visualization
   - Configure alert notifications
   - Review logs regularly

5. **Performance optimization**
   - Use sampling for high-volume metrics
   - Aggregate logs before querying
   - Archive old logs to S3/cold storage
   - Use indices for log searches

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review error tracking dashboard
- Check system health at `/health`
- Contact DevOps team
