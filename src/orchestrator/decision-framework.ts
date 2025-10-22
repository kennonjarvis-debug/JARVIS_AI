/**
 * Decision Framework - THREE-tier risk assessment
 * Determines if actions can be auto-executed or require approval
 */

import { Logger } from '../utils/logger.js';

const logger = new Logger('DecisionFramework');

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Action {
  type: string;
  description: string;
  metadata?: Record<string, any>;
}

export class DecisionFramework {
  constructor(private db: any) {}

  /**
   * Assess the risk level of an action
   *
   * LOW RISK: Auto-execute (no approval needed)
   * - Reading/analyzing data
   * - Scheduled posts with templates
   * - Automated notifications
   * - Data synchronization
   * - Performance monitoring
   *
   * MEDIUM RISK: Notify + short delay (could auto-approve after timeout)
   * - Sending invoices
   * - Updating CRM
   * - Scheduling meetings
   * - Sending outreach emails
   * - Updating inventory
   *
   * HIGH RISK: Require explicit approval
   * - Financial transactions >$100
   * - Refunds
   * - Data deletion
   * - Contract changes
   * - Public statements
   */
  assessRisk(action: Action): RiskLevel {
    const actionType = action.type.toLowerCase();

    // HIGH RISK actions (require approval)
    const highRiskActions = [
      'issue_refund',
      'delete_record',
      'cancel_order',
      'terminate_contract',
      'make_payment',
      'change_pricing',
      'public_statement',
      'delete_user',
      'security_change',
    ];

    // MEDIUM RISK actions (notify + delay)
    const mediumRiskActions = [
      'send_invoice',
      'update_crm',
      'schedule_meeting',
      'send_outreach',
      'update_inventory',
      'create_custom_content',
      'modify_campaign',
      'bulk_email',
    ];

    // LOW RISK actions (auto-execute)
    const lowRiskActions = [
      'analyze',
      'read',
      'fetch',
      'log',
      'monitor',
      'send_notification',
      'update_status',
      'create_scheduled_post',
      'score_lead',
      'route_ticket',
      'sync_data',
      'backup',
    ];

    // Check for HIGH risk
    if (highRiskActions.some((a) => actionType.includes(a))) {
      logger.info('HIGH risk action detected', { action: action.type });
      return 'HIGH';
    }

    // Check for MEDIUM risk
    if (mediumRiskActions.some((a) => actionType.includes(a))) {
      logger.info('MEDIUM risk action detected', { action: action.type });
      return 'MEDIUM';
    }

    // Check for LOW risk
    if (lowRiskActions.some((a) => actionType.includes(a))) {
      logger.debug('LOW risk action detected', { action: action.type });
      return 'LOW';
    }

    // Check metadata for financial impact
    if (action.metadata?.amount && action.metadata.amount > 100) {
      logger.info('HIGH risk: financial amount >$100', {
        action: action.type,
        amount: action.metadata.amount,
      });
      return 'HIGH';
    }

    // Default to MEDIUM for unknown actions (safe default)
    logger.warn('Unknown action type, defaulting to MEDIUM risk', { action: action.type });
    return 'MEDIUM';
  }

  /**
   * Determine if an action should auto-execute based on risk level
   */
  shouldAutoExecute(riskLevel: RiskLevel): boolean {
    return riskLevel === 'LOW';
  }

  /**
   * Get approval timeout for MEDIUM risk actions
   * Returns null for LOW (auto-execute) and HIGH (require approval)
   */
  getApprovalTimeout(riskLevel: RiskLevel): number | null {
    if (riskLevel === 'LOW') return null; // Auto-execute
    if (riskLevel === 'MEDIUM') return 2 * 60 * 1000; // 2 minutes
    if (riskLevel === 'HIGH') return null; // Require explicit approval
    return null;
  }
}
