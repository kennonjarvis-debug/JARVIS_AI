/**
 * Claude MCP Server - Complete Implementation
 *
 * Provides Claude Desktop with access to JARVIS capabilities via Model Context Protocol
 *
 * Features:
 * - Tool invocation (health checks, music generation, conversation search)
 * - Resource reading (system status, metrics, modules)
 * - Stdio transport (for Claude Desktop integration)
 * - Error handling and logging
 *
 * Reference: https://modelcontextprotocol.io/
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';
import { ModuleRouter } from '../../core/module-router.js';
import { HealthAggregator } from '../../core/health-aggregator.js';
import { conversationStorePG as conversationStore } from '../../core/conversation-store-pg.js';
import { businessIntelligence } from '../../core/business-intelligence.js';

const moduleRouter = new ModuleRouter();
const healthAggregator = new HealthAggregator();

/**
 * Claude MCP Server
 */
export class MCPServer {
  private server: Server;
  private initialized = false;

  constructor() {
    this.server = new Server(
      {
        name: 'jarvis-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );
  }

  /**
   * Initialize MCP Server
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Initializing Claude MCP Server...');

    // Register tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('MCP: Listing tools');
      return {
        tools: await this.getTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      logger.info(`MCP: Calling tool: ${request.params.name}`);
      return {
        content: await this.executeTool(request.params),
      };
    });

    // Register resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('MCP: Listing resources');
      return {
        resources: await this.getResources(),
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      logger.info(`MCP: Reading resource: ${request.params.uri}`);
      return {
        contents: await this.readResource(request.params),
      };
    });

    this.initialized = true;
    logger.info('✅ Claude MCP Server initialized');
  }

  /**
   * Get available tools
   */
  private async getTools() {
    return [
      {
        name: 'jarvis_health',
        description:
          'Get comprehensive health status of JARVIS Control Plane and all AI DAWG services (backend, vocal coach, producer, AI brain, postgres, redis)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'jarvis_music_create_beat',
        description:
          'Create a new beat using AI Producer. Specify genre, tempo (BPM), and mood/vibe.',
        inputSchema: {
          type: 'object',
          properties: {
            genre: {
              type: 'string',
              description:
                'Music genre (e.g., hip-hop, trap, lo-fi, jazz, electronic)',
            },
            tempo: {
              type: 'number',
              description: 'Beats per minute (BPM), typically 60-180',
            },
            mood: {
              type: 'string',
              description:
                'Mood or vibe (e.g., chill, aggressive, uplifting, dark)',
            },
          },
          required: ['genre'],
        },
      },
      {
        name: 'jarvis_music_analyze_vocals',
        description:
          'Analyze vocal audio file for pitch, tone, timing, and quality. Provide feedback and improvement suggestions.',
        inputSchema: {
          type: 'object',
          properties: {
            audioUrl: {
              type: 'string',
              description: 'URL or path to audio file',
            },
          },
          required: ['audioUrl'],
        },
      },
      {
        name: 'jarvis_conversation_search',
        description:
          'Search conversation history across all sources (desktop, web, ChatGPT, iPhone) using full-text search.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query text',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'jarvis_conversation_get',
        description:
          'Get full conversation by ID, including all messages and participants.',
        inputSchema: {
          type: 'object',
          properties: {
            conversationId: {
              type: 'string',
              description: 'Conversation ID',
            },
          },
          required: ['conversationId'],
        },
      },
      {
        name: 'jarvis_metrics',
        description:
          'Get business intelligence metrics: AI usage, costs, user activity, system performance, and request statistics.',
        inputSchema: {
          type: 'object',
          properties: {
            timeWindowMinutes: {
              type: 'number',
              description:
                'Time window in minutes for metrics (default: 60)',
            },
          },
        },
      },
    ];
  }

  /**
   * Execute a tool
   */
  private async executeTool(params: any) {
    const { name, arguments: args } = params;

    try {
      switch (name) {
        case 'jarvis_health': {
          const health = await healthAggregator.checkAll();
          return [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ];
        }

        case 'jarvis_music_create_beat': {
          const result = await moduleRouter.execute({
            module: 'music',
            action: 'create_beat',
            params: {
              genre: args.genre,
              tempo: args.tempo || 120,
              mood: args.mood || 'neutral',
            },
          });

          return [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ];
        }

        case 'jarvis_music_analyze_vocals': {
          const result = await moduleRouter.execute({
            module: 'music',
            action: 'analyze_vocals',
            params: {
              audioUrl: args.audioUrl,
            },
          });

          return [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ];
        }

        case 'jarvis_conversation_search': {
          const conversations = conversationStore.searchConversations(
            args.query
          );

          const results = conversations
            .slice(0, args.limit || 10)
            .map((c) => ({
              id: c.id,
              messageCount: c.messages.length,
              participants: Object.keys(c.participants),
              lastMessage: c.messages[c.messages.length - 1]?.content?.substring(0, 100),
              updated: c.updated,
            }));

          return [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ];
        }

        case 'jarvis_conversation_get': {
          const conversation = conversationStore.getConversation(
            args.conversationId
          );

          if (!conversation) {
            return [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'Conversation not found',
                    conversationId: args.conversationId,
                  },
                  null,
                  2
                ),
              },
            ];
          }

          return [
            {
              type: 'text',
              text: JSON.stringify(conversation, null, 2),
            },
          ];
        }

        case 'jarvis_metrics': {
          const timeWindow = args.timeWindowMinutes || 60;
          const metrics = businessIntelligence.getSnapshot(timeWindow);

          return [
            {
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            },
          ];
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      logger.error(`MCP tool execution error: ${error.message}`);
      return [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error.message,
              tool: name,
            },
            null,
            2
          ),
        },
      ];
    }
  }

  /**
   * Get available resources
   */
  private async getResources() {
    return [
      {
        uri: 'jarvis://status',
        name: 'System Status',
        description:
          'Current health status of JARVIS Control Plane and all AI DAWG services',
        mimeType: 'application/json',
      },
      {
        uri: 'jarvis://modules',
        name: 'Available Modules',
        description:
          'List of all JARVIS modules and their capabilities (music, system, conversations, etc.)',
        mimeType: 'application/json',
      },
      {
        uri: 'jarvis://metrics',
        name: 'Business Metrics',
        description:
          'Real-time business intelligence metrics: AI usage, costs, performance, user activity',
        mimeType: 'application/json',
      },
      {
        uri: 'jarvis://conversations',
        name: 'Conversation List',
        description:
          'List of all conversations across desktop, web, ChatGPT, and iPhone',
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Read a resource
   */
  private async readResource(params: any) {
    const { uri } = params;

    try {
      switch (uri) {
        case 'jarvis://status': {
          const health = await healthAggregator.checkAll();
          return [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(health, null, 2),
            },
          ];
        }

        case 'jarvis://modules': {
          const modules = {
            music: {
              actions: ['create_beat', 'analyze_vocals', 'mix_track'],
              description: 'AI DAWG music production services',
            },
            system: {
              actions: ['health', 'restart_service', 'get_logs'],
              description: 'System management and monitoring',
            },
            conversations: {
              actions: ['search', 'get', 'list', 'delete'],
              description: 'Conversation storage and retrieval',
            },
          };

          return [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(modules, null, 2),
            },
          ];
        }

        case 'jarvis://metrics': {
          const metrics = businessIntelligence.getSnapshot(60);
          return [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(metrics, null, 2),
            },
          ];
        }

        case 'jarvis://conversations': {
          const conversations = conversationStore
            .getAllConversations()
            .map((c) => ({
              id: c.id,
              messageCount: c.messages.length,
              participants: Object.keys(c.participants),
              created: c.created,
              updated: c.updated,
            }));

          return [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(conversations, null, 2),
            },
          ];
        }

        default:
          return [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: 'Resource not found',
                  uri,
                },
                null,
                2
              ),
            },
          ];
      }
    } catch (error: any) {
      logger.error(`MCP resource read error: ${error.message}`);
      return [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              error: error.message,
              uri,
            },
            null,
            2
          ),
        },
      ];
    }
  }

  /**
   * Start MCP server (stdio transport for Claude Desktop)
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('✅ JARVIS MCP Server running on stdio');
      logger.info('   Ready for Claude Desktop connections');
    } catch (error: any) {
      logger.error(`Failed to start MCP server: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop MCP server
   */
  async stop(): Promise<void> {
    try {
      await this.server.close();
      logger.info('🛑 MCP Server stopped');
    } catch (error: any) {
      logger.error(`Error stopping MCP server: ${error.message}`);
    }
  }
}

export default MCPServer;
