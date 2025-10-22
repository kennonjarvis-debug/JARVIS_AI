/**
 * Jarvis Clearance System
 * Three-tier permission system for autonomous actions
 *
 * Clearance Levels:
 * - LOW: Execute immediately, no approval needed
 * - MEDIUM: Notify operator, delay execution
 * - HIGH: Require explicit operator approval
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { adaptiveEngine } from './adaptive-engine';
import { notificationService } from '../services/notification.service';

/**
 * Clearance levels for Jarvis actions
 */
export enum ClearanceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Status of a Jarvis action
 */
export enum ActionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
  FAILED = 'failed',
}

/**
 * Jarvis action with clearance level
 */
export interface JarvisAction {
  id: string;
  moduleName: string;
  actionType: string;
  clearanceLevel: ClearanceLevel;
  title: string;
  description: string;
  parameters: Record<string, any>;
  requestedAt: Date;
  status: ActionStatus;
  executedAt?: Date;
  approvedBy?: string;
  rejectedBy?: string;
  result?: any;
  error?: string;
  notificationSent?: boolean;
  delayUntil?: Date;
}

/**
 * Persisted state for pending approvals
 */
interface ClearanceState {
  pendingActions: JarvisAction[];
  executionHistory: JarvisAction[];
  lastUpdated: string;
}

/**
 * Clearance System - Manages permission levels for autonomous actions
 */
export class ClearanceSystem extends EventEmitter {
  private static instance: ClearanceSystem;
  private pendingActions: Map<string, JarvisAction> = new Map();
  private executionHistory: JarvisAction[] = [];
  private maxHistorySize = 1000;
  private statePath = path.join(process.cwd(), 'logs/jarvis/jarvis_state.json');
  private mediumDelayMs = 5 * 60 * 1000; // 5 minutes delay for MEDIUM actions
  private highTimeoutMs = 24 * 60 * 60 * 1000; // 24 hours timeout for HIGH actions

  private constructor() {
    super();
    this.ensureStateDirectory();
    this.loadState();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ClearanceSystem {
    if (!ClearanceSystem.instance) {
      ClearanceSystem.instance = new ClearanceSystem();
    }
    return ClearanceSystem.instance;
  }

  /**
   * Ensure state directory exists
   */
  private async ensureStateDirectory(): Promise<void> {
    const dir = path.dirname(this.statePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create clearance state directory', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Load state from disk
   */
  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.statePath, 'utf8');
      const state: ClearanceState = JSON.parse(data);

      // Restore pending actions
      for (const action of state.pendingActions) {
        // Convert date strings back to Date objects
        action.requestedAt = new Date(action.requestedAt);
        if (action.executedAt) action.executedAt = new Date(action.executedAt);
        if (action.delayUntil) action.delayUntil = new Date(action.delayUntil);

        this.pendingActions.set(action.id, action);
      }

      // Restore execution history
      this.executionHistory = state.executionHistory.map(action => ({
        ...action,
        requestedAt: new Date(action.requestedAt),
        executedAt: action.executedAt ? new Date(action.executedAt) : undefined,
        delayUntil: action.delayUntil ? new Date(action.delayUntil) : undefined,
      }));

      logger.info('Clearance state loaded', {
        pendingActions: this.pendingActions.size,
        historySize: this.executionHistory.length,
      });
    } catch (error) {
      // State file doesn't exist yet - that's okay
      logger.debug('No existing clearance state found - starting fresh');
    }
  }

