/**
 * DAWG AI Projects API
 *
 * API endpoints for DAWG AI project management.
 *
 * @module api/dawg-ai/projects
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger.js';
import DawgAIProjectsService from '../../services/dawg-ai-projects.service.js';

const router = Router();
const projectsService = new DawgAIProjectsService();

/**
 * Authentication middleware
 * Expects userId in request (set by auth middleware)
 */
interface AuthRequest extends Request {
  userId?: string;
}

/**
 * GET /api/dawg-ai/projects
 * List all projects for authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const filters = {
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await projectsService.listProjects(userId, filters);

    res.json({
      success: true,
      data: result.projects,
      total: result.total,
      pagination: {
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      },
    });
  } catch (error: any) {
    logger.error('Failed to list projects:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/projects/recent
 * Get recent projects for authenticated user
 */
router.get('/recent', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const projects = await projectsService.getRecentProjects(userId, limit);

    res.json({
      success: true,
      data: projects,
    });
  } catch (error: any) {
    logger.error('Failed to get recent projects:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/projects/stats
 * Get project statistics for authenticated user
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await projectsService.getProjectStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Failed to get project stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/projects/:id
 * Get project by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const project = await projectsService.getProject(userId, req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    logger.error('Failed to get project:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/dawg-ai/projects
 * Create new project
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, genre, bpm, key, tags } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Project name is required',
      });
    }

    const project = await projectsService.createProject(userId, {
      name,
      description,
      genre,
      bpm,
      key,
      tags,
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    logger.error('Failed to create project:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/dawg-ai/projects/:id
 * Update project
 */
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updates = req.body;
    const project = await projectsService.updateProject(userId, req.params.id, updates);

    res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    logger.error('Failed to update project:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/dawg-ai/projects/:id
 * Delete project
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await projectsService.deleteProject(userId, req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete project:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/dawg-ai/projects/:id/archive
 * Archive project
 */
router.post('/:id/archive', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const project = await projectsService.archiveProject(userId, req.params.id);

    res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    logger.error('Failed to archive project:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/dawg-ai/projects/:id/duplicate
 * Duplicate project
 */
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'New project name is required',
      });
    }

    const project = await projectsService.duplicateProject(userId, req.params.id, name);

    res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    logger.error('Failed to duplicate project:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/projects/:id/export
 * Export project data
 */
router.get('/:id/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = await projectsService.exportProject(userId, req.params.id);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error('Failed to export project:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
