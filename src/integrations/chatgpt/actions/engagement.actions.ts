import { Router, Request, Response } from 'express';
import { moduleRouter } from '../../../core/module-router.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

/**
 * Analyze user sentiment and feedback
 * POST /actions/engagement/sentiment
 */
router.post('/sentiment', async (req: Request, res: Response) => {
  try {
    const {
      source = 'all',
      timeRange = 'week',
      includeTopics = true,
    } = req.body;

    const validSources = ['reviews', 'social', 'support', 'surveys', 'all'];
    if (!validSources.includes(source)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Invalid source. Use one of: ${validSources.join(', ')}`,
      });
    }

    const validRanges = ['today', 'week', 'month', 'quarter'];
    if (!validRanges.includes(timeRange)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Invalid time range. Use one of: ${validRanges.join(', ')}`,
      });
    }

    // Call AI Dawg engagement module
    const result = await moduleRouter.execute({
      module: 'engagement',
      action: 'sentiment-analysis',
      params: { source, timeRange, includeTopics },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'SentimentError',
        message: result.error || 'Failed to analyze sentiment.',
      });
    }

    res.json({
      success: true,
      data: {
        overallSentiment: result.data.overallSentiment || 'neutral',
        score: result.data.score || 0,
        distribution: result.data.distribution || { positive: 0, neutral: 0, negative: 0 },
        topTopics: includeTopics ? result.data.topTopics || [] : undefined,
        trendDirection: result.data.trendDirection || 'stable',
        sampleSize: result.data.sampleSize || 0,
      },
    });
  } catch (error: any) {
    logger.error('Sentiment analysis error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to analyze sentiment. Please try again.',
    });
  }
});

/**
 * Detect users at risk of churning
 * POST /actions/engagement/churn
 */
router.post('/churn', async (req: Request, res: Response) => {
  try {
    const {
      riskThreshold = 'medium',
      includeRecommendations = true,
      segmentBy = [],
    } = req.body;

    const validThresholds = ['high', 'medium', 'low'];
    if (!validThresholds.includes(riskThreshold)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Invalid risk threshold. Use one of: ${validThresholds.join(', ')}`,
      });
    }

    // Call AI Dawg engagement module
    const result = await moduleRouter.execute({
      module: 'engagement',
      action: 'churn-detection',
      params: { riskThreshold, includeRecommendations, segmentBy },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'ChurnError',
        message: result.error || 'Failed to detect churn risk.',
      });
    }

    res.json({
      success: true,
      data: {
        totalAtRisk: result.data.totalAtRisk || 0,
        riskDistribution: result.data.riskDistribution || { high: 0, medium: 0, low: 0 },
        topFactors: result.data.topFactors || [],
        recommendations: includeRecommendations ? result.data.recommendations || [] : undefined,
        segments: segmentBy.length > 0 ? result.data.segments : undefined,
        predictedChurnRate: result.data.predictedChurnRate || 0,
      },
    });
  } catch (error: any) {
    logger.error('Churn detection error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to detect churn. Please try again.',
    });
  }
});

/**
 * Create re-engagement campaigns
 * POST /actions/engagement/re-engage
 */
router.post('/re-engage', async (req: Request, res: Response) => {
  try {
    const {
      targetSegment,
      campaignType = 'email',
      personalization = true,
      incentive,
    } = req.body;

    if (!targetSegment || typeof targetSegment !== 'string') {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Target segment is required (e.g., "dormant_30days").',
      });
    }

    const validTypes = ['email', 'push', 'sms', 'in-app'];
    if (!validTypes.includes(campaignType)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Invalid campaign type. Use one of: ${validTypes.join(', ')}`,
      });
    }

    // Call AI Dawg engagement module
    const result = await moduleRouter.execute({
      module: 'engagement',
      action: 're-engagement',
      params: { targetSegment, campaignType, personalization, incentive },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'ReEngagementError',
        message: result.error || 'Failed to create re-engagement campaign.',
      });
    }

    res.json({
      success: true,
      campaignId: result.data.campaignId || null,
      estimatedReach: result.data.estimatedReach || 0,
      scheduledFor: result.data.scheduledFor || null,
      message: 'Re-engagement campaign created successfully. Users will be contacted soon.',
    });
  } catch (error: any) {
    logger.error('Re-engagement error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create re-engagement campaign. Please try again.',
    });
  }
});

export default router;
