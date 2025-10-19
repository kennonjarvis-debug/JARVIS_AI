import { Router, Request, Response } from 'express';
import { AIRouterService } from '../../services/ai/ai-router.service.js';
import { MemoryService } from '../../services/ai/memory.service.js';
import { logger } from '../../services/logger.service.js';
import { musicGenerator, type MusicalIntent } from '../../services/music-generator.js';
import DawgAIProjectsService from '../../services/dawg-ai-projects.service.js';

const router = Router();

// Initialize services (these would normally be injected via dependency injection)
let aiRouter: AIRouterService;
let memory: MemoryService;

/**
 * Detect if the user message is requesting music generation
 */
function detectMusicIntent(message: string): {
  isMusic: boolean;
  genre?: string;
  bpm?: number;
  mood?: string;
  duration?: number;
  key?: string;
  artists?: string[];
} {
  const lowerMessage = message.toLowerCase();

  // Music generation keywords
  const musicKeywords = [
    'make a beat', 'create a beat', 'generate a beat', 'make a song',
    'create music', 'generate music', 'make music', 'produce a beat',
    'make me a', 'create a song', 'generate a song', 'beat for',
    'instrumental', 'music for', 'soundtrack'
  ];

  const isMusic = musicKeywords.some(keyword => lowerMessage.includes(keyword));

  if (!isMusic) return { isMusic: false };

  // Extract genre
  const genres = ['hip-hop', 'trap', 'drill', 'jazz', 'rock', 'pop', 'electronic', 'edm', 'house', 'techno', 'lo-fi', 'lofi', 'r&b', 'country'];
  const genre = genres.find(g => lowerMessage.includes(g));

  // Extract BPM if mentioned
  const bpmMatch = lowerMessage.match(/(\d+)\s*bpm/);
  const bpm = bpmMatch ? parseInt(bpmMatch[1]) : undefined;

  // Extract mood
  const moods = ['energetic', 'chill', 'dark', 'uplifting', 'sad', 'happy', 'aggressive', 'calm', 'relaxing'];
  const mood = moods.find(m => lowerMessage.includes(m));

  // Extract duration (supports "3:03", "3 minutes", "183 seconds", etc.)
  let duration: number | undefined;

  // Format: "3:03" or "3:03 minutes"
  const durationMinSecMatch = message.match(/(\d+):(\d+)\s*(minute|min|second|sec)?/i);
  if (durationMinSecMatch) {
    const minutes = parseInt(durationMinSecMatch[1]);
    const seconds = parseInt(durationMinSecMatch[2]);
    duration = minutes * 60 + seconds;
  } else {
    // Format: "3 minutes" or "180 seconds"
    const durationMinutesMatch = message.match(/(\d+)\s*minute/i);
    const durationSecondsMatch = message.match(/(\d+)\s*second/i);

    if (durationMinutesMatch) {
      duration = parseInt(durationMinutesMatch[1]) * 60;
    } else if (durationSecondsMatch) {
      duration = parseInt(durationSecondsMatch[1]);
    }
  }

  // Extract musical key (supports "F# minor", "C major", "Bb minor", etc.)
  const keyMatch = message.match(/([A-G][#b]?)\s*(major|minor|maj|min)/i);
  let key: string | undefined;
  if (keyMatch) {
    const note = keyMatch[1].charAt(0).toUpperCase() + keyMatch[1].slice(1); // Capitalize first letter
    const scale = keyMatch[2].toLowerCase();
    const scaleType = scale === 'maj' ? 'Major' : scale === 'min' ? 'Minor' :
                      scale.charAt(0).toUpperCase() + scale.slice(1);
    key = `${note} ${scaleType}`;
  }

  // Extract artist names (common producers/artists)
  const artistNames = [
    'metro boomin', 'travis scott', 'drake', 'kanye', 'kanye west',
    'morgan wallen', 'luke combs', 'chris stapleton',
    'southside', 'tm88', 'pierre bourne', 'wheezy',
    'timbaland', 'pharrell', 'dre', 'dr dre', 'dj mustard',
    'mike will', 'zaytoven', 'lex luger', 'murda beatz'
  ];

  const artists: string[] = [];
  for (const artist of artistNames) {
    if (lowerMessage.includes(artist)) {
      // Capitalize properly
      artists.push(artist.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '));
    }
  }

  return {
    isMusic: true,
    genre,
    bpm,
    mood,
    duration,
    key,
    artists: artists.length > 0 ? artists : undefined
  };
}

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

    // Get the latest user message
    const userMessage = messages[messages.length - 1].content;

    // Check if this is a music generation request
    const musicIntent = detectMusicIntent(userMessage);

    if (musicIntent.isMusic) {
      logger.info('🎵 Music generation request detected', musicIntent);

      try {
        // Build detailed prompt for GPT-4o expert system
        let enhancedPrompt = userMessage;
        if (musicIntent.key) {
          enhancedPrompt += ` in ${musicIntent.key}`;
        }
        if (musicIntent.artists && musicIntent.artists.length > 0) {
          enhancedPrompt += ` styled after ${musicIntent.artists.join(' and ')}`;
        }

        // Generate music using Suno API with expert prompting
        const musicResult = await musicGenerator.generateBeat({
          genre: musicIntent.genre,
          bpm: musicIntent.bpm,
          mood: musicIntent.mood,
          duration: musicIntent.duration || 120, // Use extracted duration or default to 2 minutes
          key: musicIntent.key,
          artists: musicIntent.artists
        });

        // Create a project and add the track if userId is provided
        let project;
        let track;

        if (userId) {
          try {
            const projectsService = new DawgAIProjectsService();

            // Create a new project
            const projectName = `${musicIntent.genre || 'Beat'} - ${new Date().toLocaleString()}`;
            project = await projectsService.createProject(userId, {
              name: projectName,
              description: `Generated from chat: ${userMessage}`,
              genre: musicIntent.genre,
              bpm: musicIntent.bpm || musicResult.metadata.tempo,
              key: musicResult.metadata.key
            });

            logger.info('✅ Project created', { projectId: project.id, name: project.name });

            // Add the generated music as a track to the project
            track = await projectsService.addTrackToProject(userId, project.id, {
              name: `${musicIntent.genre || 'Beat'} Track 1`,
              audioPath: musicResult.localPath,
              audioUrl: musicResult.audioUrl,
              duration: musicResult.duration,
              startTime: 0,
              metadata: {
                genre: musicResult.metadata.genre,
                bpm: musicResult.metadata.tempo,
                key: musicResult.metadata.key,
                chordProgressions: musicResult.metadata.chordProgressions,
                instruments: musicResult.metadata.instruments
              }
            });

            logger.info('✅ Track added to project', { trackId: track.id, projectId: project.id });
          } catch (projectError: any) {
            logger.error('Failed to create project/track', { error: projectError.message });
            // Continue without project - still return the music
          }
        }

        // Store in memory if conversation ID provided
        if (conversationId && memory) {
          await memory.addMessage(conversationId, {
            role: 'user',
            content: userMessage,
          });
          await memory.addMessage(conversationId, {
            role: 'assistant',
            content: `Generated ${musicIntent.genre || 'instrumental'} beat${project ? ` and created project "${project.name}"` : ''}`,
          });
        }

        return res.json({
          content: `✅ Generated your ${musicIntent.genre || 'instrumental'} beat!${project ? `\n📁 Project: ${project.name}` : ''}`,
          audioUrl: musicResult.audioUrl,
          localPath: musicResult.localPath,
          metadata: musicResult.metadata,
          type: 'track_creation_with_music',
          project: project || undefined,
          track: track || undefined,
          cost: 0.07,
          tokens: 0
        });
      } catch (musicError: any) {
        logger.error('Music generation failed', { error: musicError.message });
        // Fall through to regular chat if music generation fails
      }
    }

    // Regular chat flow
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
