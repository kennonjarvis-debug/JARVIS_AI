/**
 * Jarvis Health Report Generator
 * Creates comprehensive daily health summaries
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SystemMonitor } from '../../../SystemMonitor/SystemMonitor';

const execAsync = promisify(exec);

export interface HealthReport {
  timestamp: Date;
  vitality: {
    score: number;
    status: string;
    metrics: {
      systemHealth: number;
      performanceScore: number;
      uptime: number;
    };
  };
  modules: {
    name: string;
    status: string;
    lastRun?: Date;
    priority: number;
  }[];
  analytics: {
    actionsExecuted: number;
    errors: number;
    warnings: number;
    successRate: number;
  };
  system: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
  };
  services: {
    backend: boolean;
    jitController: boolean;
    ngrok: boolean;
  };
  recommendations: string[];
}

/**
 * Generate comprehensive daily health report
 */
export async function generateDailyHealthReport(): Promise<HealthReport> {
  console.log('📊 Generating Jarvis health report...');

  try {
    // Fetch vitality data
    const vitality = await fetchVitality();

    // Fetch module statuses
    const modules = await fetchModuleStatuses();

    // Fetch analytics
    const analytics = await fetchAnalytics();

    // Get system metrics
    const system = await getSystemMetrics();

    // Check service health
    const services = await checkServices();

    // Generate recommendations
    const recommendations = generateRecommendations(vitality, analytics, system);

    const report: HealthReport = {
      timestamp: new Date(),
      vitality,
      modules,
      analytics,
      system,
      services,
      recommendations
    };

    // Save report to file
    await saveReport(report);

    console.log('✅ Health report generated successfully');
    return report;

  } catch (error) {
    console.error('❌ Failed to generate health report:', error);
    throw error;
  }
}

/**
 * Fetch vitality data from backend
 */
