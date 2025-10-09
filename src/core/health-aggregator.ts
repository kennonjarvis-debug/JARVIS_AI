/**
 * Health Aggregator
 * Checks health of all services and returns aggregated status
 */

import axios from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { HealthStatus, ServiceHealth } from './types.js';

export class HealthAggregator {
  private readonly timeout = 5000; // 5 second timeout for health checks

  /**
   * Check health of all services
   */
  async checkAll(): Promise<HealthStatus> {
    logger.info('Running health checks on all services');

    const [
      aiDawgBackend,
      aiDawgDocker,
      vocalCoach,
      producer,
      aiBrain,
      postgres,
      redis
    ] = await Promise.all([
      this.checkAIDawgBackend(),
      this.checkAIDawgDocker(),
      this.checkVocalCoach(),
      this.checkProducer(),
      this.checkAIBrain(),
      this.checkPostgres(),
      this.checkRedis()
    ]);

    const services = {
      aiDawgBackend,
      aiDawgDocker,
      vocalCoach,
      producer,
      aiBrain,
      postgres,
      redis
    };

    // Determine overall health
    const statuses = Object.values(services).map(s => s.status);
    const overall = statuses.every(s => s === 'healthy') ? 'healthy' :
                    statuses.some(s => s === 'healthy') ? 'degraded' : 'down';

    return {
      overall,
      services,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check AI Dawg Backend (port 3001)
   */
  private async checkAIDawgBackend(): Promise<ServiceHealth> {
    return this.checkEndpoint(
      `${config.aiDawgBackendUrl}/api/v1/jarvis/desktop/health`,
      'AI Dawg Backend'
    );
  }

  /**
   * Check AI Dawg Docker Backend (port 3000)
   */
  private async checkAIDawgDocker(): Promise<ServiceHealth> {
    return this.checkEndpoint(
      `${config.aiDawgDockerUrl}/health`,
      'AI Dawg Docker'
    );
  }

  /**
   * Check Vocal Coach (port 8000)
   */
  private async checkVocalCoach(): Promise<ServiceHealth> {
    return this.checkEndpoint(
      `${config.vocalCoachUrl}/health`,
      'Vocal Coach'
    );
  }

  /**
   * Check Producer (port 8001)
   */
  private async checkProducer(): Promise<ServiceHealth> {
    return this.checkEndpoint(
      `${config.producerUrl}/health`,
      'Producer'
    );
  }

  /**
   * Check AI Brain (port 8002)
   */
  private async checkAIBrain(): Promise<ServiceHealth> {
    return this.checkEndpoint(
      `${config.aiBrainUrl}/health`,
      'AI Brain'
    );
  }

  /**
   * Check Postgres
   * Note: This is a simplified check. In production, we'd use a proper DB connection.
   */
  private async checkPostgres(): Promise<ServiceHealth> {
    // For now, assume healthy if AI Dawg backend is responding
    // (since it depends on Postgres)
    try {
      await axios.get(`${config.aiDawgBackendUrl}/api/v1/jarvis/desktop/health`, {
        timeout: this.timeout
      });
      return {
        status: 'healthy',
        message: 'Connected via AI Dawg'
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Cannot verify (AI Dawg backend down)'
      };
    }
  }

  /**
   * Check Redis
   * Note: This is a simplified check. In production, we'd use a proper Redis connection.
   */
  private async checkRedis(): Promise<ServiceHealth> {
    // For now, assume healthy if AI Dawg backend is responding
    // (since it depends on Redis)
    try {
      await axios.get(`${config.aiDawgBackendUrl}/api/v1/jarvis/desktop/health`, {
        timeout: this.timeout
      });
      return {
        status: 'healthy',
        message: 'Connected via AI Dawg'
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Cannot verify (AI Dawg backend down)'
      };
    }
  }

  /**
   * Generic endpoint checker
   */
  private async checkEndpoint(url: string, name: string): Promise<ServiceHealth> {
    const start = Date.now();

    try {
      await axios.get(url, {
        timeout: this.timeout,
        validateStatus: (status) => status < 500 // Accept any status < 500
      });

      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency
      };

    } catch (error: any) {
      logger.warn(`Health check failed for ${name}: ${error.message}`);

      return {
        status: 'down',
        message: error.message || 'Service unavailable'
      };
    }
  }
}

// Singleton instance
export const healthAggregator = new HealthAggregator();

export default HealthAggregator;
