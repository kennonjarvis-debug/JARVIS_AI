import { Router, Request, Response } from 'express';
import { moduleRouter } from '../../../core/module-router.js';
import { jobManager } from '../job-manager.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

/**
 * Generate music from text description
 * POST /actions/music/generate
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, duration = 30, genre, mood } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'A text prompt is required to generate music.',
      });
    }

    // Create async job for music generation
    const jobId = await jobManager.executeJob(
      'music_generation',
      async (job) => {
        // Simulate progress updates (in real scenario, this would come from the AI service)
        jobManager.updateProgress(job.id, 10, 40);

        // Call AI Dawg music module
        const result = await moduleRouter.execute({
          module: 'music',
          action: 'generate',
          params: { prompt, duration, genre, mood },
        });

        jobManager.updateProgress(job.id, 90, 5);

        if (!result.success) {
          throw new Error(result.error || 'Music generation failed');
        }

        return result.data;
      },
      { prompt, duration, genre, mood }
    );

    res.json({
      success: true,
      jobId,
      estimatedTime: Math.ceil(duration * 1.5), // Rough estimate
      message: "Music generation started. Check job status to get your track when it's ready.",
    });
  } catch (error: any) {
    logger.error('Music generation error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to start music generation. Please try again.',
    });
  }
});

/**
 * Analyze music track characteristics
 * POST /actions/music/analyze
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { audioUrl, analyzeVocals = false } = req.body;

    if (!audioUrl || typeof audioUrl !== 'string') {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'An audio URL is required for analysis.',
      });
    }

    // Call AI Dawg music module
    const result = await moduleRouter.execute({
      module: 'music',
      action: 'analyze',
      params: { audioUrl, analyzeVocals },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'AnalysisError',
        message: result.error || 'Music analysis failed. Please check the audio URL and try again.',
      });
    }

    res.json({
      success: true,
      data: {
        tempo: result.data.tempo || null,
        key: result.data.key || null,
        genre: result.data.genre || null,
        mood: result.data.mood || null,
        duration: result.data.duration || null,
        structure: result.data.structure || [],
        vocals: analyzeVocals ? result.data.vocals : undefined,
      },
    });
  } catch (error: any) {
    logger.error('Music analysis error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to analyze music. Please try again.',
    });
  }
});

/**
 * Validate music file quality
 * POST /actions/music/validate
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { audioUrl, standards = 'streaming' } = req.body;

    if (!audioUrl || typeof audioUrl !== 'string') {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'An audio URL is required for validation.',
      });
    }

    if (!['streaming', 'broadcast', 'mastering'].includes(standards)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid standard. Use: streaming, broadcast, or mastering.',
      });
    }

    // Call AI Dawg music module
    const result = await moduleRouter.execute({
      module: 'music',
      action: 'validate',
      params: { audioUrl, standards },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'ValidationError',
        message: result.error || 'Music validation failed. Please check the audio URL and try again.',
      });
    }

    res.json({
      success: true,
      valid: result.data.valid || false,
      issues: result.data.issues || [],
      metrics: result.data.metrics || {},
    });
  } catch (error: any) {
    logger.error('Music validation error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to validate music. Please try again.',
    });
  }
});

export default router;
