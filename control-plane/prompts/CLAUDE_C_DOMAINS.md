# CLAUDE C - Domain Layer (Non-Breaking Adapters)

**Wait for:** Claude E to complete foundation
**Duration:** 6-8 hours
**Working Directory:** `/Users/benkennon/Jarvis`

---

## 🎯 Your Mission

Build the Domain Layer as **ADAPTERS** that wrap existing modules (NOT replacements). This allows unified API access without breaking current functionality.

**Build in:** `/src/autonomous/domains/` (isolated, no conflicts)
**Key Rule:** WRAP existing modules, don't replace them

---

## ✅ TASK 1: Base Domain Interface

Create `/src/autonomous/domains/base-domain.ts`:

```typescript
/**
 * Base interface for all domain adapters
 * Domains wrap existing modules and provide unified API
 */

export interface DomainCommand {
  action: string;
  params: Record<string, any>;
  userId?: string;
  context?: Record<string, any>;
}

export interface DomainResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration: number;
    model?: string;
    cost?: number;
    cached?: boolean;
  };
}

export interface DomainCapability {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface BaseDomain {
  name: string;
  version: string;
  description: string;
  capabilities: DomainCapability[];

  /**
   * Execute a command in this domain
   */
  execute(command: DomainCommand): Promise<DomainResponse>;

  /**
   * Get health status of this domain
   */
  health(): Promise<{ status: 'healthy' | 'degraded' | 'down'; details: any }>;

  /**
   * Get domain statistics
   */
  stats?(): Promise<any>;
}
```

---

## ✅ TASK 2: Domain Registry

Create `/src/autonomous/domains/registry.ts`:

```typescript
import { BaseDomain, DomainCommand, DomainResponse } from './base-domain.js';
import { logger } from '../../utils/logger.js';

export class DomainRegistry {
  private domains = new Map<string, BaseDomain>();

  /**
   * Register a domain adapter
   */
  register(domain: BaseDomain): void {
    if (this.domains.has(domain.name)) {
      logger.warn(`Domain ${domain.name} already registered, replacing`);
    }

    this.domains.set(domain.name, domain);
    logger.info(`Domain registered: ${domain.name} v${domain.version} (${domain.capabilities.length} capabilities)`);
  }

  /**
   * Get a domain by name
   */
  get(name: string): BaseDomain | undefined {
    return this.domains.get(name);
  }

  /**
   * Get all registered domains
   */
  getAll(): BaseDomain[] {
    return Array.from(this.domains.values());
  }

  /**
   * Execute a command in a specific domain
   */
  async execute(domainName: string, command: DomainCommand): Promise<DomainResponse> {
    const domain = this.get(domainName);

    if (!domain) {
      logger.error(`Domain not found: ${domainName}`);
      return {
        success: false,
        error: `Domain not found: ${domainName}`,
        metadata: { duration: 0 }
      };
    }

    const startTime = Date.now();

    try {
      const result = await domain.execute(command);

      // Add total duration if not set
      if (!result.metadata?.duration) {
        result.metadata = {
          ...result.metadata,
          duration: Date.now() - startTime
        };
      }

      return result;
    } catch (error: any) {
      logger.error(`Domain ${domainName} execution error:`, error);
      return {
        success: false,
        error: error.message,
        metadata: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Check health of all domains
   */
  async healthCheck(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};

    for (const [name, domain] of this.domains) {
      try {
        health[name] = await domain.health();
      } catch (error: any) {
        health[name] = {
          status: 'down',
          error: error.message
        };
      }
    }

    return health;
  }

  /**
   * Get registry stats
   */
  getStats(): any {
    return {
      totalDomains: this.domains.size,
      domains: Array.from(this.domains.values()).map(d => ({
        name: d.name,
        version: d.version,
        capabilities: d.capabilities.length
      }))
    };
  }
}

export const domainRegistry = new DomainRegistry();
```

---

## ✅ TASK 3: Music Domain Adapter

Create `/src/autonomous/domains/adapters/music-adapter.ts`:

