/**
 * Logger Utility
 * Centralized logging with different levels
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  stack?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.debug(this.formatEntry(LogLevel.DEBUG, message, data));
    }
  }

  info(message: string, data?: unknown): void {
    console.log(this.formatEntry(LogLevel.INFO, message, data));
  }

  warn(message: string, data?: unknown): void {
    console.warn(this.formatEntry(LogLevel.WARN, message, data));
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    const entry: LogEntry = {
      ...this.formatEntry(LogLevel.ERROR, message, data),
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error(entry);
  }
}

export const logger = new Logger();
