/**
 * Agent Activity API
 * Provides access to agent activities for Observatory dashboard
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('AgentActivityAPI');

export interface AgentActivity {
  id: string;
  agent_type: 'marketing' | 'sales' | 'operations' | 'support' | 'imessage' | 'dawg-monitor';
  action: string;
  description: string | null;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'pending' | 'pending_approval' | 'awaiting_approval' | 'approved' | 'rejected' | 'completed' | 'failed';
  metadata: Record<string, any>;
  timestamp: string;
  approved_at: string | null;
  approved_by: string | null;
  completed_at: string | null;
  failed_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  result: Record<string, any> | null;
  error: string | null;
  duration_ms: number | null;
  correlation_id: string | null;
}

export interface AgentStats {
  agent_type: string;
  total: number;
  low_risk: number;
  medium_risk: number;
  high_risk: number;
  pending: number;
  completed: number;
  failed: number;
  avg_duration_ms: number | null;
}

export interface AgentMetrics {
  marketing: AgentStats;
  sales: AgentStats;
  operations: AgentStats;
  support: AgentStats;
}

export class AgentActivityAPI {
  constructor(private db: SupabaseClient) {}

  /**
   * Get recent agent activities
   */
  async getRecentActivities(limit: number = 50): Promise<AgentActivity[]> {
    try {
      const { data, error } = await this.db
        .from('agent_activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.warn('Database query failed, returning empty array', { error: error.message });
        return []; // Fallback to empty array instead of throwing
      }

      return data || [];
    } catch (error: any) {
      logger.warn('Error fetching activities, returning empty array', { error: error.message || error });
      return []; // Fallback to empty array
    }
  }

  /**
   * Get activities for a specific agent
   */
  async getActivitiesForAgent(
    agentType: string,
    limit: number = 50
  ): Promise<AgentActivity[]> {
    try {
      const { data, error } = await this.db
        .from('agent_activities')
        .select('*')
        .eq('agent_type', agentType)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch activities for ${agentType}: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      logger.error('Error fetching agent activities', { agentType, error: error.message });
      throw error;
    }
  }

  /**
   * Get agent metrics for all agents
   */
  async getAgentMetrics(): Promise<AgentMetrics> {
    try {
      const agentTypes = ['marketing', 'sales', 'operations', 'support'];
      const metrics: Partial<AgentMetrics> = {};

      await Promise.all(
        agentTypes.map(async (agentType) => {
          const stats = await this.getAgentStats(agentType);
          metrics[agentType as keyof AgentMetrics] = stats;
        })
      );

      return metrics as AgentMetrics;
    } catch (error: any) {
      logger.error('Error fetching agent metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get stats for a specific agent
   */
  private async getAgentStats(agentType: string): Promise<AgentStats> {
    try {
      // Get activities from last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await this.db
        .from('agent_activities')
        .select('action, status, risk_level, duration_ms')
        .eq('agent_type', agentType)
        .gte('timestamp', yesterday.toISOString());

      if (error) {
        logger.warn(`Failed to fetch stats for ${agentType}`, { error: error.message });
        // Return empty stats instead of failing
        return this.getEmptyStats(agentType);
      }

      const activities = data || [];

      // Calculate aggregate stats
      const stats: AgentStats = {
        agent_type: agentType,
        total: activities.length,
        low_risk: activities.filter((a) => a.risk_level === 'LOW').length,
        medium_risk: activities.filter((a) => a.risk_level === 'MEDIUM').length,
        high_risk: activities.filter((a) => a.risk_level === 'HIGH').length,
        pending: activities.filter(
          (a) => a.status === 'pending_approval' || a.status === 'awaiting_approval'
        ).length,
        completed: activities.filter((a) => a.status === 'completed').length,
        failed: activities.filter((a) => a.status === 'failed').length,
        avg_duration_ms:
          activities.length > 0
            ? activities
                .filter((a) => a.duration_ms != null)
                .reduce((sum, a) => sum + (a.duration_ms || 0), 0) / activities.length
            : null,
      };

      return stats;
    } catch (error: any) {
      logger.error('Error calculating agent stats', { agentType, error: error.message });
      return this.getEmptyStats(agentType);
    }
  }

  private getEmptyStats(agentType: string): AgentStats {
    return {
      agent_type: agentType,
      total: 0,
      low_risk: 0,
      medium_risk: 0,
      high_risk: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      avg_duration_ms: null,
    };
  }

  /**
   * Get approval queue (items awaiting approval)
   */
  async getApprovalQueue(): Promise<AgentActivity[]> {
    try {
      const { data, error } = await this.db
        .from('agent_activities')
        .select('*')
        .in('status', ['pending_approval', 'awaiting_approval'])
        .order('timestamp', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch approval queue: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      logger.error('Error fetching approval queue', { error: error.message });
      throw error;
    }
  }

  /**
   * Approve an action
   */
  async approveAction(activityId: string, approvedBy: string = 'user'): Promise<void> {
    try {
      const { error } = await this.db
        .from('agent_activities')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
        })
        .eq('id', activityId);

      if (error) {
        throw new Error(`Failed to approve action: ${error.message}`);
      }

      logger.info('Action approved', { activityId, approvedBy });
    } catch (error: any) {
      logger.error('Error approving action', { activityId, error: error.message });
      throw error;
    }
  }

  /**
   * Reject an action
   */
  async rejectAction(
    activityId: string,
    reason: string,
    rejectedBy: string = 'user'
  ): Promise<void> {
    try {
      const { error } = await this.db
        .from('agent_activities')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          approved_by: rejectedBy, // Store who rejected it
        })
        .eq('id', activityId);

      if (error) {
        throw new Error(`Failed to reject action: ${error.message}`);
      }

      logger.info('Action rejected', { activityId, reason, rejectedBy });
    } catch (error: any) {
      logger.error('Error rejecting action', { activityId, error: error.message });
      throw error;
    }
  }

  /**
   * Log a new agent activity
   */
  async logActivity(activity: {
    agent_type: string;
    action: string;
    description?: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    status?: string;
    metadata?: Record<string, any>;
    correlation_id?: string;
  }): Promise<string> {
    try {
      const { data, error } = await this.db
        .from('agent_activities')
        .insert({
          ...activity,
          timestamp: new Date().toISOString(),
          status: activity.status || 'pending',
          metadata: activity.metadata || {},
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to log activity: ${error.message}`);
      }

      logger.info('Activity logged', { activityId: data.id, action: activity.action });
      return data.id;
    } catch (error: any) {
      logger.error('Error logging activity', { error: error.message });
      throw error;
    }
  }

  /**
   * Update activity status
   */
  async updateActivity(
    activityId: string,
    updates: {
      status?: string;
      result?: Record<string, any>;
      error?: string;
      duration_ms?: number;
    }
  ): Promise<void> {
    try {
      const updateData: any = { ...updates };

      // Set completion timestamp if status is completed or failed
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status === 'failed') {
        updateData.failed_at = new Date().toISOString();
      }

      const { error } = await this.db
        .from('agent_activities')
        .update(updateData)
        .eq('id', activityId);

      if (error) {
        throw new Error(`Failed to update activity: ${error.message}`);
      }

      logger.info('Activity updated', { activityId, updates });
    } catch (error: any) {
      logger.error('Error updating activity', { activityId, error: error.message });
      throw error;
    }
  }

  /**
   * Get activity by ID
   */
  async getActivity(activityId: string): Promise<AgentActivity | null> {
    try {
      const { data, error } = await this.db
        .from('agent_activities')
        .select('*')
        .eq('id', activityId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new Error(`Failed to fetch activity: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      logger.error('Error fetching activity', { activityId, error: error.message });
      throw error;
    }
  }
}
