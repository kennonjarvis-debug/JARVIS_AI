/**
 * Unified Types for Jarvis Autonomous Agent System
 *
 * Combines types from both autonomous and proactive agent systems
 */

// ============================================================================
// Agent Configuration & Lifecycle
// ============================================================================

export enum ClearanceLevel {
  READ_ONLY = 'READ_ONLY',              // Can only observe and suggest
  SUGGEST = 'SUGGEST',                   // Can suggest actions
  MODIFY_SAFE = 'MODIFY_SAFE',          // Can modify non-production data
  MODIFY_PRODUCTION = 'MODIFY_PRODUCTION', // Can modify production
  FULL_AUTONOMY = 'FULL_AUTONOMY'       // Full autonomous control
}

export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  BACKGROUND = 'BACKGROUND'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ESCALATED = 'ESCALATED',
  CANCELLED = 'CANCELLED'
}

export enum DomainType {
  CODE_OPTIMIZATION = 'CODE_OPTIMIZATION',
  COST_OPTIMIZATION = 'COST_OPTIMIZATION',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  DATA_SCIENCE = 'DATA_SCIENCE',
  MARKETING = 'MARKETING',
  CHAT = 'CHAT',
  AUTOMATION = 'AUTOMATION',
  SECURITY = 'SECURITY',
  MUSIC = 'MUSIC',
  WORKFLOWS = 'WORKFLOWS'
}

export interface AgentConfig {
  enabled: boolean;
  analysisInterval: number;         // milliseconds
  maxConcurrentTasks: number;
  globalClearance: ClearanceLevel;
  autoApprove: {
    readOnly: boolean;
    suggestionsOnly: boolean;
    modifySafe: boolean;
    modifyProduction: boolean;
  };
  proactive: {
    enabled: boolean;
    maxNotificationsPerHour: number;
    maxNotificationsPerDay: number;
    minTimeBetweenNotifications: number;
    respectDoNotDisturb: boolean;
    confidenceThreshold: number;
  };
  learning: {
    enabled: boolean;
    learningRate: number;
    confidenceThreshold: number;
    maxPatternsPerDomain: number;
    retentionDays: number;
    autoAdapt: boolean;
  };
}

// ============================================================================
// Tasks & Workflows
// ============================================================================

export interface AutonomousTask {
  id: string;
  domain: DomainType;
  action: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  clearance: ClearanceLevel;
  requiresApproval: boolean;
  params: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  estimatedDuration?: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  success: boolean;
  output?: any;
  error?: string;
  metrics?: {
    duration: number;
    resourcesUsed?: Record<string, any>;
    impactScore?: number;
  };
  completedAt: Date;
}

export interface AutonomousWorkflow {
  id: string;
  name: string;
  description: string;
  tasks: AutonomousTask[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Adaptive Learning
// ============================================================================

export interface LearningPattern {
  id: string;
  domain: string;
  pattern: string;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  firstSeen: Date;
  context: Record<string, any>;
  outcomes: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface AdaptiveModel {
  id: string;
  domain: string;
  version: string;
  accuracy: number;
  trainingData: number;
  lastTrained: Date;
  parameters: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AdaptiveDecision {
  id: string;
  timestamp: Date;
  domain: string;
  context: Record<string, any>;
  options: DecisionOption[];
  selectedOption: string;
  confidence: number;
  reasoning: string;
  outcome?: {
    success: boolean;
    feedback?: UserFeedback;
  };
}

export interface DecisionOption {
  id: string;
  action: string;
  description: string;
  confidence: number;
  risks: string[];
  benefits: string[];
  estimatedImpact: number;
}

export interface UserFeedback {
  decisionId: string;
  rating: 'positive' | 'negative' | 'neutral';
  comment?: string;
  timestamp: Date;
}

export interface TrainingDataPoint {
  domain: string;
  input: Record<string, any>;
  output: any;
  feedback?: UserFeedback;
  timestamp: Date;
}

// ============================================================================
// Proactive Intelligence
// ============================================================================

export interface UserInteraction {
  id: string;
  type: 'command' | 'query' | 'task' | 'approval' | 'feedback';
  timestamp: Date;
  userId?: string;
  context: WorkContext;
  action: string;
  result: 'success' | 'failure' | 'partial';
  duration: number;
  metadata?: Record<string, any>;
}

export interface UserPreference {
  key: string;
  value: any;
  confidence: number;
  learnedFrom: string[];
  lastUpdated: Date;
  occurrences: number;
}

export interface TimingPattern {
  activity: string;
  hourOfDay: number;
  dayOfWeek: number;
  frequency: number;
  confidence: number;
  lastSeen: Date;
}

export interface WorkContext {
  timestamp: Date;
  activeProject?: string;
  activeFile?: string;
  recentCommands: string[];
  systemLoad: number;
  timeOfDay: string;
  dayOfWeek: string;
  metadata?: Record<string, any>;
}

export interface ProactiveSuggestion {
  id: string;
  type: 'task' | 'optimization' | 'insight' | 'reminder' | 'automation';
  title: string;
  description: string;
  confidence: number;
  priority: Priority;
  reasoning: string;
  actions?: SuggestedAction[];
  context: WorkContext;
  expiresAt?: Date;
  createdAt: Date;
}

export interface SuggestedAction {
  id: string;
  label: string;
  action: string;
  params: Record<string, any>;
  clearance: ClearanceLevel;
}

export interface UserPattern {
  userId: string;
  pattern: string;
  frequency: number;
  confidence: number;
  triggers: string[];
  actions: string[];
  outcomes: {
    accepted: number;
    rejected: number;
    ignored: number;
  };
}

// ============================================================================
// Domain Agents
// ============================================================================

export interface IDomainAgent {
  domain: DomainType;
  name: string;
  description: string;
  clearanceLevel: ClearanceLevel;

  // Lifecycle
  initialize(): Promise<void>;
  analyze(): Promise<AutonomousTask[]>;
  canExecute(task: AutonomousTask): boolean;
  execute(task: AutonomousTask): Promise<TaskResult>;

  // Capabilities
  getCapabilities(): DomainCapability[];

  // Communication
  sendMessage(message: AgentMessage): Promise<void>;
  receiveMessage(message: AgentMessage): Promise<void>;
}

export interface DomainCapability {
  name: string;
  description: string;
  clearance: ClearanceLevel;
  requiresApproval: boolean;
}

export interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification' | 'query';
  payload: any;
  timestamp: Date;
}

// ============================================================================
// System Context & State
// ============================================================================

export interface SystemContext {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeUsers: number;
  activeAgents: number;
  pendingTasks: number;
  recentErrors: string[];
  timestamp: Date;
}

export interface AdaptiveState {
  isLearning: boolean;
  activeModels: number;
  totalPatterns: number;
  lastAdaptation: Date | null;
  lastInsight: Date | null;
  performanceScore: number;
  autonomyLevel: 'supervised' | 'semi-autonomous' | 'autonomous';
}

export interface LearningMetrics {
  totalDecisions: number;
  successRate: number;
  averageConfidence: number;
  patternsIdentified: number;
  adaptationsMade: number;
  userSatisfaction: number;
}

export enum AgentStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  EXECUTING = 'EXECUTING',
  WAITING = 'WAITING',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Events
// ============================================================================

export type AgentEventType =
  | 'task:created'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:escalated'
  | 'decision:made'
  | 'pattern:identified'
  | 'suggestion:created'
  | 'feedback:received'
  | 'adaptation:applied'
  | 'agent:started'
  | 'agent:stopped';

export interface AgentEvent {
  type: AgentEventType;
  data: any;
  timestamp: Date;
  source: string;
}
