export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  static info(message: string, meta?: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: this.formatTimestamp(),
        message,
        ...meta,
      })
    );
  }

  static warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: this.formatTimestamp(),
        message,
        ...meta,
      })
    );
  }

  static error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: this.formatTimestamp(),
        message,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...meta,
      })
    );
  }

  static debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        JSON.stringify({
          level: 'debug',
          timestamp: this.formatTimestamp(),
          message,
          ...meta,
        })
      );
    }
  }
}
