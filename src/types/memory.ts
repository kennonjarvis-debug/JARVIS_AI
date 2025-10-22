/**
 * Memory system type definitions
 * @module types/memory
 */

import { z } from 'zod';

/**
 * Types of memory entries
 */
export enum MemoryType {
  /** Task execution records */
  TASK_EXECUTION = 'task_execution',
  /** User feedback and corrections */
  USER_FEEDBACK = 'user_feedback',
  /** Decision outcomes and results */
  DECISION_OUTCOME = 'decision_outcome',
  /** System state snapshots */
  SYSTEM_STATE = 'system_state',
  /** Learned patterns and insights */
  LEARNED_PATTERN = 'learned_pattern',
  /** Error occurrences */
  ERROR = 'error',
}

/**
 * Zod schema for MemoryType
 */
export const MemoryTypeSchema = z.nativeEnum(MemoryType);

/**
 * Memory entry stored in the system
 */
export interface MemoryEntry {
  /** Unique memory identifier */
  id: string;
  /** Type of memory */
  type: MemoryType;
  /** Memory content (flexible structure) */
  content: any;
  /** When the memory was created */
  timestamp: Date;
  /** Agent that created this memory (if applicable) */
  agentId?: string;
  /** Task this memory is related to (if applicable) */
  taskId?: string;
  /** Tags for categorization and search */
  tags: string[];
  /** Importance score (0-1) for pruning and prioritization */
  importance: number;
}

/**
 * Zod schema for MemoryEntry
 */
export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  type: MemoryTypeSchema,
  content: z.any(),
  timestamp: z.date(),
  agentId: z.string().optional(),
  taskId: z.string().uuid().optional(),
  tags: z.array(z.string()),
  importance: z.number().min(0).max(1),
});

/**
 * Options for querying memories
 */
export interface QueryOptions {
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by task ID */
  taskId?: string;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Only return memories after this date */
  since?: Date;
  /** Maximum number of results */
  limit?: number;
  /** Minimum importance threshold */
  minImportance?: number;
  /** Sort order */
  sortBy?: 'timestamp' | 'importance';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Zod schema for QueryOptions
 */
export const QueryOptionsSchema = z.object({
  type: MemoryTypeSchema.optional(),
  agentId: z.string().optional(),
  taskId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  since: z.date().optional(),
  limit: z.number().int().positive().optional(),
  minImportance: z.number().min(0).max(1).optional(),
  sortBy: z.enum(['timestamp', 'importance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Task context aggregated from memories
 */
export interface TaskContext {
  /** The task being evaluated */
  task: any; // TODO: Use TaskRequest when circular deps resolved
  /** Related memories for context */
  relatedMemories: MemoryEntry[];
  /** Previous similar tasks */
  previousSimilarTasks: any[]; // TODO: Use TaskResult when circular deps resolved
  /** Learned patterns applicable to this task */
  applicablePatterns?: MemoryEntry[];
}

/**
 * Zod schema for TaskContext
 */
export const TaskContextSchema = z.object({
  task: z.any(),
  relatedMemories: z.array(MemoryEntrySchema),
  previousSimilarTasks: z.array(z.any()),
  applicablePatterns: z.array(MemoryEntrySchema).optional(),
});

/**
 * Memory statistics for analytics
 */
export interface MemoryStats {
  /** Total number of memory entries */
  totalEntries: number;
  /** Count by memory type */
  byType: Record<MemoryType, number>;
  /** Count by agent */
  byAgent: Record<string, number>;
  /** Average importance score */
  averageImportance: number;
  /** Time period for these stats */
  period?: {
    start: Date;
    end: Date;
  };
}

/**
 * Zod schema for MemoryStats
 */
export const MemoryStatsSchema = z.object({
  totalEntries: z.number().nonnegative(),
  byType: z.record(z.string(), z.number().nonnegative()),
  byAgent: z.record(z.string(), z.number().nonnegative()),
  averageImportance: z.number().min(0).max(1),
  period: z
    .object({
      start: z.date(),
      end: z.date(),
    })
    .optional(),
});

/**
 * Memory pruning configuration
 */
export interface MemoryPruningConfig {
  /** Delete memories older than this date */
  olderThan: Date;
  /** Delete memories with importance below this threshold */
  maxImportance: number;
  /** Exclude these memory types from pruning */
  excludeTypes?: MemoryType[];
  /** Dry run (don't actually delete) */
  dryRun?: boolean;
}

/**
 * Zod schema for MemoryPruningConfig
 */
export const MemoryPruningConfigSchema = z.object({
  olderThan: z.date(),
  maxImportance: z.number().min(0).max(1),
  excludeTypes: z.array(MemoryTypeSchema).optional(),
  dryRun: z.boolean().optional(),
});

/**
 * Memory pruning result
 */
export interface MemoryPruningResult {
  /** Number of memories deleted */
  deleted: number;
  /** Memory IDs that were deleted */
  deletedIds: string[];
  /** Disk/storage space freed (bytes) */
  spaceFreed?: number;
  /** Duration of pruning operation (ms) */
  duration: number;
}

/**
 * Zod schema for MemoryPruningResult
 */
export const MemoryPruningResultSchema = z.object({
  deleted: z.number().nonnegative(),
  deletedIds: z.array(z.string().uuid()),
  spaceFreed: z.number().nonnegative().optional(),
  duration: z.number().nonnegative(),
});

/**
 * Importance score presets for different memory types
 */
export const IMPORTANCE_SCORES = {
  [MemoryType.USER_FEEDBACK]: 1.0,
  [MemoryType.ERROR]: 0.9,
  [MemoryType.DECISION_OUTCOME]: 0.8,
  [MemoryType.TASK_EXECUTION]: 0.5,
  [MemoryType.LEARNED_PATTERN]: 0.7,
  [MemoryType.SYSTEM_STATE]: 0.3,
} as const;

/**
 * Type guard to check if a value is a valid MemoryType
 */
export function isMemoryType(value: any): value is MemoryType {
  return Object.values(MemoryType).includes(value);
}

/**
 * Helper to validate memory entry at runtime
 */
export function validateMemoryEntry(data: unknown): MemoryEntry {
  return MemoryEntrySchema.parse(data) as MemoryEntry;
}

/**
 * Helper to validate query options at runtime
 */
export function validateQueryOptions(data: unknown): QueryOptions {
  return QueryOptionsSchema.parse(data);
}

/**
 * Helper to get default importance for a memory type
 */
export function getDefaultImportance(type: MemoryType): number {
  return IMPORTANCE_SCORES[type] ?? 0.5;
}

/**
 * Helper to create a memory entry with defaults
 */
export function createMemoryEntry(
  partial: Omit<MemoryEntry, 'id' | 'timestamp' | 'importance'> & {
    importance?: number;
  }
): Omit<MemoryEntry, 'id'> {
  return {
    type: partial.type,
    content: partial.content,
    agentId: partial.agentId,
    taskId: partial.taskId,
    tags: partial.tags,
    timestamp: new Date(),
    importance: partial.importance ?? getDefaultImportance(partial.type),
  };
}
