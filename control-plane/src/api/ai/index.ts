import { Router } from 'express';
import chatRouter, { initializeChatAPI } from './chat.js';
import embeddingsRouter, { initializeEmbeddingsAPI } from './embeddings.js';
import searchRouter, { initializeSearchAPI } from './search.js';
import analyzeRouter, { initializeAnalyzeAPI } from './analyze.js';
import agentsRouter, { initializeAgentsAPI } from './agents.js';

const router = Router();

// Mount routes
router.use('/chat', chatRouter);
router.use('/embeddings', embeddingsRouter);
router.use('/search', searchRouter);
router.use('/analyze', analyzeRouter);
router.use('/agents', agentsRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-api',
    timestamp: new Date().toISOString(),
  });
});

export {
  initializeChatAPI,
  initializeEmbeddingsAPI,
  initializeSearchAPI,
  initializeAnalyzeAPI,
  initializeAgentsAPI,
};

export default router;
