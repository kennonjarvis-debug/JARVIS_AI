/**
 * E2E Test Setup
 *
 * Global setup and teardown for E2E tests
 */

import { beforeAll, afterAll } from '@jest/globals';

// Increase timeout for all E2E tests
jest.setTimeout(30000);

beforeAll(async () => {
  console.log('🚀 Starting E2E test suite...');
  console.log('Environment:', process.env.NODE_ENV || 'test');
  console.log('JARVIS URL:', process.env.JARVIS_URL || 'http://localhost:4000');
});

afterAll(async () => {
  console.log('✅ E2E test suite completed');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in E2E tests:', reason);
});
