/**
 * Jarvis Core - Main Export
 * Exports all core Jarvis infrastructure
 */

// Interfaces and Types
export * from './jarvis.interfaces';

// Core Components
export { moduleRegistry, ModuleRegistry } from './module-registry';
export { BaseModule } from './base-module';
export { JarvisController, getJarvisController, getJarvisRouter } from './jarvis.controller';
export { jarvisScheduler, JarvisScheduler } from './jarvis.scheduler';
export { jarvisMonitor, JarvisMonitor, AlertSeverity } from './jarvis.monitor';

// Re-export commonly used types
export type {
  JarvisModule,
  JarvisCommand,
  JarvisCommandResult,
  ModuleHealth,
  ModuleConfig,
  ScheduledJob,
  SystemHealth,
  ModuleContext,
  ModuleLogger,
  JarvisEventPayload,
} from './jarvis.interfaces';

export { JarvisEvent } from './jarvis.interfaces';
