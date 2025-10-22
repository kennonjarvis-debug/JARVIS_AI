import axios from 'axios';
import { TestResult } from './run-all-tests';

export class SlackReporter {
  constructor(private webhookUrl: string) {}

  async sendReport(results: TestResult[], summary: string): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('⚠️  Slack webhook URL not configured. Skipping Slack report.');
      return;
    }

    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const total = results.length;
    const successRate = ((passed / total) * 100).toFixed(1);

    const color = failed === 0 ? '#36a64f' : failed > 2 ? '#ff0000' : '#ff9900';
    const emoji = failed === 0 ? '✅' : failed > 2 ? '🔴' : '⚠️';

    const fields = results.map((result) => ({
      title: result.suite,
      value: `Status: ${this.getStatusEmoji(result.status)} ${result.status.toUpperCase()}\nDuration: ${(result.duration / 1000).toFixed(2)}s${result.coverage ? `\nCoverage: ${result.coverage.toFixed(2)}%` : ''}`,
      short: true,
    }));

    const payload = {
      username: 'Jarvis Test Bot',
      icon_emoji: ':robot_face:',
      attachments: [
        {
          color: color,
          fallback: `Test Results: ${passed}/${total} passed`,
          pretext: `${emoji} *Jarvis V2 Automated Test Results*`,
          title: 'Test Execution Summary',
          fields: [
            {
              title: 'Total Suites',
              value: total.toString(),
              short: true,
            },
            {
              title: 'Success Rate',
              value: `${successRate}%`,
              short: true,
            },
            {
              title: 'Passed',
              value: `✅ ${passed}`,
              short: true,
            },
            {
              title: 'Failed',
              value: `❌ ${failed}`,
              short: true,
            },
          ],
          footer: 'Jarvis V2 Testing Infrastructure',
          footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
          ts: Math.floor(Date.now() / 1000),
        },
        {
          color: color,
          title: 'Detailed Results',
          fields: fields,
          mrkdwn_in: ['fields'],
        },
      ],
    };

    try {
      await axios.post(this.webhookUrl, payload);
      console.log('✅ Test results sent to Slack');
    } catch (error) {
      console.error('❌ Failed to send Slack notification:', error);
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      default:
        return '❓';
    }
  }

  async sendDailyReport(stats: {
    date: string;
    totalRuns: number;
    successRate: number;
    avgDuration: number;
    trends: string;
  }): Promise<void> {
    const payload = {
      username: 'Jarvis Test Bot',
      icon_emoji: ':chart_with_upwards_trend:',
      text: '*📊 Daily Test Summary*',
      attachments: [
        {
          color: stats.successRate >= 95 ? '#36a64f' : stats.successRate >= 85 ? '#ff9900' : '#ff0000',
          fields: [
            {
              title: 'Date',
              value: stats.date,
              short: true,
            },
            {
              title: 'Total Runs',
              value: stats.totalRuns.toString(),
              short: true,
            },
            {
              title: 'Success Rate',
              value: `${stats.successRate.toFixed(1)}%`,
              short: true,
            },
            {
              title: 'Avg Duration',
              value: `${stats.avgDuration.toFixed(2)}s`,
              short: true,
            },
            {
              title: 'Trends',
              value: stats.trends,
              short: false,
            },
          ],
        },
      ],
    };

    try {
      await axios.post(this.webhookUrl, payload);
      console.log('✅ Daily report sent to Slack');
    } catch (error) {
      console.error('❌ Failed to send daily Slack report:', error);
    }
  }
}
