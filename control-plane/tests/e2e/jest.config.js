/**
 * Jest Configuration for E2E Tests
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: {
          ignoreCodes: [2339, 18046]
        }
      },
    ],
  },
  testMatch: [
    '**/tests/e2e/**/*.test.ts'
  ],
  testTimeout: 30000,
  maxWorkers: 1, // Run E2E tests sequentially to avoid conflicts
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
};
