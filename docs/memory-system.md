# Jarvis Memory System

## Overview

The Memory System is the contextual memory and learning component of Jarvis. It stores and retrieves information about past task executions, decisions, user feedback, and learned patterns to improve autonomous decision-making over time.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MemorySystem                           │
│                                                          │
│  - Store memories                                        │
│  - Query with filters                                    │
│  - Aggregate context                                     │
│  - Update importance                                     │
│  - Prune old data                                        │
│  - Generate statistics                                   │
└─────────────────┬───────────────────────────────────────┘
                  │
         ┌────────▼────────┐
         │   Supabase DB   │
         │  (PostgreSQL)   │
         └─────────────────┘
```

## Memory Types

The system supports six types of memories:

### 1. TASK_EXECUTION
Records of task executions including results, duration, and outcomes.

**Importance Score:** 0.5 (default)

**Example:**
```typescript
{
  type: MemoryType.TASK_EXECUTION,
  content: {
    taskType: 'marketing.social.post',
    result: 'success',
    engagement: { likes: 45, shares: 12 },
    duration: 2340
  },
  taskId: 'task-123',
  agentId: 'marketing-agent',
  tags: ['social', 'twitter', 'success'],
  importance: 0.7
}
```

### 2. USER_FEEDBACK
Direct feedback from users about agent actions or decisions.

**Importance Score:** 1.0 (highest priority)

**Example:**
```typescript
{
  type: MemoryType.USER_FEEDBACK,
  content: {
    feedback: 'The email subject line was too aggressive',
    action: 'modify approach for future campaigns',
    sentiment: 'negative'
  },
  tags: ['email', 'feedback', 'subject-line'],
  importance: 1.0
}
```

### 3. DECISION_OUTCOME
Records of decision engine evaluations and their outcomes.

**Importance Score:** 0.8

**Example:**
```typescript
{
  type: MemoryType.DECISION_OUTCOME,
  content: {
    decision: 'request_approval',
    confidence: 0.65,
    riskLevel: 'high',
    humanFeedback: 'approved',
    reasoning: 'Large audience size required approval'
  },
  taskId: 'task-456',
  tags: ['decision', 'approved', 'high-risk'],
  importance: 0.8
}
```

### 4. SYSTEM_STATE
Snapshots of system state for debugging and monitoring.

**Importance Score:** 0.3

**Example:**
```typescript
{
  type: MemoryType.SYSTEM_STATE,
  content: {
    activeAgents: 4,
    pendingTasks: 12,
    errorRate: 0.02,
    apiHealth: 'healthy'
  },
  tags: ['monitoring', 'health'],
  importance: 0.3
}
```

### 5. LEARNED_PATTERN
Patterns and insights learned from historical data.

**Importance Score:** 0.7

**Example:**
```typescript
{
  type: MemoryType.LEARNED_PATTERN,
  content: {
    pattern: 'Emails sent on Tuesday mornings have 35% higher open rates',
    confidence: 0.89,
    sampleSize: 234,
    dateRange: { start: '2025-01-01', end: '2025-10-15' }
  },
  tags: ['email', 'timing', 'optimization'],
  importance: 0.85
}
```

### 6. ERROR
Error occurrences for debugging and pattern detection.

**Importance Score:** 0.9

**Example:**
```typescript
{
  type: MemoryType.ERROR,
  content: {
    errorCode: 'INTEGRATION_ERROR',
    message: 'Buffer API rate limit exceeded',
    recoverable: true,
    retryCount: 3
  },
  agentId: 'marketing-agent',
  tags: ['error', 'rate-limit', 'buffer'],
  importance: 0.9
}
```

## Core Methods

### store()

Store a new memory entry.

```typescript
async store(entry: Omit<MemoryEntry, 'id'>): Promise<string>
```

**Parameters:**
- `entry`: Memory entry without ID

**Returns:** Memory ID

**Example:**
```typescript
const memoryId = await memory.store({
  type: MemoryType.TASK_EXECUTION,
  content: { result: 'success', duration: 1234 },
  timestamp: new Date(),
  agentId: 'marketing-agent',
  taskId: 'task-123',
  tags: ['social', 'success'],
  importance: 0.7
});
```

### query()

Query memories with flexible filters.

```typescript
async query(options: QueryOptions): Promise<MemoryEntry[]>
```

**Query Options:**
- `type`: Filter by memory type
- `agentId`: Filter by agent
- `tags`: Filter by tags (any match)
- `since`: Only memories after this date
- `limit`: Maximum results
- `minImportance`: Minimum importance threshold
- `sortBy`: Sort by 'timestamp' or 'importance'
- `sortOrder`: 'asc' or 'desc'

**Example:**
```typescript
const memories = await memory.query({
  type: MemoryType.TASK_EXECUTION,
  tags: ['social'],
  minImportance: 0.5,
  limit: 10,
  sortBy: 'importance',
  sortOrder: 'desc'
});
```

### getTaskContext()

Get full context for a task including related memories and similar past tasks.

```typescript
async getTaskContext(taskId: string): Promise<TaskContext>
```

**Returns:**
- `task`: The task object
- `relatedMemories`: Memories tagged with this task
- `previousSimilarTasks`: Past tasks of the same type
- `applicablePatterns`: Relevant learned patterns

**Example:**
```typescript
const context = await memory.getTaskContext('task-123');

