/**
 * Simple logger for JARVIS
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()} [${this.context}]: ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    console.debug(this.formatMessage('debug', message, context));
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack, ...context }
      : { error, ...context };
    console.error(this.formatMessage('error', message, errorDetails));
  }
}
