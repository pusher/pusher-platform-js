export declare enum LogLevel {
    VERBOSE = 1,
    DEBUG = 2,
    INFO = 3,
    WARNING = 4,
    ERROR = 5
}
export interface Logger {
    verbose(...items: any[]): void;
    debug(...items: any[]): void;
    info(...items: any[]): void;
    warn(...items: any[]): void;
    error(...items: any[]): void;
}
export declare class ConsoleLogger implements Logger {
    private threshold;
    constructor(threshold?: LogLevel);
    verbose(...items: any[]): void;
    debug(...items: any[]): void;
    info(...items: any[]): void;
    warn(...items: any[]): void;
    error(...items: any[]): void;
    private log;
    private errorAwareLog;
}
export declare class EmptyLogger implements Logger {
    verbose(...items: any[]): void;
    debug(...items: any[]): void;
    info(...items: any[]): void;
    warn(...items: any[]): void;
    error(...items: any[]): void;
}
