/**
 * Domain Agents API - "Claude B" Management Interface
 *
 * HTTP API for managing domain agents, spawning new agents,
 * assigning tasks, and monitoring agent performance.
 */

import { Router, Request, Response } from 'express';
import { agentManager } from './agent-manager.js';
import { logger } from '../../../utils/logger.js';
import { isFeatureEnabled } from '../../integration/feature-flags.js';
import type { DomainType, ClearanceLevel } from '../types.js';

const router = Router();

/**
 * Get all agents
 * GET /api/autonomous/domains/agents
 */
router.get('/agents', (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain Routing is disabled'
    });
  }

  const agents = agentManager.getAllAgents();

  res.json({
    success: true,
    data: agents.map(a => ({
      id: a.id,
      domain: a.domain,
      name: a.agent.name,
      status: a.status,
      tasksCompleted: a.tasksCompleted,
      createdAt: a.createdAt,
      lastActiveAt: a.lastActiveAt
    })),
    timestamp: new Date().toISOString()
  });
});

/**
 * Get agent by ID
 * GET /api/autonomous/domains/agents/:id
 */
router.get('/agents/:id', (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain Routing is disabled'
    });
  }

  const { id } = req.params;
  const agent = agentManager.getAgent(id);

  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }

  res.json({
    success: true,
    data: {
      id: agent.id,
      domain: agent.domain,
      name: agent.agent.name,
      description: agent.agent.description,
      status: agent.status,
      capabilities: agent.agent.capabilities,
      tasksCompleted: agent.tasksCompleted,
      currentTask: agent.currentTask,
      createdAt: agent.createdAt,
      lastActiveAt: agent.lastActiveAt
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Spawn new agent
 * POST /api/autonomous/domains/agents
 */
router.post('/agents', (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain Routing is disabled'
    });
  }

  const { domain, clearance } = req.body;

  if (!domain) {
    return res.status(400).json({
      success: false,
      error: 'Domain is required'
    });
  }

  const agentId = agentManager.spawnAgent(
    domain as DomainType,
    clearance as ClearanceLevel
  );

  if (!agentId) {
    return res.status(500).json({
      success: false,
      error: 'Failed to spawn agent'
    });
  }

  const agent = agentManager.getAgent(agentId);

  res.json({
    success: true,
    data: {
      id: agentId,
      domain: agent?.domain,
      name: agent?.agent.name,
      status: agent?.status
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Assign task to agent
 * POST /api/autonomous/domains/tasks
 */
router.post('/tasks', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain Routing is disabled'
    });
  }

  const task = req.body;

  if (!task.domain || !task.type) {
    return res.status(400).json({
      success: false,
      error: 'domain and type are required'
    });
  }

  // Add required fields if missing
  task.id = task.id || `task-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  task.title = task.title || task.description || 'Untitled Task';
  task.priority = task.priority || 5;
  task.status = task.status || 'pending';
  task.clearanceRequired = task.clearanceRequired || 1; // SUGGEST level
  task.estimatedDuration = task.estimatedDuration || 30000; // 30 seconds default
  task.dependencies = task.dependencies || [];
  task.createdAt = new Date();
  task.metadata = task.metadata || {};
  task.metadata.capability = task.type;
  task.metadata.estimatedCost = task.metadata.estimatedCost || 0;

  const result = await agentManager.assignTask(task);

  res.json({
    success: result.success,
    data: result,
    timestamp: new Date().toISOString()
  });
});

/**
 * Pause agent
 * POST /api/autonomous/domains/agents/:id/pause
 */
router.post('/agents/:id/pause', (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain Routing is disabled'
    });
  }

  const { id } = req.params;
  const success = agentManager.pauseAgent(id);

  res.json({
    success,
    message: success ? 'Agent paused' : 'Failed to pause agent',
    timestamp: new Date().toISOString()
  });
});

/**
 * Resume agent
 * POST /api/autonomous/domains/agents/:id/resume
 */
router.post('/agents/:id/resume', (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain Routing is disabled'
    });
  }

  const { id } = req.params;
  const success = agentManager.resumeAgent(id);

  res.json({
    success,
    message: success ? 'Agent resumed' : 'Failed to resume agent',
    timestamp: new Date().toISOString()
  });
});

/**
 * Terminate agent
 * DELETE /api/autonomous/domains/agents/:id
 */
router.delete('/agents/:id', (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain Routing is disabled'
    });
  }

  const { id } = req.params;
  const success = agentManager.terminateAgent(id);

  res.json({
    success,
    message: success ? 'Agent terminated' : 'Failed to terminate agent',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get agent statistics
 * GET /api/autonomous/domains/stats
 */
router.get('/stats', (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain Routing is disabled'
    });
  }

  const stats = agentManager.getStats();

  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

/**
 * Analyze all domains for opportunities
 * POST /api/autonomous/domains/analyze
 */
router.post('/analyze', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain Routing is disabled'
    });
  }

  try {
    const agents = agentManager.getAllAgents();
    const allTasks: any[] = [];

    for (const agentInstance of agents) {
      if (agentInstance.status === 'idle') {
        const tasks = await agentInstance.agent.analyze();
        allTasks.push(...tasks);
      }
    }

    res.json({
      success: true,
      data: {
        tasksIdentified: allTasks.length,
        tasks: allTasks.map(t => ({
          id: t.id,
          domain: t.domain,
          type: t.type,
          description: t.description,
          priority: t.priority
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Domain analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
