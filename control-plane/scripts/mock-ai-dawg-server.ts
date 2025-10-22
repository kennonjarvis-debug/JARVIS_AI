#!/usr/bin/env tsx
/**
 * Mock AI DAWG Backend Server
 * Provides LIVE simulated data for dashboard E2E testing
 * Port: 3001
 */

import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Track startup time for uptime calculation
const startTime = Date.now();

// Simulate live data that changes over time
function getLiveMetrics() {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const minute = Math.floor(Date.now() / 60000);

  return {
    uptime,
    timestamp: new Date().toISOString(),
    requestCount: minute * 15 + Math.floor(Math.random() * 10), // Increases over time
    activeUsers: Math.floor(Math.random() * 5) + 1, // 1-5 users
  };
}

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  const metrics = getLiveMetrics();
  res.json({
    status: 'healthy',
    service: 'ai-dawg-backend-mock',
    version: '0.1.0',
    uptime: metrics.uptime,
    timestamp: metrics.timestamp
  });
});

// Modules list endpoint
app.get('/api/v1/modules', (req: Request, res: Response) => {
  const metrics = getLiveMetrics();

  res.json({
    success: true,
    data: {
      modules: [
        {
          name: 'music',
          version: '1.0.0',
          status: 'healthy',
          uptime: metrics.uptime,
          description: 'AI Music Generation Module'
        },
        {
          name: 'marketing',
          version: '1.0.0',
          status: 'healthy',
          uptime: metrics.uptime,
          description: 'Marketing Automation Module'
        },
        {
          name: 'engagement',
          version: '1.0.0',
          status: metrics.uptime % 7 === 0 ? 'degraded' : 'healthy', // Periodically degraded
          uptime: metrics.uptime,
          description: 'User Engagement Module'
        },
        {
          name: 'automation',
          version: '1.0.0',
          status: 'healthy',
          uptime: metrics.uptime,
          description: 'Test Automation Module'
        },
        {
          name: 'testing',
          version: '1.0.0',
          status: 'healthy',
          uptime: metrics.uptime,
          description: 'Testing & QA Module'
        }
      ]
    },
    timestamp: metrics.timestamp
  });
});

// Individual module status endpoint
app.get('/api/v1/modules/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const metrics = getLiveMetrics();

  const moduleData: Record<string, any> = {
    music: {
      name: 'music',
      status: 'healthy',
      uptime: metrics.uptime,
      version: '1.0.0',
      metrics: {
        generations_today: metrics.requestCount % 100,
        success_rate: 0.92 + (Math.random() * 0.05),
        avg_generation_time: 2.3 + (Math.random() * 0.5)
      }
    },
    marketing: {
      name: 'marketing',
      status: 'healthy',
      uptime: metrics.uptime,
      version: '1.0.0',
      metrics: {
        campaigns_active: Math.floor(metrics.requestCount / 20),
        conversion_rate: 0.03 + (Math.random() * 0.02),
        revenue_today: metrics.activeUsers * 12.50
      }
    },
    engagement: {
      name: 'engagement',
      status: metrics.uptime % 7 === 0 ? 'degraded' : 'healthy',
      uptime: metrics.uptime,
      version: '1.0.0',
      metrics: {
        active_users: metrics.activeUsers,
        retention_rate: 0.68 + (Math.random() * 0.1),
        satisfaction_score: 4.2 + (Math.random() * 0.5)
      }
    },
    automation: {
      name: 'automation',
      status: 'healthy',
      uptime: metrics.uptime,
      version: '1.0.0',
      metrics: {
        workflows_executed: metrics.requestCount % 50,
        success_rate: 0.95 + (Math.random() * 0.04),
        test_coverage: 0.85
      }
    },
    testing: {
      name: 'testing',
      status: 'healthy',
      uptime: metrics.uptime,
      version: '1.0.0',
      metrics: {
        tests_run: metrics.requestCount * 2,
        pass_rate: 0.94 + (Math.random() * 0.05),
        avg_duration: 1.2 + (Math.random() * 0.3)
      }
    }
  };

  if (moduleData[name]) {
    res.json({
      success: true,
      data: moduleData[name],
      timestamp: metrics.timestamp
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Module not found',
      message: `Module '${name}' does not exist`
    });
  }
});

// Module metrics endpoint
app.get('/api/v1/modules/:name/metrics', (req: Request, res: Response) => {
  const { name } = req.params;
  const metrics = getLiveMetrics();

  res.json({
    success: true,
    data: {
      module: name,
      uptime: metrics.uptime,
      requests: metrics.requestCount,
      errors: Math.floor(metrics.requestCount * 0.02),
      latency_p50: 120 + Math.random() * 50,
      latency_p95: 300 + Math.random() * 100,
      latency_p99: 500 + Math.random() * 200,
      timestamp: metrics.timestamp
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock AI DAWG Backend started on port ${PORT}`);
  console.log(`📊 Providing LIVE simulated data for dashboard E2E testing`);
  console.log(`✅ Health: http://localhost:${PORT}/health`);
  console.log(`📦 Modules: http://localhost:${PORT}/api/v1/modules`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
