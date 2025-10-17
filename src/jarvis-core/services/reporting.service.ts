/**
 * Jarvis Communication & Reporting Agent
 *
 * Handles all operational health reporting and communication
 * - Daily Slack reports
 * - Weekly email digests
 * - Monthly performance trends
 */

import axios from 'axios';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

interface VitalityReport {
  timestamp: string;
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  mood: string;
  satisfaction: number;
  concerns: string[];
  strengths: string[];
}

interface TestingStatus {
  totalTests: number;
  passing: number;
  failing: number;
  skipped: number;
  coverage: number;
  lastRun: string;
}

interface CloudSyncStatus {
  lastSync: string;
  success: boolean;
  filesUploaded: number;
  totalSize: number;
  nextSync: string;
}

interface AnalyticsReport {
  period: string;
  users: {
    total: number;
    active: number;
    new: number;
    churn: number;
  };
  engagement: {
    avgSessionDuration: number;
    avgDailyUsers: number;
    retentionRate: number;
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

interface ReportData {
  vitality: VitalityReport;
  testing: TestingStatus;
  cloudSync: CloudSyncStatus;
  analytics: AnalyticsReport;
  timestamp: string;
}

export class ReportingService {
  private baseUrl: string;
  private slackWebhook: string;
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || 'http://localhost:3001/api/v1';
    this.slackWebhook = process.env.SLACK_WEBHOOK_URL || '';

    // Email configuration
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Collect all data for report generation
   */
  async collectData(): Promise<ReportData> {
    const [vitality, testing, cloudSync, analytics] = await Promise.allSettled([
      this.fetchVitality(),
      this.fetchTestingStatus(),
      this.fetchCloudSyncStatus(),
      this.fetchAnalytics(),
    ]);

    return {
      vitality: vitality.status === 'fulfilled' ? vitality.value : this.getDefaultVitality(),
      testing: testing.status === 'fulfilled' ? testing.value : this.getDefaultTesting(),
      cloudSync: cloudSync.status === 'fulfilled' ? cloudSync.value : this.getDefaultCloudSync(),
      analytics: analytics.status === 'fulfilled' ? analytics.value : this.getDefaultAnalytics(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetch vitality report from Jarvis API
   */
  private async fetchVitality(): Promise<VitalityReport> {
    try {
      const response = await axios.get(`${this.baseUrl}/jarvis/vitality`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch vitality:', error);
      throw error;
    }
  }

  /**
   * Fetch testing status from Jarvis API
   */
  private async fetchTestingStatus(): Promise<TestingStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/jarvis/testing/status`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch testing status:', error);
      throw error;
    }
  }

  /**
   * Fetch cloud sync status from logs
   */
  private async fetchCloudSyncStatus(): Promise<CloudSyncStatus> {
    try {
      const logPath = path.join(process.cwd(), 'logs/jarvis/cloud-sync.log');
      const logContent = await fs.readFile(logPath, 'utf-8');
      const lines = logContent.split('\n').filter(l => l.trim());
      const lastLine = lines[lines.length - 1];

      if (lastLine) {
        const parsed = JSON.parse(lastLine);
        return {
          lastSync: parsed.timestamp,
          success: parsed.success,
          filesUploaded: parsed.filesUploaded || 0,
          totalSize: parsed.totalSize || 0,
          nextSync: parsed.nextSync || new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        };
      }

      throw new Error('No sync logs found');
    } catch (error) {
      console.error('Failed to fetch cloud sync status:', error);
      throw error;
    }
  }

  /**
   * Fetch analytics report from logs
   */
  private async fetchAnalytics(): Promise<AnalyticsReport> {
    try {
      const analyticsPath = path.join(process.cwd(), 'logs/jarvis/analytics/latest.json');
      const content = await fs.readFile(analyticsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      throw error;
    }
  }

  /**
   * Generate daily Slack report
   */
  async generateDailySlackReport(data: ReportData): Promise<string> {
    const vitalityEmoji = this.getVitalityEmoji(data.vitality.score);
    const statusEmoji = data.vitality.status === 'excellent' ? '🟢' :
                       data.vitality.status === 'good' ? '🟡' :
                       data.vitality.status === 'fair' ? '🟠' : '🔴';

    const testingStatus = data.testing.failing === 0 ? '✅' : '⚠️';
    const syncStatus = data.cloudSync.success ? '✅' : '❌';

    return `${vitalityEmoji} *JARVIS V2 - Daily Health Report*
${statusEmoji} *Status:* ${data.vitality.status.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Vitality Index*
Score: ${data.vitality.score}/100
Mood: ${data.vitality.mood}
Satisfaction: ${data.vitality.satisfaction}/10

${testingStatus} *Testing Status*
✓ ${data.testing.passing}/${data.testing.totalTests} tests passing
${data.testing.failing > 0 ? `✗ ${data.testing.failing} failing` : ''}
📈 Coverage: ${data.testing.coverage}%

${syncStatus} *Cloud Sync*
Last sync: ${this.formatTimestamp(data.cloudSync.lastSync)}
Files: ${data.cloudSync.filesUploaded}
Size: ${this.formatBytes(data.cloudSync.totalSize)}
Next sync: ${this.formatTimestamp(data.cloudSync.nextSync)}

📈 *User Metrics* (24h)
👥 Active users: ${data.analytics.users.active}
🆕 New users: ${data.analytics.users.new}
📊 Retention: ${data.analytics.engagement.retentionRate}%

⚡ *Performance*
Response time: ${data.analytics.performance.avgResponseTime}ms
Uptime: ${data.analytics.performance.uptime}%
Error rate: ${data.analytics.performance.errorRate}%

${data.vitality.concerns.length > 0 ? `\n⚠️ *Concerns:*\n${data.vitality.concerns.map(c => `• ${c}`).join('\n')}` : ''}

${data.vitality.strengths.length > 0 ? `\n✨ *Strengths:*\n${data.vitality.strengths.map(s => `• ${s}`).join('\n')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Report generated at ${this.formatTimestamp(data.timestamp)}_`;
  }

  /**
   * Generate weekly HTML email report
   */
  async generateWeeklyEmailReport(data: ReportData): Promise<string> {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jarvis V2 - Weekly Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #2c3e50;
      font-size: 28px;
    }
    .header .subtitle {
      color: #7f8c8d;
      font-size: 14px;
      margin-top: 5px;
    }
    .vitality-score {
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .vitality-score h2 {
      margin: 0 0 10px 0;
      font-size: 48px;
    }
    .vitality-score p {
      margin: 0;
      opacity: 0.9;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #4CAF50;
    }
    .metric-card h3 {
      margin: 0 0 10px 0;
      color: #2c3e50;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #4CAF50;
      margin: 0;
    }
    .metric-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #2c3e50;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-excellent {
      background-color: #d4edda;
      color: #155724;
    }
    .status-good {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-fair {
      background-color: #f8d7da;
      color: #721c24;
    }
    .concern-item, .strength-item {
      padding: 10px;
      margin: 5px 0;
      border-radius: 4px;
    }
    .concern-item {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
    }
    .strength-item {
      background-color: #d4edda;
      border-left: 4px solid #28a745;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
      color: #7f8c8d;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ecf0f1;
    }
    th {
      background-color: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧠 Jarvis V2 - Weekly Report</h1>
      <p class="subtitle">System Health & Performance Digest</p>
      <p class="subtitle">${this.formatWeekRange()}</p>
    </div>

    <div class="vitality-score">
      <h2>${data.vitality.score}/100</h2>
      <p>Vitality Index</p>
      <span class="status-badge status-${data.vitality.status}">${data.vitality.status}</span>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Test Coverage</h3>
        <p class="metric-value">${data.testing.coverage}%</p>
        <p class="metric-label">${data.testing.passing}/${data.testing.totalTests} passing</p>
      </div>
      <div class="metric-card">
        <h3>Active Users</h3>
        <p class="metric-value">${data.analytics.users.active}</p>
        <p class="metric-label">${data.analytics.users.new} new this week</p>
      </div>
      <div class="metric-card">
        <h3>Uptime</h3>
        <p class="metric-value">${data.analytics.performance.uptime}%</p>
        <p class="metric-label">${data.analytics.performance.avgResponseTime}ms avg response</p>
      </div>
      <div class="metric-card">
        <h3>Retention</h3>
        <p class="metric-value">${data.analytics.engagement.retentionRate}%</p>
        <p class="metric-label">${data.analytics.users.churn} churned users</p>
      </div>
    </div>

    <div class="section">
      <h2>📊 System Performance</h2>
      <table>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Status</th>
        </tr>
        <tr>
          <td>Average Response Time</td>
          <td>${data.analytics.performance.avgResponseTime}ms</td>
          <td>${data.analytics.performance.avgResponseTime < 500 ? '✅' : '⚠️'}</td>
        </tr>
        <tr>
          <td>Error Rate</td>
          <td>${data.analytics.performance.errorRate}%</td>
          <td>${data.analytics.performance.errorRate < 1 ? '✅' : '⚠️'}</td>
        </tr>
        <tr>
          <td>System Uptime</td>
          <td>${data.analytics.performance.uptime}%</td>
          <td>${data.analytics.performance.uptime > 99 ? '✅' : '⚠️'}</td>
        </tr>
        <tr>
          <td>Cloud Sync Status</td>
          <td>${data.cloudSync.success ? 'Successful' : 'Failed'}</td>
          <td>${data.cloudSync.success ? '✅' : '❌'}</td>
        </tr>
      </table>
    </div>

    ${data.vitality.strengths.length > 0 ? `
    <div class="section">
      <h2>✨ System Strengths</h2>
      ${data.vitality.strengths.map(s => `<div class="strength-item">• ${s}</div>`).join('')}
    </div>
    ` : ''}

    ${data.vitality.concerns.length > 0 ? `
    <div class="section">
      <h2>⚠️ Areas of Concern</h2>
      ${data.vitality.concerns.map(c => `<div class="concern-item">• ${c}</div>`).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2>☁️ Cloud Integration</h2>
      <table>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Last Successful Sync</td>
          <td>${this.formatTimestamp(data.cloudSync.lastSync)}</td>
        </tr>
        <tr>
          <td>Files Uploaded</td>
          <td>${data.cloudSync.filesUploaded}</td>
        </tr>
        <tr>
          <td>Total Size</td>
          <td>${this.formatBytes(data.cloudSync.totalSize)}</td>
        </tr>
        <tr>
          <td>Next Scheduled Sync</td>
          <td>${this.formatTimestamp(data.cloudSync.nextSync)}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <p>Generated by Jarvis V2 Communication & Reporting Agent</p>
      <p>${this.formatTimestamp(data.timestamp)}</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate JSON report for S3 archival
   */
  async generateJSONReport(data: ReportData): Promise<object> {
    return {
      reportType: 'monthly_performance',
      generatedAt: data.timestamp,
      period: {
        start: this.getMonthStart(),
        end: new Date().toISOString(),
      },
      summary: {
        vitalityScore: data.vitality.score,
        status: data.vitality.status,
        mood: data.vitality.mood,
      },
      testing: {
        totalTests: data.testing.totalTests,
        passingTests: data.testing.passing,
        failingTests: data.testing.failing,
        coverage: data.testing.coverage,
        successRate: (data.testing.passing / data.testing.totalTests) * 100,
      },
      cloudSync: {
        lastSync: data.cloudSync.lastSync,
        successful: data.cloudSync.success,
        filesUploaded: data.cloudSync.filesUploaded,
        totalBytes: data.cloudSync.totalSize,
      },
      analytics: {
        users: data.analytics.users,
        engagement: data.analytics.engagement,
        performance: data.analytics.performance,
      },
      concerns: data.vitality.concerns,
      strengths: data.vitality.strengths,
      metadata: {
        version: '2.0.0',
        schema: 'jarvis-report-v1',
      },
    };
  }

  /**
   * Send Slack report
   */
  async sendToSlack(message: string): Promise<void> {
    if (!this.slackWebhook) {
      throw new Error('Slack webhook URL not configured');
    }

    try {
      await axios.post(this.slackWebhook, {
        text: message,
        mrkdwn: true,
      });
      console.log('✅ Slack report sent successfully');
    } catch (error) {
      console.error('Failed to send Slack report:', error);
      throw error;
    }
  }

  /**
   * Send email report
   */
  async sendEmail(html: string, subject: string): Promise<void> {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO,
        subject,
        html,
      });
      console.log('✅ Email report sent successfully');
    } catch (error) {
      console.error('Failed to send email report:', error);
      throw error;
    }
  }

  /**
   * Save JSON report to S3
   */
  async saveToS3(report: object, filename: string): Promise<void> {
    try {
      const reportPath = path.join(process.cwd(), 'logs/jarvis/reports', filename);
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`✅ JSON report saved: ${filename}`);

      // TODO: Upload to S3 using AWS SDK
      // await this.uploadToS3(reportPath, `reports/${filename}`);
    } catch (error) {
      console.error('Failed to save JSON report:', error);
      throw error;
    }
  }

  // Helper methods

  private getVitalityEmoji(score: number): string {
    if (score >= 90) return '🎉';
    if (score >= 75) return '😊';
    if (score >= 60) return '😐';
    if (score >= 40) return '😟';
    return '🚨';
  }

  private formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  private formatWeekRange(): string {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }

  private getMonthStart(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  // Default data generators for when API calls fail

  private getDefaultVitality(): VitalityReport {
    return {
      timestamp: new Date().toISOString(),
      score: 0,
      status: 'poor',
      mood: 'unknown',
      satisfaction: 0,
      concerns: ['Unable to fetch vitality data'],
      strengths: [],
    };
  }

  private getDefaultTesting(): TestingStatus {
    return {
      totalTests: 0,
      passing: 0,
      failing: 0,
      skipped: 0,
      coverage: 0,
      lastRun: new Date().toISOString(),
    };
  }

  private getDefaultCloudSync(): CloudSyncStatus {
    return {
      lastSync: new Date().toISOString(),
      success: false,
      filesUploaded: 0,
      totalSize: 0,
      nextSync: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    };
  }

  private getDefaultAnalytics(): AnalyticsReport {
    return {
      period: '24h',
      users: {
        total: 0,
        active: 0,
        new: 0,
        churn: 0,
      },
      engagement: {
        avgSessionDuration: 0,
        avgDailyUsers: 0,
        retentionRate: 0,
      },
      performance: {
        avgResponseTime: 0,
        errorRate: 0,
        uptime: 0,
      },
    };
  }
}

export default ReportingService;
