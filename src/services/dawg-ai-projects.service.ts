/**
 * DAWG AI Projects Service
 *
 * Handles project management, collaboration, and workflow operations.
 *
 * @module services/dawg-ai-projects.service
 */

import { logger } from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';
import { getDawgAIService } from './dawg-ai.service.js';

const prisma = new PrismaClient();

export interface Project {
  id: string;
  userId: string;
  externalId: string;
  name: string;
  description: string | null;
  status: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  genre?: string;
  bpm?: number;
  key?: string;
  tags?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: string;
  metadata?: any;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTracks: number;
  totalCollaborators: number;
}

/**
 * DAWG AI Projects Service
 */
export class DawgAIProjectsService {
  private dawgAIService = getDawgAIService();

  /**
   * List all projects for user
   */
  async listProjects(userId: string, filters?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ projects: Project[]; total: number }> {
    try {
      const where: any = { userId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [projects, total] = await Promise.all([
        prisma.dawgAIProject.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: filters?.offset || 0,
          take: filters?.limit || 50,
        }),
        prisma.dawgAIProject.count({ where }),
      ]);

      return { projects, total };
    } catch (error: any) {
      logger.error('Failed to list DAWG AI projects:', error);
      throw new Error(`Failed to list projects: ${error.message}`);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(userId: string, projectId: string): Promise<Project | null> {
    try {
      const project = await prisma.dawgAIProject.findFirst({
        where: {
          id: projectId,
          userId,
        },
      });

      return project;
    } catch (error: any) {
      logger.error('Failed to get DAWG AI project:', error);
      throw new Error(`Failed to get project: ${error.message}`);
    }
  }

  /**
   * Create new project
   */
  async createProject(userId: string, input: CreateProjectInput): Promise<Project> {
    try {
      // Create project via DAWG AI API
      const apiResponse = await this.dawgAIService.makeRequest(userId, '/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          description: input.description,
          metadata: {
            genre: input.genre,
            bpm: input.bpm,
            key: input.key,
            tags: input.tags || [],
          },
        }),
      });

      // Store in local database
      const project = await prisma.dawgAIProject.create({
        data: {
          userId,
          externalId: apiResponse.id,
          name: input.name,
          description: input.description || null,
          status: 'active',
          metadata: {
            genre: input.genre,
            bpm: input.bpm,
            key: input.key,
            tags: input.tags || [],
          },
        },
      });

      logger.info(`DAWG AI project created: ${project.id}`);
      return project;
    } catch (error: any) {
      logger.error('Failed to create DAWG AI project:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Update project
   */
  async updateProject(
    userId: string,
    projectId: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    try {
      // Get existing project
      const existing = await this.getProject(userId, projectId);
      if (!existing) {
        throw new Error('Project not found');
      }

      // Update via DAWG AI API
      await this.dawgAIService.makeRequest(
        userId,
        `/projects/${existing.externalId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        }
      );

      // Update in local database
      const project = await prisma.dawgAIProject.update({
        where: { id: projectId },
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });

      logger.info(`DAWG AI project updated: ${project.id}`);
      return project;
    } catch (error: any) {
      logger.error('Failed to update DAWG AI project:', error);
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * Delete project
   */
  async deleteProject(userId: string, projectId: string): Promise<void> {
    try {
      const project = await this.getProject(userId, projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Delete via DAWG AI API
      await this.dawgAIService.makeRequest(
        userId,
        `/projects/${project.externalId}`,
        {
          method: 'DELETE',
        }
      );

      // Delete from local database
      await prisma.dawgAIProject.delete({
        where: { id: projectId },
      });

      logger.info(`DAWG AI project deleted: ${projectId}`);
    } catch (error: any) {
      logger.error('Failed to delete DAWG AI project:', error);
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Get project statistics for user
   */
  async getProjectStats(userId: string): Promise<ProjectStats> {
    try {
      const [total, active, completed, workflows] = await Promise.all([
        prisma.dawgAIProject.count({ where: { userId } }),
        prisma.dawgAIProject.count({ where: { userId, status: 'active' } }),
        prisma.dawgAIProject.count({ where: { userId, status: 'completed' } }),
        prisma.dawgAIWorkflow.count({ where: { userId } }),
      ]);

      return {
        totalProjects: total,
        activeProjects: active,
        completedProjects: completed,
        totalTracks: 0, // Could be calculated from metadata
        totalCollaborators: 0, // Could be fetched from API
      };
    } catch (error: any) {
      logger.error('Failed to get DAWG AI project stats:', error);
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  /**
   * Export project data
   */
  async exportProject(userId: string, projectId: string): Promise<any> {
    try {
      const project = await this.getProject(userId, projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Fetch full project data from API
      const projectData = await this.dawgAIService.makeRequest(
        userId,
        `/projects/${project.externalId}/export`
      );

      return {
        project,
        tracks: projectData.tracks || [],
        collaborators: projectData.collaborators || [],
        metadata: projectData.metadata || {},
      };
    } catch (error: any) {
      logger.error('Failed to export DAWG AI project:', error);
      throw new Error(`Failed to export project: ${error.message}`);
    }
  }

  /**
   * Duplicate project
   */
  async duplicateProject(userId: string, projectId: string, newName: string): Promise<Project> {
    try {
      const original = await this.getProject(userId, projectId);
      if (!original) {
        throw new Error('Project not found');
      }

      // Create duplicate via API
      const apiResponse = await this.dawgAIService.makeRequest(
        userId,
        `/projects/${original.externalId}/duplicate`,
        {
          method: 'POST',
          body: JSON.stringify({ name: newName }),
        }
      );

      // Store in local database
      const duplicate = await prisma.dawgAIProject.create({
        data: {
          userId,
          externalId: apiResponse.id,
          name: newName,
          description: original.description,
          status: 'active',
          metadata: original.metadata,
        },
      });

      logger.info(`DAWG AI project duplicated: ${duplicate.id}`);
      return duplicate;
    } catch (error: any) {
      logger.error('Failed to duplicate DAWG AI project:', error);
      throw new Error(`Failed to duplicate project: ${error.message}`);
    }
  }

  /**
   * Archive project
   */
  async archiveProject(userId: string, projectId: string): Promise<Project> {
    try {
      const project = await this.updateProject(userId, projectId, {
        status: 'archived',
      });

      logger.info(`DAWG AI project archived: ${projectId}`);
      return project;
    } catch (error: any) {
      logger.error('Failed to archive DAWG AI project:', error);
      throw new Error(`Failed to archive project: ${error.message}`);
    }
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(userId: string, limit: number = 10): Promise<Project[]> {
    try {
      const projects = await prisma.dawgAIProject.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return projects;
    } catch (error: any) {
      logger.error('Failed to get recent DAWG AI projects:', error);
      throw new Error(`Failed to get recent projects: ${error.message}`);
    }
  }
}

export default DawgAIProjectsService;
