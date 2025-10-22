import { AIRouterService, AIMessage } from './ai-router.service.js';
import { MemoryService } from './memory.service.js';
import { logger } from '../logger.service.js';

export interface AgentConfig {
  name: string;
  type: 'email' | 'social-media' | 'customer-service' | 'sales' | 'general';
  systemPrompt: string;
  tools: AgentTool[];
  maxIterations?: number;
  enableMemory?: boolean;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export interface AgentTask {
  id: string;
  goal: string;
  context?: Record<string, any>;
  constraints?: string[];
  successCriteria?: string[];
}

export interface AgentExecution {
  taskId: string;
  steps: AgentStep[];
  result: string;
  success: boolean;
  cost: number;
  iterations: number;
}

export interface AgentStep {
  iteration: number;
  thought: string;
  action: string;
  actionInput: any;
  observation: string;
  timestamp: Date;
}

/**
 * AI Agent Framework
 * Autonomous agents for various business tasks
 */
export class AgentService {
  private aiRouter: AIRouterService;
  private memory?: MemoryService;
  private agents: Map<string, AgentConfig> = new Map();
  private executions: Map<string, AgentExecution> = new Map();

  constructor(
    aiRouter: AIRouterService,
    memory?: MemoryService
  ) {
    this.aiRouter = aiRouter;
    this.memory = memory;

    logger.info('Agent service initialized');
  }

  /**
   * Register an agent
   */
  registerAgent(config: AgentConfig): void {
    this.agents.set(config.name, {
      ...config,
      maxIterations: config.maxIterations ?? 10,
      enableMemory: config.enableMemory ?? true,
    });

    logger.info('Agent registered', { name: config.name, type: config.type });
  }

  /**
   * Execute an agent task with ReAct (Reason + Act) pattern
   */
  async executeTask(
    agentName: string,
    task: AgentTask,
    userId?: string
  ): Promise<AgentExecution> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    logger.info('Executing agent task', {
      agent: agentName,
      taskId: task.id,
      goal: task.goal,
    });

    const execution: AgentExecution = {
      taskId: task.id,
      steps: [],
      result: '',
      success: false,
      cost: 0,
      iterations: 0,
    };

    // Build system prompt with tools and context
    const toolsDescription = agent.tools
      .map(t => `${t.name}: ${t.description}\nParameters: ${JSON.stringify(t.parameters)}`)
      .join('\n\n');

    const systemPrompt = `${agent.systemPrompt}

You are working on the following task:
Goal: ${task.goal}
${task.context ? `Context: ${JSON.stringify(task.context)}` : ''}
${task.constraints ? `Constraints: ${task.constraints.join(', ')}` : ''}

Available tools:
${toolsDescription}

Use the ReAct (Reasoning + Acting) pattern:
1. Thought: Think about what to do next
2. Action: Choose a tool to use and provide input
3. Observation: Observe the result
4. Repeat until task is complete

Format your response as:
Thought: [your reasoning]
Action: [tool_name]
Action Input: [input for tool as JSON]

When you have completed the task, respond with:
Final Answer: [your answer]
`;

