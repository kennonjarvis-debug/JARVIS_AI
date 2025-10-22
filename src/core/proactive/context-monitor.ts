/**
 * Context Monitor
 * Tracks user activity and detects current work context
 */

import { EventEmitter } from 'events';
import { WorkContext, SystemEvent, UserInteraction } from './types';
import { healthAggregator } from '../health-aggregator';

export class ContextMonitor extends EventEmitter {
  private static instance: ContextMonitor;
  private currentContext: WorkContext | null = null;
  private recentActivity: UserInteraction[] = [];
  private systemEvents: SystemEvent[] = [];
  private contextHistory: WorkContext[] = [];
  private activityWindow = 5 * 60 * 1000;
  private contextChangeThreshold = 0.7;

  private constructor() {
    super();
    this.startMonitoring();
  }

  static getInstance(): ContextMonitor {
    if (!ContextMonitor.instance) {
      ContextMonitor.instance = new ContextMonitor();
    }
    return ContextMonitor.instance;
  }

  private startMonitoring() {
    setInterval(async () => await this.detectContextChange(), 60 * 1000);
    setInterval(async () => await this.checkSystemEvents(), 30 * 1000);
  }

  trackActivity(interaction: UserInteraction) {
    this.recentActivity.push(interaction);
    const cutoff = Date.now() - this.activityWindow;
    this.recentActivity = this.recentActivity.filter(
      a => new Date(a.timestamp).getTime() > cutoff
    );
    this.detectContextChange();
  }

  async detectCurrentContext(): Promise<WorkContext> {
    const now = new Date();
    const recentActivity = this.getRecentActivity();
    const systemEvents = await this.getRecentSystemEvents();
    const targets = recentActivity.map(a => a.target);

    if (this.hasRecentErrors(systemEvents)) {
      return { type: 'debugging', confidence: 0.9, details: {}, startedAt: now };
    }
    if (this.isMetricsActivity(targets)) {
      return { type: 'metrics_review', confidence: 0.85, details: {}, startedAt: now };
    }
    if (this.isMusicActivity(targets)) {
      return { type: 'music_production', confidence: 0.8, details: {}, startedAt: now };
    }
    return { type: 'unknown', confidence: 0.3, details: {}, startedAt: now };
  }

  private async detectContextChange() {
    const newContext = await this.detectCurrentContext();
    if (!this.currentContext || newContext.type !== this.currentContext.type) {
      if (newContext.confidence >= this.contextChangeThreshold) {
        this.currentContext = newContext;
        this.contextHistory.push(newContext);
        this.emit('contextChange', { old: this.currentContext, new: newContext });
      }
    }
  }

  private async checkSystemEvents() {
    try {
      const health = await healthAggregator.checkAll();
      for (const [name, service] of Object.entries(health.services)) {
        if (service.status !== 'healthy') {
          const event: SystemEvent = {
            id: `event-${Date.now()}-${name}`,
            type: 'error',
            severity: 'medium',
            title: `Service ${name} is ${service.status}`,
            description: service.message || 'Service degraded',
            timestamp: new Date(),
            affectedModules: [name],
            actionable: true
          };
          this.systemEvents.push(event);
          this.emit('systemEvent', event);
        }
      }
    } catch (error) {
      console.error('Error checking system events:', error);
    }
  }

  getRecentActivity(minutes: number = 5): UserInteraction[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.recentActivity.filter(a => new Date(a.timestamp).getTime() > cutoff);
  }

  async getRecentSystemEvents(hours: number = 1): Promise<SystemEvent[]> {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.systemEvents.filter(e => new Date(e.timestamp).getTime() > cutoff);
  }

  private hasRecentErrors(events: SystemEvent[]): boolean {
    return events.some(e => e.type === 'error' && e.severity === 'high');
  }

  private isMetricsActivity(targets: string[]): boolean {
    return targets.filter(t => t.includes('metrics') || t.includes('dashboard')).length > 2;
  }

  private isMusicActivity(targets: string[]): boolean {
    return targets.some(t => t.includes('music') || t.includes('vocal'));
  }

  getCurrentContext(): WorkContext | null {
    return this.currentContext;
  }

  getContextHistory(limit: number = 10): WorkContext[] {
    return this.contextHistory.slice(-limit);
  }

  registerSystemEvent(event: SystemEvent) {
    this.systemEvents.push(event);
    this.emit('systemEvent', event);
    this.detectContextChange();
  }
}

export const contextMonitor = ContextMonitor.getInstance();
export default ContextMonitor;
