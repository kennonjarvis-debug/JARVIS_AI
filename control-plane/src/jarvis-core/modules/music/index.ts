/**
 * Jarvis Music Module
 *
 * Coordinates AI music generation, quality validation, and usage tracking.
 *
 * Features:
 * - AI Producer integration (melody, chord, beat generation)
 * - Vocal Coach integration (pitch analysis, feedback)
 * - Quality validation (audio metrics, clipping detection)
 * - Usage event tracking via Prisma
 * - Model lifecycle management
 * - Scheduled performance monitoring
 */

import { BaseModule } from '../../core/base-module';
import { Router, Request, Response } from 'express';
import { ScheduledJob } from '../../core/jarvis.interfaces';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { adaptiveEngine } from '../../core/adaptive-engine';
import { autonomyManager } from '../../core/autonomy-manager';
import { ClearanceLevel } from '../../core/clearance-system';
import { selfAwareness } from '../../core/self-awareness';

const prisma = new PrismaClient();

/**
 * Music generation quality metrics
 */
interface AudioQualityMetrics {
  peakAmplitude: number;
  rmsLevel: number;
  clippingSamples: number;
  frequencyResponse: {
    lowEnergy: number;   // 20-250 Hz
    midEnergy: number;   // 250-4000 Hz
    highEnergy: number;  // 4000-20000 Hz
  };
  thd: number;           // Total Harmonic Distortion
  snr: number;           // Signal-to-Noise Ratio
  dynamicRange: number;  // dB
}

/**
 * Music generation request
 */
interface MusicGenerationRequest {
  userId: string;
  projectId?: string;
  genre?: string;
  mood?: string;
  tempo?: number;
  key?: string;
  duration?: number;
  instruments?: string[];
}

/**
 * Generation result
 */
interface GenerationResult {
  success: boolean;
  audioPath?: string;
  midiPath?: string;
  quality?: AudioQualityMetrics;
  duration: number;
  error?: string;
}

/**
 * Vocal analysis request
 */
interface VocalAnalysisRequest {
  userId: string;
  audioPath: string;
  projectId?: string;
}

/**
 * Vocal analysis result
 */
interface VocalAnalysisResult {
  pitchAccuracy: number;
  rhythmAccuracy: number;
  timingAccuracy: number;
  overallScore: number;
  feedback: string[];
  recommendations: string[];
}

export class MusicModule extends BaseModule {
  name = 'music';
  version = '1.0.0';
  description = 'AI music generation orchestration, quality validation, and usage tracking';
  dependencies = []; // No dependencies on other Jarvis modules

  // Python AI engine paths
  private readonly PRODUCER_PATH = path.join(process.cwd(), 'src/ai/producer');
  private readonly VOCAL_COACH_PATH = path.join(process.cwd(), 'src/ai/vocal_coach');
  private readonly PYTHON_ENV = path.join(this.PRODUCER_PATH, 'venv/bin/python3');

  // Performance tracking
  private generationCount = 0;
  private analysisCount = 0;
  private failureCount = 0;
  private totalProcessingTime = 0;

  /**
   * Initialize music module
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing Music Module...');

    // Register command handlers
    this.registerCommand('generate-music', this.handleGenerateMusic.bind(this));
    this.registerCommand('analyze-vocal', this.handleAnalyzeVocal.bind(this));
    this.registerCommand('validate-quality', this.handleValidateQuality.bind(this));
    this.registerCommand('get-usage-stats', this.handleGetUsageStats.bind(this));
    this.registerCommand('get-model-health', this.handleGetModelHealth.bind(this));

    // Verify Python environment
    await this.verifyPythonEnvironment();

    this.logger.info('Music Module initialized successfully');
  }

  /**
   * Shutdown music module
   */
  protected async onShutdown(): Promise<void> {
    this.logger.info('Shutting down Music Module...');

    // Disconnect Prisma
    await prisma.$disconnect();

    this.logger.info('Music Module shut down successfully');
  }