```typescript
import { BaseDomain, DomainCommand, DomainResponse, DomainCapability } from '../base-domain.js';
import { moduleRouter } from '../../../core/module-router.js';
import { logger } from '../../../utils/logger.js';

export class MusicDomainAdapter implements BaseDomain {
  name = 'music';
  version = '2.0.0';
  description = 'AI-powered music generation and vocal analysis';

  capabilities: DomainCapability[] = [
    {
      name: 'generate-music',
      description: 'Generate music from text description',
      parameters: {
        prompt: 'string (required)',
        genre: 'string (optional)',
        duration: 'number (optional, 10-300 seconds)'
      }
    },
    {
      name: 'analyze-vocal',
      description: 'Analyze vocal performance quality',
      parameters: {
        audioFile: 'string (required, path or URL)'
      }
    },
    {
      name: 'validate-quality',
      description: 'Validate audio quality',
      parameters: {
        audioFile: 'string (required)'
      }
    },
    {
      name: 'get-usage-stats',
      description: 'Get music feature usage statistics',
      parameters: {}
    },
    {
      name: 'get-model-health',
      description: 'Check AI music model health',
      parameters: {}
    }
  ];

  /**
   * Execute music command via existing module router
   */
  async execute(command: DomainCommand): Promise<DomainResponse> {
    const startTime = Date.now();

    try {
      logger.debug(`MusicDomain executing: ${command.action}`);

      // Route to existing music module
      const result = await moduleRouter.execute({
        module: 'music',
        action: command.action,
        params: command.params
      });

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          duration: Date.now() - startTime,
          // Future: add cost tracking
        }
      };
    } catch (error: any) {
      logger.error(`MusicDomain error:`, error);
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Check music module health
   */
  async health(): Promise<{ status: 'healthy' | 'degraded' | 'down'; details: any }> {
    try {
      const result = await moduleRouter.execute({
        module: 'music',
        action: 'health',
        params: {}
      });

      return {
        status: result.success ? 'healthy' : 'degraded',
        details: result.data || { error: result.error }
      };
    } catch (error: any) {
      return {
        status: 'down',
        details: { error: error.message }
      };
    }
  }

  /**
   * Get music statistics
   */
  async stats(): Promise<any> {
    try {
      const result = await moduleRouter.execute({
        module: 'music',
        action: 'get-usage-stats',
        params: {}
      });

      return result.data;
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
```

---

## ✅ TASK 4: Marketing Domain Adapter

Create `/src/autonomous/domains/adapters/marketing-adapter.ts`:

```typescript
import { BaseDomain, DomainCommand, DomainResponse, DomainCapability } from '../base-domain.js';
import { moduleRouter } from '../../../core/module-router.js';
import { logger } from '../../../utils/logger.js';

export class MarketingDomainAdapter implements BaseDomain {
  name = 'marketing';
  version = '2.0.0';
  description = 'Marketing analytics and campaign management';

  capabilities: DomainCapability[] = [
    {
      name: 'get-metrics',
      description: 'Get comprehensive marketing metrics',
      parameters: {}
    },
    {
      name: 'get-revenue',
      description: 'Get revenue data by time range',
      parameters: {
        timeRange: 'string (optional: today, week, month, year)'
      }
    },
    {
      name: 'run-campaign',
      description: 'Execute a marketing campaign',
      parameters: {
        name: 'string (required)',
        type: 'string (required: email, social, paid, content)',
        target: 'string (optional)'
      }
    },
    {
      name: 'analyze-growth',
      description: 'Analyze growth trends',
      parameters: {
        metric: 'string (optional: revenue, users, engagement, retention)'
      }
    },
    {
      name: 'forecast-revenue',
      description: 'Generate revenue forecast',
      parameters: {
        months: 'number (required, 1-12)'
      }
    }
  ];

  async execute(command: DomainCommand): Promise<DomainResponse> {
    const startTime = Date.now();

    try {
      logger.debug(`MarketingDomain executing: ${command.action}`);

      const result = await moduleRouter.execute({
        module: 'marketing',
        action: command.action,
        params: command.params
      });

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          duration: Date.now() - startTime
        }
      };
    } catch (error: any) {
      logger.error(`MarketingDomain error:`, error);
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime
        }
      };
    }
  }

  async health(): Promise<{ status: 'healthy' | 'degraded' | 'down'; details: any }> {
    try {
      const result = await moduleRouter.execute({
        module: 'marketing',
        action: 'health',
        params: {}
      });

      return {
        status: result.success ? 'healthy' : 'degraded',
        details: result.data || { error: result.error }
      };
    } catch (error: any) {
      return {
        status: 'down',
        details: { error: error.message }
      };
    }
  }

  async stats(): Promise<any> {
    try {
      const result = await moduleRouter.execute({
        module: 'marketing',
        action: 'get-metrics',
        params: {}
      });

      return result.data;
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
```