    const conversation: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Begin working on the task: ${task.goal}` },
    ];

    let iteration = 0;
    const maxIterations = agent.maxIterations ?? 10;

    while (iteration < maxIterations) {
      iteration++;
      execution.iterations = iteration;

      logger.debug('Agent iteration', { agent: agentName, iteration });

      // Get AI's next action
      const response = await this.aiRouter.chat(
        conversation,
        { taskType: 'analysis' },
        userId
      );

      execution.cost += response.cost;

      const content = response.content;

      // Check for final answer
      if (content.includes('Final Answer:')) {
        const finalAnswer = content.split('Final Answer:')[1].trim();
        execution.result = finalAnswer;
        execution.success = true;

        logger.info('Agent task completed', {
          agent: agentName,
          iterations: iteration,
          cost: execution.cost,
        });

        break;
      }

      // Parse thought, action, and action input
      const thought = this.extractSection(content, 'Thought');
      const action = this.extractSection(content, 'Action');
      const actionInputStr = this.extractSection(content, 'Action Input');

      let actionInput: any;
      try {
        actionInput = JSON.parse(actionInputStr || '{}');
      } catch {
        actionInput = actionInputStr;
      }

      const step: AgentStep = {
        iteration,
        thought,
        action,
        actionInput,
        observation: '',
        timestamp: new Date(),
      };

      // Execute tool
      const tool = agent.tools.find(t => t.name === action);
      if (tool) {
        try {
          const result = await tool.execute(actionInput);
          step.observation = JSON.stringify(result);

          logger.debug('Tool executed', {
            tool: action,
            success: true,
          });
        } catch (error: any) {
          step.observation = `Error: ${error.message}`;
          logger.error('Tool execution failed', {
            tool: action,
            error: error.message,
          });
        }
      } else {
        step.observation = `Tool not found: ${action}`;
      }

      execution.steps.push(step);

      // Add to conversation
      conversation.push(
        { role: 'assistant', content },
        { role: 'user', content: `Observation: ${step.observation}` }
      );

      // Self-correction: if stuck, provide hint
      if (iteration > maxIterations / 2 && !execution.success) {
        conversation.push({
          role: 'system',
          content: 'Hint: Consider breaking down the task into smaller steps or trying a different approach.',
        });
      }
    }

    // If max iterations reached without success
    if (!execution.success) {
      execution.result = 'Task incomplete: Maximum iterations reached';
      logger.warn('Agent max iterations reached', {
        agent: agentName,
        iterations: iteration,
      });
    }

    this.executions.set(task.id, execution);
    return execution;
  }

  /**
   * Create a pre-configured email agent
   */
  createEmailAgent(): void {
    const emailTools: AgentTool[] = [
      {
        name: 'search_emails',
        description: 'Search for emails matching criteria',
        parameters: {
          query: 'string',
          from: 'string (optional)',
          subject: 'string (optional)',
        },
        execute: async (params) => {
          // Mock implementation - integrate with actual email service
          return {
            emails: [
              { id: '1', subject: 'Sample email', from: 'user@example.com' },
            ],
          };
        },
      },
      {
        name: 'send_email',
        description: 'Send an email',
        parameters: {
          to: 'string',
          subject: 'string',
          body: 'string',
        },
        execute: async (params) => {
          logger.info('Sending email', params);
          return { success: true, messageId: 'msg_123' };
        },
      },
      {
        name: 'draft_reply',
        description: 'Draft a reply to an email',
        parameters: {
          emailId: 'string',
          tone: 'professional | friendly | formal',
        },
        execute: async (params) => {
          return {
            draft: 'Thank you for your email. I will get back to you shortly.',
          };
        },
      },
    ];

    this.registerAgent({
      name: 'email-assistant',
      type: 'email',
      systemPrompt: `You are an intelligent email assistant. Your job is to help manage emails efficiently.
You can search emails, draft replies, and send emails.
Always maintain a professional tone and respect user privacy.`,
      tools: emailTools,
    });
  }

  /**
   * Create a social media agent
   */
  createSocialMediaAgent(): void {
    const socialTools: AgentTool[] = [
      {
        name: 'generate_post',
        description: 'Generate a social media post',
        parameters: {
          platform: 'twitter | linkedin | facebook',
          topic: 'string',
          tone: 'professional | casual | humorous',
          maxLength: 'number',
        },
        execute: async (params) => {
          // Generate post content
          return {
            post: `Excited to share insights about ${params.topic}! #innovation`,
          };
        },
      },
      {
        name: 'schedule_post',
        description: 'Schedule a post for later',
        parameters: {
          platform: 'string',
          content: 'string',
          scheduledTime: 'ISO date string',
        },
        execute: async (params) => {
          return { scheduled: true, postId: 'post_123' };
        },
      },
      {
        name: 'analyze_engagement',
        description: 'Analyze engagement metrics',
        parameters: {
          platform: 'string',
          postId: 'string (optional)',
        },
        execute: async (params) => {
          return {
            likes: 150,
            shares: 25,
            comments: 10,
            reach: 5000,
          };
        },
      },
    ];

    this.registerAgent({
      name: 'social-media-manager',
      type: 'social-media',
      systemPrompt: `You are a social media marketing expert. Your job is to create engaging content,
schedule posts, and analyze performance. Always consider platform best practices and audience engagement.`,
      tools: socialTools,
    });
  }

  /**
   * Create customer service agent
   */
  createCustomerServiceAgent(): void {
    const serviceTools: AgentTool[] = [
      {
        name: 'search_knowledge_base',
        description: 'Search company knowledge base for information',
        parameters: {
          query: 'string',
        },
        execute: async (params) => {
          return {
            articles: [
              { title: 'How to reset password', content: 'Steps to reset...' },
            ],
          };
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a support ticket',
        parameters: {
          subject: 'string',
          description: 'string',
          priority: 'low | medium | high',
        },
        execute: async (params) => {
          return { ticketId: 'TKT-123', status: 'created' };
        },
      },
      {
        name: 'check_order_status',
        description: 'Check order status',
        parameters: {
          orderId: 'string',
        },
        execute: async (params) => {
          return {
            orderId: params.orderId,
            status: 'shipped',
            estimatedDelivery: '2024-12-25',
          };
        },
      },
    ];

    this.registerAgent({
      name: 'customer-service-agent',
      type: 'customer-service',
      systemPrompt: `You are a helpful customer service representative. Your goal is to resolve customer
issues efficiently and professionally. Always be empathetic and solution-oriented.`,
      tools: serviceTools,
    });
  }

  /**
   * Get agent execution history
   */
  getExecution(taskId: string): AgentExecution | undefined {
    return this.executions.get(taskId);
  }

  /**
   * List all registered agents
   */
  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Helper: Extract section from formatted response
   */
  private extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}:\\s*(.+?)(?=\\n(?:Thought|Action|Observation|Final Answer):|$)`, 's');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }
}

export default AgentService;
