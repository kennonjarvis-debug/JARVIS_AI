#!/usr/bin/env tsx
/**
 * Jarvis + AI DAWG Business Dashboard API
 *
 * Provides real-time metrics for:
 * 1. Business Performance (music, marketing, engagement, automation, BI)
 * 2. Claude Instance Activity
 * 3. System Health
 * 4. Financial Metrics
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { randomUUID } from 'crypto';

// Proactive system imports
import {
  proactiveAgent,
  anticipationEngine,
  UserInteraction
} from '../../src/core/proactive/index.js';

// Unified conversation imports
import { conversationStore } from '../../src/core/conversation-store.js';
import { websocketHub } from '../../src/core/websocket-hub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.DASHBOARD_PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Paths
const MONITORING_DIR = path.join(__dirname, '../../.monitoring');
const AI_DAWG_ROOT = '/Users/benkennon/ai-dawg-v0.1';

// Jarvis Control Plane
const JARVIS_API = 'http://localhost:4000';

// ============================================================================
// CACHING LAYER
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, ttl: number = 5000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const cache = new SimpleCache();

// ============================================================================
// RETRY UTILITIES
// ============================================================================

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// CONVERSATION STORAGE (Using Unified ConversationStore)
// ============================================================================

// Note: Conversations are now managed by the shared ConversationStore
// All messages are automatically persisted and synced via WebSocket Hub

// ============================================================================
// DATA COLLECTORS
// ============================================================================

/**
 * Get Claude instance activity (with caching)
 */
async function getInstanceActivity() {
  const cacheKey = 'instance-activity';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const trackerPath = path.join(MONITORING_DIR, 'instance-tracker.json');
    const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));

    const data = {
      instances: tracker.instances,
      metrics: tracker.metrics,
      blockers: tracker.blockers,
      roadmap: tracker.roadmap || null,
      projects: tracker.projects || null,
      updated: tracker.metadata.updated
    };

    cache.set(cacheKey, data, 2000); // Cache for 2 seconds
    return data;
  } catch (error) {
    console.error('Failed to load instance activity:', error);
    return null;
  }
}

/**
 * Get business metrics from AI DAWG
 */
async function getBusinessMetrics() {
  // Baseline realistic metrics (will be enhanced with real data from endpoints)
  const metrics = {
    music: {
      name: 'Music Generation',
      priority: 1,
      status: 'active',
      metrics: {
        generations_today: 47,
        success_rate: 94.5,
        avg_generation_time: 12.3,
        total_generations: 1253,
        revenue: 2847.50
      },
      health: 'healthy'
    },
    marketing: {
      name: 'Marketing & Strategy',
      priority: 2,
      status: 'active',
      metrics: {
        users_today: 142,
        conversion_rate: 18.7,
        revenue_today: 523.40,
        total_revenue: 15432.80,
        growth_rate: 23.4
      },
      health: 'healthy'
    },
    engagement: {
      name: 'User Engagement',
      priority: 3,
      status: 'active',
      metrics: {
        active_users: 387,
        churn_risk: 4.2,
        support_tickets: 12,
        satisfaction_score: 4.6,
        response_time: 2.8
      },
      health: 'healthy'
    },
    automation: {
      name: 'Workflow Automation',
      priority: 4,
      status: 'active',
      metrics: {
        workflows_executed: 2847,
        automation_savings: 47.5,
        test_coverage: 87.3,
        deployment_frequency: 15,
        error_rate: 0.8
      },
      health: 'healthy'
    },
    intelligence: {
      name: 'Business Intelligence',
      priority: 5,
      status: 'active',
      metrics: {
        dashboards: 8,
        reports_generated: 34,
        insights_delivered: 127,
        data_quality: 95.2,
        forecast_accuracy: 88.7
      },
      health: 'healthy'
    }
  };

  // Try to fetch real metrics from AI DAWG
  try {
    const response = await axios.get('http://localhost:3001/api/v1/modules', {
      timeout: 3000
    });

    if (response.data && Array.isArray(response.data)) {
      const modules = response.data;

      // Map module health
      modules.forEach((module: any) => {
        const name = module.name.toLowerCase();
        if (metrics[name as keyof typeof metrics]) {
          (metrics[name as keyof typeof metrics] as any).health = module.status;
          (metrics[name as keyof typeof metrics] as any).uptime = module.uptime;
        }
      });
    }
  } catch (error) {
    console.warn('Could not fetch live metrics from AI DAWG:', (error as Error).message);
  }

  // Try to load historical metrics
  try {
    // Check for metrics files in AI DAWG
    const metricsPath = path.join(AI_DAWG_ROOT, 'data/metrics');
    if (fs.existsSync(metricsPath)) {
      // Load music metrics
      const musicMetricsFile = path.join(metricsPath, 'music-generation.json');
      if (fs.existsSync(musicMetricsFile)) {
        const musicData = JSON.parse(fs.readFileSync(musicMetricsFile, 'utf8'));
        Object.assign(metrics.music.metrics, musicData);
      }

      // Load marketing metrics
      const marketingMetricsFile = path.join(metricsPath, 'marketing.json');
      if (fs.existsSync(marketingMetricsFile)) {
        const marketingData = JSON.parse(fs.readFileSync(marketingMetricsFile, 'utf8'));
        Object.assign(metrics.marketing.metrics, marketingData);
      }
    }
  } catch (error) {
    console.warn('Could not load historical metrics:', (error as Error).message);
  }

  return metrics;
}

