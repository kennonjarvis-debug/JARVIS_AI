import { Express } from 'express';
import autonomousRouter from './autonomous-api.js';
import { logger } from '../../utils/logger.js';
import { getFeatureStatus } from './feature-flags.js';

export function mountAutonomousFeatures(app: Express): void {
  // Mount autonomous API
  app.use('/api/autonomous', autonomousRouter);

  const features = getFeatureStatus();
  const enabledCount = Object.values(features).filter(Boolean).length;

  logger.info('✅ Autonomous features mounted at /api/autonomous');
  logger.info(`📊 Enabled features: ${enabledCount}/5`);
  logger.info('All features disabled by default - use feature flags to enable');

  // Log each feature status
  Object.entries(features).forEach(([name, enabled]) => {
    logger.info(`  ${enabled ? '✅' : '⭕'} ${name}`);
  });
}
