/**
 * Autonomous Agent Types
 *
 * Core type definitions for the Jarvis Autonomous Domain System
 * Enables self-directed agents to operate within specific domains
 * with defined capabilities and constraints.
 */

/**
 * Clearance levels for autonomous operations
 */
export enum ClearanceLevel {
  READ_ONLY = 0,          // Can only observe and report
  SUGGEST = 1,            // Can make suggestions, requires approval
  MODIFY_SAFE = 2,        // Can modify non-critical resources
  MODIFY_PRODUCTION = 3,  // Can modify production resources
  FULL_AUTONOMY = 4,      // Complete autonomous control
}

/**
 * Domain categories
 */
export enum DomainType {
  CODE_OPTIMIZATION = 'code-optimization',
  COST_OPTIMIZATION = 'cost-optimization',
  SYSTEM_HEALTH = 'system-health',
  INFRASTRUCTURE = 'infrastructure',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  MONITORING = 'monitoring',
  SECURITY = 'security',
  DATA_SCIENCE = 'data-science',
  MARKETING = 'marketing',
  CHAT = 'chat',
  MUSIC_PRODUCTION = 'music_production',
}

/**
 * Task priority levels
 */
export enum Priority {
  CRITICAL = 5,
  HIGH = 4,
  MEDIUM = 3,
  LOW = 2,
  BACKGROUND = 1,
}

/**
 * Task execution status
 */
export enum TaskStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REQUIRES_APPROVAL = 'requires_approval',
}

/**
 * Autonomous task definition
 */
export interface AutonomousTask {
  id: string;
  domain: DomainType;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  clearanceRequired: ClearanceLevel;
  estimatedDuration: number; // milliseconds
  dependencies: string[]; // task IDs
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
  metadata: Record<string, any>;
}

/**
 * Task execution result
 */
export interface TaskResult {
  taskId?: string;
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  output?: any;
  metrics: {
    duration: number;
    resourcesUsed: ResourceUsage;
    impactScore: number; // 0-100
  };
  artifacts?: Artifact[];
  logs: LogEntry[];
  timestamp?: Date;
}

/**
 * Resource usage tracking
 */
export interface ResourceUsage {
  apiCalls: number;
  tokensUsed: number;
  costIncurred: number;
  filesModified: number;
  cpuTime: number;
  memoryPeak: number;
}

/**
 * Generated artifacts
 */
export interface Artifact {
  type: 'file' | 'report' | 'config' | 'code' | 'data';
  path?: string;
  content: string;
  metadata: Record<string, any>;
}

/**
 * Log entry for task execution
 */
export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
}

/**
 * Domain capability definition
 */
export interface DomainCapability {
  name: string;
  description: string;
  clearanceRequired: ClearanceLevel;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  resourceRequirements: {
    apiAccess?: string[];
    fileAccess?: string[];
    networkAccess?: string[];
    maxCost?: number;
  };
  examples: string[];
}

/**
 * Domain agent interface
 */
export interface IDomainAgent {
  domain: DomainType;
  name: string;
  description: string;
  capabilities: DomainCapability[];
  currentClearance: ClearanceLevel;

  /**
   * Analyze current state and identify opportunities
   */
  analyze(): Promise<AutonomousTask[]>;

  /**
   * Execute a specific task
   */
  execute(task: AutonomousTask): Promise<TaskResult>;

  /**
   * Validate if agent can execute task
   */
  canExecute(task: AutonomousTask): boolean;

  /**
   * Get agent status and metrics
   */
  getStatus(): AgentStatus;
}

/**
 * Agent status
 */
export interface AgentStatus {
  active: boolean;
  currentTask?: string;
  tasksCompleted: number;
  tasksFailed: number;
  averageCompletionTime: number;
  lastActivityAt: Date;
  healthScore: number; // 0-100
  resourceUsage: ResourceUsage;
}

/**
 * Autonomous decision
 */
export interface AutonomousDecision {
  id: string;
  taskId: string;
  agentDomain: DomainType;
  decision: 'execute' | 'defer' | 'escalate' | 'reject';
  reasoning: string;
  confidence: number; // 0-1
  alternativeApproaches?: string[];
  risksIdentified: Risk[];
  timestamp: Date;
}

/**
 * Risk assessment
 */
export interface Risk {
  category: 'cost' | 'performance' | 'security' | 'availability' | 'data-loss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigationStrategy?: string;
  probability: number; // 0-1
}

/**
 * Learning feedback
 */
export interface LearningFeedback {
  taskId: string;
  actualOutcome: 'success' | 'failure' | 'partial';
  expectedOutcome: 'success' | 'failure' | 'partial';
  actualDuration: number;
  estimatedDuration: number;
  actualCost: number;
  estimatedCost: number;
  userSatisfaction?: number; // 0-10
  improvementSuggestions: string[];
  timestamp: Date;
}

/**
 * Coordination message between agents
 */
export interface AgentMessage {
  from: DomainType;
  to: DomainType | 'broadcast';
  type: 'request' | 'response' | 'notification' | 'coordination';
  subject: string;
  payload: any;
  priority: Priority;
  timestamp: Date;
  requiresResponse: boolean;
  responseDeadline?: Date;
}

/**
 * System context for decision making
 */
export interface SystemContext {
  timestamp: Date;
  environment: 'development' | 'staging' | 'production';
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  activeUsers: number;
  currentLoad: number;
  recentErrors: number;
  budgetRemaining: {
    daily: number;
    monthly: number;
  };
  maintenanceWindow: boolean;
  emergencyMode: boolean;
}

/**
 * Autonomous workflow
 */
export interface AutonomousWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  tasks: AutonomousTask[];
  coordinationStrategy: 'sequential' | 'parallel' | 'adaptive';
  rollbackStrategy?: RollbackStrategy;
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Workflow trigger conditions
 */
export interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'condition' | 'manual';
  schedule?: string; // cron expression
  event?: string; // event name
  condition?: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
  };
}

/**
 * Rollback strategy
 */
export interface RollbackStrategy {
  enabled: boolean;
  conditions: {
    onError: boolean;
    onPerformanceDegradation: boolean;
    onCostOverrun: boolean;
  };
  checkpoints: string[]; // task IDs where checkpoints are created
  rollbackScript?: string;
}

/**
 * Agent coordination protocol
 */
export interface CoordinationProtocol {
  handshake(): Promise<boolean>;
  requestAssistance(task: AutonomousTask): Promise<AgentMessage>;
  offerAssistance(domain: DomainType): Promise<void>;
  shareKnowledge(knowledge: Knowledge): Promise<void>;
  negotiateResourceAllocation(resources: string[]): Promise<ResourceAllocation>;
}

/**
 * Shared knowledge
 */
export interface Knowledge {
  domain: DomainType;
  category: 'best-practice' | 'pattern' | 'solution' | 'warning' | 'optimization';
  title: string;
  content: string;
  applicability: {
    contexts: string[];
    limitations: string[];
  };
  confidence: number; // 0-1
  validatedBy: number; // number of successful applications
  createdAt: Date;
}

/**
 * Resource allocation result
 */
export interface ResourceAllocation {
  granted: boolean;
  resources: {
    name: string;
    allocation: number;
    duration: number;
  }[];
  restrictions: string[];
  expiresAt: Date;
}
