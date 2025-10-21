/**
 * Social Listening API Endpoint
 *
 * Controls the Social Listening Engine via Netlify Functions
 * Handles start/stop listening, configuration updates, and status checks
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { SocialListeningEngine } from '../../src/services/social/SocialListeningEngine';
import { AgentBridge } from '../../src/services/social/AgentBridge';

// Global listening engine instance (persists across function invocations)
const listeningEngines = new Map<string, SocialListeningEngine>();
const agentBridge = new AgentBridge();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { observatory_id } = event.queryStringParameters || {};

    if (!observatory_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'observatory_id is required' }),
      };
    }

    // Parse body for POST/PUT requests
    const body = event.body ? JSON.parse(event.body) : {};

    switch (event.httpMethod) {
      case 'GET':
        return await handleGetStatus(observatory_id, headers);

      case 'POST':
        return await handleStartListening(observatory_id, body, headers);

      case 'PUT':
        return await handleUpdateConfig(observatory_id, body, headers);

      case 'DELETE':
        return await handleStopListening(observatory_id, headers);

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Social listening endpoint error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: (error as Error).message,
      }),
    };
  }
};

/**
 * GET - Get listening status and stats
 */
async function handleGetStatus(observatoryId: string, headers: Record<string, string>) {
  const engine = listeningEngines.get(observatoryId);

  if (!engine) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isListening: false,
        message: 'No listening engine active for this observatory',
      }),
    };
  }

  const stats = engine.getStats();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      isListening: true,
      stats,
      config: (engine as any).config,
    }),
  };
}

/**
 * POST - Start listening with configuration
 */
async function handleStartListening(
  observatoryId: string,
  body: any,
  headers: Record<string, string>
) {
  // Check if already listening
  if (listeningEngines.has(observatoryId)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Already listening for this observatory' }),
    };
  }

  const {
    keywords = [
      'daw',
      'music production',
      'audio production',
      'beat making',
      'music software',
    ],
    platforms = ['twitter'],
    filters = {
      minFollowers: 0,
      languages: ['en'],
      excludeReplies: false,
      excludeRetweets: true,
    },
    actions = {
      autoReply: true,
      notifyHuman: true,
      triggerAgent: true,
    },
  } = body;

  // Create listening engine
  const engine = new SocialListeningEngine(observatoryId, {
    keywords,
    platforms,
    filters,
    actions,
  });

  // Set up event handlers for real-time updates
  engine.on('match', (match) => {
    console.log(`📨 Keyword match: ${match.post.id}`);
    // Would emit to WebSocket clients here
  });

  engine.on('agent_triggered', async (trigger) => {
    console.log(`🤖 Agent triggered: ${trigger.agentType}`);

    // Process with agent bridge
    const platform = (engine as any).platforms.get(trigger.post.platform);
    if (platform) {
      try {
        await agentBridge.processWorkflow(trigger, platform);
      } catch (error) {
        console.error('Agent processing failed:', error);
      }
    }
  });

  engine.on('approval_requested', (match) => {
    console.log(`👤 Approval requested for post ${match.post.id}`);
    // Would send notification to dashboard
  });

  engine.on('error', (err) => {
    console.error('Listening engine error:', err);
  });

  // Initialize and start
  try {
    await engine.initialize();
    await engine.startListening();

    listeningEngines.set(observatoryId, engine);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Started listening',
        config: {
          keywords,
          platforms,
          filters,
          actions,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to start listening',
        message: (error as Error).message,
      }),
    };
  }
}

/**
 * PUT - Update configuration
 */
async function handleUpdateConfig(
  observatoryId: string,
  body: any,
  headers: Record<string, string>
) {
  const engine = listeningEngines.get(observatoryId);

  if (!engine) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No active listening engine found' }),
    };
  }

  engine.updateConfig(body);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Configuration updated',
      config: (engine as any).config,
    }),
  };
}

/**
 * DELETE - Stop listening
 */
async function handleStopListening(observatoryId: string, headers: Record<string, string>) {
  const engine = listeningEngines.get(observatoryId);

  if (!engine) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No active listening engine found' }),
    };
  }

  engine.stopListening();
  listeningEngines.delete(observatoryId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Stopped listening',
    }),
  };
}

export { handler };
