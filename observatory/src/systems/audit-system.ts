/**
 * Audit System
 *
 * Comprehensive audit and progress tracking system for both Jarvis and AI DAWG.
 * Tracks activities, metrics, milestones, and generates reports.
 */

import { Logger } from '../utils/logger.js';
import { AIDawgMonitorAgent, ProjectMetrics } from '../agents/ai-dawg-monitor-agent.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  project: 'jarvis' | 'ai-dawg';
  category: 'activity' | 'milestone' | 'metric' | 'error' | 'performance';
  action: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface ProgressReport {
  project: 'jarvis' | 'ai-dawg';
  period: { start: Date; end: Date };
  summary: {
    totalActivities: number;
    milestones: number;
    errors: number;
    avgPerformance: number;
  };
  metrics: ProjectMetrics;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

export class AuditSystem {
  private logger: Logger;
  private auditLog: AuditEntry[] = [];
  private auditFilePath: string;
  private aiDawgMonitor: AIDawgMonitorAgent | null = null;
  private maxLogSize: number = 10000; // Keep last 10k entries in memory

  constructor() {
    this.logger = new Logger('AuditSystem');
    this.auditFilePath = path.join(os.homedir(), '.jarvis', 'audit-log.json');
  }

  /**
   * Initialize the audit system
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Audit System');

    // Create .jarvis directory if it doesn't exist
    const jarvisDir = path.join(os.homedir(), '.jarvis');
    await fs.mkdir(jarvisDir, { recursive: true });

    // Load existing audit log
    await this.loadAuditLog();

    // Initialize AI DAWG monitor
    this.aiDawgMonitor = new AIDawgMonitorAgent();
    await this.aiDawgMonitor.initialize();

    this.logger.info('Audit System initialized', {
      entriesLoaded: this.auditLog.length,
    });
  }

  /**
   * Log an audit entry
   */
  async logActivity(
    project: 'jarvis' | 'ai-dawg',
    category: AuditEntry['category'],
    action: string,
    details: Record<string, any> = {},
    severity: AuditEntry['severity'] = 'info'
  ): Promise<void> {
    const entry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      project,
      category,
      action,
      details,
      severity,
    };

    this.auditLog.push(entry);

    // Keep log size manageable
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxLogSize);
    }

    // Persist to disk
    await this.saveAuditLog();

    this.logger.info('Audit entry logged', {
      project,
      category,
      action,
      severity,
    });
  }

  /**
   * Generate a comprehensive progress report
   */
  async generateProgressReport(
    project: 'jarvis' | 'ai-dawg',
    daysBack: number = 7
  ): Promise<ProgressReport> {
    this.logger.info('Generating progress report', { project, daysBack });

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Filter relevant audit entries
    const relevantEntries = this.auditLog.filter(
      (entry) =>
        entry.project === project &&
        entry.timestamp >= startDate &&
        entry.timestamp <= endDate
    );

    // Calculate summary stats
    const summary = {
      totalActivities: relevantEntries.length,
      milestones: relevantEntries.filter((e) => e.category === 'milestone').length,
      errors: relevantEntries.filter((e) => e.severity === 'error' || e.severity === 'critical')
        .length,
      avgPerformance: this.calculateAveragePerformance(relevantEntries),
    };

    // Get project metrics
    let metrics: ProjectMetrics;
    if (project === 'ai-dawg' && this.aiDawgMonitor) {
      metrics = await this.aiDawgMonitor.getProjectMetrics();
    } else {
      metrics = await this.getJarvisMetrics();
    }

    // Generate highlights, concerns, and recommendations
    const highlights = this.extractHighlights(relevantEntries, metrics);
    const concerns = this.extractConcerns(relevantEntries, metrics);
    const recommendations = this.generateRecommendations(relevantEntries, metrics);

    return {
      project,
      period: { start: startDate, end: endDate },
      summary,
      metrics,
      highlights,
      concerns,
      recommendations,
    };
  }

  /**
   * Get Jarvis-specific metrics
   */
  private async getJarvisMetrics(): Promise<ProjectMetrics> {
    try {
      const jarvisDir = '/Users/benkennon/Jarvis-v0';
      const monitor = new AIDawgMonitorAgent(jarvisDir);
      await monitor.initialize();
      return await monitor.getProjectMetrics();
    } catch (error) {
      this.logger.warn('Failed to get Jarvis metrics', error);
      return {
        totalCommits: 0,
        linesOfCode: 0,
        filesCount: 0,
        lastActivity: new Date(),
        contributors: [],
        features: [],
      };
    }
  }

  /**
   * Calculate average performance metric
   */
  private calculateAveragePerformance(entries: AuditEntry[]): number {
    const perfEntries = entries.filter((e) => e.category === 'performance');

    if (perfEntries.length === 0) return 0;

    const total = perfEntries.reduce((sum, entry) => {
      return sum + (entry.details.duration || 0);
    }, 0);

    return total / perfEntries.length;
  }

  /**
   * Extract highlights from audit entries
   */
  private extractHighlights(entries: AuditEntry[], metrics: ProjectMetrics): string[] {
    const highlights: string[] = [];

    // Milestones
    const milestones = entries.filter((e) => e.category === 'milestone');
    if (milestones.length > 0) {
      highlights.push(`${milestones.length} milestone(s) achieved`);
      milestones.slice(0, 3).forEach((m) => {
        highlights.push(`  - ${m.action}`);
      });
    }

    // Recent features
    if (metrics.features.length > 0) {
      const majorFeatures = metrics.features.filter((f) => f.significance === 'major');
      if (majorFeatures.length > 0) {
        highlights.push(`${majorFeatures.length} major feature(s) developed`);
      }
    }

    // High activity
    if (entries.length > 50) {
      highlights.push(`High development activity: ${entries.length} logged actions`);
    }

    return highlights;
  }

  /**
   * Extract concerns from audit entries
   */
  private extractConcerns(entries: AuditEntry[], metrics: ProjectMetrics): string[] {
    const concerns: string[] = [];

    // Errors
    const errors = entries.filter(
      (e) => e.severity === 'error' || e.severity === 'critical'
    );
    if (errors.length > 5) {
      concerns.push(`${errors.length} error(s) logged - may need attention`);
    }

    // Performance issues
    const slowActions = entries.filter(
      (e) => e.category === 'performance' && (e.details.duration || 0) > 5000
    );
    if (slowActions.length > 3) {
      concerns.push(`${slowActions.length} slow operation(s) detected`);
    }

    // Inactivity
    const daysSinceLastCommit = Math.floor(
      (Date.now() - metrics.lastActivity.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceLastCommit > 7) {
      concerns.push(`No commits in ${daysSinceLastCommit} days - project may be stale`);
    }

    return concerns;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    entries: AuditEntry[],
    metrics: ProjectMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Based on errors
    const errors = entries.filter((e) => e.severity === 'error');
    if (errors.length > 10) {
      recommendations.push('Review error logs and implement fixes for recurring issues');
    }

    // Based on features
    const majorFeatures = metrics.features.filter((f) => f.significance === 'major');
    if (majorFeatures.length >= 3) {
      recommendations.push('Consider creating marketing content about recent major features');
    }

    // Based on activity
    if (entries.length > 100) {
      recommendations.push('High activity period - good time to publish progress update');
    }

    // Performance
    const slowOps = entries.filter(
      (e) => e.category === 'performance' && (e.details.duration || 0) > 3000
    );
    if (slowOps.length > 5) {
      recommendations.push('Optimize slow operations to improve response times');
    }

    return recommendations;
  }

  /**
   * Get recent audit entries
   */
  getRecentEntries(limit: number = 100): AuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Get entries by project
   */
  getEntriesByProject(project: 'jarvis' | 'ai-dawg', limit: number = 100): AuditEntry[] {
    return this.auditLog.filter((e) => e.project === project).slice(-limit);
  }

  /**
   * Get entries by category
   */
  getEntriesByCategory(
    category: AuditEntry['category'],
    limit: number = 100
  ): AuditEntry[] {
    return this.auditLog.filter((e) => e.category === category).slice(-limit);
  }

  /**
   * Load audit log from disk
   */
  private async loadAuditLog(): Promise<void> {
    try {
      const data = await fs.readFile(this.auditFilePath, 'utf-8');
      const entries = JSON.parse(data);

      this.auditLog = entries.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));

      this.logger.info('Audit log loaded', { entries: this.auditLog.length });
    } catch (error) {
      // File doesn't exist yet, start with empty log
      this.logger.info('Starting fresh audit log');
      this.auditLog = [];
    }
  }

  /**
   * Save audit log to disk
   */
  private async saveAuditLog(): Promise<void> {
    try {
      const data = JSON.stringify(this.auditLog, null, 2);
      await fs.writeFile(this.auditFilePath, data, 'utf-8');
    } catch (error) {
      this.logger.error('Failed to save audit log', error as Error);
    }
  }

  /**
   * Export report to file
   */
  async exportReport(report: ProgressReport, outputPath: string): Promise<void> {
    const content = this.formatReportAsText(report);
    await fs.writeFile(outputPath, content, 'utf-8');
    this.logger.info('Report exported', { path: outputPath });
  }

  /**
   * Format report as readable text
   */
  private formatReportAsText(report: ProgressReport): string {
    const lines: string[] = [];

    lines.push(`==============================================`);
    lines.push(`${report.project.toUpperCase()} PROGRESS REPORT`);
    lines.push(`==============================================`);
    lines.push(``);
    lines.push(`Period: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}`);
    lines.push(``);

    lines.push(`SUMMARY`);
    lines.push(`-------`);
    lines.push(`Total Activities: ${report.summary.totalActivities}`);
    lines.push(`Milestones: ${report.summary.milestones}`);
    lines.push(`Errors: ${report.summary.errors}`);
    lines.push(`Avg Performance: ${Math.round(report.summary.avgPerformance)}ms`);
    lines.push(``);

    lines.push(`METRICS`);
    lines.push(`-------`);
    lines.push(`Total Commits: ${report.metrics.totalCommits}`);
    lines.push(`Lines of Code: ${report.metrics.linesOfCode.toLocaleString()}`);
    lines.push(`Files: ${report.metrics.filesCount}`);
    lines.push(`Contributors: ${report.metrics.contributors.join(', ')}`);
    lines.push(`Last Activity: ${report.metrics.lastActivity.toLocaleDateString()}`);
    lines.push(``);

    if (report.highlights.length > 0) {
      lines.push(`HIGHLIGHTS`);
      lines.push(`----------`);
      report.highlights.forEach((h) => lines.push(`✓ ${h}`));
      lines.push(``);
    }

    if (report.concerns.length > 0) {
      lines.push(`CONCERNS`);
      lines.push(`--------`);
      report.concerns.forEach((c) => lines.push(`⚠ ${c}`));
      lines.push(``);
    }

    if (report.recommendations.length > 0) {
      lines.push(`RECOMMENDATIONS`);
      lines.push(`--------------`);
      report.recommendations.forEach((r) => lines.push(`→ ${r}`));
      lines.push(``);
    }

    lines.push(`==============================================`);

    return lines.join('\n');
  }
}
