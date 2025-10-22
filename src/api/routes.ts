/**
 * API Routes for Jarvis Observatory Dashboard
 */

import express, { Request, Response, NextFunction } from 'express';
import { AgentActivityAPI } from './agent-activity.js';
import { Logger } from '../utils/logger.js';
import type { SupabaseClient } from '@supabase/supabase-js';

const logger = new Logger('API:Routes');

export function createAPIRoutes(db: SupabaseClient): express.Router {
  const router = express.Router();
  const activityAPI = new AgentActivityAPI(db);

  // Error handler middleware
  const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // GET /api/agents/activities - Recent agent activities
  router.get(
    '/agents/activities',
    asyncHandler(async (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await activityAPI.getRecentActivities(limit);

      res.json({
        success: true,
        data: activities,
        count: activities.length,
      });
    })
  );

  // GET /api/agents/activities/:agentType - Activities for specific agent
  router.get(
    '/agents/activities/:agentType',
    asyncHandler(async (req: Request, res: Response) => {
      const { agentType } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const activities = await activityAPI.getActivitiesForAgent(agentType, limit);

      res.json({
        success: true,
        data: activities,
        agent_type: agentType,
        count: activities.length,
      });
    })
  );

  // GET /api/agents/metrics - Agent metrics for all agents
  router.get(
    '/agents/metrics',
    asyncHandler(async (req: Request, res: Response) => {
      const metrics = await activityAPI.getAgentMetrics();

      res.json({
        success: true,
        data: metrics,
      });
    })
  );

  // GET /api/agents/approval-queue - Get approval queue
  router.get(
    '/agents/approval-queue',
    asyncHandler(async (req: Request, res: Response) => {
      const queue = await activityAPI.getApprovalQueue();

      res.json({
        success: true,
        data: queue,
        count: queue.length,
      });
    })
  );

  // POST /api/agents/approve/:activityId - Approve an action
  router.post(
    '/agents/approve/:activityId',
    asyncHandler(async (req: Request, res: Response) => {
      const { activityId } = req.params;
      const { approvedBy } = req.body;

      await activityAPI.approveAction(activityId, approvedBy || 'user');

      res.json({
        success: true,
        message: 'Action approved',
        activityId,
      });
    })
  );

  // POST /api/agents/reject/:activityId - Reject an action
  router.post(
    '/agents/reject/:activityId',
    asyncHandler(async (req: Request, res: Response) => {
      const { activityId } = req.params;
      const { reason, rejectedBy } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
      }

      await activityAPI.rejectAction(activityId, reason, rejectedBy || 'user');

      res.json({
        success: true,
        message: 'Action rejected',
        activityId,
      });
    })
  );

  // POST /api/agents/log - Log a new activity
  router.post(
    '/agents/log',
    asyncHandler(async (req: Request, res: Response) => {
      const { agent_type, action, description, risk_level, status, metadata, correlation_id } =
        req.body;

      // Validation
      if (!agent_type || !action || !risk_level) {
        return res.status(400).json({
          success: false,
          error: 'agent_type, action, and risk_level are required',
        });
      }

      const activityId = await activityAPI.logActivity({
        agent_type,
        action,
        description,
        risk_level,
        status,
        metadata,
        correlation_id,
      });

      res.json({
        success: true,
        message: 'Activity logged',
        activityId,
      });
    })
  );

  // GET /api/agents/activity/:activityId - Get specific activity
  router.get(
    '/agents/activity/:activityId',
    asyncHandler(async (req: Request, res: Response) => {
      const { activityId } = req.params;
      const activity = await activityAPI.getActivity(activityId);

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Activity not found',
        });
      }

      res.json({
        success: true,
        data: activity,
      });
    })
  );

  // PATCH /api/agents/activity/:activityId - Update activity
  router.patch(
    '/agents/activity/:activityId',
    asyncHandler(async (req: Request, res: Response) => {
      const { activityId } = req.params;
      const { status, result, error, duration_ms } = req.body;

      await activityAPI.updateActivity(activityId, {
        status,
        result,
        error,
        duration_ms,
      });

      res.json({
        success: true,
        message: 'Activity updated',
        activityId,
      });
    })
  );

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Error handling middleware
  router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('API Error', { error: err.message, path: req.path });

    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  return router;
}
