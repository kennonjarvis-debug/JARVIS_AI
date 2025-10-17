/**
 * Base Module
 * Abstract base class for all Jarvis modules
 */

import { Router } from 'express';
import {
  JarvisModule,
  JarvisCommand,
  JarvisCommandResult,
  ModuleHealth,
  ScheduledJob,
  ModuleContext,
  ModuleLogger,
} from './jarvis.interfaces';
import { logger as systemLogger } from '../../utils/logger';

/**
 * Abstract base class that provides common functionality for all modules
 * Modules should extend this class to inherit standard behavior
 */
export abstract class BaseModule implements JarvisModule {
  /** Module name - must be overridden */
  abstract name: string;

  /** Module version - must be overridden */
  abstract version: string;

  /** Module description - must be overridden */
  abstract description: string;

  /** Module dependencies - can be overridden */
  dependencies: string[] = [];

  /** Module initialization timestamp */
  protected startTime: Date | null = null;

  /** Module context */
  protected context: ModuleContext | null = null;

  /** Module logger */
  protected logger: ModuleLogger;

  /** Module enabled state */
  protected enabled: boolean = true;

  /** Command handlers registry */
  private commandHandlers: Map<string, (params: any) => Promise<any>> = new Map();

  constructor() {
    // Create module-specific logger
    this.logger = {
      info: (message: string, meta?: Record<string, any>) => {
        systemLogger.info(`[${this.name}] ${message}`, meta);
      },
      warn: (message: string, meta?: Record<string, any>) => {
        systemLogger.warn(`[${this.name}] ${message}`, meta);
      },
      error: (message: string, meta?: Record<string, any>) => {
        systemLogger.error(`[${this.name}] ${message}`, meta);
      },
      debug: (message: string, meta?: Record<string, any>) => {
        systemLogger.debug(`[${this.name}] ${message}`, meta);
      },
    };
  }

