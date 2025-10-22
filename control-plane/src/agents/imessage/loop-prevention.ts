/**
 * Loop Prevention System
 * Prevents auto-response loops and spam
 */

import * as fs from 'fs';
import * as path from 'path';
import { ResponseLog } from './types.js';
import { logger } from '../../utils/logger.js';

interface RateLimitState {
  handle: string;
  lastResponseTime: Date;
  responsesInLastHour: number;
  responsesInLastDay: number;
  hourWindowStart: Date;
  dayWindowStart: Date;
}

export class LoopPrevention {
  private responseLogs: Map<string, ResponseLog[]> = new Map();
  private rateLimitState: Map<string, RateLimitState> = new Map();
  private logFilePath: string;

  // Configuration
  private maxPerHour: number = 3;
  private maxPerDay: number = 10;
  private minIntervalMinutes: number = 60; // 1 hour minimum between responses

  constructor(logDirectory: string = '/tmp/jarvis-imessage') {
    // Ensure log directory exists
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }

    this.logFilePath = path.join(logDirectory, 'response-logs.json');
    this.loadLogs();
  }

  /**
   * Configure rate limits
   */
  configure(maxPerHour: number, maxPerDay: number, minIntervalMinutes: number): void {
    this.maxPerHour = maxPerHour;
    this.maxPerDay = maxPerDay;
    this.minIntervalMinutes = minIntervalMinutes;

    logger.info('Loop prevention configured', {
      maxPerHour,
      maxPerDay,
      minIntervalMinutes,
    });
  }

  /**
   * Check if we can respond to a contact
   */
  canRespond(handle: string): { allowed: boolean; reason?: string } {
    const state = this.getRateLimitState(handle);
    const now = new Date();

    // Check minimum interval
    if (state.lastResponseTime) {
      const minutesSinceLastResponse = (now.getTime() - state.lastResponseTime.getTime()) / (1000 * 60);

      if (minutesSinceLastResponse < this.minIntervalMinutes) {
        return {
          allowed: false,
          reason: `Minimum interval not met. Last response ${minutesSinceLastResponse.toFixed(0)} minutes ago`,
        };
      }
    }

    // Reset hourly window if needed
    const hoursSinceHourWindow = (now.getTime() - state.hourWindowStart.getTime()) / (1000 * 60 * 60);
    if (hoursSinceHourWindow >= 1) {
      state.responsesInLastHour = 0;
      state.hourWindowStart = now;
    }

    // Reset daily window if needed
    const hoursSinceDayWindow = (now.getTime() - state.dayWindowStart.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDayWindow >= 24) {
      state.responsesInLastDay = 0;
      state.dayWindowStart = now;
    }

    // Check hourly limit
    if (state.responsesInLastHour >= this.maxPerHour) {
      return {
        allowed: false,
        reason: `Hourly limit reached (${this.maxPerHour}/hour)`,
      };
    }

    // Check daily limit
    if (state.responsesInLastDay >= this.maxPerDay) {
      return {
        allowed: false,
        reason: `Daily limit reached (${this.maxPerDay}/day)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a response to update rate limiting
   */
  recordResponse(log: ResponseLog): void {
    // Store log
    const logs = this.responseLogs.get(log.handle) || [];
    logs.push(log);
    this.responseLogs.set(log.handle, logs);

    // Update rate limit state
    const state = this.getRateLimitState(log.handle);
    state.lastResponseTime = log.timestamp;
    state.responsesInLastHour++;
    state.responsesInLastDay++;
    this.rateLimitState.set(log.handle, state);

    // Save to disk
    this.saveLogs();

    logger.info('Response recorded', {
      handle: log.handle,
      responsesInLastHour: state.responsesInLastHour,
      responsesInLastDay: state.responsesInLastDay,
    });
  }

  /**
   * Get rate limit state for a contact
   */
  private getRateLimitState(handle: string): RateLimitState {
    if (!this.rateLimitState.has(handle)) {
      const now = new Date();
      this.rateLimitState.set(handle, {
        handle,
        lastResponseTime: new Date(0),
        responsesInLastHour: 0,
        responsesInLastDay: 0,
        hourWindowStart: now,
        dayWindowStart: now,
      });
    }

    return this.rateLimitState.get(handle)!;
  }

  /**
   * Get response logs for a contact
   */
  getResponseLogs(handle: string, limit?: number): ResponseLog[] {
    const logs = this.responseLogs.get(handle) || [];
    if (limit) {
      return logs.slice(-limit);
    }
    return logs;
  }

  /**
   * Get all response logs
   */
  getAllResponseLogs(): ResponseLog[] {
    const allLogs: ResponseLog[] = [];
    for (const logs of this.responseLogs.values()) {
      allLogs.push(...logs);
    }
    return allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Check if message looks like it's from ourselves (loop detection)
   */
  detectLoop(messageText: string): boolean {
    const loopIndicators = [
      /I'm having trouble processing/i,
      /human follow up with you/i,
      /^Hey! /i, // Common AI greeting
      /As an AI assistant/i,
      /I cannot/i,
    ];

    for (const pattern of loopIndicators) {
      if (pattern.test(messageText)) {
        logger.warn('Potential loop detected in message', {
          preview: messageText.substring(0, 100),
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Load logs from disk
   */
  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const data = fs.readFileSync(this.logFilePath, 'utf-8');
        const parsed = JSON.parse(data);

        // Restore logs
        for (const [handle, logs] of Object.entries(parsed.logs || {})) {
          const typedLogs = (logs as any[]).map(log => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
          this.responseLogs.set(handle, typedLogs);
        }

        // Restore rate limit state
        for (const [handle, state] of Object.entries(parsed.rateLimitState || {})) {
          const typedState = state as any;
          this.rateLimitState.set(handle, {
            ...typedState,
            lastResponseTime: new Date(typedState.lastResponseTime),
            hourWindowStart: new Date(typedState.hourWindowStart),
            dayWindowStart: new Date(typedState.dayWindowStart),
          });
        }

        logger.info('Response logs loaded', {
          contacts: this.responseLogs.size,
        });
      }
    } catch (error) {
      logger.error('Failed to load response logs', { error });
    }
  }

  /**
   * Save logs to disk
   */
  private saveLogs(): void {
    try {
      const data = {
        logs: Object.fromEntries(this.responseLogs.entries()),
        rateLimitState: Object.fromEntries(this.rateLimitState.entries()),
      };

      fs.writeFileSync(this.logFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to save response logs', { error });
    }
  }

  /**
   * Reset rate limits for a contact
   */
  resetLimits(handle: string): void {
    this.rateLimitState.delete(handle);
    logger.info('Rate limits reset', { handle });
  }

  /**
   * Clear all response history for a contact
   */
  clearHistory(handle: string): void {
    this.responseLogs.delete(handle);
    this.rateLimitState.delete(handle);
    this.saveLogs();
    logger.info('Response history cleared', { handle });
  }
}
