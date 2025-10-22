/**
 * Unified Adaptive Engine
 *
 * Combines capabilities from both autonomous and proactive adaptive engines:
 * - Pattern learning and recognition
 * - User interaction tracking
 * - Preference learning
 * - Timing analytics
 * - Decision making with confidence scoring
 * - Continuous adaptation
 */

import { EventEmitter } from 'events';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../../../utils/logger.js';
import {
  LearningPattern,
  AdaptiveModel,
  TrainingDataPoint,
  AdaptiveDecision,
  UserFeedback,
  DecisionOption,
  UserInteraction,
  UserPreference,
  TimingPattern,
  WorkContext,
  UserPattern,
  AdaptiveState,
  LearningMetrics,
  AgentConfig
} from '../types.js';

interface AdaptiveEngineData {
  models: Record<string, AdaptiveModel>;
  patterns: Record<string, LearningPattern>;
  decisions: AdaptiveDecision[];
  userPreferences: Record<string, UserPreference>;
  timingPatterns: Record<string, TimingPattern>;
  userPatterns: Record<string, UserPattern>;
  state: AdaptiveState;
}

export class AdaptiveEngine extends EventEmitter {
  private static instance: AdaptiveEngine;

  // Learning data
  private models: Map<string, AdaptiveModel> = new Map();
  private patterns: Map<string, LearningPattern> = new Map();
  private decisions: AdaptiveDecision[] = [];
  private trainingData: TrainingDataPoint[] = [];

  // User intelligence
  private userInteractions: UserInteraction[] = [];
  private userPreferences: Map<string, UserPreference> = new Map();
  private timingPatterns: Map<string, TimingPattern> = new Map();
  private userPatterns: Map<string, UserPattern> = new Map();
  private contextHistory: WorkContext[] = [];

  // State
  private state: AdaptiveState;
  private config: AgentConfig['learning'];

  // Storage
  private dataDir: string;
  private saveInterval: NodeJS.Timeout | null = null;
  private maxHistorySize = 10000;

  private constructor() {
    super();

    this.config = {
      enabled: false,
      learningRate: 0.7,
      confidenceThreshold: 0.75,
      maxPatternsPerDomain: 100,
      retentionDays: 90,
      autoAdapt: false
    };

    this.state = {
      isLearning: false,
      activeModels: 0,
      totalPatterns: 0,
      lastAdaptation: null,
      lastInsight: null,
      performanceScore: 0,
      autonomyLevel: 'supervised'
    };

    this.dataDir = path.join(process.cwd(), '.data', 'adaptive');
    this.initialize();
  }

  public static getInstance(): AdaptiveEngine {
    if (!AdaptiveEngine.instance) {
      AdaptiveEngine.instance = new AdaptiveEngine();
    }
    return AdaptiveEngine.instance;
  }

  /**
   * Initialize the adaptive engine
   */
  private async initialize(): Promise<void> {
    try {
      if (!existsSync(this.dataDir)) {
        await mkdir(this.dataDir, { recursive: true });
      }

      await this.loadState();

      this.saveInterval = setInterval(() => {
        this.saveState();
      }, 60000); // Save every minute

      logger.info('🧠 Unified Adaptive Engine initialized');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize adaptive engine:', error);
    }
  }

  /**
   * Configure the engine
   */
  public configure(config: Partial<AgentConfig['learning']>): void {
    this.config = { ...this.config, ...config };
    logger.info('Adaptive engine configured', { config: this.config });
  }

  /**
   * Enable learning
   */
  public enableLearning(): void {
    this.config.enabled = true;
    this.state.isLearning = true;
    logger.info('🎓 Adaptive learning enabled');
    this.emit('learning:enabled');
  }

  /**
   * Disable learning
   */
  public disableLearning(): void {
    this.config.enabled = false;
    this.state.isLearning = false;
    logger.info('⏸️  Adaptive learning disabled');
    this.emit('learning:disabled');
  }

  // ============================================================================
  // Pattern Recognition & Learning
  // ============================================================================

  /**
   * Learn from a training data point
   */
  public async learn(dataPoint: TrainingDataPoint): Promise<void> {
    if (!this.config.enabled) return;

    this.trainingData.push(dataPoint);

    // Trim old data
    if (this.trainingData.length > this.maxHistorySize) {
      this.trainingData = this.trainingData.slice(-this.maxHistorySize);
    }

    // Identify patterns
    await this.identifyPatterns(dataPoint);

    // Update models
    await this.updateModels(dataPoint.domain);

    this.emit('learned', { dataPoint });
  }

