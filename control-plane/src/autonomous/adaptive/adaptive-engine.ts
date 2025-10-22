/**
 * Adaptive Engine V2 - Core Learning System
 *
 * "Claude A" - Autonomous Adaptive Intelligence
 *
 * This engine continuously learns from user interactions,
 * identifies patterns, and adapts Jarvis's behavior automatically.
 * It's the brain behind Jarvis's ability to become smarter over time.
 */

import { EventEmitter } from 'events';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../../utils/logger.js';
import {
  LearningPattern,
  AdaptiveModel,
  TrainingDataPoint,
  AdaptiveDecision,
  LearningMetrics,
  AdaptiveConfig,
  AdaptiveState,
  UserFeedback,
  DecisionOption
} from './types.js';

export class AdaptiveEngine extends EventEmitter {
  private static instance: AdaptiveEngine;
  private models: Map<string, AdaptiveModel> = new Map();
  private patterns: Map<string, LearningPattern> = new Map();
  private decisions: AdaptiveDecision[] = [];
  private config: AdaptiveConfig;
  private state: AdaptiveState;
  private dataDir: string;
  private saveInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();

    // Default configuration
    this.config = {
      enabled: false, // Start disabled, enable via feature flag
      learningRate: 0.7,
      confidenceThreshold: 0.75,
      maxPatternsPerDomain: 100,
      retentionDays: 90,
      autoAdapt: false, // Require human approval initially
      domains: ['chat', 'system', 'music', 'code', 'workflows'],
      excludedPatterns: []
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
      // Ensure data directory exists
      if (!existsSync(this.dataDir)) {
        await mkdir(this.dataDir, { recursive: true });
      }

      // Load saved models and patterns
      await this.loadState();

      // Start auto-save timer
      this.saveInterval = setInterval(() => {
        this.saveState();
      }, 60000); // Save every minute

      logger.info('🧠 Adaptive Engine V2 (Claude A) initialized');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize adaptive engine:', error);
    }
  }

  /**
   * Enable the adaptive engine
   */
  public enable(): void {
    this.config.enabled = true;
    this.state.isLearning = true;
    logger.info('✅ Adaptive learning enabled');
    this.emit('enabled');
  }

  /**
   * Disable the adaptive engine
   */
  public disable(): void {
    this.config.enabled = false;
    this.state.isLearning = false;
    logger.info('⏸️  Adaptive learning disabled');
    this.emit('disabled');
  }

  /**
   * Learn from user interaction
   */
  public async learnFromInteraction(
    domain: string,
    input: Record<string, any>,
    output: Record<string, any>,
    feedback?: UserFeedback
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Create training data point
      const dataPoint: TrainingDataPoint = {
        id: randomUUID(),
        input,
        output,
        outcome: this.determineOutcome(feedback),
        feedback,
        timestamp: new Date()
      };

      // Get or create model for domain
      let model = this.models.get(domain);
      if (!model) {
        model = this.createModel(domain);
        this.models.set(domain, model);
      }

      // Add to training data
      model.trainingData.push(dataPoint);

      // Extract patterns
      const extractedPatterns = this.extractPatterns(input, output, domain);
      for (const pattern of extractedPatterns) {
        await this.recordPattern(pattern);
      }

      // Update model accuracy
      this.updateModelAccuracy(model);

      // Check if adaptation is needed
      if (this.shouldAdapt(model)) {
        await this.adaptModel(model);
      }

      this.state.lastAdaptation = new Date();
      this.emit('learned', { domain, patterns: extractedPatterns.length });

      logger.debug(`📚 Learned from interaction in domain: ${domain}`);
    } catch (error) {
      logger.error('Failed to learn from interaction:', error);
    }
  }

  /**
   * Make an adaptive decision
   */
  public async makeDecision(
    context: Record<string, any>,
    domain: string
  ): Promise<AdaptiveDecision | null> {
    if (!this.config.enabled) return null;

    try {
      const model = this.models.get(domain);
      if (!model) {
        logger.debug(`No model found for domain: ${domain}`);
        return null;
      }

      // Find matching patterns
      const matchingPatterns = this.findMatchingPatterns(context, domain);
      if (matchingPatterns.length === 0) {
        logger.debug('No matching patterns found for context');
        return null;
      }

      // Generate decision options
      const options = this.generateOptions(matchingPatterns, context);
      if (options.length === 0) {
        return null;
      }

      // Select best option
      const bestOption = this.selectBestOption(options);

      // Create decision
      const decision: AdaptiveDecision = {
        id: randomUUID(),
        context,
        options,
        selectedOption: bestOption.id,
        reasoning: bestOption.reasoning,
        confidence: bestOption.confidence,
        modelId: model.id,
        timestamp: new Date()
      };

      this.decisions.push(decision);
      this.emit('decision', decision);

      logger.info(`🎯 Made adaptive decision with ${decision.confidence.toFixed(2)} confidence`);
      return decision;
    } catch (error) {
      logger.error('Failed to make adaptive decision:', error);
      return null;
    }
  }

  /**
   * Record pattern
   */
  private async recordPattern(pattern: LearningPattern): Promise<void> {
    const existing = this.patterns.get(pattern.id);

    if (existing) {
      // Update existing pattern
      existing.occurrences++;
      existing.lastSeen = new Date();
      existing.confidence = Math.min(
        1.0,
        existing.confidence + (this.config.learningRate * 0.05)
      );
    } else {
      // Add new pattern
      this.patterns.set(pattern.id, pattern);
      this.state.totalPatterns++;
    }

    this.emit('pattern-recorded', pattern);
  }

  /**
   * Extract patterns from input/output
   */
  private extractPatterns(
    input: Record<string, any>,
    output: Record<string, any>,
    domain: string
  ): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // Behavioral pattern
    if (input.action && output.result) {
      patterns.push({
        id: this.generatePatternId('behavioral', input.action, domain),
        type: 'behavioral',
        pattern: {
          action: input.action,
          result: output.result,
          domain
        },
        confidence: 0.6,
        occurrences: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        reinforcement: output.success ? 1 : -1
      });
    }

    // Temporal pattern
    const hour = new Date().getHours();
    if (input.context?.timeOfDay || hour) {
      patterns.push({
        id: this.generatePatternId('temporal', `hour-${hour}`, domain),
        type: 'temporal',
        pattern: {
          hour,
          action: input.action,
          domain
        },
        confidence: 0.5,
        occurrences: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        reinforcement: 1
      });
    }

    // Preference pattern
    if (input.preference || input.userChoice) {
      patterns.push({
        id: this.generatePatternId('preference', input.userChoice || input.preference, domain),
        type: 'preference',
        pattern: {
          choice: input.userChoice || input.preference,
          context: input.context,
          domain
        },
        confidence: 0.7,
        occurrences: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        reinforcement: 1
      });
    }

    return patterns;
  }

  /**
   * Find matching patterns for context
   */
  private findMatchingPatterns(
    context: Record<string, any>,
    domain: string
  ): LearningPattern[] {
    const matches: LearningPattern[] = [];
    const threshold = this.config.confidenceThreshold;

    for (const pattern of this.patterns.values()) {
      if (pattern.pattern.domain !== domain) continue;
      if (pattern.confidence < threshold) continue;

      const similarity = this.calculateSimilarity(context, pattern.pattern);
      if (similarity >= threshold) {
        matches.push(pattern);
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate decision options from patterns
   */
  private generateOptions(
    patterns: LearningPattern[],
    context: Record<string, any>
  ): DecisionOption[] {
    const options: DecisionOption[] = [];

    for (const pattern of patterns.slice(0, 5)) {
      options.push({
        id: randomUUID(),
        action: pattern.pattern.action || 'auto',
        parameters: {
          ...pattern.pattern,
          context
        },
        predictedOutcome: pattern.pattern.result,
        confidence: pattern.confidence,
        reasoning: `Based on ${pattern.occurrences} occurrences with ${(pattern.confidence * 100).toFixed(0)}% confidence`
      });
    }

    return options;
  }

  /**
   * Select best option
   */
  private selectBestOption(options: DecisionOption[]): DecisionOption {
    return options.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * Check if model should adapt
   */
  private shouldAdapt(model: AdaptiveModel): boolean {
    // Adapt if we have enough new training data
    const threshold = 10;
    return model.trainingData.length >= threshold &&
           model.trainingData.length % threshold === 0;
  }

  /**
   * Adapt model based on new data
   */
  private async adaptModel(model: AdaptiveModel): Promise<void> {
    try {
      // Re-calculate pattern strengths
      const recentData = model.trainingData.slice(-50);
      const successRate = recentData.filter(d => d.outcome === 'success').length / recentData.length;

      // Update accuracy
      model.accuracy = successRate;
      model.version++;
      model.updated = new Date();

      this.emit('model-adapted', { modelId: model.id, accuracy: model.accuracy });
      logger.info(`🔄 Adapted model ${model.id} - Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
    } catch (error) {
      logger.error('Failed to adapt model:', error);
    }
  }

  /**
   * Update model accuracy
   */
  private updateModelAccuracy(model: AdaptiveModel): void {
    const recentDecisions = this.decisions
      .filter(d => d.modelId === model.id && d.outcome)
      .slice(-20);

    if (recentDecisions.length > 0) {
      const correct = recentDecisions.filter(d => d.outcome === 'correct').length;
      model.accuracy = correct / recentDecisions.length;
    }
  }

  /**
   * Get learning metrics
   */
  public getMetrics(): LearningMetrics {
    const domains: Record<string, number> = {};
    for (const [domain, model] of this.models) {
      domains[domain] = model.accuracy;
    }

    const decisionsWithOutcome = this.decisions.filter(d => d.outcome);
    const correct = decisionsWithOutcome.filter(d => d.outcome === 'correct').length;

    return {
      totalPatterns: this.patterns.size,
      highConfidencePatterns: Array.from(this.patterns.values())
        .filter(p => p.confidence >= this.config.confidenceThreshold).length,
      accuracyByDomain: domains,
      successRate: decisionsWithOutcome.length > 0 ? correct / decisionsWithOutcome.length : 0,
      learningRate: this.config.learningRate,
      lastImprovement: this.state.lastAdaptation,
      predictionsMade: this.decisions.length,
      correctPredictions: correct,
      incorrectPredictions: decisionsWithOutcome.length - correct
    };
  }

  /**
   * Get current state
   */
  public getState(): AdaptiveState {
    return {
      ...this.state,
      activeModels: this.models.size,
      totalPatterns: this.patterns.size,
      performanceScore: this.calculatePerformanceScore()
    };
  }

  /**
   * Provide feedback on decision
   */
  public provideFeedback(decisionId: string, outcome: 'correct' | 'incorrect'): void {
    const decision = this.decisions.find(d => d.id === decisionId);
    if (decision) {
      decision.outcome = outcome;
      this.emit('feedback-received', { decisionId, outcome });
      logger.debug(`Feedback received for decision ${decisionId}: ${outcome}`);
    }
  }

  // Helper methods

  private createModel(domain: string): AdaptiveModel {
    return {
      id: randomUUID(),
      domain,
      patterns: [],
      accuracy: 0.5,
      trainingData: [],
      version: 1,
      created: new Date(),
      updated: new Date()
    };
  }

  private generatePatternId(type: string, identifier: string, domain: string): string {
    return `${domain}:${type}:${identifier}`.toLowerCase().replace(/\s+/g, '-');
  }

  private determineOutcome(feedback?: UserFeedback): 'success' | 'failure' | 'partial' {
    if (!feedback) return 'partial';
    return feedback.sentiment === 'positive' ? 'success' : 'failure';
  }

  private calculateSimilarity(context: Record<string, any>, pattern: Record<string, any>): number {
    const keys = new Set([...Object.keys(context), ...Object.keys(pattern)]);
    let matches = 0;

    for (const key of keys) {
      if (context[key] === pattern[key]) matches++;
    }

    return matches / keys.size;
  }

  private calculatePerformanceScore(): number {
    const metrics = this.getMetrics();
    const weights = {
      successRate: 0.4,
      totalPatterns: 0.2,
      accuracy: 0.4
    };

    const normalizedPatterns = Math.min(metrics.totalPatterns / 100, 1);
    const avgAccuracy = Object.values(metrics.accuracyByDomain).reduce((a, b) => a + b, 0) /
                        Math.max(Object.keys(metrics.accuracyByDomain).length, 1);

    return Math.round(
      (metrics.successRate * weights.successRate +
       normalizedPatterns * weights.totalPatterns +
       avgAccuracy * weights.accuracy) * 100
    );
  }

  /**
   * Save state to disk
   */
  private async saveState(): Promise<void> {
    try {
      const state = {
        models: Array.from(this.models.entries()),
        patterns: Array.from(this.patterns.entries()),
        decisions: this.decisions.slice(-100), // Keep last 100
        config: this.config,
        state: this.state
      };

      const filePath = path.join(this.dataDir, 'adaptive-engine.json');
      await writeFile(filePath, JSON.stringify(state, null, 2));
    } catch (error) {
      logger.error('Failed to save adaptive engine state:', error);
    }
  }

  /**
   * Load state from disk
   */
  private async loadState(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, 'adaptive-engine.json');
      if (!existsSync(filePath)) return;

      const data = await readFile(filePath, 'utf-8');
      const state = JSON.parse(data);

      this.models = new Map(state.models);
      this.patterns = new Map(state.patterns);
      this.decisions = state.decisions || [];
      this.config = { ...this.config, ...state.config };
      this.state = { ...this.state, ...state.state };

      logger.info(`📂 Loaded ${this.models.size} models and ${this.patterns.size} patterns`);
    } catch (error) {
      logger.error('Failed to load adaptive engine state:', error);
    }
  }

  /**
   * Cleanup on shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    await this.saveState();
    logger.info('🛑 Adaptive Engine shutdown complete');
  }
}

// Export singleton instance
export const adaptiveEngine = AdaptiveEngine.getInstance();
