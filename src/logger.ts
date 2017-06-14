import { ErrorResponse } from './base-client';
export enum LogLevel {
     VERBOSE = 1,
     DEBUG = 2,
     INFO = 3,
     WARNING = 4,
     ERROR = 5
}

export interface Logger {
    verbose(message: string, error?: Error);
    debug(message: string, error?: Error);
    info(message: string, error?: Error);
    warn(message: string, error?: Error);
    error(message: string, error?: Error);
}

export class DefaultLogger implements Logger {
    private treshold: LogLevel;

    constructor(treshold: LogLevel = 2){
        this.treshold = treshold;
    }

    private log(level: LogLevel, message: string, error?: Error): void {
        if(level >= this.treshold){
            console.log(message);

            if(error) {
                console.log(error);
            }
        }
    }

    verbose(message: string, error?: Error){
        this.log(LogLevel.VERBOSE, message, error);
    }

    debug(message: string, error?: Error){
        this.log(LogLevel.DEBUG, message, error);
    }

    info(message: string, error?: Error){
        this.log(LogLevel.INFO, message, error);
    }

    warn(message: string, error?: Error){
        this.log(LogLevel.WARNING, message, error);
    }

    error(message: string, error?: Error){
        this.log(LogLevel.ERROR, message, error);
    }
}

export class EmptyLogger implements Logger {
    verbose(message: string, error?: Error){};
    debug(message: string, error?: Error){};
    info(message: string, error?: Error){};
    warn(message: string, error?: Error){};
    error(message: string, error?: Error){};
}