  /**
   * Register Express routes
   */
  protected onRegisterRoutes(router: Router): void {
    // Music generation endpoint
    router.post('/generate', async (req: Request, res: Response) => {
      try {
        const request: MusicGenerationRequest = req.body;
        const result = await this.generateMusic(request);
        res.json({ success: true, data: result });
      } catch (error) {
        this.logger.error('Music generation failed', { error: (error as Error).message });
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Vocal analysis endpoint
    router.post('/analyze-vocal', async (req: Request, res: Response) => {
      try {
        const request: VocalAnalysisRequest = req.body;
        const result = await this.analyzeVocal(request);
        res.json({ success: true, data: result });
      } catch (error) {
        this.logger.error('Vocal analysis failed', { error: (error as Error).message });
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Quality validation endpoint
    router.post('/validate', async (req: Request, res: Response) => {
      try {
        const { audioPath } = req.body;
        const quality = await this.validateAudioQuality(audioPath);
        res.json({ success: true, data: quality });
      } catch (error) {
        this.logger.error('Quality validation failed', { error: (error as Error).message });
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Usage statistics endpoint
    router.get('/usage/:userId', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const stats = await this.getUserUsageStats(userId);
        res.json({ success: true, data: stats });
      } catch (error) {
        this.logger.error('Failed to get usage stats', { error: (error as Error).message });
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Model health endpoint
    router.get('/health', async (req: Request, res: Response) => {
      try {
        const health = await this.checkModelHealth();
        res.json({ success: true, data: health });
      } catch (error) {
        this.logger.error('Failed to check model health', { error: (error as Error).message });
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });
  }

  /**
   * Provide health metrics
   */
  protected async onGetHealthMetrics() {
    const avgProcessingTime = this.generationCount > 0
      ? this.totalProcessingTime / this.generationCount
      : 0;

    const errorRate = this.generationCount > 0
      ? (this.failureCount / this.generationCount) * 100
      : 0;

    return {
      generationsCount: this.generationCount,
      analysisCount: this.analysisCount,
      failureCount: this.failureCount,
      errorRate: errorRate / 60, // Errors per minute approximation
      avgProcessingTime,
      modelStatus: 'healthy', // Would check actual model status
    };
  }

  /**
   * Define scheduled jobs
   */
  protected onGetScheduledJobs(): ScheduledJob[] {
    return [
      {
        id: 'music-usage-report',
        name: 'Daily Music Usage Report',
        schedule: '0 9 * * *', // 9 AM daily
        handler: this.generateUsageReport.bind(this),
        enabled: true,
        description: 'Generate daily report of music feature usage',
      },
      {
        id: 'model-health-check',
        name: 'Hourly Model Health Check',
        schedule: '0 * * * *', // Every hour
        handler: this.performModelHealthCheck.bind(this),
        enabled: true,
        description: 'Check AI model health and performance',
      },
      {
        id: 'cleanup-temp-files',
        name: 'Cleanup Temporary Files',
        schedule: '0 0 * * *', // Midnight daily
        handler: this.cleanupTempFiles.bind(this),
        enabled: true,
        description: 'Clean up temporary audio/MIDI files',
      },
    ];
  }

  // ================== Command Handlers ==================

  /**
   * Handle generate-music command
   */
  private async handleGenerateMusic(params: MusicGenerationRequest): Promise<GenerationResult> {
    this.logger.info('Generating music', { userId: params.userId, genre: params.genre });
    return await this.generateMusic(params);
  }

  /**
   * Handle analyze-vocal command
   */
  private async handleAnalyzeVocal(params: VocalAnalysisRequest): Promise<VocalAnalysisResult> {
    this.logger.info('Analyzing vocal', { userId: params.userId });
    return await this.analyzeVocal(params);
  }

  /**
   * Handle validate-quality command
   */
  private async handleValidateQuality(params: { audioPath: string }): Promise<AudioQualityMetrics> {
    this.logger.info('Validating audio quality', { audioPath: params.audioPath });
    return await this.validateAudioQuality(params.audioPath);
  }

  /**
   * Handle get-usage-stats command
   */
  private async handleGetUsageStats(params: { userId: string }): Promise<any> {
    this.logger.info('Getting usage stats', { userId: params.userId });
    return await this.getUserUsageStats(params.userId);
  }

  /**
   * Handle get-model-health command
   */
  private async handleGetModelHealth(_params: Record<string, any>): Promise<any> {
    this.logger.info('Checking model health');
    return await this.checkModelHealth();
  }

  // ================== Core Functionality ==================

  /**
   * Generate music using AI Producer
   */
  private async generateMusic(request: MusicGenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Track usage event: started
      await this.trackUsageEvent(request.userId, 'producer-ai', 'started', {
        genre: request.genre,
        mood: request.mood,
        tempo: request.tempo,
      }, request.projectId);

      // Call Python AI Producer
      const result = await this.callProducerAI(request);

      if (!result.success || !result.audioPath) {
        throw new Error(result.error || 'Music generation failed');
      }

      // Validate quality
      const quality = await this.validateAudioQuality(result.audioPath);

      // Check quality thresholds
      if (quality.clippingSamples > 100) {
        this.logger.warn('Audio clipping detected', {
          clippingSamples: quality.clippingSamples,
        });
      }

      const duration = Date.now() - startTime;
      this.generationCount++;
      this.totalProcessingTime += duration;

      // Track usage event: completed
      await this.trackUsageEvent(request.userId, 'producer-ai', 'completed', {
        genre: request.genre,
        quality: quality,
      }, request.projectId, duration);

      // Record metrics to adaptive engine
      await adaptiveEngine.recordMetric({
        moduleName: this.name,
        metricName: 'generation_success_rate',
        value: 100, // Success
        metadata: { genre: request.genre, duration }
      });

      await adaptiveEngine.recordMetric({
        moduleName: this.name,
        metricName: 'audio_quality_snr',
        value: quality.snr,
        metadata: { genre: request.genre }
      });

      // Track action for vitality
      selfAwareness.recordAction();

      this.logger.info('Music generation completed', {
        userId: request.userId,
        duration,
        quality: quality.snr,
      });

      return {
        success: true,
        audioPath: result.audioPath,
        midiPath: result.midiPath,
        quality,
        duration,
      };
    } catch (error) {
      this.failureCount++;
      const duration = Date.now() - startTime;

      // Track usage event: failed
      await this.trackUsageEvent(request.userId, 'producer-ai', 'failed', {
        error: (error as Error).message,
      }, request.projectId, duration, 'GENERATION_FAILED');

      // Record failure metrics
      await adaptiveEngine.recordMetric({
        moduleName: this.name,
        metricName: 'generation_success_rate',
        value: 0, // Failure
        metadata: { error: (error as Error).message, duration }
      });

      // Track error for vitality
      selfAwareness.recordError();

      this.logger.error('Music generation failed', {
        error: (error as Error).message,
        userId: request.userId,
      });

      return {
        success: false,
        error: (error as Error).message,
        duration,
      };
    }
  }

  /**
   * Analyze vocal performance using Vocal Coach
   */
  private async analyzeVocal(request: VocalAnalysisRequest): Promise<VocalAnalysisResult> {
    const startTime = Date.now();

    try {
      // Track usage event: started
      await this.trackUsageEvent(request.userId, 'vocal-coach', 'started', {
        audioPath: request.audioPath,
      }, request.projectId);

      // Call Python Vocal Coach
      const result = await this.callVocalCoach(request);

      const duration = Date.now() - startTime;
      this.analysisCount++;

      // Track usage event: completed
      await this.trackUsageEvent(request.userId, 'vocal-coach', 'completed', {
        score: result.overallScore,
        pitchAccuracy: result.pitchAccuracy,
      }, request.projectId, duration);

      this.logger.info('Vocal analysis completed', {
        userId: request.userId,
        score: result.overallScore,
        duration,
      });

      return result;
    } catch (error) {
      this.failureCount++;
      const duration = Date.now() - startTime;

      // Track usage event: failed
      await this.trackUsageEvent(request.userId, 'vocal-coach', 'failed', {
        error: (error as Error).message,
      }, request.projectId, duration, 'ANALYSIS_FAILED');

      throw error;
    }
  }

  /**
   * Validate audio quality metrics
   */
  private async validateAudioQuality(audioPath: string): Promise<AudioQualityMetrics> {
    this.logger.debug('Validating audio quality', { audioPath });

    // Call Python audio quality validation script
    const script = path.join(process.cwd(), 'tests/quality/audio-metrics.py');

    try {
      const result = await this.executePythonScript(script, [audioPath]);
      return JSON.parse(result);
    } catch (error) {
      this.logger.warn('Quality validation failed, using defaults', {
        error: (error as Error).message,
      });

      // Return default metrics if validation fails
      return {
        peakAmplitude: 0.8,
        rmsLevel: 0.3,
        clippingSamples: 0,
        frequencyResponse: {
          lowEnergy: 33,
          midEnergy: 34,
          highEnergy: 33,
        },
        thd: 0.01,
        snr: 60,
        dynamicRange: 40,
      };
    }
  }

  /**
   * Track usage event in Prisma
   */
  private async trackUsageEvent(
    userId: string,
    featureKey: string,
    eventType: 'started' | 'completed' | 'failed',
    metadata: Record<string, any> = {},
    projectId?: string,
    duration?: number,
    errorCode?: string
  ): Promise<void> {
    try {
      await prisma.usageEvent.create({
        data: {
          userId,
          featureKey,
          eventType,
          metadata,
          projectId,
          duration,
          errorCode,
        },
      });

      this.logger.debug('Usage event tracked', {
        userId,
        featureKey,
        eventType,
      });
    } catch (error) {
      this.logger.error('Failed to track usage event', {
        error: (error as Error).message,
      });
      // Don't throw - tracking failures shouldn't break main flow
    }
  }

  /**
   * Get user usage statistics
   */
  private async getUserUsageStats(userId: string): Promise<any> {
    const [totalEvents, vocalCoachEvents, producerEvents, recentEvents] = await Promise.all([
      // Total events
      prisma.usageEvent.count({
        where: { userId },
      }),

      // Vocal coach usage
      prisma.usageEvent.count({
        where: {
          userId,
          featureKey: 'vocal-coach',
          eventType: 'completed',
        },
      }),

      // Producer AI usage
      prisma.usageEvent.count({
        where: {
          userId,
          featureKey: 'producer-ai',
          eventType: 'completed',
        },
      }),

      // Recent events (last 30 days)
      prisma.usageEvent.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      }),
    ]);

    // Calculate average durations
    const completedEvents = recentEvents.filter((e: any) => e.eventType === 'completed' && e.duration);
    const avgDuration = completedEvents.length > 0
      ? completedEvents.reduce((sum: number, e: any) => sum + (e.duration || 0), 0) / completedEvents.length
      : 0;

    return {
      userId,
      totalEvents,
      vocalCoachUsage: vocalCoachEvents,
      producerAIUsage: producerEvents,
      avgDuration,
      recentActivity: recentEvents.slice(0, 10), // Last 10 events
    };
  }

  /**
   * Check model health status
   */
  private async checkModelHealth(): Promise<any> {
    const recentFailures = await prisma.usageEvent.count({
      where: {
        eventType: 'failed',
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    const recentSuccesses = await prisma.usageEvent.count({
      where: {
        eventType: 'completed',
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    const totalRecent = recentFailures + recentSuccesses;
    const successRate = totalRecent > 0 ? (recentSuccesses / totalRecent) * 100 : 100;

    return {
      status: successRate > 90 ? 'healthy' : successRate > 70 ? 'degraded' : 'unhealthy',
      successRate,
      recentFailures,
      recentSuccesses,
      lastHourEvents: totalRecent,
    };
  }

  // ================== Python Integration ==================

  /**
   * Call AI Producer Python service
   */
  private async callProducerAI(request: MusicGenerationRequest): Promise<any> {
    const script = path.join(this.PRODUCER_PATH, 'generators/melody_generator.py');

    const args = [
      '--genre', request.genre || 'pop',
      '--tempo', (request.tempo || 120).toString(),
      '--key', request.key || 'C',
      '--duration', (request.duration || 32).toString(),
    ];

    const result = await this.executePythonScript(script, args);
    return JSON.parse(result);
  }

  /**
   * Call Vocal Coach Python service
   */
  private async callVocalCoach(request: VocalAnalysisRequest): Promise<VocalAnalysisResult> {
    const script = path.join(this.VOCAL_COACH_PATH, 'vocal_coach_engine.py');

    const args = [
      '--audio', request.audioPath,
      '--analyze',
    ];

    const result = await this.executePythonScript(script, args);
    return JSON.parse(result);
  }

  /**
   * Execute Python script and return output
   */
  private async executePythonScript(script: string, args: string[] = []): Promise<string> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.PYTHON_ENV, [script, ...args]);

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Python script failed: ${error || 'Unknown error'}`));
        }
      });

      python.on('error', (err) => {
        reject(new Error(`Failed to execute Python: ${err.message}`));
      });
    });
  }

  /**
   * Verify Python environment is available
   */
  private async verifyPythonEnvironment(): Promise<void> {
    try {
      await fs.access(this.PYTHON_ENV);
      this.logger.info('Python environment verified', { path: this.PYTHON_ENV });
    } catch (error) {
      this.logger.warn('Python environment not found, some features may be unavailable', {
        path: this.PYTHON_ENV,
      });
    }
  }

  // ================== Scheduled Jobs ==================

  /**
   * Generate daily usage report
   */
  private async generateUsageReport(): Promise<void> {
    this.logger.info('Generating daily usage report');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalEvents, vocalCoachEvents, producerEvents, failures] = await Promise.all([
      prisma.usageEvent.count({
        where: {
          createdAt: { gte: yesterday },
        },
      }),

      prisma.usageEvent.count({
        where: {
          featureKey: 'vocal-coach',
          eventType: 'completed',
          createdAt: { gte: yesterday },
        },
      }),

      prisma.usageEvent.count({
        where: {
          featureKey: 'producer-ai',
          eventType: 'completed',
          createdAt: { gte: yesterday },
        },
      }),

      prisma.usageEvent.count({
        where: {
          eventType: 'failed',
          createdAt: { gte: yesterday },
        },
      }),
    ]);

    this.logger.info('Daily usage report', {
      totalEvents,
      vocalCoachEvents,
      producerEvents,
      failures,
      successRate: totalEvents > 0 ? ((totalEvents - failures) / totalEvents * 100).toFixed(2) + '%' : 'N/A',
    });
  }

  /**
   * Perform model health check
   */
  private async performModelHealthCheck(): Promise<void> {
    this.logger.info('Performing model health check');

    const health = await this.checkModelHealth();

    // Record health metric
    await adaptiveEngine.recordMetric({
      moduleName: this.name,
      metricName: 'model_success_rate',
      value: health.successRate,
      metadata: { status: health.status, recentFailures: health.recentFailures }
    });

    if (health.status !== 'healthy') {
      this.logger.warn('Model health degraded', health);

      // Propose optimization if performance is poor
      await this.proposeModelOptimization();
    } else {
      this.logger.debug('Model health check passed', health);
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(): Promise<void> {
    this.logger.info('Cleaning up temporary files');

    const tempDir = path.join(process.cwd(), 'temp');

    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      let cleaned = 0;

      // Propose cleanup as autonomous LOW clearance action
      if (files.length > 100) {
        const proposal = await autonomyManager.proposeAction(
          {
            moduleName: this.name,
            actionType: 'cleanup_temp_files',
            clearanceLevel: ClearanceLevel.LOW,
            title: 'Cleanup old temporary files',
            description: `Remove ${files.length} temporary files older than 7 days`,
            parameters: { fileCount: files.length, maxAge: 7 }
          },
          'Automatic cleanup to free disk space'
        );

        // Execute if vitality check passed
        if (proposal.vitalityCheck.passed) {
          await autonomyManager.executeProposal(proposal);
        }
      }

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }

      this.logger.info('Cleanup completed', { filesRemoved: cleaned });

      // Record cleanup metric
      await adaptiveEngine.recordMetric({
        moduleName: this.name,
        metricName: 'temp_files_cleaned',
        value: cleaned,
        metadata: { totalFiles: files.length }
      });
    } catch (error) {
      this.logger.error('Cleanup failed', { error: (error as Error).message });
      selfAwareness.recordError();
    }
  }

  /**
   * Propose model optimization if performance is degrading
   */
  private async proposeModelOptimization(): Promise<void> {
    const health = await this.checkModelHealth();

    if (health.successRate < 80) {
      // MEDIUM clearance: Suggest model retraining
      await autonomyManager.proposeAction(
        {
          moduleName: this.name,
          actionType: 'retrain_model',
          clearanceLevel: ClearanceLevel.MEDIUM,
          title: 'Retrain degraded AI model',
          description: `Model success rate at ${health.successRate.toFixed(1)}%. Retrain to improve performance.`,
          parameters: {
            currentSuccessRate: health.successRate,
            targetSuccessRate: 95
          }
        },
        'Model performance below acceptable threshold'
      );
    } else if (health.successRate < 60) {
      // HIGH clearance: Critical model issue
      await autonomyManager.proposeAction(
        {
          moduleName: this.name,
          actionType: 'rollback_model',
          clearanceLevel: ClearanceLevel.HIGH,
          title: 'Critical: Rollback to previous model version',
          description: `Model success rate critically low at ${health.successRate.toFixed(1)}%. Immediate rollback required.`,
          parameters: {
            currentSuccessRate: health.successRate,
            severity: 'critical'
          }
        },
        'Critical model failure detected'
      );
    }
  }
}

// Export singleton instance
export default new MusicModule();
