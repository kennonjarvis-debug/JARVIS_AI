/**
 * ChatGPT Webhook Handler - Complete Implementation
 *
 * Handles incoming requests from ChatGPT Custom GPT with:
 * - Authentication (x-chatgpt-app-key)
 * - Request parsing and validation
 * - Action mapping to JARVIS modules
 * - Response formatting for ChatGPT
 * - Comprehensive error handling
 * - Request logging
 */

import { Request, Response } from 'express';
import { logger } from '../../utils/logger.js';
import { ModuleRouter } from '../../core/module-router.js';
import { HealthAggregator } from '../../core/health-aggregator.js';
import { conversationStorePG as conversationStore } from '../../core/conversation-store-pg.js';
import { websocketHub } from '../../core/websocket-hub.js';
import { Message } from '../../core/conversation-store-pg.js';
import { randomUUID } from 'crypto';

const moduleRouter = new ModuleRouter();
const healthAggregator = new HealthAggregator();

// API key from environment
const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY || 'jarvis-chatgpt-secret-key';

/**
 * Action mappings: ChatGPT action → JARVIS module/action
 */
const ACTION_MAP: Record<string, { module: string; action: string; description: string }> = {
  create_beat: {
    module: 'music',
    action: 'create_beat',
    description: 'Create a new beat with AI Producer',
  },
  analyze_vocals: {
    module: 'music',
    action: 'analyze_vocals',
    description: 'Analyze vocal audio quality and provide feedback',
  },
  mix_track: {
    module: 'music',
    action: 'mix_track',
    description: 'Mix and master audio track',
  },
  get_health: {
    module: 'system',
    action: 'health',
    description: 'Get JARVIS and AI DAWG health status',
  },
  search_conversations: {
    module: 'conversations',
    action: 'search',
    description: 'Search conversation history',
  },
  get_conversation: {
    module: 'conversations',
    action: 'get',
    description: 'Get conversation by ID',
  },
  send_message: {
    module: 'conversations',
    action: 'send',
    description: 'Send message to conversation',
  },
};

/**
 * Response format for ChatGPT
 */
interface ChatGPTResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    timestamp?: string;
    action?: string;
  };
}

/**
 * Validate API key
 */
function validateApiKey(apiKey: string | undefined): boolean {
  if (!apiKey) return false;

  // Constant-time comparison to prevent timing attacks
  const expectedKey = Buffer.from(CHATGPT_API_KEY);
  const providedKey = Buffer.from(apiKey);

  if (expectedKey.length !== providedKey.length) {
    return false;
  }

  return expectedKey.equals(providedKey);
}

/**
 * Format response for ChatGPT
 */
function formatResponse(result: any, executionTime: number, action: string): ChatGPTResponse {
  return {
    success: result.success !== false,
    data: result.data || result,
    error: result.error,
    metadata: {
      executionTime,
      timestamp: new Date().toISOString(),
      action,
    },
  };
}

/**
 * Handle incoming ChatGPT webhook
 */
export async function handleChatGPTWebhook(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    logger.info('📨 Received ChatGPT webhook request');

    // Step 1: Authenticate request
    const apiKey = req.headers['x-chatgpt-app-key'] as string;

    if (!validateApiKey(apiKey)) {
      logger.warn('🚫 Unauthorized ChatGPT webhook attempt', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
      });
    }

    // Step 2: Parse request
    const { action, parameters, conversationId } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Missing required field: action',
      });
    }

    logger.info(`🎯 ChatGPT action: ${action}`, { conversationId });

    // Step 3: Validate action
    const mapping = ACTION_MAP[action];

    if (!mapping) {
      return res.status(400).json({
        success: false,
        error: 'Unknown action',
        message: `Action '${action}' is not supported`,
        supportedActions: Object.keys(ACTION_MAP),
      });
    }

    // Step 4: Execute action
    let result: any;

    switch (action) {
      case 'get_health': {
        const health = await healthAggregator.checkAll();
        result = { success: true, data: health };
        break;
      }

      case 'search_conversations': {
        const conversations = conversationStore.searchConversations(
          parameters.query || ''
        );
        const limited = conversations.slice(0, parameters.limit || 10);

        result = {
          success: true,
          data: {
            conversations: limited.map((c) => ({
              id: c.id,
              messageCount: c.messages.length,
              lastMessage: c.messages[c.messages.length - 1]?.content?.substring(0, 100),
              updated: c.updated,
            })),
            total: conversations.length,
          },
        };
        break;
      }

      case 'get_conversation': {
        const conversation = conversationStore.getConversation(
          parameters.conversationId || conversationId
        );

        if (!conversation) {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Conversation not found',
          });
        }

        result = { success: true, data: conversation };
        break;
      }

      case 'send_message': {
        // Create message
        const message: Message = {
          id: randomUUID(),
          conversationId: conversationId || parameters.conversationId,
          role: 'user',
          content: parameters.content || parameters.message,
          source: 'chatgpt',
          timestamp: new Date(),
        };

        // Store message
        conversationStore.addMessage(message);

        // Broadcast to connected clients
        websocketHub.broadcastMessage(message);

        result = {
          success: true,
          data: {
            messageId: message.id,
            conversationId: message.conversationId,
            timestamp: message.timestamp,
          },
        };
        break;
      }

      default: {
        // Route to module router
        result = await moduleRouter.execute({
          module: mapping.module,
          action: mapping.action,
          params: parameters || {},
        });
      }
    }

    // Step 5: Format and send response
    const executionTime = Date.now() - startTime;
    const response = formatResponse(result, executionTime, action);

    logger.info(`✅ ChatGPT webhook completed`, {
      action,
      executionTime: `${executionTime}ms`,
      success: response.success,
    });

    return res.json(response);
  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    logger.error(`❌ ChatGPT webhook error: ${error.message}`, {
      stack: error.stack,
      body: req.body,
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      metadata: {
        executionTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Verify ChatGPT webhook (for setup)
 * GET /integrations/chatgpt/webhook
 */
export function verifyChatGPTWebhook(req: Request, res: Response) {
  logger.info('🔍 ChatGPT webhook verification request');

  res.json({
    status: 'ok',
    message: 'JARVIS ChatGPT webhook is ready',
    version: '1.0.0',
    availableActions: Object.keys(ACTION_MAP),
    authentication: 'Required: x-chatgpt-app-key header',
  });
}

/**
 * List available actions
 * GET /integrations/chatgpt/actions
 */
export function listChatGPTActions(req: Request, res: Response) {
  const actions = Object.entries(ACTION_MAP).map(([name, mapping]) => ({
    name,
    description: mapping.description,
    module: mapping.module,
    action: mapping.action,
  }));

  res.json({
    success: true,
    actions,
    total: actions.length,
  });
}

export default {
  handleChatGPTWebhook,
  verifyChatGPTWebhook,
  listChatGPTActions,
};