  /**
   * Save state to disk
   */
  private async saveState(): Promise<void> {
    try {
      const state: ClearanceState = {
        pendingActions: Array.from(this.pendingActions.values()),
        executionHistory: this.executionHistory,
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(this.statePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      logger.error('Failed to save clearance state', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Perform an action based on clearance level
   */
  async performAction(action: Omit<JarvisAction, 'id' | 'requestedAt' | 'status'>): Promise<JarvisAction> {
    const fullAction: JarvisAction = {
      id: this.generateActionId(),
      requestedAt: new Date(),
      status: ActionStatus.PENDING,
      ...action,
    };

    logger.info('Action requested', {
      id: fullAction.id,
      clearanceLevel: fullAction.clearanceLevel,
      actionType: fullAction.actionType,
      module: fullAction.moduleName,
    });

    // Route based on clearance level
    switch (fullAction.clearanceLevel) {
      case ClearanceLevel.LOW:
        return await this.executeImmediately(fullAction);

      case ClearanceLevel.MEDIUM:
        return await this.notifyAndDelayExecution(fullAction);

      case ClearanceLevel.HIGH:
        return await this.promptOperatorForApproval(fullAction);

      default:
        throw new Error(`Unknown clearance level: ${fullAction.clearanceLevel}`);
    }
  }

  /**
   * Execute LOW clearance action immediately
   */
  private async executeImmediately(action: JarvisAction): Promise<JarvisAction> {
    logger.info('Executing LOW clearance action immediately', {
      id: action.id,
      actionType: action.actionType,
    });

    try {
      // Execute the action
      const result = await this.executeAction(action);
      action.status = ActionStatus.EXECUTED;
      action.executedAt = new Date();
      action.result = result;

      // Record learning
      await adaptiveEngine.recordLearning({
        actionId: action.id,
        moduleName: action.moduleName,
        actionType: action.actionType,
        outcomeSuccess: true,
        performanceImpact: 5, // LOW actions have modest impact
        timestamp: new Date(),
        learnings: [`Successfully executed LOW clearance action: ${action.title}`],
      });

      this.emit('action:executed', action);
    } catch (error) {
      action.status = ActionStatus.FAILED;
      action.error = (error as Error).message;

      logger.error('Failed to execute LOW clearance action', {
        id: action.id,
        error: action.error,
      });

      // Record failure
      await adaptiveEngine.recordLearning({
        actionId: action.id,
        moduleName: action.moduleName,
        actionType: action.actionType,
        outcomeSuccess: false,
        performanceImpact: -5,
        timestamp: new Date(),
        learnings: [`Failed to execute LOW clearance action: ${action.error}`],
      });

      this.emit('action:failed', action);
    }

    // Add to history
    this.addToHistory(action);
    await this.saveState();

    return action;
  }

  /**
   * Notify operator and delay MEDIUM clearance action
   */
  private async notifyAndDelayExecution(action: JarvisAction): Promise<JarvisAction> {
    logger.info('MEDIUM clearance action - notifying and delaying', {
      id: action.id,
      actionType: action.actionType,
      delayMs: this.mediumDelayMs,
    });

    // Set delay
    action.delayUntil = new Date(Date.now() + this.mediumDelayMs);
    action.status = ActionStatus.PENDING;

    // Add to pending actions
    this.pendingActions.set(action.id, action);
    await this.saveState();

    // Send notification
    await notificationService.notifyOperator(action, 'medium');
    this.emit('action:notification', {
      action,
      level: 'medium',
      message: `MEDIUM clearance action will execute in ${this.mediumDelayMs / 60000} minutes unless cancelled`,
    });

    action.notificationSent = true;

    // Schedule delayed execution
    setTimeout(async () => {
      await this.executeDelayedAction(action.id);
    }, this.mediumDelayMs);

    logger.info('MEDIUM clearance action scheduled for delayed execution', {
      id: action.id,
      delayUntil: action.delayUntil.toISOString(),
    });

    return action;
  }

  /**
   * Prompt operator for approval of HIGH clearance action
   */
  private async promptOperatorForApproval(action: JarvisAction): Promise<JarvisAction> {
    logger.info('HIGH clearance action - requesting approval', {
      id: action.id,
      actionType: action.actionType,
    });

    action.status = ActionStatus.PENDING;
    action.delayUntil = new Date(Date.now() + this.highTimeoutMs);

    // Add to pending actions
    this.pendingActions.set(action.id, action);
    await this.saveState();

    // Send approval request
    const approvalEndpoint = `/api/v1/jarvis/approve/${action.id}`;
    await notificationService.notifyOperator(action, 'high', approvalEndpoint);
    this.emit('action:approval_required', {
      action,
      level: 'high',
      message: `HIGH clearance action requires approval within 24 hours`,
      approvalEndpoint,
    });

    action.notificationSent = true;

    // Schedule timeout
    setTimeout(async () => {
      await this.timeoutAction(action.id);
    }, this.highTimeoutMs);

    logger.info('HIGH clearance action awaiting approval', {
      id: action.id,
      timeout: action.delayUntil.toISOString(),
    });

    return action;
  }

  /**
   * Approve a pending HIGH clearance action
   */
  async approveAction(actionId: string, approvedBy: string): Promise<JarvisAction> {
    const action = this.pendingActions.get(actionId);

    if (!action) {
      throw new Error(`Action ${actionId} not found in pending actions`);
    }

    if (action.clearanceLevel !== ClearanceLevel.HIGH) {
      throw new Error(`Cannot approve non-HIGH clearance action`);
    }

    logger.info('HIGH clearance action approved', {
      id: actionId,
      approvedBy,
    });

    action.status = ActionStatus.APPROVED;
    action.approvedBy = approvedBy;

    // Execute the action
    try {
      const result = await this.executeAction(action);
      action.status = ActionStatus.EXECUTED;
      action.executedAt = new Date();
      action.result = result;

      // Record learning
      await adaptiveEngine.recordLearning({
        actionId: action.id,
        moduleName: action.moduleName,
        actionType: action.actionType,
        outcomeSuccess: true,
        performanceImpact: 20, // HIGH actions have significant impact
        timestamp: new Date(),
        learnings: [`Successfully executed HIGH clearance action: ${action.title}`],
      });

      this.emit('action:executed', action);
    } catch (error) {
      action.status = ActionStatus.FAILED;
      action.error = (error as Error).message;

      logger.error('Failed to execute approved HIGH clearance action', {
        id: action.id,
        error: action.error,
      });

      // Record failure
      await adaptiveEngine.recordLearning({
        actionId: action.id,
        moduleName: action.moduleName,
        actionType: action.actionType,
        outcomeSuccess: false,
        performanceImpact: -20,
        timestamp: new Date(),
        learnings: [`Failed to execute HIGH clearance action: ${action.error}`],
      });

      this.emit('action:failed', action);
    }

    // Move to history
    this.pendingActions.delete(actionId);
    this.addToHistory(action);
    await this.saveState();

    return action;
  }

  /**
   * Reject a pending HIGH clearance action
   */
  async rejectAction(actionId: string, rejectedBy: string, reason?: string): Promise<JarvisAction> {
    const action = this.pendingActions.get(actionId);

    if (!action) {
      throw new Error(`Action ${actionId} not found in pending actions`);
    }

    logger.info('Action rejected', {
      id: actionId,
      rejectedBy,
      reason,
    });

    action.status = ActionStatus.REJECTED;
    action.rejectedBy = rejectedBy;
    action.error = reason || 'Rejected by operator';

    // Record learning
    await adaptiveEngine.recordLearning({
      actionId: action.id,
      moduleName: action.moduleName,
      actionType: action.actionType,
      outcomeSuccess: false,
      performanceImpact: -10,
      timestamp: new Date(),
      learnings: [`Action rejected: ${reason || 'No reason provided'}`],
    });

    // Move to history
    this.pendingActions.delete(actionId);
    this.addToHistory(action);
    await this.saveState();

    this.emit('action:rejected', action);

    return action;
  }

  /**
   * Cancel a pending MEDIUM clearance action
   */
  async cancelAction(actionId: string): Promise<JarvisAction> {
    const action = this.pendingActions.get(actionId);

    if (!action) {
      throw new Error(`Action ${actionId} not found in pending actions`);
    }

    if (action.clearanceLevel !== ClearanceLevel.MEDIUM) {
      throw new Error(`Cannot cancel non-MEDIUM clearance action. Use reject() for HIGH clearance.`);
    }

    logger.info('MEDIUM clearance action cancelled', {
      id: actionId,
    });

    action.status = ActionStatus.REJECTED;
    action.error = 'Cancelled by operator';

    // Move to history
    this.pendingActions.delete(actionId);
    this.addToHistory(action);
    await this.saveState();

    this.emit('action:cancelled', action);

    return action;
  }

  /**
   * Execute a delayed MEDIUM clearance action
   */
  private async executeDelayedAction(actionId: string): Promise<void> {
    const action = this.pendingActions.get(actionId);

    if (!action) {
      // Action was already executed or cancelled
      return;
    }

    if (action.status === ActionStatus.REJECTED) {
      // Action was cancelled
      return;
    }

    logger.info('Executing delayed MEDIUM clearance action', {
      id: actionId,
      actionType: action.actionType,
    });

    try {
      const result = await this.executeAction(action);
      action.status = ActionStatus.EXECUTED;
      action.executedAt = new Date();
      action.result = result;

      // Record learning
      await adaptiveEngine.recordLearning({
        actionId: action.id,
        moduleName: action.moduleName,
        actionType: action.actionType,
        outcomeSuccess: true,
        performanceImpact: 10, // MEDIUM actions have moderate impact
        timestamp: new Date(),
        learnings: [`Successfully executed MEDIUM clearance action: ${action.title}`],
      });

      this.emit('action:executed', action);
    } catch (error) {
      action.status = ActionStatus.FAILED;
      action.error = (error as Error).message;

      logger.error('Failed to execute delayed MEDIUM clearance action', {
        id: action.id,
        error: action.error,
      });

      // Record failure
      await adaptiveEngine.recordLearning({
        actionId: action.id,
        moduleName: action.moduleName,
        actionType: action.actionType,
        outcomeSuccess: false,
        performanceImpact: -10,
        timestamp: new Date(),
        learnings: [`Failed to execute MEDIUM clearance action: ${action.error}`],
      });

      this.emit('action:failed', action);
    }

    // Move to history
    this.pendingActions.delete(actionId);
    this.addToHistory(action);
    await this.saveState();
  }

  /**
   * Timeout a HIGH clearance action
   */
  private async timeoutAction(actionId: string): Promise<void> {
    const action = this.pendingActions.get(actionId);

    if (!action) {
      // Action was already processed
      return;
    }

    if (action.status !== ActionStatus.PENDING) {
      // Action was already approved/rejected
      return;
    }

    logger.warn('HIGH clearance action timed out', {
      id: actionId,
      actionType: action.actionType,
    });

    action.status = ActionStatus.REJECTED;
    action.error = 'Approval timeout (24 hours)';

    // Record learning
    await adaptiveEngine.recordLearning({
      actionId: action.id,
      moduleName: action.moduleName,
      actionType: action.actionType,
      outcomeSuccess: false,
      performanceImpact: -15,
      timestamp: new Date(),
      learnings: ['HIGH clearance action timed out - no approval received'],
    });

    // Move to history
    this.pendingActions.delete(actionId);
    this.addToHistory(action);
    await this.saveState();

    this.emit('action:timeout', action);
  }

  /**
   * Execute an action (stub - will be implemented by modules)
   */
  private async executeAction(action: JarvisAction): Promise<any> {
    // This is a stub implementation
    // In production, this would delegate to the appropriate module
    logger.info('Executing action', {
      id: action.id,
      module: action.moduleName,
      actionType: action.actionType,
    });

    // Simulate execution
    return {
      actionId: action.id,
      executedAt: new Date(),
      success: true,
      message: `Action ${action.actionType} executed successfully`,
    };
  }

  /**
   * Add action to execution history
   */
  private addToHistory(action: JarvisAction): void {
    this.executionHistory.push(action);

    // Trim history if needed
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get pending actions
   */
  getPendingActions(clearanceLevel?: ClearanceLevel): JarvisAction[] {
    const actions = Array.from(this.pendingActions.values());
    if (clearanceLevel) {
      return actions.filter(a => a.clearanceLevel === clearanceLevel);
    }
    return actions;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 100): JarvisAction[] {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get action by ID
   */
  getAction(actionId: string): JarvisAction | undefined {
    return this.pendingActions.get(actionId) ||
           this.executionHistory.find(a => a.id === actionId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    pendingActions: number;
    pendingByLevel: Record<ClearanceLevel, number>;
    executionHistory: number;
    successRate: number;
    avgExecutionTime: number;
  } {
    const pendingByLevel = {
      [ClearanceLevel.LOW]: 0,
      [ClearanceLevel.MEDIUM]: 0,
      [ClearanceLevel.HIGH]: 0,
    };

    for (const action of this.pendingActions.values()) {
      pendingByLevel[action.clearanceLevel]++;
    }

    const executedActions = this.executionHistory.filter(
      a => a.status === ActionStatus.EXECUTED
    );
    const successRate = this.executionHistory.length > 0
      ? (executedActions.length / this.executionHistory.length) * 100
      : 0;

    const totalExecutionTime = executedActions.reduce((sum, action) => {
      if (action.executedAt && action.requestedAt) {
        return sum + (action.executedAt.getTime() - action.requestedAt.getTime());
      }
      return sum;
    }, 0);

    const avgExecutionTime = executedActions.length > 0
      ? totalExecutionTime / executedActions.length
      : 0;

    return {
      pendingActions: this.pendingActions.size,
      pendingByLevel,
      executionHistory: this.executionHistory.length,
      successRate,
      avgExecutionTime,
    };
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const clearanceSystem = ClearanceSystem.getInstance();
