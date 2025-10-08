/**
 * Module Registry
 * Singleton registry for managing Jarvis modules
 */

import { JarvisModule, ModuleConfig, JarvisEvent } from './jarvis.interfaces';
import { logger } from '../../backend/utils/logger';
import { EventEmitter } from 'events';

/**
 * Module registration error
 */
export class ModuleRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModuleRegistrationError';
  }
}

/**
 * Module dependency error
 */
export class ModuleDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModuleDependencyError';
  }
}

/**
 * Singleton registry for managing all Jarvis modules
 */
export class ModuleRegistry extends EventEmitter {
  private static instance: ModuleRegistry;
  private modules: Map<string, JarvisModule> = new Map();
  private configs: Map<string, ModuleConfig> = new Map();
  private initialized: Set<string> = new Set();
  private initializationOrder: string[] = [];

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  /**
   * Register a module with configuration
   */
  register(module: JarvisModule, config: ModuleConfig): void {
    if (this.modules.has(module.name)) {
      throw new ModuleRegistrationError(
        `Module "${module.name}" is already registered`
      );
    }

    // Validate module
    this.validateModule(module);

    // Store module and config
    this.modules.set(module.name, module);
    this.configs.set(module.name, config);

    logger.info(`Module registered: ${module.name} v${module.version}`, {
      dependencies: module.dependencies,
      priority: config.priority,
      enabled: config.enabled,
    });

    this.emit('module:registered', { module: module.name, config });
  }

  /**
   * Validate module implementation
   */
  private validateModule(module: JarvisModule): void {
    if (!module.name) {
      throw new ModuleRegistrationError('Module must have a name');
    }

    if (!module.version) {
      throw new ModuleRegistrationError(`Module "${module.name}" must have a version`);
    }

    if (!Array.isArray(module.dependencies)) {
      throw new ModuleRegistrationError(
        `Module "${module.name}" dependencies must be an array`
      );
    }

    if (typeof module.initialize !== 'function') {
      throw new ModuleRegistrationError(
        `Module "${module.name}" must implement initialize()`
      );
    }

    if (typeof module.shutdown !== 'function') {
      throw new ModuleRegistrationError(
        `Module "${module.name}" must implement shutdown()`
      );
    }

    if (typeof module.registerRoutes !== 'function') {
      throw new ModuleRegistrationError(
        `Module "${module.name}" must implement registerRoutes()`
      );
    }

    if (typeof module.handleCommand !== 'function') {
      throw new ModuleRegistrationError(
        `Module "${module.name}" must implement handleCommand()`
      );
    }

    if (typeof module.getHealthStatus !== 'function') {
      throw new ModuleRegistrationError(
        `Module "${module.name}" must implement getHealthStatus()`
      );
    }
  }

  /**
   * Get a module by name
   */
  getModule(name: string): JarvisModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Get module configuration
   */
  getConfig(name: string): ModuleConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * Get all registered modules
   */
  getAllModules(): JarvisModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get all enabled modules sorted by priority
   */
  getEnabledModules(): JarvisModule[] {
    return Array.from(this.modules.entries())
      .filter(([name]) => {
        const config = this.configs.get(name);
        return config?.enabled !== false;
      })
      .sort(([nameA], [nameB]) => {
        const configA = this.configs.get(nameA)!;
        const configB = this.configs.get(nameB)!;
        return configA.priority - configB.priority;
      })
      .map(([, module]) => module);
  }

