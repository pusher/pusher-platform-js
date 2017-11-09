export enum LogLevel {
     VERBOSE = 1,
     DEBUG = 2,
     INFO = 3,
     WARNING = 4,
     ERROR = 5
}

export interface Logger {
    verbose(message: string, error?: any);
    debug(message: string, error?: any);
    info(message: string, error?: any);
    warn(message: string, error?: any);
    error(message: string, error?: any);
}

/**
 * Default implementation of the Logger. Wraps standards console calls.
 * Logs only calls that are at or above the threshold (verbose/debug/info/warn/error)
 * If error is passed, it will append the message to the error object.
 */
export class ConsoleLogger implements Logger {
    private threshold: LogLevel;

    constructor(threshold: LogLevel = 2) {
      this.threshold = threshold;

      const groups = [];
      const hr =
        '--------------------------------------------------------------------------------';

      if (!global.console.group) {
        global.console.group = label => {
          groups.push(label);
          global.console.log('%c \nBEGIN GROUP: %c', hr, label);
        };
      }
      if (!global.console.groupEnd) {
        global.console.groupEnd = () => {
          global.console.log('END GROUP: %c\n%c', groups.pop(), hr);
        };
      }
    }

    verbose(message: string, error?: any) {
        this.log(global.console.log, LogLevel.VERBOSE, message, error);
    }

    debug(message: string, error?: any) {
        this.log(global.console.log, LogLevel.DEBUG, message, error);
    }

    info(message: string, error?: any) {
        this.log(global.console.info, LogLevel.INFO, message, error);
    }

    warn(message: string, error?: any) {
        this.log(global.console.warn, LogLevel.WARNING, message, error);
    }

    error(message: string, error?: any) {
        this.log(global.console.error, LogLevel.ERROR, message, error);
    }

    private log(
      logFunction: (msg) => void,
      level: LogLevel,
      message: string,
      error?: any,
    ): void {
      if (level >= this.threshold) {
        const loggerSignature = `Logger.${LogLevel[level]}`;

        if (error) {
          global.console.group();
          logFunction(`${loggerSignature}: ${message}`);
          logFunction(error);
          global.console.groupEnd();
        } else {
          logFunction(`${loggerSignature}: ${message}`);
        }
      }
    }
}

export class EmptyLogger implements Logger {
    verbose(message: string, error?: any){};
    debug(message: string, error?: any){};
    info(message: string, error?: any){};
    warn(message: string, error?: any){};
    error(message: string, error?: any){};
}
