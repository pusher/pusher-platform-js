export interface Logger {
    log(level: LogLevel, message: string): void;
}

export enum LogLevel {
     VERBOSE = 1,
     DEBUG = 2,
     INFO = 3,
     WARNING = 4,
     ERROR = 5
}

export class DefaultLogger implements Logger {
    private treshold: LogLevel;

    constructor(treshold: LogLevel = 2){
        this.treshold = treshold;
    }

    log(level: LogLevel, message: string): void {
        if(level >= this.treshold){
            console.log(message);
        }
    }
}