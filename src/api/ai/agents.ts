import { Router, Request, Response } from 'express';
import { AgentService } from '../../services/ai/agent.service.js';
import { logger } from '../../services/logger.service.js';

const router = Router();

let agentService: AgentService;

export function initializeAgentsAPI(service: AgentService) {
  agentService = service;
}

/**
 * GET /api/ai/agents
 * List all available agents
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const agents = agentService.listAgents();

    res.json({
      agents,
      count: agents.length,
    });
  } catch (error: any) {
    logger.error('List agents API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to list agents',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/agents/:agentName/execute
 * Execute an agent task
 */
router.post('/:agentName/execute', async (req: Request, res: Response) => {
  try {
    const { agentName } = req.params;
    const { task, userId } = req.body;

    if (!task || !task.goal) {
      return res.status(400).json({
        error: 'Task with goal is required',
      });
    }

    const execution = await agentService.executeTask(
      agentName,
      {
        id: task.id || `task_${Date.now()}`,
        goal: task.goal,
        context: task.context,
        constraints: task.constraints,
        successCriteria: task.successCriteria,
      },
      userId
    );

    res.json(execution);
  } catch (error: any) {
    logger.error('Execute agent API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to execute agent task',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai/agents/execution/:taskId
 * Get agent execution details
 */
router.get('/execution/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const execution = agentService.getExecution(taskId);

    if (!execution) {
      return res.status(404).json({
        error: 'Execution not found',
      });
    }

    res.json(execution);
  } catch (error: any) {
    logger.error('Get execution API error', { error: error.message });
    res.status(500).json({
      error: 'Failed to get execution details',
      details: error.message,
    });
  }
});

export default router;
