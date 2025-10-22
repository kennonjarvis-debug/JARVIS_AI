# ⚠️ DEPRECATED: Proactive Agent System

**This directory is deprecated and will be removed in v3.0.0**

## Migration Path

This proactive agent system has been consolidated into the unified agent system at:

```
src/core/agents/
```

## What Changed

The new unified system combines:
- ✅ Autonomous agent system (`src/autonomous/`)
- ✅ This proactive agent system (`src/core/proactive/`)

Into a single, cohesive architecture with both task automation AND proactive intelligence.

## How to Migrate

### Old Import Pattern
```typescript
import { ProactiveAgent } from '@/core/proactive/proactive-agent';
import { AdaptiveEngineV2 } from '@/core/proactive/adaptive-engine-v2';

const agent = ProactiveAgent.getInstance();
const engine = AdaptiveEngineV2.getInstance();
```

### New Import Pattern
```typescript
import { getOrchestrator, adaptiveEngine } from '@/core/agents';

const orchestrator = getOrchestrator({
  proactive: {
    enabled: true,
    maxNotificationsPerHour: 5,
    confidenceThreshold: 0.6
  }
});
```

## Benefits of Migration

1. **Unified Intelligence** - Single adaptive engine for all learning
2. **Task Automation** - Proactive suggestions can trigger tasks
3. **Better Context** - Shares context with all domain agents
4. **Reduced Complexity** - One system instead of two
5. **Consistent API** - Same patterns everywhere

## What's Preserved

All proactive features are preserved in the unified system:
- ✅ Notification rate limiting
- ✅ Do Not Disturb respect
- ✅ Confidence thresholds
- ✅ Timing intelligence
- ✅ User preference learning
- ✅ Anticipation engine

## Timeline

- **Now**: Both systems work (legacy support)
- **v2.5**: Deprecation warnings added
- **v3.0**: This directory removed

## Documentation

See the full migration guide at:
- `src/core/agents/README.md`
- Issue #6: Consolidation plan
- PR #2: Implementation

## Questions?

Contact the team or see Issue #6 on GitHub.
