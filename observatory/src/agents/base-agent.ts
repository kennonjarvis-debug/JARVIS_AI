/**
 * Base Agent Class
 *
 * Foundation for all specialized agents in Jarvis.
 * Provides common functionality for task execution, decision-making,
 * memory integration, and approval workflows.
 */

import { anthropic, DEFAULT_MODEL, getOpenAIClient, validateOpenAIConfig } from '../integrations/anthropic.js';
import { Logger } from '../utils/logger.js';
import { JarvisError, ErrorCode } from '../utils/error-handler.js';
import type { DecisionEngine } from '../core/decision-engine.js';
import type { MemorySystem } from '../core/memory.js';
import type { ApprovalQueue } from '../core/approval-queue.js';
import type {
  AgentConfig,
  AgentCapability,
  AgentStatus,
} from '../types/agents.js';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks.js';
import type { DecisionResult } from '../types/decisions.js';

// Export AgentConfig for use by subclasses
export type { AgentConfig };

/**
 * Abstract base class for all Jarvis agents
 *
 * All specialized agents (Marketing, Sales, Support, Operations) extend this class
 * and implement the abstract methods for their specific functionality.
 */
export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected capabilities: AgentCapability[];
  protected integrations: Record<string, any>;
  protected decisionEngine: DecisionEngine;
  protected memory: MemorySystem;
  protected approvalQueue: ApprovalQueue;
  protected logger: Logger;
  protected status: 'idle' | 'busy' | 'error';

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.capabilities = config.capabilities || [];
    this.integrations = config.integrations;
    this.decisionEngine = config.decisionEngine!;
    this.memory = config.memory!;
    this.approvalQueue = config.approvalQueue!;
    this.logger = new Logger(`Agent:${this.name}`);
    this.status = 'idle';

    this.logger.info('Agent initialized', {
      agentId: this.id,
      capabilities: this.capabilities.length,
    });
  }

  // ========================================================================
  // Abstract methods - must be implemented by subclasses
  // ========================================================================

  /**
   * Get list of task types this agent can handle
   */
  abstract getSupportedTaskTypes(): TaskType[];

  /**
   * Check if this agent can handle a specific task
   */
  abstract canHandle(task: TaskRequest): boolean;

  /**
   * Execute a task (subclass-specific implementation)
   */
  abstract executeTask(task: TaskRequest): Promise<TaskResult>;

  // ========================================================================
  // Public methods
  // ========================================================================

  /**
   * Main execution method with decision engine integration
   *
   * This method orchestrates the full task lifecycle:
   * 1. Validates agent can handle the task
   * 2. Consults decision engine for risk assessment
   * 3. Requests approval if needed
   * 4. Executes task
   * 5. Stores result in memory
   */
  async execute(task: TaskRequest): Promise<TaskResult> {
    this.status = 'busy';
    this.logger.info('Executing task', { taskId: task.id, type: task.type });

    try {
      // 1. Check if agent can handle this task
      if (!this.canHandle(task)) {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Agent ${this.name} cannot handle task type ${task.type}`,
          { taskId: task.id, agentId: this.id },
          false
        );
      }

      // 2. Get decision from decision engine with historical context
      const historicalMemories = await this.memory.query({
        type: undefined, // All types
        tags: [task.type],
        limit: 10,
        sortBy: 'importance',
        sortOrder: 'desc',
      });

      const decision = await this.decisionEngine.evaluate({
        taskType: task.type,
        taskData: task.data,
        historicalData: historicalMemories,
        userPreferences: task.metadata?.userPreferences,
        currentState: {},
      });

      this.logger.debug('Decision engine evaluation complete', {
        taskId: task.id,
        action: decision.action,
        confidence: decision.confidence,
        riskLevel: decision.riskLevel,
      });

      // 3. Handle based on decision
      if (decision.action === 'reject') {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Task rejected by decision engine: ${decision.reasoning}`,
          { taskId: task.id, decision },
          false
        );
      }

      if (decision.requiresApproval) {
        return await this.requestApproval(task, decision);
      }

      // 4. Execute task
      const result = await this.executeTask(task);

      // 5. Store in memory
      await this.memory.store({
        type: 'task_execution' as any,
        content: { task, result, decision },
        timestamp: new Date(),
        importance: 0.5,
        agentId: this.id,
        taskId: task.id,
        tags: [task.type, result.success ? 'success' : 'failure'],
      });

      this.logger.info('Task completed successfully', {
        taskId: task.id,
        success: result.success,
      });

      this.status = 'idle';
      return result;
    } catch (error) {
      this.status = 'error';
      this.logger.error('Task execution failed', error as Error, { taskId: task.id });

      // Store failure in memory for learning
      await this.memory.store({
        type: 'error' as any,
        content: { task, error: (error as Error).message },
        timestamp: new Date(),
        importance: 0.7,
        agentId: this.id,
        taskId: task.id,
        tags: [task.type, 'error'],
      }).catch(() => {
        // Don't throw if memory storage fails
        this.logger.warn('Failed to store error in memory');
      });

      throw error;
    }
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return {
      id: this.id,
      name: this.name,
      activeTasks: 0, // TODO: Track active tasks
      capabilities: this.capabilities,
      isHealthy: this.status !== 'error',
      statusMessage: this.status,
      lastHealthCheck: new Date(),
    };
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapability[] {
    return this.capabilities;
  }

  // ========================================================================
  // Protected helper methods (available to subclasses)
  // ========================================================================

  /**
   * Request human approval for a task
   *
   * Submits the task to the approval queue and returns a pending result.
   * The task will not execute until approved.
   */
  protected async requestApproval(
    task: TaskRequest,
    decision: DecisionResult
  ): Promise<TaskResult> {
    this.logger.info('Requesting approval for task', {
      taskId: task.id,
      riskLevel: decision.riskLevel,
    });

    const requestId = await this.approvalQueue.requestApproval({
      taskId: task.id,
      taskType: task.type,
      requestedAction: JSON.stringify(task.data),
      reasoning: decision.reasoning,
      riskLevel: decision.riskLevel,
      estimatedImpact: decision.estimatedImpact,
      alternatives: decision.alternatives,
      metadata: {
        agentId: this.id,
        confidence: decision.confidence,
      },
    });

    return {
      taskId: task.id,
      success: false,
      status: 'pending_approval',
      data: { requestId },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Task requires approval. Request ID: ${requestId}`,
    };
  }

  /**
   * Generate content using Claude
   *
   * ✅ Uses centralized model configuration from CONFIG
   *
   * @param prompt - The prompt to send to Claude
   * @param context - Optional additional context
   * @returns Generated text content
   */
  protected async generateContent(
    prompt: string,
    context?: any
  ): Promise<string> {
    this.logger.debug('Generating content with AI', {
      promptLength: prompt.length,
      hasContext: !!context,
    });

    // Try Claude first
    try {
      this.logger.debug('Attempting Claude API');
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL,  // ✅ Use centralized model config
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        this.logger.debug('Claude API succeeded');
        return content.text;
      }

      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Unexpected response type from Claude',
        { responseType: content.type },
        true
      );
    } catch (claudeError) {
      this.logger.warn('Claude API failed, attempting OpenAI fallback', claudeError as Error);

      // Try OpenAI as fallback
      if (validateOpenAIConfig()) {
        try {
          const openai = getOpenAIClient();
          const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o',
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          });

          const content = response.choices[0]?.message?.content;
          if (content) {
            this.logger.info('OpenAI fallback succeeded');
            return content;
          }

          throw new Error('No content in OpenAI response');
        } catch (openaiError) {
          this.logger.error('OpenAI fallback also failed', openaiError as Error);
        }
      }

      // Both failed
      this.logger.error('Both Claude and OpenAI failed');
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to generate content with both Claude and OpenAI',
        { claudeError, prompt: prompt.substring(0, 100) },
        true
      );
    }
  }

  /**
   * Generate JSON content using Claude
   *
   * Parses Claude's response as JSON. Handles JSON wrapped in markdown code blocks.
   *
   * @param prompt - The prompt (should request JSON output)
   * @returns Parsed JSON object
   */
  protected async generateJSON<T = any>(prompt: string): Promise<T> {
    const text = await this.generateContent(prompt);

    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    try {
      return JSON.parse(jsonText) as T;
    } catch (error) {
      this.logger.error('Failed to parse JSON from Claude response', error as Error, {
        responsePreview: text.substring(0, 200),
      });
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to parse JSON response from Claude',
        { error, responsePreview: text.substring(0, 200) },
        false
      );
    }
  }

  /**
   * Validate task data against a schema
   *
   * @param task - Task to validate
   * @param requiredFields - List of required field names
   * @throws JarvisError if validation fails
   */
  protected validateTaskData(task: TaskRequest, requiredFields: string[]): void {
    const missing = requiredFields.filter(field => !(field in task.data));

    if (missing.length > 0) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        `Missing required fields: ${missing.join(', ')}`,
        { taskId: task.id, missingFields: missing },
        false
      );
    }
  }

  /**
   * Create a task result object
   *
   * Helper to create standardized TaskResult objects.
   */
  protected createTaskResult(
    taskId: string,
    success: boolean,
    data?: any,
    message?: string
  ): TaskResult {
    return {
      taskId,
      success,
      status: success ? 'completed' : 'failed',
      data,
      timestamp: new Date(),
      executedBy: this.id,
      message: message || (success ? 'Task completed successfully' : 'Task failed'),
    };
  }
}
