/**
 * Service Registry
 * Tracks the state of all AI DAWG services
 */

import { ServiceState } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class ServiceRegistry {
  private services: Map<string, ServiceState>;
  private stateFile: string;

  constructor(dataDir: string = '/Users/benkennon/Jarvis/data') {
    this.services = new Map();
    this.stateFile = path.join(dataDir, 'service-state.json');
    this.loadState();
  }

  /**
   * Initialize a service in the registry
   */
  initService(name: string, port: number): void {
    if (!this.services.has(name)) {
      this.services.set(name, {
        name,
        port,
        status: 'unknown',
        restart_count: 0,
        consecutive_failures: 0
      });
      this.saveState();
    }
  }

  /**
   * Update service state
   */
  updateState(name: string, updates: Partial<ServiceState>): void {
    const current = this.services.get(name);
    if (current) {
      this.services.set(name, { ...current, ...updates });
      this.saveState();
    }
  }

  /**
   * Get service state
   */
  getState(name: string): ServiceState | undefined {
    return this.services.get(name);
  }

  /**
   * Get all services
   */
  getAllServices(): ServiceState[] {
    return Array.from(this.services.values());
  }

  /**
   * Mark service as running
   */
  markRunning(name: string, pid: number): void {
    const state = this.services.get(name);
    if (state) {
      this.updateState(name, {
        status: 'running',
        pid,
        uptime: Date.now(),
        consecutive_failures: 0
      });
    }
  }

  /**
   * Mark service as stopped
   */
  markStopped(name: string): void {
    this.updateState(name, {
      status: 'stopped',
      pid: undefined,
      uptime: undefined
    });
  }

  /**
   * Mark service as unhealthy
   */
  markUnhealthy(name: string): void {
    const state = this.services.get(name);
    if (state) {
      this.updateState(name, {
        status: 'unhealthy',
        consecutive_failures: state.consecutive_failures + 1,
        last_health_check: new Date()
      });
    }
  }

  /**
   * Mark service as healthy
   */
  markHealthy(name: string): void {
    this.updateState(name, {
      status: 'running',
      consecutive_failures: 0,
      last_health_check: new Date()
    });
  }

  /**
   * Increment restart count
   */
  incrementRestartCount(name: string): void {
    const state = this.services.get(name);
    if (state) {
      this.updateState(name, {
        restart_count: state.restart_count + 1,
        last_restart: new Date()
      });
    }
  }

  /**
   * Reset restart count (after cooldown period)
   */
  resetRestartCount(name: string): void {
    this.updateState(name, {
      restart_count: 0
    });
  }

  /**
   * Check if service can be restarted (within max attempts)
   */
  canRestart(name: string, maxAttempts: number): boolean {
    const state = this.services.get(name);
    return state ? state.restart_count < maxAttempts : false;
  }

  /**
   * Check if service needs escalation
   */
  needsEscalation(name: string, threshold: number): boolean {
    const state = this.services.get(name);
    return state ? state.consecutive_failures >= threshold : false;
  }

  /**
   * Save state to disk
   */
  private saveState(): void {
    try {
      const data = JSON.stringify(
        Array.from(this.services.entries()),
        null,
        2
      );
      fs.writeFileSync(this.stateFile, data, 'utf8');
    } catch (error) {
      console.error('Failed to save service state:', error);
    }
  }

  /**
   * Load state from disk
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        const entries = JSON.parse(data);
        this.services = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load service state:', error);
      this.services = new Map();
    }
  }

  /**
   * Get summary of all services
   */
  getSummary(): {
    total: number;
    running: number;
    stopped: number;
    unhealthy: number;
    unknown: number;
  } {
    const states = this.getAllServices();
    return {
      total: states.length,
      running: states.filter(s => s.status === 'running').length,
      stopped: states.filter(s => s.status === 'stopped').length,
      unhealthy: states.filter(s => s.status === 'unhealthy').length,
      unknown: states.filter(s => s.status === 'unknown').length
    };
  }
}