  /**
   * Identify patterns from data
   */
  private async identifyPatterns(dataPoint: TrainingDataPoint): Promise<void> {
    const patternKey = `${dataPoint.domain}:${JSON.stringify(dataPoint.input)}`;

    if (this.patterns.has(patternKey)) {
      const pattern = this.patterns.get(patternKey)!;
      pattern.frequency++;
      pattern.lastSeen = new Date();

      // Update confidence based on feedback
      if (dataPoint.feedback) {
        if (dataPoint.feedback.rating === 'positive') {
          pattern.outcomes.positive++;
          pattern.confidence = Math.min(1.0, pattern.confidence + 0.1);
        } else if (dataPoint.feedback.rating === 'negative') {
          pattern.outcomes.negative++;
          pattern.confidence = Math.max(0.0, pattern.confidence - 0.1);
        }
      }
    } else {
      // New pattern
      const pattern: LearningPattern = {
        id: randomUUID(),
        domain: dataPoint.domain,
        pattern: JSON.stringify(dataPoint.input),
        frequency: 1,
        confidence: 0.5,
        firstSeen: new Date(),
        lastSeen: new Date(),
        context: dataPoint.input,
        outcomes: {
          positive: dataPoint.feedback?.rating === 'positive' ? 1 : 0,
          negative: dataPoint.feedback?.rating === 'negative' ? 1 : 0,
          neutral: !dataPoint.feedback || dataPoint.feedback.rating === 'neutral' ? 1 : 0
        }
      };

      this.patterns.set(patternKey, pattern);
      this.state.totalPatterns++;
      this.emit('pattern:identified', { pattern });
    }
  }

  /**
   * Update models for a domain
   */
  private async updateModels(domain: string): Promise<void> {
    const domainData = this.trainingData.filter(d => d.domain === domain);

    if (domainData.length < 10) return; // Need minimum data

    const modelKey = domain;
    const existingModel = this.models.get(modelKey);

    const accuracy = this.calculateAccuracy(domainData);

    const model: AdaptiveModel = {
      id: modelKey,
      domain,
      version: existingModel ? `${parseInt(existingModel.version) + 1}` : '1',
      accuracy,
      trainingData: domainData.length,
      lastTrained: new Date(),
      parameters: {
        learningRate: this.config.learningRate,
        confidence: this.config.confidenceThreshold
      }
    };

    this.models.set(modelKey, model);
    this.state.activeModels = this.models.size;
    this.state.lastAdaptation = new Date();

    this.emit('model:updated', { model });
  }

  /**
   * Calculate model accuracy
   */
  private calculateAccuracy(data: TrainingDataPoint[]): number {
    const withFeedback = data.filter(d => d.feedback);
    if (withFeedback.length === 0) return 0.5;

    const positive = withFeedback.filter(d => d.feedback?.rating === 'positive').length;
    return positive / withFeedback.length;
  }

