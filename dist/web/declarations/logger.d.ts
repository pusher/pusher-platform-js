export declare enum LogLevel {
    VERBOSE = 1,
    DEBUG = 2,
    INFO = 3,
    WARNING = 4,
    ERROR = 5,
}
export interface Logger {
    verbose(message: string, error?: any): void;
    debug(message: string, error?: any): void;
    info(message: string, error?: any): void;
    warn(message: string, error?: any): void;
    error(message: string, error?: any): void;
}
export declare class ConsoleLogger implements Logger {
    private threshold;
    constructor(threshold?: LogLevel);
    verbose(message: string, error?: any): void;
    debug(message: string, error?: any): void;
    info(message: string, error?: any): void;
    warn(message: string, error?: any): void;
    error(message: string, error?: any): void;
    private log(logFunction, level, message, error?);
}
export declare class EmptyLogger implements Logger {
    verbose(message: string, error?: any): void;
    debug(message: string, error?: any): void;
    info(message: string, error?: any): void;
    warn(message: string, error?: any): void;
    error(message: string, error?: any): void;
}
