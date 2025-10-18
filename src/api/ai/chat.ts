import { Router, Request, Response } from 'express';
import { AIRouterService } from '../../services/ai/ai-router.service.js';
import { MemoryService } from '../../services/ai/memory.service.js';
import { logger } from '../../services/logger.service.js';

const router = Router();

// Initialize services (these would normally be injected via dependency injection)
let aiRouter: AIRouterService;
let memory: MemoryService;

export function initializeChatAPI(
  aiRouterService: AIRouterService,
  memoryService: MemoryService
) {
  aiRouter = aiRouterService;
  memory = memoryService;
}

/**
 * POST /api/ai/chat
 * Create a chat completion
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, options = {}, conversationId, userId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required',
      });
    }

    // Build context with memory if conversation ID provided
    let finalMessages = messages;
    if (conversationId && memory) {
      finalMessages = await memory.buildContextWithMemory(
        conversationId,
        messages[messages.length - 1].content
      );
    }

    const response = await aiRouter.chat(finalMessages, options, userId);

    // Store in memory if conversation ID provided
    if (conversationId && memory) {
      await memory.addMessage(conversationId, {
        role: 'user',
        content: messages[messages.length - 1].content,
      });
      await memory.addMessage(conversationId, {
        role: 'assistant',
        content: response.content,
      });
    }

    res.json({
      content: response.content,
      provider: response.provider,
      model: response.model,
      cost: response.cost,
      tokens: response.tokens,
    });
  } catch (error: any) {
    logger.error('Chat API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/chat/stream
 * Create a streaming chat completion
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { messages, options = {}, userId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required',
      });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const onChunk = (chunk: string) => {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    };

    const response = await aiRouter.streamChat(
      messages,
      onChunk,
      options,
      userId
    );

    // Send final metadata
    res.write(`data: ${JSON.stringify({
      done: true,
      cost: response.cost,
      tokens: response.tokens,
    })}\n\n`);

    res.end();
  } catch (error: any) {
    logger.error('Streaming chat API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to process streaming chat request',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai/chat/history/:conversationId
 * Get conversation history
 */
router.get('/history/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    if (!memory) {
      return res.status(503).json({
        error: 'Memory service not available',
      });
    }

    const messages = memory.getShortTermMemory(conversationId);

    res.json({
      conversationId,
      messages,
      count: messages.length,
    });
  } catch (error: any) {
    logger.error('Get history API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to get conversation history',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/ai/chat/history/:conversationId
 * Clear conversation history
 */
router.delete('/history/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    if (!memory) {
      return res.status(503).json({
        error: 'Memory service not available',
      });
    }

    memory.clearShortTermMemory(conversationId);

    res.json({
      success: true,
      conversationId,
    });
  } catch (error: any) {
    logger.error('Clear history API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to clear conversation history',
      details: error.message,
    });
  }
});

export default router;
