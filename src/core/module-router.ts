/**
 * Module Router
 * Routes commands to AI Dawg backend with retry logic and error handling
 */

import axios, { AxiosError } from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { ModuleCommand, ModuleResponse } from './types.js';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

export class ModuleRouter {
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };

  /**
   * Execute a module command with retry logic
   */
  async execute(command: ModuleCommand): Promise<ModuleResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        logger.info(`Executing ${command.module}.${command.action} (attempt ${attempt}/${this.retryConfig.maxAttempts})`);

        const result = await this.sendToAIDawg(command);

        logger.info(`Successfully executed ${command.module}.${command.action}`);
        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        lastError = error as Error;
        logger.warn(`Attempt ${attempt} failed for ${command.module}.${command.action}: ${lastError.message}`);

        if (attempt < this.retryConfig.maxAttempts) {
          const delay = this.calculateBackoff(attempt);
          logger.info(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    logger.error(`All ${this.retryConfig.maxAttempts} attempts failed for ${command.module}.${command.action}`);
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send command to AI Dawg backend
   */
  private async sendToAIDawg(command: ModuleCommand): Promise<any> {
    const url = `${config.aiDawgBackendUrl}/api/v1/jarvis/execute`;

    try {
      const response = await axios.post(url, command, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Jarvis-Control-Plane/2.0'
        },
        timeout: 30000 // 30 second timeout
      });

      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          // Server responded with error status
          throw new Error(
            `AI Dawg returned ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`
          );
        } else if (axiosError.request) {
          // Request made but no response
          throw new Error('AI Dawg backend did not respond (connection timeout or refused)');
        }
      }

      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
      this.retryConfig.maxDelay
    );
    // Add jitter
    return delay + Math.random() * 1000;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Route command to specific service
   * Used for direct service calls (vocal coach, producer, etc.)
   */
  async routeToService(serviceName: string, endpoint: string, data: any): Promise<ModuleResponse> {
    const serviceUrls: Record<string, string> = {
      'vocal-coach': config.vocalCoachUrl,
      'producer': config.producerUrl,
      'ai-brain': config.aiBrainUrl
    };

    const baseUrl = serviceUrls[serviceName];
    if (!baseUrl) {
      return {
        success: false,
        error: `Unknown service: ${serviceName}`,
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error(`Service ${serviceName} request failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default ModuleRouter;