  /**
   * Get patterns for a domain
   */
  public getPatterns(domain: string): LearningPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.domain === domain)
      .sort((a, b) => b.frequency - a.frequency);
  }

  // ============================================================================
  // Decision Making
  // ============================================================================

  /**
   * Make an adaptive decision
   */
  public async makeDecision(
    domain: string,
    context: Record<string, any>,
    options: DecisionOption[]
  ): Promise<AdaptiveDecision> {
    // Score each option
    const scoredOptions = options.map(opt => ({
      ...opt,
      score: this.scoreOption(domain, context, opt)
    })).sort((a, b) => b.score - a.score);

    const bestOption = scoredOptions[0];

    const decision: AdaptiveDecision = {
      id: randomUUID(),
      timestamp: new Date(),
      domain,
      context,
      options,
      selectedOption: bestOption.id,
      confidence: bestOption.score,
      reasoning: `Selected based on ${bestOption.confidence.toFixed(2)} confidence score`
    };

    this.decisions.push(decision);
    this.emit('decision:made', { decision });

    return decision;
  }

  /**
   * Score a decision option based on learned patterns
   */
  private scoreOption(domain: string, context: Record<string, any>, option: DecisionOption): number {
    const model = this.models.get(domain);
    if (!model) return option.confidence;

    // Combine model accuracy with option confidence
    return (model.accuracy * 0.6) + (option.confidence * 0.4);
  }

  /**
   * Provide feedback on a decision
   */
  public async provideFeedback(feedback: UserFeedback): Promise<void> {
    const decision = this.decisions.find(d => d.id === feedback.decisionId);
    if (!decision) return;

    decision.outcome = {
      success: feedback.rating === 'positive',
      feedback
    };

    // Learn from the feedback
    await this.learn({
      domain: decision.domain,
      input: decision.context,
      output: decision.selectedOption,
      feedback,
      timestamp: new Date()
    });

    this.emit('feedback:received', { feedback, decision });
  }

  // ============================================================================
  // User Intelligence
  // ============================================================================

  /**
   * Track user interaction
   */
  public trackInteraction(interaction: UserInteraction): void {
    this.userInteractions.push(interaction);

    if (this.userInteractions.length > this.maxHistorySize) {
      this.userInteractions = this.userInteractions.slice(-this.maxHistorySize);
    }

    // Learn preferences from interaction
    this.learnPreferences(interaction);

    // Learn timing patterns
    this.learnTimingPatterns(interaction);

    this.emit('interaction:tracked', { interaction });
  }

  /**
   * Learn user preferences
   */
  private learnPreferences(interaction: UserInteraction): void {
    // Extract preferences from successful interactions
    if (interaction.result !== 'success') return;

    const prefKey = interaction.action;

    if (this.userPreferences.has(prefKey)) {
      const pref = this.userPreferences.get(prefKey)!;
      pref.occurrences++;
      pref.confidence = Math.min(1.0, pref.confidence + 0.05);
      pref.lastUpdated = new Date();
      pref.learnedFrom.push(interaction.id);
    } else {
      this.userPreferences.set(prefKey, {
        key: prefKey,
        value: interaction.metadata,
        confidence: 0.5,
        learnedFrom: [interaction.id],
        lastUpdated: new Date(),
        occurrences: 1
      });
    }
  }

  /**
   * Learn timing patterns
   */
  private learnTimingPatterns(interaction: UserInteraction): void {
    const hour = interaction.timestamp.getHours();
    const day = interaction.timestamp.getDay();
    const key = `${interaction.action}:${hour}:${day}`;

    if (this.timingPatterns.has(key)) {
      const pattern = this.timingPatterns.get(key)!;
      pattern.frequency++;
      pattern.confidence = Math.min(1.0, pattern.confidence + 0.05);
      pattern.lastSeen = new Date();
    } else {
      this.timingPatterns.set(key, {
        activity: interaction.action,
        hourOfDay: hour,
        dayOfWeek: day,
        frequency: 1,
        confidence: 0.5,
        lastSeen: new Date()
      });
    }
  }

  /**
   * Get user preferences
   */
  public getUserPreferences(minConfidence: number = 0.6): UserPreference[] {
    return Array.from(this.userPreferences.values())
      .filter(p => p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get timing patterns for prediction
   */
  public getTimingPatterns(activity: string, minConfidence: number = 0.6): TimingPattern[] {
    return Array.from(this.timingPatterns.values())
      .filter(p => p.activity === activity && p.confidence >= minConfidence)
      .sort((a, b) => b.frequency - a.frequency);
  }

  // ============================================================================
  // Metrics & Insights
  // ============================================================================

  /**
   * Get learning metrics
   */
  public getMetrics(): LearningMetrics {
    const withFeedback = this.decisions.filter(d => d.outcome?.feedback);
    const positive = withFeedback.filter(d => d.outcome?.feedback?.rating === 'positive');

    return {
      totalDecisions: this.decisions.length,
      successRate: withFeedback.length > 0 ? positive.length / withFeedback.length : 0,
      averageConfidence: this.decisions.reduce((sum, d) => sum + d.confidence, 0) / this.decisions.length || 0,
      patternsIdentified: this.patterns.size,
      adaptationsMade: this.models.size,
      userSatisfaction: this.state.performanceScore
    };
  }

  /**
   * Get current state
   */
  public getState(): AdaptiveState {
    return { ...this.state };
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Save state to disk
   */
  private async saveState(): Promise<void> {
    try {
      const data: AdaptiveEngineData = {
        models: Object.fromEntries(this.models),
        patterns: Object.fromEntries(this.patterns),
        decisions: this.decisions.slice(-1000), // Keep last 1000
        userPreferences: Object.fromEntries(this.userPreferences),
        timingPatterns: Object.fromEntries(this.timingPatterns),
        userPatterns: Object.fromEntries(this.userPatterns),
        state: this.state
      };

      const filePath = path.join(this.dataDir, 'adaptive-engine-state.json');
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to save adaptive engine state:', error);
    }
  }

  /**
   * Load state from disk
   */
  private async loadState(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, 'adaptive-engine-state.json');

      if (!existsSync(filePath)) return;

      const content = await readFile(filePath, 'utf-8');
      const data: AdaptiveEngineData = JSON.parse(content);

      this.models = new Map(Object.entries(data.models || {}));
      this.patterns = new Map(Object.entries(data.patterns || {}));
      this.decisions = data.decisions || [];
      this.userPreferences = new Map(Object.entries(data.userPreferences || {}));
      this.timingPatterns = new Map(Object.entries(data.timingPatterns || {}));
      this.userPatterns = new Map(Object.entries(data.userPatterns || {}));
      this.state = data.state || this.state;

      logger.info('Adaptive engine state loaded', {
        models: this.models.size,
        patterns: this.patterns.size,
        decisions: this.decisions.length
      });
    } catch (error) {
      logger.error('Failed to load adaptive engine state:', error);
    }
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    await this.saveState();
    logger.info('Adaptive engine shutdown complete');
    this.emit('shutdown');
  }
}

// Export singleton instance
export const adaptiveEngine = AdaptiveEngine.getInstance();
