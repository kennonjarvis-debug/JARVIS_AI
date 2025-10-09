import { Router, Request, Response } from 'express';
import { moduleRouter } from '../../../core/module-router.js';
import { healthAggregator } from '../../../core/health-aggregator.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

/**
 * Run comprehensive health checks
 * POST /actions/testing/health
 */
router.post('/health', async (req: Request, res: Response) => {
  try {
    const {
      scope = 'all',
      includeMetrics = true,
    } = req.body;

    const validScopes = ['all', 'infrastructure', 'services', 'dependencies'];
    if (!validScopes.includes(scope)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Invalid scope. Use one of: ${validScopes.join(', ')}`,
      });
    }

    // Get health status from health aggregator
    const healthStatus = await healthAggregator.getAggregatedHealth();

    // If user wants specific scope, filter services
    let filteredServices = healthStatus.services;
    if (scope !== 'all') {
      const scopeMap: Record<string, string[]> = {
        infrastructure: ['postgres', 'redis', 'minio'],
        services: ['ai-dawg-backend', 'ai-dawg-docker', 'jarvis-web'],
        dependencies: ['vocal-coach', 'producer', 'ai-brain'],
      };
      const serviceKeys = scopeMap[scope] || [];
      filteredServices = Object.fromEntries(
        Object.entries(healthStatus.services).filter(([key]) => serviceKeys.includes(key))
      );
    }

    // Optionally call AI Dawg testing module for additional checks
    if (includeMetrics) {
      try {
        const result = await moduleRouter.execute({
          module: 'testing',
          action: 'health-metrics',
          params: { scope },
        });

        if (result.success && result.data.metrics) {
          // Merge metrics into service data
          Object.keys(filteredServices).forEach((serviceKey) => {
            if (result.data.metrics[serviceKey]) {
              filteredServices[serviceKey] = {
                ...filteredServices[serviceKey],
                ...result.data.metrics[serviceKey],
              };
            }
          });
        }
      } catch (error: any) {
        logger.warn('Failed to get extended health metrics:', error.message);
      }
    }

    res.json({
      success: true,
      status: healthStatus.status,
      services: filteredServices,
      timestamp: healthStatus.timestamp,
      summary: {
        total: Object.keys(filteredServices).length,
        healthy: Object.values(filteredServices).filter((s: any) => s.status === 'up').length,
        unhealthy: Object.values(filteredServices).filter((s: any) => s.status === 'down').length,
      },
    });
  } catch (error: any) {
    logger.error('Health check error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to run health checks. Please try again.',
    });
  }
});

/**
 * Validate system integrity
 * POST /actions/testing/validate
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const {
      validationType = 'all',
      severity = 'all',
    } = req.body;

    const validTypes = ['data', 'config', 'api', 'business-rules', 'all'];
    if (!validTypes.includes(validationType)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Invalid validation type. Use one of: ${validTypes.join(', ')}`,
      });
    }

    const validSeverities = ['critical', 'all'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Invalid severity. Use: critical or all`,
      });
    }

    // Call AI Dawg testing module
    const result = await moduleRouter.execute({
      module: 'testing',
      action: 'validate',
      params: { validationType, severity },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'ValidationError',
        message: result.error || 'Failed to run validation tests.',
      });
    }

    const issues = result.data.issues || [];
    const criticalIssues = issues.filter((i: any) => i.severity === 'critical');

    res.json({
      success: true,
      valid: criticalIssues.length === 0,
      issues: issues,
      summary: {
        total: issues.length,
        critical: criticalIssues.length,
        warnings: issues.filter((i: any) => i.severity === 'warning').length,
        info: issues.filter((i: any) => i.severity === 'info').length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Validation error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to run validation. Please try again.',
    });
  }
});

export default router;