console.log(`Found ${context.relatedMemories.length} related memories`);
console.log(`Found ${context.previousSimilarTasks.length} similar tasks`);
console.log(`Found ${context.applicablePatterns.length} applicable patterns`);
```

### updateImportance()

Update importance score of a memory (for learning).

```typescript
async updateImportance(memoryId: string, importance: number): Promise<void>
```

**Parameters:**
- `memoryId`: Memory ID
- `importance`: New importance score (0-1)

**Example:**
```typescript
// Increase importance after user validated the pattern
await memory.updateImportance('mem-123', 0.95);
```

### prune()

Remove old, low-importance memories to manage storage.

```typescript
async prune(olderThan: Date, maxImportance: number): Promise<number>
```

**Parameters:**
- `olderThan`: Delete memories older than this date
- `maxImportance`: Delete memories with importance ≤ this value

**Returns:** Number of deleted memories

**Example:**
```typescript
// Delete memories older than 30 days with importance ≤ 0.3
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const deleted = await memory.prune(thirtyDaysAgo, 0.3);

console.log(`Deleted ${deleted} old memories`);
```

### getStats()

Get aggregate statistics about stored memories.

```typescript
async getStats(since?: Date): Promise<MemoryStats>
```

**Returns:**
- `totalEntries`: Total memory count
- `byType`: Count by memory type
- `byAgent`: Count by agent
- `averageImportance`: Average importance score
- `period`: Time period for stats

**Example:**
```typescript
const stats = await memory.getStats();

console.log(`Total memories: ${stats.totalEntries}`);
console.log(`Average importance: ${stats.averageImportance}`);
console.log(`By type:`, stats.byType);
console.log(`By agent:`, stats.byAgent);
```

## Usage Patterns

### Pattern 1: Task Execution Recording

```typescript
// Agent completes a task
const result = await agent.execute(task);

// Store the execution memory
await memory.store({
  type: MemoryType.TASK_EXECUTION,
  content: {
    taskType: task.type,
    result: result.status,
    metrics: result.metrics,
    duration: result.duration
  },
  timestamp: new Date(),
  agentId: agent.id,
  taskId: task.id,
  tags: [task.type, result.status],
  importance: result.status === 'success' ? 0.6 : 0.8
});
```

### Pattern 2: Decision Context Aggregation

```typescript
// Before making a decision, gather context
const context = await memory.getTaskContext(task.id);

// Use context for decision
const decision = await decisionEngine.evaluate({
  taskType: task.type,
  taskData: task.data,
  historicalData: context.previousSimilarTasks,
  learnedPatterns: context.applicablePatterns
});
```

### Pattern 3: Learning from Feedback

```typescript
// User provides feedback on agent action
const feedback = {
  taskId: 'task-123',
  feedback: 'Email tone was perfect',
  sentiment: 'positive'
};

// Store feedback with high importance
await memory.store({
  type: MemoryType.USER_FEEDBACK,
  content: feedback,
  timestamp: new Date(),
  taskId: feedback.taskId,
  tags: ['email', 'feedback', 'positive'],
  importance: 1.0
});

// Extract pattern from feedback
const pattern = analyzePattern(feedback);
if (pattern) {
  await memory.store({
    type: MemoryType.LEARNED_PATTERN,
    content: pattern,
    timestamp: new Date(),
    tags: ['learned', 'email', 'tone'],
    importance: 0.75
  });
}
```

### Pattern 4: Regular Pruning

```typescript
// Run daily cleanup job
async function dailyMemoryCleanup() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Delete old, unimportant memories
  const deleted = await memory.prune(thirtyDaysAgo, 0.3);

  logger.info('Memory cleanup completed', { deleted });
}

