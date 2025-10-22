/**
 * Adaptive Engine V2 - Type Definitions
 *
 * Core types for the autonomous adaptive learning system.
 * This engine learns from user behavior, adapts to preferences,
 * and continuously improves Jarvis's intelligence.
 */

export interface LearningPattern {
  id: string;
  type: 'behavioral' | 'preference' | 'workflow' | 'temporal' | 'contextual';
  pattern: Record<string, any>;
  confidence: number; // 0-1
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  reinforcement: number; // Positive or negative reinforcement score
  metadata?: Record<string, any>;
}

export interface AdaptiveModel {
  id: string;
  domain: string; // e.g., 'music_production', 'code_review', 'system_monitoring'
  patterns: LearningPattern[];
  accuracy: number; // 0-1, based on prediction success
  trainingData: TrainingDataPoint[];
  version: number;
  created: Date;
  updated: Date;
}

export interface TrainingDataPoint {
  id: string;
  input: Record<string, any>;
  output: Record<string, any>;
  outcome: 'success' | 'failure' | 'partial';
  feedback?: UserFeedback;
  timestamp: Date;
  contextId?: string;
}

export interface UserFeedback {
  type: 'explicit' | 'implicit'; // explicit = user clicked, implicit = inferred from behavior
  rating?: number; // 1-5 stars
  sentiment: 'positive' | 'neutral' | 'negative';
  actionTaken?: string;
  timeToAction?: number; // milliseconds
  comments?: string;
}

export interface AdaptiveDecision {
  id: string;
  context: Record<string, any>;
  options: DecisionOption[];
  selectedOption: string;
  reasoning: string;
  confidence: number;
  modelId: string;
  timestamp: Date;
  outcome?: 'correct' | 'incorrect' | 'unknown';
}

export interface DecisionOption {
  id: string;
  action: string;
  parameters: Record<string, any>;
  predictedOutcome: any;
  confidence: number;
  reasoning: string;
}

export interface LearningMetrics {
  totalPatterns: number;
  highConfidencePatterns: number;
  accuracyByDomain: Record<string, number>;
  successRate: number;
  learningRate: number; // How fast the system is improving
  lastImprovement: Date | null;
  predictionsMade: number;
  correctPredictions: number;
  incorrectPredictions: number;
}

export interface InsightGeneration {
  id: string;
  type: 'optimization' | 'anomaly' | 'opportunity' | 'warning' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  dataPoints: DataPoint[];
  suggestedActions: Action[];
  predictedImpact: Impact;
  created: Date;
  expiresAt?: Date;
}

export interface DataPoint {
  source: string;
  metric: string;
  value: any;
  timestamp: Date;
  normalRange?: { min: number; max: number };
  deviation?: number; // Percent deviation from normal
}

export interface Action {
  id: string;
  type: 'automate' | 'notify' | 'adjust' | 'investigate' | 'escalate';
  description: string;
  command?: string;
  parameters?: Record<string, any>;
  estimatedDuration?: number; // minutes
  risk: 'none' | 'low' | 'medium' | 'high';
  reversible: boolean;
}

export interface Impact {
  metric: string;
  currentValue: number;
  predictedValue: number;
  improvement: number; // Percent improvement
  timeframe: string; // e.g., "immediate", "1 day", "1 week"
  confidence: number;
}

export interface AutonomousEvent {
  id: string;
  type: 'learning' | 'adaptation' | 'insight' | 'decision' | 'error';
  severity: 'info' | 'warning' | 'error';
  message: string;
  data: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
}

export interface AdaptiveConfig {
  enabled: boolean;
  learningRate: number; // How aggressively to adapt (0-1)
  confidenceThreshold: number; // Min confidence for autonomous actions (0-1)
  maxPatternsPerDomain: number;
  retentionDays: number; // How long to keep training data
  autoAdapt: boolean; // Allow autonomous adaptation without approval
  domains: string[]; // Domains to learn from
  excludedPatterns: string[]; // Patterns to ignore
}

export interface PatternMatcher {
  matchPattern(input: Record<string, any>, pattern: LearningPattern): number; // Similarity score 0-1
  extractFeatures(input: Record<string, any>): Record<string, any>;
  compareFeatures(features1: Record<string, any>, features2: Record<string, any>): number;
}

export interface ModelTrainer {
  trainModel(domain: string, data: TrainingDataPoint[]): AdaptiveModel;
  updateModel(model: AdaptiveModel, newData: TrainingDataPoint[]): AdaptiveModel;
  evaluateModel(model: AdaptiveModel, testData: TrainingDataPoint[]): number; // Accuracy score
}

export interface InsightEngine {
  generateInsights(context: Record<string, any>): InsightGeneration[];
  detectAnomalies(data: DataPoint[]): InsightGeneration[];
  identifyOpportunities(patterns: LearningPattern[]): InsightGeneration[];
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'pattern' | 'threshold' | 'schedule' | 'event';
    condition: Record<string, any>;
  };
  actions: Action[];
  enabled: boolean;
  requiresApproval: boolean;
  executionCount: number;
  successRate: number;
  lastExecuted?: Date;
  created: Date;
}

export interface AdaptiveState {
  isLearning: boolean;
  activeModels: number;
  totalPatterns: number;
  lastAdaptation: Date | null;
  lastInsight: Date | null;
  performanceScore: number; // 0-100
  autonomyLevel: 'supervised' | 'semi-autonomous' | 'autonomous';
}
