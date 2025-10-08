/**
 * Jarvis Testing Module - Scheduled Jobs
 */

import { ScheduledJob } from '../../core/types';
import { testingModule } from './index';

export const testingJobs: ScheduledJob[] = [
  {
    name: 'daily-test-suite',
    schedule: '0 3 * * *', // 3 AM daily
    timezone: 'UTC',
    description: 'Run comprehensive daily test suite with auto-fix',
    handler: async () => {
      await testingModule.scheduledDailyTests();
    },
  },
  {
    name: 'hourly-smoke-tests',
    schedule: '0 * * * *', // Every hour
    timezone: 'UTC',
    description: 'Quick smoke tests to detect immediate issues',
    handler: async () => {
      console.log('[testing] Running hourly smoke tests...');
      // Could implement quick smoke test subset here
    },
  },
  {
    name: 'pre-deploy-validation',
    schedule: '0 9,17 * * 1-5', // 9 AM and 5 PM on weekdays
    timezone: 'America/Los_Angeles',
    description: 'Pre-deployment validation before typical deploy windows',
    handler: async () => {
      const isValid = await testingModule.preDeployValidation();
      if (!isValid) {
        console.error('[testing] ❌ Pre-deploy validation FAILED - do not deploy!');
        // Could trigger notification/alert here
      }
    },
  },
  {
    name: 'weekend-full-regression',
    schedule: '0 2 * * 0', // 2 AM on Sundays
    timezone: 'UTC',
    description: 'Full regression test suite on weekends',
    handler: async () => {
      console.log('[testing] Running weekend full regression...');
      await testingModule.scheduledDailyTests();
      // Could add additional regression tests here
    },
  },
];
