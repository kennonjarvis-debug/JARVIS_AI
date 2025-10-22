/**
 * Mock DAWG AI API
 *
 * Provides mock endpoints for testing DAWG AI integration without real account.
 *
 * @module mock/dawg-ai-api
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const router = Router();

// Mock data store
const mockProjects = new Map<string, any>();
const mockWorkflows = new Map<string, any>();
const mockUsers = new Map<string, any>();

/**
 * Mock user authentication middleware
 */
function mockAuth(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const user = mockUsers.get(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  (req as any).mockUser = user;
  next();
}

/**
 * OAuth endpoints
 */

// GET /oauth/authorize
router.get('/oauth/authorize', (req: Request, res: Response) => {
  const { client_id, redirect_uri, state, scope } = req.query;

  logger.info('Mock OAuth authorization request', { client_id, state });

  // Generate mock authorization code
  const code = `mock_code_${crypto.randomBytes(16).toString('hex')}`;

  // Redirect back with code
  const redirectUrl = `${redirect_uri}?code=${code}&state=${state}`;
  res.redirect(redirectUrl);
});

// POST /oauth/token
router.post('/oauth/token', (req: Request, res: Response) => {
  const { grant_type, code, refresh_token } = req.body;

  logger.info('Mock OAuth token request', { grant_type });

  if (grant_type === 'authorization_code') {
    // Generate mock tokens
    const accessToken = `mock_access_${crypto.randomBytes(32).toString('hex')}`;
    const refreshToken = `mock_refresh_${crypto.randomBytes(32).toString('hex')}`;

    // Create mock user
    const user = {
      id: `user_${crypto.randomBytes(8).toString('hex')}`,
      email: 'mock@dawg-ai.com',
      name: 'Mock User',
      plan: 'pro',
      created_at: new Date().toISOString(),
    };

    mockUsers.set(accessToken, user);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'projects:read projects:write workflows:read workflows:write analytics:read',
    });
  } else if (grant_type === 'refresh_token') {
    // Generate new access token
    const accessToken = `mock_access_${crypto.randomBytes(32).toString('hex')}`;

    res.json({
      access_token: accessToken,
      refresh_token: refresh_token,
      expires_in: 3600,
      token_type: 'Bearer',
    });
  } else {
    res.status(400).json({ error: 'unsupported_grant_type' });
  }
});

/**
 * User endpoints
 */

// GET /user/me
router.get('/user/me', mockAuth, (req: Request, res: Response) => {
  const user = (req as any).mockUser;
  res.json(user);
});

/**
 * Projects endpoints
 */

// GET /projects
router.get('/projects', mockAuth, (req: Request, res: Response) => {
  const user = (req as any).mockUser;
  const userProjects = Array.from(mockProjects.values()).filter(
    (p) => p.userId === user.id
  );

  res.json({
    data: userProjects,
    total: userProjects.length,
  });
});

// POST /projects
router.post('/projects', mockAuth, (req: Request, res: Response) => {
  const user = (req as any).mockUser;
  const { name, description, metadata } = req.body;

  const project = {
    id: `proj_${crypto.randomBytes(8).toString('hex')}`,
    userId: user.id,
    name,
    description,
    status: 'active',
    metadata: metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockProjects.set(project.id, project);

  logger.info('Mock project created', { projectId: project.id });

  res.status(201).json(project);
});

// GET /projects/:id
router.get('/projects/:id', mockAuth, (req: Request, res: Response) => {
  const project = mockProjects.get(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json(project);
});

// PATCH /projects/:id
router.patch('/projects/:id', mockAuth, (req: Request, res: Response) => {
  const project = mockProjects.get(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  Object.assign(project, req.body, {
    updated_at: new Date().toISOString(),
  });

  mockProjects.set(project.id, project);

  logger.info('Mock project updated', { projectId: project.id });

  res.json(project);
});

// DELETE /projects/:id
router.delete('/projects/:id', mockAuth, (req: Request, res: Response) => {
  const project = mockProjects.get(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  mockProjects.delete(req.params.id);

  logger.info('Mock project deleted', { projectId: req.params.id });

  res.status(204).send();
});

// POST /projects/:id/duplicate
router.post('/projects/:id/duplicate', mockAuth, (req: Request, res: Response) => {
  const original = mockProjects.get(req.params.id);

  if (!original) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { name } = req.body;
  const duplicate = {
    ...original,
    id: `proj_${crypto.randomBytes(8).toString('hex')}`,
    name: name || `${original.name} (Copy)`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockProjects.set(duplicate.id, duplicate);

  logger.info('Mock project duplicated', { originalId: original.id, duplicateId: duplicate.id });

  res.json(duplicate);
});

// GET /projects/:id/export
router.get('/projects/:id/export', mockAuth, (req: Request, res: Response) => {
  const project = mockProjects.get(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({
    project,
    tracks: [
      {
        id: 'track_1',
        name: 'Drums',
        type: 'audio',
        duration: 240,
      },
      {
        id: 'track_2',
        name: 'Bass',
        type: 'audio',
        duration: 240,
      },
    ],
    collaborators: [
      {
        id: 'collab_1',
        email: 'collaborator@example.com',
        role: 'editor',
      },
    ],
    metadata: project.metadata,
  });
});

/**
 * Workflows endpoints
 */

// POST /workflows
router.post('/workflows', mockAuth, (req: Request, res: Response) => {
  const { id, name, config } = req.body;

  mockWorkflows.set(id, {
    id,
    name,
    config,
    registered_at: new Date().toISOString(),
  });

  logger.info('Mock workflow registered', { workflowId: id });

  res.status(201).json({ success: true, id });
});

/**
 * Analytics endpoints
 */

// GET /analytics
router.get('/analytics', mockAuth, (req: Request, res: Response) => {
  res.json({
    projects_created: Math.floor(Math.random() * 50),
    workflows_executed: Math.floor(Math.random() * 200),
    api_calls: Math.floor(Math.random() * 1000),
    storage_used: Math.floor(Math.random() * 1000000000),
  });
});

/**
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'operational',
    mode: 'mock',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Clear mock data (for testing)
 */
router.post('/mock/clear', (req: Request, res: Response) => {
  mockProjects.clear();
  mockWorkflows.clear();
  mockUsers.clear();

  logger.info('Mock data cleared');

  res.json({ success: true, message: 'Mock data cleared' });
});

export default router;
