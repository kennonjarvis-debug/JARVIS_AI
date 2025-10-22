/**
 * Agent Orchestrator
 * Runs agents autonomously on schedules and logs activities to database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DecisionFramework, type RiskLevel } from './decision-framework.js';
import { AgentActivityAPI } from '../api/agent-activity.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Orchestrator');

// Mock agent interfaces - these would be replaced with actual agents
interface Agent {
  determineTasks(): Promise<Action[]>;
  execute(action: Action): Promise<any>;
}

interface Action {
  type: string;
  description: string;
  metadata?: Record<string, any>;
}

export class AgentOrchestrator {
  private decisionFramework: DecisionFramework;
  private activityAPI: AgentActivityAPI;
  private running = false;
  private intervals: NodeJS.Timeout[] = [];

  // Mock agents - in production these would be real agent instances
  private agents: Map<string, Agent> = new Map();

  constructor(private db: SupabaseClient) {
    this.decisionFramework = new DecisionFramework(db);
    this.activityAPI = new AgentActivityAPI(db);
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(type: string, agent: Agent) {
    this.agents.set(type, agent);
    logger.info(`Agent registered: ${type}`);
  }

  /**
   * Start the orchestrator - begins running agents on schedules
   */
  async start() {
    logger.info('🚀 Starting Agent Orchestrator...');
    this.running = true;

    // Register mock agents for demonstration
    this.registerMockAgents();

    // Schedule agents with different intervals
    // Marketing: Every 1 minute
    this.scheduleAgent('marketing', 60000);

    // Sales: Every 2 minutes
    this.scheduleAgent('sales', 120000);

    // Operations: Every 5 minutes
    this.scheduleAgent('operations', 300000);

    // Support: Every 30 seconds
    this.scheduleAgent('support', 30000);

    logger.info('✅ All agents scheduled and running');
    logger.info('📊 Agents will autonomously execute tasks and log to database');
  }

  /**
   * Stop the orchestrator
   */
  stop() {
    logger.info('🛑 Stopping Agent Orchestrator...');
    this.running = false;

    // Clear all intervals
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];

    logger.info('✅ Orchestrator stopped');
  }

  /**
   * Schedule an agent to run periodically
   */
  private scheduleAgent(agentType: string, intervalMs: number) {
    const agent = this.agents.get(agentType);
    if (!agent) {
      logger.error(`Agent not found: ${agentType}`);
      return;
    }

    const execute = async () => {
      if (!this.running) return;

      try {
        logger.info(`🤖 ${agentType} agent checking for tasks...`);

        // Agent determines what actions to take
        const actions = await agent.determineTasks();

        if (actions.length === 0) {
          logger.debug(`${agentType} agent: no tasks to execute`);
          return;
        }

        logger.info(`${agentType} agent found ${actions.length} tasks`);

        // Process each action
        for (const action of actions) {
          await this.processAction(agentType, agent, action);
        }
      } catch (error: any) {
        logger.error(`❌ Error in ${agentType} agent:`, error);

        // Log error as failed activity
        await this.activityAPI.logActivity({
          agent_type: agentType,
          action: 'agent_error',
          description: `Agent error: ${error.message}`,
          risk_level: 'LOW',
          status: 'failed',
          metadata: { error: error.message },
        });
      }
    };

    // Execute immediately
    execute();

    // Then schedule on interval
    const interval = setInterval(execute, intervalMs);
    this.intervals.push(interval);

    logger.info(`${agentType} agent scheduled (interval: ${intervalMs}ms)`);
  }

  /**
   * Process a single action from an agent
   */
  private async processAction(agentType: string, agent: Agent, action: Action) {
    const startTime = Date.now();

    try {
      // Step 1: Assess risk
      const riskLevel = this.decisionFramework.assessRisk(action);

      // Step 2: Log activity to database
      const activityId = await this.activityAPI.logActivity({
        agent_type: agentType,
        action: action.type,
        description: action.description,
        risk_level: riskLevel,
        status: riskLevel === 'LOW' ? 'approved' : 'pending_approval',
        metadata: action.metadata || {},
      });

      logger.info(`📝 Activity logged: ${action.type} (risk: ${riskLevel})`, {
        activityId,
      });

      // Step 3: Execute if LOW risk, otherwise queue for approval
      if (riskLevel === 'LOW') {
        await this.executeAction(agent, action, activityId, startTime);
      } else {
        logger.info(
          `⏸️  ${agentType} agent action requires approval: ${action.type}`,
          {
            activityId,
            riskLevel,
          }
        );
      }
    } catch (error: any) {
      logger.error(`❌ Failed to process action: ${action.type}`, error);
    }
  }

  /**
   * Execute an approved action
   */
  private async executeAction(
    agent: Agent,
    action: Action,
    activityId: string,
    startTime: number
  ) {
    try {
      logger.info(`▶️  Executing: ${action.type}`);

      // Execute the action
      const result = await agent.execute(action);
      const duration = Date.now() - startTime;

      // Update activity with success
      await this.activityAPI.updateActivity(activityId, {
        status: 'completed',
        result: result || {},
        duration_ms: duration,
      });

      logger.info(`✅ Completed: ${action.type} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error(`❌ Failed to execute: ${action.type}`, error);

      // Update activity with failure
      await this.activityAPI.updateActivity(activityId, {
        status: 'failed',
        error: error.message,
        duration_ms: duration,
      });
    }
  }

  /**
   * Register mock agents for demonstration
   * In production, these would be replaced with actual agent implementations
   */
  private registerMockAgents() {
    // Marketing Agent
    this.registerAgent('marketing', {
      async determineTasks() {
        // Simulate checking for scheduled posts
        const shouldPost = Math.random() > 0.7; // 30% chance

        if (shouldPost) {
          return [
            {
              type: 'create_scheduled_post',
              description: 'Post AI music production tips to Twitter',
              metadata: { platform: 'twitter', template: 'tips' },
            },
          ];
        }

        return [
          {
            type: 'analyze_social_performance',
            description: 'Analyze last week\'s social media engagement',
            metadata: { period: '7days' },
          },
        ];
      },
      async execute(action) {
        // Simulate execution
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true, actionType: action.type };
      },
    });

    // Sales Agent
    this.registerAgent('sales', {
      async determineTasks() {
        // Simulate lead scoring
        const hasNewLeads = Math.random() > 0.6; // 40% chance

        if (hasNewLeads) {
          return [
            {
              type: 'score_lead',
              description: 'Score new lead from contact form',
              metadata: { source: 'website', email: 'prospect@example.com' },
            },
          ];
        }

        return [];
      },
      async execute(action) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { success: true, score: Math.floor(Math.random() * 100) };
      },
    });

    // Operations Agent
    this.registerAgent('operations', {
      async determineTasks() {
        return [
          {
            type: 'sync_data',
            description: 'Synchronize data across systems',
            metadata: { systems: ['CRM', 'Analytics', 'Billing'] },
          },
          {
            type: 'backup_database',
            description: 'Automated database backup',
            metadata: { type: 'incremental' },
          },
        ];
      },
      async execute(action) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { success: true, recordsSynced: Math.floor(Math.random() * 1000) };
      },
    });

    // Support Agent
    this.registerAgent('support', {
      async determineTasks() {
        // Simulate ticket routing
        const hasNewTickets = Math.random() > 0.8; // 20% chance

        if (hasNewTickets) {
          return [
            {
              type: 'route_ticket',
              description: 'Route ticket #' + Math.floor(Math.random() * 10000) + ' to technical support',
              metadata: { priority: 'medium', category: 'technical' },
            },
          ];
        }

        return [];
      },
      async execute(action) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { success: true, assigned: 'tech-support' };
      },
    });
  }
}
