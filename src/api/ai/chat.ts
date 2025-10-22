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

/**
 * Detect lyrics-related commands
 */
function detectLyricsIntent(message: string): {
  isLyrics: boolean;
  action?: 'save' | 'clear' | 'copy' | 'show' | 'export';
  projectId?: string;
} {
  const lowerMessage = message.toLowerCase();

  const lyricsKeywords = ['lyrics', 'lyric', 'words', 'text', 'lines'];
  const hasLyricsKeyword = lyricsKeywords.some(kw => lowerMessage.includes(kw));

  if (!hasLyricsKeyword) return { isLyrics: false };

  // Detect action
  if (lowerMessage.includes('save') || lowerMessage.includes('export')) {
    return { isLyrics: true, action: 'save' };
  }
  if (lowerMessage.includes('clear') || lowerMessage.includes('delete')) {
    return { isLyrics: true, action: 'clear' };
  }
  if (lowerMessage.includes('copy')) {
    return { isLyrics: true, action: 'copy' };
  }
  if (lowerMessage.includes('show') || lowerMessage.includes('display')) {
    return { isLyrics: true, action: 'show' };
  }

  return { isLyrics: true };
}

/**
 * Detect project management commands
 */
function detectProjectIntent(message: string): {
  isProject: boolean;
  action?: 'list' | 'create' | 'delete' | 'update' | 'show' | 'open';
  projectName?: string;
  projectId?: string;
} {
  const lowerMessage = message.toLowerCase();

  const projectKeywords = ['project', 'projects'];
  const hasProjectKeyword = projectKeywords.some(kw => lowerMessage.includes(kw));

  if (!hasProjectKeyword) return { isProject: false };

  // Detect action
  if (lowerMessage.includes('list') || lowerMessage.includes('show all') || lowerMessage.includes('my projects')) {
    return { isProject: true, action: 'list' };
  }
  if (lowerMessage.includes('create new') || lowerMessage.includes('new project')) {
    // Extract project name if provided
    const nameMatch = message.match(/(?:create|new)\s+project\s+(?:called|named)?\s*["']?([^"']+)["']?/i);
    return {
      isProject: true,
      action: 'create',
      projectName: nameMatch ? nameMatch[1].trim() : undefined
    };
  }
  if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
    return { isProject: true, action: 'delete' };
  }
  if (lowerMessage.includes('update') || lowerMessage.includes('edit') || lowerMessage.includes('rename')) {
    return { isProject: true, action: 'update' };
  }
  if (lowerMessage.includes('open')) {
    return { isProject: true, action: 'open' };
  }

  return { isProject: true, action: 'show' };
}

/**
 * Detect workflow/automation commands
 */
function detectWorkflowIntent(message: string): {
  isWorkflow: boolean;
  action?: 'list' | 'create' | 'run' | 'stop' | 'show';
  workflowName?: string;
} {
  const lowerMessage = message.toLowerCase();

  const workflowKeywords = ['workflow', 'automation', 'automate'];
  const hasWorkflowKeyword = workflowKeywords.some(kw => lowerMessage.includes(kw));

  if (!hasWorkflowKeyword) return { isWorkflow: false };

  // Detect action
  if (lowerMessage.includes('list') || lowerMessage.includes('show all')) {
    return { isWorkflow: true, action: 'list' };
  }
  if (lowerMessage.includes('create') || lowerMessage.includes('new')) {
    return { isWorkflow: true, action: 'create' };
  }
  if (lowerMessage.includes('run') || lowerMessage.includes('execute') || lowerMessage.includes('start')) {
    return { isWorkflow: true, action: 'run' };
  }
  if (lowerMessage.includes('stop') || lowerMessage.includes('cancel')) {
    return { isWorkflow: true, action: 'stop' };
  }

  return { isWorkflow: true, action: 'show' };
}

/**
 * Detect analytics/stats queries
 */
function detectAnalyticsIntent(message: string): {
  isAnalytics: boolean;
  query?: 'stats' | 'projects' | 'tracks' | 'activity' | 'summary';
} {
  const lowerMessage = message.toLowerCase();

  const analyticsKeywords = [
    'stats', 'statistics', 'analytics', 'summary',
    'how many', 'count', 'total', 'show me'
  ];
  const hasAnalyticsKeyword = analyticsKeywords.some(kw => lowerMessage.includes(kw));

  if (!hasAnalyticsKeyword) return { isAnalytics: false };

  // Determine query type
  if (lowerMessage.includes('project')) {
    return { isAnalytics: true, query: 'projects' };
  }
  if (lowerMessage.includes('track')) {
    return { isAnalytics: true, query: 'tracks' };
  }
  if (lowerMessage.includes('activity')) {
    return { isAnalytics: true, query: 'activity' };
  }
  if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
    return { isAnalytics: true, query: 'summary' };
  }

  return { isAnalytics: true, query: 'stats' };
}

/**
 * Detect transport/playback control commands
 */