async function fetchVitality(): Promise<HealthReport['vitality']> {
  try {
    const response = await fetch('http://localhost:3001/api/v1/jarvis/desktop/vitality');

    if (!response.ok) {
      throw new Error(`Vitality fetch failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      score: data.score || 0,
      status: data.status || 'unknown',
      metrics: {
        systemHealth: data.metrics?.systemHealth || 0,
        performanceScore: data.metrics?.performanceScore || 0,
        uptime: data.metrics?.uptime || 0
      }
    };
  } catch (error) {
    console.warn('⚠️  Could not fetch vitality, using defaults');
    return {
      score: 0,
      status: 'unavailable',
      metrics: {
        systemHealth: 0,
        performanceScore: 0,
        uptime: 0
      }
    };
  }
}

/**
 * Fetch module statuses
 */
async function fetchModuleStatuses(): Promise<HealthReport['modules']> {
  try {
    const response = await fetch('http://localhost:3001/api/v1/jarvis/modules/status');

    if (!response.ok) {
      return getDefaultModules();
    }

    const data = await response.json();
    return data.modules || getDefaultModules();
  } catch (error) {
    return getDefaultModules();
  }
}

function getDefaultModules(): HealthReport['modules'] {
  return [
    { name: 'Music', status: 'active', priority: 1 },
    { name: 'Marketing', status: 'active', priority: 2 },
    { name: 'Engagement', status: 'active', priority: 3 },
    { name: 'Automation', status: 'active', priority: 4 },
    { name: 'Testing', status: 'active', priority: 5 },
    { name: 'Auto-Adaptation', status: 'active', priority: 6 }
  ];
}

/**
 * Fetch analytics data
 */
async function fetchAnalytics(): Promise<HealthReport['analytics']> {
  try {
    const response = await fetch('http://localhost:3001/api/v1/jarvis/analytics');

    if (!response.ok) {
      return getDefaultAnalytics();
    }

    const data = await response.json();

    return {
      actionsExecuted: data.actionsExecuted || 0,
      errors: data.errors || 0,
      warnings: data.warnings || 0,
      successRate: data.successRate || 0
    };
  } catch (error) {
    return getDefaultAnalytics();
  }
}

function getDefaultAnalytics(): HealthReport['analytics'] {
  return {
    actionsExecuted: 0,
    errors: 0,
    warnings: 0,
    successRate: 100
  };
}

/**
 * Get system metrics
 */
async function getSystemMetrics(): Promise<HealthReport['system']> {
  try {
    // CPU usage
    const cpuCmd = 'ps -A -o %cpu | awk \'{s+=$1} END {print s}\'';
    const { stdout: cpuOut } = await execAsync(cpuCmd);
    const cpu = parseFloat(cpuOut.trim()) || 0;

    // Memory usage
    const memCmd = 'ps -caxm -orss= | awk \'{ sum += $1 } END { print sum / 1024 }\'';
    const { stdout: memOut } = await execAsync(memCmd);
    const memory = parseFloat(memOut.trim()) || 0;

    // Disk usage
    const diskCmd = 'df -h / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'';
    const { stdout: diskOut } = await execAsync(diskCmd);
    const disk = parseFloat(diskOut.trim()) || 0;

    // System uptime
    const uptime = process.uptime();

    return { cpu, memory, disk, uptime };
  } catch (error) {
    console.warn('⚠️  Could not fetch system metrics');
    return { cpu: 0, memory: 0, disk: 0, uptime: 0 };
  }
}

/**
 * Check service health
 */
async function checkServices(): Promise<HealthReport['services']> {
  const services = {
    backend: false,
    jitController: false,
    ngrok: false
  };

  try {
    // Check backend
    const backendResponse = await fetch('http://localhost:3001/health', {
      signal: AbortSignal.timeout(2000)
    });
    services.backend = backendResponse.ok;
  } catch {}

  try {
    // Check JIT Controller
    const jitResponse = await fetch('http://localhost:4000/health', {
      signal: AbortSignal.timeout(2000)
    });
    services.jitController = jitResponse.ok;
  } catch {}

  try {
    // Check ngrok
    const ngrokResponse = await fetch('http://localhost:4040/api/tunnels', {
      signal: AbortSignal.timeout(2000)
    });
    services.ngrok = ngrokResponse.ok;
  } catch {}

  return services;
}

/**
 * Generate recommendations based on health data
 */
function generateRecommendations(
  vitality: HealthReport['vitality'],
  analytics: HealthReport['analytics'],
  system: HealthReport['system']
): string[] {
  const recommendations: string[] = [];

  // Vitality-based recommendations
  if (vitality.score < 60) {
    recommendations.push('System vitality is low. Consider restarting services or checking for errors.');
  }

  // Analytics-based recommendations
  if (analytics.errors > 10) {
    recommendations.push(`High error count detected (${analytics.errors}). Review logs for issues.`);
  }

  if (analytics.successRate < 80) {
    recommendations.push(`Success rate is below 80% (${analytics.successRate}%). Investigate failures.`);
  }

  // System-based recommendations
  if (system.cpu > 80) {
    recommendations.push('High CPU usage detected. Consider scaling or optimizing processes.');
  }

  if (system.memory > 8000) { // 8GB
    recommendations.push('High memory usage. Check for memory leaks or restart services.');
  }

  if (system.disk > 85) {
    recommendations.push('Disk usage above 85%. Consider cleaning up logs or old files.');
  }

  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push('All systems nominal. Continue monitoring.');
  }

  return recommendations;
}

/**
 * Save report to file
 */
async function saveReport(report: HealthReport): Promise<void> {
  const logsDir = path.join(process.cwd(), 'logs', 'jarvis');
  await fs.mkdir(logsDir, { recursive: true });

  const filename = `health-report-${report.timestamp.toISOString().split('T')[0]}.json`;
  const filepath = path.join(logsDir, filename);

  await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📄 Report saved to: ${filepath}`);
}

/**
 * Convert report to Slack attachments format
 */
export function toSlackAttachments(report: HealthReport): any[] {
  const color = report.vitality.score >= 75 ? 'good' : report.vitality.score >= 50 ? 'warning' : 'danger';

  return [
    {
      color,
      title: '🧠 Jarvis Health Summary',
      text: `Vitality: ${report.vitality.score}/100 (${report.vitality.status})`,
      fields: [
        {
          title: 'Active Modules',
          value: report.modules.filter(m => m.status === 'active').length.toString(),
          short: true
        },
        {
          title: 'Actions Executed',
          value: report.analytics.actionsExecuted.toString(),
          short: true
        },
        {
          title: 'Success Rate',
          value: `${report.analytics.successRate}%`,
          short: true
        },
        {
          title: 'Errors',
          value: report.analytics.errors.toString(),
          short: true
        }
      ],
      footer: 'Jarvis AI',
      ts: Math.floor(report.timestamp.getTime() / 1000)
    },
    {
      color: 'good',
      title: '🔧 Services Status',
      fields: [
        {
          title: 'Backend',
          value: report.services.backend ? '✅' : '❌',
          short: true
        },
        {
          title: 'JIT Controller',
          value: report.services.jitController ? '✅' : '❌',
          short: true
        },
        {
          title: 'ngrok',
          value: report.services.ngrok ? '✅' : '❌',
          short: true
        }
      ]
    },
    {
      color: '#36a64f',
      title: '💡 Recommendations',
      text: report.recommendations.join('\n')
    }
  ];
}
