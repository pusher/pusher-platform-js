export enum LogLevel {
  VERBOSE = 1,
  DEBUG = 2,
  INFO = 3,
  WARNING = 4,
  ERROR = 5,
}

export interface Logger {
  verbose(...items: any[]): void;
  debug(...items: any[]): void;
  info(...items: any[]): void;
  warn(...items: any[]): void;
  error(...items: any[]): void;
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

    const groups = Array<string>();
    const hr =
      '--------------------------------------------------------------------------------';

    if (!global.console.group) {
      global.console.group = (label: string) => {
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

  verbose(...items: any[]) {
    this.log(global.console.log, LogLevel.VERBOSE, items);
  }

  debug(...items: any[]) {
    this.log(global.console.log, LogLevel.DEBUG, items);
  }

  info(...items: any[]) {
    this.log(global.console.info, LogLevel.INFO, items);
  }

  warn(...items: any[]) {
    this.log(global.console.warn, LogLevel.WARNING, items);
  }

  error(...items: any[]) {
    this.log(global.console.error, LogLevel.ERROR, items);
  }

  private log(
    logFunction: (...items: any[]) => void,
    level: LogLevel,
    items: any[],
  ): void {
    if (level >= this.threshold) {
      const loggerSignature = `Logger.${LogLevel[level]}`;

      if (items.length > 1) {
        global.console.group();
        items.forEach((item: any) => {
          this.errorAwareLog(logFunction, item, loggerSignature);
        });
        global.console.groupEnd();
      } else {
        this.errorAwareLog(logFunction, items[0], loggerSignature);
      }
    }
  }

  private errorAwareLog(
    logFunction: (...items: any[]) => void,
    item: any,
    loggerSignature: string,
  ): void {
    if (item !== undefined && item.info && item.info.error_uri) {
      const errorDesc = item.info.error_description;
      const errorIntro = errorDesc ? errorDesc : 'An error has occurred';
      logFunction(
        `${errorIntro}. More information can be found at ${
          item.info.error_uri
        }. Error object: `,
        item,
      );
    } else {
      logFunction(`${loggerSignature}: `, item);
    }
  }
}

export class EmptyLogger implements Logger {
  /* tslint:disable:no-empty */
  verbose(...items: any[]) {}
  debug(...items: any[]) {}
  info(...items: any[]) {}
  warn(...items: any[]) {}
  error(...items: any[]) {}
  /* tslint:enable:no-empty */
}
