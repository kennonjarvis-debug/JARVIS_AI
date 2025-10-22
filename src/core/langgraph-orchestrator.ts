/**
 * LangGraph Orchestrator
 *
 * Multi-agent orchestration system using LangGraph for intelligent task routing
 * and agent collaboration. Enables complex workflows with sequential and parallel
 * execution modes.
 *
 * @module core/langgraph-orchestrator
 */

import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseAgent } from '../agents/base-agent.js';
import { Logger } from '../utils/logger.js';
import { JarvisError, ErrorCode } from '../utils/error-handler.js';
import { MemorySystem } from './memory.js';
import { anthropic, DEFAULT_MODEL } from '../integrations/anthropic.js';
import type { TaskRequest, TaskResult } from '../types/tasks.js';
import type { Anthropic } from '@anthropic-ai/sdk';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * LangGraph state that flows through the workflow
 */
const GraphStateAnnotation = Annotation.Root({
  taskId: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  originalRequest: Annotation<TaskRequest>({
    reducer: (x, y) => y ?? x,
  }),
  currentStep: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  agentResponses: Annotation<Record<string, TaskResult>>({
    reducer: (x, y) => ({ ...x, ...y }),
  }),
  finalResult: Annotation<any>({
    reducer: (x, y) => y ?? x,
  }),
  error: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  requiresApproval: Annotation<boolean>({
    reducer: (x, y) => x || y,
  }),
  metadata: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
  }),
});

type GraphState = typeof GraphStateAnnotation.State;

/**
 * Task analysis result from supervisor
 */
interface TaskAnalysis {
  agents: string[];
  priority: 'low' | 'medium' | 'high';
  estimated_complexity: 'simple' | 'moderate' | 'complex';
  requires_collaboration: boolean;
  execution_order?: string[];
  reasoning: string;
}

/**
 * Aggregated result from multiple agents
 */
interface AggregatedResult {
  summary: string;
  agentActions: Record<string, string>;
  followUpActions: string[];
  success: boolean;
  needsMoreWork: boolean;
}

// ============================================================================
// LANGGRAPH ORCHESTRATOR
// ============================================================================

export class LangGraphOrchestrator {
  private graph: any;
  private agents: Map<string, BaseAgent>;
  private logger: Logger;
  private memory: MemorySystem;
  private anthropic: Anthropic.Anthropic;

  constructor(memory: MemorySystem) {
    this.agents = new Map();
    this.logger = new Logger('LangGraphOrchestrator');
    this.memory = memory;
    this.anthropic = anthropic;

    this.initializeGraph();
  }

  /**
   * Initialize the LangGraph workflow
   */
  private initializeGraph(): void {
    this.logger.info('Initializing LangGraph workflow...');

    const workflow = new StateGraph(GraphStateAnnotation)
      .addNode('supervisor', this.supervisorNode.bind(this))
      .addNode('route_to_agent', this.routeToAgent.bind(this))
      .addNode('aggregate_results', this.aggregateResults.bind(this))
      .addEdge(START, 'supervisor')
      .addEdge('supervisor', 'route_to_agent')
      .addEdge('route_to_agent', 'aggregate_results')
      .addConditionalEdges('aggregate_results', this.shouldContinue.bind(this), {
        continue: 'supervisor',
        end: END,
      });

    this.graph = workflow.compile();
    this.logger.info('LangGraph workflow initialized successfully');
  }

