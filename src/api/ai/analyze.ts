import { Router, Request, Response } from 'express';
import { MultimodalService } from '../../services/ai/multimodal.service.js';
import { RAGService } from '../../services/ai/rag.service.js';
import { logger } from '../../services/logger.service.js';

const router = Router();

let multimodal: MultimodalService;
let rag: RAGService;

export function initializeAnalyzeAPI(
  multimodalService: MultimodalService,
  ragService: RAGService
) {
  multimodal = multimodalService;
  rag = ragService;
}

/**
 * POST /api/ai/analyze/image
 * Analyze an image with GPT-4 Vision
 */
router.post('/image', async (req: Request, res: Response) => {
  try {
    const { imageUrl, prompt, detailLevel = 'auto' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Image URL is required',
      });
    }

    const analysis = await multimodal.analyzeImage(imageUrl, prompt, detailLevel);

    res.json(analysis);
  } catch (error: any) {
    logger.error('Image analysis API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to analyze image',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/analyze/audio
 * Transcribe audio with Whisper
 */
router.post('/audio', async (req: Request, res: Response) => {
  try {
    const { audioUrl, language } = req.body;

    if (!audioUrl) {
      return res.status(400).json({
        error: 'Audio URL is required',
      });
    }

    // In production, download the audio file and transcribe
    // For now, return a mock response
    res.json({
      text: 'Mock transcription',
      language: language || 'en',
      cost: 0.006,
    });
  } catch (error: any) {
    logger.error('Audio analysis API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to analyze audio',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/analyze/document
 * Analyze and extract information from a document
 */
router.post('/document', async (req: Request, res: Response) => {
  try {
    const { documentUrl, prompt } = req.body;

    if (!documentUrl) {
      return res.status(400).json({
        error: 'Document URL is required',
      });
    }

    const result = await multimodal.parseDocument(documentUrl, prompt);

    res.json(result);
  } catch (error: any) {
    logger.error('Document analysis API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to analyze document',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/analyze/summarize
 * Summarize a document
 */
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { documentId, userId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        error: 'Document ID is required',
      });
    }

    const summary = await rag.summarizeDocument(documentId, userId);

    res.json({
      documentId,
      summary,
    });
  } catch (error: any) {
    logger.error('Summarize API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to summarize document',
      details: error.message,
    });
  }
});

export default router;