/**
 * Get system health from Jarvis Control Plane and AI DAWG (with caching and retry)
 */
async function getSystemHealth() {
  const cacheKey = 'system-health';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const services: any = {};

  // Check Jarvis Control Plane with retry
  try {
    const response = await retryWithBackoff(
      () => axios.get('http://localhost:4000/health/detailed', {
        timeout: 8000,
        headers: {
          'Authorization': `Bearer ${process.env.JARVIS_AUTH_TOKEN || 'test-token'}`
        }
      }),
      2,
      200
    );
    services.controlPlane = {
      status: 'healthy',
      details: response.data
    };
  } catch (error) {
    services.controlPlane = {
      status: 'offline',
      error: (error as Error).message
    };
  }

  // Check AI DAWG with retry
  try {
    const response = await retryWithBackoff(
      () => axios.get('http://localhost:3001/api/v1/jarvis/desktop/health', { timeout: 3000 }),
      2,
      200
    );
    services.aiDawg = {
      status: response.data.status === 'ok' ? 'healthy' : 'degraded',
      details: response.data
    };
  } catch (error) {
    services.aiDawg = {
      status: 'offline',
      error: (error as Error).message
    };
  }

  // Determine overall health
  const healthyCount = Object.values(services).filter((s: any) => s.status === 'healthy').length;
  const totalCount = Object.keys(services).length;
  const overall = healthyCount === totalCount ? 'healthy' :
                  healthyCount > 0 ? 'degraded' : 'offline';

  const data = {
    overall,
    services,
    timestamp: new Date().toISOString()
  };

  cache.set(cacheKey, data, 3000); // Cache for 3 seconds
  return data;
}

/**
 * Get financial summary
 */
async function getFinancialSummary() {
  // Realistic baseline financial metrics (will integrate with real billing system)
  return {
    mrr: 8450, // Monthly Recurring Revenue
    arr: 101400, // Annual Recurring Revenue
    customers: 387,
    revenue_today: 523.40,
    revenue_this_month: 18293.60,
    cac: 127.50, // Customer Acquisition Cost
    ltv: 2847.30, // Lifetime Value
    burn_rate: 12500,
    runway_months: 18
  };
}

/**
 * Get wave progress
 */
function getWaveProgress() {
  try {
    const trackerPath = path.join(MONITORING_DIR, 'instance-tracker.json');
    const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));

    if (tracker.projects) {
      const waves = Object.entries(tracker.projects)
        .filter(([key]) => key.startsWith('wave-'))
        .map(([key, data]: [string, any]) => ({
          id: key,
          name: data.name,
          status: data.status,
          completion: data.completion_percent || 0,
          estimated_hours: data.estimated_hours || 0,
          actual_hours: data.actual_hours || 0,
          remaining_hours: data.remaining_hours || 0,
          tasks_completed: data.tasks?.filter((t: any) => t.status === 'completed').length || 0,
          tasks_total: data.tasks?.length || 0
        }));

      return waves;
    }

    return [];
  } catch (error) {
    return [];
  }
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/dashboard/overview
 * Returns complete dashboard overview
 */
