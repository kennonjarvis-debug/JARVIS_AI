import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { defaultLogger } from './logger.service.js';

export class MetricsService {
  private registry: Registry;
  private initialized: boolean = false;

  // HTTP Metrics
  public httpRequestsTotal: Counter;
  public httpRequestDuration: Histogram;
  public httpRequestErrors: Counter;
  public httpActiveRequests: Gauge;

  // API Metrics
  public apiUsageByEndpoint: Counter;
  public apiRateLimitHits: Counter;
  public api2FAAttempts: Counter;
  public api2FASuccess: Counter;
  public api2FAFailures: Counter;

  // User Metrics
  public activeUsers: Gauge;
  public userRegistrations: Counter;
  public userLogins: Counter;
  public userLoginFailures: Counter;

  // Database Metrics
  public dbQueryDuration: Histogram;
  public dbQueryErrors: Counter;
  public dbConnectionsActive: Gauge;
  public dbConnectionsIdle: Gauge;

  // Redis Metrics
  public redisCommandDuration: Histogram;
  public redisConnectionsActive: Gauge;
  public redisErrors: Counter;

  // Business Metrics
  public subscriptionUpgrades: Counter;
  public subscriptionDowngrades: Counter;
  public subscriptionCancellations: Counter;
  public paymentSuccesses: Counter;
  public paymentFailures: Counter;

  // System Metrics
  public systemMemoryUsage: Gauge;
  public systemCPUUsage: Gauge;
  public systemDiskUsage: Gauge;

