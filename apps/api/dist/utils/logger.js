/**
 * Logger Utility
 * Centralized logging with different levels
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (LogLevel = {}));
class Logger {
    isDevelopment = process.env.NODE_ENV === 'development';
    formatEntry(level, message, data) {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
        };
    }
    debug(message, data) {
        if (this.isDevelopment) {
            console.debug(this.formatEntry(LogLevel.DEBUG, message, data));
        }
    }
    info(message, data) {
        console.log(this.formatEntry(LogLevel.INFO, message, data));
    }
    warn(message, data) {
        console.warn(this.formatEntry(LogLevel.WARN, message, data));
    }
    error(message, error, data) {
        const entry = {
            ...this.formatEntry(LogLevel.ERROR, message, data),
            stack: error instanceof Error ? error.stack : undefined,
        };
        console.error(entry);
    }
}
export const logger = new Logger();
