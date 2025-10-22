import { Request, Response, Router } from 'express';
import { defaultLogger } from '../../services/logger.service.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      responseTime?: number;
      message?: string;
      details?: any;
    };
  };
  system: {
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    cpu: {
      cores: number;
      loadAverage: number[];
      usagePercent: number;
    };
    disk?: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
  };
}

export class HealthCheckService {
  private router: Router;
  private checks: Map<string, () => Promise<any>> = new Map();

  constructor() {
    this.router = Router();
    this.setupRoutes();
    this.registerDefaultChecks();
  }

  /**
   * Setup health check routes
   */
  private setupRoutes() {
    // Liveness probe - basic check that server is running
    this.router.get('/live', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    });

    // Readiness probe - check if server is ready to accept traffic
    this.router.get('/ready', async (req: Request, res: Response) => {
      try {
        const result = await this.performHealthCheck();
        const statusCode = result.status === 'healthy' ? 200 :
                          result.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error) {
        defaultLogger.error('Readiness check failed', error);
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Full health check
    this.router.get('/', async (req: Request, res: Response) => {
      try {
        const result = await this.performHealthCheck();
        const statusCode = result.status === 'healthy' ? 200 :
                          result.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error) {
        defaultLogger.error('Health check failed', error);
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks() {
    // Database check
    this.registerCheck('database', async () => {
      try {
        // Check if Prisma client is available
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const responseTime = Date.now() - start;

        await prisma.$disconnect();

        return {
          status: responseTime < 100 ? 'pass' : 'warn',
          responseTime,
          message: responseTime < 100 ? 'Database is healthy' : 'Database is slow',
        };
      } catch (error) {
        return {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Database check failed',
        };
      }
    });

    // Redis check
    this.registerCheck('redis', async () => {
      try {
        const Redis = (await import('ioredis')).default;
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          lazyConnect: true,
        });

        const start = Date.now();
        await redis.connect();
        await redis.ping();
        const responseTime = Date.now() - start;

        await redis.quit();

        return {
          status: responseTime < 50 ? 'pass' : 'warn',
          responseTime,
          message: responseTime < 50 ? 'Redis is healthy' : 'Redis is slow',
        };
      } catch (error) {
        return {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Redis check failed',
        };
      }
    });

    // Disk space check
    this.registerCheck('disk', async () => {
      try {
        const diskInfo = await this.getDiskInfo();
        const usagePercent = diskInfo.usagePercent;

        return {
          status: usagePercent < 80 ? 'pass' : usagePercent < 90 ? 'warn' : 'fail',
          message: `Disk usage: ${usagePercent.toFixed(2)}%`,
          details: diskInfo,
        };
      } catch (error) {
        return {
          status: 'warn',
          message: 'Could not check disk space',
        };
      }
    });

    // Memory check
    this.registerCheck('memory', async () => {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usagePercent = ((totalMem - freeMem) / totalMem) * 100;

      return {
        status: usagePercent < 85 ? 'pass' : usagePercent < 95 ? 'warn' : 'fail',
        message: `Memory usage: ${usagePercent.toFixed(2)}%`,
        details: {
          total: totalMem,
          free: freeMem,
          used: totalMem - freeMem,
          usagePercent,
        },
      };
    });
  }

  /**
   * Register a custom health check
   */
  registerCheck(name: string, checkFn: () => Promise<any>) {
    this.checks.set(name, checkFn);
    defaultLogger.info(`Registered health check: ${name}`);
  }

  /**
   * Perform all health checks
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};
    let hasFailures = false;
    let hasWarnings = false;

    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        const result = await Promise.race([
          checkFn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Check timeout')), 5000)
          ),
        ]);

        checks[name] = result;

        if (result.status === 'fail') {
          hasFailures = true;
        } else if (result.status === 'warn') {
          hasWarnings = true;
        }
      } catch (error) {
        checks[name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Check failed',
        };
        hasFailures = true;
      }
    });

    await Promise.allSettled(checkPromises);

    // Get system metrics
    const system = await this.getSystemMetrics();

    return {
      status: hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      system,
    };
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const cpuUsagePercent = (loadAvg[0] / cpuCount) * 100;

    let disk;
    try {
      disk = await this.getDiskInfo();
    } catch (error) {
      // Disk info not available
    }

    return {
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: memUsagePercent,
      },
      cpu: {
        cores: cpuCount,
        loadAverage: loadAvg,
        usagePercent: cpuUsagePercent,
      },
      disk,
    };
  }

  /**
   * Get disk information
   */
  private async getDiskInfo(): Promise<any> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync('df -k /');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          const total = parseInt(parts[1]) * 1024; // Convert KB to bytes
          const used = parseInt(parts[2]) * 1024;
          const free = parseInt(parts[3]) * 1024;
          const usagePercent = (used / total) * 100;

          return {
            total,
            free,
            used,
            usagePercent,
          };
        }
      } else if (process.platform === 'linux') {
        const { stdout } = await execAsync('df -B1 /');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          const total = parseInt(parts[1]);
          const used = parseInt(parts[2]);
          const free = parseInt(parts[3]);
          const usagePercent = (used / total) * 100;

          return {
            total,
            free,
            used,
            usagePercent,
          };
        }
      }
    } catch (error) {
      defaultLogger.debug('Could not get disk info', error);
    }

    return undefined;
  }

  /**
   * Get router
   */
  getRouter(): Router {
    return this.router;
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();

export default healthCheckService;
