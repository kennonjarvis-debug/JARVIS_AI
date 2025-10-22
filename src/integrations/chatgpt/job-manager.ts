import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';

export interface Job {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  estimatedTimeRemaining?: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

class JobManager {
  private jobs: Map<string, Job> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly JOB_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Cleanup old jobs every hour
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Create a new job
   */
  createJob(type: string, metadata?: Record<string, any>): Job {
    const job: Job = {
      id: `job_${type}_${uuidv4().slice(0, 8)}`,
      type,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };

    this.jobs.set(job.id, job);
    logger.info(`Job created: ${job.id} (${type})`);
    return job;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Update job status
   */
  updateJob(jobId: string, updates: Partial<Job>): Job | undefined {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn(`Job not found: ${jobId}`);
      return undefined;
    }

    Object.assign(job, updates, { updatedAt: new Date() });
    this.jobs.set(jobId, job);
    logger.debug(`Job updated: ${jobId}`, { status: job.status, progress: job.progress });
    return job;
  }

  /**
   * Mark job as running
   */
  startJob(jobId: string, estimatedTimeRemaining?: number): Job | undefined {
    return this.updateJob(jobId, {
      status: 'running',
      progress: 0,
      estimatedTimeRemaining,
    });
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, progress: number, estimatedTimeRemaining?: number): Job | undefined {
    return this.updateJob(jobId, {
      progress: Math.min(100, Math.max(0, progress)),
      estimatedTimeRemaining,
    });
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId: string, result: any): Job | undefined {
    logger.info(`Job completed: ${jobId}`);
    return this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      result,
      estimatedTimeRemaining: 0,
    });
  }

  /**
   * Mark job as failed
   */
  failJob(jobId: string, error: string): Job | undefined {
    logger.error(`Job failed: ${jobId}`, { error });
    return this.updateJob(jobId, {
      status: 'failed',
      error,
    });
  }

  /**
   * Execute an async job with automatic status tracking
   */
  async executeJob<T>(
    type: string,
    executor: (job: Job) => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<string> {
    const job = this.createJob(type, metadata);

    // Execute job asynchronously
    (async () => {
      try {
        this.startJob(job.id);
        const result = await executor(job);
        this.completeJob(job.id, result);
      } catch (error: any) {
        this.failJob(job.id, error.message || 'Unknown error occurred');
      }
    })();

    return job.id;
  }

  /**
   * List jobs by status or type
   */
  listJobs(filter?: { status?: Job['status']; type?: string }): Job[] {
    const jobs = Array.from(this.jobs.values());

    if (!filter) {
      return jobs;
    }

    return jobs.filter((job) => {
      if (filter.status && job.status !== filter.status) {
        return false;
      }
      if (filter.type && job.type !== filter.type) {
        return false;
      }
      return true;
    });
  }

  /**
   * Delete a job
   */
  deleteJob(jobId: string): boolean {
    const deleted = this.jobs.delete(jobId);
    if (deleted) {
      logger.info(`Job deleted: ${jobId}`);
    }
    return deleted;
  }

  /**
   * Clean up old completed/failed jobs
   */
  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      const age = now - job.updatedAt.getTime();

      // Delete completed/failed jobs older than TTL
      if ((job.status === 'completed' || job.status === 'failed') && age > this.JOB_TTL) {
        this.jobs.delete(jobId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old jobs`);
    }
  }

  /**
   * Shutdown job manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.info('Job manager shut down');
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      queued: jobs.filter((j) => j.status === 'queued').length,
      running: jobs.filter((j) => j.status === 'running').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
    };
  }
}

// Singleton instance
export const jobManager = new JobManager();