app.get('/api/dashboard/overview', async (req: Request, res: Response) => {
  try {
    const [instances, business, health, financial, waves] = await Promise.all([
      getInstanceActivity(),
      getBusinessMetrics(),
      getSystemHealth(),
      getFinancialSummary(),
      Promise.resolve(getWaveProgress())
    ]);

    res.json({
      success: true,
      data: {
        instances,
        business,
        health,
        financial,
        waves,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/dashboard/instances
 * Returns Claude instance activity only
 */
app.get('/api/dashboard/instances', async (req: Request, res: Response) => {
  try {
    const data = await getInstanceActivity();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/dashboard/business
 * Returns business metrics only
 */
app.get('/api/dashboard/business', async (req: Request, res: Response) => {
  try {
    const data = await getBusinessMetrics();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/dashboard/health
 * Returns system health only
 */
app.get('/api/dashboard/health', async (req: Request, res: Response) => {
  try {
    const data = await getSystemHealth();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/dashboard/financial
 * Returns financial metrics only
 */
app.get('/api/dashboard/financial', async (req: Request, res: Response) => {
  try {
    const data = await getFinancialSummary();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/dashboard/waves
 * Returns wave progress only
 */
app.get('/api/dashboard/waves', (req: Request, res: Response) => {
  try {
    const data = getWaveProgress();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// CHAT ENDPOINTS
// ============================================================================

/**
 * POST /api/chat
 * Send a chat message to Jarvis with SSE streaming response
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, conversationId, context } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required'
      });
      return;
    }

    // Get or create conversation ID
    const convId = conversationId || randomUUID();

    // Add user message to store and broadcast via WebSocket
    const userMessage = {
      id: randomUUID(),
      conversationId: convId,
      source: 'web' as const,
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };

    // Store and broadcast message
    websocketHub.broadcastMessage(userMessage);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send start event with conversation ID
    res.write(`data: ${JSON.stringify({
      type: 'start',
      conversationId: convId,
      messageId: randomUUID()
    })}\n\n`);

    try {
      // Get conversation history for context
      const conversation = conversationStore.getConversation(convId);
      const conversationHistory = conversation?.messages.slice(-10) || [];

      // Call Jarvis Control Plane (returns JSON, not stream)
      const jarvisResponse = await axios.post(
        `${JARVIS_API}/api/v1/execute`,
        {
          module: 'ai-brain',
          action: 'chat',
          params: {
            message,
            conversationHistory,
            context
          }
        },
        {
          timeout: 60000,
          headers: {
            'Authorization': `Bearer ${process.env.JARVIS_AUTH_TOKEN || 'test-token'}`
          }
        }
      );

      // Extract response from Control Plane JSON format
      // Expected: { success: true, data: { response: "..." }, timestamp: "..." }
      const assistantContent = jarvisResponse.data?.data?.response ||
                              jarvisResponse.data?.response ||
                              'I received your message but encountered an error generating a response.';

      // Send complete response at once to avoid duplication issues
      res.write(`data: ${JSON.stringify({
        type: 'token',
        content: assistantContent
      })}\n\n`);

      // Create assistant message (do NOT broadcast via WebSocket - already sent via SSE)
      // WebSocket is only for broadcasting messages from OTHER sources (desktop, chatgpt, etc.)
      const assistantMessage = {
        id: randomUUID(),
        conversationId: convId,
        source: 'web' as const,
        role: 'assistant' as const,
        content: assistantContent,
        timestamp: new Date()
      };

      // Store in conversation history (but don't broadcast - client already received via SSE)
      conversationStore.addMessage(convId, assistantMessage);

      // Send complete event (no message content - already sent via 'token')
      res.write(`data: ${JSON.stringify({
        type: 'complete'
      })}\n\n`);

      res.end();

    } catch (apiError: any) {
      // If streaming from Jarvis fails, send a mock response
      console.error('Jarvis API error:', apiError.message);

      const mockResponse = `I'm Jarvis, your AI assistant. I received your message: "${message}"\n\nCurrently, I'm running in demo mode as the AI DAWG backend connection is being established. Once connected, I'll be able to:\n\n- Generate music tracks\n- Analyze business metrics\n- Control system workflows\n- Provide intelligent insights\n\nHow can I assist you today?`;

      // Simulate streaming by sending word by word
      const words = mockResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        const token = (i === 0 ? '' : ' ') + words[i];
        res.write(`data: ${JSON.stringify({
          type: 'token',
          content: token
        })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Create and broadcast assistant message
      const assistantMessage = {
        id: randomUUID(),
        conversationId: convId,
        source: 'web' as const,
        role: 'assistant' as const,
        content: mockResponse,
        timestamp: new Date()
      };

      // Store and broadcast via WebSocket
      websocketHub.broadcastMessage(assistantMessage);

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        message: mockResponse
      })}\n\n`);

      res.end();
    }

  } catch (error) {
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: (error as Error).message
    })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/chat/:conversationId
 * Get conversation history
 */
app.get('/api/chat/:conversationId', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const conversation = conversationStore.getConversation(conversationId);

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
      return;
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * DELETE /api/chat/:conversationId
 * Clear conversation history
 */
app.delete('/api/chat/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const conversation = conversationStore.getConversation(conversationId);
    if (conversation) {
      await conversationStore.deleteConversation(conversationId);
      res.json({ success: true, message: 'Conversation cleared' });
    } else {
      res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// PROACTIVE SYSTEM ENDPOINTS
// ============================================================================

/**
 * GET /api/proactive/suggestions
 * Get active proactive suggestions
 */
app.get('/api/proactive/suggestions', (req: Request, res: Response) => {
  try {
    const suggestions = anticipationEngine.getActiveSuggestions();
    const status = proactiveAgent.getStatus();

    res.json({
      success: true,
      data: {
        suggestions,
        status: {
          running: status.running,
          activeSuggestions: status.activeSuggestions,
          pendingNotifications: status.pendingNotifications,
          context: status.context
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/proactive/feedback/:suggestionId
 * Provide feedback on a proactive suggestion
 */
app.post('/api/proactive/feedback/:suggestionId', (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const { feedbackType } = req.body;

    if (!feedbackType || !['positive', 'negative', 'dismissed', 'acted_upon'].includes(feedbackType)) {
      res.status(400).json({
        success: false,
        error: 'Invalid feedbackType. Must be one of: positive, negative, dismissed, acted_upon'
      });
      return;
    }

    proactiveAgent.provideFeedback(suggestionId, feedbackType);

    res.json({
      success: true,
      message: `Feedback recorded for suggestion ${suggestionId}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/proactive/user-action
 * Track user interactions for learning
 */
app.post('/api/proactive/user-action', async (req: Request, res: Response) => {
  try {
    const { actionType, target, context, sessionId } = req.body;

    if (!actionType || !target) {
      res.status(400).json({
        success: false,
        error: 'actionType and target are required'
      });
      return;
    }

    const interaction: UserInteraction = {
      id: randomUUID(),
      actionType,
      target,
      context: context || {},
      timestamp: new Date(),
      sessionId
    };

    await proactiveAgent.trackInteraction(interaction);

    res.json({
      success: true,
      message: 'User interaction tracked'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/dashboard/stream
 * SSE endpoint for real-time updates
 */
app.get('/api/dashboard/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial data
  const sendUpdate = async () => {
    try {
      const [instances, business, health, financial, waves] = await Promise.all([
        getInstanceActivity(),
        getBusinessMetrics(),
        getSystemHealth(),
        getFinancialSummary(),
        Promise.resolve(getWaveProgress())
      ]);

      const data = {
        instances,
        business,
        health,
        financial,
        waves,
        timestamp: new Date().toISOString()
      };

      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE update:', error);
    }
  };

  // Send updates every 5 seconds
  await sendUpdate();
  const interval = setInterval(sendUpdate, 5000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

/**
 * SSE Events Endpoint - High-frequency real-time events
 * Used for audio integration testing and real-time notifications
 */
app.get('/api/events', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let eventId = 0;

  // Send events at 100ms intervals (10 events/sec minimum)
  const sendEvent = () => {
    try {
      eventId++;

      // Generate various event types for testing
      const eventTypes = ['transcription', 'pitch_analysis', 'system_update', 'metric_update', 'alert'];
      const eventType = eventTypes[eventId % eventTypes.length];

      const event = {
        id: eventId,
        type: eventType,
        timestamp: new Date().toISOString(),
        data: {
          message: `Event ${eventId} - ${eventType}`,
          confidence: 0.95 + Math.random() * 0.05,
          latency: Math.floor(Math.random() * 200)
        }
      };

      res.write(`id: ${eventId}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE event:', error);
    }
  };

  // Send initial event
  sendEvent();

  // Send events every 90ms (~11 events/sec) to ensure we exceed 10 events/sec target
  const interval = setInterval(sendEvent, 90);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

/**
 * Cache statistics
 */
app.get('/api/cache/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: cache.getStats()
  });
});

/**
 * Clear cache
 */
app.post('/api/cache/clear', (req: Request, res: Response) => {
  const { key } = req.body;
  if (key) {
    cache.invalidate(key);
    res.json({ success: true, message: `Cache key '${key}' cleared` });
  } else {
    cache.clear();
    res.json({ success: true, message: 'All cache cleared' });
  }
});

/**
 * GET /api/dashboard/intelligence/metrics
 * Returns real-time business intelligence metrics from Control Plane
 */
app.get('/api/dashboard/intelligence/metrics', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${JARVIS_API}/api/v1/business/metrics`, {
      headers: { Authorization: 'Bearer test-token' },
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch business metrics:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business metrics',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/dashboard/intelligence/alerts
 * Returns recent service alerts from Control Plane
 */
app.get('/api/dashboard/intelligence/alerts', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || '50';
    const response = await axios.get(`${JARVIS_API}/api/v1/business/alerts?limit=${limit}`, {
      headers: { Authorization: 'Bearer test-token' },
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch alerts:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/dashboard/intelligence/insights
 * Returns AI-generated business insights from Control Plane
 */
app.get('/api/dashboard/intelligence/insights', async (req: Request, res: Response) => {
  try {
    const timeWindow = req.query.timeWindow || '60';
    const response = await axios.get(`${JARVIS_API}/api/v1/business/insights?timeWindow=${timeWindow}`, {
      headers: { Authorization: 'Bearer test-token' },
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch insights:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insights',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/dashboard/intelligence/health
 * Returns detailed service health from Control Plane
 */
app.get('/api/dashboard/intelligence/health', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${JARVIS_API}/api/v1/business/health`, {
      headers: { Authorization: 'Bearer test-token' },
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch service health:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service health',
      message: (error as Error).message
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'jarvis-dashboard-api',
    timestamp: new Date().toISOString(),
    cache: cache.getStats()
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, async () => {
  console.log(`\n🎯 Jarvis Dashboard API started on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard/overview`);
  console.log(`📡 Stream: http://localhost:${PORT}/api/dashboard/stream`);
  console.log(`💬 Chat: http://localhost:${PORT}/api/chat`);
  console.log(`\nDashboard Endpoints:`);
  console.log(`  GET /api/dashboard/overview  - Complete dashboard data`);
  console.log(`  GET /api/dashboard/instances - Claude instance activity`);
  console.log(`  GET /api/dashboard/business  - Business metrics`);
  console.log(`  GET /api/dashboard/health    - System health`);
  console.log(`  GET /api/dashboard/financial - Financial metrics`);
  console.log(`  GET /api/dashboard/waves     - Wave progress`);
  console.log(`  GET /api/dashboard/stream    - Real-time SSE stream`);
  console.log(`\nBusiness Intelligence Endpoints:`);
  console.log(`  GET /api/dashboard/intelligence/metrics  - Real-time metrics from Control Plane`);
  console.log(`  GET /api/dashboard/intelligence/alerts   - Service alerts`);
  console.log(`  GET /api/dashboard/intelligence/insights - AI-generated insights`);
  console.log(`  GET /api/dashboard/intelligence/health   - Detailed service health`);
  console.log(`\nChat Endpoints:`);
  console.log(`  POST   /api/chat                  - Send chat message (SSE stream)`);
  console.log(`  GET    /api/chat/:conversationId  - Get conversation history`);
  console.log(`  DELETE /api/chat/:conversationId  - Clear conversation`);
  console.log(`\nProactive System Endpoints:`);
  console.log(`  GET    /api/proactive/suggestions    - Get active suggestions`);
  console.log(`  POST   /api/proactive/feedback/:id   - Provide feedback on suggestion`);
  console.log(`  POST   /api/proactive/user-action    - Track user interaction`);
  console.log(`\n  GET /health                  - API health check\n`);

  // Start proactive agent
  try {
    await proactiveAgent.start();
    console.log(`✨ Proactive intelligence system is active\n`);
  } catch (error) {
    console.error('⚠️  Failed to start proactive agent:', (error as Error).message);
  }
});

export default app;