// Schedule daily at 2 AM
schedule.scheduleJob('0 2 * * *', dailyMemoryCleanup);
```

## Importance Scoring Guidelines

### Default Scores by Type

| Memory Type | Default Score | Rationale |
|------------|---------------|-----------|
| USER_FEEDBACK | 1.0 | Highest - direct user input |
| ERROR | 0.9 | High - critical for debugging |
| DECISION_OUTCOME | 0.8 | High - informs future decisions |
| LEARNED_PATTERN | 0.7 | Moderate-high - actionable insights |
| TASK_EXECUTION | 0.5 | Moderate - routine operations |
| SYSTEM_STATE | 0.3 | Low - primarily for debugging |

### Adjusting Importance

Importance can be dynamically adjusted based on:

1. **User validation:** Increase importance when user confirms pattern
2. **Frequency of reference:** Increase if memory is accessed often
3. **Age:** Decrease over time for time-sensitive patterns
4. **Outcome success:** Increase for successful outcomes
5. **Error resolution:** Increase if error led to important fix

## Performance Considerations

### Indexing

The following database columns are indexed for fast queries:
- `type`
- `agent_id`
- `task_id`
- `created_at`
- `importance`
- `tags` (GIN index for array containment)

### Query Optimization

1. **Use specific filters:** More filters = faster queries
2. **Limit results:** Always specify a limit for large datasets
3. **Index-friendly sorts:** Sort by `timestamp` or `importance`
4. **Tag queries:** Use tag containment efficiently

### Memory Management

1. **Regular pruning:** Run daily cleanup jobs
2. **Importance thresholds:** Only store memories above 0.3 importance
3. **Tag discipline:** Use consistent, lowercase tags
4. **Content size:** Keep content objects reasonably sized (<10KB)

## Error Handling

All methods throw `JarvisError` with appropriate error codes:

- `DATABASE_ERROR`: Database operation failed
- `VALIDATION_ERROR`: Invalid parameters
- `NOT_FOUND`: Task or memory not found

**Example:**
```typescript
try {
  await memory.store(entry);
} catch (error) {
  if (error instanceof JarvisError) {
    if (error.code === ErrorCode.DATABASE_ERROR) {
      // Handle database error
      logger.error('Database error storing memory', error);
    }
  }
}
```

## Integration with Other Components

### With Decision Engine

```typescript
// Decision engine uses memory for context
const context = await memory.getTaskContext(task.id);
const decision = await decisionEngine.evaluate({
  ...context,
  taskType: task.type,
  taskData: task.data
});

// Store decision outcome
await memory.store({
  type: MemoryType.DECISION_OUTCOME,
  content: decision,
  taskId: task.id,
  tags: ['decision', decision.action],
  importance: 0.8
});
```

### With Agents

```typescript
// Agent retrieves relevant patterns before execution
const patterns = await memory.query({
  type: MemoryType.LEARNED_PATTERN,
  tags: [task.type],
  minImportance: 0.7,
  limit: 5
});

// Apply patterns to improve execution
const result = await agent.execute(task, patterns);

// Record execution
await memory.store({
  type: MemoryType.TASK_EXECUTION,
  content: result,
  agentId: agent.id,
  taskId: task.id,
  importance: 0.6
});
```

## Best Practices

1. **Tag Consistently:** Use lowercase, hyphen-separated tags
2. **Set Appropriate Importance:** Use default scores as baseline
3. **Prune Regularly:** Run daily cleanup to manage storage
4. **Query Efficiently:** Use specific filters and limits
5. **Store Actionable Content:** Only store information useful for decisions
6. **Update Importance:** Adjust scores when patterns are validated
7. **Monitor Stats:** Track memory usage and patterns
8. **Handle Errors:** Always catch and log errors appropriately

## Future Enhancements

- **Vector embeddings:** Semantic search for similar memories
- **Automatic pattern extraction:** ML-based pattern detection
- **Importance decay:** Automatic importance reduction over time
- **Memory consolidation:** Merge similar memories automatically
- **Query caching:** Cache frequent queries for performance
- **Export/Import:** Backup and restore memory snapshots