function detectTransportIntent(message: string): {
  isTransport: boolean;
  action?: 'setBpm' | 'setKey' | 'play' | 'pause' | 'stop' | 'record';
  bpm?: number;
  key?: string;
} {
  const lowerMessage = message.toLowerCase();

  const transportKeywords = [
    'bpm', 'tempo', 'key', 'play', 'pause', 'stop', 'record',
    'playback', 'transport'
  ];
  const hasTransportKeyword = transportKeywords.some(kw => lowerMessage.includes(kw));

  if (!hasTransportKeyword) return { isTransport: false };

  // Detect BPM change
  const bpmMatch = message.match(/(?:set|change)?\s*(?:bpm|tempo)\s*(?:to)?\s*(\d+)/i);
  if (bpmMatch) {
    return {
      isTransport: true,
      action: 'setBpm',
      bpm: parseInt(bpmMatch[1])
    };
  }

  // Detect key change
  const keyMatch = message.match(/(?:set|change)?\s*key\s*(?:to)?\s*([A-G][#b]?\s*(?:major|minor|maj|min))/i);
  if (keyMatch) {
    return {
      isTransport: true,
      action: 'setKey',
      key: keyMatch[1]
    };
  }

  // Detect playback controls
  if (lowerMessage.includes('play') && !lowerMessage.includes('playback')) {
    return { isTransport: true, action: 'play' };
  }
  if (lowerMessage.includes('pause')) {
    return { isTransport: true, action: 'pause' };
  }
  if (lowerMessage.includes('stop')) {
    return { isTransport: true, action: 'stop' };
  }
  if (lowerMessage.includes('record')) {
    return { isTransport: true, action: 'record' };
  }

  return { isTransport: true };
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

    // Check for all intent types (order matters - check most specific first)
    const lyricsIntent = detectLyricsIntent(userMessage);
    const projectIntent = detectProjectIntent(userMessage);
    const workflowIntent = detectWorkflowIntent(userMessage);
    const analyticsIntent = detectAnalyticsIntent(userMessage);
    const transportIntent = detectTransportIntent(userMessage);
    const musicIntent = detectMusicIntent(userMessage);

    // Handle project management commands
    if (projectIntent.isProject && userId) {
      logger.info('📁 Project management request detected', projectIntent);

      try {
        const projectsService = new DawgAIProjectsService();

        if (projectIntent.action === 'list') {
          const { projects, total } = await projectsService.listProjects(userId);
          const projectList = projects.map(p => `• ${p.name} (${p.status})`).join('\n');

          return res.json({
            content: `📁 Your Projects (${total} total):\n\n${projectList || 'No projects yet.'}`,
            type: 'project_list',
            projects,
            cost: 0,
            tokens: 0
          });
        }

        if (projectIntent.action === 'show') {
          const recent = await projectsService.getRecentProjects(userId, 5);
          const projectList = recent.map(p => `• ${p.name}`).join('\n');

          return res.json({
            content: `📁 Recent Projects:\n\n${projectList || 'No projects yet.'}`,
            type: 'project_list',
            projects: recent,
            cost: 0,
            tokens: 0
          });
        }
      } catch (error: any) {
        logger.error('Project management failed', { error: error.message });
      }
    }

    // Handle analytics queries
    if (analyticsIntent.isAnalytics && userId) {
      logger.info('📊 Analytics query detected', analyticsIntent);

      try {
        const projectsService = new DawgAIProjectsService();
        const stats = await projectsService.getProjectStats(userId);

        const statsMessage = `📊 Your DAWG-AI Stats:\n\n` +
          `📁 Projects: ${stats.totalProjects} total (${stats.activeProjects} active, ${stats.completedProjects} completed)\n` +
          `🎵 Tracks: ${stats.totalTracks}\n` +
          `👥 Collaborators: ${stats.totalCollaborators}`;

        return res.json({
          content: statsMessage,
          type: 'analytics',
          stats,
          cost: 0,
          tokens: 0
        });
      } catch (error: any) {
        logger.error('Analytics query failed', { error: error.message });
      }
    }

    // Handle transport/playback commands
    if (transportIntent.isTransport) {
      logger.info('🎮 Transport control detected', transportIntent);

      // Return a response that the UI can handle
      return res.json({
        content: transportIntent.action === 'setBpm'
          ? `🎵 Setting BPM to ${transportIntent.bpm}`
          : transportIntent.action === 'setKey'
          ? `🎹 Setting key to ${transportIntent.key}`
          : `🎮 Transport command: ${transportIntent.action}`,
        type: 'transport_control',
        transportIntent,
        cost: 0,
        tokens: 0
      });
    }

    // Handle lyrics commands (mostly client-side, but acknowledge)
    if (lyricsIntent.isLyrics) {
      logger.info('📝 Lyrics command detected', lyricsIntent);

      return res.json({
        content: lyricsIntent.action === 'save'
          ? '📝 Saving lyrics...'
          : lyricsIntent.action === 'clear'
          ? '🗑️ Clearing lyrics...'
          : lyricsIntent.action === 'copy'
          ? '📋 Copying lyrics to clipboard...'
          : '📝 Lyrics widget ready',
        type: 'lyrics_action',
        lyricsIntent,
        cost: 0,
        tokens: 0
      });
    }

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
