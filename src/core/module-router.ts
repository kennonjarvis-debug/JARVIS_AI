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
    // Route AI Brain chat requests to the gateway's internal chat handler
    if (command.module === 'ai-brain' && command.action === 'chat') {
      logger.info(`Routing ${command.module}.${command.action} to internal chat handler`);

      // Call the gateway's own chat endpoint
      try {
        const response = await axios.post(
          `http://localhost:${process.env.JARVIS_PORT || 4000}/api/v1/chat`,
          {
            message: command.params.message || '',
            conversationHistory: command.params.conversationHistory || []
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.JARVIS_AUTH_TOKEN || 'test-token'}`,
              'Content-Type': 'application/json'
            },
            timeout: 35000
          }
        );

        return {
          success: true,
          data: response.data.data,
          timestamp: new Date().toISOString()
        };
      } catch (error: any) {
        logger.error(`Internal chat handler failed: ${error.message}`);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Route other AI Brain requests directly to AI Brain service (if available)
    if (command.module === 'ai-brain') {
      logger.info(`Routing ${command.module}.${command.action} to AI Brain service`);

      // Map action to AI Brain endpoint
      const endpointMap: Record<string, string> = {
        'voice-chat': '/api/voice-chat',
        'health': '/api/health'
      };

      const endpoint = endpointMap[command.action];
      if (!endpoint) {
        return {
          success: false,
          error: `Unknown AI Brain action: ${command.action}`,
          timestamp: new Date().toISOString()
        };
      }

      // Transform params to match AI Brain API format
      const aiBrainData = {
        message: command.params.message || '',
        session_id: command.params.conversationId || command.params.sessionId || 'default',
        ...(command.params.context && { context: command.params.context })
      };

      return await this.routeToService('ai-brain', endpoint, aiBrainData);
    }

    // Route freestyle module requests to AI DAWG freestyle endpoints
    if (command.module === 'freestyle') {
      logger.info(`Routing ${command.module}.${command.action} to AI DAWG freestyle service`);

      // Map action to freestyle endpoint
      const endpointMap: Record<string, string> = {
        'upload-beat': '/api/v1/freestyle/beat/upload',
        'start-session': '/api/v1/freestyle/session/start',
        'end-session': '/api/v1/freestyle/session/{sessionId}/end',
        'get-lyrics': '/api/v1/freestyle/session/{sessionId}/lyrics',
        'get-rhymes': '/api/v1/freestyle/session/{sessionId}/rhyme-suggestions',
        'cancel-session': '/api/v1/freestyle/session/{sessionId}',
      };

      let endpoint = endpointMap[command.action];
      if (!endpoint) {
        return {
          success: false,
          error: `Unknown freestyle action: ${command.action}`,
          timestamp: new Date().toISOString()
        };
      }

      // Replace sessionId placeholder if present
      if (command.params.sessionId) {
        endpoint = endpoint.replace('{sessionId}', command.params.sessionId);
      }

      // Transform params to match freestyle API format
      const freestyleData = {
        ...command.params
      };

      return await this.routeToService('freestyle', endpoint, freestyleData);
    }

    // Route music module requests to local music generation service
    if (command.module === 'music') {
      logger.info(`Routing ${command.module}.${command.action} to local music generation service`);

      // Import music generator dynamically
      const { musicGenerator } = await import('../services/music-generator.js');

      try {
        let result;

        switch (command.action) {
          case 'generate-beat':
          case 'generate':
            result = await musicGenerator.generateBeat({
              genre: command.params.genre,
              bpm: command.params.bpm,
              mood: command.params.mood,
              duration: command.params.duration || 30
            });
            break;

          case 'generate-music':
            result = await musicGenerator.generateMusic({
              musicalIntent: command.params.musicalIntent,
              duration: command.params.duration || 30,
              includeVocals: command.params.includeVocals || false
            });
            break;

          default:
            return {
              success: false,
              error: `Unknown music action: ${command.action}`,
              timestamp: new Date().toISOString()
            };
        }

        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        };
      } catch (error: any) {
        logger.error(`Music generation failed: ${error.message}`);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Default: route through AI DAWG Backend
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
      'ai-brain': config.aiBrainUrl,
      'freestyle': config.aiDawgBackendUrl  // Freestyle is part of AI DAWG backend
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

// Singleton instance for shared use
export const moduleRouter = new ModuleRouter();

export default ModuleRouter;
