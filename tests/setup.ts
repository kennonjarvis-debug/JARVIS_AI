/**
 * Global Test Setup
 *
 * Runs before all tests to configure the test environment
 */

import { config } from 'dotenv';

// Load environment variables from .env.test if it exists, otherwise .env
config({ path: '.env.test' });
config({ path: '.env' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  mockDate: (date: Date) => {
    jest.useFakeTimers();
    jest.setSystemTime(date);
  },

  restoreDate: () => {
    jest.useRealTimers();
  },
};

// Suppress console logs during tests (unless DEBUG is set)
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging test failures
    error: console.error,
  };
}

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// Type declarations for global test utilities
declare global {
  var testUtils: {
    sleep: (ms: number) => Promise<void>;
    mockDate: (date: Date) => void;
    restoreDate: () => void;
  };
}

export {};
