import { Router, Request, Response } from 'express';
import { patternDetector } from './pattern-detector.js';
import { goalTracker } from './goal-tracker.js';
import { insightEngine } from './insight-engine.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';
// Adaptive Engine V2 (Claude A)
import { adaptiveEngine } from '../adaptive/adaptive-engine.js';
import { insightEngine as adaptiveInsightEngine } from '../adaptive/insight-engine.js';
import axios from 'axios';

export const intelligenceRouter = Router();

/**
 * Get user patterns
 * GET /api/autonomous/intelligence/patterns/:userId
 */
intelligenceRouter.get('/patterns/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const patterns = await patternDetector.detectPatterns(req.params.userId);
    res.json({
      success: true,
      patterns
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create a goal
 * POST /api/autonomous/intelligence/goals
 */
intelligenceRouter.post('/goals', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const goal = await goalTracker.createGoal(req.body);
    res.json({
      success: true,
      goal
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user goals
 * GET /api/autonomous/intelligence/goals/:userId
 */
intelligenceRouter.get('/goals/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const status = req.query.status as any;
    const goals = await goalTracker.getUserGoals(req.params.userId, status);
    res.json({
      success: true,
      goals
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update goal progress
 * POST /api/autonomous/intelligence/goals/:userId/:goalId/progress
 */
intelligenceRouter.post('/goals/:userId/:goalId/progress', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const { userId, goalId } = req.params;
    const { current } = req.body;

    await goalTracker.updateGoalProgress(userId, goalId, current);
    const progress = await goalTracker.getGoalProgress(userId, goalId);

    res.json({
      success: true,
      progress
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get insights for user
 * GET /api/autonomous/intelligence/insights/:userId
 */
intelligenceRouter.get('/insights/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const insights = await insightEngine.generateInsights(req.params.userId);
    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get actionable insights
 * GET /api/autonomous/intelligence/insights/:userId/actionable
 */
intelligenceRouter.get('/insights/:userId/actionable', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const insights = await insightEngine.getActionableInsights(req.params.userId);
    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ADAPTIVE ENGINE V2 (Claude A) ENDPOINTS
 */

/**
 * Get adaptive engine status
 * GET /api/autonomous/intelligence/adaptive/status
 */
intelligenceRouter.get('/adaptive/status', (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  const state = adaptiveEngine.getState();
  const metrics = adaptiveEngine.getMetrics();

  res.json({
    success: true,
    data: { state, metrics },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get learning metrics
 * GET /api/autonomous/intelligence/adaptive/metrics
 */
intelligenceRouter.get('/adaptive/metrics', (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  res.json({
    success: true,
    data: adaptiveEngine.getMetrics(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Get adaptive insights
 * GET /api/autonomous/intelligence/adaptive/insights
 */
intelligenceRouter.get('/adaptive/insights', (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  const limit = parseInt(req.query.limit as string) || 10;
  const insights = adaptiveInsightEngine.getRecentInsights(limit);

  res.json({
    success: true,
    data: insights,
    timestamp: new Date().toISOString()
  });
});

/**
 * Provide feedback on adaptive decision
 * POST /api/autonomous/intelligence/adaptive/feedback
 */
intelligenceRouter.post('/adaptive/feedback', (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  const { decisionId, outcome } = req.body;

  if (!decisionId || !outcome) {
    return res.status(400).json({
      success: false,
      error: 'decisionId and outcome are required'
    });
  }

  adaptiveEngine.provideFeedback(decisionId, outcome);

  res.json({
    success: true,
    message: 'Feedback recorded',
    timestamp: new Date().toISOString()
  });
});

/**
 * Enable/disable adaptive learning
 * POST /api/autonomous/intelligence/adaptive/toggle
 */
intelligenceRouter.post('/adaptive/toggle', (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  const { enabled } = req.body;

  if (enabled) {
    adaptiveEngine.enable();
  } else {
    adaptiveEngine.disable();
  }

  res.json({
    success: true,
    message: `Adaptive learning ${enabled ? 'enabled' : 'disabled'}`,
    state: adaptiveEngine.getState(),
    timestamp: new Date().toISOString()
  });
});

/**
 * PYTHON ADAPTIVE AI INTEGRATION (Option B)
 * Connects to Python adaptive AI service on port 8003
 */

const ADAPTIVE_AI_URL = process.env.ADAPTIVE_AI_URL || 'http://localhost:8003';

/**
 * Predict user intent using Python adaptive AI
 * POST /api/autonomous/intelligence/adaptive/predict-intent
 *
 * Body: {
 *   context: string,
 *   userId: string,
 *   recentActions?: string[]
 * }
 */
intelligenceRouter.post('/adaptive/predict-intent', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  try {
    const { context, userId, recentActions } = req.body;

    if (!context || !userId) {
      return res.status(400).json({
        success: false,
        error: 'context and userId are required'
      });
    }

    const response = await axios.post(
      `${ADAPTIVE_AI_URL}/predict-intent`,
      { context, userId, recentActions },
      {
        headers: {
          'Authorization': req.headers.authorization || '',
          'X-Jarvis-URL': process.env.JARVIS_URL || 'http://localhost:4000'
        },
        timeout: 10000
      }
    );

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Adaptive AI service not available. Start with ./launch-adaptive-ai.sh'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate adaptive code using Python AI
 * POST /api/autonomous/intelligence/adaptive/generate-code
 *
 * Body: {
 *   intent: string,
 *   context: object,
 *   patterns?: object
 * }
 */
intelligenceRouter.post('/adaptive/generate-code', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  try {
    const { intent, context, patterns } = req.body;

    if (!intent) {
      return res.status(400).json({
        success: false,
        error: 'intent is required'
      });
    }

    const response = await axios.post(
      `${ADAPTIVE_AI_URL}/generate-code`,
      { intent, context: context || {}, patterns },
      {
        headers: {
          'Authorization': req.headers.authorization || ''
        },
        timeout: 10000
      }
    );

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Adaptive AI service not available. Start with ./launch-adaptive-ai.sh'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Learn from user action
 * POST /api/autonomous/intelligence/adaptive/learn
 *
 * Body: {
 *   action: string,
 *   context: string,
 *   success?: boolean,
 *   hour?: number
 * }
 */
intelligenceRouter.post('/adaptive/learn', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  try {
    const { action, context, success, hour } = req.body;

    if (!action || !context) {
      return res.status(400).json({
        success: false,
        error: 'action and context are required'
      });
    }

    const response = await axios.post(
      `${ADAPTIVE_AI_URL}/learn-pattern`,
      { action, context, success: success ?? true, hour: hour ?? new Date().getHours() },
      {
        headers: {
          'Authorization': req.headers.authorization || ''
        },
        timeout: 5000
      }
    );

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Adaptive AI service not available. Start with ./launch-adaptive-ai.sh'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get adaptive AI statistics
 * GET /api/autonomous/intelligence/adaptive/ai-stats
 */
intelligenceRouter.get('/adaptive/ai-stats', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  try {
    const userId = req.query.userId as string;

    const response = await axios.get(
      `${ADAPTIVE_AI_URL}/stats`,
      {
        params: { userId },
        headers: {
          'Authorization': req.headers.authorization || ''
        },
        timeout: 5000
      }
    );

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Adaptive AI service not available. Start with ./launch-adaptive-ai.sh'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check for adaptive AI service
 * GET /api/autonomous/intelligence/adaptive/ai-health
 */
intelligenceRouter.get('/adaptive/ai-health', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${ADAPTIVE_AI_URL}/health`, { timeout: 3000 });

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: 'Adaptive AI service not available',
      details: error.message
    });
  }
});

export default intelligenceRouter;
