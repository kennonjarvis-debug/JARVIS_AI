import { Router, Request, Response } from 'express';
import { VectorDBService } from '../../services/ai/vector-db.service.js';
import { logger } from '../../services/logger.service.js';

const router = Router();

let vectorDB: VectorDBService;

export function initializeEmbeddingsAPI(vectorDBService: VectorDBService) {
  vectorDB = vectorDBService;
}

/**
 * POST /api/ai/embeddings/generate
 * Generate embeddings for text
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text is required',
      });
    }

    // Generate embedding using vector DB service
    const documents = [{ id: 'temp', text }];
    await vectorDB.addDocuments(documents);

    res.json({
      success: true,
      text: text.substring(0, 100) + '...',
    });
  } catch (error: any) {
    logger.error('Generate embeddings API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate embeddings',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/embeddings/documents
 * Add documents to vector database
 */
router.post('/documents', async (req: Request, res: Response) => {
  try {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        error: 'Documents array is required',
      });
    }

    await vectorDB.addDocuments(documents);

    res.json({
      success: true,
      count: documents.length,
    });
  } catch (error: any) {
    logger.error('Add documents API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to add documents',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/ai/embeddings/documents
 * Delete documents from vector database
 */
router.delete('/documents', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        error: 'Document IDs array is required',
      });
    }

    await vectorDB.deleteDocuments(ids);

    res.json({
      success: true,
      deleted: ids.length,
    });
  } catch (error: any) {
    logger.error('Delete documents API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to delete documents',
      details: error.message,
    });
  }
});

export default router;
