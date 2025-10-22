/**
 * Jarvis Scheduler
 * Cron-based job scheduler for all Jarvis modules
 */

import * as cron from 'node-cron';
import { ScheduledJob, JarvisEvent } from './jarvis.interfaces';
import { moduleRegistry } from './module-registry';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';

/**
 * Job execution record
 */
interface JobExecution {
  jobId: string;
  moduleName: string;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  error?: string;
  duration?: number;
}

/**
 * Scheduler for managing cron-based jobs from all modules
 */
export class JarvisScheduler extends EventEmitter {
  private static instance: JarvisScheduler;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private jobExecutions: JobExecution[] = [];
  private maxExecutionHistory: number = 1000;
  private activeJobs: Set<string> = new Set();

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): JarvisScheduler {
    if (!JarvisScheduler.instance) {
      JarvisScheduler.instance = new JarvisScheduler();
    }
    return JarvisScheduler.instance;
  }

  /**
   * Initialize scheduler and register all module jobs
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Jarvis Scheduler...');

    try {
      const modules = moduleRegistry.getAllModules();
      let totalJobsRegistered = 0;

      for (const module of modules) {
        if (!module.getScheduledJobs) {
          logger.debug(`Module "${module.name}" has no scheduled jobs`);
          continue;
        }

        const jobs = module.getScheduledJobs();

        if (!jobs || jobs.length === 0) {
          logger.debug(`Module "${module.name}" returned no scheduled jobs`);
          continue;
        }

        logger.info(`Registering ${jobs.length} scheduled jobs for module: ${module.name}`);

        for (const job of jobs) {
          this.registerJob(module.name, job);
          totalJobsRegistered++;
        }
      }

      logger.info(`Jarvis Scheduler initialized with ${totalJobsRegistered} jobs`, {
        totalJobs: totalJobsRegistered,
        modules: modules.length,
      });
    } catch (error) {
      logger.error('Scheduler initialization failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Register a scheduled job
   */
  registerJob(moduleName: string, job: ScheduledJob): void {
    const jobKey = `${moduleName}:${job.id}`;

    if (this.scheduledTasks.has(jobKey)) {
      logger.warn(`Job "${jobKey}" already registered, skipping`);
      return;
    }

    if (!job.enabled) {
      logger.info(`Job "${jobKey}" is disabled, skipping registration`);
      return;
    }

    try {
      // Validate cron expression
      if (!cron.validate(job.schedule)) {
        throw new Error(`Invalid cron expression: ${job.schedule}`);
      }

      // Create wrapper handler with error handling and logging
      const wrappedHandler = async () => {
        await this.executeJob(moduleName, job);
      };

      // Schedule the task
      const task = cron.schedule(
        job.schedule,
        wrappedHandler,
        {
          timezone: job.timezone || 'UTC',
        }
      );

      this.scheduledTasks.set(jobKey, task);

      logger.info(`Scheduled job registered: ${jobKey}`, {
        schedule: job.schedule,
        timezone: job.timezone || 'UTC',
        description: job.description,
      });
    } catch (error) {
      logger.error(`Failed to register job: ${jobKey}`, {
        error: (error as Error).message,
        schedule: job.schedule,
      });
    }
  }

  /**
   * Execute a scheduled job
   */
  private async executeJob(moduleName: string, job: ScheduledJob): Promise<void> {
    const jobKey = `${moduleName}:${job.id}`;

    if (this.activeJobs.has(jobKey)) {
      logger.warn(`Job "${jobKey}" is already running, skipping execution`);
      return;
    }

    this.activeJobs.add(jobKey);

    const execution: JobExecution = {
      jobId: job.id,
      moduleName,
      startTime: new Date(),
      success: false,
    };

    logger.info(`Executing scheduled job: ${jobKey}`, {
      name: job.name,
      schedule: job.schedule,
    });

    this.emit(JarvisEvent.JOB_STARTED, {
      event: JarvisEvent.JOB_STARTED,
      timestamp: new Date(),
      module: moduleName,
      data: { jobId: job.id, jobName: job.name },
    });

    let attempt = 0;
    const maxAttempts = job.retry?.maxAttempts || 1;
    let lastError: Error | null = null;

    while (attempt < maxAttempts) {
      try {
        await job.handler();

        // Success
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        execution.success = true;

        logger.info(`Job completed successfully: ${jobKey}`, {
          duration: `${execution.duration}ms`,
          attempt: attempt + 1,
        });

        this.emit(JarvisEvent.JOB_COMPLETED, {
          event: JarvisEvent.JOB_COMPLETED,
          timestamp: new Date(),
          module: moduleName,
          data: {
            jobId: job.id,
            jobName: job.name,
            duration: execution.duration,
          },
        });

        break;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        logger.error(`Job execution failed (attempt ${attempt}/${maxAttempts}): ${jobKey}`, {
          error: lastError.message,
          attempt,
        });

        if (attempt < maxAttempts && job.retry) {
          // Wait before retry
          await this.sleep(job.retry.delayMs);
        }
      }
    }

    // If all attempts failed
    if (!execution.success && lastError) {
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.error = lastError.message;

      logger.error(`Job failed after ${attempt} attempts: ${jobKey}`, {
        error: lastError.message,
        duration: `${execution.duration}ms`,
      });

      this.emit(JarvisEvent.JOB_FAILED, {
        event: JarvisEvent.JOB_FAILED,
        timestamp: new Date(),
        module: moduleName,
        data: {
          jobId: job.id,
          jobName: job.name,
          error: lastError.message,
          attempts: attempt,
        },
      });
    }

    // Record execution
    this.recordExecution(execution);

    // Remove from active jobs
    this.activeJobs.delete(jobKey);
  }

  /**
   * Record job execution history
   */
  private recordExecution(execution: JobExecution): void {
    this.jobExecutions.push(execution);

    // Trim history if it exceeds max size
    if (this.jobExecutions.length > this.maxExecutionHistory) {
      this.jobExecutions = this.jobExecutions.slice(-this.maxExecutionHistory);
    }
  }

  /**
   * Unregister a specific job
   */
  unregisterJob(moduleName: string, jobId: string): void {
    const jobKey = `${moduleName}:${jobId}`;
    const task = this.scheduledTasks.get(jobKey);

    if (!task) {
      logger.warn(`Job "${jobKey}" not found, cannot unregister`);
      return;
    }

    task.stop();
    this.scheduledTasks.delete(jobKey);

    logger.info(`Job unregistered: ${jobKey}`);
  }

  /**
   * Unregister all jobs for a module
   */
  unregisterModuleJobs(moduleName: string): void {
    const jobsToRemove: string[] = [];

    Array.from(this.scheduledTasks.keys()).forEach((jobKey) => {
      if (jobKey.startsWith(`${moduleName}:`)) {
        jobsToRemove.push(jobKey);
      }
    });

    for (const jobKey of jobsToRemove) {
      const task = this.scheduledTasks.get(jobKey);
      if (task) {
        task.stop();
        this.scheduledTasks.delete(jobKey);
      }
    }

    logger.info(`Unregistered ${jobsToRemove.length} jobs for module: ${moduleName}`);
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    logger.info('Stopping all scheduled jobs...');

    Array.from(this.scheduledTasks.entries()).forEach(([jobKey, task]) => {
      task.stop();
      logger.debug(`Stopped job: ${jobKey}`);
    });

    logger.info(`Stopped ${this.scheduledTasks.size} scheduled jobs`);
  }

  /**
   * Start all scheduled jobs
   */
  startAll(): void {
    logger.info('Starting all scheduled jobs...');

    Array.from(this.scheduledTasks.entries()).forEach(([jobKey, task]) => {
      task.start();
      logger.debug(`Started job: ${jobKey}`);
    });

    logger.info(`Started ${this.scheduledTasks.size} scheduled jobs`);
  }

  /**
   * Get job execution history
   */
  getExecutionHistory(moduleName?: string, limit: number = 100): JobExecution[] {
    let history = [...this.jobExecutions];

    if (moduleName) {
      history = history.filter(exec => exec.moduleName === moduleName);
    }

    return history.slice(-limit).reverse();
  }

  /**
   * Get job statistics
   */
  getStats(): {
    totalJobs: number;
    activeJobs: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgExecutionTime: number;
    jobsByModule: Record<string, number>;
  } {
    const jobsByModule: Record<string, number> = {};

    Array.from(this.scheduledTasks.keys()).forEach((jobKey) => {
      const moduleName = jobKey.split(':')[0];
      jobsByModule[moduleName] = (jobsByModule[moduleName] || 0) + 1;
    });

    const successfulExecutions = this.jobExecutions.filter(e => e.success).length;
    const failedExecutions = this.jobExecutions.filter(e => !e.success).length;

    const totalExecutionTime = this.jobExecutions
      .filter(e => e.duration !== undefined)
      .reduce((sum, e) => sum + (e.duration || 0), 0);

    const avgExecutionTime =
      this.jobExecutions.length > 0
        ? totalExecutionTime / this.jobExecutions.length
        : 0;

    return {
      totalJobs: this.scheduledTasks.size,
      activeJobs: this.activeJobs.size,
      totalExecutions: this.jobExecutions.length,
      successfulExecutions,
      failedExecutions,
      avgExecutionTime: Math.round(avgExecutionTime),
      jobsByModule,
    };
  }

  /**
   * Get list of all registered jobs
   */
  getRegisteredJobs(): Array<{
    jobKey: string;
    moduleName: string;
    jobId: string;
    isActive: boolean;
  }> {
    return Array.from(this.scheduledTasks.entries()).map(([jobKey, task]) => {
      const [moduleName, jobId] = jobKey.split(':');
      return {
        jobKey,
        moduleName,
        jobId,
        isActive: this.activeJobs.has(jobKey),
      };
    });
  }

  /**
   * Shutdown scheduler
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Jarvis Scheduler...');

    this.stopAll();
    this.scheduledTasks.clear();
    this.activeJobs.clear();

    logger.info('Jarvis Scheduler shut down successfully');
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const jarvisScheduler = JarvisScheduler.getInstance();
