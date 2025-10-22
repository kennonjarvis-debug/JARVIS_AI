# ⚠️ DEPRECATED: Autonomous Agent System

**This directory is deprecated and will be removed in v3.0.0**

## Migration Path

This autonomous agent system has been consolidated into the unified agent system at:

```
src/core/agents/
```

## What Changed

The new unified system combines:
- ✅ This autonomous agent system (`src/autonomous/`)
- ✅ Proactive agent system (`src/core/proactive/`)

Into a single, cohesive architecture.

## How to Migrate

### Old Import Pattern
```typescript
import { AutonomousOrchestrator } from '@/autonomous/orchestrator';
import { AdaptiveEngine } from '@/autonomous/adaptive/adaptive-engine';

const orchestrator = AutonomousOrchestrator.getInstance();
const engine = AdaptiveEngine.getInstance();
```

### New Import Pattern
```typescript
import { getOrchestrator, adaptiveEngine } from '@/core/agents';

const orchestrator = getOrchestrator();
// adaptiveEngine is already exported as singleton
```

## Benefits of Migration

1. **Reduced Duplication** - Eliminates duplicate adaptive engines
2. **Unified Learning** - Single adaptive engine learns from all agents
3. **Better Coordination** - Centralized task queue and execution
4. **Proactive Features** - Built-in proactive suggestions
5. **Simpler API** - One orchestrator, one configuration

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