  /**
   * Initialize the module
   * Calls onInitialize() hook which can be overridden by child classes
   */
  async initialize(): Promise<void> {
    this.logger.info(`Initializing ${this.name} module v${this.version}...`);
    this.startTime = new Date();

    try {
      await this.onInitialize();
      this.logger.info(`${this.name} module initialized successfully`);
    } catch (error) {
      this.logger.error(`${this.name} module initialization failed`, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Shutdown the module
   * Calls onShutdown() hook which can be overridden by child classes
   */
  async shutdown(): Promise<void> {
    this.logger.info(`Shutting down ${this.name} module...`);

    try {
      await this.onShutdown();
      this.logger.info(`${this.name} module shut down successfully`);
    } catch (error) {
      this.logger.error(`${this.name} module shutdown failed`, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Register Express routes for this module
   * Calls onRegisterRoutes() hook which should be overridden by child classes
   */
  registerRoutes(router: Router): void {
    this.logger.debug(`Registering routes for ${this.name} module`);
    this.onRegisterRoutes(router);
  }

  /**
   * Handle a command directed to this module
   */
  async handleCommand(command: JarvisCommand): Promise<JarvisCommandResult> {
    const startTime = Date.now();

    this.logger.debug(`Handling command: ${command.action}`, {
      commandId: command.id,
      parameters: command.parameters,
    });

    try {
      // Look up command handler
      const handler = this.commandHandlers.get(command.action);

      if (!handler) {
        throw new Error(
          `Unknown command action: ${command.action}. Available actions: ${Array.from(
            this.commandHandlers.keys()
          ).join(', ')}`
        );
      }

      // Execute command handler
      const data = await handler(command.parameters);

      const executionTime = Date.now() - startTime;

      this.logger.info(`Command executed successfully: ${command.action}`, {
        commandId: command.id,
        executionTime: `${executionTime}ms`,
      });

      return {
        success: true,
        data,
        metadata: {
          executionTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(`Command execution failed: ${command.action}`, {
        commandId: command.id,
        error: (error as Error).message,
        executionTime: `${executionTime}ms`,
      });

      return {
        success: false,
        error: (error as Error).message,
        metadata: {
          executionTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Get current health status of the module
   * Calls onGetHealthMetrics() hook for module-specific metrics
   */
  async getHealthStatus(): Promise<ModuleHealth> {
    if (!this.startTime) {
      return {
        status: 'unknown',
        uptime: 0,
        lastCheck: new Date(),
        issues: ['Module not initialized'],
      };
    }

    const uptime = Date.now() - this.startTime.getTime();

    try {
      // Get module-specific metrics
      const customMetrics = await this.onGetHealthMetrics();

      // Determine health status based on metrics
      const status = this.determineHealthStatus(customMetrics);

      return {
        status,
        uptime,
        lastCheck: new Date(),
        metrics: customMetrics,
      };
    } catch (error) {
      this.logger.error('Health check failed', {
        error: (error as Error).message,
      });

      return {
        status: 'unhealthy',
        uptime,
        lastCheck: new Date(),
        issues: [`Health check failed: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Get scheduled jobs for this module
   * Calls onGetScheduledJobs() hook which can be overridden by child classes
   */
  getScheduledJobs(): ScheduledJob[] {
    return this.onGetScheduledJobs();
  }

  /**
   * Register a command handler
   * @param action Command action name
   * @param handler Handler function
   */
  protected registerCommand(
    action: string,
    handler: (params: any) => Promise<any>
  ): void {
    if (this.commandHandlers.has(action)) {
      this.logger.warn(`Overwriting existing command handler: ${action}`);
    }

    this.commandHandlers.set(action, handler);
    this.logger.debug(`Registered command handler: ${action}`);
  }

  /**
   * Determine health status from metrics
   */
  private determineHealthStatus(
    metrics?: ModuleHealth['metrics']
  ): ModuleHealth['status'] {
    if (!metrics) {
      return 'healthy';
    }

    // Check error rate
    if (metrics.errorRate !== undefined && metrics.errorRate > 10) {
      return 'unhealthy';
    }

    if (metrics.errorRate !== undefined && metrics.errorRate > 5) {
      return 'degraded';
    }

    // Check CPU usage
    if (metrics.cpuUsage !== undefined && metrics.cpuUsage > 90) {
      return 'unhealthy';
    }

    if (metrics.cpuUsage !== undefined && metrics.cpuUsage > 70) {
      return 'degraded';
    }

    // Check memory usage
    if (metrics.memoryUsage !== undefined && metrics.memoryUsage > 1024) {
      // > 1GB
      return 'unhealthy';
    }

    if (metrics.memoryUsage !== undefined && metrics.memoryUsage > 512) {
      // > 512MB
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Hook: Called during module initialization
   * Override this in child classes to perform module-specific initialization
   */
  protected async onInitialize(): Promise<void> {
    // Default: no-op
  }

  /**
   * Hook: Called during module shutdown
   * Override this in child classes to perform module-specific cleanup
   */
  protected async onShutdown(): Promise<void> {
    // Default: no-op
  }

  /**
   * Hook: Register routes for this module
   * Override this in child classes to register Express routes
   */
  protected onRegisterRoutes(router: Router): void {
    // Default: no routes
    this.logger.debug('No routes registered (onRegisterRoutes not implemented)');
  }

  /**
   * Hook: Get module-specific health metrics
   * Override this in child classes to provide custom health metrics
   */
  protected async onGetHealthMetrics(): Promise<ModuleHealth['metrics']> {
    // Default: no custom metrics
    return {};
  }

  /**
   * Hook: Get scheduled jobs for this module
   * Override this in child classes to provide scheduled jobs
   */
  protected onGetScheduledJobs(): ScheduledJob[] {
    // Default: no scheduled jobs
    return [];
  }

  /**
   * Set module context (called by Jarvis controller)
   */
  setContext(context: ModuleContext): void {
    this.context = context;
  }

  /**
   * Get module uptime in milliseconds
   */
  protected getUptime(): number {
    if (!this.startTime) {
      return 0;
    }
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Check if module is initialized
   */
  protected isInitialized(): boolean {
    return this.startTime !== null;
  }
}
