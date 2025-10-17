import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/tests/unit',
    '<rootDir>/tests/v2',
    '<rootDir>/tests/integration',
    '<rootDir>/tests/security',
    '<rootDir>/tests/edge-cases',
    '<rootDir>/tests/performance',
    '<rootDir>/tests/autonomous',
    '<rootDir>/tests/cloud'
  ],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'ESNext',
        target: 'ES2022',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
      },
    }],
  },
  collectCoverage: true,
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/types/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/jest.setup.ts'],
  verbose: true,
  maxWorkers: '50%',
  testTimeout: 10000,
};

export default config;