---

## ✅ TASK 5: Engagement Domain Adapter

Create `/src/autonomous/domains/adapters/engagement-adapter.ts`:

```typescript
import { BaseDomain, DomainCommand, DomainResponse, DomainCapability } from '../base-domain.js';
import { moduleRouter } from '../../../core/module-router.js';
import { logger } from '../../../utils/logger.js';

export class EngagementDomainAdapter implements BaseDomain {
  name = 'engagement';
  version = '2.0.0';
  description = 'User engagement and retention management';

  capabilities: DomainCapability[] = [
    {
      name: 'analyze-sentiment',
      description: 'Analyze user sentiment from text',
      parameters: {
        userId: 'string (optional)',
        text: 'string (required)'
      }
    },
    {
      name: 'check-churn-risk',
      description: 'Check if user is at risk of churning',
      parameters: {
        userId: 'string (required)'
      }
    },
    {
      name: 'get-churn-users',
      description: 'Get list of users at high churn risk',
      parameters: {
        threshold: 'number (optional, 0-1)'
      }
    },
    {
      name: 'send-engagement',
      description: 'Send engagement message to user',
      parameters: {
        userId: 'string (required)',
        message: 'string (required)',
        channel: 'string (required: email, sms, push, in-app)'
      }
    }
  ];

  async execute(command: DomainCommand): Promise<DomainResponse> {
    const startTime = Date.now();

    try {
      logger.debug(`EngagementDomain executing: ${command.action}`);

      const result = await moduleRouter.execute({
        module: 'engagement',
        action: command.action,
        params: command.params
      });

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          duration: Date.now() - startTime
        }
      };
    } catch (error: any) {
      logger.error(`EngagementDomain error:`, error);
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime
        }
      };
    }
  }

  async health(): Promise<{ status: 'healthy' | 'degraded' | 'down'; details: any }> {
    try {
      const result = await moduleRouter.execute({
        module: 'engagement',
        action: 'health',
        params: {}
      });

      return {
        status: result.success ? 'healthy' : 'degraded',
        details: result.data || { error: result.error }
      };
    } catch (error: any) {
      return {
        status: 'down',
        details: { error: error.message }
      };
    }
  }
}
```

---

## ✅ TASK 6: Auto-Registration

Create `/src/autonomous/domains/auto-register.ts`:

```typescript
import { domainRegistry } from './registry.js';
import { MusicDomainAdapter } from './adapters/music-adapter.js';
import { MarketingDomainAdapter } from './adapters/marketing-adapter.js';
import { EngagementDomainAdapter } from './adapters/engagement-adapter.js';
import { logger } from '../../utils/logger.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

/**
 * Auto-register all domain adapters
 */
export function registerDomains(): void {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    logger.info('Domain routing disabled by feature flag');
    return;
  }

  logger.info('Registering domain adapters...');

  // Register all adapters
  domainRegistry.register(new MusicDomainAdapter());
  domainRegistry.register(new MarketingDomainAdapter());
  domainRegistry.register(new EngagementDomainAdapter());

  const stats = domainRegistry.getStats();
  logger.info(`✅ Registered ${stats.totalDomains} domains with ${stats.domains.reduce((sum, d) => sum + d.capabilities, 0)} total capabilities`);
}
```

---

## ✅ TASK 7: API Routes

