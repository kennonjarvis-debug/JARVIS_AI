import { Router, Request, Response } from 'express';
import { isFeatureEnabled, getFeatureStatus, enableFeature, disableFeature, disableAllFeatures } from './feature-flags.js';
import { logger } from '../../utils/logger.js';
import intelligenceRouter from '../intelligence/api.js';
import domainsRouter from '../domains/api.js';

export const autonomousRouter = Router();

// Mount intelligence engine routes
autonomousRouter.use('/intelligence', intelligenceRouter);

// Mount domain agents routes (Claude B)
autonomousRouter.use('/domains', domainsRouter);

/**
 * Health check for autonomous features
 * GET /api/autonomous/health
 */
autonomousRouter.get('/health', (req: Request, res: Response) => {
  const features = getFeatureStatus();
  const enabledCount = Object.values(features).filter(Boolean).length;

  res.json({
    status: 'operational',
    enabled: enabledCount > 0,
    features,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get feature status
 * GET /api/autonomous/features
 */
autonomousRouter.get('/features', (req: Request, res: Response) => {
  res.json({
    success: true,
    features: getFeatureStatus(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Toggle specific feature (admin only)
 * POST /api/autonomous/features/:feature/toggle
 */
autonomousRouter.post('/features/:feature/toggle', (req: Request, res: Response) => {
  const { feature } = req.params;
  const { enabled } = req.body;

  try {
    if (enabled) {
      enableFeature(feature as any);
      logger.info(`Feature enabled: ${feature}`);
    } else {
      disableFeature(feature as any);
      logger.info(`Feature disabled: ${feature}`);
    }

    res.json({
      success: true,
      feature,
      enabled: isFeatureEnabled(feature as any),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Disable all autonomous features (emergency rollback)
 * POST /api/autonomous/features/disable-all
 */
autonomousRouter.post('/features/disable-all', (req: Request, res: Response) => {
  disableAllFeatures();
  logger.warn('All autonomous features disabled');

  res.json({
    success: true,
    message: 'All autonomous features disabled',
    features: getFeatureStatus(),
    timestamp: new Date().toISOString()
  });
});

export default autonomousRouter;
