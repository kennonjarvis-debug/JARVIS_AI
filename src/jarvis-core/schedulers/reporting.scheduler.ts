/**
 * Jarvis Reporting Scheduler
 *
 * Automated scheduling for health reports and communication
 */

import cron from 'node-cron';
import ReportingService from '../services/reporting.service';

export class ReportingScheduler {
  private reportingService: ReportingService;
  private dailyJob: cron.ScheduledTask | null = null;
  private weeklyJob: cron.ScheduledTask | null = null;
  private monthlyJob: cron.ScheduledTask | null = null;

  constructor() {
    this.reportingService = new ReportingService();
  }

  /**
   * Initialize all scheduled jobs
   */
  start(): void {
    console.log('🕐 Starting Jarvis Reporting Scheduler...');

    // Daily Slack report at 9:00 AM UTC
    this.dailyJob = cron.schedule('0 9 * * *', async () => {
      console.log('📊 Running daily Slack report...');
      try {
        const data = await this.reportingService.collectData();
        const report = await this.reportingService.generateDailySlackReport(data);
        await this.reportingService.sendToSlack(report);
        console.log('✅ Daily report sent to Slack');
      } catch (error) {
        console.error('❌ Failed to send daily report:', error);
      }
    });

    // Weekly email digest on Sunday at 6:00 AM UTC
    this.weeklyJob = cron.schedule('0 6 * * 0', async () => {
      console.log('📧 Running weekly email digest...');
      try {
        const data = await this.reportingService.collectData();
        const html = await this.reportingService.generateWeeklyEmailReport(data);
        await this.reportingService.sendEmail(html, '📊 Jarvis V2 - Weekly Digest');
        console.log('✅ Weekly digest sent via email');
      } catch (error) {
        console.error('❌ Failed to send weekly digest:', error);
      }
    });

    // Monthly JSON report on first day of month at 3:00 AM UTC
    this.monthlyJob = cron.schedule('0 3 1 * *', async () => {
      console.log('💾 Running monthly performance report...');
      try {
        const data = await this.reportingService.collectData();
        const report = await this.reportingService.generateJSONReport(data);
        const filename = `monthly-report-${new Date().toISOString().slice(0, 7)}.json`;
        await this.reportingService.saveToS3(report, filename);
        console.log('✅ Monthly report saved to S3');
      } catch (error) {
        console.error('❌ Failed to save monthly report:', error);
      }
    });

    console.log('✅ Reporting scheduler initialized');
    console.log('   Daily Slack: 9:00 AM UTC');
    console.log('   Weekly Email: Sunday 6:00 AM UTC');
    console.log('   Monthly JSON: 1st of month 3:00 AM UTC');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    console.log('🛑 Stopping Jarvis Reporting Scheduler...');

    if (this.dailyJob) {
      this.dailyJob.stop();
      this.dailyJob = null;
    }

    if (this.weeklyJob) {
      this.weeklyJob.stop();
      this.weeklyJob = null;
    }

    if (this.monthlyJob) {
      this.monthlyJob.stop();
      this.monthlyJob = null;
    }

    console.log('✅ All reporting jobs stopped');
  }

  /**
   * Manually trigger daily report (for testing)
   */
  async triggerDailyReport(): Promise<void> {
    console.log('🧪 Manually triggering daily report...');
    const data = await this.reportingService.collectData();
    const report = await this.reportingService.generateDailySlackReport(data);
    await this.reportingService.sendToSlack(report);
  }

  /**
   * Manually trigger weekly report (for testing)
   */
  async triggerWeeklyReport(): Promise<void> {
    console.log('🧪 Manually triggering weekly report...');
    const data = await this.reportingService.collectData();
    const html = await this.reportingService.generateWeeklyEmailReport(data);
    await this.reportingService.sendEmail(html, '📊 Jarvis V2 - Weekly Digest (Test)');
  }

  /**
   * Manually trigger monthly report (for testing)
   */
  async triggerMonthlyReport(): Promise<void> {
    console.log('🧪 Manually triggering monthly report...');
    const data = await this.reportingService.collectData();
    const report = await this.reportingService.generateJSONReport(data);
    const filename = `monthly-report-test-${Date.now()}.json`;
    await this.reportingService.saveToS3(report, filename);
  }
}

export default ReportingScheduler;