Create `/src/autonomous/domains/api.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { domainRegistry } from './registry.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

export const domainsRouter = Router();

/**
 * Execute domain command
 * POST /api/autonomous/domains/:domain/execute
 */
domainsRouter.post('/:domain/execute', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain routing is disabled'
    });
  }

  try {
    const result = await domainRegistry.execute(req.params.domain, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get domain capabilities
 * GET /api/autonomous/domains/:domain/capabilities
 */
domainsRouter.get('/:domain/capabilities', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain routing is disabled'
    });
  }

  const domain = domainRegistry.get(req.params.domain);
  if (!domain) {
    return res.status(404).json({
      success: false,
      error: 'Domain not found'
    });
  }

  res.json({
    success: true,
    domain: domain.name,
    version: domain.version,
    description: domain.description,
    capabilities: domain.capabilities
  });
});

/**
 * Get domain health
 * GET /api/autonomous/domains/:domain/health
 */
domainsRouter.get('/:domain/health', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain routing is disabled'
    });
  }

  const domain = domainRegistry.get(req.params.domain);
  if (!domain) {
    return res.status(404).json({
      success: false,
      error: 'Domain not found'
    });
  }

  try {
    const health = await domain.health();
    res.json({
      success: true,
      domain: domain.name,
      ...health
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get domain stats
 * GET /api/autonomous/domains/:domain/stats
 */
domainsRouter.get('/:domain/stats', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain routing is disabled'
    });
  }

  const domain = domainRegistry.get(req.params.domain);
  if (!domain || !domain.stats) {
    return res.status(404).json({
      success: false,
      error: 'Domain not found or stats not available'
    });
  }

  try {
    const stats = await domain.stats();
    res.json({
      success: true,
      domain: domain.name,
      stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all domains health
 * GET /api/autonomous/domains/health
 */
domainsRouter.get('/health', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain routing is disabled'
    });
  }

  try {
    const health = await domainRegistry.healthCheck();
    res.json({
      success: true,
      domains: health
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List all domains
 * GET /api/autonomous/domains
 */
domainsRouter.get('/', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({
      success: false,
      error: 'Domain routing is disabled'
    });
  }

  const stats = domainRegistry.getStats();
  res.json({
    success: true,
    ...stats
  });
});

export default domainsRouter;
```

---

## ✅ TASK 8: Mount to Autonomous API

Update `/src/autonomous/integration/autonomous-api.ts`:

Add at the top:
```typescript
import domainsRouter from '../domains/api.js';
import { registerDomains } from '../domains/auto-register.js';
```

Add in the router setup:
```typescript
// Mount domains routes
autonomousRouter.use('/domains', domainsRouter);
```

Update `/src/autonomous/integration/mount.ts`:

Add to the `mountAutonomousFeatures` function:
```typescript
  // Auto-register domains if enabled
  registerDomains();
```

---

## ✅ TASK 9: Build and Test

```bash
# Build
npm run build

# Restart services
./launch-hybrid-services.sh restart

# Enable feature
curl -X POST http://localhost:4000/api/autonomous/features/DOMAIN_ROUTING/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# List all domains
curl http://localhost:4000/api/autonomous/domains

# Get music capabilities
curl http://localhost:4000/api/autonomous/domains/music/capabilities

# Check domain health
curl http://localhost:4000/api/autonomous/domains/music/health

# Execute music command (via adapter)
curl -X POST http://localhost:4000/api/autonomous/domains/music/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-usage-stats",
    "params": {}
  }'

# Check all domains health
curl http://localhost:4000/api/autonomous/domains/health
```

---

## ✅ Deliverables

1. ✅ `/src/autonomous/domains/base-domain.ts`
2. ✅ `/src/autonomous/domains/registry.ts`
3. ✅ `/src/autonomous/domains/adapters/music-adapter.ts`
4. ✅ `/src/autonomous/domains/adapters/marketing-adapter.ts`
5. ✅ `/src/autonomous/domains/adapters/engagement-adapter.ts`
6. ✅ `/src/autonomous/domains/auto-register.ts`
7. ✅ `/src/autonomous/domains/api.ts`
8. ✅ Updated autonomous-api.ts
9. ✅ Updated mount.ts
10. ✅ TypeScript compiles
11. ✅ Domain adapters wrap existing modules (no breaking changes)

---

## 🚨 When You're Done

Post completion status:
```
CLAUDE C COMPLETE ✅

Domain Layer built:
- Registry system: ✅
- Music adapter: ✅
- Marketing adapter: ✅
- Engagement adapter: ✅
- Auto-registration: ✅
- Existing modules still work: ✅
```