  /**
   * Check if a module is registered
   */
  hasModule(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Check if a module is initialized
   */
  isInitialized(name: string): boolean {
    return this.initialized.has(name);
  }

  /**
   * Get initialization order
   */
  getInitializationOrder(): string[] {
    return [...this.initializationOrder];
  }

  /**
   * Resolve module dependency order using topological sort
   */
  private resolveDependencyOrder(): string[] {
    const modules = this.getEnabledModules();
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (moduleName: string) => {
      if (visited.has(moduleName)) {
        return;
      }

      if (visiting.has(moduleName)) {
        throw new ModuleDependencyError(
          `Circular dependency detected involving module "${moduleName}"`
        );
      }

      visiting.add(moduleName);

      const module = this.modules.get(moduleName);
      if (!module) {
        throw new ModuleDependencyError(
          `Module "${moduleName}" not found in registry`
        );
      }

      // Visit dependencies first
      for (const dep of module.dependencies) {
        if (!this.modules.has(dep)) {
          throw new ModuleDependencyError(
            `Module "${moduleName}" depends on "${dep}" which is not registered`
          );
        }

        const depConfig = this.configs.get(dep);
        if (depConfig?.enabled === false) {
          throw new ModuleDependencyError(
            `Module "${moduleName}" depends on "${dep}" which is disabled`
          );
        }

        visit(dep);
      }

      visiting.delete(moduleName);
      visited.add(moduleName);
      order.push(moduleName);
    };

    // Visit all enabled modules
    for (const module of modules) {
      visit(module.name);
    }

    return order;
  }

  /**
   * Initialize all registered modules in dependency order
   */
  async initializeAll(): Promise<void> {
    const startTime = Date.now();
    logger.info('Initializing all Jarvis modules...');

    try {
      // Resolve dependency order
      const order = this.resolveDependencyOrder();
      this.initializationOrder = order;

      logger.info('Module initialization order:', { order });

      // Initialize modules in order
      for (const moduleName of order) {
        await this.initializeModule(moduleName);
      }

      const duration = Date.now() - startTime;
      logger.info(`All modules initialized successfully in ${duration}ms`, {
        count: this.initialized.size,
        modules: Array.from(this.initialized),
      });

      this.emit('system:initialized', {
        modulesInitialized: this.initialized.size,
        duration,
      });
    } catch (error) {
      logger.error('Module initialization failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  /**
   * Initialize a single module
   */
  private async initializeModule(name: string): Promise<void> {
    if (this.initialized.has(name)) {
      logger.debug(`Module "${name}" already initialized, skipping`);
      return;
    }

    const module = this.modules.get(name);
    if (!module) {
      throw new ModuleRegistrationError(`Module "${name}" not found`);
    }

    const config = this.configs.get(name);
    if (!config?.enabled) {
      logger.warn(`Module "${name}" is disabled, skipping initialization`);
      return;
    }

    logger.info(`Initializing module: ${name}...`);
    const startTime = Date.now();

    try {
      await module.initialize();
      this.initialized.add(name);

      const duration = Date.now() - startTime;
      logger.info(`Module "${name}" initialized successfully in ${duration}ms`);

      this.emit(JarvisEvent.MODULE_INITIALIZED, {
        module: name,
        duration,
      });
    } catch (error) {
      logger.error(`Failed to initialize module "${name}"`, {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw new ModuleRegistrationError(
        `Failed to initialize module "${name}": ${(error as Error).message}`
      );
    }
  }

  /**
   * Shutdown all modules in reverse order
   */
  async shutdownAll(): Promise<void> {
    logger.info('Shutting down all Jarvis modules...');

    // Shutdown in reverse initialization order
    const order = [...this.initializationOrder].reverse();

    for (const moduleName of order) {
      await this.shutdownModule(moduleName);
    }

    logger.info('All modules shut down successfully');
    this.emit('system:shutdown', {
      modulesShutdown: this.initialized.size,
    });

    this.initialized.clear();
  }

  /**
   * Shutdown a single module
   */
  private async shutdownModule(name: string): Promise<void> {
    if (!this.initialized.has(name)) {
      return;
    }

    const module = this.modules.get(name);
    if (!module) {
      return;
    }

    logger.info(`Shutting down module: ${name}...`);

    try {
      await module.shutdown();
      this.initialized.delete(name);

      logger.info(`Module "${name}" shut down successfully`);

      this.emit(JarvisEvent.MODULE_SHUTDOWN, {
        module: name,
      });
    } catch (error) {
      logger.error(`Failed to shutdown module "${name}"`, {
        error: (error as Error).message,
      });
      // Continue shutting down other modules even if one fails
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalModules: number;
    enabledModules: number;
    initializedModules: number;
    moduleList: Array<{
      name: string;
      version: string;
      enabled: boolean;
      initialized: boolean;
      priority: number;
    }>;
  } {
    const moduleList = Array.from(this.modules.entries()).map(([name, module]) => {
      const config = this.configs.get(name)!;
      return {
        name,
        version: module.version,
        enabled: config.enabled,
        initialized: this.initialized.has(name),
        priority: config.priority,
      };
    });

    return {
      totalModules: this.modules.size,
      enabledModules: this.getEnabledModules().length,
      initializedModules: this.initialized.size,
      moduleList,
    };
  }

  /**
   * Reset registry (primarily for testing)
   */
  reset(): void {
    this.modules.clear();
    this.configs.clear();
    this.initialized.clear();
    this.initializationOrder = [];
    this.removeAllListeners();
    logger.info('Module registry reset');
  }
}

// Export singleton instance
export const moduleRegistry = ModuleRegistry.getInstance();
