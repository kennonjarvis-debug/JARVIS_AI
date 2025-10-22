import { Router, Request, Response } from 'express';
import { metricsService } from '../../services/metrics.service.js';
import { errorTracker } from '../../services/error-tracker.service.js';
import { performanceMonitor } from '../../services/performance-monitor.service.js';
import { alertingService } from '../../services/alerting.service.js';
import { healthCheckService } from '../health/index.js';
import { defaultLogger } from '../../services/logger.service.js';

export const dashboardRouter = Router();

/**
 * GET /dashboard
 * Get comprehensive dashboard data
 */
dashboardRouter.get('/', async (req: Request, res: Response) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 3600000; // Default 1 hour

    // Get all monitoring data
    const [
      healthCheck,
      errorStats,
      performanceStats,
      alerts,
      metricsJSON,
    ] = await Promise.all([
      healthCheckService.performHealthCheck(),
      Promise.resolve(errorTracker.getErrorStats(timeWindow)),
      Promise.resolve(performanceMonitor.getStats(timeWindow)),
      Promise.resolve(alertingService.getAlerts({ resolved: false })),
      metricsService.getMetricsJSON(),
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeWindow,
      data: {
        health: healthCheck,
        errors: {
          totalErrors: errorStats.totalErrors,
          errorRate: errorStats.errorRate,
          topErrors: errorStats.topErrors.slice(0, 10),
          errorsByType: Object.fromEntries(errorStats.errorsByType),
          errorsByEndpoint: Object.fromEntries(errorStats.errorsByEndpoint),
        },
        performance: {
          averageResponseTime: performanceStats.averageResponseTime,
          p95ResponseTime: performanceStats.p95ResponseTime,
          p99ResponseTime: performanceStats.p99ResponseTime,
          slowestQueries: performanceStats.slowestQueries.slice(0, 10),
          slowestEndpoints: performanceStats.slowestEndpoints.slice(0, 10),
          memory: performanceStats.memoryUsage,
          cpu: performanceStats.cpuUsage,
        },
        alerts: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          recent: alerts.slice(0, 10),
        },
        metrics: metricsJSON,
      },
    });
  } catch (error) {
    defaultLogger.error('Error getting dashboard data', error);
    res.status(500).json({
      error: 'Failed to get dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /dashboard/errors
 * Get error tracking data
 */
dashboardRouter.get('/errors', async (req: Request, res: Response) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 3600000;
    const stats = errorTracker.getErrorStats(timeWindow);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeWindow,
      data: {
        totalErrors: stats.totalErrors,
        errorRate: stats.errorRate,
        topErrors: stats.topErrors,
        errorsByType: Object.fromEntries(stats.errorsByType),
        errorsByEndpoint: Object.fromEntries(stats.errorsByEndpoint),
      },
    });
  } catch (error) {
    defaultLogger.error('Error getting error data', error);
    res.status(500).json({
      error: 'Failed to get error data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /dashboard/performance
 * Get performance monitoring data
 */
dashboardRouter.get('/performance', async (req: Request, res: Response) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 3600000;
    const stats = performanceMonitor.getStats(timeWindow);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeWindow,
      data: stats,
    });
  } catch (error) {
    defaultLogger.error('Error getting performance data', error);
    res.status(500).json({
      error: 'Failed to get performance data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /dashboard/alerts
 * Get alerts
 */
dashboardRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const severity = req.query.severity as any;
    const acknowledged = req.query.acknowledged === 'true' ? true :
                        req.query.acknowledged === 'false' ? false : undefined;
    const resolved = req.query.resolved === 'true' ? true :
                    req.query.resolved === 'false' ? false : undefined;

    const alerts = alertingService.getAlerts({
      severity,
      acknowledged,
      resolved,
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        total: alerts.length,
        alerts,
      },
    });
  } catch (error) {
    defaultLogger.error('Error getting alerts', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /dashboard/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
dashboardRouter.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).user?.id;

    alertingService.acknowledgeAlert(alertId, userId);

    res.json({
      success: true,
      message: 'Alert acknowledged',
    });
  } catch (error) {
    defaultLogger.error('Error acknowledging alert', error);
    res.status(500).json({
      error: 'Failed to acknowledge alert',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /dashboard/alerts/:alertId/resolve
 * Resolve an alert
 */
dashboardRouter.post('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;

    alertingService.resolveAlert(alertId);

    res.json({
      success: true,
      message: 'Alert resolved',
    });
  } catch (error) {
    defaultLogger.error('Error resolving alert', error);
    res.status(500).json({
      error: 'Failed to resolve alert',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /dashboard/system
 * Get system metrics
 */
dashboardRouter.get('/system', async (req: Request, res: Response) => {
  try {
    const health = await healthCheckService.performHealthCheck();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        uptime: process.uptime(),
        system: health.system,
        checks: health.checks,
        status: health.status,
      },
    });
  } catch (error) {
    defaultLogger.error('Error getting system metrics', error);
    res.status(500).json({
      error: 'Failed to get system metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default dashboardRouter;
