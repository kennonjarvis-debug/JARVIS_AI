/**
 * Daily Health Report Scheduler
 * Sends daily health summaries at 9 AM UTC via Slack and Email
 */

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { generateDailyHealthReport, toSlackAttachments } from '../core/health-report';
import { logger } from '../../backend/utils/logger';

/**
 * Initialize daily health report scheduler
 */
export function initializeDailyHealthScheduler() {
  // Schedule for 9 AM UTC daily
  cron.schedule('0 9 * * *', async () => {
    logger.info('🕐 Daily health report scheduled task started');

    try {
      // Generate comprehensive health report
      const report = await generateDailyHealthReport();

      // Send to Slack
      if (process.env.SLACK_WEBHOOK_URL && process.env.SLACK_WEBHOOK_URL !== 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL') {
        await sendSlackReport(report);
      } else {
        logger.warn('⚠️  Slack webhook not configured, skipping Slack notification');
      }

      // Send via Email
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        await sendEmailReport(report);
      } else {
        logger.warn('⚠️  Email not configured, skipping email notification');
      }

      logger.info('✅ Daily health report sent successfully');
    } catch (error) {
      logger.error('❌ Failed to send daily health report:', error);
    }
  });

  logger.info('📅 Daily health report scheduler initialized (9 AM UTC)');
}

/**
 * Send health report to Slack
 */
async function sendSlackReport(report: any): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL not configured');
  }

  const payload = {
    text: '🧠 *Jarvis V2 — Daily Health Summary*',
    channel: process.env.SLACK_CHANNEL || '#jarvis-alerts',
    username: process.env.SLACK_USERNAME || 'Jarvis AI',
    icon_emoji: process.env.SLACK_ICON_EMOJI || ':brain:',
    attachments: toSlackAttachments(report)
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.statusText}`);
  }

  logger.info('✅ Slack notification sent');
}

/**
 * Send health report via email
 */
async function sendEmailReport(report: any): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const htmlContent = generateEmailHTML(report);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: process.env.EMAIL_TO || process.env.SMTP_USER,
    subject: `Jarvis V2 — Daily Health Summary (${new Date().toLocaleDateString()})`,
    html: htmlContent
  });

  logger.info('✅ Email report sent');
}

/**
 * Generate HTML email content
 */
function generateEmailHTML(report: any): string {
  const statusColor = report.vitality.score >= 75 ? '#4CAF50' :
                      report.vitality.score >= 50 ? '#FF9800' : '#F44336';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .metric { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: bold; color: ${statusColor}; }
        .services { display: flex; justify-content: space-around; margin: 20px 0; }
        .service { text-align: center; }
        .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .status-ok { background: #4CAF50; color: white; }
        .status-error { background: #F44336; color: white; }
        .recommendations { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #999; font-size: 12px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧠 Jarvis V2</h1>
          <p>Daily Health Summary</p>
          <p style="font-size: 14px; opacity: 0.9;">${new Date().toLocaleString()}</p>
        </div>

        <div class="content">
          <div class="metric">
            <div class="metric-title">System Vitality</div>
            <div class="metric-value">${report.vitality.score}/100</div>
            <div style="color: #666; margin-top: 5px;">${report.vitality.status}</div>
          </div>

          <div class="metric">
            <div class="metric-title">Analytics</div>
            <table style="width: 100%; margin-top: 10px;">
              <tr>
                <td><strong>Actions Executed:</strong></td>
                <td>${report.analytics.actionsExecuted}</td>
              </tr>
              <tr>
                <td><strong>Success Rate:</strong></td>
                <td>${report.analytics.successRate}%</td>
              </tr>
              <tr>
                <td><strong>Errors:</strong></td>
                <td>${report.analytics.errors}</td>
              </tr>
              <tr>
                <td><strong>Warnings:</strong></td>
                <td>${report.analytics.warnings}</td>
              </tr>
            </table>
          </div>

          <div class="metric">
            <div class="metric-title">Services Status</div>
            <div class="services">
              <div class="service">
                <div>Backend</div>
                <span class="status-badge ${report.services.backend ? 'status-ok' : 'status-error'}">
                  ${report.services.backend ? '✅ OK' : '❌ Down'}
                </span>
              </div>
              <div class="service">
                <div>JIT Controller</div>
                <span class="status-badge ${report.services.jitController ? 'status-ok' : 'status-error'}">
                  ${report.services.jitController ? '✅ OK' : '❌ Down'}
                </span>
              </div>
              <div class="service">
                <div>ngrok</div>
                <span class="status-badge ${report.services.ngrok ? 'status-ok' : 'status-error'}">
                  ${report.services.ngrok ? '✅ OK' : '❌ Down'}
                </span>
              </div>
            </div>
          </div>

          <div class="metric">
            <div class="metric-title">Active Modules</div>
            <div style="margin-top: 10px;">
              ${report.modules.filter((m: any) => m.status === 'active').map((m: any) =>
                `<div style="display: inline-block; background: #e3f2fd; padding: 5px 10px; margin: 3px; border-radius: 3px;">
                  ${m.name}
                </div>`
              ).join('')}
            </div>
          </div>

          ${report.recommendations.length > 0 ? `
          <div class="recommendations">
            <strong>💡 Recommendations:</strong>
            <ul>
              ${report.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Generated by Jarvis AI Cloud Integration</p>
          <p>This is an automated daily health report</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Export for manual triggering
export {
  sendSlackReport,
  sendEmailReport
};