  constructor() {
    this.registry = new Registry();

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status', 'error'],
      registers: [this.registry],
    });

    this.httpActiveRequests = new Gauge({
      name: 'http_active_requests',
      help: 'Number of active HTTP requests',
      registers: [this.registry],
    });

    // API Metrics
    this.apiUsageByEndpoint = new Counter({
      name: 'api_usage_by_endpoint_total',
      help: 'API usage by endpoint',
      labelNames: ['endpoint', 'userId', 'subscriptionTier'],
      registers: [this.registry],
    });

    this.apiRateLimitHits = new Counter({
      name: 'api_rate_limit_hits_total',
      help: 'Number of rate limit hits',
      labelNames: ['endpoint', 'userId', 'limitType'],
      registers: [this.registry],
    });

    this.api2FAAttempts = new Counter({
      name: 'api_2fa_attempts_total',
      help: 'Total 2FA authentication attempts',
      labelNames: ['method', 'userId'],
      registers: [this.registry],
    });

    this.api2FASuccess = new Counter({
      name: 'api_2fa_success_total',
      help: 'Successful 2FA authentications',
      labelNames: ['method', 'userId'],
      registers: [this.registry],
    });

    this.api2FAFailures = new Counter({
      name: 'api_2fa_failures_total',
      help: 'Failed 2FA authentications',
      labelNames: ['method', 'userId'],
      registers: [this.registry],
    });

    // User Metrics
    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of active users in the last 5 minutes',
      registers: [this.registry],
    });

    this.userRegistrations = new Counter({
      name: 'user_registrations_total',
      help: 'Total user registrations',
      registers: [this.registry],
    });

    this.userLogins = new Counter({
      name: 'user_logins_total',
      help: 'Total user logins',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.userLoginFailures = new Counter({
      name: 'user_login_failures_total',
      help: 'Total failed login attempts',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    // Database Metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_ms',
      help: 'Database query duration in milliseconds',
      labelNames: ['operation', 'table'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
      registers: [this.registry],
    });

    this.dbQueryErrors = new Counter({
      name: 'db_query_errors_total',
      help: 'Total database query errors',
      labelNames: ['operation', 'table', 'error'],
      registers: [this.registry],
    });

    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    this.dbConnectionsIdle = new Gauge({
      name: 'db_connections_idle',
      help: 'Number of idle database connections',
      registers: [this.registry],
    });

    // Redis Metrics
    this.redisCommandDuration = new Histogram({
      name: 'redis_command_duration_ms',
      help: 'Redis command duration in milliseconds',
      labelNames: ['command'],
      buckets: [1, 5, 10, 25, 50, 100, 250],
      registers: [this.registry],
    });

    this.redisConnectionsActive = new Gauge({
      name: 'redis_connections_active',
      help: 'Number of active Redis connections',
      registers: [this.registry],
    });

    this.redisErrors = new Counter({
      name: 'redis_errors_total',
      help: 'Total Redis errors',
      labelNames: ['command', 'error'],
      registers: [this.registry],
    });

    // Business Metrics
    this.subscriptionUpgrades = new Counter({
      name: 'subscription_upgrades_total',
      help: 'Total subscription upgrades',
      labelNames: ['fromTier', 'toTier'],
      registers: [this.registry],
    });

    this.subscriptionDowngrades = new Counter({
      name: 'subscription_downgrades_total',
      help: 'Total subscription downgrades',
      labelNames: ['fromTier', 'toTier'],
      registers: [this.registry],
    });

    this.subscriptionCancellations = new Counter({
      name: 'subscription_cancellations_total',
      help: 'Total subscription cancellations',
      labelNames: ['tier', 'reason'],
      registers: [this.registry],
    });

    this.paymentSuccesses = new Counter({
      name: 'payment_successes_total',
      help: 'Total successful payments',
      labelNames: ['tier', 'amount'],
      registers: [this.registry],
    });

    this.paymentFailures = new Counter({
      name: 'payment_failures_total',
      help: 'Total failed payments',
      labelNames: ['tier', 'reason'],
      registers: [this.registry],
    });

    // System Metrics
    this.systemMemoryUsage = new Gauge({
      name: 'system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      registers: [this.registry],
    });

    this.systemCPUUsage = new Gauge({
      name: 'system_cpu_usage_percent',
      help: 'System CPU usage percentage',
      registers: [this.registry],
    });

    this.systemDiskUsage = new Gauge({
      name: 'system_disk_usage_bytes',
      help: 'System disk usage in bytes',
      labelNames: ['path'],
      registers: [this.registry],
    });
  }

  /**
   * Initialize metrics collection
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Collect default metrics (CPU, memory, etc.)
      collectDefaultMetrics({
        register: this.registry,
        prefix: 'jarvis_',
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      });

      // Start periodic system metrics collection
      this.startSystemMetricsCollection();

      this.initialized = true;
      defaultLogger.info('Metrics service initialized');
    } catch (error) {
      defaultLogger.error('Failed to initialize metrics service', error);
      throw error;
    }
  }

  /**
   * Start collecting system metrics periodically
   */
  private startSystemMetricsCollection() {
    setInterval(() => {
      try {
        // Memory usage
        const memUsage = process.memoryUsage();
        this.systemMemoryUsage.set(memUsage.heapUsed);

        // CPU usage (approximation)
        const cpuUsage = process.cpuUsage();
        const totalCPU = cpuUsage.user + cpuUsage.system;
        this.systemCPUUsage.set(totalCPU / 1000000); // Convert to percentage
      } catch (error) {
        defaultLogger.error('Error collecting system metrics', error);
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.inc({ method, route, status: statusCode });
    this.httpRequestDuration.observe({ method, route, status: statusCode }, duration);

    if (statusCode >= 400) {
      this.httpRequestErrors.inc({ method, route, status: statusCode, error: 'http_error' });
    }
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(operation: string, table: string, duration: number, error?: Error) {
    this.dbQueryDuration.observe({ operation, table }, duration);

    if (error) {
      this.dbQueryErrors.inc({ operation, table, error: error.name });
    }
  }

  /**
   * Record Redis command metrics
   */
  recordRedisCommand(command: string, duration: number, error?: Error) {
    this.redisCommandDuration.observe({ command }, duration);

    if (error) {
      this.redisErrors.inc({ command, error: error.name });
    }
  }

  /**
   * Update active users count
   */
  updateActiveUsers(count: number) {
    this.activeUsers.set(count);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    try {
      return await this.registry.metrics();
    } catch (error) {
      defaultLogger.error('Error getting metrics', error);
      throw error;
    }
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJSON(): Promise<any> {
    try {
      const metrics = await this.registry.getMetricsAsJSON();
      return metrics;
    } catch (error) {
      defaultLogger.error('Error getting metrics JSON', error);
      throw error;
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.registry.resetMetrics();
    defaultLogger.info('Metrics reset');
  }

  /**
   * Get registry for custom metrics
   */
  getRegistry(): Registry {
    return this.registry;
  }
}

// Singleton instance
export const metricsService = new MetricsService();

// Middleware for automatic HTTP metrics collection
export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();

  // Increment active requests
  metricsService.httpActiveRequests.inc();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path || 'unknown';

    metricsService.recordHttpRequest(
      req.method,
      route,
      res.statusCode,
      duration
    );

    // Decrement active requests
    metricsService.httpActiveRequests.dec();
  });

  next();
}

export default metricsService;
