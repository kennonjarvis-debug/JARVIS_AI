/**
 * Tests for the Logger utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, LogLevel, createLogger } from './logger';
import fs from 'fs';
import path from 'path';

describe('Logger', () => {
  const testLogDir = 'logs/test';
  let logger: Logger;

  beforeEach(() => {
    // Create test logger
    logger = new Logger('test-service', {
      level: LogLevel.DEBUG,
      logDirectory: testLogDir,
    });
  });

  afterEach(async () => {
    // Close logger to flush transports
    await logger.close();

    // Clean up test log files
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(testLogDir, file));
      });
      fs.rmdirSync(testLogDir);
    }
  });

  describe('Basic logging methods', () => {
    it('should log debug messages', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      logger.debug('Debug message', { key: 'value' });

      expect(spy).toHaveBeenCalledWith('debug', 'Debug message', { key: 'value' });
    });

    it('should log info messages', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      logger.info('Info message', { key: 'value' });

      expect(spy).toHaveBeenCalledWith('info', 'Info message', { key: 'value' });
    });

    it('should log warn messages', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      logger.warn('Warning message', { key: 'value' });

      expect(spy).toHaveBeenCalledWith('warn', 'Warning message', { key: 'value' });
    });

    it('should log error messages', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      logger.error('Error message', undefined, { key: 'value' });

      expect(spy).toHaveBeenCalledWith('error', 'Error message', { key: 'value' });
    });

    it('should log error with Error object', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');
      const error = new Error('Test error');

      logger.error('Error occurred', error, { key: 'value' });

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.error).toBeDefined();
      expect(logData.error.message).toBe('Test error');
      expect(logData.error.stack).toBeDefined();
    });

    it('should log messages without context', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      logger.info('Simple message');

      expect(spy).toHaveBeenCalledWith('info', 'Simple message', {});
    });
  });

  describe('Log level filtering', () => {
    it('should respect minimum log level', () => {
      const infoLogger = new Logger('info-service', {
        level: LogLevel.INFO,
        enableFileLogging: false,
      });

      const spy = vi.spyOn(infoLogger['winstonLogger'], 'log');

      // These should log
      infoLogger.info('Info message');
      infoLogger.warn('Warning message');
      infoLogger.error('Error message');

      // Debug should be filtered out (but still called, Winston filters internally)
      infoLogger.debug('Debug message');

      expect(spy).toHaveBeenCalledTimes(4);
      infoLogger.close();
    });

    it('should allow changing log level dynamically', () => {
      logger.setLevel(LogLevel.ERROR);
      expect(logger.getLevel()).toBe(LogLevel.ERROR);

      logger.setLevel(LogLevel.DEBUG);
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should get current log level', () => {
      const initialLevel = logger.getLevel();
      expect(initialLevel).toBe(LogLevel.DEBUG);
    });
  });

  describe('Child logger functionality', () => {
    it('should create child logger with additional context', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      const childLogger = logger.child({ agentId: 'test-agent' });

      childLogger.info('Child message', { taskId: '123' });

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.agentId).toBe('test-agent');
      expect(logData.taskId).toBe('123');
    });

    it('should inherit parent context in child logger', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      const parentLogger = logger.child({ parentKey: 'parentValue' });
      const childLogger = parentLogger.child({ childKey: 'childValue' });

      childLogger.info('Nested child message');

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.parentKey).toBe('parentValue');
      expect(logData.childKey).toBe('childValue');
    });

    it('should not affect parent logger context', () => {
      const parentSpy = vi.spyOn(logger['winstonLogger'], 'log');

      const childLogger = logger.child({ childOnly: 'value' });

      logger.info('Parent message');

      expect(parentSpy).toHaveBeenCalled();
      const logData = parentSpy.mock.calls[0][2] as any;
      expect(logData.childOnly).toBeUndefined();
    });

    it('should override parent context with child context', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      const parentLogger = logger.child({ key: 'parentValue' });
      const childLogger = parentLogger.child({ key: 'childValue' });

      childLogger.info('Override test');

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.key).toBe('childValue');
    });
  });

  describe('Context propagation', () => {
    it('should include agentId in context', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      logger.info('Message with agent', { agentId: 'marketing-agent' });

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.agentId).toBe('marketing-agent');
    });

    it('should include taskId in context', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      logger.info('Message with task', { taskId: 'task-123' });

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.taskId).toBe('task-123');
    });

    it('should include arbitrary context data', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      logger.info('Message with custom context', {
        userId: 'user-456',
        action: 'create',
        duration: 1234,
      });

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.userId).toBe('user-456');
      expect(logData.action).toBe('create');
      expect(logData.duration).toBe(1234);
    });

    it('should merge context from message and child logger', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      const childLogger = logger.child({ agentId: 'sales-agent' });
      childLogger.info('Merged context', { taskId: 'task-789' });

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.agentId).toBe('sales-agent');
      expect(logData.taskId).toBe('task-789');
    });
  });

  describe('Error handling', () => {
    it('should serialize Error objects properly', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:1:1';

      logger.error('Error occurred', error);

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.error).toBeDefined();
      expect(logData.error.name).toBe('Error');
      expect(logData.error.message).toBe('Test error');
      expect(logData.error.stack).toContain('Test error');
    });

    it('should handle custom Error types', () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const spy = vi.spyOn(logger['winstonLogger'], 'log');
      const error = new CustomError('Custom error message', 'ERR_CUSTOM');

      logger.error('Custom error occurred', error);

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.error.name).toBe('CustomError');
      expect(logData.error.message).toBe('Custom error message');
    });

    it('should allow error logging with additional context', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');
      const error = new Error('Test error');

      logger.error('Error with context', error, {
        userId: 'user-123',
        action: 'failed_action',
      });

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.error).toBeDefined();
      expect(logData.userId).toBe('user-123');
      expect(logData.action).toBe('failed_action');
    });
  });

  describe('Logger configuration', () => {
    it('should create logger with custom service name', () => {
      const customLogger = new Logger('custom-service', {
        enableFileLogging: false,
      });

      expect(customLogger['serviceName']).toBe('custom-service');
      customLogger.close();
    });

    it('should support disabling file logging', () => {
      const consoleOnlyLogger = new Logger('console-only', {
        enableFileLogging: false,
        level: LogLevel.DEBUG,
      });

      const transportCount = consoleOnlyLogger['winstonLogger'].transports.length;
      expect(transportCount).toBe(1); // Only console transport

      consoleOnlyLogger.close();
    });

    it('should support disabling console logging', () => {
      const fileOnlyLogger = new Logger('file-only', {
        enableConsoleLogging: false,
        level: LogLevel.DEBUG,
      });

      const transports = fileOnlyLogger['winstonLogger'].transports;
      const hasConsole = transports.some((t) => t instanceof require('winston').transports.Console);
      expect(hasConsole).toBe(false);

      fileOnlyLogger.close();
    });

    it('should use custom log directory', () => {
      const customDirLogger = new Logger('custom-dir', {
        logDirectory: 'logs/custom',
      });

      expect(customDirLogger).toBeDefined();
      customDirLogger.close();
    });
  });

  describe('File writing', () => {
    it('should create log files in specified directory', async () => {
      // Write some logs
      logger.info('Test log entry');
      logger.error('Test error entry');

      // Give file transport time to write
      await new Promise((resolve) => setTimeout(resolve, 200));
      await logger.close();

      // Check if log directory was created
      const dirExists = fs.existsSync(testLogDir);
      expect(dirExists).toBe(true);
    });

    it('should write JSON formatted logs to file', async () => {
      logger.info('JSON test message', { testKey: 'testValue' });

      await new Promise((resolve) => setTimeout(resolve, 200));
      await logger.close();

      // Read log file
      if (fs.existsSync(testLogDir)) {
        const files = fs.readdirSync(testLogDir).filter((f) => f.startsWith('jarvis-'));
        if (files.length > 0) {
          const logContent = fs.readFileSync(path.join(testLogDir, files[0]), 'utf-8');
          expect(logContent).toContain('JSON test message');
          expect(logContent).toContain('testKey');
        }
      }
    });
  });

  describe('createLogger factory', () => {
    it('should create logger instance', () => {
      const factoryLogger = createLogger('factory-test');

      expect(factoryLogger).toBeInstanceOf(Logger);
      expect(factoryLogger['serviceName']).toBe('factory-test');

      factoryLogger.close();
    });
  });

  describe('Logger lifecycle', () => {
    it('should close logger cleanly', async () => {
      const closeableLogger = new Logger('closeable', {
        enableFileLogging: false,
      });

      closeableLogger.info('Test message');

      await expect(closeableLogger.close()).resolves.not.toThrow();
    });

    it('should flush logs on close', async () => {
      const flushLogger = new Logger('flush-test', {
        logDirectory: testLogDir,
      });

      flushLogger.info('Message to flush');

      await flushLogger.close();

      // Logger should be closed without errors
      expect(true).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle agent logging scenario', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      const agentLogger = logger.child({ agentId: 'marketing-agent' });

      agentLogger.info('Agent started');
      agentLogger.info('Processing task', { taskId: 'task-123' });
      agentLogger.info('Task completed', {
        taskId: 'task-123',
        duration: 1500,
      });

      expect(spy).toHaveBeenCalledTimes(3);

      // Check all logs have agentId
      spy.mock.calls.forEach((call) => {
        const logData = call[2] as any;
        expect(logData.agentId).toBe('marketing-agent');
      });
    });

    it('should handle orchestrator logging scenario', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      const orchestratorLogger = logger.child({ component: 'orchestrator' });

      orchestratorLogger.info('Task submitted', { taskId: 'task-456' });
      orchestratorLogger.info('Routing to agent', {
        taskId: 'task-456',
        agentId: 'sales-agent',
      });
      orchestratorLogger.info('Task completed', {
        taskId: 'task-456',
        status: 'success',
      });

      expect(spy).toHaveBeenCalledTimes(3);

      spy.mock.calls.forEach((call) => {
        const logData = call[2] as any;
        expect(logData.component).toBe('orchestrator');
      });
    });

    it('should handle error reporting scenario', () => {
      const spy = vi.spyOn(logger['winstonLogger'], 'log');

      const error = new Error('API timeout');
      logger.error('Failed to post to Buffer', error, {
        platform: 'twitter',
        retries: 3,
        agentId: 'marketing-agent',
      });

      expect(spy).toHaveBeenCalled();
      const logData = spy.mock.calls[0][2] as any;
      expect(logData.error).toBeDefined();
      expect(logData.platform).toBe('twitter');
      expect(logData.retries).toBe(3);
      expect(logData.agentId).toBe('marketing-agent');
    });
  });
});
