import { Router, Request, Response } from 'express';
import { RAGService } from '../../services/ai/rag.service.js';
import { logger } from '../../services/logger.service.js';

const router = Router();

let rag: RAGService;

export function initializeSearchAPI(ragService: RAGService) {
  rag = ragService;
}

/**
 * POST /api/ai/search
 * Semantic search with RAG
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, maxSources = 5, includeMetadata = true, userId } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Query is required',
      });
    }

    const response = await rag.query(
      { query, maxSources, includeMetadata },
      userId
    );

    res.json({
      answer: response.answer,
      sources: response.sources,
      cost: response.cost,
    });
  } catch (error: any) {
    logger.error('Search API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to perform search',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/search/stream
 * Streaming semantic search with RAG
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { query, maxSources = 5, userId } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Query is required',
      });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const onChunk = (chunk: string) => {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    };

    const response = await rag.queryStream(
      { query, maxSources },
      onChunk,
      userId
    );

    // Send sources and final metadata
    res.write(`data: ${JSON.stringify({
      done: true,
      sources: response.sources,
      cost: response.cost,
    })}\n\n`);

    res.end();
  } catch (error: any) {
    logger.error('Streaming search API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to perform streaming search',
      details: error.message,
    });
  }
});

export default router;
