import { AIRouterService, AIMessage } from './ai-router.service.js';
import { VectorDBService } from './vector-db.service.js';
import { logger } from '../logger.service.js';

export interface Chain {
  name: string;
  steps: ChainStep[];
  memory?: ConversationMemory;
}

export interface ChainStep {
  type: 'llm' | 'transform' | 'retrieve' | 'tool';
  name: string;
  config: any;
  execute: (input: any, context: ChainContext) => Promise<any>;
}

export interface ChainContext {
  memory?: ConversationMemory;
  variables: Map<string, any>;
}

export interface ConversationMemory {
  messages: AIMessage[];
  maxMessages?: number;
  summarize?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  execute: (input: any) => Promise<any>;
}

export interface Agent {
  name: string;
  systemPrompt: string;
  tools: Tool[];
  maxIterations?: number;
}

/**
 * LangChain-inspired service for composing AI workflows
 */
export class LangChainService {
  private aiRouter: AIRouterService;
  private vectorDB?: VectorDBService;
  private chains: Map<string, Chain> = new Map();
  private tools: Map<string, Tool> = new Map();

  constructor(
    aiRouter: AIRouterService,
    vectorDB?: VectorDBService
  ) {
    this.aiRouter = aiRouter;
    this.vectorDB = vectorDB;

    logger.info('LangChain service initialized');
  }

  /**
   * Create a simple LLM chain
   */
  createLLMChain(
    name: string,
    systemPrompt: string,
    memory?: ConversationMemory
  ): Chain {
    const chain: Chain = {
      name,
      memory,
      steps: [
        {
          type: 'llm',
          name: 'llm_call',
          config: { systemPrompt },
          execute: async (input: string, context: ChainContext) => {
            const messages: AIMessage[] = [
              { role: 'system', content: systemPrompt },
            ];

            // Add memory if available
            if (context.memory?.messages) {
              messages.push(...context.memory.messages);
            }

            // Add current input
            messages.push({ role: 'user', content: input });

            const response = await this.aiRouter.chat(messages);

            // Update memory
            if (context.memory) {
              context.memory.messages.push(
                { role: 'user', content: input },
                { role: 'assistant', content: response.content }
              );

              // Trim memory if needed
              if (
                context.memory.maxMessages &&
                context.memory.messages.length > context.memory.maxMessages
              ) {
                context.memory.messages = context.memory.messages.slice(
                  -context.memory.maxMessages
                );
              }
            }

            return response.content;
          },
        },
      ],
    };

    this.chains.set(name, chain);
    return chain;
  }

  /**
   * Create a sequential chain (output of one step feeds into next)
   */
  createSequentialChain(
    name: string,
    steps: ChainStep[],
    memory?: ConversationMemory
  ): Chain {
    const chain: Chain = {
      name,
      steps,
      memory,
    };

    this.chains.set(name, chain);
    return chain;
  }

  /**
   * Create a retrieval chain (RAG pattern)
   */
  createRetrievalChain(
    name: string,
    systemPrompt: string,
    topK: number = 5
  ): Chain {
    if (!this.vectorDB) {
      throw new Error('Vector DB required for retrieval chain');
    }

    const chain: Chain = {
      name,
      steps: [
        {
          type: 'retrieve',
          name: 'retrieve_context',
          config: { topK },
          execute: async (input: string, context: ChainContext) => {
            const results = await this.vectorDB!.search(input, { topK });
            const retrievedContext = results
              .map((r, i) => `[${i + 1}] ${r.text}`)
              .join('\n\n');

            context.variables.set('context', retrievedContext);
            return retrievedContext;
          },
        },
        {
          type: 'llm',
          name: 'generate_answer',
          config: { systemPrompt },
          execute: async (input: string, context: ChainContext) => {
            const retrievedContext = context.variables.get('context') || '';

            const messages: AIMessage[] = [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: `Context:\n${retrievedContext}\n\nQuestion: ${input}`,
              },
            ];

            const response = await this.aiRouter.chat(messages);
            return response.content;
          },
        },
      ],
    };

    this.chains.set(name, chain);
    return chain;
  }

  /**
   * Run a chain
   */
  async runChain(
    chainName: string,
    input: any,
    userId?: string
  ): Promise<any> {
    const chain = this.chains.get(chainName);
    if (!chain) {
      throw new Error(`Chain not found: ${chainName}`);
    }

    logger.info('Running chain', { chain: chainName });

    const context: ChainContext = {
      memory: chain.memory,
      variables: new Map(),
    };

    let output = input;

    for (const step of chain.steps) {
      logger.debug('Executing chain step', { step: step.name });
      output = await step.execute(output, context);
    }

    return output;
  }

  /**
   * Register a tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    logger.info('Tool registered', { tool: tool.name });
  }

  /**
   * Create an agent that can use tools
   */
  async createAgent(config: Agent): Promise<void> {
    logger.info('Creating agent', { agent: config.name });

    // Agent loop: think -> act -> observe
    const agentLoop = async (input: string, userId?: string): Promise<string> => {
      let iterations = 0;
      const maxIterations = config.maxIterations || 5;
      const conversation: AIMessage[] = [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: input },
      ];

      while (iterations < maxIterations) {
        // Think: ask AI what to do next
        const toolDescriptions = config.tools
          .map(t => `- ${t.name}: ${t.description}`)
          .join('\n');

        const thinkPrompt = `
Available tools:
${toolDescriptions}

What should I do next? Respond with either:
1. TOOL: <tool_name> <input> - to use a tool
2. FINAL: <answer> - to give the final answer
`;

        conversation.push({ role: 'user', content: thinkPrompt });

        const response = await this.aiRouter.chat(conversation, {}, userId);
        const action = response.content;

        // Check if final answer
        if (action.startsWith('FINAL:')) {
          return action.substring(6).trim();
        }

        // Parse tool use
        if (action.startsWith('TOOL:')) {
          const toolMatch = action.match(/TOOL:\s*(\w+)\s+(.*)/);
          if (toolMatch) {
            const [, toolName, toolInput] = toolMatch;
            const tool = config.tools.find(t => t.name === toolName);

            if (tool) {
              // Execute tool
              const toolOutput = await tool.execute(toolInput);
              conversation.push({
                role: 'assistant',
                content: `Tool output: ${JSON.stringify(toolOutput)}`,
              });
            }
          }
        }

        iterations++;
      }

      return 'Max iterations reached without final answer.';
    };

    // Store agent as a special chain
    const agentChain: Chain = {
      name: config.name,
      steps: [
        {
          type: 'tool',
          name: 'agent_loop',
          config,
          execute: agentLoop,
        },
      ],
    };

    this.chains.set(config.name, agentChain);
  }

  /**
   * Create a parallel chain (run multiple chains and combine results)
   */
  async runParallelChains(
    chainNames: string[],
    input: any,
    userId?: string
  ): Promise<any[]> {
    const promises = chainNames.map(name =>
      this.runChain(name, input, userId)
    );

    return Promise.all(promises);
  }

  /**
   * Create conversation memory
   */
  createMemory(maxMessages: number = 10, summarize: boolean = false): ConversationMemory {
    return {
      messages: [],
      maxMessages,
      summarize,
    };
  }

  /**
   * Get chain by name
   */
  getChain(name: string): Chain | undefined {
    return this.chains.get(name);
  }

  /**
   * List all chains
   */
  listChains(): string[] {
    return Array.from(this.chains.keys());
  }

  /**
   * Delete a chain
   */
  deleteChain(name: string): boolean {
    return this.chains.delete(name);
  }
}

export default LangChainService;
