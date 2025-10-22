/**
 * Jarvis Controller
 * Main orchestrator for the Jarvis AI Operator layer
 */

import { Router } from 'express';
import { EventEmitter } from 'events';
import {
  JarvisCommand,
  JarvisCommandResult,
  JarvisEvent,
  JarvisEventPayload,
  ModuleContext,
  ModuleConfig,
  SystemHealth,
} from './jarvis.interfaces';
import { moduleRegistry } from './module-registry';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main Jarvis controller that orchestrates all modules and commands
 */
export class JarvisController extends EventEmitter {
  private static instance: JarvisController;
  private router: Router;
  private initialized: boolean = false;
  private startTime: Date | null = null;
  private commandsProcessed: number = 0;
  private totalExecutionTime: number = 0;

  private constructor() {
    super();
    this.router = Router();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): JarvisController {
    if (!JarvisController.instance) {
      JarvisController.instance = new JarvisController();
    }
    return JarvisController.instance;
  }

  /**
   * Get the Jarvis router instance
   */
  static getRouter(): Router {
    if (!JarvisController.instance) {
      JarvisController.instance = new JarvisController();
    }
    return JarvisController.instance.router;
  }

  /**
   * Initialize Jarvis controller and all registered modules
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Jarvis controller already initialized');
      return;
    }

    logger.info('Initializing Jarvis AI Operator...');
    this.startTime = new Date();

    try {
      // Initialize all registered modules
      await moduleRegistry.initializeAll();

      // Mount module routes
      this.mountModuleRoutes();

      // Setup core routes
      this.setupCoreRoutes();

      this.initialized = true;

      logger.info('Jarvis AI Operator initialized successfully', {
        modulesLoaded: moduleRegistry.getStats().initializedModules,
      });

      this.emit(JarvisEvent.SYSTEM_HEALTH_CHANGED, {
        status: 'healthy',
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Jarvis initialization failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  /**
   * Shutdown Jarvis controller and all modules
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      logger.warn('Jarvis controller not initialized, nothing to shutdown');
      return;
    }

    logger.info('Shutting down Jarvis AI Operator...');

    try {
      await moduleRegistry.shutdownAll();
      this.initialized = false;

      logger.info('Jarvis AI Operator shut down successfully');
    } catch (error) {
      logger.error('Jarvis shutdown failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Mount routes from all registered modules
   */
  private mountModuleRoutes(): void {
    const modules = moduleRegistry.getAllModules();

    logger.info(`Mounting routes for ${modules.length} modules...`);

    for (const module of modules) {
      try {
        const moduleRouter = Router();
        module.registerRoutes(moduleRouter);

        // Mount module routes under /jarvis/{module-name}
        this.router.use(`/${module.name}`, moduleRouter);

        logger.debug(`Routes mounted for module: ${module.name}`, {
          path: `/${module.name}`,
        });
      } catch (error) {
        logger.error(`Failed to mount routes for module: ${module.name}`, {
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Setup core Jarvis routes
   */
  private setupCoreRoutes(): void {
    // Health check endpoint
    this.router.get('/health', async (req, res) => {
      try {
        const health = await this.getSystemHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Health check failed', {
          error: (error as Error).message,
        });
        res.status(500).json({
          status: 'unhealthy',
          error: (error as Error).message,
        });
      }
    });

    // Module list endpoint
    this.router.get('/modules', (req, res) => {
      try {
        const stats = moduleRegistry.getStats();
        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        logger.error('Failed to get module list', {
          error: (error as Error).message,
        });
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Execute command endpoint
    this.router.post('/command', async (req, res) => {
      try {
        const { module, action, parameters, userId } = req.body;

        if (!module || !action) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: module, action',
          });
        }

        const command: JarvisCommand = {
          id: uuidv4(),
          module,
          action,
          parameters: parameters || {},
          userId,
          timestamp: new Date(),
        };

        const result = await this.executeCommand(command);

        res.json(result);
      } catch (error) {
        logger.error('Command execution failed', {
          error: (error as Error).message,
        });
        res.status(500).json({
          success: false,
          error: (error as Error).message,
          metadata: {
            executionTime: 0,
            module: 'jarvis',
            timestamp: new Date(),
          },
        });
      }
    });

    // System statistics endpoint
    this.router.get('/stats', (req, res) => {
      try {
        const stats = this.getStats();
        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        logger.error('Failed to get stats', {
          error: (error as Error).message,
        });
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    logger.info('Core Jarvis routes setup complete');
  }

  /**
   * Execute a command on a specific module
   */
  async executeCommand(command: JarvisCommand): Promise<JarvisCommandResult> {
    const startTime = Date.now();

    logger.info('Executing command', {
      commandId: command.id,
      module: command.module,
      action: command.action,
    });

    this.emit(JarvisEvent.COMMAND_RECEIVED, {
      event: JarvisEvent.COMMAND_RECEIVED,
      timestamp: new Date(),
      module: command.module,
      data: command,
    });

    try {
      // Get target module
      const module = moduleRegistry.getModule(command.module);

      if (!module) {
        throw new Error(
          `Module "${command.module}" not found. Available modules: ${moduleRegistry
            .getAllModules()
            .map(m => m.name)
            .join(', ')}`
        );
      }

      if (!moduleRegistry.isInitialized(command.module)) {
        throw new Error(`Module "${command.module}" is not initialized`);
      }

      // Execute command
      const result = await module.handleCommand(command);

      const executionTime = Date.now() - startTime;

      // Update stats
      this.commandsProcessed++;
      this.totalExecutionTime += executionTime;

      this.emit(JarvisEvent.COMMAND_COMPLETED, {
        event: JarvisEvent.COMMAND_COMPLETED,
        timestamp: new Date(),
        module: command.module,
        data: { command, result, executionTime },
      });

      logger.info('Command executed successfully', {
        commandId: command.id,
        module: command.module,
        action: command.action,
        executionTime: `${executionTime}ms`,
        success: result.success,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.emit(JarvisEvent.COMMAND_FAILED, {
        event: JarvisEvent.COMMAND_FAILED,
        timestamp: new Date(),
        module: command.module,
        data: { command, error: (error as Error).message, executionTime },
      });

      logger.error('Command execution failed', {
        commandId: command.id,
        module: command.module,
        action: command.action,
        error: (error as Error).message,
        executionTime: `${executionTime}ms`,
      });

      return {
        success: false,
        error: (error as Error).message,
        metadata: {
          executionTime,
          module: command.module,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Get system-level health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const modules = moduleRegistry.getAllModules();
    const moduleHealthStatuses: Record<string, any> = {};

    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;

    // Collect health status from all modules
    for (const module of modules) {
      try {
        const health = await module.getHealthStatus();
        moduleHealthStatuses[module.name] = health;

        if (health.status === 'healthy') healthyCount++;
        else if (health.status === 'degraded') degradedCount++;
        else unhealthyCount++;
      } catch (error) {
        logger.error(`Failed to get health status for module: ${module.name}`, {
          error: (error as Error).message,
        });

        moduleHealthStatuses[module.name] = {
          status: 'unhealthy',
          uptime: 0,
          lastCheck: new Date(),
          issues: [`Health check failed: ${(error as Error).message}`],
        };
        unhealthyCount++;
      }
    }

    // Determine overall system health
    let systemStatus: SystemHealth['status'] = 'healthy';
    if (unhealthyCount > 0) {
      systemStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      systemStatus = 'degraded';
    }

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    const avgResponseTime =
      this.commandsProcessed > 0
        ? this.totalExecutionTime / this.commandsProcessed
        : 0;

    return {
      status: systemStatus,
      modules: moduleHealthStatuses,
      uptime,
      lastCheck: new Date(),
      metrics: {
        totalModules: modules.length,
        healthyModules: healthyCount,
        degradedModules: degradedCount,
        unhealthyModules: unhealthyCount,
        activeJobs: 0, // Will be populated by scheduler
        commandsProcessed: this.commandsProcessed,
        avgResponseTime: Math.round(avgResponseTime),
      },
    };
  }

  /**
   * Get Jarvis controller statistics
   */
  getStats(): {
    initialized: boolean;
    uptime: number;
    commandsProcessed: number;
    avgExecutionTime: number;
    moduleStats: any;
  } {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    const avgExecutionTime =
      this.commandsProcessed > 0
        ? this.totalExecutionTime / this.commandsProcessed
        : 0;

    return {
      initialized: this.initialized,
      uptime,
      commandsProcessed: this.commandsProcessed,
      avgExecutionTime: Math.round(avgExecutionTime),
      moduleStats: moduleRegistry.getStats(),
    };
  }

  /**
   * Create module context for modules
   */
  createModuleContext(config: ModuleConfig): ModuleContext {
    return {
      config,
      logger: {
        info: (message: string, meta?: Record<string, any>) => {
          logger.info(message, meta);
        },
        warn: (message: string, meta?: Record<string, any>) => {
          logger.warn(message, meta);
        },
        error: (message: string, meta?: Record<string, any>) => {
          logger.error(message, meta);
        },
        debug: (message: string, meta?: Record<string, any>) => {
          logger.debug(message, meta);
        },
      },
      executeCommand: async (command: JarvisCommand) => {
        return await this.executeCommand(command);
      },
      emit: (event: JarvisEvent, data: any) => {
        this.emit(event, {
          event,
          timestamp: new Date(),
          data,
        } as JarvisEventPayload);
      },
      on: (event: JarvisEvent, handler: (payload: JarvisEventPayload) => void) => {
        this.on(event, handler);
      },
    };
  }

  /**
   * Check if Jarvis is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance getter
export const getJarvisController = () => JarvisController.getInstance();
export const getJarvisRouter = () => JarvisController.getRouter();