  /**
   * Supervisor node - analyzes task and determines which agents to invoke
   */
  private async supervisorNode(state: GraphState): Promise<Partial<GraphState>> {
    this.logger.info('Supervisor analyzing task', { taskId: state.taskId });

    try {
      const response = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1500,
        system: this.getSupervisorSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: this.buildSupervisorPrompt(state),
          },
        ],
      });

      const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';

      let analysis: TaskAnalysis;
      try {
        const cleanText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysis = JSON.parse(cleanText);
      } catch (error) {
        this.logger.error('Failed to parse supervisor response', error as Error);
        // Fallback to operations agent for simple tasks
        analysis = {
          agents: ['operations'],
          priority: 'medium',
          estimated_complexity: 'simple',
          requires_collaboration: false,
          reasoning: 'Fallback due to parsing error',
        };
      }

      this.logger.info('Supervisor analysis complete', {
        taskId: state.taskId,
        agents: analysis.agents,
        complexity: analysis.estimated_complexity,
      });

      return {
        currentStep: 'routing',
        metadata: {
          ...state.metadata,
          supervisorAnalysis: analysis,
        },
      };
    } catch (error) {
      this.logger.error('Supervisor node failed', error as Error);
      throw new JarvisError(
        ErrorCode.SYSTEM_ERROR,
        'Supervisor analysis failed',
        { error: (error as Error).message, taskId: state.taskId },
        true // recoverable
      );
    }
  }

  /**
   * Route to appropriate agents
   */
  private async routeToAgent(state: GraphState): Promise<Partial<GraphState>> {
    const analysis = state.metadata?.supervisorAnalysis as TaskAnalysis;
    const agentsToInvoke = analysis?.agents || ['operations'];

    this.logger.info('Routing to agents', { agents: agentsToInvoke, taskId: state.taskId });

    const responses: Record<string, TaskResult> = {};

    try {
      // Sequential vs parallel execution
      if (analysis?.execution_order && analysis.execution_order.length > 0) {
        // Sequential execution
        this.logger.info('Executing agents sequentially', {
          order: analysis.execution_order,
        });

        for (const agentName of analysis.execution_order) {
          const agent = this.agents.get(agentName);
          if (agent) {
            this.logger.debug('Executing agent', { agent: agentName });

            // Create task request for this agent
            const agentTask: TaskRequest = {
              ...state.originalRequest,
              metadata: {
                ...state.originalRequest.metadata,
                previousResponses: responses,
                supervisorAnalysis: analysis,
              },
            };

            responses[agentName] = await agent.execute(agentTask);
          } else {
            this.logger.warn('Agent not found', { agent: agentName });
          }
        }
      } else {
        // Parallel execution
        this.logger.info('Executing agents in parallel', { agents: agentsToInvoke });

        const promises = agentsToInvoke.map(async (agentName: string) => {
          const agent = this.agents.get(agentName);
          if (!agent) {
            this.logger.warn('Agent not found', { agent: agentName });
            return null;
          }

          try {
            const result = await agent.execute(state.originalRequest);
            return { agentName, result };
          } catch (error) {
            this.logger.error('Agent execution failed', error as Error, {
              agent: agentName,
            });
            return {
              agentName,
              result: {
                taskId: state.taskId,
                success: false,
                status: 'failed' as const,
                error: error as Error,
                timestamp: new Date(),
                executedBy: agentName,
                message: `Agent ${agentName} failed: ${(error as Error).message}`,
              },
            };
          }
        });

        const results = await Promise.all(promises);

        results.forEach((result) => {
          if (result) {
            responses[result.agentName] = result.result;
          }
        });
      }

      return {
        currentStep: 'aggregating',
        agentResponses: responses,
      };
    } catch (error) {
      this.logger.error('Agent routing failed', error as Error);
      throw new JarvisError(
        ErrorCode.SYSTEM_ERROR,
        'Agent routing failed',
        { error: (error as Error).message, taskId: state.taskId },
        true // recoverable
      );
    }
  }

  /**
   * Aggregate results from multiple agents
   */
  private async aggregateResults(state: GraphState): Promise<Partial<GraphState>> {
    this.logger.info('Aggregating results', { taskId: state.taskId });

    try {
      const response = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 2000,
        system: this.getAggregatorSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: this.buildAggregatorPrompt(state),
          },
        ],
      });

      const resultText = response.content[0].type === 'text' ? response.content[0].text : '';

      let finalResult: AggregatedResult;
      try {
        const cleanText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        finalResult = JSON.parse(cleanText);
      } catch (error) {
        this.logger.error('Failed to parse aggregation response', error as Error);
        // Fallback result
        finalResult = {
          summary: 'Task processing completed',
          agentActions: {},
          followUpActions: [],
          success: true,
          needsMoreWork: false,
        };
      }

      // Store in memory
      await this.memory.store({
        type: 'multi_agent_execution' as any,
        content: {
          taskId: state.taskId,
          task: state.originalRequest,
          agentResponses: state.agentResponses,
          finalResult,
        },
        timestamp: new Date(),
        importance: 0.7,
        taskId: state.taskId,
        tags: [state.originalRequest.type, 'multi_agent'],
      });

      return {
        currentStep: 'completed',
        finalResult,
      };
    } catch (error) {
      this.logger.error('Result aggregation failed', error as Error);
      throw new JarvisError(
        ErrorCode.SYSTEM_ERROR,
        'Result aggregation failed',
        { error: (error as Error).message, taskId: state.taskId },
        true // recoverable
      );
    }
  }

  /**
   * Determine if workflow should continue
   */
  private shouldContinue(state: GraphState): string {
    if (state.finalResult?.needsMoreWork) {
      this.logger.info('Workflow continuing - more work needed', {
        taskId: state.taskId,
      });
      return 'continue';
    }
    return 'end';
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Register an agent with the orchestrator
   */
  public registerAgent(name: string, agent: BaseAgent): void {
    this.agents.set(name, agent);
    this.logger.info('Agent registered', { name, agentId: agent.getId() });
  }

  /**
   * Execute a task using the LangGraph workflow
   */
  public async executeTask(
    request: TaskRequest,
    metadata: Record<string, any> = {}
  ): Promise<any> {
    const taskId = request.id;

    this.logger.info('Executing task via LangGraph', {
      taskId,
      taskType: request.type,
    });

    const initialState: GraphState = {
      taskId,
      originalRequest: request,
      currentStep: 'start',
      agentResponses: {},
      requiresApproval: false,
      metadata,
    };

    try {
      const finalState = await this.graph.invoke(initialState);

      this.logger.info('Task execution complete', {
        taskId,
        success: finalState.finalResult?.success,
      });

      return finalState.finalResult;
    } catch (error) {
      this.logger.error('Task execution failed', error as Error, { taskId });
      throw error;
    }
  }

  /**
   * Get list of registered agents
   */
  public getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  // ============================================================================
  // PROMPT BUILDERS
  // ============================================================================

  private getSupervisorSystemPrompt(): string {
    return `You are a task supervisor for JARVIS autonomous business AI system.

Your job is to analyze incoming tasks and determine which specialized agents should handle them.

Available agents:
- **marketing**: Social media, content creation, SEO, brand messaging, campaigns
- **sales**: Lead generation, conversion, onboarding, upselling, CRM
- **operations**: Analytics, reporting, workflow automation, data management
- **support**: Customer service, ticket handling, knowledge base, community

Analyze the task and return JSON in this exact format:
{
  "agents": ["list", "of", "agent", "names"],
  "priority": "low|medium|high",
  "estimated_complexity": "simple|moderate|complex",
  "requires_collaboration": true|false,
  "execution_order": ["agent1", "agent2"],
  "reasoning": "Why these agents were selected"
}

IMPORTANT:
- Use execution_order ONLY if agents must execute sequentially
- Leave execution_order undefined for parallel execution
- Choose the minimum number of agents needed
- Consider task dependencies when ordering
- Be specific in your reasoning`;
  }

  private buildSupervisorPrompt(state: GraphState): string {
    const task = state.originalRequest;

    return `Analyze this task and determine which agents should handle it:

Task Type: ${task.type}
Priority: ${task.priority}
Requested By: ${task.requestedBy}

Task Data:
${JSON.stringify(task.data, null, 2)}

${task.metadata ? `Metadata:\n${JSON.stringify(task.metadata, null, 2)}` : ''}

Return your analysis as JSON.`;
  }

  private getAggregatorSystemPrompt(): string {
    return `You are a result aggregator for JARVIS autonomous business AI system.

Synthesize responses from multiple specialized agents into a coherent final result.

Provide:
1. Clear summary of what was accomplished
2. Key actions taken by each agent
3. Any follow-up actions needed
4. Success metrics or outcomes

Return JSON in this exact format:
{
  "summary": "What was accomplished",
  "agentActions": {
    "agent_name": "what they did"
  },
  "followUpActions": ["action1", "action2"],
  "success": true|false,
  "needsMoreWork": true|false
}

IMPORTANT:
- Be concise but comprehensive
- Highlight any issues or failures
- Set needsMoreWork to true only if critical steps remain
- Provide actionable follow-up items`;
  }

  private buildAggregatorPrompt(state: GraphState): string {
    const task = state.originalRequest;
    const responses = state.agentResponses;

    return `Aggregate these agent responses into a final result:

Original Task Type: ${task.type}

Task Data:
${JSON.stringify(task.data, null, 2)}

Agent Responses:
${JSON.stringify(responses, null, 2)}

Synthesize into a final result as JSON.`;
  }
}
