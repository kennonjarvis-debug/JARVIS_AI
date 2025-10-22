import { Router, Request, Response } from 'express';
import { metricsService } from '../../services/metrics.service.js';
import { defaultLogger } from '../../services/logger.service.js';

export const prometheusRouter = Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
prometheusRouter.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    defaultLogger.error('Error getting Prometheus metrics', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /metrics/json
 * Get metrics in JSON format
 */
prometheusRouter.get('/json', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetricsJSON();

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    defaultLogger.error('Error getting metrics JSON', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default prometheusRouter;
