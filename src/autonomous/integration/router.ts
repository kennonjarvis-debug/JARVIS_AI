/**
 * Autonomous Integration Router
 * API endpoints for autonomous task execution
 */

import express, { Request, Response } from 'express';
import { autonomousEngine } from './engine.js';
import { logger } from '../../utils/logger.js';
import type { ExecutionStrategy, AIModel } from './types.js';

const router = express.Router();

/**
 * POST /api/v1/autonomous/execute
 * Execute an autonomous task
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    if (!autonomousEngine.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Autonomous features are disabled',
        message: 'Enable autonomous features first with POST /api/v1/autonomous/enable'
      });
    }

    const {
      description,
      complexity = 'moderate',
      priority = 'medium',
      models,
      strategy = { type: 'parallel' },
      context
    } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: description'
      });
    }

    // Create task
    const task = autonomousEngine.createTask(description, {
      complexity,
      priority,
      models,
      context
    });

    // Execute task
    const result = await autonomousEngine.executeTask(task, strategy as ExecutionStrategy);

    res.json({
      success: true,
      task,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error(`Autonomous execution failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Execution failed',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/autonomous/enable
 * Enable autonomous features (opt-in)
 */
router.post('/enable', (req: Request, res: Response) => {
  try {
    autonomousEngine.enable();

    res.json({
      success: true,
      message: 'Autonomous features enabled',
      stats: autonomousEngine.getStats(),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error(`Failed to enable autonomous features: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/autonomous/disable
 * Disable autonomous features
 */
router.post('/disable', (req: Request, res: Response) => {
  try {
    autonomousEngine.disable();

    res.json({
      success: true,
      message: 'Autonomous features disabled',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error(`Failed to disable autonomous features: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/autonomous/status
 * Get autonomous engine status
 */
router.get('/status', (req: Request, res: Response) => {
  const stats = autonomousEngine.getStats();

  res.json({
    success: true,
    enabled: autonomousEngine.isReady(),
    stats,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/autonomous/models
 * List available AI models
 */
router.get('/models', (req: Request, res: Response) => {
  const models = autonomousEngine.listModels();

  res.json({
    success: true,
    models,
    count: models.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/autonomous/models/:modelName
 * Get specific model configuration
 */
router.get('/models/:modelName', (req: Request, res: Response) => {
  const { modelName } = req.params;
  const config = autonomousEngine.getModelConfig(modelName as AIModel);

  if (!config) {
    return res.status(404).json({
      success: false,
      error: 'Model not found',
      available: autonomousEngine.listModels().map(m => m.name)
    });
  }

  res.json({
    success: true,
    model: config,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/v1/autonomous/strategies/recommend
 * Recommend execution strategy based on task
 */
router.post('/strategies/recommend', (req: Request, res: Response) => {
  try {
    const { description, complexity = 'moderate', constraints } = req.body;

    // Recommend strategy based on task characteristics
    let recommendedStrategy: ExecutionStrategy;

    if (complexity === 'simple') {
      recommendedStrategy = {
        type: 'cascading',
        fallbackChain: ['gemini', 'gpt4o']
      };
    } else if (complexity === 'complex' || constraints?.requireConsensus) {
      recommendedStrategy = {
        type: 'voting',
        modelSelection: ['claude', 'gpt4', 'gemini'],
        consensusThreshold: 0.7
      };
    } else {
      recommendedStrategy = {
        type: 'parallel',
        modelSelection: ['claude', 'gpt4o']
      };
    }

    res.json({
      success: true,
      recommended: recommendedStrategy,
      reasoning: getStrategyReasoning(recommendedStrategy.type, complexity),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error(`Strategy recommendation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper: Get strategy reasoning
 */
function getStrategyReasoning(type: string, complexity: string): string {
  const reasoningMap: Record<string, string> = {
    parallel: 'Best for balanced tasks requiring multiple perspectives with fast execution',
    sequential: 'Best for tasks requiring fallback options and cost optimization',
    cascading: 'Best for simple tasks that may need escalation to more powerful models',
    voting: 'Best for critical tasks requiring consensus and high confidence'
  };

  return reasoningMap[type] || 'Recommended based on task analysis';
}

export default router;
