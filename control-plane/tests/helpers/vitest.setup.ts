// Vitest setup file
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

beforeAll(() => {
  console.log('🧪 Starting Vitest suite...');
});

afterAll(() => {
  console.log('✅ Vitest suite completed');
});

afterEach(() => {
  vi.clearAllMocks();
});
